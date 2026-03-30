const STORAGE_KEY = "briefing-backlog-demo-v3";
const SESSION_KEY = "briefing-backlog-session-v1";
const TAB_KEY = "briefing-backlog-tab-v1";
const TRACKING_KEY = "briefing-backlog-tracking-v1";

const ADMIN_USER = "lomartin";
const ADMIN_PASSWORD = "12,Briefing?";

const EMPLOYEE_SEED = [
  "130053", "7243", "261323", "166249", "139", "451", "470", "1069", "1332", "1637",
  "3715", "5043", "5170", "5261", "5293", "5302", "5342", "5388", "5435", "5457",
  "5463", "6423", "6728", "6818", "6919", "7370", "7609", "8000", "32484", "32635",
  "33153", "33203", "33910", "33930", "34016", "80867", "101115", "102268", "102384",
  "103730", "103984", "104259", "107013", "119370", "121142", "121589", "125428",
  "125613", "126510", "128250", "290135", "144246", "145756", "146419", "147729",
  "148672", "150604", "154418", "158298", "164038", "168879", "172936", "173754",
  "173929", "175089", "182399", "184886", "197516", "198000", "200818", "201561",
  "204078", "206004", "208427", "216102", "217556", "221155", "236158", "246262",
  "249085", "249238", "263766", "270371", "281348", "283124", "158545"
];

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

function isoFromNow(daysOffset, hour, minute) {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function normalizeEmployeeId(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function isEmployeeIdValid(value) {
  return /^\d+$/.test(value);
}

function seedState() {
  const briefingA = {
    id: crypto.randomUUID(),
    name: "Briefing",
    edition: "2026-W14",
    briefingDate: isoFromNow(4, 10, 0),
    votingEndsAt: isoFromNow(3, 18, 0),
    status: "open",
    createdAt: new Date().toISOString()
  };

  const briefingB = {
    id: crypto.randomUUID(),
    name: "Briefing",
    edition: "2026-W13",
    briefingDate: isoFromNow(-3, 10, 0),
    votingEndsAt: isoFromNow(-4, 18, 0),
    status: "held",
    createdAt: new Date().toISOString()
  };

  const topics = [
    {
      id: crypto.randomUUID(),
      briefingId: briefingA.id,
      title: "Automatizacion del cierre semanal",
      description: "Revisar bloqueos y siguientes pasos para industrializar el flujo.",
      status: "pending",
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      briefingId: briefingA.id,
      title: "Uso de IA para resumen ejecutivo",
      description: "Evaluar si un asistente puede resumir acuerdos y riesgos en menos de cinco minutos.",
      status: "pending",
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      briefingId: briefingB.id,
      title: "Dependencias con otro foro",
      description: "Tema derivado por requerir validacion transversal.",
      status: "other_forum",
      createdAt: new Date().toISOString()
    }
  ];

  const votes = [
    { id: crypto.randomUUID(), briefingId: briefingA.id, topicId: topics[0].id, userId: "130053", createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), briefingId: briefingA.id, topicId: topics[0].id, userId: "7243", createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), briefingId: briefingA.id, topicId: topics[1].id, userId: "261323", createdAt: new Date().toISOString() }
  ];

  return {
    employeeIds: [...EMPLOYEE_SEED],
    briefings: [briefingA, briefingB],
    topics,
    votes
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedState();

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.employeeIds || !parsed.briefings || !parsed.topics || !parsed.votes) {
      return seedState();
    }
    return parsed;
  } catch (error) {
    console.error("No se pudo leer el estado guardado.", error);
    return seedState();
  }
}

let state = loadState();
let session = loadSession();
let activeTab = localStorage.getItem(TAB_KEY) || "voting";
let trackingBriefingId = localStorage.getItem(TRACKING_KEY) || state.briefings[0]?.id || "";

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function getVotingState(briefing) {
  if (!briefing) return { open: false, label: "Sin briefing", tone: "archived" };
  if (briefing.status !== "open") {
    return {
      open: false,
      label: `Votacion ${BRIEFING_STATUS_LABELS[briefing.status].toLowerCase()}`,
      tone: briefing.status
    };
  }
  if (new Date(briefing.votingEndsAt).getTime() <= Date.now()) {
    return { open: false, label: "Votacion cerrada por fecha", tone: "closed" };
  }
  return { open: true, label: "Votacion abierta", tone: "open" };
}

