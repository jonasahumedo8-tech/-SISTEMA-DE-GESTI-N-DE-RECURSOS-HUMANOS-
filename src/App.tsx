import React, { useCallback, useEffect, useState } from 'react';
import {
  AttendanceRecord,
  CompanySettings,
  DashboardPayload,
  Department,
  Employee,
  LaborIncident,
  ModuleKey,
  Position,
  UserSession,
} from './types/hr';
import { apiFetch, clearSession, getSavedSession } from './utils/api';
import { signOutGoogle } from './utils/firebaseAuth';
import { LoginView } from './components/LoginView';
import { Layout } from './components/Layout';
import { ToastContainer, ToastItem } from './components/ui/Primitives';
import { DashboardModule } from './modules/DashboardModule';
import { EmployeesModule } from './modules/EmployeesModule';
import { DepartmentsModule } from './modules/DepartmentsModule';
import { PositionsModule } from './modules/PositionsModule';
import { AttendanceModule } from './modules/AttendanceModule';
import { IncidentsModule } from './modules/IncidentsModule';
import { EmployeeSearchModule } from './modules/EmployeeSearchModule';
import { ReportsModule } from './modules/ReportsModule';
import { SettingsModule } from './modules/SettingsModule';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(() => getSavedSession());
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [incidents, setIncidents] = useState<LaborIncident[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);

  const [inspectEmployee, setInspectEmployee] = useState<Employee | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const loadAllData = useCallback(
    async (dateOverride?: string) => {
      const targetDate = dateOverride || selectedDate;
      setLoading(true);
      try {
        const [dash, emps, depts, pos, att, inc, cfg] = await Promise.all([
          apiFetch<DashboardPayload>(`/api/dashboard?date=${targetDate}`),
          apiFetch<Employee[]>('/api/employees'),
          apiFetch<Department[]>('/api/departments'),
          apiFetch<Position[]>('/api/positions'),
          apiFetch<AttendanceRecord[]>('/api/attendance'),
          apiFetch<LaborIncident[]>('/api/incidents'),
          apiFetch<CompanySettings>('/api/settings'),
        ]);
        setDashboard(dash);
        setEmployees(emps);
        setDepartments(depts);
        setPositions(pos);
        setAttendance(att);
        setIncidents(inc);
        setSettings(cfg);
      } catch (err) {
        pushToast(
          'error',
          err instanceof Error ? err.message : 'Error al sincronizar datos con Neon PostgreSQL.'
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedDate, pushToast]
  );

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  function handleDateChange(nextDate: string) {
    setSelectedDate(nextDate);
    if (user) {
      loadAllData(nextDate);
    }
  }

  function handleLogout() {
    signOutGoogle();
    clearSession();
    setUser(null);
    setActiveModule('dashboard');
  }

  function handleQuickInspectEmployee(emp: Employee) {
    setInspectEmployee(emp);
    setActiveModule('search');
  }

  if (!user) {
    return (
      <>
        <LoginView
          onLoginSuccess={(loggedUser) => {
            setUser(loggedUser);
            pushToast('success', `Bienvenido de nuevo, ${loggedUser.name}`);
          }}
        />
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
      </>
    );
  }

  return (
    <>
      <Layout
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        user={user}
        companyName={settings?.company_name || 'HumanPro Enterprise S.A.'}
        onLogout={handleLogout}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        notifications={dashboard?.notifications || []}
        employees={employees}
        onQuickSelectEmployee={handleQuickInspectEmployee}
      >
        {activeModule === 'dashboard' && (
          <DashboardModule
            data={dashboard}
            loading={loading}
            onNavigate={setActiveModule}
            onInspectEmployee={handleQuickInspectEmployee}
          />
        )}

        {activeModule === 'employees' && (
          <EmployeesModule
            employees={employees}
            departments={departments}
            positions={positions}
            onRefresh={() => loadAllData()}
            onToast={pushToast}
          />
        )}

        {activeModule === 'departments' && (
          <DepartmentsModule
            departments={departments}
            onRefresh={() => loadAllData()}
            onToast={pushToast}
          />
        )}

        {activeModule === 'positions' && (
          <PositionsModule
            positions={positions}
            departments={departments}
            onRefresh={() => loadAllData()}
            onToast={pushToast}
          />
        )}

        {activeModule === 'attendance' && (
          <AttendanceModule
            attendance={attendance}
            employees={employees}
            departments={departments}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onRefresh={() => loadAllData()}
            onToast={pushToast}
          />
        )}

        {activeModule === 'incidents' && (
          <IncidentsModule
            incidents={incidents}
            employees={employees}
            onRefresh={() => loadAllData()}
            onToast={pushToast}
          />
        )}

        {activeModule === 'search' && (
          <EmployeeSearchModule
            employees={employees}
            departments={departments}
            positions={positions}
            initialSelectedEmployee={inspectEmployee}
            onClearInitialEmployee={() => setInspectEmployee(null)}
          />
        )}

        {activeModule === 'reports' && (
          <ReportsModule
            employees={employees}
            departments={departments}
            attendance={attendance}
            incidents={incidents}
            companyName={settings?.company_name || 'HumanPro Enterprise S.A.'}
            onToast={pushToast}
          />
        )}

        {activeModule === 'settings' && (
          <SettingsModule
            settings={settings}
            user={user}
            onSaved={() => loadAllData()}
            onToast={pushToast}
          />
        )}
      </Layout>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
}
