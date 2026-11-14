import React, { useEffect, useState } from 'react';
import { Building2, Clock, Database, Save, ShieldCheck } from 'lucide-react';
import { CompanySettings, UserSession } from '../types/hr';
import { apiFetch } from '../utils/api';
import { Button, inputClassName, labelClassName, selectClassName } from '../components/ui/Primitives';

export function SettingsModule({
  settings,
  user,
  onSaved,
  onToast,
}: {
  settings: CompanySettings | null;
  user: UserSession;
  onSaved: () => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [form, setForm] = useState<CompanySettings>({
    id: 1,
    company_name: 'HumanPro Enterprise S.A.',
    tax_id: 'NIT 900.482.190-4',
    industry: 'Tecnología y Servicios Corporativos',
    email: 'talento@humanpro.com',
    phone: '+57 601 555 0190',
    address: 'Av. Empresarial #100-45, Piso 12',
    workday_start: '08:00',
    workday_end: '17:30',
    late_tolerance_minutes: 15,
    currency: 'COP',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && settings.company_name) {
      setForm(settings);
    }
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      onToast('success', 'Configuración corporativa guardada en Neon PostgreSQL.');
      await onSaved();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Error al guardar configuración.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
          Configuración del sistema
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Parámetros institucionales, jornada laboral y cuenta administrativa.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Data */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
            <Building2 className="w-5 h-5 text-[#2563EB]" />
            <h2 className="font-display font-semibold text-base text-[#0F172A]">
              Identidad corporativa
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>Razón social</label>
              <input
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Identificación tributaria (NIT / RUC)</label>
              <input
                value={form.tax_id}
                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                className={`${inputClassName} font-mono-tabular`}
              />
            </div>
            <div>
              <label className={labelClassName}>Sector / Industria</label>
              <input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Correo institucional</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Teléfono corporativo</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Dirección sede principal</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputClassName}
              />
            </div>
          </div>
        </section>

        {/* Attendance & Payroll Rules */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
            <Clock className="w-5 h-5 text-[#2563EB]" />
            <h2 className="font-display font-semibold text-base text-[#0F172A]">
              Parámetros de jornada y compensación
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClassName}>Hora de entrada</label>
              <input
                type="time"
                value={form.workday_start}
                onChange={(e) => setForm({ ...form, workday_start: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Hora de salida</label>
              <input
                type="time"
                value={form.workday_end}
                onChange={(e) => setForm({ ...form, workday_end: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Tolerancia retardo (min)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={form.late_tolerance_minutes}
                onChange={(e) =>
                  setForm({ ...form, late_tolerance_minutes: Number(e.target.value) })
                }
                className={`${inputClassName} font-mono-tabular`}
              />
            </div>
            <div>
              <label className={labelClassName}>Moneda de nómina</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={selectClassName}
              >
                <option value="COP">COP (Peso Colombiano)</option>
                <option value="USD">USD (Dólar Estadounidense)</option>
                <option value="MXN">MXN (Peso Mexicano)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Guardando cambios...' : 'Guardar configuración'}
            </Button>
          </div>
        </section>
      </form>

      {/* Admin Account & Neon Persistence Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#0F172A] font-display font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
            <span>Perfil de administrador activo</span>
          </div>
          <div className="text-xs text-[#475569] space-y-1">
            <p>
              Nombre: <strong className="text-[#0F172A]">{user.name}</strong>
            </p>
            <p>
              Correo: <strong className="text-[#0F172A]">{user.email}</strong>
            </p>
            <p>
              Rol asignado: <strong className="text-[#0F172A]">{user.role}</strong>
            </p>
          </div>
        </section>

        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#0F172A] font-display font-semibold text-sm">
            <Database className="w-4 h-4 text-[#16A34A]" />
            <span>Persistencia en la nube</span>
          </div>
          <p className="text-xs text-[#475569] leading-relaxed">
            Todos los módulos de HumanPro (empleados, departamentos, cargos, asistencia, novedades laborales y bitácora) se almacenan de forma transaccional en <strong>Neon PostgreSQL</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
