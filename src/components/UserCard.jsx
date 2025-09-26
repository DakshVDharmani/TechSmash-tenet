import { User } from "lucide-react";
import GlassCard from "./GlassCard";

const UserCard = ({ user, index }) => (
  <GlassCard
    className="font-mono border border-secondary/50"
    hover={true}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 border border-secondary flex items-center justify-center">
        <User size={24} className="text-secondary" />
      </div>
      <div>
        <h4 className="text-primary">{user.name}</h4>
        <p className="text-xs text-secondary">{user.role}</p>
      </div>
    </div>
    <p className="text-xs text-secondary">CURRENT_GOAL: {user.goal || "No active goal"}</p>
    <p className="text-xs text-secondary">ALIGNMENT_SCORE: {user.alignmentScore ?? 0}%</p>
    <p className="text-xs text-secondary italic">STATUS_NOTE: {user.statusNote || "No notes"}</p>
    <button
      className="text-xs text-highlight mt-4 border border-highlight px-2 py-1 rounded hover:bg-highlight hover:text-white transition"
      onClick={user.onConnectClick}
      disabled={user.requested}
    >
      {user.requested ? "[ REQUESTED ]" : "[ CONNECT ]"}
    </button>
  </GlassCard>
);

export default UserCard;