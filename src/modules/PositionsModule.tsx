import React, { useMemo, useState } from 'react';
import { Briefcase, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Department, Position } from '../types/hr';
import { apiFetch } from '../utils/api';
import {
  Button,
  ConfirmDialog,
  Modal,
  StatusBadge,
  inputClassName,
  labelClassName,
  selectClassName,
} from '../components/ui/Primitives';

const HIERARCHY_LEVELS = [
  'Directivo',
  'Gerencial',
  'Coordinación',
  'Especialista',
  'Analista',
  'Operativo',
];

export function PositionsModule({
  positions,
  departments,
  onRefresh,
  onToast,
}: {
  positions: Position[];
  departments: Department[];
  onRefresh: () => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [viewing, setViewing] = useState<Position | null>(null);
  const [deleting, setDeleting] = useState<Position | null>(null);

  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [description, setDescription] = useState('');
  const [hierarchyLevel, setHierarchyLevel] = useState('Especialista');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>('Activo');
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return positions.filter((p) => {
      if (q && !`${p.name} ${p.description} ${p.department_name || ''}`.toLowerCase().includes(q)) {
        return false;
      }
      if (deptFilter && String(p.department_id) !== deptFilter) return false;
      if (levelFilter && p.hierarchy_level !== levelFilter) return false;
      return true;
    });
  }, [positions, search, deptFilter, levelFilter]);

  function openCreate() {
    setEditing(null);
    setName('');
    setDepartmentId(departments[0] ? String(departments[0].id) : '');
    setDescription('');
    setHierarchyLevel('Especialista');
    setStatus('Activo');
    setFormOpen(true);
  }

  function openEdit(pos: Position) {
    setEditing(pos);
    setName(pos.name);
    setDepartmentId(pos.department_id ? String(pos.department_id) : '');
    setDescription(pos.description);
    setHierarchyLevel(pos.hierarchy_level);
    setStatus(pos.status);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        department_id: departmentId ? Number(departmentId) : null,
        description,
        hierarchy_level: hierarchyLevel,
        status,
      };
      if (editing) {
        await apiFetch(`/api/positions/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        onToast('success', 'Cargo actualizado correctamente.');
      } else {
        await apiFetch('/api/positions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        onToast('success', 'Nuevo cargo registrado.');
      }
      setFormOpen(false);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al guardar cargo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/positions/${deleting.id}`, { method: 'DELETE' });
      onToast('success', `Cargo "${deleting.name}" eliminado.`);
      setDeleting(null);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al eliminar cargo.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
            Gestión de cargos
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Catálogo de roles, niveles jerárquicos y adscripción departamental.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nuevo cargo
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cargo o descripción..."
            className={`${inputClassName} pl-9`}
          />
        </div>
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
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className={selectClassName}
        >
          <option value="">Todos los niveles jerárquicos</option>
          {HIERARCHY_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-5">Nombre del cargo</th>
                <th className="py-3 px-5">Departamento</th>
                <th className="py-3 px-5">Descripción</th>
                <th className="py-3 px-5">Nivel jerárquico</th>
                <th className="py-3 px-5">Estado</th>
                <th className="py-3 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B]">
                    No se encontraron cargos registrados.
                  </td>
                </tr>
              ) : (
                filtered.map((pos) => (
                  <tr key={pos.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-[#0F172A]">{pos.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-[#0F172A]">
                      {pos.department_name || 'Transversal'}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-[#64748B] max-w-xs">
                      <p className="line-clamp-2">{pos.description || '—'}</p>
                    </td>
                    <td className="py-3.5 px-5 text-xs font-medium text-[#475569]">
                      {pos.hierarchy_level}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={pos.status} />
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(pos)}
                          title="Visualizar"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(pos)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(pos)}
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
        title={editing ? 'Editar cargo' : 'Nuevo cargo'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClassName}>Nombre del cargo *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Especialista en Selección"
              className={inputClassName}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>Departamento</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={selectClassName}
              >
                <option value="">Transversal / Sin asignar</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>Nivel jerárquico</label>
              <select
                value={hierarchyLevel}
                onChange={(e) => setHierarchyLevel(e.target.value)}
                className={selectClassName}
              >
                {HIERARCHY_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClassName}>Descripción</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Responsabilidades clave y competencias del cargo"
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
              {saving ? 'Guardando...' : 'Guardar cargo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Detalle del cargo"
        maxWidth="max-w-md"
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs text-[#64748B] block">Nombre del cargo</span>
              <span className="font-display font-semibold text-base text-[#0F172A]">
                {viewing.name}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[#64748B] block">Departamento</span>
                <span className="font-medium text-[#0F172A]">
                  {viewing.department_name || 'Transversal'}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block">Nivel jerárquico</span>
                <span className="font-medium text-[#0F172A]">{viewing.hierarchy_level}</span>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block">Estado</span>
                <div className="mt-1">
                  <StatusBadge status={viewing.status} />
                </div>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block">Ocupantes actuales</span>
                <span className="font-mono-tabular font-semibold text-[#0F172A]">
                  {viewing.employee_count ?? 0}
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">Descripción</span>
              <p className="text-[#475569] mt-1 leading-relaxed">
                {viewing.description || 'Sin descripción detallada.'}
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Eliminar cargo"
        message={deleting ? `¿Confirmas eliminar el cargo "${deleting.name}"?` : ''}
      />
    </div>
  );
}
