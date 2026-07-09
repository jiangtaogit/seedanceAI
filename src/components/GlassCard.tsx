import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'accent' | 'success' | 'error' | 'none';
  onClick?: () => void;
}

export default function GlassCard({ children, className, hover = false, glow = 'none', onClick }: GlassCardProps) {
  const glowClass = {
    accent: 'hover:glow-accent',
    success: 'hover:glow-success',
    error: 'hover:glow-error',
    none: '',
  }[glow];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={cn(
        'glass rounded-xl p-4',
        hover && 'cursor-pointer transition-shadow duration-300',
        glowClass,
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
