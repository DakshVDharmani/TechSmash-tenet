import { motion } from 'framer-motion';
import { mockMentors, mockPeers, mockMentees } from '../data/mockData';
import { User } from 'lucide-react';

const UserCard = ({ user, index }) => (
  <motion.div
    className="border border-secondary/50 p-4 font-mono hover:border-highlight transition-colors"
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
    <p className="text-xs text-secondary">GOAL: {user.goal}</p>
    <p className="text-xs text-secondary">ALIGNMENT: {user.alignmentScore}%</p>
    <button className="text-xs text-highlight mt-4">[ CONNECT ]</button>
  </motion.div>
);

const SocialPage = () => {
  return (
    <div className="min-h-screen p-8 md:p-12">
      <h1 className="font-mono text-3xl text-primary mb-8">CONNECTION_HUB</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <h2 className="font-mono text-xl text-secondary mb-4">// FUTURE_MENTORS</h2>
          <div className="space-y-4">
            {mockMentors.map((user, i) => <UserCard key={user.id} user={user} index={i} />)}
          </div>
        </div>
        <div>
          <h2 className="font-mono text-xl text-secondary mb-4">// PARALLEL_PEERS</h2>
          <div className="space-y-4">
            {mockPeers.map((user, i) => <UserCard key={user.id} user={user} index={i} />)}
          </div>
        </div>
        <div>
          <h2 className="font-mono text-xl text-secondary mb-4">// PAST_MENTEES</h2>
          <div className="space-y-4">
            {mockMentees.map((user, i) => <UserCard key={user.id} user={user} index={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialPage;
