import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { mockUserStats } from '../data/mockData';

const DashboardPage = () => {
  const { realityScore, alignedMinutes, distractedMinutes, deviationAlerts } = mockUserStats;

  return (
    // 👇 subtract TopNavbar height (assume 4rem = 64px)
    <div className="h-[calc(100vh-4rem)] p-6 md:p-8 grid grid-rows-[auto,1fr,auto] gap-6">
      
      {/* Header */}
      <motion.header
        className="flex justify-between items-start"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="font-mono text-3xl text-primary">OPERATOR_DASHBOARD</h1>
          <p className="text-secondary">
            STATUS: <span className="text-success">NOMINAL</span>
          </p>
        </div>
        <div className="font-mono text-right text-sm">
          <p className="text-secondary">
            SESSION_START: {new Date().toUTCString()}
          </p>
          <p className="text-secondary">ID: USER_734</p>
        </div>
      </motion.header>

      {/* Middle Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden h-full">
        
        {/* Left Panel */}
        <motion.div
          className="lg:col-span-1 space-y-6 overflow-auto pr-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="border border-secondary/50 p-4 flex flex-col items-center">
            <div className="w-20 h-20 border-2 border-secondary flex items-center justify-center mb-4">
              <User size={40} className="text-secondary" />
            </div>
            <h2 className="font-mono text-lg text-primary">OPERATOR_734</h2>
            <p className="text-secondary text-sm">Clearance Level: 4</p>
          </div>
          <div className="border border-secondary/50 p-4">
            <h3 className="font-mono text-secondary mb-3">// QUICK_ACTIONS</h3>
            <div className="space-y-3">
              <Link
                to="/goals"
                className="block font-mono text-primary border border-secondary p-3 text-center hover:border-primary hover:bg-primary/10 transition-colors"
              >
                [ ADD_GOAL ]
              </Link>
              <Link
                to="/timeline"
                className="block font-mono text-primary border border-secondary p-3 text-center hover:border-primary hover:bg-primary/10 transition-colors"
              >
                [ VIEW_TIMELINE ]
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Center Panel */}
        <motion.div
          className="lg:col-span-2 border border-secondary/50 p-4 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="text-center">
            <p className="font-mono text-secondary text-lg mb-2">
              REALITY_SCORE
            </p>
            <p className="font-mono text-7xl md:text-8xl text-primary font-bold">
              {realityScore}
              <span className="text-2xl">%</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Panel */}
      <motion.div
        className="border border-secondary/50 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h3 className="font-mono text-secondary mb-3">// DAILY_SUMMARY</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-center">
          <div className="border border-success/50 p-3">
            <p className="text-3xl text-success font-bold">{alignedMinutes}</p>
            <p className="text-secondary text-sm">ALIGNED_MINUTES</p>
          </div>
          <div className="border border-alert/50 p-3">
            <p className="text-3xl text-alert font-bold">{distractedMinutes}</p>
            <p className="text-secondary text-sm">DISTRACTED_MINUTES</p>
          </div>
          <div className="border border-highlight/50 p-3">
            <p className="text-3xl text-highlight font-bold">{deviationAlerts}</p>
            <p className="text-secondary text-sm">DEVIATION_ALERTS</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
