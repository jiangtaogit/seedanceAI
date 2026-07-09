import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Eye, EyeOff, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { login, register } from '@/services/api';
import TechBackground from '@/components/TechBackground';

type AuthMode = 'login' | 'register';

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setUser, setToken } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (username.trim().length < 3) {
      setError('用户名至少3个字符');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6个字符');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      const result = mode === 'login'
        ? await login(username.trim(), password)
        : await register(username.trim(), password);

      // Save to store + localStorage
      setToken(result.token);
      setUser(result.user);

      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <TechBackground />
      <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md glass-nav rounded-2xl border border-white/[0.06] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-center gap-3 px-6 pt-8 pb-4">
            <Zap size={28} className="text-accent" />
            <h1 className="font-heading font-bold text-xl text-text-primary">Seedance AI</h1>
          </div>
          <p className="text-center text-text-secondary text-sm px-6 pb-6">
            {mode === 'login' ? '登录您的账号' : '创建新账号'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full px-3.5 py-2.5 rounded-lg bg-bg-primary/60 border border-white/[0.08] text-text-primary text-sm placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-bg-primary/60 border border-white/[0.08] text-text-primary text-sm placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (register only) */}
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-xs text-text-secondary mb-1.5">确认密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-bg-primary/60 border border-white/[0.08] text-text-primary text-sm placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-error text-xs bg-error/10 rounded-lg px-3 py-2"
                >
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn size={16} />
                  登录
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  注册
                </>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="px-6 pb-6 text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-xs text-text-secondary hover:text-accent transition-colors"
            >
              {mode === 'login' ? '没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>

          {/* Default Admin Hint */}
          {mode === 'login' && (
            <div className="px-6 pb-6 text-center">
              <p className="text-[10px] text-text-secondary/40">
                默认管理员：admin / admin123
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
