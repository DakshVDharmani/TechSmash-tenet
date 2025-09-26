import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import badgeImage from "../assets/badge.png"; // round badge

const PreLandingPage = () => {
  const [clicked, setClicked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!clicked) {
        setClicked(true);
        setTimeout(() => {
          navigate("/landing");
        }, 1500);
      }
    };

    // Trigger animation on first user interaction
    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [clicked, navigate]);

  return (
    <div className="relative w-screen h-screen flex items-center justify-center bg-black overflow-hidden">
      {/* Badge container (responsive & centered) */}
      <div
        className="relative aspect-square"
        style={{
          width: "clamp(150px, 70vw, 600px)", // responsive badge size
        }}
      >
        {/* Left half */}
        <motion.div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url(${badgeImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderRadius: "50%",
            clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
          }}
          animate={clicked ? { x: "-60vw" } : { x: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Right half */}
        <motion.div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url(${badgeImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderRadius: "50%",
            clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)",
          }}
          animate={clicked ? { x: "60vw" } : { x: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
};

export default PreLandingPage;