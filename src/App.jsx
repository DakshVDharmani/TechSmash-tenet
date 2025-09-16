import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import TimelinePage from './pages/TimelinePage';
import AvatarPage from './pages/AvatarPage';
import SocialPage from './pages/SocialPage';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import NullPage from './pages/NullPage';
import FuturePage from './pages/FuturePage';
import PeersPage from './pages/PeersPage';
import PastPage from './pages/PastPage';

import TopNavbar from './components/TopNavbar';
import Navigation from './components/Navigation';
import NoiseBackground from './components/NoiseBackground';

const AppLayout = ({ children }) => {
  const location = useLocation();
  
  // Pages where navbars should NOT appear
  const hideNav = ['/', '/login', '/signup', '/null'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background text-primary font-sans transition-colors duration-300">
      <NoiseBackground />
      {!hideNav && <TopNavbar />}
      {!hideNav && <Navigation />}
      <main
        className={
          hideNav
            ? "flex items-center justify-center min-h-screen" // Center content for landing/login/signup
            : "pt-16 ml-20" // Normal layout when navbars are visible
        }
      >
        {children}
      </main>
    </div>
  );
};


function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/avatar" element={<AvatarPage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/null" element={<NullPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/social/future" element={<FuturePage />} />
            <Route path="/social/peers" element={<PeersPage />} />
            <Route path="/social/past" element={<PastPage />} />
          </Routes>
        </AppLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
