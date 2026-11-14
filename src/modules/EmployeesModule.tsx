import React, { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { Department, Employee, Position } from '../types/hr';
import { apiFetch, formatCurrency, formatDateES } from '../utils/api';
import {
  Button,
  ConfirmDialog,
  EmployeeAvatar,
  Modal,
  Pagination,
  StatusBadge,
  inputClassName,
  labelClassName,
  selectClassName,
} from '../components/ui/Primitives';

const CONTRACT_TYPES = [
  'Término Indefinido',
  'Término Fijo',
  'Prestación de Servicios',
  'Obra o Labor',
  'Aprendizaje',
];

const STATUS_OPTIONS = ['Activo', 'Inactivo', 'Vacaciones', 'Licencia'];

interface EmployeeFormState {
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  photo_url: string;
  employee_code: string;
  department_id: string;
  position_id: string;
  hire_date: string;
  contract_type: string;
  salary: string;
  status: string;
}

const emptyForm = (nextCode: string): EmployeeFormState => ({
  document_type: 'CC',
  document_number: '',
  first_name: '',
  last_name: '',
  birth_date: '',
  gender: 'Prefiero no decir',
  phone: '',
  email: '',
  address: '',
  photo_url: '',
  employee_code: nextCode,
  department_id: '',
  position_id: '',
  hire_date: new Date().toISOString().slice(0, 10),
  contract_type: 'Término Indefinido',
  salary: '',
  status: 'Activo',
});

export function EmployeesModule({
  employees,
  departments,
  positions,
  onRefresh,
  onToast,
}: {
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  onRefresh: () => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(() => emptyForm('EMP-015'));
  const [saving, setSaving] = useState(false);

  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (q) {
        const hay = `${e.first_name} ${e.last_name} ${e.document_number} ${e.employee_code} ${e.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (deptFilter && String(e.department_id) !== deptFilter) return false;
      if (posFilter && String(e.position_id) !== posFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (contractFilter && e.contract_type !== contractFilter) return false;
      return true;
    });
  }, [employees, search, deptFilter, posFilter, statusFilter, contractFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  function openCreate() {
    const nextNum = employees.length + 1;
    const code = `EMP-${String(nextNum).padStart(3, '0')}`;
    setEditingEmployee(null);
    setForm(emptyForm(code));
    setFormOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setForm({
      document_type: emp.document_type || 'CC',
      document_number: emp.document_number,
      first_name: emp.first_name,
      last_name: emp.last_name,
      birth_date: emp.birth_date || '',
      gender: emp.gender || 'Prefiero no decir',
      phone: emp.phone || '',
      email: emp.email,
      address: emp.address || '',
      photo_url: emp.photo_url || '',
      employee_code: emp.employee_code,
      department_id: emp.department_id ? String(emp.department_id) : '',
      position_id: emp.position_id ? String(emp.position_id) : '',
      hire_date: emp.hire_date || '',
      contract_type: emp.contract_type || 'Término Indefinido',
      salary: String(emp.salary ?? ''),
      status: emp.status || 'Activo',
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        department_id: form.department_id ? Number(form.department_id) : null,
        position_id: form.position_id ? Number(form.position_id) : null,
        salary: Number(form.salary) || 0,
      };
      if (editingEmployee) {
        await apiFetch(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        onToast('success', 'Colaborador actualizado correctamente en Neon PostgreSQL.');
      } else {
        await apiFetch('/api/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        onToast('success', 'Nuevo empleado registrado exitosamente.');
      }
      setFormOpen(false);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al guardar empleado.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingEmployee) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/employees/${deletingEmployee.id}`, { method: 'DELETE' });
      onToast('success', `Se eliminó el registro de ${deletingEmployee.first_name} ${deletingEmployee.last_name}.`);
      setDeletingEmployee(null);
      await onRefresh();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al eliminar empleado.');
    } finally {
      setDeleting(false);
    }
  }

  const availablePositions = form.department_id
    ? positions.filter((p) => String(p.department_id) === form.department_id)
    : positions;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
            Gestión de empleados
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Administra la información de todos los colaboradores.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nuevo empleado
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar nombre, ID, correo..."
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
          aria-label="Filtrar por departamento"
        >
          <option value="">Todos los departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={posFilter}
          onChange={(e) => {
            setPosFilter(e.target.value);
            setPage(1);
          }}
          className={selectClassName}
          aria-label="Filtrar por cargo"
        >
          <option value="">Todos los cargos</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={selectClassName}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={contractFilter}
          onChange={(e) => {
            setContractFilter(e.target.value);
            setPage(1);
          }}
          className={selectClassName}
          aria-label="Filtrar por tipo de contrato"
        >
          <option value="">Todos los contratos</option>
          {CONTRACT_TYPES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1040px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Identificación</th>
                <th className="py-3 px-4">Correo electrónico</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Cargo</th>
                <th className="py-3 px-4">Ingreso</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-[#64748B]">
                      <Users className="w-8 h-8 text-[#CBD5E1]" />
                      <p className="font-medium text-[#0F172A]">No se encontraron empleados</p>
                      <p className="text-xs">Ajusta los filtros o registra un nuevo colaborador.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          firstName={emp.first_name}
                          lastName={emp.last_name}
                          photoUrl={emp.photo_url}
                        />
                        <div>
                          <div className="font-medium text-[#0F172A] whitespace-nowrap">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-xs font-mono-tabular text-[#64748B]">
                            {emp.employee_code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-[#475569] whitespace-nowrap">
                      {emp.document_type} {emp.document_number}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#475569]">{emp.email}</td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-[#475569] whitespace-nowrap">
                      {emp.phone || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#0F172A]">
                      {emp.department_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#475569]">
                      {emp.position_name || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-[#475569] whitespace-nowrap">
                      {formatDateES(emp.hire_date)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingEmployee(emp)}
                          title="Ver detalles"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(emp)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEmployee(emp)}
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

      {/* Create / Edit Employee Modal (2 organized visual sections) */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingEmployee ? 'Editar colaborador' : 'Registrar nuevo empleado'}
        subtitle="Completa la información personal y laboral del colaborador."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Información personal */}
          <div>
            <h3 className="font-display font-semibold text-sm text-[#0F172A] pb-2 border-b border-[#E2E8F0] mb-4">
              1. Información personal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClassName}>Tipo de documento *</label>
                <select
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                  className={selectClassName}
                >
                  <option value="CC">Cédula de Ciudadanía (CC)</option>
                  <option value="CE">Cédula de Extranjería (CE)</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="DNI">DNI</option>
                </select>
              </div>
              <div>
                <label className={labelClassName}>Número de documento *</label>
                <input
                  required
                  value={form.document_number}
                  onChange={(e) => setForm({ ...form, document_number: e.target.value })}
                  placeholder="Ej. 1020784512"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Género</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className={selectClassName}
                >
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                  <option value="Prefiero no decir">Prefiero no decir</option>
                </select>
              </div>

              <div>
                <label className={labelClassName}>Nombres *</label>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Nombres completos"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Apellidos *</label>
                <input
                  required
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Apellidos completos"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Fecha de nacimiento</label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Teléfono</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+57 300 000 0000"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Correo electrónico *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="colaborador@humanpro.com"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>URL de fotografía (opcional)</label>
                <input
                  value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  placeholder="https://..."
                  className={inputClassName}
                />
              </div>

              <div className="sm:col-span-3">
                <label className={labelClassName}>Dirección de residencia</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Dirección completa, ciudad"
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Información laboral */}
          <div>
            <h3 className="font-display font-semibold text-sm text-[#0F172A] pb-2 border-b border-[#E2E8F0] mb-4">
              2. Información laboral
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClassName}>Código del empleado *</label>
                <input
                  required
                  value={form.employee_code}
                  onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                  placeholder="EMP-015"
                  className={`${inputClassName} font-mono-tabular`}
                />
              </div>
              <div>
                <label className={labelClassName}>Departamento</label>
                <select
                  value={form.department_id}
                  onChange={(e) =>
                    setForm({ ...form, department_id: e.target.value, position_id: '' })
                  }
                  className={selectClassName}
                >
                  <option value="">Seleccionar departamento</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Cargo</label>
                <select
                  value={form.position_id}
                  onChange={(e) => setForm({ ...form, position_id: e.target.value })}
                  className={selectClassName}
                >
                  <option value="">Seleccionar cargo</option>
                  {availablePositions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName}>Fecha de ingreso *</label>
                <input
                  type="date"
                  required
                  value={form.hire_date}
                  onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Tipo de contrato</label>
                <select
                  value={form.contract_type}
                  onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
                  className={selectClassName}
                >
                  {CONTRACT_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Salario mensual</label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="5000000"
                  className={`${inputClassName} font-mono-tabular`}
                />
              </div>

              <div>
                <label className={labelClassName}>Estado laboral</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={selectClassName}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar empleado'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Employee Details Modal */}
      <Modal
        open={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        title="Detalles del colaborador"
        maxWidth="max-w-xl"
      >
        {viewingEmployee && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-[#E2E8F0]">
              <EmployeeAvatar
                firstName={viewingEmployee.first_name}
                lastName={viewingEmployee.last_name}
                photoUrl={viewingEmployee.photo_url}
                size="xl"
              />
              <div>
                <h3 className="font-display font-bold text-lg text-[#0F172A]">
                  {viewingEmployee.first_name} {viewingEmployee.last_name}
                </h3>
                <p className="text-sm text-[#64748B]">
                  {viewingEmployee.position_name || 'Sin cargo'} ·{' '}
                  {viewingEmployee.department_name || 'Sin departamento'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={viewingEmployee.status} />
                  <span className="text-xs font-mono-tabular text-[#64748B]">
                    {viewingEmployee.employee_code}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-[#64748B] block">Identificación</span>
                <span className="font-medium font-mono-tabular text-[#0F172A]">
                  {viewingEmployee.document_type} {viewingEmployee.document_number}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block">Correo electrónico</span>
                <span className="font-medium text-[#0F172A]">{viewingEmployee.email}</span>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block">Teléfono</span>
                <span className="font-medium font-mono-tabular text-[#0F172A]">
                  {viewingEmployee.phone || '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block">Fecha de ingreso</span>
                <span className="font-medium text-[#0F172A]">
                  {formatDateES(viewingEmployee.hire_date)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block">Tipo de contrato</span>
                <span className="font-medium text-[#0F172A]">{viewingEmployee.contract_type}</span>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block">Compensación mensual</span>
                <span className="font-semibold font-mono-tabular text-[#0F172A]">
                  {formatCurrency(viewingEmployee.salary)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-[#64748B] block">Dirección</span>
                <span className="font-medium text-[#0F172A]">
                  {viewingEmployee.address || 'No registrada'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setViewingEmployee(null)}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  const target = viewingEmployee;
                  setViewingEmployee(null);
                  openEdit(target);
                }}
              >
                Editar información
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deletingEmployee}
        onClose={() => setDeletingEmployee(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Confirmar eliminación"
        message={
          deletingEmployee
            ? `¿Estás seguro de eliminar a ${deletingEmployee.first_name} ${deletingEmployee.last_name} (${deletingEmployee.employee_code})? También se eliminarán sus registros asociados.`
            : ''
        }
      />
    </div>
  );
}
