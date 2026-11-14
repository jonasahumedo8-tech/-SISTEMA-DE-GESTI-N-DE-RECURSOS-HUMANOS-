import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { hashPassword, initDatabase, logActivity, pool } from './server/db.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// Helper to get actor name from header
function getActor(req: Request): string {
  const actor = req.headers['x-actor-name'];
  return typeof actor === 'string' && actor.trim() ? actor.trim() : 'Carlos Mendoza';
}

// ======================= AUTH ROUTES =======================
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Ingresa tu correo electrónico y contraseña.' });
      return;
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, avatar_initials FROM hp_users WHERE LOWER(email) = LOWER($1)`,
      [String(email).trim()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
      return;
    }

    const user = result.rows[0];
    if (user.password_hash !== hashPassword(String(password))) {
      res.status(401).json({ error: 'Contraseña incorrecta. Inténtalo nuevamente.' });
      return;
    }

    await logActivity(user.name, 'Inicio de sesión', 'Autenticación', `Acceso autorizado a la plataforma HumanPro (${user.email})`);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_initials: user.avatar_initials,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error de conexión al validar credenciales.' });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body ?? {};
    if (!name?.trim() || !email?.trim() || !password) {
      res.status(400).json({ error: 'Completa nombre, correo electrónico y contraseña.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    const parts = String(name).trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : String(name).trim().slice(0, 2).toUpperCase();

    const result = await pool.query(
      `INSERT INTO hp_users (name, email, password_hash, role, avatar_initials)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, avatar_initials`,
      [
        String(name).trim(),
        String(email).trim().toLowerCase(),
        hashPassword(String(password)),
        role?.trim() || 'Administrador',
        initials || 'HP',
      ]
    );

    const newUser = result.rows[0];
    await logActivity(
      newUser.name,
      'Registro de usuario',
      'Autenticación',
      `Nueva cuenta creada en HumanPro (${newUser.email})`
    );

    res.status(201).json({ user: newUser });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === '23505') {
      res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'No se pudo completar el registro.' });
  }
});

app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { name, email, uid } = req.body ?? {};
    if (!email || !uid) {
      res.status(400).json({ error: 'Datos de autenticación de Google incompletos.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name || cleanEmail.split('@')[0]).trim();
    const parts = cleanName.split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : cleanName.slice(0, 2).toUpperCase();

    const existing = await pool.query(
      `SELECT id, name, email, role, avatar_initials FROM hp_users WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO hp_users (name, email, password_hash, role, avatar_initials)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, avatar_initials`,
        [cleanName, cleanEmail, hashPassword(`google_oauth_${uid}`), 'Administrador', initials || 'GO']
      );
      user = inserted.rows[0];
    }

    await logActivity(
      user.name,
      'Inicio de sesión con Google',
      'Autenticación',
      `Acceso autorizado mediante Google (${user.email})`
    );

    res.json({ user });
  } catch (error) {
    console.error('Google auth sync error:', error);
    res.status(500).json({ error: 'Error al vincular la cuenta de Google con HumanPro.' });
  }
});

app.post('/api/auth/recover', async (req: Request, res: Response) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
      return;
    }
    const result = await pool.query(`SELECT name, email FROM hp_users WHERE LOWER(email) = LOWER($1)`, [
      String(email).trim(),
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No existe una cuenta administrativa asociada a ese correo.' });
      return;
    }
    res.json({
      message: `Se han enviado las instrucciones de restablecimiento a ${result.rows[0].email}.`,
    });
  } catch (error) {
    console.error('Recover error:', error);
    res.status(500).json({ error: 'No se pudo procesar la solicitud de recuperación.' });
  }
});

// ======================= DASHBOARD ROUTE =======================
app.get('/api/dashboard', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const selectedDate =
      typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : today;

    const [
      empCountsRes,
      todayAttendanceRes,
      pendingIncidentsRes,
      deptDistRes,
      statusDistRes,
      incidentsSummaryRes,
      weeklyAttendanceRes,
      recentEmployeesRes,
      recentAttendanceRes,
      recentIncidentsRes,
      activityLogsRes,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Activo')::int AS active,
          COUNT(*) FILTER (WHERE status = 'Inactivo')::int AS inactive
        FROM hp_employees
      `),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM hp_attendance WHERE date = $1 AND status IN ('Presente', 'Retardo')`,
        [selectedDate]
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM hp_incidents WHERE approval_status = 'Pendiente'`),
      pool.query(`
        SELECT d.name, COUNT(e.id)::int AS count
        FROM hp_departments d
        LEFT JOIN hp_employees e ON e.department_id = d.id
        GROUP BY d.id, d.name
        ORDER BY count DESC, d.name ASC
      `),
      pool.query(`
        SELECT status, COUNT(*)::int AS count
        FROM hp_employees
        GROUP BY status
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT
          incident_type AS type,
          COUNT(*)::int AS count,
          COUNT(*) FILTER (WHERE approval_status = 'Pendiente')::int AS pending,
          COUNT(*) FILTER (WHERE approval_status = 'Aprobada')::int AS approved
        FROM hp_incidents
        GROUP BY incident_type
        ORDER BY count DESC
      `),
      pool.query(
        `
        WITH days AS (
          SELECT generate_series($1::date - interval '6 days', $1::date, interval '1 day')::date AS day
        )
        SELECT
          TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
          COUNT(a.id) FILTER (WHERE a.status = 'Presente')::int AS "Presente",
          COUNT(a.id) FILTER (WHERE a.status = 'Retardo')::int AS "Retardo",
          COUNT(a.id) FILTER (WHERE a.status = 'Ausente')::int AS "Ausente",
          COUNT(a.id) FILTER (WHERE a.status = 'Permiso')::int AS "Permiso"
        FROM days d
        LEFT JOIN hp_attendance a ON a.date = d.day
        GROUP BY d.day
        ORDER BY d.day ASC
      `,
        [selectedDate]
      ),
      pool.query(`
        SELECT
          e.id, e.employee_code, e.document_type, e.document_number, e.first_name, e.last_name,
          TO_CHAR(e.birth_date, 'YYYY-MM-DD') AS birth_date,
          e.gender, e.phone, e.email, e.address, e.photo_url, e.department_id, e.position_id,
          TO_CHAR(e.hire_date, 'YYYY-MM-DD') AS hire_date,
          e.contract_type, e.salary::float, e.status,
          d.name AS department_name, p.name AS position_name
        FROM hp_employees e
        LEFT JOIN hp_departments d ON d.id = e.department_id
        LEFT JOIN hp_positions p ON p.id = e.position_id
        ORDER BY e.created_at DESC, e.id DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          a.id, a.employee_id, TO_CHAR(a.date, 'YYYY-MM-DD') AS date,
          a.check_in, a.check_out, a.status, a.notes,
          CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
          e.employee_code, e.document_number, d.name AS department_name
        FROM hp_attendance a
        JOIN hp_employees e ON e.id = a.employee_id
        LEFT JOIN hp_departments d ON d.id = e.department_id
        ORDER BY a.date DESC, a.id DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          i.id, i.employee_id, i.incident_type,
          TO_CHAR(i.start_date, 'YYYY-MM-DD') AS start_date,
          TO_CHAR(i.end_date, 'YYYY-MM-DD') AS end_date,
          i.description, i.observations, i.support_document, i.approval_status,
          TO_CHAR(i.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
          CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
          e.employee_code, d.name AS department_name
        FROM hp_incidents i
        JOIN hp_employees e ON e.id = i.employee_id
        LEFT JOIN hp_departments d ON d.id = e.department_id
        ORDER BY i.created_at DESC, i.id DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT id, actor_name, action, module, detail,
          TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
        FROM hp_activity_logs
        ORDER BY id DESC
        LIMIT 6
      `),
    ]);

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weeklyAttendance = weeklyAttendanceRes.rows.map((row) => {
      const [y, m, d] = String(row.date).split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return {
        ...row,
        label: `${dayNames[dt.getUTCDay()]} ${d}`,
      };
    });

    const empCounts = empCountsRes.rows[0];
    const todayAttendance = todayAttendanceRes.rows[0].count;
    const pendingIncidents = pendingIncidentsRes.rows[0].count;
    const attendanceRate =
      empCounts.active > 0 ? Math.round((todayAttendance / empCounts.active) * 100) : 0;

    // Build live actionable notifications
    const notifications = [];
    if (pendingIncidents > 0) {
      notifications.push({
        id: 'notif-incidents',
        title: `${pendingIncidents} novedades laborales pendientes`,
        description: 'Requieren revisión y aprobación en el módulo de novedades.',
        type: 'warning' as const,
        module: 'incidents' as const,
      });
    }
    const absentToday = weeklyAttendance[weeklyAttendance.length - 1]?.Ausente ?? 0;
    if (absentToday > 0) {
      notifications.push({
        id: 'notif-absent',
        title: `${absentToday} ausencia(s) registrada(s) el ${selectedDate}`,
        description: 'Verifica el seguimiento en Control de asistencia.',
        type: 'alert' as const,
        module: 'attendance' as const,
      });
    }
    notifications.push({
      id: 'notif-db',
      title: 'Sincronización Neon PostgreSQL activa',
      description: `${empCounts.total} colaboradores respaldados en la nube.`,
      type: 'info' as const,
      module: 'settings' as const,
    });

    res.json({
      selectedDate,
      kpis: {
        totalEmployees: empCounts.total,
        activeEmployees: empCounts.active,
        inactiveEmployees: empCounts.inactive,
        todayAttendance,
        pendingIncidents,
        attendanceRate,
      },
      charts: {
        employeesByDepartment: deptDistRes.rows,
        weeklyAttendance,
        statusDistribution: statusDistRes.rows,
        incidentsSummary: incidentsSummaryRes.rows,
      },
      recent: {
        employees: recentEmployeesRes.rows,
        attendance: recentAttendanceRes.rows,
        incidents: recentIncidentsRes.rows,
        activityLogs: activityLogsRes.rows,
      },
      notifications,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Error al cargar los indicadores del dashboard.' });
  }
});

