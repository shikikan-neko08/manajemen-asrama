import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  ActivePage,
  AppDeploymentMode,
  PeranPengguna,
  RoleCapabilities,
  RoleDefinition,
  RoleScopeMode,
} from './src/types/dorm.ts';

interface StoredUserCredential {
  userId: string;
  username: string;
  nama: string;
  jabatan: string;
  telepon: string;
  roleId: string;
  peran: PeranPengguna;
  gedungIds?: string[];
  penghuniIds?: string[];
  passwordHash: string | null; // format: saltHex:scryptHex
  active: boolean;
  updatedAt: string;
}

interface ServerAuthStore {
  mode: AppDeploymentMode;
  adminClaimed: boolean;
  roles: RoleDefinition[];
  users: StoredUserCredential[];
}

interface SessionPayload {
  userId: string;
  username: string;
  roleId: string;
  peran: PeranPengguna;
  iat: number;
  exp: number;
  jti: string;
}

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'role-admin',
    nama: 'Administrator Asrama',
    deskripsi:
      'Akses penuh seluruh modul master, pengaturan deployment production, manajemen role, pengguna, dan laporan.',
    basePeran: 'Admin',
    isSystem: true,
    scopeMode: 'semua',
    allowedPages: [
      'dashboard',
      'penghuni',
      'gedung-kamar',
      'absensi',
      'perizinan',
      'pelanggaran',
      'tamu-log',
      'inventaris',
      'kegiatan',
      'kesehatan',
      'tagihan',
      'laporan',
      'pengaturan',
    ],
    capabilities: {
      canCreateEdit: true,
      canDelete: true,
      canApproveIzin: true,
      canManageGate: true,
      canManageBilling: true,
      canExportReport: true,
    },
  },
  {
    id: 'role-pembina',
    nama: 'Pembina / Musyrif',
    deskripsi:
      'Mengelola santri asrama, absensi harian, persetujuan izin, pelanggaran, pembinaan, dan inventaris kamar.',
    basePeran: 'Pembina',
    isSystem: true,
    scopeMode: 'gedung_terkait',
    allowedPages: [
      'dashboard',
      'penghuni',
      'gedung-kamar',
      'absensi',
      'perizinan',
      'pelanggaran',
      'tamu-log',
      'inventaris',
      'kegiatan',
      'kesehatan',
      'tagihan',
      'laporan',
    ],
    capabilities: {
      canCreateEdit: true,
      canDelete: true,
      canApproveIzin: true,
      canManageGate: true,
      canManageBilling: true,
      canExportReport: true,
    },
  },
  {
    id: 'role-keamanan',
    nama: 'Petugas Keamanan / Piket',
    deskripsi:
      'Mencatat keluar-masuk santri berdasarkan izin aktif, buku tamu penjenguk, dan lookup kontak darurat.',
    basePeran: 'Keamanan',
    isSystem: true,
    scopeMode: 'semua',
    allowedPages: ['dashboard', 'tamu-log', 'perizinan', 'penghuni', 'kegiatan'],
    capabilities: {
      canCreateEdit: false,
      canDelete: false,
      canApproveIzin: false,
      canManageGate: true,
      canManageBilling: false,
      canExportReport: false,
    },
  },
  {
    id: 'role-wali',
    nama: 'Wali Santri',
    deskripsi:
      'Akses baca-saja (read-only) untuk memantau kamar, absensi, perizinan, poin pembinaan, dan tagihan anak.',
    basePeran: 'Wali',
    isSystem: true,
    scopeMode: 'anak_terkait',
    allowedPages: [
      'dashboard',
      'penghuni',
      'absensi',
      'perizinan',
      'pelanggaran',
      'kegiatan',
      'kesehatan',
      'tagihan',
    ],
    capabilities: {
      canCreateEdit: false,
      canDelete: false,
      canApproveIzin: false,
      canManageGate: false,
      canManageBilling: false,
      canExportReport: false,
    },
  },
];

