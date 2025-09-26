import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    operatorId: '',
    email: '',
    passcode: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // <-- for error/success messages

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage(null); // clear previous messages when user types
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.fullName || !formData.operatorId || !formData.email || !formData.passcode) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    setLoading(true);
    const result = await signUp({
      fullname: formData.fullName,
      operator_id: formData.operatorId,
      email: formData.email,
      passcode: formData.passcode
    });
    setLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: result.pendingEmailConfirmation ? result.message : 'Registration successful! Redirecting to login...' });
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Registration failed.' });
    }
  };

  // Google One-Tap / Sign-Up
  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (response) => {
          const userObject = JSON.parse(atob(response.credential.split('.')[1]));
          setFormData((prev) => ({ ...prev, email: userObject.email }));
        }
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signup'),
        {
          theme: isDark ? 'outline' : 'filled_blue',
          size: 'large',
          width: 320,
          shape: 'rectangular',
          text: 'signup_with',
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
          SYSTEM_REGISTRATION
        </h1>

        {/* Google Sign-Up Button */}
        <div id="google-signup" className="mb-6"></div>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-secondary/50"></div>
          <span className="flex-shrink mx-4 text-secondary font-mono text-xs">OR</span>
          <div className="flex-grow border-t border-secondary/50"></div>
        </div>

        {message && (
          <p className={`text-xs font-mono mb-4 ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
            {message.text}
          </p>
        )}

        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label className="font-mono text-xs text-secondary block mb-2">FULL NAME</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={`w-full bg-transparent border border-secondary/50 p-3 text-primary font-mono focus:border-highlight focus:outline-none transition-colors ${
                isDark ? '' : 'focus:bg-surface'
              }`}
              required
            />
          </div>

          <div>
            <label className="font-mono text-xs text-secondary block mb-2">OPERATOR_ID</label>
            <input
              type="text"
              name="operatorId"
              value={formData.operatorId}
              onChange={handleInputChange}
              className={`w-full bg-transparent border border-secondary/50 p-3 text-primary font-mono focus:border-highlight focus:outline-none transition-colors ${
                isDark ? '' : 'focus:bg-surface'
              }`}
              required
            />
          </div>

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
            {loading ? 'REGISTERING...' : '[ REGISTER ]'}
          </motion.button>
        </form>
        <p className="mt-4 text-center text-secondary text-xs font-mono">
  Already a user?{' '}
  <Link to="/login" className="text-primary hover:underline">
    Sign in
  </Link>
</p>
      </motion.div>
    </div>
  );
};

export default SignUpPage;