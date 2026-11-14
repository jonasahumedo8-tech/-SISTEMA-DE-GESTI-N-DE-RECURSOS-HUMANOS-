import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, Department, Employee } from '../types/hr';
import { apiFetch, formatDateES } from '../utils/api';
import {
  Button,
  ConfirmDialog,
  Modal,
  Pagination,
  StatCard,
  StatusBadge,
  inputClassName,
  labelClassName,
  selectClassName,
} from '../components/ui/Primitives';

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Presente', 'Ausente', 'Retardo', 'Permiso'];

export function AttendanceModule({
  attendance,
  employees,
  departments,
  selectedDate,
  onDateChange,
  onRefresh,
  onToast,
}: {
  attendance: AttendanceRecord[];
  employees: Employee[];
  departments: Department[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh: () => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [dateFilter, setDateFilter] = useState(selectedDate);
  const [showAllDates, setShowAllDates] = useState(false);
  const [deptFilter, setDeptFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [recordDate, setRecordDate] = useState(selectedDate);
  const [checkIn, setCheckIn] = useState('08:00');
  const [checkOut, setCheckOut] = useState('17:30');
  const [status, setStatus] = useState<AttendanceStatus>('Presente');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<AttendanceRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attendance.filter((a) => {
      if (!showAllDates && dateFilter && a.date !== dateFilter) return false;
      if (deptFilter && String(a.department_id) !== deptFilter) return false;
      if (q) {
        const hay = `${a.employee_name || ''} ${a.document_number || ''} ${a.employee_code || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [attendance, showAllDates, dateFilter, deptFilter, search]);

  const stats = useMemo(() => {
    return {
      presentes: filtered.filter((r) => r.status === 'Presente').length,
      ausentes: filtered.filter((r) => r.status === 'Ausente').length,
      retardos: filtered.filter((r) => r.status === 'Retardo').length,
      permisos: filtered.filter((r) => r.status === 'Permiso').length,
    };
  }, [filtered]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  function openCreate() {
    setEmployeeId(employees[0] ? String(employees[0].id) : '');
    setRecordDate(dateFilter || selectedDate);
    setCheckIn('08:00');
    setCheckOut('17:30');
    setStatus('Presente');
    setNotes('');
    setFormOpen(true);
  }

  function openEdit(rec: AttendanceRecord) {
    setEmployeeId(String(rec.employee_id));
    setRecordDate(rec.date);
    setCheckIn(rec.check_in || '');
    setCheckOut(rec.check_out || '');
    setStatus(rec.status);
    setNotes(rec.notes || '');
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: Number(employeeId),
          date: recordDate,
          check_in: status === 'Ausente' || status === 'Permiso' ? null : checkIn || null,
          check_out: status === 'Ausente' || status === 'Permiso' ? null : checkOut || null,
          status,
          notes,
        }),
      });
      onToast('success', 'Registro de asistencia guardado en Neon PostgreSQL.');
      setFormOpen(false);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al registrar asistencia.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/attendance/${deleting.id}`, { method: 'DELETE' });
      onToast('success', 'Registro de asistencia eliminado.');
      setDeleting(null);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al eliminar registro.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
            Control de asistencia
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Seguimiento diario de entradas, salidas, retardos y permisos del personal.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Registrar asistencia
        </Button>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Presentes"
          value={stats.presentes}
          description={showAllDates ? 'Histórico filtrado' : formatDateES(dateFilter)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accentClass="bg-[#DCFCE7] text-[#16A34A]"
        />
        <StatCard
          title="Ausentes"
          value={stats.ausentes}
          description="Sin registro o falta"
          icon={<XCircle className="w-5 h-5" />}
          accentClass="bg-[#FEE2E2] text-[#DC2626]"
        />
        <StatCard
          title="Retardos"
          value={stats.retardos}
          description="Ingreso fuera de tolerancia"
          icon={<Clock className="w-5 h-5" />}
          accentClass="bg-[#FEF3C7] text-[#D97706]"
        />
        <StatCard
          title="Permisos"
          value={stats.permisos}
          description="Ausencias justificadas"
          icon={<Info className="w-5 h-5" />}
          accentClass="bg-[#E0F2FE] text-[#0284C7]"
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar empleado o documento..."
            className={`${inputClassName} pl-9`}
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPage(1);
          }}
          className={selectClassName}
        >
          <option value="">Todos los departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          disabled={showAllDates}
          onChange={(e) => {
            setDateFilter(e.target.value);
            onDateChange(e.target.value);
            setPage(1);
          }}
          className={`${inputClassName} tabular-nums disabled:opacity-50`}
        />
        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#475569] cursor-pointer select-none px-2">
          <input
            type="checkbox"
            checked={showAllDates}
            onChange={(e) => {
              setShowAllDates(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]"
          />
          Ver historial completo de fechas
        </label>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Empleado</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Hora de entrada</th>
                <th className="py-3 px-4">Hora de salida</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Observaciones</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#64748B]">
                    No hay registros de asistencia para la fecha o filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginated.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#0F172A]">{rec.employee_name}</div>
                      <div className="text-xs font-mono-tabular text-[#64748B]">
                        {rec.employee_code}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-[#475569]">
                      {rec.document_number}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#0F172A]">
                      {rec.department_name || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-[#0F172A]">
                      {rec.check_in || '--:--'}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-[#0F172A]">
                      {rec.check_out || '--:--'}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-[#475569] whitespace-nowrap">
                      {formatDateES(rec.date)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="py-3 px-4 text-xs text-[#64748B] max-w-xs truncate">
                      {rec.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(rec)}
                          title="Editar registro"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(rec)}
                          title="Eliminar registro"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Register Attendance Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Registrar asistencia"
        subtitle="Si el colaborador ya tiene registro en esa fecha, se actualizará automáticamente."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClassName}>Empleado *</label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={selectClassName}
            >
              <option value="">Seleccionar colaborador</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} ({e.employee_code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>Fecha *</label>
              <input
                type="date"
                required
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Estado *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className={selectClassName}
              >
                {ATTENDANCE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {status !== 'Ausente' && status !== 'Permiso' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>Hora de entrada</label>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Hora de salida</label>
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
          )}
          <div>
            <label className={labelClassName}>Observaciones</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre la jornada"
              className="w-full p-3 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-[#2563EB]/15"
            />
          </div>
          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar asistencia'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Eliminar registro de asistencia"
        message={
          deleting
            ? `¿Eliminar el registro de asistencia de ${deleting.employee_name} del ${formatDateES(deleting.date)}?`
            : ''
        }
      />
    </div>
  );
}
