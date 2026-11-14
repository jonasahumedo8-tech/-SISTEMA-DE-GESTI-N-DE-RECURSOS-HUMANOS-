import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    '⚠️ DATABASE_URL no está definido. Asegúrate de configurar DATABASE_URL en .env o en las variables de entorno.'
  );
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('sslmode=require') || connectionString?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`humanpro_salt_${password}`).digest('hex');
}

function formatDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function logActivity(
  actorName: string,
  action: string,
  module: string,
  detail: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO hp_activity_logs (actor_name, action, module, detail) VALUES ($1, $2, $3, $4)`,
      [actorName, action, module, detail]
    );
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS hp_users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Administrador',
        avatar_initials TEXT NOT NULL DEFAULT 'CM',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hp_company_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        company_name TEXT NOT NULL DEFAULT 'HumanPro Enterprise S.A.',
        tax_id TEXT NOT NULL DEFAULT 'NIT 900.482.190-4',
        industry TEXT NOT NULL DEFAULT 'Tecnología y Servicios Corporativos',
        email TEXT NOT NULL DEFAULT 'talento@humanpro.com',
        phone TEXT NOT NULL DEFAULT '+57 601 555 0190',
        address TEXT NOT NULL DEFAULT 'Av. Empresarial #100-45, Piso 12',
        workday_start TEXT NOT NULL DEFAULT '08:00',
        workday_end TEXT NOT NULL DEFAULT '17:30',
        late_tolerance_minutes INTEGER NOT NULL DEFAULT 15,
        currency TEXT NOT NULL DEFAULT 'COP',
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hp_departments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        manager_name TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Activo',
        created_at DATE NOT NULL DEFAULT CURRENT_DATE
      );

      CREATE TABLE IF NOT EXISTS hp_positions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        department_id INTEGER REFERENCES hp_departments(id) ON DELETE SET NULL,
        description TEXT NOT NULL DEFAULT '',
        hierarchy_level TEXT NOT NULL DEFAULT 'Especialista',
        status TEXT NOT NULL DEFAULT 'Activo',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hp_employees (
        id SERIAL PRIMARY KEY,
        employee_code TEXT UNIQUE NOT NULL,
        document_type TEXT NOT NULL DEFAULT 'CC',
        document_number TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date DATE,
        gender TEXT NOT NULL DEFAULT 'Prefiero no decir',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT UNIQUE NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        photo_url TEXT,
        department_id INTEGER REFERENCES hp_departments(id) ON DELETE SET NULL,
        position_id INTEGER REFERENCES hp_positions(id) ON DELETE SET NULL,
        hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
        contract_type TEXT NOT NULL DEFAULT 'Término Indefinido',
        salary NUMERIC(14,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Activo',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hp_attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES hp_employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        check_in TEXT,
        check_out TEXT,
        status TEXT NOT NULL DEFAULT 'Presente',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (employee_id, date)
      );

      CREATE TABLE IF NOT EXISTS hp_incidents (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES hp_employees(id) ON DELETE CASCADE,
        incident_type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        description TEXT NOT NULL,
        observations TEXT NOT NULL DEFAULT '',
        support_document TEXT NOT NULL DEFAULT '',
        approval_status TEXT NOT NULL DEFAULT 'Pendiente',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hp_activity_logs (
        id SERIAL PRIMARY KEY,
        actor_name TEXT NOT NULL,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure default admin user exists
    const userCountRes = await client.query(`SELECT COUNT(*)::int AS count FROM hp_users`);
    if (userCountRes.rows[0].count === 0) {
      await client.query(
        `INSERT INTO hp_users (name, email, password_hash, role, avatar_initials)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Carlos Mendoza', 'admin@humanpro.com', hashPassword('HumanPro2026!'), 'Administrador', 'CM']
      );
    }

    // Ensure default company settings exist
    const settingsRes = await client.query(`SELECT COUNT(*)::int AS count FROM hp_company_settings`);
    if (settingsRes.rows[0].count === 0) {
      await client.query(`INSERT INTO hp_company_settings (id) VALUES (1)`);
    }

    // Seed enterprise HR data if departments are empty
    const deptCountRes = await client.query(`SELECT COUNT(*)::int AS count FROM hp_departments`);
    if (deptCountRes.rows[0].count === 0) {
      const departmentsData = [
        ['Tecnología e Ingeniería', 'Desarrollo de software, arquitectura cloud, ciberseguridad e infraestructura.', 'Laura Valentina Gómez', 'Activo', '2022-03-15'],
        ['Talento Humano', 'Atracción de talento, nómina, bienestar laboral y desarrollo organizacional.', 'Carlos Andrés Mendoza', 'Activo', '2021-11-02'],
        ['Finanzas y Contabilidad', 'Tesorería, planeación financiera, auditoría interna y cumplimiento tributario.', 'Sofía Ramírez Castro', 'Activo', '2021-11-02'],
        ['Comercial y Ventas', 'Expansión B2B, cuentas corporativas, alianzas estratégicas y postventa.', 'Mateo Aristizábal', 'Activo', '2022-06-10'],
        ['Operaciones y Logística', 'Gestión de procesos operativos, calidad, compras y cadena de suministro.', 'Andrés Felipe Duarte', 'Activo', '2023-01-20'],
        ['Marketing Corporativo', 'Posicionamiento de marca, comunicación interna, campañas digitales y eventos.', 'Camila Herrera Díaz', 'Activo', '2023-08-05'],
      ];

      const deptIds: Record<string, number> = {};
      for (const [name, description, manager, status, created] of departmentsData) {
        const res = await client.query(
          `INSERT INTO hp_departments (name, description, manager_name, status, created_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [name, description, manager, status, created]
        );
        deptIds[name] = res.rows[0].id;
      }

      const positionsData = [
        ['Director de Ingeniería', 'Tecnología e Ingeniería', 'Liderazgo técnico de plataformas SaaS y equipos multidisciplinarios.', 'Directivo', 'Activo'],
        ['Arquitecto Cloud Senior', 'Tecnología e Ingeniería', 'Diseño de infraestructura distribuida en la nube y seguridad.', 'Especialista', 'Activo'],
        ['Desarrollador Full Stack', 'Tecnología e Ingeniería', 'Implementación de servicios backend y aplicaciones web.', 'Especialista', 'Activo'],
        ['Analista QA Automatización', 'Tecnología e Ingeniería', 'Aseguramiento de calidad y pruebas continuas.', 'Analista', 'Activo'],
        ['Gerente de Talento Humano', 'Talento Humano', 'Dirección estratégica de cultura, compensación y bienestar.', 'Gerencial', 'Activo'],
        ['Especialista de Nómina', 'Talento Humano', 'Liquidación de nómina, seguridad social y novedades laborales.', 'Especialista', 'Activo'],
        ['Directora Financiera', 'Finanzas y Contabilidad', 'Planeación financiera estratégica y control presupuestal.', 'Directivo', 'Activo'],
        ['Contador General', 'Finanzas y Contabilidad', 'Cierre contable mensual, impuestos y reportes NIIF.', 'Especialista', 'Activo'],
        ['Ejecutivo de Cuentas Corporativas', 'Comercial y Ventas', 'Prospección B2B y fidelización de clientes enterprise.', 'Especialista', 'Activo'],
        ['Coordinador de Operaciones', 'Operaciones y Logística', 'Optimización operativa, indicadores SLA y proveedores.', 'Coordinación', 'Activo'],
        ['Analista de Operaciones', 'Operaciones y Logística', 'Seguimiento diario de flujos operativos y documentación.', 'Analista', 'Activo'],
        ['Líder de Marca y Contenido', 'Marketing Corporativo', 'Estrategia de comunicación corporativa y generación de demanda.', 'Coordinación', 'Activo'],
      ];

      const posIds: Record<string, number> = {};
      for (const [name, deptName, description, level, status] of positionsData) {
        const res = await client.query(
          `INSERT INTO hp_positions (name, department_id, description, hierarchy_level, status)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [name, deptIds[deptName], description, level, status]
        );
        posIds[name] = res.rows[0].id;
      }

      const employeesData = [
        ['EMP-001', 'CC', '1020784512', 'Laura Valentina', 'Gómez Pineda', '1990-05-14', 'Femenino', '+57 310 458 9210', 'laura.gomez@humanpro.com', 'Calle 93 #14-20, Bogotá', 'Tecnología e Ingeniería', 'Director de Ingeniería', '2022-03-15', 'Término Indefinido', 11500000, 'Activo'],
        ['EMP-002', 'CC', '1018442901', 'Alejandro', 'Vargas Restrepo', '1992-09-22', 'Masculino', '+57 315 229 4418', 'alejandro.vargas@humanpro.com', 'Cra 15 #82-45, Bogotá', 'Tecnología e Ingeniería', 'Arquitecto Cloud Senior', '2022-05-02', 'Término Indefinido', 9200000, 'Activo'],
        ['EMP-003', 'CC', '1032490118', 'Daniela', 'Morales Peña', '1995-11-08', 'Femenino', '+57 301 774 2033', 'daniela.morales@humanpro.com', 'Av. El Poblado #12-30, Medellín', 'Tecnología e Ingeniería', 'Desarrollador Full Stack', '2023-02-13', 'Término Indefinido', 6800000, 'Activo'],
        ['EMP-004', 'CC', '1098651204', 'Julián Esteban', 'Rojas Nieto', '1996-01-30', 'Masculino', '+57 318 602 1190', 'julian.rojas@humanpro.com', 'Calle 45 #22-18, Bucaramanga', 'Tecnología e Ingeniería', 'Analista QA Automatización', '2024-01-15', 'Término Fijo', 4900000, 'Activo'],
        ['EMP-005', 'CC', '52890341', 'Sofía', 'Ramírez Castro', '1988-07-19', 'Femenino', '+57 311 890 3412', 'sofia.ramirez@humanpro.com', 'Cra 7 #116-50, Bogotá', 'Finanzas y Contabilidad', 'Directora Financiera', '2021-11-08', 'Término Indefinido', 12200000, 'Activo'],
        ['EMP-006', 'CC', '1014239087', 'Sebastián', 'Cárdenas Mejía', '1991-03-11', 'Masculino', '+57 320 441 7820', 'sebastian.cardenas@humanpro.com', 'Calle 64 #9-31, Bogotá', 'Finanzas y Contabilidad', 'Contador General', '2022-09-01', 'Término Indefinido', 6400000, 'Activo'],
        ['EMP-007', 'CC', '1026558120', 'Valentina', 'Ospina Quintero', '1994-12-03', 'Femenino', '+57 300 512 9084', 'valentina.ospina@humanpro.com', 'Av. Roosevelt #38-12, Cali', 'Talento Humano', 'Especialista de Nómina', '2023-04-10', 'Término Indefinido', 5300000, 'Activo'],
        ['EMP-008', 'CC', '79912456', 'Mateo', 'Aristizábal Uribe', '1989-08-27', 'Masculino', '+57 312 904 5511', 'mateo.aristizabal@humanpro.com', 'Calle 10 #43-15, Medellín', 'Comercial y Ventas', 'Ejecutivo de Cuentas Corporativas', '2022-06-15', 'Término Indefinido', 7100000, 'Activo'],
        ['EMP-009', 'CE', '45891023', 'Lucía Fernanda', 'Navarro Silva', '1993-04-17', 'Femenino', '+57 316 334 8921', 'lucia.navarro@humanpro.com', 'Cra 52 #76-20, Barranquilla', 'Comercial y Ventas', 'Ejecutivo de Cuentas Corporativas', '2024-03-04', 'Término Fijo', 5800000, 'Vacaciones'],
        ['EMP-010', 'CC', '1030612945', 'Andrés Felipe', 'Duarte Salazar', '1991-10-05', 'Masculino', '+57 314 780 1245', 'andres.duarte@humanpro.com', 'Calle 127 #53-10, Bogotá', 'Operaciones y Logística', 'Coordinador de Operaciones', '2023-01-23', 'Término Indefinido', 6200000, 'Activo'],
        ['EMP-011', 'CC', '1019087432', 'Paula Andrea', 'Jiménez León', '1997-06-21', 'Femenino', '+57 321 990 6732', 'paula.jimenez@humanpro.com', 'Diag 53 #24-12, Bogotá', 'Operaciones y Logística', 'Analista de Operaciones', '2024-07-01', 'Término Fijo', 3950000, 'Activo'],
        ['EMP-012', 'CC', '1022384910', 'Camila', 'Herrera Díaz', '1993-02-14', 'Femenino', '+57 317 553 2019', 'camila.herrera@humanpro.com', 'Calle 85 #11-40, Bogotá', 'Marketing Corporativo', 'Líder de Marca y Contenido', '2023-08-14', 'Término Indefinido', 6700000, 'Licencia'],
        ['EMP-013', 'CC', '1075290441', 'Nicolás', 'Becerra Torres', '1998-09-09', 'Masculino', '+57 304 811 2390', 'nicolas.becerra@humanpro.com', 'Calle 26 #68-35, Bogotá', 'Tecnología e Ingeniería', 'Desarrollador Full Stack', '2025-02-03', 'Prestación de Servicios', 6100000, 'Activo'],
        ['EMP-014', 'CC', '80194520', 'Ricardo', 'Salgado Vera', '1987-12-12', 'Masculino', '+57 313 402 9981', 'ricardo.salgado@humanpro.com', 'Cra 9 #72-80, Bogotá', 'Operaciones y Logística', 'Analista de Operaciones', '2021-08-19', 'Término Indefinido', 4100000, 'Inactivo'],
      ];

      const empIds: Record<string, number> = {};
      for (const row of employeesData) {
        const [
          code, docType, docNum, first, last, birth, gender, phone, email, address,
          deptName, posName, hireDate, contract, salary, status,
        ] = row;
        const res = await client.query(
          `INSERT INTO hp_employees (
            employee_code, document_type, document_number, first_name, last_name,
            birth_date, gender, phone, email, address, department_id, position_id,
            hire_date, contract_type, salary, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
          [
            code, docType, docNum, first, last, birth, gender, phone, email, address,
            deptIds[deptName as string], posIds[posName as string], hireDate, contract, salary, status,
          ]
        );
        empIds[code as string] = res.rows[0].id;
      }

      // Seed 7 days of attendance records (from -6 days to today)
      const activeCodes = [
        'EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006',
        'EMP-007', 'EMP-008', 'EMP-010', 'EMP-011', 'EMP-013',
      ];
      for (let dayOffset = -6; dayOffset <= 0; dayOffset++) {
        const dateStr = formatDateOffset(dayOffset);
        for (let i = 0; i < activeCodes.length; i++) {
          const code = activeCodes[i];
          const empId = empIds[code];
          let status = 'Presente';
          let checkIn: string | null = '07:55';
          let checkOut: string | null = dayOffset === 0 ? null : '17:32';
          let notes = 'Jornada regular';

          if ((i + Math.abs(dayOffset)) % 7 === 3) {
            status = 'Retardo';
            checkIn = '08:26';
            notes = 'Ingreso posterior a la tolerancia de 15 min';
          } else if (dayOffset !== 0 && (i + Math.abs(dayOffset)) % 11 === 5) {
            status = 'Permiso';
            checkIn = null;
            checkOut = null;
            notes = 'Cita médica autorizada';
          } else if (dayOffset === 0 && code === 'EMP-011') {
            status = 'Ausente';
            checkIn = null;
            checkOut = null;
            notes = 'Sin registro de ingreso hasta el corte';
          } else if (dayOffset === 0 && code === 'EMP-004') {
            status = 'Retardo';
            checkIn = '08:22';
            notes = 'Tráfico en corredor vial';
          } else if (dayOffset === 0 && code === 'EMP-006') {
            status = 'Permiso';
            checkIn = null;
            checkOut = null;
            notes = 'Diligencia notarial programada';
          }

          await client.query(
            `INSERT INTO hp_attendance (employee_id, date, check_in, check_out, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (employee_id, date) DO NOTHING`,
            [empId, dateStr, checkIn, checkOut, status, notes]
          );
        }
      }

      // Seed realistic labor incidents
      const incidentsData = [
        ['EMP-009', 'Vacaciones', formatDateOffset(-3), formatDateOffset(11), 'Periodo anual de vacaciones remuneradas', 'Aprobado por gerencia comercial', 'SOL-VAC-2026-019.pdf', 'Aprobada'],
        ['EMP-012', 'Licencia', formatDateOffset(-10), formatDateOffset(18), 'Licencia de maternidad reglamentaria', 'Soporte EPS radicado en nómina', 'LIC-EPS-8821.pdf', 'Aprobada'],
        ['EMP-006', 'Permiso', formatDateOffset(0), formatDateOffset(0), 'Permiso personal por diligencia notarial (medio día)', 'Repone horas el viernes', 'PERM-041.pdf', 'Pendiente'],
        ['EMP-004', 'Incapacidad', formatDateOffset(-2), formatDateOffset(-1), 'Incapacidad médica general por cuadro viral (2 días)', 'Transcripción EPS pendiente de validación', 'INC-90342.pdf', 'Pendiente'],
        ['EMP-011', 'Ausencia', formatDateOffset(0), formatDateOffset(0), 'Ausencia no reportada previamente en turno mañana', 'Talento Humano en seguimiento telefónico', '', 'Pendiente'],
        ['EMP-003', 'Calamidad', formatDateOffset(-8), formatDateOffset(-6), 'Calamidad doméstica familiar debidamente justificada', 'Documentación verificada', 'CAL-012.pdf', 'Aprobada'],
        ['EMP-008', 'Otras novedades', formatDateOffset(2), formatDateOffset(4), 'Viaje de comisión comercial a feria empresarial', 'Viáticos aprobados por Dirección', 'COM-2026-07.pdf', 'Pendiente'],
        ['EMP-010', 'Permiso', formatDateOffset(-5), formatDateOffset(-5), 'Solicitud de permiso para jornada académica', 'Rechazada por cierre operativo mensual', '', 'Rechazada'],
      ];

      for (const inc of incidentsData) {
        const [code, type, start, end, desc, obs, doc, approval] = inc;
        await client.query(
          `INSERT INTO hp_incidents (
            employee_id, incident_type, start_date, end_date, description, observations, support_document, approval_status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [empIds[code as string], type, start, end, desc, obs, doc, approval]
        );
      }

      // Seed initial activity logs
      const logsData = [
        ['Carlos Mendoza', 'Registro de empleado', 'Empleados', 'Se vinculó a Nicolás Becerra Torres (EMP-013) en Tecnología e Ingeniería'],
        ['Valentina Ospina', 'Aprobación de novedad', 'Novedades laborales', 'Se aprobó solicitud de vacaciones para Lucía Fernanda Navarro'],
        ['Carlos Mendoza', 'Cierre de asistencia', 'Asistencia', 'Consolidación semanal de registros biométricos de ingreso y salida'],
        ['Sofía Ramírez', 'Actualización organizacional', 'Departamentos', 'Revisión presupuestal del departamento Finanzas y Contabilidad'],
      ];
      for (const [actor, action, mod, detail] of logsData) {
        await client.query(
          `INSERT INTO hp_activity_logs (actor_name, action, module, detail) VALUES ($1, $2, $3, $4)`,
          [actor, action, mod, detail]
        );
      }
    }

    console.log('✅ Base de datos Neon PostgreSQL inicializada correctamente para HumanPro');
  } finally {
    client.release();
  }
}
