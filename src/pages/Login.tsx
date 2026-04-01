import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Lock, User, Loader2, ChevronLeft, ChevronRight, TrendingUp, Shield, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
  {
    icon: TrendingUp,
    title: 'Kelola Bisnis Real-time',
    description: 'Pantau piutang toko dan operasional perusahaan secara real-time dengan dashboard yang informatif.',
    gradient: 'from-primary/20 to-accent/20',
  },
  {
    icon: Shield,
    title: 'Data Aman & Terlindungi',
    description: 'Seluruh data tersimpan di cloud dengan enkripsi dan backup otomatis untuk keamanan maksimal.',
    gradient: 'from-accent/20 to-primary/20',
  },
  {
    icon: Bell,
    title: 'Manajemen Operasional Lengkap',
    description: 'Catat pemasukan, pengeluaran, dan pantau arus kas operasional perusahaan dengan mudah dan terstruktur.',
    gradient: 'from-primary/20 to-warning/20',
  },
];

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Masukkan username dan password');
      return;
    }
    setLoading(true);
    const error = await signIn(username, password);
    setLoading(false);
    if (error) {
      toast.error('Username atau password salah');
    }
  };

  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel — Slider (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent">
        {/* Abstract shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-2xl" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-16">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/10">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/90 font-semibold text-lg tracking-tight">NexOps</span>
          </div>

          {/* Slider */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="space-y-6"
              >
                <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${slide.gradient} backdrop-blur-sm border border-white/10`}>
                  <slide.icon className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
                  {slide.title}
                </h2>
                <p className="text-white/70 text-base xl:text-lg leading-relaxed">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Slider controls */}
            <div className="flex items-center gap-4 mt-10">
              <div className="flex gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === currentSlide ? 'w-8 bg-white' : 'w-3 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
              <div className="flex-1" />
              <div className="flex gap-2">
                <button
                  onClick={prevSlide}
                  className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-white/40 text-sm">© 2026 CV. Manunggal Karya. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-foreground font-bold text-xl tracking-tight">NexOps</span>
          </div>

          {/* Heading */}
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Selamat Datang</h1>
            <p className="text-muted-foreground text-sm">Masuk ke akun Anda untuk melanjutkan</p>
          </div>

          {/* Mobile mini slider */}
          <div className="lg:hidden">
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <slide.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{slide.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{slide.description}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 justify-center">
                {slides.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === currentSlide ? 'w-5 bg-primary' : 'w-2 bg-primary/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </Label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="pl-10 h-11 bg-secondary/50 border-border/80 focus:bg-background transition-colors"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="pl-10 h-11 bg-secondary/50 border-border/80 focus:bg-background transition-colors"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-medium text-sm" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Masuk
            </Button>
          </form>

          {/* Footer on mobile */}
          <p className="text-center text-xs text-muted-foreground lg:hidden">
            © 2026 CV. Manunggal Karya
          </p>
        </div>
      </div>
    </div>
  );
}
