import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, List, Clock, Settings, Zap, LogOut, Shield, User, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import TechBackground from '@/components/TechBackground';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const allNavItems = [
  { to: '/', icon: Home, label: '首页', adminOnly: false },
  { to: '/create', icon: PlusCircle, label: '创建视频', adminOnly: false },
  { to: '/tasks', icon: List, label: '任务管理', adminOnly: false },
  { to: '/history', icon: Clock, label: '历史记录', adminOnly: false },
  { to: '/settings', icon: Settings, label: '设置', adminOnly: true },
];

export default function Layout() {
  const { sidebarCollapsed, toggleSidebar, config, user, clearAuth } = useStore();
  const navigate = useNavigate();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Filter nav items based on role
  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* 科技动态背景 */}
      <TechBackground />

      {/* Sidebar — 毛玻璃 */}
      <aside
        className={cn(
          'flex flex-col border-r border-white/[0.06] glass-nav z-10 transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-56'
        )}
      >
        <div className={cn('flex items-center h-16 px-4 border-b border-white/[0.06]', sidebarCollapsed ? 'justify-center' : 'gap-3')}>
          <Zap size={24} className="text-accent flex-shrink-0" />
          {!sidebarCollapsed && <span className="font-heading font-bold text-lg text-text-primary">Seedance AI</span>}
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary border border-transparent',
                sidebarCollapsed && 'justify-center'
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={cn('flex-shrink-0', isActive && 'text-accent')} />
                  {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        {!sidebarCollapsed && user && (
          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center',
                isAdmin ? 'bg-accent/20 text-accent' : 'bg-white/[0.06] text-text-secondary'
              )}>
                {isAdmin ? <Shield size={14} /> : <User size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{user.username}</p>
                <p className="text-[10px] text-text-secondary">{isAdmin ? '管理员' : '用户'}</p>
              </div>
            </div>
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="flex items-center gap-1.5 text-text-secondary hover:text-accent text-xs transition-colors w-full mb-1"
            >
              <KeyRound size={12} />
              修改密码
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-text-secondary hover:text-error text-xs transition-colors w-full"
            >
              <LogOut size={12} />
              退出登录
            </button>
          </div>
        )}
        {sidebarCollapsed && user && (
          <div className="border-t border-white/[0.06]">
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="p-3 text-text-secondary hover:text-accent transition-colors w-full"
              title="修改密码"
            >
              <KeyRound size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="p-3 text-text-secondary hover:text-error transition-colors w-full"
              title="退出登录"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        <button onClick={toggleSidebar} className="p-3 text-text-secondary hover:text-text-primary text-xs border-t border-white/[0.06]">
          {sidebarCollapsed ? '>>' : '<< 折叠'}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden z-10">
        {/* Top Bar — 毛玻璃 */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] glass-nav">
          <div className="flex items-center gap-3">
            <div className={cn('w-2 h-2 rounded-full', config.isConfigured ? 'bg-success' : 'bg-warning')} />
            <span className="text-xs text-text-secondary">{config.isConfigured ? 'API 已连接' : 'API 未配置'}</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center',
                  isAdmin ? 'bg-accent/20 text-accent' : 'bg-white/[0.06] text-text-secondary'
                )}>
                  {isAdmin ? <Shield size={10} /> : <User size={10} />}
                </div>
                <span className="text-xs text-text-primary">{user.username}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  isAdmin ? 'bg-accent/10 text-accent' : 'bg-white/[0.04] text-text-secondary'
                )}>
                  {isAdmin ? '管理员' : '用户'}
                </span>
              </div>
            )}
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="p-1.5 text-text-secondary hover:text-accent rounded-md transition-colors"
              title="修改密码"
            >
              <KeyRound size={14} />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 text-text-secondary hover:text-error rounded-md transition-colors"
              title="退出登录"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>
  );
}
