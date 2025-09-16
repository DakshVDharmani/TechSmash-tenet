import { motion } from 'framer-motion';
import { useState } from 'react';

const Avatar = ({ 
  size = 'md', 
  expression = 'happy', 
  animate = true, 
  onClick,
  className = '' 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
    xl: 'w-32 h-32 text-6xl'
  };

  const expressions = {
    happy: '😊',
    focused: '🎯',
    encouraging: '💪',
    celebrating: '🎉',
    thinking: '🤔',
    waving: '👋',
    crossed: '😤'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} avatar-container cursor-pointer ${className}`}
      animate={animate ? {
        y: [0, -5, 0],
        rotate: isHovered ? [0, 5, -5, 0] : 0
      } : {}}
      transition={{
        y: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        },
        rotate: {
          duration: 0.5,
          ease: "easeInOut"
        }
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
    >
      <span className="select-none">
        {expressions[expression]}
      </span>
    </motion.div>
  );
};

export default Avatar;
