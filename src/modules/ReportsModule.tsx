import React, { useMemo, useState } from 'react';
import {
  Building2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AttendanceRecord,
  Department,
  Employee,
  LaborIncident,
} from '../types/hr';
import { downloadExcelCSV, formatCurrency, formatDateES } from '../utils/api';
import { DepartmentBarChart } from '../components/Charts';
import {
  Button,
  StatusBadge,
  inputClassName,
  labelClassName,
  selectClassName,
} from '../components/ui/Primitives';

type ReportType =
  | 'general_employees'
  | 'by_department'
  | 'attendance'
  | 'absences'
  | 'incidents'
  | 'active_inactive';

const REPORT_CARDS: { key: ReportType; title: string; subtitle: string; icon: React.ReactNode }[] = [
  {
    key: 'general_employees',
    title: 'General de empleados',
    subtitle: 'Nómina completa y contratos',
    icon: <Users className="w-4 h-4" />,
  },
  {
    key: 'by_department',
    title: 'Por departamentos',
    subtitle: 'Consolidado y masa salarial',
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    key: 'attendance',
    title: 'Asistencia',
    subtitle: 'Registros de entrada y salida',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    key: 'absences',
    title: 'Ausencias y retardos',
    subtitle: 'Control de puntualidad',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    key: 'incidents',
    title: 'Novedades laborales',
    subtitle: 'Incapacidades, permisos y licencias',
    icon: <FileSpreadsheet className="w-4 h-4" />,
  },
  {
    key: 'active_inactive',
    title: 'Activos e inactivos',
    subtitle: 'Estado operativo de plantilla',
    icon: <UserCheck className="w-4 h-4" />,
  },
];

