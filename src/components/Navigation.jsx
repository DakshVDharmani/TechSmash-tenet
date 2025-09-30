import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Target,
  Spline,
  Users,
  Eye,
  MessageSquare,
  UserCog,
  Settings,
  Crown,
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [hovered, setHovered] = useState(false); // hover state
  const [pinned, setPinned] = useState(false); // pinned state
  const [connectCenterY, setConnectCenterY] = useState(0);
  const connectRef = useRef(null);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Target, label: "Goals", path: "/goals" },
    { icon: Spline, label: "Timeline", path: "/timeline" },
    { icon: Users, label: "Connect", path: "/social", isConnect: true },
    { icon: Eye, label: "Focus Monitor", path: "/FocusMonitor" },
    { icon: MessageSquare, label: "Messages", path: "/messages" },
    { icon: UserCog, label: "Identity", path: "/avatar" },
    { icon: Settings, label: "System", path: "/settings" },
  ];

  // Arc + button sizes
  const R = 80; // semicircle radius
  const D = R * 2;
  const buttonSize = 40;

  // Buttons on arc
  const connectOptions = [
    { label: "FUT", path: "/social/future", angleDeg: -90 },
    { label: "PRE", path: "/social/peers", angleDeg: 0 },
    { label: "PAS", path: "/social/past", angleDeg: 90 },
  ];

  // Track connect button position
  useEffect(() => {
    if (connectRef.current) {
      const rect = connectRef.current.getBoundingClientRect();
      setConnectCenterY(rect.top + rect.height / 2);
    }
  }, []);

  // Semicircle visible rule
  const showConnectMenu = (hovered || pinned) && connectCenterY > 0;

  // ✅ Close Connect menu when navigation changes
  useEffect(() => {
    setHovered(false);
    setPinned(false);
  }, [location.pathname]);

  return (
    <motion.nav
      className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-20 bg-background border-r border-secondary/50 z-50 flex flex-col items-center py-6"
      initial={{ x: -80 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      {/* Navigation Items (Supervisor at top) */}
      <div className="flex flex-col space-y-6 flex-1 relative items-center">
        {/* Supervisor Icon */}
        <Link
          to="/supervisor"
          title="Supervisor"
          className={`flex items-center justify-center w-12 h-12 transition-colors duration-200 ${
            location.pathname.startsWith("/supervisor")
              ? "text-highlight"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Crown size={22} strokeWidth={1.5} />
        </Link>

        {/* Other nav items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          // Special: Connect
          if (item.isConnect) {
            return (
              <div
                key="connect"
                ref={connectRef}
                className="relative"
                onMouseEnter={() => !pinned && setHovered(true)}
                onMouseLeave={() => !pinned && setHovered(false)}
              >
                {/* Connect icon */}
                <motion.div
                  title="Connect"
                  onClick={() => {
                    // toggle pinned
                    setPinned((prev) => !prev);
                    // close hover if unpinning
                    if (pinned) setHovered(false);
                  }}
                  className={`w-12 h-12 flex items-center justify-center relative cursor-pointer transition-colors duration-200 ${
                    isActive || pinned
                      ? "text-highlight"
                      : "text-secondary hover:text-primary"
                  }`}
                  whileHover={{ scale: 1.06 }}
                >
                  <Icon size={22} strokeWidth={1.5} />
                  {(isActive || pinned) && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-highlight"
                    />
                  )}
                </motion.div>

                {/* Semicircle menu */}
                <AnimatePresence>
                  {showConnectMenu && (
                    <motion.div
                      style={{
                        position: "fixed",
                        left: "80px", // sidebar width
                        top: `${connectCenterY - R}px`,
                        width: `${D}px`,
                        height: `${D}px`,
                        pointerEvents: "none",
                        zIndex: 60,
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 220,
                        damping: 20,
                      }}
                    >
                      {/* Arc (semicircle) */}
                      <svg
                        width={D}
                        height={D}
                        viewBox={`0 0 ${D} ${D}`}
                        className="block"
                        style={{
                          overflow: "visible",
                          pointerEvents: "none",
                        }}
                        aria-hidden
                      >
                        <path
                          d={`M 0 0 A ${R} ${R} 0 0 1 0 ${D}`}
                          stroke="var(--color-highlight)"
                          strokeWidth={2}
                          fill="none"
                          strokeOpacity="0.6"
                        />
                      </svg>

                      {/* Buttons */}
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: `${D}px`,
                          height: `${D}px`,
                          pointerEvents: "none",
                        }}
                      >
                        {connectOptions.map((opt, i) => {
                          const theta = (opt.angleDeg * Math.PI) / 180;
                          const cx = 0;
                          const cy = R;
                          const x = cx + R * Math.cos(theta);
                          const y = cy + R * Math.sin(theta);

                          const leftPx = x - buttonSize / 2;
                          const topPx = y - buttonSize / 2;

                          return (
                            <motion.button
                              key={opt.path}
                              onClick={() => {
                                navigate(opt.path);
                                // Hide menu immediately after click
                                setHovered(false);
                                setPinned(false);
                              }}
                              initial={{ scale: 0.85, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.85, opacity: 0 }}
                              transition={{
                                delay: i * 0.05,
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                              }}
                              className="absolute rounded-full bg-surface border border-secondary/50 text-xs font-mono text-secondary flex items-center justify-center hover:border-highlight hover:text-highlight"
                              style={{
                                left: `${leftPx}px`,
                                top: `${topPx}px`,
                                width: `${buttonSize}px`,
                                height: `${buttonSize}px`,
                                pointerEvents: "auto",
                                zIndex: 70,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                              }}
                            >
                              <span className="select-none">{opt.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          // Normal nav items
          return (
            <Link key={item.path} to={item.path} title={item.label}>
              <motion.div
                className={`w-12 h-12 flex items-center justify-center transition-colors duration-200 relative ${
                  isActive
                    ? "text-highlight"
                    : "text-secondary hover:text-primary"
                }`}
                whileHover={{ scale: 1.06 }}
              >
                <Icon size={22} strokeWidth={1.5} />
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-highlight"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default Navigation;