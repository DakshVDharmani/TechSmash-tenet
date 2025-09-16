import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sun, Moon, User, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils/cn';

const TopNavbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm border-b border-secondary/50 z-50",
      "flex items-center justify-between px-4 md:px-8"
    )}>
      {/* Left Section */}
      <Link to="/dashboard" className="font-mono text-xl font-bold text-primary tracking-widest">
        NEXORA
      </Link>

      {/* Center Section */}
      <div className="relative w-full max-w-md hidden md:block mx-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} strokeWidth={1.5} />
        <input
          type="text"
          placeholder="SEARCH_SYSTEM..."
          className="w-full bg-transparent border border-secondary/50 py-2 pl-10 pr-4 text-primary font-mono text-sm focus:border-highlight focus:outline-none transition-colors"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 md:gap-6">
        <button onClick={toggleTheme} className="text-secondary hover:text-primary transition-colors">
          {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
        </button>
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-8 h-8 rounded-full border border-secondary flex items-center justify-center text-secondary hover:border-primary hover:text-primary transition-colors">
            <User size={18} strokeWidth={1.5} />
          </button>
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-48 bg-surface border border-secondary/50 font-mono text-sm"
              >
                <Link to="/avatar" onClick={() => setIsDropdownOpen(false)} className="block w-full text-left px-4 py-2 text-primary hover:bg-secondary/10 transition-colors">
                  Profile
                </Link>
                <Link to="/login" onClick={() => setIsDropdownOpen(false)} className="block w-full text-left px-4 py-2 text-primary hover:bg-secondary/10 transition-colors">
                  Logout
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
