import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { Link } from 'react-router-dom';

const NullPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="w-24 h-24 border-2 border-alert flex items-center justify-center mb-8 mx-auto animate-pulse">
          <User size={48} className="text-alert" />
        </div>
        <h1 className="font-mono text-3xl md:text-4xl text-alert mb-2 tracking-widest animate-glitch">
          DEVIATION_DETECTED
        </h1>
        <p className="font-mono text-lg text-secondary mb-12">[ 30_MIN_LIMIT_BREACHED ]</p>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link to="/dashboard">
                <motion.button
                    className="font-mono w-64 text-background bg-primary border border-primary px-10 py-3 hover:bg-transparent hover:text-primary transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    [ RESUME_FOCUS ]
                </motion.button>
            </Link>
            <Link to="/dashboard">
                <motion.button
                    className="font-mono w-64 text-primary border border-secondary px-10 py-3 hover:border-primary transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    [ TAKE_BREAK ]
                </motion.button>
            </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NullPage;
