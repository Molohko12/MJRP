/**
 * Site management panel (главный администратор).
 */
const SiteAdmin = {
  init() {
    if (!Auth.isSuperAdmin()) return;

    document.getElementById("site-manage-tabs")?.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (!tab) return;
      this.switchTab(tab.dataset.tab);
    });

    document.getElementById("add-ministry-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.addMinistry(e.target);
    });

    document.getElementById("add-app-status-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.addStatus("application", e.target);
    });

    document.getElementById("add-complaint-status-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.addStatus("complaint", e.target);
    });

    document.getElementById("save-hierarchy-btn")?.addEventListener("click", () => this.saveHierarchy());
    document.getElementById("save-app-statuses-btn")?.addEventListener("click", () => this.saveStatuses("application"));
    document.getElementById("save-complaint-statuses-btn")?.addEventListener("click", () => this.saveStatuses("complaint"));
  },

  switchTab(name) {
    document.querySelectorAll("[data-tab]").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll("[data-tab-panel]").forEach((p) => {
      p.classList.toggle("hidden", p.dataset.tabPanel !== name);
    });
  },

  renderAll() {
    if (!Auth.isSuperAdmin()) return;
    this.switchTab("hierarchy");
    this.renderHierarchyEditor();
    this.renderStatusEditor("application");
    this.renderStatusEditor("complaint");
  },

  renderHierarchyEditor() {
    const container = document.getElementById("hierarchy-editor");
    if (!container) return;

    const ministries = Settings.getMinistries();
    container.innerHTML = ministries
      .map(
        (m, mi) => `
      <div class="editor-block" data-ministry-idx="${mi}">
        <div class="editor-row">
          <input type="text" class="ministry-name" value="${esc(m.name)}" data-field="name">
          <button type="button" class="btn btn-sm btn-danger" onclick="SiteAdmin.removeMinistry(${mi})">Удалить</button>
        </div>
        <ul class="editor-role-list">
          ${m.roles
            .map(
              (r, ri) => `
            <li class="editor-row">
              <input type="text" value="${esc(r.title)}" data-role-idx="${ri}" class="role-title">
              <button type="button" class="btn btn-sm btn-secondary" onclick="SiteAdmin.removeRole(${mi}, ${ri})">×</button>
            </li>`
            )
            .join("")}
        </ul>
        <button type="button" class="btn btn-sm btn-secondary" onclick="SiteAdmin.addRole(${mi})">+ Должность</button>
      </div>`
      )
      .join("");
  },

  collectHierarchyFromDom() {
    const blocks = document.querySelectorAll("#hierarchy-editor .editor-block");
    const ministries = Settings.getMinistries().map((m, i) => ({ ...m }));

    blocks.forEach((block) => {
      const idx = Number(block.dataset.ministryIdx);
      ministries[idx].name = block.querySelector(".ministry-name").value.trim();
      ministries[idx].roles = [...block.querySelectorAll(".role-title")].map((input, ri) => {
        const existing = ministries[idx].roles[ri];
        return {
          id: existing?.id || `role_${Date.now()}_${ri}`,
          title: input.value.trim(),
          level: existing?.level || 50,
        };
      });
    });
    return ministries;
  },

  async saveHierarchy() {
    const ministries = this.collectHierarchyFromDom();
    await Settings.save({ ministries });
    renderHierarchy(document.getElementById("hierarchy-container"));
    populateAuditRoles?.();
    showToast("Состав правительства сохранён", "success");
    this.renderHierarchyEditor();
  },

  addMinistry(form) {
    const name = form.name.value.trim();
    if (!name) return;
    const id = "ministry_" + Date.now();
    const ministries = [...Settings.getMinistries(), { id, name, roles: [] }];
    Settings.save({ ministries }).then(() => {
      form.reset();
      this.renderHierarchyEditor();
      showToast("Министерство добавлено", "success");
    });
  },

  async removeMinistry(idx) {
    if (!confirm("Удалить министерство?")) return;
    const ministries = Settings.getMinistries().filter((_, i) => i !== idx);
    await Settings.save({ ministries });
    this.renderHierarchyEditor();
    renderHierarchy(document.getElementById("hierarchy-container"));
    showToast("Министерство удалено", "success");
  },

  async addRole(ministryIdx) {
    const ministries = JSON.parse(JSON.stringify(Settings.getMinistries()));
    ministries[ministryIdx].roles.push({
      id: `role_${Date.now()}`,
      title: "Новая должность",
      level: 50,
    });
    await Settings.save({ ministries });
    this.renderHierarchyEditor();
  },

  async removeRole(ministryIdx, roleIdx) {
    const ministries = JSON.parse(JSON.stringify(Settings.getMinistries()));
    ministries[ministryIdx].roles.splice(roleIdx, 1);
    await Settings.save({ ministries });
    this.renderHierarchyEditor();
  },

  renderStatusEditor(type) {
    const listId = type === "application" ? "app-status-list" : "complaint-status-list";
    const container = document.getElementById(listId);
    if (!container) return;

    const statuses =
      type === "application" ? Settings.getApplicationStatuses() : Settings.getComplaintStatuses();

    container.innerHTML = statuses
      .map(
        (s, i) => `
      <div class="editor-row status-row" data-status-idx="${i}">
        <input type="text" value="${esc(s.id)}" placeholder="id" class="status-id" ${s.isInitial ? "readonly" : ""}>
        <input type="text" value="${esc(s.label)}" placeholder="Название" class="status-label">
        <input type="text" value="${esc(s.actionLabel || "")}" placeholder="Кнопка (жалобы)" class="status-action">
        ${s.isInitial ? "" : `<button type="button" class="btn btn-sm btn-danger" onclick="SiteAdmin.removeStatus('${type}', ${i})">×</button>`}
      </div>`
      )
      .join("");
  },

  collectStatusesFromDom(type) {
    const listId = type === "application" ? "app-status-list" : "complaint-status-list";
    const rows = document.querySelectorAll(`#${listId} .status-row`);
    const existing =
      type === "application" ? Settings.getApplicationStatuses() : Settings.getComplaintStatuses();

    return [...rows].map((row, i) => ({
      ...existing[i],
      id: row.querySelector(".status-id").value.trim(),
      label: row.querySelector(".status-label").value.trim(),
      actionLabel: row.querySelector(".status-action")?.value.trim() || undefined,
      cssClass: existing[i]?.cssClass || "status-new",
      isInitial: existing[i]?.isInitial || false,
    }));
  },

  async saveStatuses(type) {
    const key = type === "application" ? "applicationStatuses" : "complaintStatuses";
    const statuses = this.collectStatusesFromDom(type);
    await Settings.save({ [key]: statuses });
    showToast("Статусы сохранены", "success");
    this.renderStatusEditor(type);
    if (typeof loadApplications === "function") loadApplications();
    if (typeof loadComplaints === "function") loadComplaints();
  },

  async addStatus(type, form) {
    const id = form.id.value.trim();
    const label = form.label.value.trim();
    if (!id || !label) return;

    const key = type === "application" ? "applicationStatuses" : "complaintStatuses";
    const statuses = [...(type === "application" ? Settings.getApplicationStatuses() : Settings.getComplaintStatuses())];
    if (statuses.some((s) => s.id === id)) {
      showToast("Статус с таким ID уже существует", "error");
      return;
    }
    statuses.push({ id, label, cssClass: "status-review", actionLabel: form.actionLabel?.value.trim() });
    await Settings.save({ [key]: statuses });
    form.reset();
    this.renderStatusEditor(type);
    showToast("Статус добавлен", "success");
  },

  async removeStatus(type, idx) {
    const key = type === "application" ? "applicationStatuses" : "complaintStatuses";
    const statuses = (type === "application" ? Settings.getApplicationStatuses() : Settings.getComplaintStatuses()).filter(
      (_, i) => i !== idx
    );
    await Settings.save({ [key]: statuses });
    this.renderStatusEditor(type);
  },
};

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

function populateAuditRoles() {
  const select = document.getElementById("audit_role");
  if (!select) return;
  select.innerHTML = getRoleOptions()
    .map((o) => `<option value="${o.value}">${o.label}</option>`)
    .join("");
}
