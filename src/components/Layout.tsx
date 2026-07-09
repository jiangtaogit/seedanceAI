import { NavLink, Outlet } from 'react-router-dom';
import { Home, PlusCircle, List, Clock, Settings, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import TechBackground from '@/components/TechBackground';

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/create', icon: PlusCircle, label: '创建视频' },
  { to: '/tasks', icon: List, label: '任务管理' },
  { to: '/history', icon: Clock, label: '历史记录' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export default function Layout() {
  const { sidebarCollapsed, toggleSidebar, config } = useStore();

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
          <div className="text-xs text-text-secondary">Seedance 2.0</div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
