const STORAGE_KEY = "briefing-backlog-demo-v1";
const ACTIVE_USER_KEY = "briefing-backlog-demo-active-user";
const SELECTED_BRIEFING_KEY = "briefing-backlog-demo-selected-briefing";

const BRIEFING_STATUS_LABELS = {
  open: "Abierto",
  closed: "Cerrado",
  held: "Celebrado",
  archived: "Archivado"
};

const TOPIC_STATUS_LABELS = {
  pending: "Pendiente",
  treated: "Tratado",
  other_forum: "Llevar a otro foro",
  postponed: "Aplazado"
};

const refs = {
  activeUserSelect: document.getElementById("activeUserSelect"),
  quickUserForm: document.getElementById("quickUserForm"),
  globalStats: document.getElementById("globalStats"),
  briefingList: document.getElementById("briefingList"),
  briefingForm: document.getElementById("briefingForm"),
  selectedBriefingEyebrow: document.getElementById("selectedBriefingEyebrow"),
  selectedBriefingTitle: document.getElementById("selectedBriefingTitle"),
  selectedBriefingMeta: document.getElementById("selectedBriefingMeta"),
  briefingSummary: document.getElementById("briefingSummary"),
  briefingSettingsForm: document.getElementById("briefingSettingsForm"),
  topicFilterSelect: document.getElementById("topicFilterSelect"),
  topicForm: document.getElementById("topicForm"),
  topicBoard: document.getElementById("topicBoard"),
  votingStateBadge: document.getElementById("votingStateBadge"),
  emptyStateTemplate: document.getElementById("emptyStateTemplate")
};

