import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Lock, Check, AlertCircle } from 'lucide-react';
import { changePassword } from '@/services/api';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setError('');
    setSuccess(false);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (currentPassword.length < 6) {
      setError('请输入当前密码');
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 32) {
      setError('新密码长度需在6-32个字符之间');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次新密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      // Auto close after 1.5s
      setTimeout(() => handleClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-nav rounded-2xl overflow-hidden border border-white/[0.06]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-accent" />
                <h3 className="font-heading font-semibold text-sm text-text-primary">修改密码</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors"
              >
                <X size={14} className="text-text-secondary" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
              {/* Current Password */}
              <div>
                <label className="block text-[10px] text-text-secondary mb-1">当前密码</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="请输入当前密码"
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-bg-primary/60 border border-white/[0.08] text-text-primary text-xs placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-secondary transition-colors"
                  >
                    {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[10px] text-text-secondary mb-1">新密码</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6-32个字符"
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-bg-primary/60 border border-white/[0.08] text-text-primary text-xs placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-secondary transition-colors"
                  >
                    {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-[10px] text-text-secondary mb-1">确认新密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  className="w-full px-3 py-2 rounded-lg bg-bg-primary/60 border border-white/[0.08] text-text-primary text-xs placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 text-error text-[10px] bg-error/10 rounded-lg px-2.5 py-1.5"
                  >
                    <AlertCircle size={12} />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 text-success text-[10px] bg-success/10 rounded-lg px-2.5 py-1.5"
                  >
                    <Check size={12} />
                    <span>密码修改成功</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-bg-primary text-xs font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
                ) : (
                  '确认修改'
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