// ======================= DEPARTMENTS ROUTES =======================
app.get('/api/departments', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        d.id, d.name, d.description, d.manager_name, d.status,
        TO_CHAR(d.created_at, 'YYYY-MM-DD') AS created_at,
        COUNT(e.id)::int AS employee_count
      FROM hp_departments d
      LEFT JOIN hp_employees e ON e.department_id = d.id
      GROUP BY d.id
      ORDER BY d.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('GET departments error:', error);
    res.status(500).json({ error: 'Error al consultar departamentos.' });
  }
});

app.post('/api/departments', async (req: Request, res: Response) => {
  try {
    const { name, description, manager_name, status } = req.body ?? {};
    if (!name?.trim()) {
      res.status(400).json({ error: 'El nombre del departamento es obligatorio.' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO hp_departments (name, description, manager_name, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, manager_name, status, TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at`,
      [name.trim(), description?.trim() ?? '', manager_name?.trim() ?? '', status || 'Activo']
    );
    await logActivity(getActor(req), 'Creación de departamento', 'Departamentos', `Se creó el departamento "${name.trim()}"`);
    res.status(201).json({ ...result.rows[0], employee_count: 0 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === '23505') {
      res.status(409).json({ error: 'Ya existe un departamento con ese nombre.' });
      return;
    }
    res.status(500).json({ error: 'Error al crear departamento.' });
  }
});

app.put('/api/departments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, manager_name, status } = req.body ?? {};
    if (!name?.trim()) {
      res.status(400).json({ error: 'El nombre del departamento es obligatorio.' });
      return;
    }
    const result = await pool.query(
      `UPDATE hp_departments
       SET name = $1, description = $2, manager_name = $3, status = $4
       WHERE id = $5
       RETURNING id, name, description, manager_name, status, TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at`,
      [name.trim(), description?.trim() ?? '', manager_name?.trim() ?? '', status || 'Activo', id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Departamento no encontrado.' });
      return;
    }
    await logActivity(getActor(req), 'Edición de departamento', 'Departamentos', `Se actualizó el departamento "${name.trim()}"`);
    res.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === '23505') {
      res.status(409).json({ error: 'Ya existe otro departamento con ese nombre.' });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar departamento.' });
  }
});

app.delete('/api/departments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM hp_departments WHERE id = $1 RETURNING name`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Departamento no encontrado.' });
      return;
    }
    await logActivity(getActor(req), 'Eliminación de departamento', 'Departamentos', `Se eliminó el departamento "${result.rows[0].name}"`);
    res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE department error:', error);
    res.status(500).json({ error: 'Error al eliminar departamento.' });
  }
});

// ======================= POSITIONS (CARGOS) ROUTES =======================
app.get('/api/positions', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id, p.name, p.department_id, d.name AS department_name,
        p.description, p.hierarchy_level, p.status,
        COUNT(e.id)::int AS employee_count
      FROM hp_positions p
      LEFT JOIN hp_departments d ON d.id = p.department_id
      LEFT JOIN hp_employees e ON e.position_id = p.id
      GROUP BY p.id, d.name
      ORDER BY p.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('GET positions error:', error);
    res.status(500).json({ error: 'Error al consultar cargos.' });
  }
});

app.post('/api/positions', async (req: Request, res: Response) => {
  try {
    const { name, department_id, description, hierarchy_level, status } = req.body ?? {};
    if (!name?.trim()) {
      res.status(400).json({ error: 'El nombre del cargo es obligatorio.' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO hp_positions (name, department_id, description, hierarchy_level, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, department_id, description, hierarchy_level, status`,
      [name.trim(), department_id || null, description?.trim() ?? '', hierarchy_level || 'Especialista', status || 'Activo']
    );
    await logActivity(getActor(req), 'Creación de cargo', 'Cargos', `Se creó el cargo "${name.trim()}"`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('POST position error:', error);
    res.status(500).json({ error: 'Error al crear cargo.' });
  }
});

app.put('/api/positions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, department_id, description, hierarchy_level, status } = req.body ?? {};
    if (!name?.trim()) {
      res.status(400).json({ error: 'El nombre del cargo es obligatorio.' });
      return;
    }
    const result = await pool.query(
      `UPDATE hp_positions
       SET name = $1, department_id = $2, description = $3, hierarchy_level = $4, status = $5
       WHERE id = $6
       RETURNING id, name, department_id, description, hierarchy_level, status`,
      [name.trim(), department_id || null, description?.trim() ?? '', hierarchy_level || 'Especialista', status || 'Activo', id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cargo no encontrado.' });
      return;
    }
    await logActivity(getActor(req), 'Edición de cargo', 'Cargos', `Se actualizó el cargo "${name.trim()}"`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('PUT position error:', error);
    res.status(500).json({ error: 'Error al actualizar cargo.' });
  }
});

app.delete('/api/positions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM hp_positions WHERE id = $1 RETURNING name`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cargo no encontrado.' });
      return;
    }
    await logActivity(getActor(req), 'Eliminación de cargo', 'Cargos', `Se eliminó el cargo "${result.rows[0].name}"`);
    res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE position error:', error);
    res.status(500).json({ error: 'Error al eliminar cargo.' });
  }
});

// ======================= EMPLOYEES ROUTES =======================
app.get('/api/employees', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id, e.employee_code, e.document_type, e.document_number,
        e.first_name, e.last_name,
        TO_CHAR(e.birth_date, 'YYYY-MM-DD') AS birth_date,
        e.gender, e.phone, e.email, e.address, e.photo_url,
        e.department_id, d.name AS department_name,
        e.position_id, p.name AS position_name,
        TO_CHAR(e.hire_date, 'YYYY-MM-DD') AS hire_date,
        e.contract_type, e.salary::float, e.status
      FROM hp_employees e
      LEFT JOIN hp_departments d ON d.id = e.department_id
      LEFT JOIN hp_positions p ON p.id = e.position_id
      ORDER BY e.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('GET employees error:', error);
    res.status(500).json({ error: 'Error al consultar empleados.' });
  }
});

app.get('/api/employees/:id/profile', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [empRes, attRes, incRes] = await Promise.all([
      pool.query(
        `SELECT
          e.id, e.employee_code, e.document_type, e.document_number,
          e.first_name, e.last_name,
          TO_CHAR(e.birth_date, 'YYYY-MM-DD') AS birth_date,
          e.gender, e.phone, e.email, e.address, e.photo_url,
          e.department_id, d.name AS department_name,
          e.position_id, p.name AS position_name,
          TO_CHAR(e.hire_date, 'YYYY-MM-DD') AS hire_date,
          e.contract_type, e.salary::float, e.status
        FROM hp_employees e
        LEFT JOIN hp_departments d ON d.id = e.department_id
        LEFT JOIN hp_positions p ON p.id = e.position_id
        WHERE e.id = $1`,
        [id]
      ),
      pool.query(
        `SELECT id, employee_id, TO_CHAR(date, 'YYYY-MM-DD') AS date, check_in, check_out, status, notes
         FROM hp_attendance WHERE employee_id = $1 ORDER BY date DESC LIMIT 20`,
        [id]
      ),
      pool.query(
        `SELECT id, employee_id, incident_type,
          TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
          TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
          description, observations, support_document, approval_status,
          TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at
         FROM hp_incidents WHERE employee_id = $1 ORDER BY start_date DESC LIMIT 20`,
        [id]
      ),
    ]);

    if (empRes.rows.length === 0) {
      res.status(404).json({ error: 'Empleado no encontrado.' });
      return;
    }

    res.json({
      employee: empRes.rows[0],
      attendanceHistory: attRes.rows,
      incidentsHistory: incRes.rows,
    });
  } catch (error) {
    console.error('GET employee profile error:', error);
    res.status(500).json({ error: 'Error al cargar ficha del empleado.' });
  }
});