function isoFromNow(daysOffset, hour, minute) {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function seedState() {
  const users = [
    { id: crypto.randomUUID(), displayName: "Ana Martin" },
    { id: crypto.randomUUID(), displayName: "Luis Perez" },
    { id: crypto.randomUUID(), displayName: "Marta Gomez" }
  ];

  const briefingA = {
    id: crypto.randomUUID(),
    name: "Briefing Operaciones",
    edition: "2026-W14",
    briefingDate: isoFromNow(5, 10, 0),
    votingEndsAt: isoFromNow(4, 18, 0),
    status: "open",
    createdAt: new Date().toISOString()
  };

  const briefingB = {
    id: crypto.randomUUID(),
    name: "Briefing Transformacion",
    edition: "2026-W13",
    briefingDate: isoFromNow(-2, 9, 30),
    votingEndsAt: isoFromNow(-3, 18, 0),
    status: "held",
    createdAt: new Date().toISOString()
  };

  const topics = [
    {
      id: crypto.randomUUID(),
      briefingId: briefingA.id,
      title: "Automatizacion del cierre semanal",
      description: "Revisar bloqueos, tiempos de espera y siguientes pasos para industrializar el flujo.",
      creatorId: users[0].id,
      creatorName: users[0].displayName,
      status: "pending",
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      briefingId: briefingA.id,
      title: "Uso de IA para resumen ejecutivo",
      description: "Evaluar si un asistente puede resumir acuerdos y riesgos del briefing en menos de cinco minutos.",
      creatorId: users[1].id,
      creatorName: users[1].displayName,
      status: "pending",
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      briefingId: briefingB.id,
      title: "Decision sobre cuadro de mando unico",
      description: "Tema tratado en la reunion previa y cerrado con acuerdo de despliegue.",
      creatorId: users[2].id,
      creatorName: users[2].displayName,
      status: "treated",
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      briefingId: briefingB.id,
      title: "Dependencias con foro de arquitectura",
      description: "Tema reenviado al foro de arquitectura por requerir validacion transversal.",
      creatorId: users[0].id,
      creatorName: users[0].displayName,
      status: "other_forum",
      createdAt: new Date().toISOString()
    }
  ];

  const votes = [
    {
      id: crypto.randomUUID(),
      briefingId: briefingA.id,
      topicId: topics[0].id,
      userId: users[1].id,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      briefingId: briefingA.id,
      topicId: topics[0].id,
      userId: users[2].id,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      briefingId: briefingA.id,
      topicId: topics[1].id,
      userId: users[0].id,
      createdAt: new Date().toISOString()
    }
  ];

  return {
    users,
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
    if (!parsed.users || !parsed.briefings || !parsed.topics || !parsed.votes) {
      return seedState();
    }
    return parsed;
  } catch (error) {
    console.error("No se pudo leer el estado guardado.", error);
    return seedState();
  }
}

let state = loadState();
let activeUserId = loadStoredId(ACTIVE_USER_KEY, state.users[0]?.id);
let selectedBriefingId = loadStoredId(SELECTED_BRIEFING_KEY, state.briefings[0]?.id);

if (!state.users.some((user) => user.id === activeUserId)) {
  activeUserId = state.users[0]?.id || null;
}

if (!state.briefings.some((briefing) => briefing.id === selectedBriefingId)) {
  selectedBriefingId = state.briefings[0]?.id || null;
}

function loadStoredId(key, fallback) {
  return localStorage.getItem(key) || fallback;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (activeUserId) {
    localStorage.setItem(ACTIVE_USER_KEY, activeUserId);
  }
  if (selectedBriefingId) {
    localStorage.setItem(SELECTED_BRIEFING_KEY, selectedBriefingId);
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

function toLocalInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoFromInput(value) {
  return new Date(value).toISOString();
}

function getSelectedBriefing() {
  return state.briefings.find((briefing) => briefing.id === selectedBriefingId) || null;
}

function getActiveUser() {
  return state.users.find((user) => user.id === activeUserId) || null;
}

function getVotesForBriefing(briefingId) {
  return state.votes.filter((vote) => vote.briefingId === briefingId);
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

function hasUserVotedTopic(userId, topicId, briefingId) {
  return state.votes.some(
    (vote) => vote.userId === userId && vote.topicId === topicId && vote.briefingId === briefingId
  );
}

function getVotingState(briefing) {
  if (!briefing) return { open: false, label: "Sin briefing", tone: "closed" };
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

function canVoteTopic(topic, briefing) {
  const votingState = getVotingState(briefing);
  return votingState.open && !["treated", "other_forum"].includes(topic.status);
}

function countTopicsByStatus(briefingId, status) {
  return state.topics.filter((topic) => topic.briefingId === briefingId && topic.status === status).length;
}

function topTopicTitles(briefingId) {
  return getTopicsForBriefing(briefingId)
    .slice(0, 3)
    .map((topic) => topic.title);
}

function renderEmpty(container, message) {
  container.innerHTML = "";
  const node = refs.emptyStateTemplate.content.cloneNode(true);
  if (message) {
    node.querySelector("p").textContent = message;
  }
  container.appendChild(node);
}

function renderGlobalStats() {
  const openVotingCount = state.briefings.filter((briefing) => getVotingState(briefing).open).length;
  const totalTopics = state.topics.length;
  const treatedTopics = state.topics.filter((topic) => topic.status === "treated").length;
  const totalVotes = state.votes.length;

  refs.globalStats.innerHTML = `
    <article class="stat-card">
      <strong>${state.briefings.length}</strong>
      <span>Briefings</span>
    </article>
    <article class="stat-card">
      <strong>${openVotingCount}</strong>
      <span>Votaciones abiertas</span>
    </article>
    <article class="stat-card">
      <strong>${totalTopics}</strong>
      <span>Temas totales</span>
    </article>
    <article class="stat-card">
      <strong>${totalVotes}</strong>
      <span>Votos registrados</span>
    </article>
    <article class="stat-card">
      <strong>${treatedTopics}</strong>
      <span>Temas tratados</span>
    </article>
  `;
}

function renderUserSelector() {
  refs.activeUserSelect.innerHTML = state.users
    .map((user) => `<option value="${user.id}">${escapeHtml(user.displayName)}</option>`)
    .join("");

  refs.activeUserSelect.value = activeUserId || "";
}

function renderBriefingList() {
  if (!state.briefings.length) {
    renderEmpty(refs.briefingList, "Todavia no hay briefings creados.");
    return;
  }

  const ordered = [...state.briefings].sort((left, right) => new Date(right.briefingDate) - new Date(left.briefingDate));

  refs.briefingList.innerHTML = ordered
    .map((briefing) => {
      const votingState = getVotingState(briefing);
      const totalTopics = state.topics.filter((topic) => topic.briefingId === briefing.id).length;
      const totalVotes = getVotesForBriefing(briefing.id).length;

      return `
        <button type="button" class="briefing-button ${briefing.id === selectedBriefingId ? "is-selected" : ""}" data-action="select-briefing" data-briefing-id="${briefing.id}">
          <div class="briefing-header">
            <div>
              <p class="briefing-name">${escapeHtml(briefing.name)}</p>
              <p class="briefing-meta">${escapeHtml(briefing.edition)} - ${formatDateTime(briefing.briefingDate)}</p>
            </div>
            <span class="pill ${escapeHtml(briefing.status)}">${BRIEFING_STATUS_LABELS[briefing.status]}</span>
          </div>
          <div class="topic-meta">
            <span>${totalTopics} temas</span>
            <span>${totalVotes} votos</span>
            <span>${escapeHtml(votingState.label)}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderSelectedBriefing() {
  const briefing = getSelectedBriefing();
  if (!briefing) {
    refs.selectedBriefingEyebrow.textContent = "Briefing";
    refs.selectedBriefingTitle.textContent = "Selecciona un briefing";
    refs.selectedBriefingMeta.textContent = "";
    refs.votingStateBadge.textContent = "Sin briefing";
    refs.votingStateBadge.className = "status-pill";
    refs.briefingSettingsForm.reset();
    toggleBriefingSettings(false);
    renderEmpty(refs.briefingSummary, "Crea o selecciona un briefing para ver su backlog.");
    renderEmpty(refs.topicBoard, "No hay temas para mostrar.");
    return;
  }

  toggleBriefingSettings(true);

  const votingState = getVotingState(briefing);
  const topics = getTopicsForBriefing(briefing.id);
  const pendingCount = countTopicsByStatus(briefing.id, "pending");
  const treatedCount = countTopicsByStatus(briefing.id, "treated");
  const otherForumCount = countTopicsByStatus(briefing.id, "other_forum");
  const postponedCount = countTopicsByStatus(briefing.id, "postponed");
  const topTitles = topTopicTitles(briefing.id);

  refs.selectedBriefingEyebrow.textContent = briefing.edition;
  refs.selectedBriefingTitle.textContent = briefing.name;
  refs.selectedBriefingMeta.textContent = `Briefing: ${formatDateTime(briefing.briefingDate)} - Fin votacion: ${formatDateTime(briefing.votingEndsAt)}`;
  refs.votingStateBadge.textContent = votingState.label;
  refs.votingStateBadge.className = `status-pill ${votingState.tone}`;

  refs.briefingSummary.innerHTML = `
    <article class="summary-card">
      <small>Estado</small>
      <strong>${BRIEFING_STATUS_LABELS[briefing.status]}</strong>
      <p>El briefing mantiene backlog, votacion y estados visibles en una sola entidad.</p>
    </article>
    <article class="summary-card">
      <small>Backlog</small>
      <strong>${topics.length}</strong>
      <p>${pendingCount} pendientes - ${postponedCount} aplazados</p>
    </article>
    <article class="summary-card">
      <small>Seguimiento</small>
      <strong>${treatedCount + otherForumCount}</strong>
      <p>${treatedCount} tratados - ${otherForumCount} enviados a otro foro</p>
    </article>
    <article class="summary-card">
      <small>Top del briefing</small>
      <strong>${topics[0]?.voteCount || 0}</strong>
      <p>${escapeHtml(topTitles.join(" - ") || "Sin votos todavia")}</p>
    </article>
  `;

  refs.briefingSettingsForm.elements.briefingDate.value = toLocalInputValue(briefing.briefingDate);
  refs.briefingSettingsForm.elements.votingEndsAt.value = toLocalInputValue(briefing.votingEndsAt);
  refs.briefingSettingsForm.elements.status.value = briefing.status;
}

function toggleBriefingSettings(enabled) {
  Array.from(refs.briefingSettingsForm.elements).forEach((element) => {
    element.disabled = !enabled;
  });
}

function renderTopicBoard() {
  const briefing = getSelectedBriefing();
  if (!briefing) {
    renderEmpty(refs.topicBoard, "No hay temas para mostrar.");
    return;
  }

  const activeUser = getActiveUser();
  const filter = refs.topicFilterSelect.value;
  const topics = getTopicsForBriefing(briefing.id).filter((topic) => {
    return filter === "all" ? true : topic.status === filter;
  });

  if (!topics.length) {
    renderEmpty(refs.topicBoard, "No hay temas para el filtro seleccionado.");
    return;
  }

  refs.topicBoard.innerHTML = topics
    .map((topic, index) => {
      const votedByUser = activeUser ? hasUserVotedTopic(activeUser.id, topic.id, briefing.id) : false;
      const voteButtonDisabled = !activeUser || votedByUser || !canVoteTopic(topic, briefing);

      return `
        <article class="topic-card">
          <div class="briefing-header">
            <div>
              <p class="briefing-name">#${index + 1} ${escapeHtml(topic.title)}</p>
              <div class="badge-row">
                <span class="pill ${escapeHtml(topic.status)}">${TOPIC_STATUS_LABELS[topic.status]}</span>
                <span class="pill pending">${topic.voteCount} votos</span>
              </div>
            </div>
          </div>

          <p>${escapeHtml(topic.description)}</p>

          <div class="topic-meta">
            <span>Creador: ${escapeHtml(topic.creatorName)}</span>
            <span>Alta: ${formatDateTime(topic.createdAt)}</span>
            ${votedByUser ? "<span>Tu voto ya esta registrado</span>" : ""}
          </div>

          <div class="topic-actions">
            <div class="action-group">
              <button
                type="button"
                class="primary"
                data-action="vote-topic"
                data-topic-id="${topic.id}"
                ${voteButtonDisabled ? "disabled" : ""}
              >
                ${votedByUser ? "Voto registrado" : "Votar"}
              </button>
            </div>

            <div class="action-group">
              <button type="button" class="ghost" data-action="mark-treated" data-topic-id="${topic.id}">
                Tratado
              </button>
              <button type="button" class="ghost" data-action="move-topic" data-topic-id="${topic.id}">
                Otro foro
              </button>
              <button type="button" class="quiet" data-action="postpone-topic" data-topic-id="${topic.id}">
                Aplazar
              </button>
              <button type="button" class="quiet" data-action="reopen-topic" data-topic-id="${topic.id}">
                Reabrir
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function refresh() {
  persist();
  renderUserSelector();
  renderGlobalStats();
  renderBriefingList();
  renderSelectedBriefing();
  renderTopicBoard();
}

function validateBriefingDates(briefingDate, votingEndsAt) {
  if (new Date(votingEndsAt).getTime() > new Date(briefingDate).getTime()) {
    alert("La fecha fin de votacion debe ser anterior o igual a la fecha del briefing.");
    return false;
  }
  return true;
}

refs.activeUserSelect.addEventListener("change", (event) => {
  activeUserId = event.target.value;
  refresh();
});

refs.quickUserForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const displayName = String(formData.get("displayName") || "").trim();

  if (!displayName) return;

  const existing = state.users.find((user) => user.displayName.toLowerCase() === displayName.toLowerCase());
  if (existing) {
    activeUserId = existing.id;
  } else {
    const user = {
      id: crypto.randomUUID(),
      displayName
    };
    state.users.push(user);
    activeUserId = user.id;
  }

  event.currentTarget.reset();
  refresh();
});

refs.briefingList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='select-briefing']");
  if (!button) return;
  selectedBriefingId = button.dataset.briefingId;
  refresh();
});

refs.briefingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const briefingDate = formData.get("briefingDate");
  const votingEndsAt = formData.get("votingEndsAt");

  if (!validateBriefingDates(briefingDate, votingEndsAt)) return;

  const briefing = {
    id: crypto.randomUUID(),
    name: String(formData.get("name") || "").trim(),
    edition: String(formData.get("edition") || "").trim(),
    briefingDate: toIsoFromInput(briefingDate),
    votingEndsAt: toIsoFromInput(votingEndsAt),
    status: String(formData.get("status") || "open"),
    createdAt: new Date().toISOString()
  };

  state.briefings.push(briefing);
  selectedBriefingId = briefing.id;
  event.currentTarget.reset();
  refresh();
});

refs.briefingSettingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const briefing = getSelectedBriefing();
  if (!briefing) return;

  const formData = new FormData(event.currentTarget);
  const briefingDate = formData.get("briefingDate");
  const votingEndsAt = formData.get("votingEndsAt");

  if (!validateBriefingDates(briefingDate, votingEndsAt)) return;

  briefing.briefingDate = toIsoFromInput(briefingDate);
  briefing.votingEndsAt = toIsoFromInput(votingEndsAt);
  briefing.status = String(formData.get("status") || briefing.status);

  refresh();
});

