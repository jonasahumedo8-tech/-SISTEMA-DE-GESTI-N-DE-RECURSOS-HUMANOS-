export type ModuleKey =
  | 'dashboard'
  | 'employees'
  | 'departments'
  | 'positions'
  | 'attendance'
  | 'incidents'
  | 'search'
  | 'reports'
  | 'settings';

export type EmployeeStatus = 'Activo' | 'Inactivo' | 'Vacaciones' | 'Licencia';
export type ContractType =
  | 'Término Indefinido'
  | 'Término Fijo'
  | 'Prestación de Servicios'
  | 'Obra o Labor'
  | 'Aprendizaje';

export type AttendanceStatus = 'Presente' | 'Ausente' | 'Retardo' | 'Permiso';

export type IncidentType =
  | 'Incapacidad'
  | 'Permiso'
  | 'Vacaciones'
  | 'Licencia'
  | 'Ausencia'
  | 'Calamidad'
  | 'Otras novedades';

export type ApprovalStatus = 'Pendiente' | 'Aprobada' | 'Rechazada';

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_initials: string;
}

export interface Department {
  id: number;
  name: string;
  description: string;
  manager_name: string;
  status: 'Activo' | 'Inactivo';
  created_at: string;
  employee_count: number;
}

export interface Position {
  id: number;
  name: string;
  department_id: number | null;
  department_name?: string;
  description: string;
  hierarchy_level: string;
  status: 'Activo' | 'Inactivo';
  employee_count?: number;
}

export interface Employee {
  id: number;
  employee_code: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string;
  phone: string;
  email: string;
  address: string;
  photo_url: string | null;
  department_id: number | null;
  department_name?: string;
  position_id: number | null;
  position_name?: string;
  hire_date: string;
  contract_type: ContractType | string;
  salary: number;
  status: EmployeeStatus;
  created_at?: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  document_number?: string;
  department_id?: number;
  department_name?: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  notes: string;
}

export interface LaborIncident {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  document_number?: string;
  department_name?: string;
  incident_type: IncidentType;
  start_date: string;
  end_date: string;
  description: string;
  observations: string;
  support_document: string;
  approval_status: ApprovalStatus;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  actor_name: string;
  action: string;
  module: string;
  detail: string;
  created_at: string;
}

export interface CompanySettings {
  id: number;
  company_name: string;
  tax_id: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  workday_start: string;
  workday_end: string;
  late_tolerance_minutes: number;
  currency: string;
}

export interface DashboardPayload {
  selectedDate: string;
  kpis: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    todayAttendance: number;
    pendingIncidents: number;
    attendanceRate: number;
  };
  charts: {
    employeesByDepartment: { name: string; count: number }[];
    weeklyAttendance: {
      date: string;
      label: string;
      Presente: number;
      Retardo: number;
      Ausente: number;
      Permiso: number;
    }[];
    statusDistribution: { status: string; count: number }[];
    incidentsSummary: { type: string; count: number; pending: number; approved: number }[];
  };
  recent: {
    employees: Employee[];
    attendance: AttendanceRecord[];
    incidents: LaborIncident[];
    activityLogs: ActivityLog[];
  };
  notifications: {
    id: string;
    title: string;
    description: string;
    type: 'warning' | 'info' | 'alert';
    module: ModuleKey;
  }[];
}