function getPublicBriefing() {
  const candidates = [...state.briefings]
    .filter((briefing) => briefing.status !== "archived")
    .sort((left, right) => new Date(left.briefingDate) - new Date(right.briefingDate));

  const openBriefing = candidates.find((briefing) => getVotingState(briefing).open);
  return openBriefing || candidates[0] || null;
}

function getBriefingById(briefingId) {
  return state.briefings.find((briefing) => briefing.id === briefingId) || null;
}

function getTopicsForBriefing(briefingId) {
  return state.topics
    .filter((topic) => topic.briefingId === briefingId)
    .map((topic) => ({
      ...topic,
      voteCount: countVotes(topic.id, briefingId)
    }))
    .sort((left, right) => {
      if (right.voteCount !== left.voteCount) return right.voteCount - left.voteCount;
      return new Date(left.createdAt) - new Date(right.createdAt);
    });
}

function countVotes(topicId, briefingId) {
  return state.votes.filter((vote) => vote.topicId === topicId && vote.briefingId === briefingId).length;
}

function hasCurrentUserVoted(topicId, briefingId) {
  if (!session?.userId) return false;
  return state.votes.some(
    (vote) => vote.userId === session.userId && vote.topicId === topicId && vote.briefingId === briefingId
  );
}

function setLoginMessage(message, isError = false) {
  refs.loginMessage.textContent = message;
  refs.loginMessage.style.color = isError ? "var(--danger)" : "var(--muted)";
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

function renderShell() {
  const isLogged = Boolean(session);
  refs.loginScreen.classList.toggle("hidden", isLogged);
  refs.appScreen.classList.toggle("hidden", !isLogged);

  if (!isLogged) {
    setLoginMessage("Introduce tu numero de empleado o accede como admin.");
    return;
  }

  refs.sessionBadge.textContent = session.role === "admin" ? "Administrador" : "Empleado";
  refs.sessionLabel.textContent = session.role === "admin" ? ADMIN_USER : `Empleado ${session.userId}`;

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
  const briefing = getPublicBriefing();
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
  refs.publicVotingDeadline.textContent = `Fin votacion: ${formatDateTime(briefing.votingEndsAt)}`;
  refs.publicVotingStatus.textContent = votingState.label;
  refs.publicVotingStatus.className = `pill ${votingState.tone}`;
  setTopicFormEnabled(employeeMode && votingState.open);

  const topics = getTopicsForBriefing(briefing.id).filter((topic) => topic.status === "pending");
  if (!topics.length) {
    renderEmpty(refs.publicTopicBoard, "No hay temas pendientes para votar.");
    return;
  }

  refs.publicTopicBoard.innerHTML = topics
    .map((topic, index) => {
      const alreadyVoted = hasCurrentUserVoted(topic.id, briefing.id);
      const disabled = !employeeMode || alreadyVoted || !votingState.open;

      return `
        <div class="table-row">
          <span>${index + 1}</span>
          <div class="row-title">
            <strong>${escapeHtml(topic.title)}</strong>
            <small>${escapeHtml(topic.description)}</small>
          </div>
          <span>${topic.voteCount}</span>
          <div class="row-actions">
            <button type="button" class="ghost" data-action="vote-topic" data-topic-id="${topic.id}" ${disabled ? "disabled" : ""}>
              ${alreadyVoted ? "Votado" : "Votar"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAdminBriefings() {
  if (!state.briefings.length) {
    renderEmpty(refs.adminBriefingList, "No hay briefings creados.");
    return;
  }

  const ordered = [...state.briefings].sort((left, right) => new Date(right.briefingDate) - new Date(left.briefingDate));
  refs.adminBriefingList.innerHTML = ordered
    .map((briefing) => {
      const voteCount = state.votes.filter((vote) => vote.briefingId === briefing.id).length;
      const topicCount = state.topics.filter((topic) => topic.briefingId === briefing.id).length;
      return `
        <div class="briefing-item">
          <div>
            <strong>${escapeHtml(briefing.edition)}</strong>
            <p>${formatDateTime(briefing.briefingDate)} - ${topicCount} temas - ${voteCount} votos</p>
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
      `;
    })
    .join("");
}

function renderEmployees() {
  const employeeIds = [...state.employeeIds].sort((left, right) => Number(left) - Number(right));
  refs.employeeCount.textContent = `${employeeIds.length} empleados autorizados`;

  if (!employeeIds.length) {
    renderEmpty(refs.employeeList, "No hay empleados dados de alta.");
    return;
  }

  refs.employeeList.innerHTML = employeeIds
    .map((employeeId) => `
      <div class="employee-item">
        <span>${escapeHtml(employeeId)}</span>
        <button type="button" class="danger" data-action="remove-employee" data-employee-id="${employeeId}">Baja</button>
      </div>
    `)
    .join("");
}

function renderAdminScreen() {
  renderAdminBriefings();
  renderEmployees();
}

function renderTrackingSelect() {
  if (!state.briefings.length) {
    refs.trackingBriefingSelect.innerHTML = "";
    return;
  }

  if (!state.briefings.some((briefing) => briefing.id === trackingBriefingId)) {
    trackingBriefingId = state.briefings[0].id;
  }

  const ordered = [...state.briefings].sort((left, right) => new Date(right.briefingDate) - new Date(left.briefingDate));
  refs.trackingBriefingSelect.innerHTML = ordered
    .map((briefing) => `<option value="${briefing.id}">${escapeHtml(briefing.edition)} - ${BRIEFING_STATUS_LABELS[briefing.status]}</option>`)
    .join("");
  refs.trackingBriefingSelect.value = trackingBriefingId;
}

function renderTrackingBoard() {
  const briefing = getBriefingById(trackingBriefingId);
  if (!briefing) {
    renderEmpty(refs.trackingBoard, "Selecciona un briefing.");
    return;
  }

  const topics = getTopicsForBriefing(briefing.id);
  if (!topics.length) {
    renderEmpty(refs.trackingBoard, "No hay temas en este briefing.");
    return;
  }

  refs.trackingBoard.innerHTML = topics
    .map((topic) => `
      <div class="tracking-item">
        <div>
          <strong>${escapeHtml(topic.title)}</strong>
          <p>${escapeHtml(topic.description)} - ${topic.voteCount} votos</p>
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

function refresh() {
  persist();
  renderShell();
  if (!session) return;
  renderVotingScreen();
  if (session.role === "admin") {
    renderAdminScreen();
    renderTrackingSelect();
    renderTrackingBoard();
  }
}

refs.employeeLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const employeeId = normalizeEmployeeId(new FormData(event.currentTarget).get("employeeId"));

  if (!isEmployeeIdValid(employeeId)) {
    setLoginMessage("El numero de empleado debe ser numerico.", true);
    return;
  }

  if (!state.employeeIds.includes(employeeId)) {
    setLoginMessage("Ese numero de empleado no esta autorizado.", true);
    return;
  }

  session = { role: "employee", userId: employeeId };
  activeTab = "voting";
  event.currentTarget.reset();
  refresh();
});

refs.adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    setLoginMessage("Credenciales de admin no validas.", true);
    return;
  }

  session = { role: "admin", userId: ADMIN_USER };
  activeTab = "admin";
  event.currentTarget.reset();
  refresh();
});

