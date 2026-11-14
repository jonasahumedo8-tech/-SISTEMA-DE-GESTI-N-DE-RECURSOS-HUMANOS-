import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Crosshair,
  Eye,
  EyeOff,
  FileWarning,
  Laptop,
  ShieldCheck,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react';
import { UserSession } from '../types/hr';
import { apiFetch, saveSession } from '../utils/api';
import { signInWithGooglePopup } from '../utils/firebaseAuth';
import { BrandLogo, Button, Modal, labelClassName } from './ui/Primitives';

const LOBBY_PLAYLISTS = [
  {
    id: 'executive',
    index: '01',
    title: 'Panel Ejecutivo',
    subtitle: 'KPIs de plantilla y analítica en vivo',
    metricLabel: 'Plantilla registrada',
    metricValue: '14 Colaboradores',
    statusText: 'Sincronizado con Neon PostgreSQL',
    bars: [
      { label: 'Tecnología e Ingeniería', pct: '88%', count: '5' },
      { label: 'Operaciones y Logística', pct: '64%', count: '3' },
      { label: 'Finanzas y Contabilidad', pct: '48%', count: '2' },
    ],
  },
  {
    id: 'attendance',
    index: '02',
    title: 'Control de Asistencia',
    subtitle: 'Marcación diaria, retardos y permisos',
    metricLabel: 'Cobertura de jornada',
    metricValue: '82% Presentes',
    statusText: 'Monitoreo horario en tiempo real',
    bars: [
      { label: 'Entradas a tiempo', pct: '82%', count: '9' },
      { label: 'Retardos registrados', pct: '18%', count: '1' },
      { label: 'Permisos autorizados', pct: '12%', count: '1' },
    ],
  },
  {
    id: 'incidents',
    index: '03',
    title: 'Novedades y Reportes',
    subtitle: 'Incapacidades, vacaciones y exportación',
    metricLabel: 'Solicitudes activas',
    metricValue: '4 Pendientes',
    statusText: 'Flujo de aprobación corporativo',
    bars: [
      { label: 'Vacaciones y Licencias', pct: '75%', count: '3' },
      { label: 'Incapacidades EPS', pct: '40%', count: '1' },
      { label: 'Reportes PDF y Excel', pct: '100%', count: '6' },
    ],
  },
];