refs.topicFilterSelect.addEventListener("change", renderTopicBoard);

refs.topicForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const briefing = getSelectedBriefing();
  if (!briefing) {
    alert("Primero selecciona un briefing.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const activeUser = getActiveUser();
  const creatorName = String(formData.get("creatorName") || "").trim() || activeUser?.displayName || "Sin identificar";

  state.topics.push({
    id: crypto.randomUUID(),
    briefingId: briefing.id,
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    creatorId: activeUser?.id || null,
    creatorName,
    status: String(formData.get("status") || "pending"),
    createdAt: new Date().toISOString()
  });

  event.currentTarget.reset();
  refresh();
});

refs.topicBoard.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const briefing = getSelectedBriefing();
  const topic = state.topics.find((item) => item.id === button.dataset.topicId);
  const activeUser = getActiveUser();
  if (!briefing || !topic) return;

  if (button.dataset.action === "vote-topic") {
    if (!activeUser) {
      alert("Selecciona un usuario activo antes de votar.");
      return;
    }

    if (!canVoteTopic(topic, briefing)) {
      alert("La votacion para este briefing esta cerrada o el tema ya no admite votos.");
      return;
    }

    if (hasUserVotedTopic(activeUser.id, topic.id, briefing.id)) {
      alert("Cada usuario solo puede votar una vez el mismo tema dentro de un briefing.");
      return;
    }

    state.votes.push({
      id: crypto.randomUUID(),
      briefingId: briefing.id,
      topicId: topic.id,
      userId: activeUser.id,
      createdAt: new Date().toISOString()
    });
  }

  if (button.dataset.action === "mark-treated") {
    topic.status = "treated";
  }

  if (button.dataset.action === "move-topic") {
    topic.status = "other_forum";
  }

  if (button.dataset.action === "postpone-topic") {
    topic.status = "postponed";
  }

  if (button.dataset.action === "reopen-topic") {
    topic.status = "pending";
  }

  refresh();
});

refresh();