app.post('/api/employees', async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    if (!b.first_name?.trim() || !b.last_name?.trim() || !b.document_number?.trim() || !b.email?.trim() || !b.employee_code?.trim()) {
      res.status(400).json({ error: 'Completa los campos obligatorios (código, documento, nombres, apellidos y correo).' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO hp_employees (
        employee_code, document_type, document_number, first_name, last_name,
        birth_date, gender, phone, email, address, photo_url,
        department_id, position_id, hire_date, contract_type, salary, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id`,
      [
        b.employee_code.trim(),
        b.document_type || 'CC',
        b.document_number.trim(),
        b.first_name.trim(),
        b.last_name.trim(),
        b.birth_date || null,
        b.gender || 'Prefiero no decir',
        b.phone?.trim() ?? '',
        b.email.trim(),
        b.address?.trim() ?? '',
        b.photo_url?.trim() || null,
        b.department_id || null,
        b.position_id || null,
        b.hire_date || new Date().toISOString().slice(0, 10),
        b.contract_type || 'Término Indefinido',
        Number(b.salary) || 0,
        b.status || 'Activo',
      ]
    );
    await logActivity(
      getActor(req),
      'Registro de empleado',
      'Empleados',
      `Se registró a ${b.first_name.trim()} ${b.last_name.trim()} (${b.employee_code.trim()})`
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error: unknown) {
    const err = error as { code?: string; detail?: string };
    if (err.code === '23505') {
      res.status(409).json({ error: 'El código de empleado, número de documento o correo ya está registrado.' });
      return;
    }
    console.error('POST employee error:', error);
    res.status(500).json({ error: 'Error al guardar empleado.' });
  }
});

app.put('/api/employees/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const b = req.body ?? {};
    const result = await pool.query(
      `UPDATE hp_employees SET
        employee_code = $1, document_type = $2, document_number = $3,
        first_name = $4, last_name = $5, birth_date = $6, gender = $7,
        phone = $8, email = $9, address = $10, photo_url = $11,
        department_id = $12, position_id = $13, hire_date = $14,
        contract_type = $15, salary = $16, status = $17
      WHERE id = $18 RETURNING id`,
      [
        b.employee_code?.trim(),
        b.document_type || 'CC',
        b.document_number?.trim(),
        b.first_name?.trim(),
        b.last_name?.trim(),
        b.birth_date || null,
        b.gender || 'Prefiero no decir',
        b.phone?.trim() ?? '',
        b.email?.trim(),
        b.address?.trim() ?? '',
        b.photo_url?.trim() || null,
        b.department_id || null,
        b.position_id || null,
        b.hire_date || new Date().toISOString().slice(0, 10),
        b.contract_type || 'Término Indefinido',
        Number(b.salary) || 0,
        b.status || 'Activo',
        id,
      ]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Empleado no encontrado.' });
      return;
    }
    await logActivity(
      getActor(req),
      'Actualización de empleado',
      'Empleados',
      `Se actualizaron los datos de ${b.first_name?.trim()} ${b.last_name?.trim()}`
    );
    res.json({ updated: true });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === '23505') {
      res.status(409).json({ error: 'El código, documento o correo ya pertenece a otro empleado.' });
      return;
    }
    console.error('PUT employee error:', error);
    res.status(500).json({ error: 'Error al actualizar empleado.' });
  }
});

app.delete('/api/employees/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM hp_employees WHERE id = $1 RETURNING first_name, last_name, employee_code`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Empleado no encontrado.' });
      return;
    }
    const deleted = result.rows[0];
    await logActivity(
      getActor(req),
      'Eliminación de empleado',
      'Empleados',
      `Se eliminó a ${deleted.first_name} ${deleted.last_name} (${deleted.employee_code})`
    );
    res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE employee error:', error);
    res.status(500).json({ error: 'Error al eliminar empleado.' });
  }
});

// ======================= ATTENDANCE ROUTES =======================
app.get('/api/attendance', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const params: unknown[] = [];
    let where = '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      where = 'WHERE a.date = $1';
      params.push(date);
    }
    const result = await pool.query(
      `SELECT
        a.id, a.employee_id, TO_CHAR(a.date, 'YYYY-MM-DD') AS date,
        a.check_in, a.check_out, a.status, a.notes,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code, e.document_number,
        e.department_id, d.name AS department_name
      FROM hp_attendance a
      JOIN hp_employees e ON e.id = a.employee_id
      LEFT JOIN hp_departments d ON d.id = e.department_id
      ${where}
      ORDER BY a.date DESC, e.first_name ASC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET attendance error:', error);
    res.status(500).json({ error: 'Error al consultar registros de asistencia.' });
  }
});

app.post('/api/attendance', async (req: Request, res: Response) => {
  try {
    const { employee_id, date, check_in, check_out, status, notes } = req.body ?? {};
    if (!employee_id || !date || !status) {
      res.status(400).json({ error: 'Empleado, fecha y estado son obligatorios.' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO hp_attendance (employee_id, date, check_in, check_out, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, date) DO UPDATE SET
         check_in = EXCLUDED.check_in,
         check_out = EXCLUDED.check_out,
         status = EXCLUDED.status,
         notes = EXCLUDED.notes
       RETURNING id`,
      [employee_id, date, check_in || null, check_out || null, status, notes?.trim() ?? '']
    );
    const empRes = await pool.query(`SELECT first_name, last_name FROM hp_employees WHERE id = $1`, [employee_id]);
    const empName = empRes.rows[0] ? `${empRes.rows[0].first_name} ${empRes.rows[0].last_name}` : `ID ${employee_id}`;
    await logActivity(
      getActor(req),
      'Registro de asistencia',
      'Asistencia',
      `${empName} marcado como ${status} (${date})`
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('POST attendance error:', error);
    res.status(500).json({ error: 'Error al registrar asistencia.' });
  }
});