refs.logoutButton.addEventListener("click", () => {
  session = null;
  activeTab = "voting";
  refresh();
});

refs.tabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tab]");
  if (!button || button.classList.contains("hidden")) return;
  activeTab = button.dataset.tab;
  refresh();
});

refs.topicForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const briefing = getPublicBriefing();
  if (!briefing || session?.role !== "employee" || !getVotingState(briefing).open) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  state.topics.push({
    id: crypto.randomUUID(),
    briefingId: briefing.id,
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    status: "pending",
    createdAt: new Date().toISOString()
  });

  event.currentTarget.reset();
  refresh();
});

refs.publicTopicBoard.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='vote-topic']");
  if (!button || session?.role !== "employee") return;

  const briefing = getPublicBriefing();
  const topic = state.topics.find((item) => item.id === button.dataset.topicId);
  if (!briefing || !topic || !getVotingState(briefing).open) return;

  if (hasCurrentUserVoted(topic.id, briefing.id)) {
    return;
  }

  state.votes.push({
    id: crypto.randomUUID(),
    briefingId: briefing.id,
    topicId: topic.id,
    userId: session.userId,
    createdAt: new Date().toISOString()
  });

  refresh();
});

refs.briefingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const briefingDate = String(formData.get("briefingDate") || "");
  const votingEndsAt = String(formData.get("votingEndsAt") || "");

  if (new Date(votingEndsAt).getTime() > new Date(briefingDate).getTime()) {
    alert("La fecha fin de votacion debe ser anterior o igual a la fecha del briefing.");
    return;
  }

  const briefing = {
    id: crypto.randomUUID(),
    name: String(formData.get("name") || "Briefing").trim() || "Briefing",
    edition: String(formData.get("edition") || "").trim(),
    briefingDate: new Date(briefingDate).toISOString(),
    votingEndsAt: new Date(votingEndsAt).toISOString(),
    status: String(formData.get("status") || "open"),
    createdAt: new Date().toISOString()
  };

  state.briefings.push(briefing);
  trackingBriefingId = briefing.id;
  event.currentTarget.reset();
  refresh();
});

