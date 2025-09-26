import { useEffect, useState } from "react";
import UserCard from "../components/UserCard";
import { supabase } from "../supabaseClient";
import { createOrGetChat } from "../utils/chatUtils";

const FuturePage = ({ onNewChat }) => {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // load auth user id once
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
  }, []); // runs once

  // shared connect handler (optimistic)
  const handleConnect = async (targetUserId, participantName) => {
    if (!currentUserId || !targetUserId) return;

    // prevent double clicks via state
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
      // revert optimistic
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, requested: false } : u));
    }
  };

  // fetch future users when currentUserId is available
  useEffect(() => {
    if (!currentUserId) return;

    const fetchUsers = async () => {
      try {
        const { data: myData, error: myErr } = await supabase
          .from("overall_progress")
          .select("overall_progress")
          .eq("id", currentUserId)
          .single();
        if (myErr) throw myErr;
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

        const futureUsers = (allProfiles || [])
          .filter(u => (u.overall_progress?.overall_progress ?? 0) > myProgress + 5)
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

        setUsers(futureUsers);
      } catch (err) {
        console.error("fetchUsers error:", err);
      }
    };

    fetchUsers();
  }, [currentUserId]); // stable literal array (1 element)

  return (
    <div className="min-h-screen p-8 md:p-12">
      <h1 className="font-mono text-3xl text-primary mb-8">FUTURE_CONNECTIONS</h1>
      <h2 className="font-mono text-lg text-secondary mb-6">
        These are mentors ahead of you — individuals whose goals and alignment are further along.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {users.map((user, i) => (
          <UserCard key={user.id} user={user} index={i} />
        ))}
      </div>
    </div>
  );
};

export default FuturePage;