const DEFAULT_USERS: StoredUserCredential[] = [
  {
    userId: 'u-admin',
    username: 'admin',
    nama: 'H. Ridwan Kamiluddin, M.Pd',
    jabatan: 'Kepala Bidang Keasramaan',
    telepon: '0811-2233-4455',
    roleId: 'role-admin',
    peran: 'Admin',
    passwordHash: null,
    active: true,
    updatedAt: new Date().toISOString(),
  },
  {
    userId: 'u-pembina-1',
    username: 'zaki',
    nama: 'Ustadz Ahmad Zaki, S.Pd.I',
    jabatan: 'Musyrif Asrama Putra',
    telepon: '0812-3456-7890',
    roleId: 'role-pembina',
    peran: 'Pembina',
    gedungIds: ['g-1', 'g-2'],
    passwordHash: null,
    active: true,
    updatedAt: new Date().toISOString(),
  },
  {
    userId: 'u-pembina-2',
    username: 'maryam',
    nama: 'Ustadzah Siti Maryam, Lc',
    jabatan: 'Musyrifah Asrama Putri',
    telepon: '0813-9876-5432',
    roleId: 'role-pembina',
    peran: 'Pembina',
    gedungIds: ['g-3'],
    passwordHash: null,
    active: true,
    updatedAt: new Date().toISOString(),
  },
  {
    userId: 'u-keamanan',
    username: 'hendra',
    nama: 'Hendra Wijaya',
    jabatan: 'Petugas Piket & Keamanan Gerbang',
    telepon: '0815-6677-8899',
    roleId: 'role-keamanan',
    peran: 'Keamanan',
    passwordHash: null,
    active: true,
    updatedAt: new Date().toISOString(),
  },
  {
    userId: 'u-wali-1',
    username: 'wali.fauzi',
    nama: 'Bapak Budi Santoso',
    jabatan: 'Wali dari Ahmad Fauzi (Kelas 10-A)',
    telepon: '0812-8899-0011',
    roleId: 'role-wali',
    peran: 'Wali',
    penghuniIds: ['s-01'],
    passwordHash: null,
    active: true,
    updatedAt: new Date().toISOString(),
  },
  {
    userId: 'u-wali-2',
    username: 'wali.aisyah',
    nama: 'Ibu Ratna Dewi',
    jabatan: 'Wali dari Aisyah Putri Ramadhani (Kelas 10-B)',
    telepon: '0813-4455-6677',
    roleId: 'role-wali',
    peran: 'Wali',
    penghuniIds: ['s-21'],
    passwordHash: null,
    active: true,
    updatedAt: new Date().toISOString(),
  },
];

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.resolve(DATA_DIR, 'server-auth.json');
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const revokedTokenIds = new Set<string>();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): ServerAuthStore {
  ensureDataDir();
  const envMode: AppDeploymentMode | undefined =
    process.env.APP_MODE === 'production'
      ? 'production'
      : process.env.APP_MODE === 'demo'
      ? 'demo'
      : undefined;

  if (fs.existsSync(STORE_FILE)) {
    try {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as ServerAuthStore;
      if (parsed && Array.isArray(parsed.roles) && Array.isArray(parsed.users)) {
        return {
          ...parsed,
          mode: envMode ?? parsed.mode ?? 'demo',
        };
      }
    } catch {
      // fall through to default
    }
  }

  const initial: ServerAuthStore = {
    mode: envMode ?? 'demo',
    adminClaimed: false,
    roles: DEFAULT_ROLES,
    users: DEFAULT_USERS,
  };
  saveStore(initial);
  return initial;
}