refs.adminBriefingList.addEventListener("click", (event) => {
  const statusButton = event.target.closest("button[data-action='set-briefing-status']");
  if (statusButton) {
    const briefing = getBriefingById(statusButton.dataset.briefingId);
    if (!briefing) return;
    briefing.status = statusButton.dataset.status;
    refresh();
    return;
  }

  const deleteButton = event.target.closest("button[data-action='delete-briefing']");
  if (!deleteButton) return;
  if (!confirm("Se eliminara la sesion de briefing y sus temas asociados. ¿Quieres continuar?")) return;
  const briefingId = deleteButton.dataset.briefingId;
  state.briefings = state.briefings.filter((briefing) => briefing.id !== briefingId);
  state.topics = state.topics.filter((topic) => topic.briefingId !== briefingId);
  state.votes = state.votes.filter((vote) => vote.briefingId !== briefingId);
  if (trackingBriefingId === briefingId) {
    trackingBriefingId = state.briefings[0]?.id || "";
  }
  refresh();
});

refs.employeeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const employeeId = normalizeEmployeeId(new FormData(event.currentTarget).get("employeeId"));
  if (!isEmployeeIdValid(employeeId) || state.employeeIds.includes(employeeId)) return;
  state.employeeIds.push(employeeId);
  event.currentTarget.reset();
  refresh();
});

refs.employeeBulkForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = String(new FormData(event.currentTarget).get("employeeIds") || "");
  const items = raw
    .split(/\r?\n/)
    .map(normalizeEmployeeId)
    .filter((item) => item && isEmployeeIdValid(item));

  for (const employeeId of items) {
    if (!state.employeeIds.includes(employeeId)) {
      state.employeeIds.push(employeeId);
    }
  }

  event.currentTarget.reset();
  refresh();
});

refs.employeeList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='remove-employee']");
  if (!button) return;
  const employeeId = button.dataset.employeeId;
  state.employeeIds = state.employeeIds.filter((item) => item !== employeeId);
  if (session?.role === "employee" && session.userId === employeeId) {
    session = null;
  }
  refresh();
});

refs.trackingBriefingSelect.addEventListener("change", (event) => {
  trackingBriefingId = event.target.value;
  refresh();
});

refs.trackingBoard.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='set-topic-status']");
  if (!button) return;
  const topic = state.topics.find((item) => item.id === button.dataset.topicId);
  if (!topic) return;
  topic.status = button.dataset.status;
  refresh();
});

refresh();
