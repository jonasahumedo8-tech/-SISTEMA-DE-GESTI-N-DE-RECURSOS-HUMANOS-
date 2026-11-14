import React, { useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  X,
  XCircle,
} from 'lucide-react';

export function BrandLogo({
  dark = false,
  collapsed = false,
}: {
  dark?: boolean;
  collapsed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M5 5v14M19 5v14M5 12h14" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="2" fill="currentColor" stroke="none" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <span
            className={`font-display font-bold text-lg tracking-tight block ${
              dark ? 'text-white' : 'text-[#0F172A]'
            }`}
          >
            Human<span className={dark ? 'text-[#93C5FD]' : 'text-[#2563EB]'}>Pro</span>
          </span>
        </div>
      )}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF] border border-transparent shadow-xs',
    secondary: 'bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]',
    ghost: 'bg-transparent text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB] border border-transparent',
    danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] border border-transparent shadow-xs',
  };
  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-9.5 px-4 text-sm',
    lg: 'h-11 px-5 text-[15px]',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0 cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { bg: string; text: string; icon: React.ReactNode }
  > = {
    Activo: {
      bg: 'bg-[#DCFCE7]',
      text: 'text-[#15803D]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    Presente: {
      bg: 'bg-[#DCFCE7]',
      text: 'text-[#15803D]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    Aprobada: {
      bg: 'bg-[#DCFCE7]',
      text: 'text-[#15803D]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    Retardo: {
      bg: 'bg-[#FEF3C7]',
      text: 'text-[#B45309]',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    Pendiente: {
      bg: 'bg-[#FEF3C7]',
      text: 'text-[#B45309]',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    Inactivo: {
      bg: 'bg-[#F1F5F9]',
      text: 'text-[#475569]',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    },
    Ausente: {
      bg: 'bg-[#FEE2E2]',
      text: 'text-[#DC2626]',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    },
    Rechazada: {
      bg: 'bg-[#FEE2E2]',
      text: 'text-[#DC2626]',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    },
    Permiso: {
      bg: 'bg-[#E0F2FE]',
      text: 'text-[#0284C7]',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    Vacaciones: {
      bg: 'bg-[#E0F2FE]',
      text: 'text-[#0284C7]',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    Licencia: {
      bg: 'bg-[#EFF6FF]',
      text: 'text-[#2563EB]',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
  };

  const style = map[status] || {
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#475569]',
    icon: <Info className="w-3.5 h-3.5 shrink-0" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${style.bg} ${style.text}`}
    >
      {style.icon}
      {status}
    </span>
  );
}

const AVATAR_TONES = [
  'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  'bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]',
  'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]',
  'bg-[#F8FAFC] text-[#1E293B] border-[#CBD5E1]',
];

export function EmployeeAvatar({
  firstName,
  lastName,
  photoUrl,
  size = 'md',
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [imgError, setImgError] = React.useState(false);
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'HP';
  const hash = (firstName.charCodeAt(0) || 0) + (lastName.charCodeAt(0) || 0);
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];

  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg',
  };

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeMap[size]} rounded-full object-cover border border-[#E2E8F0] shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} ${tone} rounded-full border font-display font-semibold flex items-center justify-center shrink-0 select-none`}
      aria-label={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}

export function StatCard({
  title,
  value,
  description,
  trend,
  trendPositive = true,
  icon,
  accentClass = 'bg-[#EFF6FF] text-[#2563EB]',
}: {
  title: string;
  value: string | number;
  description: string;
  trend?: string;
  trendPositive?: boolean;
  icon: React.ReactNode;
  accentClass?: string;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:shadow-sm transition-shadow duration-150 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-[#64748B]">{title}</p>
          <p className="font-display font-bold text-[28px] leading-9 text-[#0F172A] tabular-nums mt-1.5">
            {value}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2 text-xs">
        <span className="text-[#64748B] truncate">{description}</span>
        {trend && (
          <span
            className={`font-semibold tabular-nums shrink-0 ${
              trendPositive ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = 'max-w-2xl',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-h-[90vh] flex flex-col overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="font-display font-semibold text-lg text-[#0F172A]">{title}</h2>
            {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Eliminar',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-[#475569] leading-relaxed">{message}</p>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Procesando...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function Pagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (next: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <div className="px-4 py-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#64748B]">
      <span className="tabular-nums">
        Mostrando <strong className="text-[#0F172A]">{start}</strong> a{' '}
        <strong className="text-[#0F172A]">{end}</strong> de{' '}
        <strong className="text-[#0F172A]">{totalItems}</strong> registros
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Anterior
        </button>
        <span className="px-3 font-medium text-[#0F172A] tabular-nums">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer"
        >
          Siguiente
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const styles =
          t.type === 'success'
            ? 'bg-[#0F172A] text-white border-[#1E293B]'
            : t.type === 'error'
              ? 'bg-[#DC2626] text-white border-[#B91C1C]'
              : 'bg-[#172554] text-white border-[#1E3A8A]';
        const icon =
          t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          ) : t.type === 'error' ? (
            <XCircle className="w-4 h-4 text-[#FECACA] shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-[#93C5FD] shrink-0" />
          );
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${styles}`}
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="text-white/70 hover:text-white cursor-pointer"
              aria-label="Descartar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export const inputClassName =
  'w-full h-9.5 px-3 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-[#2563EB]/15 transition-colors';

export const selectClassName =
  'w-full h-9.5 px-3 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-[#2563EB]/15 transition-colors';

export const labelClassName = 'block text-xs font-medium text-[#475569] mb-1.5';
