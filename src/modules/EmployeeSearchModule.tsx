import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  FileWarning,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  UserCheck,
} from 'lucide-react';
import {
  AttendanceRecord,
  Department,
  Employee,
  LaborIncident,
  Position,
} from '../types/hr';
import { apiFetch, formatCurrency, formatDateES } from '../utils/api';
import {
  Button,
  EmployeeAvatar,
  Modal,
  StatusBadge,
  inputClassName,
  labelClassName,
  selectClassName,
} from '../components/ui/Primitives';

interface EmployeeProfileResponse {
  employee: Employee;
  attendanceHistory: AttendanceRecord[];
  incidentsHistory: LaborIncident[];
}

export function EmployeeSearchModule({
  employees,
  departments,
  positions,
  initialSelectedEmployee,
  onClearInitialEmployee,
}: {
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  initialSelectedEmployee: Employee | null;
  onClearInitialEmployee: () => void;
}) {
  const [docQuery, setDocQuery] = useState('');
  const [firstNameQuery, setFirstNameQuery] = useState('');
  const [lastNameQuery, setLastNameQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedProfile, setSelectedProfile] = useState<EmployeeProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  async function openProfile(empId: number) {
    setLoadingProfile(true);
    try {
      const data = await apiFetch<EmployeeProfileResponse>(`/api/employees/${empId}/profile`);
      setSelectedProfile(data);
    } catch {
      const fallback = employees.find((e) => e.id === empId);
      if (fallback) {
        setSelectedProfile({
          employee: fallback,
          attendanceHistory: [],
          incidentsHistory: [],
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    if (initialSelectedEmployee) {
      openProfile(initialSelectedEmployee.id);
      onClearInitialEmployee();
    }
  }, [initialSelectedEmployee]);

  const results = useMemo(() => {
    return employees.filter((e) => {
      if (docQuery.trim() && !e.document_number.toLowerCase().includes(docQuery.trim().toLowerCase())) {
        return false;
      }
      if (firstNameQuery.trim() && !e.first_name.toLowerCase().includes(firstNameQuery.trim().toLowerCase())) {
        return false;
      }
      if (lastNameQuery.trim() && !e.last_name.toLowerCase().includes(lastNameQuery.trim().toLowerCase())) {
        return false;
      }
      if (deptFilter && String(e.department_id) !== deptFilter) return false;
      if (posFilter && String(e.position_id) !== posFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });
  }, [employees, docQuery, firstNameQuery, lastNameQuery, deptFilter, posFilter, statusFilter]);

  function resetFilters() {
    setDocQuery('');
    setFirstNameQuery('');
    setLastNameQuery('');
    setDeptFilter('');
    setPosFilter('');
    setStatusFilter('');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
            Consultar empleados
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Búsqueda avanzada y ficha integral con historial de asistencia y novedades.
          </p>
        </div>
        <Button variant="secondary" onClick={resetFilters}>
          <RotateCcw className="w-4 h-4" />
          Limpiar criterios
        </Button>
      </div>

      {/* Multi-field Search Form */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClassName}>Número de identificación</label>
            <input
              value={docQuery}
              onChange={(e) => setDocQuery(e.target.value)}
              placeholder="Ej. 1020784512"
              className={`${inputClassName} font-mono-tabular`}
            />
          </div>
          <div>
            <label className={labelClassName}>Nombre</label>
            <input
              value={firstNameQuery}
              onChange={(e) => setFirstNameQuery(e.target.value)}
              placeholder="Ej. Laura Valentina"
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Apellido</label>
            <input
              value={lastNameQuery}
              onChange={(e) => setLastNameQuery(e.target.value)}
              placeholder="Ej. Gómez"
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
            <label className={labelClassName}>Cargo</label>
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className={selectClassName}
            >
              <option value="">Todos los cargos</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClassName}>Estado laboral</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClassName}
            >
              <option value="">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Vacaciones">Vacaciones</option>
              <option value="Licencia">Licencia</option>
            </select>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
          <span>
            <strong className="text-[#0F172A] tabular-nums">{results.length}</strong> colaboradores encontrados
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#2563EB] font-medium">
            <Search className="w-3.5 h-3.5" />
            Haz clic en cualquier fila para abrir su ficha completa
          </span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-5">Colaborador</th>
                <th className="py-3 px-5">Identificación</th>
                <th className="py-3 px-5">Departamento</th>
                <th className="py-3 px-5">Cargo</th>
                <th className="py-3 px-5">Estado laboral</th>
                <th className="py-3 px-5 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B]">
                    No hay colaboradores que coincidan con la consulta.
                  </td>
                </tr>
              ) : (
                results.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => openProfile(emp.id)}
                    className="hover:bg-[#EFF6FF]/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          firstName={emp.first_name}
                          lastName={emp.last_name}
                          photoUrl={emp.photo_url}
                        />
                        <div>
                          <div className="font-semibold text-[#0F172A]">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-xs text-[#64748B]">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5 font-mono-tabular text-xs text-[#475569]">
                      {emp.document_type} {emp.document_number}
                    </td>
                    <td className="py-3 px-5 text-xs text-[#0F172A]">
                      {emp.department_name || '—'}
                    </td>
                    <td className="py-3 px-5 text-xs text-[#475569]">
                      {emp.position_name || '—'}
                    </td>
                    <td className="py-3 px-5">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProfile(emp.id);
                        }}
                      >
                        Abrir ficha
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Detailed Dossier Modal */}
      <Modal
        open={!!selectedProfile || loadingProfile}
        onClose={() => setSelectedProfile(null)}
        title="Ficha integral del colaborador"
        maxWidth="max-w-4xl"
      >
        {loadingProfile ? (
          <div className="py-14 text-center text-sm text-[#64748B]">
            Cargando expediente e historiales desde Neon PostgreSQL...
          </div>
        ) : (
          selectedProfile && (
            <div className="space-y-6">
              {/* Top Identity Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-4">
                  <EmployeeAvatar
                    firstName={selectedProfile.employee.first_name}
                    lastName={selectedProfile.employee.last_name}
                    photoUrl={selectedProfile.employee.photo_url}
                    size="xl"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display font-bold text-xl text-[#0F172A]">
                        {selectedProfile.employee.first_name} {selectedProfile.employee.last_name}
                      </h3>
                      <StatusBadge status={selectedProfile.employee.status} />
                    </div>
                    <p className="text-sm text-[#475569] mt-0.5">
                      {selectedProfile.employee.position_name || 'Sin cargo'} ·{' '}
                      {selectedProfile.employee.department_name || 'Sin departamento'}
                    </p>
                    <p className="text-xs font-mono-tabular text-[#64748B] mt-1">
                      Código {selectedProfile.employee.employee_code} ·{' '}
                      {selectedProfile.employee.document_type}{' '}
                      {selectedProfile.employee.document_number}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-[#64748B] block">Salario mensual</span>
                  <span className="font-display font-bold text-lg font-mono-tabular text-[#0F172A]">
                    {formatCurrency(selectedProfile.employee.salary)}
                  </span>
                </div>
              </div>

              {/* Personal & Labor Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                  <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-[#475569]">
                    Información personal
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>{selectedProfile.employee.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="font-mono-tabular">
                        {selectedProfile.employee.phone || 'Sin teléfono'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>{selectedProfile.employee.address || 'Sin dirección'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>
                        Nacimiento: {formatDateES(selectedProfile.employee.birth_date)} · Género:{' '}
                        {selectedProfile.employee.gender}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                  <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-[#475569]">
                    Información laboral
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>
                        Departamento: <strong>{selectedProfile.employee.department_name || '—'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Briefcase className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>
                        Cargo: <strong>{selectedProfile.employee.position_name || '—'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <UserCheck className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>Contrato: {selectedProfile.employee.contract_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>Fecha de ingreso: {formatDateES(selectedProfile.employee.hire_date)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance & Incidents History */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                    <span className="font-display font-semibold text-xs text-[#0F172A] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                      Historial de asistencia
                    </span>
                    <span className="text-[11px] text-[#64748B] tabular-nums">
                      {selectedProfile.attendanceHistory.length} registros
                    </span>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] max-h-56 overflow-y-auto">
                    {selectedProfile.attendanceHistory.length === 0 ? (
                      <p className="p-4 text-xs text-[#64748B]">Sin registros recientes.</p>
                    ) : (
                      selectedProfile.attendanceHistory.map((a) => (
                        <div key={a.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-medium text-[#0F172A]">{formatDateES(a.date)}</div>
                            <div className="font-mono-tabular text-[11px] text-[#64748B]">
                              {a.check_in || '--:--'} a {a.check_out || '--:--'}
                            </div>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                    <span className="font-display font-semibold text-xs text-[#0F172A] flex items-center gap-1.5">
                      <FileWarning className="w-3.5 h-3.5 text-[#F59E0B]" />
                      Historial de novedades
                    </span>
                    <span className="text-[11px] text-[#64748B] tabular-nums">
                      {selectedProfile.incidentsHistory.length} registros
                    </span>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] max-h-56 overflow-y-auto">
                    {selectedProfile.incidentsHistory.length === 0 ? (
                      <p className="p-4 text-xs text-[#64748B]">Sin novedades registradas.</p>
                    ) : (
                      selectedProfile.incidentsHistory.map((inc) => (
                        <div key={inc.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-semibold text-[#0F172A]">{inc.incident_type}</div>
                            <div className="text-[11px] text-[#64748B] truncate">
                              {formatDateES(inc.start_date)} — {inc.description}
                            </div>
                          </div>
                          <StatusBadge status={inc.approval_status} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedProfile(null)}>
                  Cerrar ficha
                </Button>
              </div>
            </div>
          )
        )}
      </Modal>
    </div>
  );
}