export function ReportsModule({
  employees,
  departments,
  attendance,
  incidents,
  companyName,
  onToast,
}: {
  employees: Employee[];
  departments: Department[];
  attendance: AttendanceRecord[];
  incidents: LaborIncident[];
  companyName: string;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [reportType, setReportType] = useState<ReportType>('general_employees');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const reportData = useMemo(() => {
    const inDateRange = (d: string) => {
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    };

    if (reportType === 'general_employees' || reportType === 'active_inactive') {
      const list = employees.filter((e) => {
        if (deptFilter && String(e.department_id) !== deptFilter) return false;
        if (statusFilter && e.status !== statusFilter) return false;
        if (startDate || endDate) {
          if (!inDateRange(e.hire_date)) return false;
        }
        return true;
      });
      const headers = ['Código', 'Documento', 'Colaborador', 'Departamento', 'Cargo', 'Ingreso', 'Contrato', 'Salario', 'Estado'];
      const rows = list.map((e) => [
        e.employee_code,
        `${e.document_type} ${e.document_number}`,
        `${e.first_name} ${e.last_name}`,
        e.department_name || 'Sin asignar',
        e.position_name || 'Sin cargo',
        e.hire_date,
        e.contract_type,
        formatCurrency(e.salary),
        e.status,
      ]);
      const totalPayroll = list.reduce((sum, e) => sum + Number(e.salary || 0), 0);
      return {
        title:
          reportType === 'active_inactive'
            ? 'Reporte de empleados activos e inactivos'
            : 'Reporte general de empleados',
        headers,
        rows,
        summary: [
          { label: 'Total registros', value: String(list.length) },
          { label: 'Activos', value: String(list.filter((e) => e.status === 'Activo').length) },
          { label: 'Inactivos / Novedad', value: String(list.filter((e) => e.status !== 'Activo').length) },
          { label: 'Masa salarial mensual', value: formatCurrency(totalPayroll) },
        ],
      };
    }

    if (reportType === 'by_department') {
      const list = departments.filter((d) => {
        if (deptFilter && String(d.id) !== deptFilter) return false;
        if (statusFilter && d.status !== statusFilter) return false;
        return true;
      });
      const headers = ['Departamento', 'Responsable', 'Colaboradores', 'Masa Salarial', 'Estado', 'Creación'];
      const rows = list.map((d) => {
        const deptEmps = employees.filter((e) => e.department_id === d.id);
        const payroll = deptEmps.reduce((s, e) => s + Number(e.salary || 0), 0);
        return [
          d.name,
          d.manager_name || 'Sin asignar',
          deptEmps.length,
          formatCurrency(payroll),
          d.status,
          d.created_at,
        ];
      });
      return {
        title: 'Reporte consolidado por departamentos',
        headers,
        rows,
        summary: [
          { label: 'Departamentos', value: String(list.length) },
          { label: 'Total colaboradores', value: String(employees.length) },
          {
            label: 'Promedio por área',
            value: String(list.length ? Math.round(employees.length / list.length) : 0),
          },
          {
            label: 'Nómina total',
            value: formatCurrency(employees.reduce((s, e) => s + Number(e.salary || 0), 0)),
          },
        ],
      };
    }

    if (reportType === 'attendance' || reportType === 'absences') {
      const list = attendance.filter((a) => {
        if (!inDateRange(a.date)) return false;
        if (deptFilter && String(a.department_id) !== deptFilter) return false;
        if (statusFilter && a.status !== statusFilter) return false;
        if (reportType === 'absences' && a.status !== 'Ausente' && a.status !== 'Retardo') {
          return false;
        }
        return true;
      });
      const headers = ['Fecha', 'Código', 'Empleado', 'Departamento', 'Entrada', 'Salida', 'Estado', 'Observaciones'];
      const rows = list.map((a) => [
        a.date,
        a.employee_code || '—',
        a.employee_name || '—',
        a.department_name || '—',
        a.check_in || '--:--',
        a.check_out || '--:--',
        a.status,
        a.notes || '—',
      ]);
      return {
        title:
          reportType === 'absences'
            ? 'Reporte de ausencias y retardos'
            : 'Reporte detallado de asistencia',
        headers,
        rows,
        summary: [
          { label: 'Registros totales', value: String(list.length) },
          { label: 'Presentes', value: String(list.filter((a) => a.status === 'Presente').length) },
          { label: 'Retardos', value: String(list.filter((a) => a.status === 'Retardo').length) },
          { label: 'Ausentes', value: String(list.filter((a) => a.status === 'Ausente').length) },
        ],
      };
    }

    // incidents
    const list = incidents.filter((i) => {
      if (!inDateRange(i.start_date)) return false;
      if (statusFilter && i.approval_status !== statusFilter) return false;
      if (deptFilter) {
        const dName = departments.find((d) => String(d.id) === deptFilter)?.name;
        if (dName && i.department_name !== dName) return false;
      }
      return true;
    });
    const headers = ['Colaborador', 'Departamento', 'Tipo', 'Inicio', 'Fin', 'Descripción', 'Soporte', 'Estado'];
    const rows = list.map((i) => [
      i.employee_name || '—',
      i.department_name || '—',
      i.incident_type,
      i.start_date,
      i.end_date,
      i.description,
      i.support_document || 'Sin soporte',
      i.approval_status,
    ]);
    return {
      title: 'Reporte de novedades laborales',
      headers,
      rows,
      summary: [
        { label: 'Total novedades', value: String(list.length) },
        { label: 'Aprobadas', value: String(list.filter((i) => i.approval_status === 'Aprobada').length) },
        { label: 'Pendientes', value: String(list.filter((i) => i.approval_status === 'Pendiente').length) },
        { label: 'Rechazadas', value: String(list.filter((i) => i.approval_status === 'Rechazada').length) },
      ],
    };
  }, [reportType, employees, departments, attendance, incidents, startDate, endDate, deptFilter, statusFilter]);

  const deptChartData = useMemo(() => {
    return departments.map((d) => ({
      name: d.name,
      count: employees.filter((e) => e.department_id === d.id).length,
    }));
  }, [departments, employees]);

  function handleExportExcel() {
    downloadExcelCSV(`HumanPro_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`, reportData.headers, reportData.rows);
    onToast('success', 'Archivo Excel (.csv) descargado correctamente.');
  }

  function handlePrintOrPDF(isPdf: boolean) {
    if (isPdf) {
      onToast('info', 'Selecciona "Guardar como PDF" en el diálogo de impresión.');
    }
    setTimeout(() => window.print(), 150);
  }

  const statusFilterOptions =
    reportType === 'attendance' || reportType === 'absences'
      ? ['Presente', 'Ausente', 'Retardo', 'Permiso']
      : reportType === 'incidents'
        ? ['Pendiente', 'Aprobada', 'Rechazada']
        : reportType === 'by_department'
          ? ['Activo', 'Inactivo']
          : ['Activo', 'Inactivo', 'Vacaciones', 'Licencia'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
            Reportes administrativos
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Generación de informes ejecutivos, análisis por área y exportación documental.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" onClick={() => handlePrintOrPDF(true)}>
            <Download className="w-4 h-4" />
            Exportar PDF
          </Button>
          <Button variant="secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
            Descargar Excel
          </Button>
          <Button onClick={() => handlePrintOrPDF(false)}>
            <Printer className="w-4 h-4" />
            Imprimir reporte
          </Button>
        </div>
      </div>

      {/* Print-only Corporate Header */}
      <div className="hidden print-only mb-6 border-b border-[#CBD5E1] pb-4">
        <h2 className="font-display font-bold text-xl text-[#0F172A]">{companyName} — HumanPro</h2>
        <p className="text-sm text-[#475569]">{reportData.title} · Generado el {formatDateES(new Date().toISOString().slice(0, 10))}</p>
      </div>

      {/* Report Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 no-print">
        {REPORT_CARDS.map((card) => {
          const active = reportType === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                setReportType(card.key);
                setStatusFilter('');
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                active
                  ? 'bg-[#EFF6FF] border-[#2563EB] text-[#172554] shadow-xs'
                  : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] text-[#0F172A]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${
                  active ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-[#475569]'
                }`}
              >
                {card.icon}
              </div>
              <div className="font-display font-semibold text-xs leading-snug">{card.title}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">{card.subtitle}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div>
          <label className={labelClassName}>Fecha inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Fecha final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Departamento</label>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">Todos los departamentos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName}>Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">Todos los estados</option>
            {statusFilterOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Indicators + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          {reportData.summary.map((item) => (
            <div
              key={item.label}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-center"
            >
              <span className="text-xs font-medium text-[#64748B]">{item.label}</span>
              <span className="font-display font-bold text-2xl text-[#0F172A] tabular-nums mt-1.5">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <h3 className="font-display font-semibold text-sm text-[#0F172A] mb-3">
            Distribución actual por departamento
          </h3>
          <DepartmentBarChart data={deptChartData} />
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="font-display font-semibold text-base text-[#0F172A]">
            {reportData.title}
          </h2>
          <span className="text-xs font-mono-tabular text-[#64748B]">
            {reportData.rows.length} filas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                {reportData.headers.map((h) => (
                  <th key={h} className="py-3 px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.headers.length} className="py-12 text-center text-[#64748B]">
                    Sin registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC]">
                    {row.map((cell, cIdx) => {
                      const isLastStatus = cIdx === row.length - 1 && ['Activo', 'Inactivo', 'Vacaciones', 'Licencia', 'Presente', 'Ausente', 'Retardo', 'Permiso', 'Pendiente', 'Aprobada', 'Rechazada'].includes(String(cell));
                      return (
                        <td key={cIdx} className="py-3 px-4 text-[#0F172A]">
                          {isLastStatus ? <StatusBadge status={String(cell)} /> : cell}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