export function LoginView({ onLoginSuccess }: { onLoginSuccess: (user: UserSession) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login state
  const [email, setEmail] = useState('admin@humanpro.com');
  const [password, setPassword] = useState('HumanPro2026!');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Administrador');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Recover modal state
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverStatus, setRecoverStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [recoverLoading, setRecoverLoading] = useState(false);

  // Warzone-style playlist selector
  const [activePlaylist, setActivePlaylist] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePlaylist((prev) => (prev + 1) % LOBBY_PLAYLISTS.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ user: UserSession }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      saveSession(data.user, remember);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      const googleUser = await signInWithGooglePopup();
      const data = await apiFetch<{ user: UserSession }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(googleUser),
      });
      saveSession(data.user, remember);
      onLoginSuccess(data.user);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        setError('Cerraste la ventana de Google antes de completar el inicio de sesión.');
      } else if (code === 'auth/popup-blocked') {
        setError('El navegador bloqueó la ventana emergente de Google. Permite las ventanas emergentes e inténtalo nuevamente.');
      } else {
        setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickDemoLogin() {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ user: UserSession }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@humanpro.com',
          password: 'HumanPro2026!',
        }),
      });
      saveSession(data.user, true);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión demo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ user: UserSession }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          role: regRole,
        }),
      });
      saveSession(data.user, true);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setRecoverStatus(null);
    setRecoverLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/recover', {
        method: 'POST',
        body: JSON.stringify({ email: recoverEmail }),
      });
      setRecoverStatus({ type: 'ok', text: res.message });
    } catch (err) {
      setRecoverStatus({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error al procesar solicitud.',
      });
    } finally {
      setRecoverLoading(false);
    }
  }

  const playlist = LOBBY_PLAYLISTS[activePlaylist];

  const darkInputClass =
    'w-full h-10 px-3.5 rounded-lg bg-[#090E1A]/90 border border-white/15 text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30 transition-colors';

  return (
    <div className="min-h-screen bg-[#070B14] text-white relative overflow-hidden flex flex-col justify-between">
      {/* Warzone Tactical Atmospheric Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Topographic / Radar Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(37, 99, 235, 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.16) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        {/* Radial Spotlight & Vignette */}
        <div className="absolute -top-32 left-1/4 w-[620px] h-[620px] rounded-full bg-[#172554]/55 blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#2563EB]/20 blur-[120px]" />
        <div className="absolute top-1/3 left-10 w-[340px] h-[340px] rounded-full bg-[#F59E0B]/10 blur-[110px]" />

        {/* Subtle Tactical Radar Circles */}
        <svg
          viewBox="0 0 800 800"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] opacity-[0.07]"
          fill="none"
        >
          <circle cx="400" cy="400" r="140" stroke="#93C5FD" strokeWidth="1" strokeDasharray="6 6" />
          <circle cx="400" cy="400" r="260" stroke="#93C5FD" strokeWidth="1" />
          <circle cx="400" cy="400" r="380" stroke="#F59E0B" strokeWidth="1" strokeDasharray="12 8" />
          <line x1="400" y1="0" x2="400" y2="800" stroke="#93C5FD" strokeWidth="1" />
          <line x1="0" y1="400" x2="800" y2="400" stroke="#93C5FD" strokeWidth="1" />
        </svg>
      </div>

      {/* Top Warzone-style Lobby Header */}
      <header className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 py-5 flex items-center justify-between gap-4 border-b border-white/10">
        <BrandLogo dark />

        <nav className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          <button
            type="button"
            onClick={() => {
              setError('');
              setMode('login');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#CBD5E1] hover:text-white'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setError('');
              setMode('register');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#CBD5E1] hover:text-white'
            }`}
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide text-[#FBBF24] hover:bg-white/5 transition-colors cursor-pointer"
          >
            Acceso rápido Demo
          </button>
        </nav>

        <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
          <span className="hidden sm:inline">Gestión inteligente del talento humano</span>
        </div>
      </header>

      {/* Main Warzone Lobby Split Stage */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-6 sm:px-10 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* LEFT STAGE: Warzone Tactical Briefing & Interactive Mode Cards */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-[#F59E0B] uppercase">
              <Crosshair className="w-4 h-4" />
              <span>Centro de Comando Corporativo</span>
            </div>

            <h1 className="font-display font-extrabold text-4xl sm:text-5xl xl:text-[54px] leading-[1.05] tracking-tight text-white text-balance">
              Control total del talento humano en tiempo real.
            </h1>

            <p className="text-sm sm:text-base text-[#CBD5E1] max-w-2xl leading-relaxed">
              Administra colaboradores, estructura organizacional, control de asistencia, novedades laborales y reportes ejecutivos desde una consola unificada sobre Neon PostgreSQL.
            </p>
          </div>

          {/* Warzone Tactical HUD Preview Card with Corner Reticles */}
          <div className="relative bg-[#0F172A]/85 backdrop-blur-md border border-white/15 rounded-2xl p-6 shadow-2xl">
            {/* Subtle corner brackets */}
            <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#F59E0B] rounded-tl-xl pointer-events-none" />
            <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#2563EB] rounded-tr-xl pointer-events-none" />
            <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#2563EB] rounded-bl-xl pointer-events-none" />
            <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#F59E0B] rounded-br-xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <p className="text-xs font-medium text-[#93C5FD]">{playlist.metricLabel}</p>
                <p className="font-display font-bold text-2xl sm:text-3xl text-white tabular-nums mt-0.5">
                  {playlist.metricValue}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#4ADE80]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{playlist.statusText}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {playlist.bars.map((bar) => (
                <div
                  key={bar.label}
                  className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#CBD5E1] truncate">{bar.label}</span>
                    <span className="font-mono-tabular font-bold text-white">{bar.count}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full transition-all duration-300"
                      style={{ width: bar.pct }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warzone-style Bottom Playlist Selector Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {LOBBY_PLAYLISTS.map((item, idx) => {
              const selected = idx === activePlaylist;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePlaylist(idx)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#172554]/90 border-[#2563EB] shadow-lg'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-mono-tabular text-xs font-bold ${
                        selected ? 'text-[#F59E0B]' : 'text-[#64748B]'
                      }`}
                    >
                      {item.index}
                    </span>
                    {idx === 0 && <Users className="w-4 h-4 text-[#93C5FD]" />}
                    {idx === 1 && <Clock className="w-4 h-4 text-[#4ADE80]" />}
                    {idx === 2 && <FileWarning className="w-4 h-4 text-[#FBBF24]" />}
                  </div>
                  <p className="font-display font-semibold text-sm text-white">{item.title}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-1">{item.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Warzone-style Tactical Access Card */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto lg:ml-auto">
          <div className="bg-[#0F172A]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-7 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-5 border-b border-white/10">
              <div>
                <h2 className="font-display font-bold text-xl text-white tracking-tight">
                  {mode === 'login' ? 'Bienvenido a HumanPro' : 'Crear cuenta de acceso'}
                </h2>
                <p className="text-xs text-[#94A3B8] mt-1">
                  {mode === 'login'
                    ? 'Accede a tu plataforma de gestión humana.'
                    : 'Registra tu perfil administrativo en Neon PostgreSQL.'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#60A5FA]" />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/40 text-xs font-medium text-[#FCA5A5]">
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@humanpro.com"
                    className={darkInputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-xs font-medium text-[#CBD5E1]">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoverEmail(email);
                        setRecoverStatus(null);
                        setRecoverOpen(true);
                      }}
                      className="text-xs text-[#93C5FD] hover:text-white transition-colors cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      className={`${darkInputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white cursor-pointer"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-white/25 bg-[#090E1A] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  Recordar sesión
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-display font-bold text-sm tracking-wide transition-colors shadow-lg shadow-[#2563EB]/25 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Ingresando...' : 'Iniciar sesión'}
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    o continúa con
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Official Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-10.5 px-4 rounded-lg bg-white hover:bg-[#F8FAFC] text-sm font-medium text-[#0F172A] transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  disabled={loading}
                  className="w-full py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#FBBF24] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Entrar rápido como Administrador Demo
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej. Mariana Torres"
                    className={darkInputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Correo corporativo
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="mariana@empresa.com"
                    className={darkInputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Rol en la plataforma
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className={darkInputClass}
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Talento Humano">Talento Humano</option>
                    <option value="Gerencia">Gerencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={darkInputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-display font-bold text-sm transition-colors shadow-lg shadow-[#2563EB]/25 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta e ingresar'}
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-10.5 px-4 rounded-lg bg-white hover:bg-[#F8FAFC] text-sm font-medium text-[#0F172A] transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>Registrarse con Google</span>
                </button>
              </form>
            )}

            <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-[#94A3B8]">
              {mode === 'login' ? (
                <>
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setMode('register');
                    }}
                    className="font-semibold text-[#60A5FA] hover:text-white cursor-pointer"
                  >
                    Regístrate aquí
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setMode('login');
                    }}
                    className="font-semibold text-[#60A5FA] hover:text-white cursor-pointer"
                  >
                    Inicia sesión
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Bottom Command Bar */}
      <footer className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#64748B]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-[#94A3B8]">
            <Laptop className="w-3.5 h-3.5" /> Web
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#94A3B8]">
            <Tablet className="w-3.5 h-3.5" /> Tablet
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#94A3B8]">
            <Smartphone className="w-3.5 h-3.5" /> Móvil
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#94A3B8]">
            <BarChart3 className="w-3.5 h-3.5" /> Neon PostgreSQL
          </span>
        </div>
        <span>© 2026 HumanPro · Gestión inteligente del talento humano</span>
      </footer>

      {/* Password recovery modal */}
      <Modal
        open={recoverOpen}
        onClose={() => setRecoverOpen(false)}
        title="Recuperar contraseña"
        subtitle="Ingresa tu correo corporativo para recibir instrucciones de acceso."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecover} className="space-y-4">
          <div>
            <label htmlFor="recover-email" className={labelClassName}>
              Correo electrónico registrado
            </label>
            <input
              id="recover-email"
              type="email"
              required
              value={recoverEmail}
              onChange={(e) => setRecoverEmail(e.target.value)}
              placeholder="admin@humanpro.com"
              className="w-full h-9.5 px-3 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          {recoverStatus && (
            <div
              className={`p-3 rounded-lg text-xs font-medium ${
                recoverStatus.type === 'ok'
                  ? 'bg-[#DCFCE7] text-[#15803D]'
                  : 'bg-[#FEE2E2] text-[#DC2626]'
              }`}
            >
              {recoverStatus.text}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRecoverOpen(false)}>
              Cerrar
            </Button>
            <Button type="submit" disabled={recoverLoading}>
              {recoverLoading ? 'Enviando...' : 'Enviar instrucciones'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
