import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const NoiseBackground = () => {
  const { isDark } = useTheme();
  
  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${
      isDark ? 'dark-noise' : 'light-paper'
    }`} />
  );
};

export default NoiseBackground;
