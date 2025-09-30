import { User, MessageSquare, Search } from "lucide-react";

const CompactUserResult = ({ user, onChatClick }) => (
  <div className="flex items-center justify-between px-3 py-2 border-b border-secondary/30 hover:bg-secondary/10 transition">
    {/* Left: avatar + name + role */}
    <div className="flex items-center gap-3 min-w-0 flex-[1]">
      <div className="w-8 h-8 border border-secondary flex items-center justify-center rounded shrink-0">
        <User size={16} className="text-secondary" />
      </div>
      <div className="truncate">
        <h4 className="text-primary text-sm truncate">{user.name}</h4>
        <p className="text-xs text-secondary truncate">{user.role}</p>
      </div>
    </div>

    {/* Right: Icons (side by side) */}
    <div className="flex gap-2 flex-[0.5] items-center justify-end">
      <button
        onClick={(e) => {
          e.stopPropagation();           // prevent parent link click
          onChatClick?.(user);           // ✅ trigger chat creation
        }}
        className={`p-1 rounded hover:bg-highlight hover:text-white transition ${
          user.requested ? "opacity-50 cursor-not-allowed" : "text-highlight"
        }`}
        disabled={user.requested}
        title={user.requested ? "Requested" : "Chat"}
      >
        <MessageSquare size={16} />
      </button>
      <button
        onClick={() => alert(`Inspecting ${user.name}`)}
        className="p-1 rounded hover:bg-highlight hover:text-white transition text-primary"
        title="Inspect"
      >
        <Search size={16} />
      </button>
    </div>
  </div>
);

export default CompactUserResult;