app.delete('/api/attendance/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM hp_attendance WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado.' });
      return;
    }
    res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE attendance error:', error);
    res.status(500).json({ error: 'Error al eliminar registro de asistencia.' });
  }
});

// ======================= LABOR INCIDENTS ROUTES =======================
app.get('/api/incidents', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id, i.employee_id, i.incident_type,
        TO_CHAR(i.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(i.end_date, 'YYYY-MM-DD') AS end_date,
        i.description, i.observations, i.support_document, i.approval_status,
        TO_CHAR(i.created_at, 'YYYY-MM-DD') AS created_at,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code, e.document_number, d.name AS department_name
      FROM hp_incidents i
      JOIN hp_employees e ON e.id = i.employee_id
      LEFT JOIN hp_departments d ON d.id = e.department_id
      ORDER BY i.created_at DESC, i.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('GET incidents error:', error);
    res.status(500).json({ error: 'Error al consultar novedades laborales.' });
  }
});

app.post('/api/incidents', async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    if (!b.employee_id || !b.incident_type || !b.start_date || !b.end_date || !b.description?.trim()) {
      res.status(400).json({ error: 'Completa empleado, tipo de novedad, fechas y descripción.' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO hp_incidents (
        employee_id, incident_type, start_date, end_date, description,
        observations, support_document, approval_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        b.employee_id,
        b.incident_type,
        b.start_date,
        b.end_date,
        b.description.trim(),
        b.observations?.trim() ?? '',
        b.support_document?.trim() ?? '',
        b.approval_status || 'Pendiente',
      ]
    );
    await logActivity(
      getActor(req),
      'Registro de novedad',
      'Novedades laborales',
      `Nueva novedad (${b.incident_type}) radicada para colaborador ID ${b.employee_id}`
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('POST incident error:', error);
    res.status(500).json({ error: 'Error al registrar novedad laboral.' });
  }
});

app.put('/api/incidents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const b = req.body ?? {};
    const result = await pool.query(
      `UPDATE hp_incidents SET
        employee_id = $1, incident_type = $2, start_date = $3, end_date = $4,
        description = $5, observations = $6, support_document = $7, approval_status = $8
      WHERE id = $9 RETURNING id`,
      [
        b.employee_id,
        b.incident_type,
        b.start_date,
        b.end_date,
        b.description?.trim() ?? '',
        b.observations?.trim() ?? '',
        b.support_document?.trim() ?? '',
        b.approval_status || 'Pendiente',
        id,
      ]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Novedad no encontrada.' });
      return;
    }
    await logActivity(getActor(req), 'Edición de novedad', 'Novedades laborales', `Actualización novedad #${id}`);
    res.json({ updated: true });
  } catch (error) {
    console.error('PUT incident error:', error);
    res.status(500).json({ error: 'Error al actualizar novedad laboral.' });
  }
});

