import { useEffect, useState } from "react";
import UserCard from "../components/UserCard";
import { supabase } from "../supabaseClient";
import { createOrGetChat } from "../utils/chatUtils";

const PastPage = ({ onNewChat }) => {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) return console.error("Auth error:", error);
        setCurrentUserId(data?.user?.id ?? null);
      } catch (err) {
        console.error("getCurrentUser error:", err);
      }
    };
    getCurrentUser();
  }, []); // stable literal

  const handleConnect = async (targetUserId, participantName) => {
    if (!currentUserId || !targetUserId) return;
    setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, requested: true } : u));
    try {
      const chatData = await createOrGetChat(currentUserId, targetUserId);
      if (chatData && typeof onNewChat === "function") {
        onNewChat({
          chatId: chatData.chatId,
          participantName,
          aesKey: chatData.aesKey
        });
      }
    } catch (err) {
      console.error("createOrGetChat error:", err);
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, requested: false } : u));
    }
  };

  useEffect(() => {
    if (!currentUserId) return;

    const fetchPastUsers = async () => {
      try {
        const { data: myData, error: myError } = await supabase
          .from("overall_progress")
          .select("overall_progress")
          .eq("id", currentUserId)
          .single();
        if (myError) throw myError;
        const myProgress = myData?.overall_progress ?? 0;

        const { data: allProfiles, error: profilesError } = await supabase
          .from("Profiles")
          .select(`
            id,
            fullname,
            overall_progress:overall_progress!inner(overall_progress),
            objectives!left(user_id, title, progress, status)
          `)
          .neq("id", currentUserId);

        if (profilesError) throw profilesError;

        const pastUsers = (allProfiles || [])
          .filter(u => (u.overall_progress?.overall_progress ?? 0) < myProgress - 5)
          .map(u => {
            const topGoal = Array.isArray(u.objectives)
              ? u.objectives.sort((a, b) => b.progress - a.progress)[0]
              : null;

            return {
              id: u.id,
              name: u.fullname || "Unknown",
              role: "MENTOR",
              goal: topGoal?.title || "No active goal",
              statusNote: topGoal?.status || "No notes",
              alignmentScore: u.overall_progress?.overall_progress ?? 0,
              requested: false,
              onConnectClick: () => handleConnect(u.id, u.fullname || "Unknown")
            };
          });

        setUsers(pastUsers);
      } catch (err) {
        console.error("Fetch Profiles error:", err);
      }
    };

    fetchPastUsers();
  }, [currentUserId]); // stable literal

  return (
    <div className="min-h-screen p-8 md:p-12">
      <h1 className="font-mono text-3xl text-primary mb-8">PAST_CONNECTIONS</h1>
      <h2 className="font-mono text-lg text-secondary mb-6">
        These are mentors behind you — individuals whose goals and alignment are behind your current progress.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {users.map((user, i) => (
          <UserCard key={user.id} user={user} index={i} />
        ))}
      </div>
    </div>
  );
};

export default PastPage;