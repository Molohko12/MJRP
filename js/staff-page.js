/**
 * Staff dashboard logic for page3.html
 */
(function () {
  const authGate = document.getElementById("auth-gate");
  const dashboard = document.getElementById("staff-dashboard");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const sidebarNav = document.getElementById("sidebar-nav");

  async function showDashboard() {
    const session = Auth.getSession();
    if (!session) return;

    await Settings.load();

    authGate.classList.add("hidden");
    dashboard.classList.remove("hidden");

    document.getElementById("user-name").textContent = session.fullName;
    document.getElementById("user-role").textContent = Auth.getRoleDisplay(session);

    applyPermissions();
    renderHierarchy(document.getElementById("hierarchy-container"));
    populateAuditRoles();
    SiteAdmin.renderAll();
    switchSection("hierarchy");
    loadComplaints();
    loadApplications();
    loadLogs();
  }

  function applyPermissions() {
    sidebarNav.querySelectorAll("button").forEach((btn) => {
      const section = btn.dataset.section;
      const allowed = Auth.hasPermission(section);
      btn.closest("li").style.display = allowed ? "" : "none";
    });
  }

  function switchSection(name) {
    document.querySelectorAll(".panel-section").forEach((s) => s.classList.remove("active"));
    document.querySelectorAll(".sidebar-nav button").forEach((b) => b.classList.remove("active"));

    const section = document.getElementById(`section-${name}`);
    const btn = sidebarNav.querySelector(`[data-section="${name}"]`);
    if (section) section.classList.add("active");
    if (btn) btn.classList.add("active");
  }

  sidebarNav.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-section]");
    if (!btn) return;
    const section = btn.dataset.section;
    if (!Auth.hasPermission(section)) {
      showToast("Недостаточно прав для этого раздела", "error");
      return;
    }
    switchSection(section);
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fullName = document.getElementById("fullName").value;
    const position = document.getElementById("position").value;
    Auth.login(fullName, position);
    showToast(`Добро пожаловать, ${fullName}`, "success");
    showDashboard();
  });

  logoutBtn.addEventListener("click", () => {
    Auth.logout();
    dashboard.classList.add("hidden");
    authGate.classList.remove("hidden");
    loginForm.reset();
  });

  document.getElementById("audit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!Auth.hasPermission("audit")) {
      showToast("Недостаточно прав", "error");
      return;
    }
    const userName = document.getElementById("audit_user").value.trim();
    const [ministryId, roleId] = document.getElementById("audit_role").value.split(":");
    const ministry = getMinistryById(ministryId);
    const role = ministry?.roles.find((r) => r.id === roleId);

    try {
      await API.assignRole({
        user_name: userName,
        ministry_id: ministryId,
        role_id: roleId,
        role_title: role?.title || roleId,
        ministry_name: ministry?.name || ministryId,
      });
      document.getElementById("audit-result").innerHTML =
        `<p style="color: var(--success);">Роль «${role?.title}» назначена для ${userName}</p>`;
      showToast("Роль успешно назначена", "success");
      loadLogs();
      e.target.reset();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  function buildComplaintActions(complaint) {
    const statuses = Settings.getComplaintStatuses();
    const actions = [];

    const inProgress = statuses.find((s) => s.id === "in_progress");
    const closed = statuses.find((s) => s.id === "closed");

    if (inProgress && complaint.status !== "in_progress") {
      actions.push(
        `<button type="button" class="btn btn-sm btn-secondary" data-action="status" data-id="${complaint.id}" data-status="in_progress">${inProgress.actionLabel || inProgress.label}</button>`
      );
    }
    if (closed && complaint.status !== "closed") {
      actions.push(
        `<button type="button" class="btn btn-sm btn-success" data-action="status" data-id="${complaint.id}" data-status="closed">${closed.actionLabel || closed.label}</button>`
      );
    }

    statuses
      .filter((s) => !s.isInitial && s.id !== "in_progress" && s.id !== "closed" && s.id !== complaint.status)
      .forEach((s) => {
        actions.push(
          `<button type="button" class="btn btn-sm btn-secondary" data-action="status" data-id="${complaint.id}" data-status="${s.id}">${s.actionLabel || s.label}</button>`
        );
      });

    return actions.join(" ");
  }

  function buildApplicationActions(application) {
    const statuses = Settings.getApplicationStatuses();
    return statuses
      .filter((s) => !s.isInitial && s.id !== application.status)
      .map(
        (s) =>
          `<button type="button" class="btn btn-sm ${s.id === "rejected" ? "btn-danger" : "btn-success"}" data-action="status" data-id="${application.id}" data-status="${s.id}" data-type="application">${s.actionLabel || s.label}</button>`
      )
      .join(" ");
  }

  async function loadComplaints() {
    const container = document.getElementById("complaints-table");
    if (!container || !Auth.hasPermission("complaints")) return;

    const items = await API.getComplaints();
    if (!items.length) {
      container.innerHTML = '<div class="empty-state">Жалоб пока нет</div>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Заявитель</th>
            <th>Объект</th>
            <th>Инцидент</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (c) => `
            <tr data-complaint-id="${c.id}">
              <td>${formatDate(c.created_at)}</td>
              <td>${escapeHtml(c.complainant_name)}</td>
              <td>${escapeHtml(c.target_employee)}</td>
              <td>${escapeHtml((c.description || "").slice(0, 60))}${(c.description || "").length > 60 ? "…" : ""}</td>
              <td class="status-cell">${statusBadge(c.status, "complaint")}</td>
              <td class="actions-cell">${buildComplaintActions(c)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;

    container.querySelectorAll("[data-action=status]").forEach((btn) => {
      btn.addEventListener("click", () => updateComplaint(Number(btn.dataset.id), btn.dataset.status));
    });
  }

  async function loadApplications() {
    const container = document.getElementById("applications-table");
    if (!container || !Auth.hasPermission("applications")) return;

    const items = await API.getApplications();
    if (!items.length) {
      container.innerHTML = '<div class="empty-state">Заявлений пока нет</div>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>ФИО</th>
            <th>Должность</th>
            <th>Опыт</th>
            <th>Контакт</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (a) => `
            <tr data-application-id="${a.id}">
              <td>${formatDate(a.created_at)}</td>
              <td>${escapeHtml(a.applicant_name)}</td>
              <td>${escapeHtml(a.position)}</td>
              <td>${escapeHtml(a.experience)}</td>
              <td>${escapeHtml(a.contact)}</td>
              <td class="status-cell">${statusBadge(a.status, "application")}</td>
              <td class="actions-cell">${buildApplicationActions(a)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;

    container.querySelectorAll("[data-action=status]").forEach((btn) => {
      btn.addEventListener("click", () => updateApplication(Number(btn.dataset.id), btn.dataset.status));
    });
  }

  async function loadLogs() {
    const container = document.getElementById("logs-list");
    if (!container || !Auth.hasPermission("logs")) return;

    const logs = await API.getLogs();
    if (!logs.length) {
      container.innerHTML = '<div class="empty-state">Логов пока нет</div>';
      return;
    }

    container.innerHTML = logs
      .map(
        (l) => `
      <div class="log-entry">
        <span class="log-time">${formatDate(l.created_at)}</span>
        <span>${escapeHtml(l.message || l.action || JSON.stringify(l))}</span>
        ${l.actor ? `<span style="color: var(--text-muted);"> — ${escapeHtml(l.actor)}</span>` : ""}
      </div>`
      )
      .join("");
  }

  window.updateComplaint = async (id, status) => {
    try {
      await API.updateComplaintStatus(id, status);
      const label = Settings.getStatusLabel("complaint", status);
      showToast(`Статус жалобы: «${label}»`, "success");
      await loadComplaints();
      loadLogs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  window.updateApplication = async (id, status) => {
    try {
      await API.updateApplicationStatus(id, status);
      const label = Settings.getStatusLabel("application", status);
      showToast(`Статус заявления: «${label}»`, "success");
      await loadApplications();
      loadLogs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  window.loadApplications = loadApplications;
  window.loadComplaints = loadComplaints;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  SiteAdmin.init();

  if (Auth.isAuthenticated()) {
    showDashboard();
  }
})();
