import React, { useState } from 'react';

export function DepartmentBarChart({ data }: { data: { name: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  if (data.length === 0) {
    return <p className="text-sm text-[#64748B] py-8 text-center">Sin datos departamentales.</p>;
  }

  return (
    <div className="space-y-3.5">
      {data.map((item) => {
        const pct = Math.round((item.count / max) * 100);
        return (
          <div key={item.name} className="group">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[#0F172A] truncate pr-3">{item.name}</span>
              <span className="font-mono-tabular font-semibold text-[#0F172A] shrink-0">
                {item.count} {item.count === 1 ? 'colab.' : 'colabs.'}
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#EFF6FF] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563EB] group-hover:bg-[#1D4ED8] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WeeklyAttendanceChart({
  data,
}: {
  data: {
    date: string;
    label: string;
    Presente: number;
    Retardo: number;
    Ausente: number;
    Permiso: number;
  }[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxTotal = Math.max(
    1,
    ...data.map((d) => d.Presente + d.Retardo + d.Ausente + d.Permiso)
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B] mb-5">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A]" /> Presentes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B]" /> Retardos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" /> Permisos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626]" /> Ausentes
        </span>
      </div>

      <div className="relative h-52 flex items-end justify-between gap-2 sm:gap-4 pt-6 border-b border-[#E2E8F0]">
        {data.map((day, idx) => {
          const total = day.Presente + day.Retardo + day.Ausente + day.Permiso;
          const hPresente = (day.Presente / maxTotal) * 160;
          const hRetardo = (day.Retardo / maxTotal) * 160;
          const hPermiso = (day.Permiso / maxTotal) * 160;
          const hAusente = (day.Ausente / maxTotal) * 160;

          return (
            <div
              key={day.date}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex-1 flex flex-col items-center relative group cursor-default"
            >
              {hoveredIdx === idx && (
                <div className="absolute -top-2 -translate-y-full z-10 bg-[#0F172A] text-white rounded-lg px-2.5 py-2 text-[11px] shadow-lg whitespace-nowrap pointer-events-none">
                  <div className="font-semibold mb-1">{day.date}</div>
                  <div className="tabular-nums text-[#86EFAC]">Presentes: {day.Presente}</div>
                  <div className="tabular-nums text-[#FDE68A]">Retardos: {day.Retardo}</div>
                  <div className="tabular-nums text-[#93C5FD]">Permisos: {day.Permiso}</div>
                  <div className="tabular-nums text-[#FCA5A5]">Ausentes: {day.Ausente}</div>
                </div>
              )}

              <div className="w-full max-w-[36px] flex flex-col-reverse rounded-t-md overflow-hidden transition-transform duration-150 group-hover:scale-[1.03]">
                {day.Presente > 0 && (
                  <div style={{ height: `${hPresente}px` }} className="bg-[#16A34A] w-full" />
                )}
                {day.Retardo > 0 && (
                  <div style={{ height: `${hRetardo}px` }} className="bg-[#F59E0B] w-full" />
                )}
                {day.Permiso > 0 && (
                  <div style={{ height: `${hPermiso}px` }} className="bg-[#2563EB] w-full" />
                )}
                {day.Ausente > 0 && (
                  <div style={{ height: `${hAusente}px` }} className="bg-[#DC2626] w-full" />
                )}
                {total === 0 && <div className="h-1 bg-[#E2E8F0] w-full" />}
              </div>
              <span className="mt-2.5 text-[11px] font-medium text-[#64748B] whitespace-nowrap tabular-nums">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StatusDonutChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  const colors: Record<string, string> = {
    Activo: '#16A34A',
    Vacaciones: '#2563EB',
    Licencia: '#F59E0B',
    Inactivo: '#DC2626',
  };

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90">
          <circle
            cx="72"
            cy="72"
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="18"
          />
          {data.map((item) => {
            const fraction = total > 0 ? item.count / total : 0;
            const dash = fraction * circumference;
            const offset = -cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={item.status}
                cx="72"
                cy="72"
                r={radius}
                fill="none"
                stroke={colors[item.status] || '#64748B'}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-2xl text-[#0F172A] tabular-nums">{total}</span>
          <span className="text-[11px] text-[#64748B]">Total</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={item.status} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: colors[item.status] || '#64748B' }}
                />
                <span className="font-medium text-[#0F172A]">{item.status}</span>
              </div>
              <span className="font-mono-tabular text-[#64748B]">
                <strong className="text-[#0F172A]">{item.count}</strong> ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IncidentsSummaryChart({
  data,
}: {
  data: { type: string; count: number; pending: number; approved: number }[];
}) {
  if (data.length === 0) {
    return <p className="text-sm text-[#64748B] py-8 text-center">Sin novedades registradas.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const totalPct = Math.round((item.count / max) * 100);
        const approvedWidth = item.count > 0 ? (item.approved / item.count) * 100 : 0;
        const pendingWidth = item.count > 0 ? (item.pending / item.count) * 100 : 0;
        return (
          <div key={item.type}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-[#0F172A]">{item.type}</span>
              <span className="text-[#64748B] tabular-nums">
                {item.count} total · {item.pending} pend.
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                className="h-full flex rounded-full overflow-hidden"
                style={{ width: `${Math.max(8, totalPct)}%` }}
              >
                <div style={{ width: `${approvedWidth}%` }} className="bg-[#16A34A]" />
                <div style={{ width: `${pendingWidth}%` }} className="bg-[#F59E0B]" />
                <div className="flex-1 bg-[#94A3B8]" />
              </div>
            </div>
          </div>
        );
      })}
      <div className="pt-2 flex items-center gap-4 text-[11px] text-[#64748B]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-[#16A34A]" /> Aprobadas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-[#F59E0B]" /> Pendientes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-[#94A3B8]" /> Rechazadas
        </span>
      </div>
    </div>
  );
}
