import { useEffect, useState } from "react";
import SemanticMatchCard from "../components/SemanticMatchCard"; // ✅ use the unified card
import { supabase } from "../supabaseClient";
import { createOrGetChat } from "../utils/chatUtils";
import { Info } from 'lucide-react';

const PEER_MARGIN = 15; // ±15% window counts as “peer”

export default function PastPage({ onNewChat }) {
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

  // 3️⃣  Fetch semantic matches + peers' progress, then show only PAST
  useEffect(() => {
    if (!currentUserId) return;

    const fetchPast = async () => {
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

        // --- semantic similarity rows
        const { data: semanticRows, error: rpcErr } = await supabase.rpc(
          "match_goals_to_roadmaps",
          { p_user_id: currentUserId }
        );
        if (rpcErr) throw rpcErr;

        if (!semanticRows || semanticRows.length === 0) {
          setMatches([]);
          setLoading(false);
          return;
        }

        // --- group by peer_id and compute average similarity
        const groupedByPeer = semanticRows.reduce((acc, row) => {
          const peerId = row.peer_id;
          if (!acc[peerId]) {
            acc[peerId] = {
              peer_id: peerId,
              peer_name: row.peer_name || "Unknown",
              roadmap_titles: [],
              similarities: [],
            };
          }
          acc[peerId].roadmap_titles.push(row.roadmap_title);
          acc[peerId].similarities.push(Number(row.similarity) || 0);
          return acc;
        }, {});

        // --- fetch peers' overall progress
        const peerIds = Object.keys(groupedByPeer);
        const { data: progressRows, error: progErr } = await supabase
          .from("overall_progress")
          .select("id, overall_progress")
          .in("id", peerIds);
        if (progErr) throw progErr;

        const progressMap = {};
        (progressRows || []).forEach(r => {
          progressMap[r.id] = r.overall_progress ?? 0;
        });

        // --- merge, compute average similarity, and classify, then filter for PAST
        const final = Object.values(groupedByPeer).map(peer => {
          const peerProg = progressMap[peer.peer_id] ?? 0;
          const avgSimilarity = peer.similarities.length > 0
            ? peer.similarities.reduce((sum, sim) => sum + sim, 0) / peer.similarities.length
            : 0;

          let category = "PEER";
          if (peerProg > myProgress + PEER_MARGIN) category = "FUTURE";
          else if (peerProg < myProgress - PEER_MARGIN) category = "PAST";

          return {
            peer_id: peer.peer_id,
            peer_name: peer.peer_name,
            roadmap_title: peer.roadmap_titles.join(", "), // Combine titles for display
            similarity: avgSimilarity,
            overall_progress: peerProg,
            time_category: category,
            requested: false
          };
        });

        // 🔹 Only show PAST connections on this page
        setMatches(final.filter(m => m.time_category === "PAST"));
      } catch (err) {
        console.error("PastPage semantic match error:", err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPast();
  }, [currentUserId]);

  // 4️⃣  UI
  return (
    <div className="min-h-screen p-8 md:p-12">
      <h1 className="font-mono text-3xl text-primary mb-4">PAST_CONNECTIONS</h1>
      <div className="flex items-center gap-3 text-secondary mb-6 w-full">
        <Info className="w-6 h-6 text-primary" />
        <p className="font-mono text-primary text-sm leading-snug flex-1">
        PAST / PEER / FUTURE are decided only from the User's overall progress. Semantic similarity is
        displayed but not used for classification.
      </p>
      </div>

      {loading ? (
        <p className="font-mono text-secondary">Loading past connections…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {matches.map((m, i) => (
            <SemanticMatchCard
              key={`${m.peer_id ?? "past"}-${i}`}
              match={m}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}