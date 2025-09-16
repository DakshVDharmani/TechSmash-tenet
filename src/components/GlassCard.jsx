import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const GlassCard = ({ 
  children, 
  className = '', 
  hover = true, 
  onClick,
  ...props 
}) => {
  return (
    <motion.div
      className={cn(
        'glass-card p-6',
        hover && 'hover:bg-white/10 hover:border-white/20 cursor-pointer',
        className
      )}
      whileHover={hover ? { scale: 1.02, y: -5 } : {}}
      whileTap={hover ? { scale: 0.98 } : {}}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
