import { useEffect, useRef } from 'react';

const MatrixRain = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const columns = Math.floor(window.innerWidth / 20);
    
    const createChar = () => {
      const char = document.createElement('div');
      char.className = 'matrix-char';
      char.textContent = chars[Math.floor(Math.random() * chars.length)];
      char.style.left = Math.random() * 100 + '%';
      char.style.animationDuration = (Math.random() * 15 + 10) + 's';
      char.style.opacity = Math.random() * 0.8 + 0.2;
      container.appendChild(char);

      setTimeout(() => {
        if (container.contains(char)) {
          container.removeChild(char);
        }
      }, 25000);
    };

    const interval = setInterval(() => {
      if (Math.random() < 0.1) {
        createChar();
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return <div ref={containerRef} className="matrix-rain" />;
};

export default MatrixRain;
