import { User } from "lucide-react";
import { motion } from "framer-motion";
import GlassCard from "./GlassCard"; // ✅ use your GlassCard for consistent UI

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
        <p className="text-xs text-secondary">{user.status.toUpperCase()}</p>
      </div>
    </div>
    <p className="text-xs text-secondary">CURRENT_GOAL: {user.goal}</p>
    <p className="text-xs text-secondary">
      ALIGNMENT_SCORE: {user.alignmentScore}%
    </p>
    <p className="text-xs text-secondary italic">STATUS_NOTE: {user.bio}</p>
    <button className="text-xs text-highlight mt-4">[ CONNECT ]</button>
  </GlassCard>
);

export default UserCard;
