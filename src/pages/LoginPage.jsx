import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate login
    setTimeout(() => navigate('/dashboard'), 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative">
      <motion.div
        className={`w-full max-w-sm border border-secondary/50 p-8 relative z-10 ${
          isDark ? '' : 'bg-surface/80 backdrop-blur-sm'
        }`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-mono text-2xl text-center text-primary mb-8 tracking-widest">
          SYSTEM_ACCESS
        </h1>
        
        <motion.button
          onClick={handleLogin}
          className={`w-full border border-secondary text-secondary hover:border-primary hover:text-primary transition-colors p-3 text-center font-mono text-sm mb-6 ${
            isDark ? '' : 'hover:bg-surface'
          }`}
          whileHover={{
            boxShadow: isDark ? "0 0 5px rgba(224, 224, 224, 0.3)" : "0 0 5px rgba(17, 17, 17, 0.3)",
            scale: 1.02
          }}
        >
          LOGIN WITH GOOGLE
        </motion.button>
        
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-secondary/50"></div>
          <span className="flex-shrink mx-4 text-secondary font-mono text-xs">OR</span>
          <div className="flex-grow border-t border-secondary/50"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="font-mono text-xs text-secondary block mb-2">OPERATOR_ID</label>
            <input
              type="email"
              className={`w-full bg-transparent border border-secondary/50 p-3 text-primary font-mono focus:border-highlight focus:outline-none transition-colors ${
                isDark ? '' : 'focus:bg-surface'
              }`}
            />
          </div>
          <div>
            <label className="font-mono text-xs text-secondary block mb-2">PASSCODE</label>
            <input
              type="password"
              className={`w-full bg-transparent border border-secondary/50 p-3 text-primary font-mono focus:border-highlight focus:outline-none transition-colors ${
                isDark ? '' : 'focus:bg-surface'
              }`}
            />
          </div>
          <motion.button
            type="submit"
            className="w-full bg-primary text-background p-3 text-center font-mono text-sm"
            whileHover={{
              boxShadow: isDark ? "0 0 10px rgba(224, 224, 224, 0.5)" : "0 0 10px rgba(17, 17, 17, 0.5)",
              scale: 1.02
            }}
            whileTap={{ scale: 0.98 }}
          >
            [ AUTHENTICATE ]
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
