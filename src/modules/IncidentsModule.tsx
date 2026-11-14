import React, { useMemo, useState } from 'react';
import { Check, FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { ApprovalStatus, Employee, IncidentType, LaborIncident } from '../types/hr';
import { apiFetch, formatDateES } from '../utils/api';
import {
  Button,
  ConfirmDialog,
  Modal,
  Pagination,
  StatusBadge,
  inputClassName,
  labelClassName,
  selectClassName,
} from '../components/ui/Primitives';

const INCIDENT_TYPES: IncidentType[] = [
  'Incapacidad',
  'Permiso',
  'Vacaciones',
  'Licencia',
  'Ausencia',
  'Calamidad',
  'Otras novedades',
];

const APPROVAL_STATES: ApprovalStatus[] = ['Pendiente', 'Aprobada', 'Rechazada'];

export function IncidentsModule({
  incidents,
  employees,
  onRefresh,
  onToast,
}: {
  incidents: LaborIncident[];
  employees: Employee[];
  onRefresh: () => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LaborIncident | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentType>('Permiso');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [observations, setObservations] = useState('');
  const [supportDocument, setSupportDocument] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('Pendiente');
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<LaborIncident | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incidents.filter((i) => {
      if (q) {
        const hay = `${i.employee_name || ''} ${i.description} ${i.incident_type} ${i.department_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter && i.incident_type !== typeFilter) return false;
      if (approvalFilter && i.approval_status !== approvalFilter) return false;
      return true;
    });
  }, [incidents, search, typeFilter, approvalFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  function openCreate() {
    const today = new Date().toISOString().slice(0, 10);
    setEditing(null);
    setEmployeeId(employees[0] ? String(employees[0].id) : '');
    setIncidentType('Permiso');
    setStartDate(today);
    setEndDate(today);
    setDescription('');
    setObservations('');
    setSupportDocument('');
    setApprovalStatus('Pendiente');
    setFormOpen(true);
  }

  function openEdit(inc: LaborIncident) {
    setEditing(inc);
    setEmployeeId(String(inc.employee_id));
    setIncidentType(inc.incident_type);
    setStartDate(inc.start_date);
    setEndDate(inc.end_date);
    setDescription(inc.description);
    setObservations(inc.observations || '');
    setSupportDocument(inc.support_document || '');
    setApprovalStatus(inc.approval_status);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        employee_id: Number(employeeId),
        incident_type: incidentType,
        start_date: startDate,
        end_date: endDate,
        description,
        observations,
        support_document: supportDocument,
        approval_status: approvalStatus,
      };
      if (editing) {
        await apiFetch(`/api/incidents/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        onToast('success', 'Novedad laboral actualizada.');
      } else {
        await apiFetch('/api/incidents', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        onToast('success', 'Novedad laboral radicada exitosamente.');
      }
      setFormOpen(false);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al guardar novedad.');
    } finally {
      setSaving(false);
    }
  }

  async function quickUpdateStatus(inc: LaborIncident, nextStatus: ApprovalStatus) {
    try {
      await apiFetch(`/api/incidents/${inc.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ approval_status: nextStatus }),
      });
      onToast('success', `Novedad marcada como ${nextStatus}.`);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al actualizar estado.');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/incidents/${deleting.id}`, { method: 'DELETE' });
      onToast('success', 'Novedad laboral eliminada.');
      setDeleting(null);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al eliminar novedad.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
            Novedades laborales
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Registro y flujo de aprobación de incapacidades, permisos, vacaciones, licencias y ausencias.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Registrar novedad
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar colaborador o descripción..."
            className={`${inputClassName} pl-9`}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className={selectClassName}
        >
          <option value="">Todos los tipos de novedad</option>
          {INCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={approvalFilter}
          onChange={(e) => {
            setApprovalFilter(e.target.value);
            setPage(1);
          }}
          className={selectClassName}
        >
          <option value="">Todos los estados de aprobación</option>
          {APPROVAL_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Periodo</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-4">Soporte</th>
                <th className="py-3 px-4">Aprobación</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    No se encontraron novedades laborales con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                paginated.map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#0F172A]">{inc.employee_name}</div>
                      <div className="text-xs text-[#64748B]">
                        {inc.employee_code} · {inc.department_name || 'General'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-xs text-[#2563EB] whitespace-nowrap">
                      {inc.incident_type}
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-xs text-[#475569] whitespace-nowrap">
                      {formatDateES(inc.start_date)} — {formatDateES(inc.end_date)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#0F172A] max-w-xs">
                      <p className="line-clamp-2">{inc.description}</p>
                      {inc.observations && (
                        <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                          Obs: {inc.observations}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#475569]">
                      {inc.support_document ? (
                        <span className="inline-flex items-center gap-1 font-mono-tabular text-[11px] text-[#0F172A]">
                          <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                          {inc.support_document}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">Sin adjunto</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inc.approval_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {inc.approval_status === 'Pendiente' && (
                          <>
                            <button
                              type="button"
                              onClick={() => quickUpdateStatus(inc, 'Aprobada')}
                              title="Aprobar novedad"
                              className="p-1.5 rounded-lg text-[#16A34A] hover:bg-[#DCFCE7] cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => quickUpdateStatus(inc, 'Rechazada')}
                              title="Rechazar novedad"
                              className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(inc)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(inc)}
                          title="Eliminar"
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

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar novedad laboral' : 'Registrar novedad laboral'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className={labelClassName}>Tipo de novedad *</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                className={selectClassName}
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>Fecha de inicio *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Fecha de finalización *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName}>Descripción *</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Motivo y detalle de la novedad laboral"
              className="w-full p-3 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-[#2563EB]/15"
            />
          </div>

          <div>
            <label className={labelClassName}>Observaciones</label>
            <input
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas internas de Talento Humano"
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>Documento de soporte</label>
              <input
                value={supportDocument}
                onChange={(e) => setSupportDocument(e.target.value)}
                placeholder="Ej. INC-EPS-2026.pdf"
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Estado de aprobación</label>
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value as ApprovalStatus)}
                className={selectClassName}
              >
                {APPROVAL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar novedad'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Eliminar novedad laboral"
        message={
          deleting
            ? `¿Confirmas eliminar la novedad (${deleting.incident_type}) de ${deleting.employee_name}?`
            : ''
        }
      />
    </div>
  );
}
