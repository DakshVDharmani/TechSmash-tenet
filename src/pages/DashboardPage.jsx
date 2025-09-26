import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { User, Plus } from "lucide-react";
// import { mockUserStats } from "../data/mockData"; // ⬅️ Remove mock import
import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

const DashboardPage = () => {
  // 🔹 State variables to hold the fetched stats
  const [realityScore, setRealityScore] = useState(0);
  const [alignedMinutes, setAlignedMinutes] = useState(0);
  const [distractedMinutes, setDistractedMinutes] = useState(0);
  const [deviationAlerts, setDeviationAlerts] = useState(0);

  const [operatorId, setOperatorId] = useState("LOADING...");
  const [pfpUrl, setPfpUrl] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState("info"); // "success" | "error" | "info"
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          setOperatorId("NO_USER");
          return;
        }

        // ✅ Fetch operator id and profile picture
        const { data, error } = await supabase
          .from("Profiles")
          .select("operator_id, pfp")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data?.operator_id) setOperatorId(data.operator_id);
        else setOperatorId("NO_ID");

        if (data?.pfp) setPfpUrl(data.pfp);

        // ✅ ---- Fetch data from Extensions ----
        const { data: extData, error: extError } = await supabase
          .from("Extensions")
          .select("focused_time, distracted_time, deviation_warning")
          .eq("id", user.id);

        if (extError) throw extError;

        let totalFocused = 0;
        let totalDistracted = 0;
        let totalDeviation = 0;

        extData.forEach((row) => {
          totalFocused += row.focused_time || 0;
          totalDistracted += (row.focused_time || 0) + (row.distracted_time || 0);
          totalDeviation += row.deviation_warning || 0;
        });

        const alignedMin = Math.floor(totalFocused / 60);
        const distractedMin = Math.floor((totalDistracted - totalFocused) / 60);

        setAlignedMinutes(alignedMin);
        setDistractedMinutes(distractedMin);
        setDeviationAlerts(totalDeviation);

        // ✅ ---- Fetch data from overall_progress ----
        const { data: progData, error: progError } = await supabase
          .from("overall_progress")
          .select("overall_progress")
          .eq("id", user.id);

        if (progError) throw progError;

        let totalProgress = 0;
        progData.forEach((row) => {
          totalProgress += row.overall_progress || 0;
        });

        setRealityScore(totalProgress); // already percentage
      } catch (err) {
        console.error("Error fetching profile or stats data:", err.message);
        setOperatorId("ERROR");
      }
    };

    fetchProfileData();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No logged in user");

      const fileExt = file.name.split(".").pop();
      const uniqueName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${uniqueName}`;

      // delete any old file (prevent collisions)
      await supabase.storage.from("profile_picture").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("profile_picture")
        .upload(filePath, file, { cacheControl: "3600" });

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        setStatusType("error");
        setStatusMsg("⚠️ Upload failed. Try again.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile_picture").getPublicUrl(filePath);

      if (!publicUrl) throw new Error("Failed to retrieve public URL");

      const { error: updateError } = await supabase
        .from("Profiles")
        .update({ pfp: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setPfpUrl(publicUrl);
      setStatusType("success");
      setStatusMsg("Profile picture updated!");
    } catch (err) {
      console.error("Error uploading profile picture:", err.message);
      setStatusType("error");
      setStatusMsg("Failed to upload: " + err.message);
    } finally {
      e.target.value = ""; // reset file input
      setTimeout(() => setStatusMsg(""), 4000); // auto-hide after 4s
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] p-6 md:p-8 grid grid-rows-[auto,1fr,auto] gap-6">
      {/* Header */}
      <motion.header
        className="flex justify-between items-start"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="font-mono text-3xl text-primary">OPERATOR_DASHBOARD</h1>
          <p className="text-secondary">
            STATUS: <span className="text-success">NOMINAL</span>
          </p>
        </div>
        <div className="font-mono text-right text-sm">
          <p className="text-secondary">
            SESSION_START: {new Date().toUTCString()}
          </p>
          <p className="text-secondary">ID: {operatorId}</p>
        </div>
      </motion.header>

      {/* Middle Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden h-full">
        {/* Operator Panel */}
        <motion.div
          className="border border-secondary/50 p-6 flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm shadow-md rounded-lg hover:shadow-primary/20 transition-all duration-300 relative"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="relative w-24 h-24 mb-4">
            <div className="w-full h-full rounded-full border-2 border-secondary overflow-hidden flex items-center justify-center bg-background">
              {pfpUrl ? (
                <img
                  src={pfpUrl}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <User size={48} className="text-secondary" />
              )}
            </div>

            <button
              onClick={() => fileInputRef.current.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary border-2 border-background flex items-center justify-center hover:bg-highlight transition"
            >
              <Plus size={18} className="text-background" />
            </button>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <h2 className="font-mono text-lg text-primary">
            {operatorId !== "LOADING..."
              ? `OPERATOR_${operatorId}`
              : "LOADING..."}
          </h2>
          <p className="text-secondary text-sm">Clearance Level: 4</p>

          {/* Status message */}
          {statusMsg && (
            <motion.div
              className={`mt-3 px-4 py-2 text-sm font-mono rounded border ${
                statusType === "success"
                  ? "text-success border-success/50"
                  : "text-alert border-alert/50"
              }`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              {statusMsg}
            </motion.div>
          )}
        </motion.div>

        {/* Quick Actions Panel */}
        <motion.div
          className="border border-secondary/50 p-6 flex flex-col justify-center bg-background/40 backdrop-blur-sm shadow-md rounded-lg hover:shadow-primary/20 transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h3 className="font-mono text-secondary mb-4">// QUICK_ACTIONS</h3>
          <div className="space-y-3">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                to="/goals"
                className="block font-mono text-primary border border-secondary p-3 text-center rounded-md transition-all hover:border-primary hover:bg-primary/10 hover:shadow-md"
              >
                [ ADD_GOAL ]
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                to="/timeline"
                className="block font-mono text-primary border border-secondary p-3 text-center rounded-md transition-all hover:border-primary hover:bg-primary/10 hover:shadow-md"
              >
                [ VIEW_TIMELINE ]
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                to="/messages"
                className="block font-mono text-primary border border-secondary p-3 text-center rounded-md transition-all hover:border-primary hover:bg-primary/10 hover:shadow-md"
              >
                [ CONTINUE_CHAT ]
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                to="/identity"
                className="block font-mono text-primary border border-secondary p-3 text-center rounded-md transition-all hover:border-primary hover:bg-primary/10 hover:shadow-md"
              >
                [ PRO_PROFILES ]
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Reality Score Panel */}
        <motion.div
          className="border border-secondary/50 p-6 flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm shadow-md rounded-lg hover:shadow-primary/20 transition-all duration-300"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.p
            className="font-mono text-secondary text-base mb-2"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            REALITY_SCORE
          </motion.p>
          <motion.p
            className="font-mono text-6xl md:text-7xl text-primary font-bold"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {realityScore}
            <span className="text-2xl">%</span>
          </motion.p>
        </motion.div>
      </div>

      {/* Bottom Panel */}
      <motion.div
        className="border border-secondary/50 p-6 rounded-lg shadow-md bg-background/40 backdrop-blur-sm hover:shadow-primary/20 transition-all duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h3 className="font-mono text-secondary mb-3">// DAILY_SUMMARY</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-center">
          <motion.div
            className="border border-success/50 p-4 rounded-md"
            whileHover={{ scale: 1.05 }}
          >
            <p className="text-3xl text-success font-bold">{alignedMinutes}</p>
            <p className="text-secondary text-sm">ALIGNED_MINUTES</p>
          </motion.div>
          <motion.div
            className="border border-alert/50 p-4 rounded-md"
            whileHover={{ scale: 1.05 }}
          >
            <p className="text-3xl text-alert font-bold">{distractedMinutes}</p>
            <p className="text-secondary text-sm">DISTRACTED_MINUTES</p>
          </motion.div>
          <motion.div
            className="border border-highlight/50 p-4 rounded-md"
            whileHover={{ scale: 1.05 }}
          >
            <p className="text-3xl text-highlight font-bold">
              {deviationAlerts}
            </p>
            <p className="text-secondary text-sm">DEVIATION_ALERTS</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
