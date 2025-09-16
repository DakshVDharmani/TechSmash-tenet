import { motion } from 'framer-motion';
import { useState } from 'react';
import { mockGoals } from '../data/mockData';

const GoalsPage = () => {
  const [goals, setGoals] = useState(mockGoals);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [blockedDomains, setBlockedDomains] = useState('');

  // Handle goal submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) return; // don't allow empty title

    const newGoal = {
      id: Date.now(),
      title,
      description,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      allowedDomains: allowedDomains.split(',').map((d) => d.trim()).filter(Boolean),
      blockedDomains: blockedDomains.split(',').map((d) => d.trim()).filter(Boolean),
      status: 'Aligned',
      lastUpdated: new Date().toISOString(),
    };

    setGoals([...goals, newGoal]);

    // Reset form
    setTitle('');
    setDescription('');
    setTags('');
    setAllowedDomains('');
    setBlockedDomains('');

    setShowModal(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] p-8 md:p-12 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="font-mono text-3xl text-primary">MISSION_OBJECTIVES</h1>
        <button
          onClick={() => setShowModal(true)}
          className="font-mono text-primary border border-primary px-6 py-2 hover:bg-primary hover:text-background transition-colors"
        >
          [ NEW_OBJECTIVE ]
        </button>
      </header>

      {/* Goals Table */}
      <div className="border border-secondary/50 flex-1 overflow-auto">
        <div className="grid grid-cols-12 p-4 font-mono text-secondary text-sm border-b border-secondary/50 sticky top-0 bg-background z-10">
          <div className="col-span-5">TITLE</div>
          <div className="col-span-2">STATUS</div>
          <div className="col-span-5">LAST_UPDATE</div>
        </div>
        {goals.map((goal, index) => (
          <motion.div
            key={goal.id}
            className="grid grid-cols-12 p-4 font-mono text-primary border-b border-secondary/50 last:border-b-0 hover:bg-secondary/10 transition-colors cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="col-span-5">{goal.title}</div>
            <div
              className={`col-span-2 ${
                goal.status === 'Aligned' ? 'text-success' : 'text-alert'
              }`}
            >
              {goal.status.toUpperCase()}
            </div>
            <div className="col-span-5 text-secondary">
              {new Date(goal.lastUpdated).toUTCString()}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <motion.div
          className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowModal(false)}
        >
          <motion.div
            className="w-full max-w-2xl bg-background border border-secondary/50 p-8"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-mono text-2xl text-primary mb-6">
              COMMIT_NEW_GOAL
            </h2>
            <form className="space-y-4 font-mono" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="TITLE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <textarea
                placeholder="DESCRIPTION"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none h-24"
              ></textarea>
              <input
                type="text"
                placeholder="TAGS (COMMA_SEPARATED)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <input
                type="text"
                placeholder="ALLOWED_DOMAINS"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <input
                type="text"
                placeholder="BLOCKED_DOMAINS"
                value={blockedDomains}
                onChange={(e) => setBlockedDomains(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full font-mono text-secondary border border-secondary px-6 py-2 hover:text-primary hover:border-primary transition-colors"
                >
                  [ CANCEL ]
                </button>
                <button
                  type="submit"
                  className="w-full font-mono text-background bg-primary border border-primary px-6 py-2 hover:bg-transparent hover:text-primary transition-colors"
                >
                  [ COMMIT_GOAL ]
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default GoalsPage;
