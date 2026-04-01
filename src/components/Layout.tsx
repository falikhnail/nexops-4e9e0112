import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Store, BarChart3, FileText, LayoutDashboard, ClipboardList, Briefcase, LogOut } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stores', label: 'Toko', icon: Store },
  { id: 'piutang', label: 'Piutang', icon: FileText },
  { id: 'operasional', label: 'Operasional', icon: Briefcase },
  { id: 'rekap', label: 'Rekap', icon: ClipboardList },
];

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar — hidden on mobile */}
      <aside className="hidden md:flex sticky top-0 h-screen w-64 border-r border-border bg-card flex-col shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Piutang Tracker</h1>
            <p className="text-xs text-muted-foreground">CV. Manunggal Karya</p>
          </div>
        </div>

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
                  layoutId="activeTabDesktop"
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

        <div className="px-3 py-4 border-t border-border space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </Button>
          <p className="text-xs text-muted-foreground px-2">© 2026 CV. Manunggal Karya</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top bar */}
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile brand */}
            <div className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <h2 className="text-base md:text-lg font-semibold text-foreground">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          {children}
        </main>
      </div>

      {/* Bottom Navigation — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border bg-card/95 backdrop-blur-lg safe-area-pb">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              activeTab === item.id ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {activeTab === item.id && (
              <motion.div
                layoutId="activeTabMobile"
                className="absolute top-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
