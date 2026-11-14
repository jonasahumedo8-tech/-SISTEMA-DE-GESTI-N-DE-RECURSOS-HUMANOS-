import React, { useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Department } from '../types/hr';
import { apiFetch, formatDateES } from '../utils/api';
import {
  Button,
  ConfirmDialog,
  Modal,
  StatusBadge,
  inputClassName,
  labelClassName,
  selectClassName,
} from '../components/ui/Primitives';

export function DepartmentsModule({
  departments,
  onRefresh,
  onToast,
}: {
  departments: Department[];
  onRefresh: () => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerName, setManagerName] = useState('');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>('Activo');
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Department | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return departments.filter((d) => {
      if (q && !`${d.name} ${d.description} ${d.manager_name}`.toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter && d.status !== statusFilter) return false;
      return true;
    });
  }, [departments, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    setManagerName('');
    setStatus('Activo');
    setFormOpen(true);
  }

  function openEdit(d: Department) {
    setEditing(d);
    setName(d.name);
    setDescription(d.description);
    setManagerName(d.manager_name);
    setStatus(d.status);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, description, manager_name: managerName, status };
      if (editing) {
        await apiFetch(`/api/departments/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        onToast('success', 'Departamento actualizado correctamente.');
      } else {
        await apiFetch('/api/departments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        onToast('success', 'Nuevo departamento creado en Neon PostgreSQL.');
      }
      setFormOpen(false);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al guardar departamento.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/departments/${deleting.id}`, { method: 'DELETE' });
      onToast('success', `Departamento "${deleting.name}" eliminado.`);
      setDeleting(null);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al eliminar departamento.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
            Gestión de departamentos
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Estructura organizacional, responsables de área y distribución de personal.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nuevo departamento
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar departamento o responsable..."
            className={`${inputClassName} pl-9`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${selectClassName} sm:w-48`}
        >
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-5">Departamento</th>
                <th className="py-3 px-5">Descripción</th>
                <th className="py-3 px-5">Responsable</th>
                <th className="py-3 px-5 text-right">Empleados</th>
                <th className="py-3 px-5">Estado</th>
                <th className="py-3 px-5">Creación</th>
                <th className="py-3 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    No hay departamentos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((dept) => (
                  <tr key={dept.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-[#0F172A]">{dept.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-[#64748B] max-w-xs">
                      <p className="line-clamp-2">{dept.description || '—'}</p>
                    </td>
                    <td className="py-3.5 px-5 text-xs font-medium text-[#0F172A] whitespace-nowrap">
                      {dept.manager_name || 'Sin asignar'}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono-tabular font-semibold text-[#0F172A]">
                      {dept.employee_count}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={dept.status} />
                    </td>
                    <td className="py-3.5 px-5 font-mono-tabular text-xs text-[#64748B] whitespace-nowrap">
                      {formatDateES(dept.created_at)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(dept)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(dept)}
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
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar departamento' : 'Nuevo departamento'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClassName}>Nombre del departamento *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Arquitectura y Producto"
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Responsable del área</label>
            <input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="Nombre completo del líder"
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Descripción</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Funciones principales y alcance organizacional"
              className="w-full p-3 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-[#2563EB]/15"
            />
          </div>
          <div>
            <label className={labelClassName}>Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}
              className={selectClassName}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar departamento'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Eliminar departamento"
        message={
          deleting
            ? `¿Deseas eliminar el departamento "${deleting.name}"? Los empleados asignados quedarán sin departamento hasta reasignarlos.`
            : ''
        }
      />
    </div>
  );
}
