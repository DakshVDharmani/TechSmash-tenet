import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";

const AvatarPage = () => {
  const [user, setUser] = useState(null);
  const [gender, setGender] = useState(null);
  const [details, setDetails] = useState({ fullname: "", age: "", role: "", bio: "" });
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const avatars = {
    Male: [
      { src: "/avatar1.png", name: "Neo", index: 1 },
      { src: "/avatar2.png", name: "Bond", index: 2 },
    ],
    Female: [
      { src: "/avatar3.png", name: "Ciphera", index: 3 },
      { src: "/avatar4.png", name: "Agent Hill", index: 4 },
    ],
  };

  // Load user + saved info
  useEffect(() => {
    const init = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error fetching user:", userError.message);
        setLoading(false);
        return;
      }

      const currentUser = userData?.user || null;
      setUser(currentUser);

      if (currentUser) {
        // Fetch profile fullname
        const { data: profile, error: profileError } = await supabase
          .from("Profiles")
          .select("fullname")
          .eq("id", currentUser.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError.message);
        }

        // Fetch avatar config
        const { data: saved, error: avatarError } = await supabase
          .from("avatars")
          .select("*")
          .eq("user_id", currentUser.id)
          .single();

        if (avatarError && avatarError.code !== "PGRST116") {
          console.error("Error fetching avatar:", avatarError.message);
        }

        if (saved) {
          setGender(saved.gender);
          setDetails({
            fullname: profile?.fullname || "",
            age: saved.age?.toString() || "",
            role: saved.role || "",
            bio: saved.bio || "", // Load bio from avatars table
          });
          const genderSet = avatars[saved.gender];
          const idx = genderSet.findIndex((a) => a.index === saved.avatar_index);
          setAvatarIndex(idx >= 0 ? idx : 0);
        } else {
          setDetails({ fullname: profile?.fullname || "", age: "", role: "", bio: "" });
        }
      }

      setLoading(false);
    };

    init();
  }, []);

  const handleSaveInfo = async () => {
    if (!user) {
      alert("You must be logged in to save.");
      return;
    }
    if (!gender || !details.age || !details.role) {
      alert("Please complete gender, age, and role fields before saving.");
      return;
    }

    const selected = avatars[gender][avatarIndex];
    setSaving(true);

    try {
      // Check if avatar row exists
      const { data: existing } = await supabase
        .from("avatars")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Update
        const { error: updateError } = await supabase
          .from("avatars")
          .update({
            gender,
            age: details.age ? parseInt(details.age, 10) : null,
            role: details.role,
            bio: details.bio || null, // Save bio
            avatar_index: selected.index,
            updated_at: new Date(),
          })
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase.from("avatars").insert({
          user_id: user.id,
          gender,
          age: details.age ? parseInt(details.age, 10) : null,
          role: details.role,
          bio: details.bio || null, // Save bio
          avatar_index: selected.index,
          updated_at: new Date(),
        });

        if (insertError) throw insertError;
      }

      // Update fullname in profiles
      const { error: profileError } = await supabase
        .from("Profiles")
        .update({ fullname: details.fullname })
        .eq("id", user.id);

      if (profileError) throw profileError;

      alert("Information saved successfully!");
    } catch (err) {
      console.error("Error saving identity:", err.message);
      alert("Error saving information.");
    } finally {
      setSaving(false);
    }
  };

  const handleNextAvatar = () =>
    setAvatarIndex((prev) =>
      prev + 1 >= avatars[gender].length ? 0 : prev + 1
    );

  const handlePrevAvatar = () =>
    setAvatarIndex((prev) =>
      prev - 1 < 0 ? avatars[gender].length - 1 : prev - 1
    );

  return (
    <div className="h-[calc(100vh-4rem)] p-8 flex flex-col">
      <h1 className="font-mono text-2xl md:text-3xl text-primary mb-6">
        IDENTITY_CONFIGURATION
      </h1>

      {loading ? (
        <p className="text-secondary font-mono">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
          {/* Left Panel - Details */}
          <div className="bg-background/40 backdrop-blur-md border border-secondary/40 rounded-xl shadow-lg p-6 hover:shadow-xl transition flex flex-col justify-center">
            <h3 className="font-mono text-secondary mb-4">// DETAILS</h3>
            <div className="space-y-5">
              {/* Fullname with edit */}
              <div>
                <label className="font-mono text-xs text-secondary block mb-1">
                  FULLNAME
                </label>
                <div className="flex items-center gap-2">
                  {editingName ? (
                    <input
                      type="text"
                      value={details.fullname}
                      onChange={(e) =>
                        setDetails((d) => ({ ...d, fullname: e.target.value }))
                      }
                      className="flex-1 px-3 py-2 border border-highlight bg-transparent font-mono text-sm rounded-md focus:ring-1 focus:ring-highlight outline-none"
                    />
                  ) : (
                    <p className="font-mono text-lg text-primary">
                      {details.fullname || "Unnamed"}
                    </p>
                  )}
                  <button
                    onClick={() => setEditingName((prev) => !prev)}
                    className="text-secondary hover:text-highlight"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="font-mono text-xs text-secondary block mb-1">
                  GENDER
                </label>
                <div className="flex gap-3">
                  {["Male", "Female"].map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        setGender(g);
                        setAvatarIndex(0);
                      }}
                      className={`flex-1 py-2 border font-mono text-sm rounded-md transition-all ${
                        gender === g
                          ? "border-highlight text-highlight bg-highlight/10"
                          : "border-secondary/50 text-secondary hover:border-highlight hover:text-highlight"
                      }`}
                    >
                      {g.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="font-mono text-xs text-secondary block mb-1">
                  AGE
                </label>
                <input
                  type="number"
                  placeholder="Age"
                  value={details.age}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, age: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-secondary/50 bg-transparent font-mono text-sm rounded-md focus:ring-1 focus:ring-highlight outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="font-mono text-xs text-secondary block mb-1">
                  ROLE
                </label>
                <input
                  type="text"
                  placeholder="Role (e.g. Developer, Student)"
                  value={details.role}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, role: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-secondary/50 bg-transparent font-mono text-sm rounded-md focus:ring-1 focus:ring-highlight outline-none"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="font-mono text-xs text-secondary block mb-1">
                  BIO
                </label>
                <textarea
                  placeholder="Short bio (e.g. Passionate developer with a focus on AI)"
                  value={details.bio}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, bio: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-secondary/50 bg-transparent font-mono text-sm rounded-md focus:ring-1 focus:ring-highlight outline-none h-24 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Avatar Preview */}
          <div className="bg-background/40 backdrop-blur-md border border-secondary/40 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center hover:shadow-xl transition">
            {gender ? (
              <>
                <h3 className="font-mono text-secondary mb-6">// PREVIEW</h3>
                <div className="flex items-center gap-6">
                  <button
                    onClick={handlePrevAvatar}
                    className="p-2 text-secondary hover:text-highlight transition"
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <div className="relative flex flex-col items-center group">
                    <div className="w-48 h-48 rounded-full border-2 border-highlight overflow-hidden shadow-xl mb-3 relative transition-transform group-hover:scale-105">
                      <img
                        src={avatars[gender][avatarIndex].src}
                        alt={avatars[gender][avatarIndex].name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 rounded-full border-4 border-highlight/40 animate-ping"></div>
                    </div>
                    <p className="font-mono text-highlight text-lg">
                      {avatars[gender][avatarIndex].name}
                    </p>
                  </div>
                  <button
                    onClick={handleNextAvatar}
                    className="p-2 text-secondary hover:text-highlight transition"
                  >
                    <ChevronRight size={32} />
                  </button>
                </div>
              </>
            ) : (
              <p className="font-mono text-secondary">Select gender first</p>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      {gender && (
        <div className="mt-6">
          <button
            onClick={handleSaveInfo}
            disabled={saving}
            className="w-full px-6 py-3 border font-mono text-base rounded-md border-secondary/50 hover:border-highlight hover:text-highlight transition-all disabled:opacity-50"
          >
            {saving ? "[ SAVING... ]" : "[ SAVE_INFO ]"}
          </button>
        </div>
      )}
    </div>
  );
};

export default AvatarPage;