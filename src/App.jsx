import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { supabase } from './supabaseClient';

import PreLandingPage from './pages/PreLandingPage';
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import TimelinePage from './pages/TimelinePage';
import AvatarPage from './pages/AvatarPage';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import NullPage from './pages/NullPage';
import FuturePage from './pages/FuturePage';
import PeersPage from './pages/PeersPage';
import PastPage from './pages/PastPage';
import SupervisorPage from './pages/SupervisorPage'

import TopNavbar from './components/TopNavbar';
import Navigation from './components/Navigation';
import NoiseBackground from './components/NoiseBackground';

const AppLayout = ({ children }) => {
  const location = useLocation();
  
  // Pages where navbars should NOT appear
  const hideNav = ['/', '/landing', '/login', '/signup', '/null'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background text-primary font-sans transition-colors duration-300">
      <NoiseBackground />
      {!hideNav && <TopNavbar />}
      {!hideNav && <Navigation />}
      <main
        className={
          hideNav
            ? "flex items-center justify-center min-h-screen"
            : "pt-16 ml-20"
        }
      >
        {children}
      </main>
    </div>
  );
};

function App() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [newChat, setNewChat] = useState(null);

  // 🔑 Load the logged-in user's ID once
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("getUser error:", error);
      } else {
        setCurrentUserId(data?.user?.id ?? null);
      }

      // listen for login/logout changes
      supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUserId(session?.user?.id ?? null);
      });
    };
    init();
  }, []);

  // 📩 When a page (Future/Past/Peers) creates a new chat
  const handleNewChat = (chatObj) => {
    console.log("App: new chat from child page", chatObj);
    setNewChat(chatObj);
  };

  return (
    <AuthProvider>
      <Router>
        <ThemeProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<PreLandingPage />} />  
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/avatar" element={<AvatarPage />} />
              <Route path="/supervisor" element={<SupervisorPage/>} />

              {/* ✅ MessagesPage now gets myId and newChat */}
              <Route
                path="/messages"
                element={<MessagesPage myId={currentUserId} newChat={newChat} />}
              />

              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/null" element={<NullPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />

              {/* ✅ Pass onNewChat into social pages */}
              <Route path="/social/future" element={<FuturePage onNewChat={handleNewChat} />} />
              <Route path="/social/peers" element={<PeersPage onNewChat={handleNewChat} />} />
              <Route path="/social/past" element={<PastPage onNewChat={handleNewChat} />} />
            </Routes>
          </AppLayout>
        </ThemeProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;