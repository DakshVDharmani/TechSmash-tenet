import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const Toggle = ({ label, initial = false }) => {
  const [enabled, setEnabled] = useState(initial);

  return (
    <div className="flex justify-between items-center">
      <span className="text-primary">{label}</span>
      <div className="flex items-center gap-2 text-sm">
        <span className={!enabled ? 'text-secondary' : 'text-primary'}>OFF</span>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-10 h-5 border border-secondary flex items-center p-0.5 transition-all duration-200 hover:border-primary ${
            enabled ? 'justify-end' : 'justify-start'
          }`}
        >
          <motion.div
            className="w-4 h-4 bg-secondary"
            whileHover={{ scale: 1.1 }}
          />
        </button>
        <span className={enabled ? 'text-secondary' : 'text-primary'}>ON</span>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    // 👇 fit under navbar
    <div className="h-[calc(100vh-4rem)] p-8 md:p-12 font-mono flex flex-col">
      <h1 className="text-3xl text-primary mb-8 shrink-0">SYSTEM_CONFIGURATION</h1>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        
        {/* Theme Panel */}
        <motion.div
          className="border border-secondary/50 p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-secondary mb-4">// VISUAL_MODE</h2>
          <div className="flex justify-between items-center">
            <span className="text-primary">THEME_PROTOCOL</span>
            <div className="flex items-center gap-4">
              <span className={isDark ? 'text-primary' : 'text-secondary'}>DARK</span>
              <button
                onClick={toggleTheme}
                className="w-16 h-6 border border-secondary flex items-center p-1 transition-all duration-300 hover:border-primary group"
              >
                <motion.div
                  className="w-4 h-4 bg-secondary group-hover:bg-primary transition-colors"
                  animate={{ x: isDark ? 0 : 24 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </button>
              <span className={!isDark ? 'text-primary' : 'text-secondary'}>LIGHT</span>
            </div>
          </div>
          <p className="text-xs text-secondary">
            // {isDark ? 'CLASSIFIED_TERMINAL_MODE' : 'CLASSIFIED_DOCUMENT_MODE'}
          </p>
        </motion.div>

        {/* Interface Panel */}
        <motion.div
          className="border border-secondary/50 p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h2 className="text-secondary mb-4">// INTERFACE</h2>
          <Toggle label="OVERLAY_ON/OFF" initial={true} />
          <div className="flex justify-between items-center">
            <span className="text-primary">TIMEOUT</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-secondary">5m</span>
              <input
                type="range"
                min="5"
                max="60"
                defaultValue="30"
                className="w-32 timeline-slider"
              />
              <span className="text-xs text-secondary">60m</span>
            </div>
          </div>
        </motion.div>

        {/* Blocking Panel */}
        <motion.div
          className="border border-secondary/50 p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-secondary mb-4">// BLOCKING_PROTOCOL</h2>
          <Toggle label="SOFT_BLOCK" initial={true} />
          <Toggle label="HARD_BLOCK" initial={false} />
          <Toggle label="DISABLE_CAMERA_ACCESS" initial={false} />
        </motion.div>

        {/* Save Panel */}
        <motion.div
          className="border border-secondary/50 p-6 flex flex-col justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h2 className="text-secondary mb-4">// ACTIONS</h2>
          <motion.button
            className="font-mono text-primary border border-primary px-6 py-2 hover:bg-primary hover:text-background transition-colors duration-300 self-end"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            [ APPLY_CHANGES ]
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
