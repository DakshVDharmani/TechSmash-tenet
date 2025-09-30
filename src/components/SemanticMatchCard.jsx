import { User } from "lucide-react";

/**
 * Safe Semantic Match Card
 * – shows peer name, stage (future/present/past),
 * – alignment score (overall_progress),
 * – semantic similarity score.
 *
 * All values are wrapped with optional chaining / defaults
 * so missing fields will not crash the page.
 */
export default function SemanticMatchCard({ match, onConnect }) {
  // ✅ guard all props
  const peerName = match?.peer_name || "Unknown";
  const timeCategory = (match?.time_category || "PEER").toUpperCase();
  const roadmapTitle = match?.roadmap_title || "No active goal";

  // ✅ safe numeric conversions
  const similarity = Number(match?.similarity ?? 0);
  const simScore = similarity.toFixed(3);               // 0–1 score
  const simPct = `${(similarity * 100).toFixed(1)}%`;   // % score

  const alignmentScore = Number(match?.overall_progress ?? 0); // from overall_progress table

  const requested = Boolean(match?.requested);

  return (
    <div className="font-mono border border-secondary/50 rounded p-4 bg-surface shadow-sm">
      {/* Header: avatar + name + stage + semantic score on the right */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 border border-secondary flex items-center justify-center">
            <User size={24} className="text-secondary" />
          </div>
          <div>
            <h4 className="text-primary">{peerName}</h4>
            <p className="text-xs text-secondary">{timeCategory}</p>
          </div>
        </div>

        {/* 👉 Semantic score floated to the right */}
        <div className="text-right">
          <p className="text-xs text-secondary">Semantic Score</p>
          <p className="text-sm text-primary font-bold">{simScore}</p>
          <p className="text-[10px] text-secondary">({simPct})</p>
        </div>
      </div>

      {/* Body: goal + progress */}
      <p className="text-xs text-secondary">
        CURRENT_GOAL: {roadmapTitle}
      </p>
      <p className="text-xs text-secondary">
        ALIGNMENT_SCORE: {alignmentScore}%
      </p>

      {/* Action */}
      <button
        className="text-xs text-highlight mt-4 border border-highlight px-2 py-1 rounded hover:bg-highlight hover:text-white transition"
        onClick={() => onConnect?.(match?.peer_id, peerName)}
        disabled={requested}
      >
        {requested ? "[ CONNECTED ]" : "[ CONNECT ]"}
      </button>
    </div>
  );
}