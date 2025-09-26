import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({ email: '', passcode: '' });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.passcode) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    const result = await signIn(formData.email, formData.passcode);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      alert(result.error || 'Login failed. Please try again.');
    }
  };

  // Google One-Tap / Sign-In
  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (response) => {
          const userObject = JSON.parse(atob(response.credential.split('.')[1]));
          setFormData((prev) => ({ ...prev, email: userObject.email }));
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-login'),
        {
          theme: isDark ? 'outline' : 'filled_blue',
          size: 'large',
          width: 300, // numeric width fixes "100%" error
          shape: 'rectangular',
          text: 'signin_with',
        }
      );
    }
  }, [isDark]);

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

        {/* Google Login Button */}
        <div id="google-login" className="mb-6"></div>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-secondary/50"></div>
          <span className="flex-shrink mx-4 text-secondary font-mono text-xs">OR</span>
          <div className="flex-grow border-t border-secondary/50"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="font-mono text-xs text-secondary block mb-2">EMAIL</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full bg-transparent border border-secondary/50 p-3 text-primary font-mono focus:border-highlight focus:outline-none transition-colors ${
                isDark ? '' : 'focus:bg-surface'
              }`}
              required
            />
          </div>

          <div>
            <label className="font-mono text-xs text-secondary block mb-2">PASSCODE</label>
            <input
              type="password"
              name="passcode"
              value={formData.passcode}
              onChange={handleInputChange}
              className={`w-full bg-transparent border border-secondary/50 p-3 text-primary font-mono focus:border-highlight focus:outline-none transition-colors ${
                isDark ? '' : 'focus:bg-surface'
              }`}
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-background p-3 text-center font-mono text-sm disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'AUTHENTICATING...' : '[ AUTHENTICATE ]'}
          </motion.button>
        </form>

        <p className="mt-4 text-center text-secondary text-xs font-mono">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
