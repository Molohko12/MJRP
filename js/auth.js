/**
 * Dual role system:
 * - siteRole: администрация сайта (super_admin, site_admin)
 * - gameRole: игровые роли (governor, minister, hr_auditor, employee)
 */
const DEMO_USERS = [
  {
    fullName: "Иван Петров",
    siteRole: "super_admin",
    gameRole: "governor",
    ministry: "governor",
    position: "Губернатор",
    level: 100,
  },
  {
    fullName: "Сергей Админов",
    siteRole: "site_admin",
    gameRole: null,
    ministry: null,
    position: "Администратор сайта",
    level: 0,
  },
  {
    fullName: "Мария Сидорова",
    siteRole: null,
    gameRole: "hr_auditor",
    ministry: "governor",
    position: "Руководитель Аппарата",
    level: 85,
  },
  {
    fullName: "Алексей Козлов",
    siteRole: null,
    gameRole: "minister",
    ministry: "justice",
    position: "Министр Юстиции",
    level: 80,
  },
  {
    fullName: "Елена Волкова",
    siteRole: null,
    gameRole: "employee",
    ministry: "advocacy",
    position: "Адвокат",
    level: 55,
  },
  {
    fullName: "Дмитрий Орлов",
    siteRole: null,
    gameRole: "employee",
    ministry: "secret_service",
    position: "Агент",
    level: 60,
  },
];

/** Права администрации сайта */
const SITE_ROLE_PERMISSIONS = {
  super_admin: ["complaints", "applications", "audit", "logs", "hierarchy", "site_manage"],
  site_admin: ["complaints", "applications", "logs", "hierarchy"],
};

/** Права игровых ролей */
const GAME_ROLE_PERMISSIONS = {
  governor: ["complaints", "applications", "audit", "hierarchy"],
  hr_auditor: ["complaints", "applications", "audit", "hierarchy"],
  minister: ["complaints", "applications", "hierarchy"],
  employee: ["hierarchy"],
};

const SITE_ROLE_LABELS = {
  super_admin: "Главный администратор",
  site_admin: "Администратор сайта",
};

const GAME_ROLE_LABELS = {
  governor: "Губернатор",
  minister: "Министр",
  hr_auditor: "Кадровый аудит",
  employee: "Сотрудник",
};

const Auth = {
  SESSION_KEY: "mgp_session",

  login(fullName, position) {
    const normalized = fullName.trim().toLowerCase();
    const user = DEMO_USERS.find((u) => u.fullName.toLowerCase() === normalized);

    const session = user
      ? { ...user, authenticated: true }
      : {
          fullName: fullName.trim(),
          position: position || "Сотрудник",
          siteRole: null,
          gameRole: "employee",
          ministry: "governor",
          level: 30,
          authenticated: true,
        };

    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  getSession() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!this.getSession()?.authenticated;
  },

  _collectPermissions(session) {
    const perms = new Set();
    if (session.siteRole && SITE_ROLE_PERMISSIONS[session.siteRole]) {
      SITE_ROLE_PERMISSIONS[session.siteRole].forEach((p) => perms.add(p));
    }
    if (session.gameRole && GAME_ROLE_PERMISSIONS[session.gameRole]) {
      GAME_ROLE_PERMISSIONS[session.gameRole].forEach((p) => perms.add(p));
    }
    return perms;
  },

  hasPermission(section) {
    const session = this.getSession();
    if (!session) return false;
    return this._collectPermissions(session).has(section);
  },

  isSuperAdmin() {
    return this.getSession()?.siteRole === "super_admin";
  },

  isSiteAdmin() {
    const r = this.getSession()?.siteRole;
    return r === "super_admin" || r === "site_admin";
  },

  getRoleDisplay(session) {
    if (!session) return "";
    const parts = [];
    if (session.siteRole) parts.push(SITE_ROLE_LABELS[session.siteRole] || session.siteRole);
    if (session.gameRole) parts.push(GAME_ROLE_LABELS[session.gameRole] || session.position);
    if (!parts.length) parts.push(session.position || "Сотрудник");
    return parts.join(" · ");
  },

  /** Для заголовков API (обратная совместимость) */
  getPrimaryRole(session) {
    return session?.siteRole || session?.gameRole || "employee";
  },
};
