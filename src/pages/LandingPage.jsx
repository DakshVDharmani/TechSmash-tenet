import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect, useRef } from 'react';
import nexoraVideo from '../assets/nexora.mp4';

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
  const panels = ["CHART_THE_ROUTE", "MONITOR_REALITY", "RECALL_AND_LINK"];
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch((err) => console.warn("Autoplay blocked:", err));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative text-center px-[2vw]">
      
      {/* Hidden video for audio */}
      <video
        ref={videoRef}
        src={nexoraVideo}
        autoPlay
        playsInline
        loop={false}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
      />

      <motion.div 
        className="relative z-10 w-full max-w-[90vw]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Title */}
        <h1
          className="font-mono font-bold text-primary tracking-[0.3em] mb-[2vh]"
          style={{ fontSize: "clamp(24px, 8vw, 72px)" }}
        >
          <TypewriterText text="NEXORA" />
        </h1>

        {/* Subtitle */}
        <p
          className="font-mono text-secondary tracking-widest mb-[5vh]"
          style={{ fontSize: "clamp(12px, 2.5vw, 24px)" }}
        >
          <TypewriterText text="ALIGN YOUR TIMELINE." delay={0.5} />
        </p>

        {/* Panels */}
        <div className="flex flex-row gap-[2vw] mb-[5vh] justify-center flex-wrap">
          {panels.map((text, i) => (
            <motion.div
              key={text}
              className={`font-mono border border-secondary text-secondary transition-colors ${
                isDark ? 'hover:border-primary' : 'hover:border-primary hover:bg-surface'
              }`}
              style={{
                fontSize: "clamp(10px, 2vw, 16px)",
                padding: "1vh 2vw"
              }}
              initial={{ opacity: 0, y: "2vh" }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 + i * 0.2 }}
            >
              {text}
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <Link to="/signup">
          <motion.button
            className="font-mono border border-primary text-primary hover:bg-primary hover:text-background transition-colors duration-300 group"
            style={{
              fontSize: "clamp(12px, 2.5vw, 20px)",
              padding: "1vh 3vw"
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="group-hover:animate-glitch">[ ENTER_SYSTEM ]</span>
          </motion.button>
        </Link>
      </motion.div>

      {/* Footer */}
      <motion.p
        className="absolute bottom-[2vh] font-mono text-secondary/50 w-full px-[2vw]"
        style={{ fontSize: "clamp(8px, 1.5vw, 14px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
      >
        © NEXORA_SYSTEMS
      </motion.p>
    </div>
  );
};

export default LandingPage;




