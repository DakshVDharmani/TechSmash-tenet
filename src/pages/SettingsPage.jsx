import { motion } from 'framer-motion';
import { AnimatePresence } from "framer-motion";
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const Toggle = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center mb-[2vh]">
    <span className="text-primary" style={{ fontSize: "clamp(12px, 2.5vw, 16px)" }}>{label}</span>
    <div className="flex items-center gap-[1vw] text-sm">
      <span className={value ? 'text-secondary' : 'text-primary'} style={{ fontSize: "clamp(10px, 2vw, 14px)" }}>OFF</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-[clamp(30px,5vw,40px)] h-[clamp(18px,3vw,22px)] border border-secondary flex items-center p-[0.3vw] transition-all duration-200 hover:border-primary ${
          value ? 'justify-end' : 'justify-start'
        }`}
      >
        <motion.div
          className="w-[clamp(12px,2vw,16px)] h-[clamp(12px,2vw,16px)] bg-secondary"
          whileHover={{ scale: 1.1 }}
        />
      </button>
      <span className={value ? 'text-primary' : 'text-secondary'} style={{ fontSize: "clamp(10px, 2vw, 14px)" }}>ON</span>
    </div>
  </div>
);

const SettingsPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [overlay, setOverlay] = useState(false);
  const [timeout, setTimeout] = useState(30);
  const [softBlock, setSoftBlock] = useState(false);
  const [hardBlock, setHardBlock] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [fullname, setFullname] = useState('');
  const [notifications, setNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showSaving, setShowSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: settings } = await supabase
        .from('Settings')
        .select('*')
        .eq('id', user.id)
        .single();
      if (settings) {
        setOverlay(settings.overlay ?? false);
        setTimeout(settings.timeout ?? 30);
        setSoftBlock(settings.soft_block ?? false);
        setHardBlock(settings.hard_block ?? false);
        setCameraAccess(settings.camera_access ?? false);
        if (settings.theme === 'light' && isDark) toggleTheme();
        if (settings.theme === 'dark' && !isDark) toggleTheme();
      }
      const { data: profile } = await supabase
        .from('Profiles')
        .select('fullname')
        .eq('id', user.id)
        .single();
      if (profile) setFullname(profile.fullname || '');
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
  
    setLoading(true);
    setShowSaving(true);
    setStatusMsg('');
  
    try {
      const updates = {
        id: user.id,
        theme: isDark ? 'dark' : 'light',
        overlay: !!overlay,
        timeout: timeout ?? 30,
        soft_block: !!softBlock,
        hard_block: !!hardBlock,
        camera_access: !!cameraAccess,
        notifications: !!notifications,
      };
      const { error: settingsError } = await supabase
        .from('Settings')
        .upsert(updates, { onConflict: 'id' });
      if (settingsError) throw settingsError;
  
      const { error: profileError } = await supabase
        .from('Profiles')
        .update({ fullname })
        .eq('id', user.id);
      if (profileError) throw profileError;

      window.postMessage({
        type: "UPDATE_OVERLAY",
        overlay: updates.overlay
      }, "*");
  
      setStatusMsg('✅ Settings & profile updated successfully');
    } catch (err) {
      console.error('Save error:', err.message);
      setStatusMsg('⚠️ Failed to save changes');
    } finally {
      setLoading(false);
      setTimeout(() => setShowSaving(false), 800);
    }
  };

  return (
    <div className="min-h-[calc(95vh-4rem)] p-[clamp(16px,4vw,32px)] md:p-[clamp(24px,6vw,48px)] font-mono flex flex-col">
      <h1 className="text-primary mb-[2vh] shrink-0" style={{ fontSize: "clamp(20px, 5vw, 32px)" }}>
        SYSTEM_CONFIGURATION
      </h1>

      {/* Tip Row */}
      <div className="flex items-center gap-[1vw] text-secondary mb-[3vh]">
        <Info className="w-[clamp(12px,2vw,16px)] h-[clamp(12px,2vw,16px)] text-primary" />
        <span style={{ fontSize: "clamp(10px, 1.8vw, 12px)" }}>
          Always click [ APPLY_CHANGES ] to save your settings
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(16px,3vw,24px)] flex-1 w-full max-w-[90vw] mx-auto">
        {/* Theme Panel */}
        <motion.div
          className="border border-secondary/50 p-[clamp(12px,3vw,24px)] flex flex-col gap-[2vh]"
          style={{ minHeight: "clamp(200px,28vh,240px)" }}
          initial={{ opacity: 0, y: "2vh" }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-secondary" style={{ fontSize: "clamp(14px, 2.5vw, 18px)" }}>
            // VISUAL_MODE
          </h2>
          <div className="flex justify-between items-center">
            <span className="text-primary" style={{ fontSize: "clamp(12px, 2vw, 16px)" }}>
              THEME_PROTOCOL
            </span>
            <div className="flex items-center gap-[clamp(8px,2vw,16px)]">
              <span className={isDark ? 'text-primary' : 'text-secondary'} style={{ fontSize: "clamp(10px, 2vw, 14px)" }}>
                DARK
              </span>
              <button
                onClick={toggleTheme}
                className="relative w-[clamp(40px,6vw,64px)] h-[clamp(16px,3vw,24px)] border border-secondary flex items-center p-[0.5vw] transition-all duration-300 hover:border-primary group"
              >
                <motion.div
                  className="w-[clamp(12px,2vw,16px)] h-[clamp(12px,2vw,16px)] bg-secondary group-hover:bg-primary transition-colors"
                  animate={{ x: isDark ? 0 : "clamp(22px,4vw,34px)" }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </button>
              <span className={!isDark ? 'text-primary' : 'text-secondary'} style={{ fontSize: "clamp(10px, 2vw, 14px)" }}>
                LIGHT
              </span>
            </div>
          </div>
          <p className="text-secondary" style={{ fontSize: "clamp(10px, 1.8vw, 12px)" }}>
            // {isDark ? 'CLASSIFIED_TERMINAL_MODE' : 'CLASSIFIED_DOCUMENT_MODE'}
          </p>
        </motion.div>

        {/* Interface Panel */}
        <motion.div
          className="border border-secondary/50 p-[clamp(12px,3vw,24px)] flex flex-col gap-[clamp(12px,2vh,24px)]"
          style={{ minHeight: "clamp(200px,28vh,240px)" }}
          initial={{ opacity: 0, y: "2vh" }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-secondary" style={{ fontSize: "clamp(14px, 2.5vw, 18px)" }}>
            // INTERFACE
          </h2>

          <Toggle label="OVERLAY_ON/OFF" value={overlay} onChange={setOverlay} />

          {/* Timeout */}
          <div className="flex flex-col gap-[1vh]">
            <div className="flex justify-between items-center">
              <span className="text-primary" style={{ fontSize: "clamp(12px, 2vw, 16px)" }}>
                TIMEOUT
              </span>
              <div className="flex items-center gap-[clamp(8px,2vw,16px)]">
                <span className="text-secondary" style={{ fontSize: "clamp(10px, 1.8vw, 12px)" }}>
                  5m
                </span>
                <div className="relative w-[clamp(80px,20vw,128px)]">
                  <input
                    type="range"
                    min="5"
                    max="120"
                    value={timeout}
                    onChange={(e) => setTimeout(Number(e.target.value))}
                    className="w-full timeline-slider"
                  />
                  <div
                    className="absolute top-[clamp(24px,4vh,40px)] flex items-center gap-[1vw]"
                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                  >
                    <button
                      onClick={() => setTimeout(prev => Math.max(prev - 1, 5))}
                      className="w-[clamp(16px,3vw,20px)] h-[clamp(16px,3vw,20px)] border border-secondary flex items-center justify-center text-xs rounded"
                    >−</button>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={timeout}
                      onChange={(e) => setTimeout(Number(e.target.value))}
                      onBlur={() => setTimeout(prev => Math.min(Math.max(prev, 5), 120))}
                      className="w-[clamp(40px,10vw,48px)] text-center bg-transparent border border-secondary/50 p-[0.5vh] text-primary font-mono focus:outline-none focus:border-primary"
                      style={{ fontSize: "clamp(10px, 2vw, 12px)" }}
                    />
                    <button
                      onClick={() => setTimeout(prev => Math.min(prev + 1, 120))}
                      className="w-[clamp(16px,3vw,20px)] h-[clamp(16px,3vw,20px)] border border-secondary flex items-center justify-center text-xs rounded"
                    >+</button>
                  </div>
                </div>
                <span className="text-secondary" style={{ fontSize: "clamp(10px, 1.8vw, 12px)" }}>
                  120m
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Blocking Panel */}
        <motion.div
          className="border border-secondary/50 p-[clamp(12px,3vw,24px)] flex flex-col gap-[clamp(16px,3vh,32px)]"
          style={{ minHeight: "clamp(220px,30vh,260px)" }}
          initial={{ opacity: 0, y: "2vh" }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-secondary" style={{ fontSize: "clamp(14px, 2.5vw, 18px)" }}>
            // BLOCKING_PROTOCOL
          </h2>
          <Toggle 
  label="SOFT_BLOCK" 
  value={softBlock} 
  onChange={(val) => {
    setSoftBlock(val);
    if (val) setHardBlock(false); // turn off hardBlock if softBlock is on
  }} 
/>

<Toggle 
  label="HARD_BLOCK" 
  value={hardBlock} 
  onChange={(val) => {
    setHardBlock(val);
    if (val) setSoftBlock(false); // turn off softBlock if hardBlock is on
  }} 
/>

          <Toggle label="CAMERA" value={cameraAccess} onChange={setCameraAccess} />
        </motion.div>

        {/* Save Panel */}
        <motion.div
          className="border border-secondary/50 p-[clamp(12px,3vw,24px)] flex flex-col gap-[2vh]"
          style={{ minHeight: "clamp(220px,30vh,260px)" }}
          initial={{ opacity: 0, y: "2vh" }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-secondary" style={{ fontSize: "clamp(14px, 2.5vw, 18px)" }}>
            // ACTIONS
          </h2>
          <Toggle label="NOTIFICATIONS" value={notifications} onChange={setNotifications} />
          <div>
            <label className="font-mono text-secondary block mb-[1vh]" style={{ fontSize: "clamp(10px, 1.8vw, 12px)" }}>
              FULL NAME
            </label>
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              className="w-full bg-transparent border border-secondary/50 p-[1vh] text-primary font-mono focus:border-highlight focus:outline-none"
              style={{ fontSize: "clamp(12px, 2vw, 16px)" }}
            />
          </div>
          {statusMsg && <p className="text-secondary" style={{ fontSize: "clamp(10px, 1.8vw, 12px)" }}>{statusMsg}</p>}
          <motion.button
            onClick={handleSave}
            disabled={loading}
            className="font-mono text-primary border border-primary px-[clamp(16px,3vw,24px)] py-[1vh] hover:bg-primary hover:text-background transition-colors duration-300 disabled:opacity-50 self-end mt-[2vh]"
            style={{ fontSize: "clamp(12px, 2vw, 16px)" }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={loading ? "saving" : "apply"}
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.4 }}
              >
                {loading ? "[ SAVING... ]" : "[ APPLY_CHANGES ]"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;