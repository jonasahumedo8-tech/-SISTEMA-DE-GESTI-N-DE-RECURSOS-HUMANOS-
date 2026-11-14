import React from 'react';
import {
  Activity,
  ArrowUpRight,
  Clock,
  FileWarning,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import { DashboardPayload, Employee, ModuleKey } from '../types/hr';
import { formatDateES } from '../utils/api';
import {
  DepartmentBarChart,
  IncidentsSummaryChart,
  StatusDonutChart,
  WeeklyAttendanceChart,
} from '../components/Charts';
import { Button, EmployeeAvatar, StatCard, StatusBadge } from '../components/ui/Primitives';

export function DashboardModule({
  data,
  loading,
  onNavigate,
  onInspectEmployee,
}: {
  data: DashboardPayload | null;
  loading: boolean;
  onNavigate: (mod: ModuleKey) => void;
  onInspectEmployee: (emp: Employee) => void;
}) {
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-white rounded-2xl border border-[#E2E8F0]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-2xl border border-[#E2E8F0]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-2xl border border-[#E2E8F0]" />
          <div className="h-80 bg-white rounded-2xl border border-[#E2E8F0]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, charts, recent, selectedDate } = data;

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-[28px] text-[#0F172A] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Bienvenido al panel de gestión de talento humano · Corte al {formatDateES(selectedDate)}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => onNavigate('attendance')}>
            Registrar asistencia
          </Button>
          <Button onClick={() => onNavigate('employees')}>
            Gestionar empleados
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 5 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total de empleados"
          value={kpis.totalEmployees}
          description="Nómina general registrada"
          trend="+4.2% vs mes ant."
          trendPositive
          icon={<Users className="w-5 h-5" />}
          accentClass="bg-[#EFF6FF] text-[#2563EB]"
        />
        <StatCard
          title="Empleados activos"
          value={kpis.activeEmployees}
          description="En operación vigente"
          trend={`${kpis.totalEmployees ? Math.round((kpis.activeEmployees / kpis.totalEmployees) * 100) : 0}% plantilla`}
          trendPositive
          icon={<UserCheck className="w-5 h-5" />}
          accentClass="bg-[#DCFCE7] text-[#16A34A]"
        />
        <StatCard
          title="Empleados inactivos"
          value={kpis.inactiveEmployees}
          description="Retiros o suspendidos"
          trend="-1.5% rotación"
          trendPositive
          icon={<UserMinus className="w-5 h-5" />}
          accentClass="bg-[#FEE2E2] text-[#DC2626]"
        />
        <StatCard
          title="Asistencias de hoy"
          value={kpis.todayAttendance}
          description={`Fecha ${formatDateES(selectedDate)}`}
          trend={`${kpis.attendanceRate}% cobertura`}
          trendPositive={kpis.attendanceRate >= 85}
          icon={<Clock className="w-5 h-5" />}
          accentClass="bg-[#E0F2FE] text-[#0284C7]"
        />
        <StatCard
          title="Novedades pendientes"
          value={kpis.pendingIncidents}
          description="Solicitudes por aprobar"
          trend={kpis.pendingIncidents > 0 ? 'Requiere revisión' : 'Al día'}
          trendPositive={kpis.pendingIncidents === 0}
          icon={<FileWarning className="w-5 h-5" />}
          accentClass="bg-[#FEF3C7] text-[#D97706]"
        />
      </div>

      {/* 4 Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="font-display font-semibold text-base text-[#0F172A]">
                Asistencia semanal
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Comportamiento diario de puntualidad e inasistencias
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
            >
              Ver detalle
            </button>
          </div>
          <WeeklyAttendanceChart data={charts.weeklyAttendance} />
        </section>

        <section className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="font-display font-semibold text-base text-[#0F172A]">
                Empleados por departamento
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Distribución del talento por área funcional
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('departments')}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
            >
              Departamentos
            </button>
          </div>
          <DepartmentBarChart data={charts.employeesByDepartment} />
        </section>

        <section className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="mb-5">
            <h2 className="font-display font-semibold text-base text-[#0F172A]">
              Distribución de empleados por estado
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Situación laboral actual de los colaboradores
            </p>
          </div>
          <StatusDonutChart data={charts.statusDistribution} />
        </section>

        <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="font-display font-semibold text-base text-[#0F172A]">
                Resumen de novedades laborales
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Incapacidades, permisos, vacaciones y licencias por estado
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('incidents')}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
            >
              Ir a novedades
            </button>
          </div>
          <IncidentsSummaryChart data={charts.incidentsSummary} />
        </section>
      </div>

      {/* Bottom 4 Operational Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos empleados registrados */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-[#0F172A]">
              Últimos empleados registrados
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('employees')}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
            >
              Ver todos
            </button>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {recent.employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => onInspectEmployee(emp)}
                className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <EmployeeAvatar
                    firstName={emp.first_name}
                    lastName={emp.last_name}
                    photoUrl={emp.photo_url}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs text-[#64748B] truncate">
                      {emp.position_name || 'Sin cargo'} · {emp.department_name || 'General'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline text-xs text-[#64748B] tabular-nums">
                    {formatDateES(emp.hire_date)}
                  </span>
                  <StatusBadge status={emp.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Últimos registros de asistencia */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-[#0F172A]">
              Últimos registros de asistencia
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
            >
              Control diario
            </button>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {recent.attendance.map((att) => (
              <div
                key={att.id}
                className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{att.employee_name}</p>
                  <p className="text-xs text-[#64748B] truncate">
                    {att.department_name} · {formatDateES(att.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono-tabular text-xs text-[#475569]">
                    {att.check_in || '--:--'} / {att.check_out || '--:--'}
                  </span>
                  <StatusBadge status={att.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Novedades recientes */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-[#0F172A]">
              Novedades recientes
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('incidents')}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
            >
              Gestionar
            </button>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {recent.incidents.map((inc) => (
              <div
                key={inc.id}
                className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">
                    {inc.employee_name} · <span className="text-[#2563EB]">{inc.incident_type}</span>
                  </p>
                  <p className="text-xs text-[#64748B] truncate">
                    {formatDateES(inc.start_date)} al {formatDateES(inc.end_date)} · {inc.description}
                  </p>
                </div>
                <StatusBadge status={inc.approval_status} />
              </div>
            ))}
          </div>
        </section>

        {/* Actividad reciente del sistema */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-[#0F172A]">
              Actividad reciente del sistema
            </h2>
            <Activity className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {recent.activityLogs.map((log) => (
              <div key={log.id} className="px-6 py-3 hover:bg-[#F8FAFC]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0F172A]">{log.action}</span>
                  <span className="text-[11px] font-mono-tabular text-[#64748B] shrink-0">
                    {log.created_at}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5 truncate">{log.detail}</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  {log.actor_name} · {log.module}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
