/**
 * Site settings: ministries hierarchy and custom statuses.
 * Persisted via API (PostgreSQL) with localStorage fallback.
 */
const DEFAULT_MINISTRIES = [
  {
    id: "governor",
    name: "Администрация Губернатора",
    roles: [
      { id: "governor", title: "Губернатор", level: 100 },
      { id: "deputy_governor", title: "Заместитель Губернатора", level: 90 },
      { id: "chief_of_staff", title: "Руководитель Аппарата", level: 85 },
      { id: "press_secretary", title: "Пресс-секретарь", level: 70 },
    ],
  },
  {
    id: "justice",
    name: "Министерство Юстиции",
    roles: [
      { id: "justice_minister", title: "Министр Юстиции", level: 80 },
      { id: "prosecutor", title: "Прокурор", level: 75 },
      { id: "judge", title: "Судья", level: 70 },
      { id: "clerk", title: "Секретарь суда", level: 50 },
    ],
  },
  {
    id: "defense",
    name: "Министерство Обороны",
    roles: [
      { id: "defense_minister", title: "Министр Обороны", level: 80 },
      { id: "general", title: "Генерал", level: 75 },
      { id: "colonel", title: "Полковник", level: 65 },
      { id: "soldier", title: "Военнослужащий", level: 40 },
    ],
  },
  {
    id: "advocacy",
    name: "Адвокатура",
    roles: [
      { id: "chief_advocate", title: "Главный адвокат", level: 75 },
      { id: "senior_advocate", title: "Старший адвокат", level: 65 },
      { id: "advocate", title: "Адвокат", level: 55 },
      { id: "paralegal", title: "Помощник адвоката", level: 45 },
    ],
  },
  {
    id: "secret_service",
    name: "Секретная служба",
    roles: [
      { id: "ss_director", title: "Директор СС", level: 85 },
      { id: "ss_agent", title: "Агент", level: 60 },
      { id: "ss_analyst", title: "Аналитик", level: 55 },
    ],
  },
  {
    id: "finance",
    name: "Министерство Финансов",
    roles: [
      { id: "finance_minister", title: "Министр Финансов", level: 80 },
      { id: "treasurer", title: "Казначей", level: 70 },
      { id: "accountant", title: "Бухгалтер", level: 50 },
    ],
  },
  {
    id: "health",
    name: "Министерство Здравоохранения",
    roles: [
      { id: "health_minister", title: "Министр Здравоохранения", level: 80 },
      { id: "chief_doctor", title: "Главный врач", level: 70 },
      { id: "medic", title: "Медик", level: 50 },
    ],
  },
];

const DEFAULT_APPLICATION_STATUSES = [
  { id: "new", label: "Новое", cssClass: "status-new", isInitial: true },
  { id: "approved", label: "Одобрено", cssClass: "status-approved" },
  { id: "rejected", label: "Отклонено", cssClass: "status-rejected" },
];

const DEFAULT_COMPLAINT_STATUSES = [
  { id: "new", label: "Новое", cssClass: "status-new", isInitial: true },
  { id: "in_progress", label: "В работе", cssClass: "status-review", actionLabel: "В работу" },
  { id: "closed", label: "Закрыто", cssClass: "status-approved", actionLabel: "Закрыть" },
];

const Settings = {
  STORAGE_KEY: "mgp_site_settings",
  _cache: null,

  defaults() {
    return {
      ministries: JSON.parse(JSON.stringify(DEFAULT_MINISTRIES)),
      applicationStatuses: JSON.parse(JSON.stringify(DEFAULT_APPLICATION_STATUSES)),
      complaintStatuses: JSON.parse(JSON.stringify(DEFAULT_COMPLAINT_STATUSES)),
    };
  },

  async load() {
    if (CONFIG.USE_LOCAL_FALLBACK) {
      this._cache = this._loadLocal();
      return this._cache;
    }
    try {
      const data = await apiRequest("/api/settings");
      this._cache = this._mergeDefaults(data);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._cache));
      return this._cache;
    } catch {
      this._cache = this._loadLocal();
      return this._cache;
    }
  },

  _loadLocal() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? this._mergeDefaults(JSON.parse(raw)) : this.defaults();
    } catch {
      return this.defaults();
    }
  },

  _mergeDefaults(data) {
    const d = this.defaults();
    return {
      ministries: data?.ministries?.length ? data.ministries : d.ministries,
      applicationStatuses: data?.applicationStatuses?.length ? data.applicationStatuses : d.applicationStatuses,
      complaintStatuses: data?.complaintStatuses?.length ? data.complaintStatuses : d.complaintStatuses,
    };
  },

  get() {
    return this._cache || this._loadLocal();
  },

  getMinistries() {
    return this.get().ministries;
  },

  getApplicationStatuses() {
    return this.get().applicationStatuses;
  },

  getComplaintStatuses() {
    return this.get().complaintStatuses;
  },

  getStatusLabel(type, id) {
    const list = type === "application" ? this.getApplicationStatuses() : this.getComplaintStatuses();
    return list.find((s) => s.id === id)?.label || id || "—";
  },

  getStatusCss(type, id) {
    const list = type === "application" ? this.getApplicationStatuses() : this.getComplaintStatuses();
    return list.find((s) => s.id === id)?.cssClass || "status-new";
  },

  async save(partial) {
    const current = this.get();
    const next = { ...current, ...partial };
    this._cache = next;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(next));

    if (CONFIG.USE_LOCAL_FALLBACK) return next;

    try {
      const saved = await apiRequest("/api/settings", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      this._cache = this._mergeDefaults(saved);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._cache));
      return this._cache;
    } catch (e) {
      console.warn("Settings saved locally only:", e.message);
      return next;
    }
  },
};
