/**
 * REST API client. Falls back to localStorage demo when backend is unavailable.
 */
const LocalStore = {
  applications: "mgp_applications",
  complaints: "mgp_complaints",
  logs: "mgp_logs",

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  },

  set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  append(key, item) {
    const list = this.get(key);
    list.unshift({ ...item, id: Date.now(), created_at: new Date().toISOString(), status: "new" });
    this.set(key, list);
    this.appendLog(`LOCAL: created ${key.slice(4, -1)} #${list[0].id}`);
    return list[0];
  },

  appendLog(message) {
    const logs = this.get(this.logs);
    logs.unshift({ id: Date.now(), message, created_at: new Date().toISOString(), actor: "system" });
    this.set(this.logs, logs.slice(0, 200));
  },
};

async function apiRequest(path, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json", ...options.headers };

  const session = Auth.getSession();
  if (session?.fullName) {
    headers["X-User-Name"] = session.fullName;
    headers["X-User-Role"] = Auth.getPrimaryRole(session);
    if (session.siteRole) headers["X-User-Site-Role"] = session.siteRole;
    if (session.gameRole) headers["X-User-Game-Role"] = session.gameRole;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const API = {
  async createApplication(data) {
    if (CONFIG.USE_LOCAL_FALLBACK) {
      return LocalStore.append(LocalStore.applications, data);
    }
    try {
      return await apiRequest("/api/applications", { method: "POST", body: JSON.stringify(data) });
    } catch (e) {
      console.warn("API unavailable, using local fallback:", e.message);
      return LocalStore.append(LocalStore.applications, data);
    }
  },

  async getApplications() {
    if (CONFIG.USE_LOCAL_FALLBACK) {
      return LocalStore.get(LocalStore.applications);
    }
    try {
      return await apiRequest("/api/applications");
    } catch {
      return LocalStore.get(LocalStore.applications);
    }
  },

  async updateApplicationStatus(id, status) {
    if (CONFIG.USE_LOCAL_FALLBACK) {
      const list = LocalStore.get(LocalStore.applications);
      const idx = list.findIndex((a) => a.id == id);
      if (idx >= 0) list[idx].status = status;
      LocalStore.set(LocalStore.applications, list);
      LocalStore.appendLog(`Application #${id} → ${status}`);
      return list[idx];
    }
    return apiRequest(`/api/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async createComplaint(data) {
    if (CONFIG.USE_LOCAL_FALLBACK) {
      return LocalStore.append(LocalStore.complaints, data);
    }
    try {
      return await apiRequest("/api/complaints", { method: "POST", body: JSON.stringify(data) });
    } catch (e) {
      console.warn("API unavailable, using local fallback:", e.message);
      return LocalStore.append(LocalStore.complaints, data);
    }
  },

  async getComplaints() {
    if (CONFIG.USE_LOCAL_FALLBACK) {
      return LocalStore.get(LocalStore.complaints);
    }
    try {
      return await apiRequest("/api/complaints");
    } catch {
      return LocalStore.get(LocalStore.complaints);
    }
  },

  async updateComplaintStatus(id, status) {
    if (CONFIG.USE_LOCAL_FALLBACK) {
      const list = LocalStore.get(LocalStore.complaints);
      const idx = list.findIndex((c) => c.id == id);
      if (idx >= 0) list[idx].status = status;
      LocalStore.set(LocalStore.complaints, list);
      LocalStore.appendLog(`Complaint #${id} → ${status}`);
      return list[idx];
    }
    return apiRequest(`/api/complaints/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async getLogs() {
    if (CONFIG.USE_LOCAL_FALLBACK) {
      return LocalStore.get(LocalStore.logs);
    }
    try {
      return await apiRequest("/api/logs");
    } catch {
      return LocalStore.get(LocalStore.logs);
    }
  },

  async assignRole(data) {
    if (CONFIG.USE_LOCAL_FALLBACK) {
      LocalStore.appendLog(`Role assigned: ${data.user_name} → ${data.role_title} (${data.ministry_id})`);
      return { success: true, ...data };
    }
    return apiRequest("/api/roles", { method: "POST", body: JSON.stringify(data) });
  },
};

function showToast(message, type = "success") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU");
}

function statusBadge(status, type = "application") {
  const label =
    typeof Settings !== "undefined"
      ? Settings.getStatusLabel(type, status)
      : status || "Новое";
  const css =
    typeof Settings !== "undefined"
      ? Settings.getStatusCss(type, status)
      : `status-${status || "new"}`;
  return `<span class="status-badge ${css}">${label}</span>`;
}
