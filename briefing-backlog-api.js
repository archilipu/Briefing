const SESSION_KEY = "briefing-backlog-api-session";
const TAB_KEY = "briefing-backlog-api-tab";
const TRACKING_KEY = "briefing-backlog-api-tracking";

const BRIEFING_STATUS_LABELS = {
  open: "Abierto",
  closed: "Cerrado",
  held: "Celebrado",
  archived: "Archivado"
};

const TOPIC_STATUS_LABELS = {
  pending: "Pendiente",
  treated: "Tratado",
  postponed: "Aplazado",
  other_forum: "Otro foro"
};

const refs = {
  loginScreen: document.getElementById("loginScreen"),
  appScreen: document.getElementById("appScreen"),
  employeeLoginForm: document.getElementById("employeeLoginForm"),
  adminLoginForm: document.getElementById("adminLoginForm"),
  loginMessage: document.getElementById("loginMessage"),
  sessionBadge: document.getElementById("sessionBadge"),
  sessionLabel: document.getElementById("sessionLabel"),
  logoutButton: document.getElementById("logoutButton"),
  tabs: document.getElementById("tabs"),
  publicBriefingEdition: document.getElementById("publicBriefingEdition"),
  publicBriefingTitle: document.getElementById("publicBriefingTitle"),
  publicVotingDeadline: document.getElementById("publicVotingDeadline"),
  publicVotingStatus: document.getElementById("publicVotingStatus"),
  topicForm: document.getElementById("topicForm"),
  publicTopicBoard: document.getElementById("publicTopicBoard"),
  briefingForm: document.getElementById("briefingForm"),
  adminBriefingList: document.getElementById("adminBriefingList"),
  employeeForm: document.getElementById("employeeForm"),
  employeeBulkForm: document.getElementById("employeeBulkForm"),
  employeeCount: document.getElementById("employeeCount"),
  employeeList: document.getElementById("employeeList"),
  trackingBriefingSelect: document.getElementById("trackingBriefingSelect"),
  trackingBoard: document.getElementById("trackingBoard"),
  screens: Array.from(document.querySelectorAll("[data-screen]")),
  emptyStateTemplate: document.getElementById("emptyStateTemplate")
};

