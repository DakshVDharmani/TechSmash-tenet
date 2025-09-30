import { useEffect, useState } from "react";
import SemanticMatchCard from "../components/SemanticMatchCard"; // ✅ same card as PeersPage
import { supabase } from "../supabaseClient";
import { createOrGetChat } from "../utils/chatUtils";
import { Info } from 'lucide-react';

const PEER_MARGIN = 15; // ±15% band counts as “peer”

export default function FuturePage({ onNewChat }) {
  const [matches, setMatches] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1️⃣  Get logged-in user id
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Auth error:", error);
        return;
      }
      setCurrentUserId(data?.user?.id ?? null);
    })();
  }, []);

  // 2️⃣  Create / open chat
  const handleConnect = async (targetUserId, participantName) => {
    if (!currentUserId || !targetUserId) return;

    setMatches(prev =>
      prev.map(m =>
        m.peer_id === targetUserId ? { ...m, requested: true } : m
      )
    );

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
      setMatches(prev =>
        prev.map(m =>
          m.peer_id === targetUserId ? { ...m, requested: false } : m
        )
      );
    }
  };

  // 3️⃣  Fetch semantic matches + peers' progress, then show only FUTURE
  useEffect(() => {
    if (!currentUserId) return;

    const fetchFuture = async () => {
      setLoading(true);
      try {
        // --- my overall progress
        const { data: myRow, error: myErr } = await supabase
          .from("overall_progress")
          .select("overall_progress")
          .eq("id", currentUserId)
          .single();
        if (myErr) throw myErr;
        const myProgress = myRow?.overall_progress ?? 0;

        // --- semantic similarity rows (for similarity + names)
        const { data: semanticRows, error: rpcErr } = await supabase.rpc(
          "match_goals_to_roadmaps",
          { p_user_id: currentUserId }
        );
        if (rpcErr) throw rpcErr;

        // unique peer ids
        const peerIds = [...new Set((semanticRows || []).map(r => r.peer_id))];
        if (peerIds.length === 0) {
          setMatches([]);
          setLoading(false);
          return;
        }

        // --- get peers' overall progress
        const { data: progressRows, error: progErr } = await supabase
          .from("overall_progress")
          .select("id, overall_progress")
          .in("id", peerIds);
        if (progErr) throw progErr;

        const progressMap = {};
        (progressRows || []).forEach(r => {
          progressMap[r.id] = r.overall_progress ?? 0;
        });

        // --- build final list and classify
        const final = (semanticRows || []).map(p => {
          const peerProg = progressMap[p.peer_id] ?? 0;

          let category = "PEER";
          if (peerProg > myProgress + PEER_MARGIN) category = "FUTURE";
          else if (peerProg < myProgress - PEER_MARGIN) category = "PAST";

          return {
            peer_id: p.peer_id,
            peer_name: p.peer_name || "Unknown",
            roadmap_title: p.roadmap_title,
            similarity: Number(p.similarity) || 0,
            overall_progress: peerProg, // ✅ alignment score
            time_category: category,
            requested: false
          };
        });

        // 🔹 Only show FUTURE connections on this page
        setMatches(final.filter(m => m.time_category === "FUTURE"));
      } catch (err) {
        console.error("FuturePage semantic match error:", err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFuture();
  }, [currentUserId]);

  // 4️⃣  UI
  return (
    <div className="min-h-screen p-8 md:p-12">
      <h1 className="font-mono text-3xl text-primary mb-4">
        FUTURE_CONNECTIONS
      </h1>
       <div className="flex items-center gap-3 text-secondary mb-6 w-full">
        <Info className="w-6 h-6 text-primary" />
        <p className="font-mono text-primary text-sm leading-snug flex-1">
        FUTURE / PRESENT / PAST are determined only from the
        User's overall progress. Semantic similarity is
        shown for each match.
      </p>
      </div>

      {loading ? (
        <p className="font-mono text-secondary">
          Loading future connections…
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {matches.map((m, i) => (
            <SemanticMatchCard
              key={`${m.peer_id ?? "future"}-${i}`}
              match={m}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}