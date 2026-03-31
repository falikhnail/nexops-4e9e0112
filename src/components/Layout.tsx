import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Store, BarChart3, FileText, LayoutDashboard, ClipboardList, Briefcase } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stores', label: 'Toko', icon: Store },
  { id: 'piutang', label: 'Piutang', icon: FileText },
  { id: 'rekap', label: 'Rekap', icon: ClipboardList },
];

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="sticky top-0 h-screen w-64 border-r border-border bg-card flex flex-col shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Piutang Tracker</h1>
            <p className="text-xs text-muted-foreground">CV. Manunggal Karya</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === item.id ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-primary"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">© 2026 CV. Manunggal Karya</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-6">
          <h2 className="text-lg font-semibold text-foreground">
            {navItems.find(n => n.id === activeTab)?.label}
          </h2>
          <NotificationBell />
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