let session = loadSession();
let activeTab = localStorage.getItem(TAB_KEY) || "voting";
let trackingBriefingId = localStorage.getItem(TRACKING_KEY) || "";
let publicState = { briefing: null, topics: [] };
let adminState = { briefings: [], employees: [], trackingTopics: [] };

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistUi() {
  localStorage.setItem(TAB_KEY, activeTab);
  localStorage.setItem(TRACKING_KEY, trackingBriefingId);
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function normalizeEmployeeId(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function getVotingState(briefing) {
  if (!briefing) return { open: false, label: "Sin briefing", tone: "archived" };
  if (briefing.status !== "open") {
    return {
      open: false,
      label: `Votacion ${BRIEFING_STATUS_LABELS[briefing.status].toLowerCase()}`,
      tone: briefing.status
    };
  }
  if (new Date(briefing.voting_ends_at || briefing.votingEndsAt).getTime() <= Date.now()) {
    return { open: false, label: "Votacion cerrada por fecha", tone: "closed" };
  }
  return { open: true, label: "Votacion abierta", tone: "open" };
}

function setLoginMessage(message, isError = false) {
  refs.loginMessage.textContent = message;
  refs.loginMessage.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function describeBackendBase() {
  return String(window.BRIEFING_API_BASE || "").trim() || "(vacio)";
}

function renderEmpty(container, message) {
  container.innerHTML = "";
  const node = refs.emptyStateTemplate.content.cloneNode(true);
  node.querySelector("p").textContent = message;
  container.appendChild(node);
}

function setTopicFormEnabled(enabled) {
  Array.from(refs.topicForm.elements).forEach((element) => {
    element.disabled = !enabled;
  });
}

async function api(path, options = {}) {
  const baseUrl = String(window.BRIEFING_API_BASE || "").trim().replace(/\/+$/, "");
  if (!baseUrl || baseUrl.includes("REPLACE_WITH_BACKEND_URL")) {
    throw new Error("Configura briefing-config.js con la URL del backend.");
  }

  const requestPath = path.startsWith("/") ? path : `/${path}`;
  const requestUrl = `${baseUrl}${requestPath}`;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (session?.sessionToken) {
    headers.set("Authorization", `Bearer ${session.sessionToken}`);
  }

  let response;
  try {
    response = await fetch(requestUrl, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (error) {
    throw new Error(`${error.message} [request: ${requestUrl}]`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}

async function loadSessionFromApi() {
  if (!session?.sessionToken) return;
  const { session: remoteSession } = await api("/api/auth/me");
  session = {
    sessionToken: session.sessionToken,
    role: remoteSession.role,
    employeeId: remoteSession.employeeId,
    username: remoteSession.username
  };
}

async function refreshData() {
  persistUi();
  renderShell();
  if (!session) return;

  const publicPayload = await api("/api/public/briefing");
  publicState = publicPayload;
  renderVotingScreen();

  if (session.role === "admin") {
    const [{ briefings }, { employees }] = await Promise.all([
      api("/api/admin/briefings"),
      api("/api/admin/employees")
    ]);

    adminState.briefings = briefings;
    adminState.employees = employees.filter((employee) => employee.is_active);

    if (!briefings.some((briefing) => briefing.id === trackingBriefingId)) {
      trackingBriefingId = briefings[0]?.id || "";
    }

    if (trackingBriefingId) {
      const { topics } = await api(`/api/admin/tracking/briefings/${trackingBriefingId}`);
      adminState.trackingTopics = topics;
    } else {
      adminState.trackingTopics = [];
    }

    renderAdminScreen();
    renderTrackingScreen();
  }
}

function renderShell() {
  const isLogged = Boolean(session);
  refs.loginScreen.classList.toggle("hidden", isLogged);
  refs.appScreen.classList.toggle("hidden", !isLogged);

  if (!isLogged) {
    setLoginMessage("Introduce tu numero de empleado o accede como admin.");
    return;
  }

  refs.sessionBadge.textContent = session.role === "admin" ? "Administrador" : "Empleado";
  refs.sessionLabel.textContent = session.role === "admin" ? session.username : `Empleado ${session.employeeId}`;

  refs.tabs.querySelectorAll("[data-admin-only]").forEach((tab) => {
    tab.classList.toggle("hidden", session.role !== "admin");
  });

  if (session.role !== "admin" && activeTab !== "voting") {
    activeTab = "voting";
  }

  refs.tabs.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === activeTab);
  });

  refs.screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === activeTab);
  });
}

function renderVotingScreen() {
  const briefing = publicState.briefing;
  if (!briefing) {
    refs.publicBriefingEdition.textContent = "Briefing";
    refs.publicBriefingTitle.textContent = "Briefing";
    refs.publicVotingDeadline.textContent = "Fin votacion: -";
    refs.publicVotingStatus.textContent = "Sin briefing";
    refs.publicVotingStatus.className = "pill archived";
    setTopicFormEnabled(false);
    renderEmpty(refs.publicTopicBoard, "No hay sesiones activas.");
    return;
  }

  const votingState = getVotingState(briefing);
  const employeeMode = session?.role === "employee";

  refs.publicBriefingEdition.textContent = briefing.edition;
  refs.publicBriefingTitle.textContent = "Briefing";
  refs.publicVotingDeadline.textContent = `Fin votacion: ${formatDateTime(briefing.voting_ends_at || briefing.votingEndsAt)}`;
  refs.publicVotingStatus.textContent = votingState.label;
  refs.publicVotingStatus.className = `pill ${votingState.tone}`;
  setTopicFormEnabled(employeeMode && votingState.open);

  const topics = (publicState.topics || []).filter((topic) => topic.status === "pending");
  if (!topics.length) {
    renderEmpty(refs.publicTopicBoard, "No hay temas pendientes para votar.");
    return;
  }

  refs.publicTopicBoard.innerHTML = topics
    .map((topic, index) => {
      const disabled = !employeeMode || !votingState.open || topic.user_has_voted;

      return `
        <div class="table-row">
          <span>${index + 1}</span>
          <div class="row-title">
            <strong>${escapeHtml(topic.title)}</strong>
            <small>${escapeHtml(topic.description)}</small>
          </div>
          <span>${topic.vote_count}</span>
          <div class="row-actions">
            <button type="button" class="ghost" data-action="vote-topic" data-topic-id="${topic.id}" ${disabled ? "disabled" : ""}>
              ${topic.user_has_voted ? "Votado" : "Votar"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAdminScreen() {
  if (!adminState.briefings.length) {
    renderEmpty(refs.adminBriefingList, "No hay briefings creados.");
  } else {
    refs.adminBriefingList.innerHTML = adminState.briefings
      .map((briefing) => `
        <div class="briefing-item">
          <div>
            <strong>${escapeHtml(briefing.edition)}</strong>
            <p>${formatDateTime(briefing.briefing_at)} - ${briefing.topic_count} temas - ${briefing.vote_count} votos</p>
          </div>
          <div class="button-row">
            <span class="pill ${briefing.status}">${BRIEFING_STATUS_LABELS[briefing.status]}</span>
            <button type="button" class="ghost" data-action="set-briefing-status" data-briefing-id="${briefing.id}" data-status="open">Abrir</button>
            <button type="button" class="ghost" data-action="set-briefing-status" data-briefing-id="${briefing.id}" data-status="closed">Cerrar</button>
            <button type="button" class="ghost" data-action="set-briefing-status" data-briefing-id="${briefing.id}" data-status="held">Celebrado</button>
            <button type="button" class="quiet" data-action="set-briefing-status" data-briefing-id="${briefing.id}" data-status="archived">Archivar</button>
            <button type="button" class="danger" data-action="delete-briefing" data-briefing-id="${briefing.id}">Eliminar</button>
          </div>
        </div>
      `)
      .join("");
  }

  refs.employeeCount.textContent = `${adminState.employees.length} empleados autorizados`;
  if (!adminState.employees.length) {
    renderEmpty(refs.employeeList, "No hay empleados activos.");
    return;
  }

  refs.employeeList.innerHTML = adminState.employees
    .map((employee) => `
      <div class="employee-item">
        <span>${escapeHtml(employee.external_auth_id)}</span>
        <button type="button" class="danger" data-action="remove-employee" data-employee-id="${employee.external_auth_id}">Baja</button>
      </div>
    `)
    .join("");
}

function renderTrackingScreen() {
  refs.trackingBriefingSelect.innerHTML = adminState.briefings
    .map((briefing) => `<option value="${briefing.id}">${escapeHtml(briefing.edition)} - ${BRIEFING_STATUS_LABELS[briefing.status]}</option>`)
    .join("");

  if (trackingBriefingId) {
    refs.trackingBriefingSelect.value = trackingBriefingId;
  }

  if (!adminState.trackingTopics.length) {
    renderEmpty(refs.trackingBoard, "No hay temas en este briefing.");
    return;
  }

  refs.trackingBoard.innerHTML = adminState.trackingTopics
    .map((topic) => `
      <div class="tracking-item">
        <div>
          <strong>${escapeHtml(topic.title)}</strong>
          <p>${escapeHtml(topic.description)} - ${topic.vote_count} votos</p>
        </div>
        <div class="button-row">
          <span class="pill ${topic.status}">${TOPIC_STATUS_LABELS[topic.status]}</span>
          <button type="button" class="ghost" data-action="set-topic-status" data-topic-id="${topic.id}" data-status="pending">Pendiente</button>
          <button type="button" class="ghost" data-action="set-topic-status" data-topic-id="${topic.id}" data-status="treated">Tratado</button>
          <button type="button" class="ghost" data-action="set-topic-status" data-topic-id="${topic.id}" data-status="postponed">Aplazado</button>
          <button type="button" class="quiet" data-action="set-topic-status" data-topic-id="${topic.id}" data-status="other_forum">Otro foro</button>
        </div>
      </div>
    `)
    .join("");
}

async function bootstrap() {
  try {
    if (session?.sessionToken) {
      await loadSessionFromApi();
    }
    await refreshData();
  } catch (error) {
    session = null;
    persistUi();
    renderShell();
    setLoginMessage(`${error.message} [backend: ${describeBackendBase()}]`, true);
  }
}

refs.employeeLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = refs.employeeLoginForm;
  try {
    const employeeId = normalizeEmployeeId(new FormData(form).get("employeeId"));
    const data = await api("/api/auth/login/employee", {
      method: "POST",
      body: { employeeId }
    });

    session = {
      sessionToken: data.sessionToken,
      role: data.role,
      employeeId: data.employeeId
    };
    activeTab = "voting";
    form?.reset();
    await refreshData();
  } catch (error) {
    setLoginMessage(`${error.message} [backend: ${describeBackendBase()}]`, true);
  }
});

refs.adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = refs.adminLoginForm;
  try {
    const formData = new FormData(form);
    const data = await api("/api/auth/login/admin", {
      method: "POST",
      body: {
        username: String(formData.get("username") || "").trim(),
        password: String(formData.get("password") || "")
      }
    });

    session = {
      sessionToken: data.sessionToken,
      role: data.role,
      username: data.username
    };
    activeTab = "admin";
    form?.reset();
    await refreshData();
  } catch (error) {
    setLoginMessage(`${error.message} [backend: ${describeBackendBase()}]`, true);
  }
});

refs.logoutButton.addEventListener("click", async () => {
  try {
    if (session?.sessionToken) {
      await api("/api/auth/logout", { method: "POST" });
    }
  } catch {
    // ignore and clear client session anyway
  }

  session = null;
  publicState = { briefing: null, topics: [] };
  adminState = { briefings: [], employees: [], trackingTopics: [] };
  persistUi();
  renderShell();
});

refs.tabs.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-tab]");
  if (!button || button.classList.contains("hidden")) return;
  activeTab = button.dataset.tab;
  persistUi();
  renderShell();
});

refs.topicForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!publicState.briefing) return;
  const form = refs.topicForm;
  try {
    const formData = new FormData(form);
    await api("/api/public/topics", {
      method: "POST",
      body: {
        briefingId: publicState.briefing.id,
        title: String(formData.get("title") || "").trim(),
        description: String(formData.get("description") || "").trim()
      }
    });

    form?.reset();
    await refreshData();
  } catch (error) {
    alert(error.message);
  }
});

refs.publicTopicBoard.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='vote-topic']");
  if (!button || !publicState.briefing) return;
  try {
    await api("/api/public/votes", {
      method: "POST",
      body: {
        briefingId: publicState.briefing.id,
        topicId: button.dataset.topicId
      }
    });
    await refreshData();
  } catch (error) {
    alert(error.message);
  }
});

refs.briefingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = refs.briefingForm;
  const formData = new FormData(form);
  try {
    await api("/api/admin/briefings", {
      method: "POST",
      body: {
        name: String(formData.get("name") || "").trim(),
        edition: String(formData.get("edition") || "").trim(),
        briefingAt: new Date(String(formData.get("briefingDate") || "")).toISOString(),
        votingEndsAt: new Date(String(formData.get("votingEndsAt") || "")).toISOString(),
        status: String(formData.get("status") || "open")
      }
    });

    form?.reset();
    await refreshData();
  } catch (error) {
    alert(error.message);
  }
});

refs.adminBriefingList.addEventListener("click", async (event) => {
  const statusButton = event.target.closest("button[data-action='set-briefing-status']");
  if (statusButton) {
    const briefing = adminState.briefings.find((item) => item.id === statusButton.dataset.briefingId);
    if (!briefing) return;
    try {
      await api(`/api/admin/briefings/${briefing.id}`, {
        method: "PATCH",
        body: {
          status: statusButton.dataset.status
        }
      });
      await refreshData();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  const deleteButton = event.target.closest("button[data-action='delete-briefing']");
  if (!deleteButton) return;
  if (!confirm("Se eliminara la sesion de briefing y sus temas asociados. ¿Quieres continuar?")) return;
  try {
    await api(`/api/admin/briefings/${deleteButton.dataset.briefingId}`, { method: "DELETE" });
    if (trackingBriefingId === deleteButton.dataset.briefingId) {
      trackingBriefingId = "";
    }
    await refreshData();
  } catch (error) {
    alert(error.message);
  }
});

refs.employeeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = refs.employeeForm;
  try {
    const employeeId = normalizeEmployeeId(new FormData(form).get("employeeId"));
    await api("/api/admin/employees", {
      method: "POST",
      body: { employeeId }
    });
    form?.reset();
    await refreshData();
  } catch (error) {
    alert(error.message);
  }
});

refs.employeeBulkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = refs.employeeBulkForm;
  try {
    const raw = String(new FormData(form).get("employeeIds") || "");
    const employeeIds = raw
      .split(/\r?\n/)
      .map(normalizeEmployeeId)
      .filter(Boolean);

    await api("/api/admin/employees/bulk", {
      method: "POST",
      body: { employeeIds }
    });
    form?.reset();
    await refreshData();
  } catch (error) {
    alert(error.message);
  }
});

refs.employeeList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='remove-employee']");
  if (!button) return;
  try {
    await api(`/api/admin/employees/${button.dataset.employeeId}`, {
      method: "DELETE"
    });
    await refreshData();
  } catch (error) {
    alert(error.message);
  }
});

refs.trackingBriefingSelect.addEventListener("change", async (event) => {
  trackingBriefingId = event.target.value;
  persistUi();
  try {
    const { topics } = await api(`/api/admin/tracking/briefings/${trackingBriefingId}`);
    adminState.trackingTopics = topics;
    renderTrackingScreen();
  } catch (error) {
    alert(error.message);
  }
});

refs.trackingBoard.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='set-topic-status']");
  if (!button) return;
  try {
    await api(`/api/admin/topics/${button.dataset.topicId}`, {
      method: "PATCH",
      body: { status: button.dataset.status }
    });
    const { topics } = await api(`/api/admin/tracking/briefings/${trackingBriefingId}`);
    adminState.trackingTopics = topics;
    renderTrackingScreen();
  } catch (error) {
    alert(error.message);
  }
});

bootstrap();