app.patch('/api/incidents/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approval_status } = req.body ?? {};
    if (!['Pendiente', 'Aprobada', 'Rechazada'].includes(approval_status)) {
      res.status(400).json({ error: 'Estado de aprobación inválido.' });
      return;
    }
    const result = await pool.query(
      `UPDATE hp_incidents SET approval_status = $1 WHERE id = $2 RETURNING id, incident_type`,
      [approval_status, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Novedad no encontrada.' });
      return;
    }
    await logActivity(
      getActor(req),
      `Novedad ${approval_status.toLowerCase()}`,
      'Novedades laborales',
      `Se cambió el estado de la novedad #${id} (${result.rows[0].incident_type}) a ${approval_status}`
    );
    res.json({ updated: true });
  } catch (error) {
    console.error('PATCH incident status error:', error);
    res.status(500).json({ error: 'Error al cambiar estado de la novedad.' });
  }
});

app.delete('/api/incidents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM hp_incidents WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Novedad no encontrada.' });
      return;
    }
    await logActivity(getActor(req), 'Eliminación de novedad', 'Novedades laborales', `Se eliminó la novedad #${id}`);
    res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE incident error:', error);
    res.status(500).json({ error: 'Error al eliminar novedad laboral.' });
  }
});

// ======================= SETTINGS ROUTES =======================
app.get('/api/settings', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM hp_company_settings WHERE id = 1`);
    res.json(result.rows[0] ?? {});
  } catch (error) {
    console.error('GET settings error:', error);
    res.status(500).json({ error: 'Error al cargar la configuración.' });
  }
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    const result = await pool.query(
      `UPDATE hp_company_settings SET
        company_name = $1, tax_id = $2, industry = $3, email = $4,
        phone = $5, address = $6, workday_start = $7, workday_end = $8,
        late_tolerance_minutes = $9, currency = $10, updated_at = NOW()
      WHERE id = 1 RETURNING *`,
      [
        b.company_name,
        b.tax_id,
        b.industry,
        b.email,
        b.phone,
        b.address,
        b.workday_start,
        b.workday_end,
        Number(b.late_tolerance_minutes) || 15,
        b.currency || 'COP',
      ]
    );
    await logActivity(getActor(req), 'Actualización de configuración', 'Configuración', 'Se guardaron los parámetros corporativos de HumanPro');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('PUT settings error:', error);
    res.status(500).json({ error: 'Error al guardar configuración.' });
  }
});

// ======================= START SERVER =======================
async function startServer() {
  try {
    await initDatabase();
  } catch (err) {
    console.error('❌ Error al inicializar Neon PostgreSQL:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HumanPro Enterprise HR Server ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
