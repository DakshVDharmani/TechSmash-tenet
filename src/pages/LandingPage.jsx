import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const TypewriterText = ({ text, delay = 0 }) => {
  const characters = Array.from(text);
  return (
    <>
      {characters.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.05, delay: delay + i * 0.05 }}
        >
          {char}
        </motion.span>
      ))}
    </>
  );
};

const LandingPage = () => {
  const { isDark } = useTheme();
  const panels = ["SET_GOALS", "MONITOR_REALITY", "REWIND_&_CONNECT"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
      <motion.div 
        className="text-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <h1 className="font-mono text-5xl md:text-7xl font-bold text-primary tracking-[0.3em] mb-4">
          <TypewriterText text="NEXORA" />
        </h1>
        <p className="font-mono text-lg md:text-xl text-secondary tracking-widest mb-12">
          <TypewriterText text="ALIGN YOUR TIMELINE." delay={0.5} />
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-12">
          {panels.map((text, i) => (
            <motion.div
              key={text}
              className={`font-mono text-sm border border-secondary text-secondary py-3 px-6 ${
                isDark ? 'hover:border-primary' : 'hover:border-primary hover:bg-surface'
              } transition-colors`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 + i * 0.2 }}
            >
              {text}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.8 }}
        >
          <Link to="/login">
            <motion.button
              className="font-mono text-primary border border-primary px-10 py-3 hover:bg-primary hover:text-background transition-colors duration-300 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="group-hover:animate-glitch">[ ENTER_SYSTEM ]</span>
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
      
      <motion.p
        className="absolute bottom-4 font-mono text-xs text-secondary/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
      >
        © NEXORA_SYSTEMS // CLASSIFIED
      </motion.p>
    </div>
  );
};

export default LandingPage;