function saveStore(store: ServerAuthStore) {
  ensureDataDir();
  const tmpFile = `${STORE_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmpFile, STORE_FILE);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function verifyTimingSafeString(input: string, expected: string): boolean {
  const a = Buffer.from(input, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signToken(payload: Omit<SessionPayload, 'iat' | 'exp' | 'jti'>): string {
  const now = Date.now();
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + 1000 * 60 * 60 * 12, // 12 jam
    jti: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf-8');
  const expBuf = Buffer.from(expectedSig, 'utf-8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as SessionPayload;
    if (Date.now() > payload.exp) return null;
    if (revokedTokenIds.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

function toPublicUser(u: StoredUserCredential) {
  return {
    id: u.userId,
    nama: u.nama,
    peran: u.peran,
    roleId: u.roleId,
    username: u.username,
    jabatan: u.jabatan,
    telepon: u.telepon,
    gedungIds: u.gedungIds,
    penghuniIds: u.penghuniIds,
  };
}

function getEnvAdminPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

interface AuthedRequest extends Request {
  authSession?: SessionPayload;
  authUser?: StoredUserCredential;
  authRole?: RoleDefinition;
}

async function startServer() {
  let store = loadStore();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const session = verifyToken(token);
    if (!session) {
      res.status(401).json({ ok: false, message: 'Sesi login tidak valid atau telah berakhir.' });
      return;
    }
    const user = store.users.find((u) => u.userId === session.userId);
    if (!user || !user.active) {
      res.status(401).json({ ok: false, message: 'Akun pengguna tidak aktif atau tidak ditemukan.' });
      return;
    }
    const role =
      store.roles.find((r) => r.id === user.roleId) ??
      store.roles.find((r) => r.basePeran === user.peran) ??
      DEFAULT_ROLES[3];

    req.authSession = session;
    req.authUser = user;
    req.authRole = role;
    next();
  };

  const requireAdmin = (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (
      !req.authRole ||
      (req.authRole.basePeran !== 'Admin' && !req.authRole.allowedPages.includes('pengaturan'))
    ) {
      res.status(403).json({ ok: false, message: 'Akses ditolak. Khusus peran Administrator.' });
      return;
    }
    next();
  };

  // Public auth status (no secrets/hashes/usernames leaked)
  app.get('/api/auth/status', (_req: Request, res: Response) => {
    const envPass = getEnvAdminPasscode();
    res.json({
      mode: store.mode,
      adminClaimed: store.adminClaimed || Boolean(envPass),
      envAdminConfigured: Boolean(envPass),
      roles: store.roles,
    });
  });

  // Demo mode quick login -> issues a real server-verified Bearer token ONLY while in demo mode
  app.post('/api/auth/demo-login', (req: Request, res: Response) => {
    if (store.mode !== 'demo') {
      res.status(403).json({
        ok: false,
        message: 'Mode Production aktif. Silakan masuk menggunakan username dan kata sandi.',
      });
      return;
    }
    const { userId, nama, peran, roleId, jabatan, telepon, gedungIds, penghuniIds } = req.body as {
      userId?: string;
      nama?: string;
      peran?: PeranPengguna;
      roleId?: string;
      jabatan?: string;
      telepon?: string;
      gedungIds?: string[];
      penghuniIds?: string[];
    };

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ ok: false, message: 'ID pengguna wajib diisi.' });
      return;
    }

    let user = store.users.find((u) => u.userId === userId);
    if (!user && nama && peran) {
      const targetRoleId =
        roleId ||
        store.roles.find((r) => r.basePeran === peran)?.id ||
        'role-wali';
      user = {
        userId,
        username: userId.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase(),
        nama: String(nama).slice(0, 100),
        jabatan: String(jabatan || peran).slice(0, 100),
        telepon: String(telepon || '-').slice(0, 30),
        roleId: targetRoleId,
        peran,
        gedungIds,
        penghuniIds,
        passwordHash: null,
        active: true,
        updatedAt: new Date().toISOString(),
      };
      store.users.push(user);
      saveStore(store);
    }

    if (!user) {
      res.status(404).json({ ok: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    const role =
      store.roles.find((r) => r.id === user.roleId) ??
      store.roles.find((r) => r.basePeran === user.peran) ??
      DEFAULT_ROLES[3];

    const token = signToken({
      userId: user.userId,
      username: user.username,
      roleId: role.id,
      peran: role.basePeran,
    });

    res.json({
      ok: true,
      token,
      user: toPublicUser(user),
      role,
    });
  });

  // First-run atomic Admin claim (only works if ADMIN_PASSCODE unset and no admin password claimed yet)
  app.post('/api/auth/claim-admin', (req: Request, res: Response) => {
    const envPass = getEnvAdminPasscode();
    if (envPass || store.adminClaimed) {
      res.status(409).json({
        ok: false,
        message: 'Akun Administrator production sudah dikonfigurasi.',
      });
      return;
    }

    const { username, password, activateProduction } = req.body as {
      username?: string;
      password?: string;
      activateProduction?: boolean;
    };

    const cleanUsername = String(username || 'admin').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (cleanUsername.length < 3 || !/^[a-z0-9._-]+$/.test(cleanUsername)) {
      res.status(400).json({
        ok: false,
        message: 'Username minimal 3 karakter (huruf kecil, angka, titik, atau garis bawah).',
      });
      return;
    }
    if (cleanPassword.length < 6) {
      res.status(400).json({
        ok: false,
        message: 'Kata sandi minimal 6 karakter demi keamanan production.',
      });
      return;
    }

    let adminUser = store.users.find((u) => u.userId === 'u-admin' || u.peran === 'Admin');
    if (!adminUser) {
      adminUser = {
        userId: 'u-admin',
        username: cleanUsername,
        nama: 'Administrator Asrama',
        jabatan: 'Administrator Utama',
        telepon: '-',
        roleId: 'role-admin',
        peran: 'Admin',
        passwordHash: hashPassword(cleanPassword),
        active: true,
        updatedAt: new Date().toISOString(),
      };
      store.users.unshift(adminUser);
    } else {
      adminUser.username = cleanUsername;
      adminUser.passwordHash = hashPassword(cleanPassword);
      adminUser.active = true;
      adminUser.updatedAt = new Date().toISOString();
    }

    store.adminClaimed = true;
    if (activateProduction) {
      store.mode = 'production';
    }
    saveStore(store);

    const role = store.roles.find((r) => r.id === adminUser.roleId) ?? DEFAULT_ROLES[0];
    const token = signToken({
      userId: adminUser.userId,
      username: adminUser.username,
      roleId: role.id,
      peran: role.basePeran,
    });

    res.json({
      ok: true,
      token,
      mode: store.mode,
      adminClaimed: true,
      user: toPublicUser(adminUser),
      role,
    });
  });

  // Production Username & Password Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanUsername || !cleanPassword) {
      res.status(400).json({ ok: false, message: 'Username dan kata sandi wajib diisi.' });
      return;
    }

    const user = store.users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (!user) {
      res.status(401).json({ ok: false, message: 'Username atau kata sandi salah.' });
      return;
    }
    if (!user.active) {
      res.status(403).json({
        ok: false,
        message: 'Akun ini dinonaktifkan. Hubungi Administrator asrama.',
      });
      return;
    }

    const role =
      store.roles.find((r) => r.id === user.roleId) ??
      store.roles.find((r) => r.basePeran === user.peran) ??
      DEFAULT_ROLES[3];

    const envPass = getEnvAdminPasscode();
    let valid = false;

    // Configured ADMIN_PASSCODE overrides fallback admin hash
    if (role.basePeran === 'Admin' && envPass) {
      valid = verifyTimingSafeString(cleanPassword, envPass);
    } else {
      valid = verifyPassword(cleanPassword, user.passwordHash);
    }

    if (!valid) {
      res.status(401).json({ ok: false, message: 'Username atau kata sandi salah.' });
      return;
    }

    const token = signToken({
      userId: user.userId,
      username: user.username,
      roleId: role.id,
      peran: role.basePeran,
    });

    res.json({
      ok: true,
      token,
      user: toPublicUser(user),
      role,
    });
  });

  // Verify current session
  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({
      ok: true,
      mode: store.mode,
      user: toPublicUser(req.authUser!),
      role: req.authRole,
    });
  });

  // Logout (revoke token)
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const session = verifyToken(token);
    if (session) {
      revokedTokenIds.add(session.jti);
    }
    res.json({ ok: true });
  });

  // Change own password
  app.post('/api/auth/change-password', requireAuth, (req: AuthedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    const user = req.authUser!;
    const newPass = String(newPassword || '');
    if (newPass.length < 6) {
      res.status(400).json({ ok: false, message: 'Kata sandi baru minimal 6 karakter.' });
      return;
    }
    if (user.passwordHash && !verifyPassword(String(currentPassword || ''), user.passwordHash)) {
      res.status(401).json({ ok: false, message: 'Kata sandi saat ini tidak cocok.' });
      return;
    }
    user.passwordHash = hashPassword(newPass);
    user.updatedAt = new Date().toISOString();
    if (user.peran === 'Admin') store.adminClaimed = true;
    saveStore(store);
    res.json({ ok: true, message: 'Kata sandi berhasil diperbarui.' });
  });

  // Admin: Fetch Auth Config (roles + user credential metadata, NO hashes)
  app.get(
    '/api/admin/auth-config',
    requireAuth,
    requireAdmin,
    (_req: AuthedRequest, res: Response) => {
      const envPass = getEnvAdminPasscode();
      res.json({
        ok: true,
        mode: store.mode,
        adminClaimed: store.adminClaimed || Boolean(envPass),
        envAdminConfigured: Boolean(envPass),
        roles: store.roles,
        users: store.users.map((u) => ({
          userId: u.userId,
          username: u.username,
          roleId: u.roleId,
          hasPassword: Boolean(u.passwordHash) || (u.peran === 'Admin' && Boolean(envPass)),
          active: u.active,
          updatedAt: u.updatedAt,
        })),
      });
    }
  );

  // Admin: Switch Deployment Mode (demo <-> production)
  app.post('/api/admin/mode', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
    const { mode } = req.body as { mode?: AppDeploymentMode };
    if (mode !== 'demo' && mode !== 'production') {
      res.status(400).json({ ok: false, message: 'Mode deployment tidak valid.' });
      return;
    }
    const envPass = getEnvAdminPasscode();
    if (mode === 'production' && !store.adminClaimed && !envPass) {
      res.status(400).json({
        ok: false,
        message: 'Atur username & kata sandi Administrator terlebih dahulu sebelum mengaktifkan Mode Production.',
      });
      return;
    }
    store.mode = mode;
    saveStore(store);
    res.json({ ok: true, mode: store.mode });
  });

  // Admin: Sync / Set User Credentials & Role
  app.post(
    '/api/admin/users/:userId/credentials',
    requireAuth,
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const userId = req.params.userId;
      const {
        username,
        password,
        roleId,
        active,
        nama,
        jabatan,
        telepon,
        gedungIds,
        penghuniIds,
      } = req.body as {
        username?: string;
        password?: string;
        roleId?: string;
        active?: boolean;
        nama?: string;
        jabatan?: string;
        telepon?: string;
        gedungIds?: string[];
        penghuniIds?: string[];
      };

      const cleanUsername = String(username || '').trim().toLowerCase();
      if (cleanUsername.length < 3 || !/^[a-z0-9._-]+$/.test(cleanUsername)) {
        res.status(400).json({
          ok: false,
          message: 'Username minimal 3 karakter (huruf kecil, angka, titik, atau garis bawah).',
        });
        return;
      }

      const duplicate = store.users.find(
        (u) => u.username.toLowerCase() === cleanUsername && u.userId !== userId
      );
      if (duplicate) {
        res.status(409).json({
          ok: false,
          message: `Username "${cleanUsername}" sudah digunakan oleh ${duplicate.nama}.`,
        });
        return;
      }

      const selectedRole = store.roles.find((r) => r.id === roleId) ?? store.roles[0];
      let target = store.users.find((u) => u.userId === userId);

      if (password && password.length > 0 && password.length < 6) {
        res.status(400).json({
          ok: false,
          message: 'Kata sandi minimal 6 karakter.',
        });
        return;
      }

      if (!target) {
        target = {
          userId,
          username: cleanUsername,
          nama: String(nama || cleanUsername),
          jabatan: String(jabatan || selectedRole.nama),
          telepon: String(telepon || '-'),
          roleId: selectedRole.id,
          peran: selectedRole.basePeran,
          gedungIds,
          penghuniIds,
          passwordHash: password ? hashPassword(password) : null,
          active: active !== undefined ? Boolean(active) : true,
          updatedAt: new Date().toISOString(),
        };
        store.users.push(target);
      } else {
        target.username = cleanUsername;
        target.roleId = selectedRole.id;
        target.peran = selectedRole.basePeran;
        if (nama !== undefined) target.nama = String(nama);
        if (jabatan !== undefined) target.jabatan = String(jabatan);
        if (telepon !== undefined) target.telepon = String(telepon);
        if (gedungIds !== undefined) target.gedungIds = gedungIds;
        if (penghuniIds !== undefined) target.penghuniIds = penghuniIds;
        if (active !== undefined) {
          if (target.userId === req.authUser?.userId && active === false) {
            res.status(400).json({
              ok: false,
              message: 'Tidak dapat menonaktifkan akun Anda sendiri yang sedang login.',
            });
            return;
          }
          target.active = Boolean(active);
        }
        if (password && password.trim().length >= 6) {
          target.passwordHash = hashPassword(password);
          if (selectedRole.basePeran === 'Admin') {
            store.adminClaimed = true;
          }
        }
        target.updatedAt = new Date().toISOString();
      }

      saveStore(store);
      const envPass = getEnvAdminPasscode();
      res.json({
        ok: true,
        userAuth: {
          userId: target.userId,
          username: target.username,
          roleId: target.roleId,
          hasPassword:
            Boolean(target.passwordHash) || (target.peran === 'Admin' && Boolean(envPass)),
          active: target.active,
          updatedAt: target.updatedAt,
        },
        publicUser: toPublicUser(target),
      });
    }
  );

  // Admin: Delete user credential record
  app.delete(
    '/api/admin/users/:userId',
    requireAuth,
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const userId = req.params.userId;
      if (userId === req.authUser?.userId) {
        res.status(400).json({ ok: false, message: 'Tidak dapat menghapus akun yang sedang aktif.' });
        return;
      }
      store.users = store.users.filter((u) => u.userId !== userId);
      saveStore(store);
      res.json({ ok: true });
    }
  );

  // Admin: Create or Update Role Definition
  app.post('/api/admin/roles', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
    const {
      id,
      nama,
      deskripsi,
      basePeran,
      scopeMode,
      allowedPages,
      capabilities,
    } = req.body as {
      id?: string;
      nama?: string;
      deskripsi?: string;
      basePeran?: PeranPengguna;
      scopeMode?: RoleScopeMode;
      allowedPages?: ActivePage[];
      capabilities?: RoleCapabilities;
    };

    if (!nama || !String(nama).trim()) {
      res.status(400).json({ ok: false, message: 'Nama role wajib diisi.' });
      return;
    }

    const cleanName = String(nama).trim();
    const validBase: PeranPengguna =
      basePeran === 'Admin' ||
      basePeran === 'Pembina' ||
      basePeran === 'Keamanan' ||
      basePeran === 'Wali'
        ? basePeran
        : 'Pembina';

    const validScope: RoleScopeMode =
      scopeMode === 'semua' || scopeMode === 'gedung_terkait' || scopeMode === 'anak_terkait'
        ? scopeMode
        : 'semua';

    let pages: ActivePage[] = Array.isArray(allowedPages) && allowedPages.length > 0
      ? allowedPages
      : ['dashboard'];

    // Safety invariant: Admin role always retains access to dashboard and pengaturan
    if (id === 'role-admin' || validBase === 'Admin') {
      if (!pages.includes('dashboard')) pages.push('dashboard');
      if (!pages.includes('pengaturan')) pages.push('pengaturan');
    }

    const existingIdx = id ? store.roles.findIndex((r) => r.id === id) : -1;
    if (existingIdx >= 0) {
      const existing = store.roles[existingIdx];
      store.roles[existingIdx] = {
        ...existing,
        nama: cleanName,
        deskripsi: String(deskripsi || existing.deskripsi).trim(),
        basePeran: existing.isSystem ? existing.basePeran : validBase,
        scopeMode: validScope,
        allowedPages: pages,
        capabilities: capabilities ?? existing.capabilities,
      };
      // Sync user peran if custom role changed basePeran
      store.users.forEach((u) => {
        if (u.roleId === existing.id) {
          u.peran = store.roles[existingIdx].basePeran;
        }
      });
    } else {
      const newRole: RoleDefinition = {
        id: `role-${Date.now().toString(36)}`,
        nama: cleanName,
        deskripsi: String(deskripsi || 'Role khusus asrama').trim(),
        basePeran: validBase,
        isSystem: false,
        scopeMode: validScope,
        allowedPages: pages,
        capabilities: capabilities ?? {
          canCreateEdit: false,
          canDelete: false,
          canApproveIzin: false,
          canManageGate: false,
          canManageBilling: false,
          canExportReport: true,
        },
      };
      store.roles.push(newRole);
    }

    saveStore(store);
    res.json({ ok: true, roles: store.roles });
  });

  // Admin: Delete Custom Role
  app.delete(
    '/api/admin/roles/:roleId',
    requireAuth,
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const roleId = req.params.roleId;
      const target = store.roles.find((r) => r.id === roleId);
      if (!target) {
        res.status(404).json({ ok: false, message: 'Role tidak ditemukan.' });
        return;
      }
      if (target.isSystem) {
        res.status(400).json({ ok: false, message: 'Role bawaan sistem tidak dapat dihapus.' });
        return;
      }
      const inUse = store.users.some((u) => u.roleId === roleId);
      if (inUse) {
        res.status(400).json({
          ok: false,
          message: 'Role ini masih digunakan oleh akun pengguna. Pindahkan pengguna ke role lain terlebih dahulu.',
        });
        return;
      }
      store.roles = store.roles.filter((r) => r.id !== roleId);
      saveStore(store);
      res.json({ ok: true, roles: store.roles });
    }
  );

  // Vite dev middleware or Production static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIM-Asrama server berjalan pada http://0.0.0.0:${PORT} (mode: ${store.mode})`);
  });
}

startServer().catch((err) => {
  console.error('Gagal memulai server SIM-Asrama:', err);
  process.exit(1);
});
