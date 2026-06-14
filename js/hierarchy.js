/**
 * Ministry hierarchy — reads from Settings (editable by главный администратор).
 */

/** Reads from Settings after Settings.load() */
function getMinistries() {
  return typeof Settings !== "undefined" ? Settings.getMinistries() : DEFAULT_MINISTRIES;
}

function getMinistryById(id) {
  return getMinistries().find((m) => m.id === id);
}

function renderHierarchy(container) {
  if (!container) return;
  container.innerHTML = getMinistries()
    .map(
      (m) => `
    <div class="ministry-block" data-ministry="${m.id}">
      <h4>${escapeHtmlText(m.name)}</h4>
      <ul class="role-list">
        ${m.roles.map((r) => `<li>${escapeHtmlText(r.title)}</li>`).join("")}
      </ul>
    </div>`
    )
    .join("");
}

function getRoleOptions() {
  const options = [];
  getMinistries().forEach((m) => {
    m.roles.forEach((r) => {
      options.push({ value: `${m.id}:${r.id}`, label: `${m.name} — ${r.title}` });
    });
  });
  return options;
}

function escapeHtmlText(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
