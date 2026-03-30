import express from "express";
import { pool } from "./db.js";
import { logoutSession, requireAdmin, requireEmployee, requireSession } from "./auth.js";
import { config } from "./config.js";
import {
  createBriefing,
  deleteBriefing,
  getBriefingById,
  getPublicBriefing,
  listBriefings,
  updateBriefing
} from "./repositories/briefings.js";
import { createAdminSession, createEmployeeSession } from "./repositories/sessions.js";
import { createTopic, listRankedTopicsByBriefing, listTopicsByBriefing, updateTopicStatus } from "./repositories/topics.js";
import { createEmployee, deactivateEmployee, findEmployeeByExternalId, listEmployees } from "./repositories/users.js";
import { castVote } from "./repositories/votes.js";

const ALLOWED_BRIEFING_STATUSES = new Set(["open", "closed", "held", "archived"]);
const ALLOWED_TOPIC_STATUSES = new Set(["pending", "treated", "other_forum", "postponed"]);

const app = express();

app.use(express.json());
app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  next();
});

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateBriefingPayload(body) {
  if (!body.name || !body.edition || !body.briefingAt || !body.votingEndsAt || !body.status) {
    throw createHttpError(400, "Missing required briefing fields");
  }

  if (!ALLOWED_BRIEFING_STATUSES.has(body.status)) {
    throw createHttpError(400, "Invalid briefing status");
  }

  if (new Date(body.votingEndsAt).getTime() > new Date(body.briefingAt).getTime()) {
    throw createHttpError(400, "Voting deadline must be before or equal to briefing date");
  }
}

function validateTopicPayload(body) {
  if (!body.title || !body.description || !body.briefingId) {
    throw createHttpError(400, "Missing required topic fields");
  }
}

function validateVotePayload(body) {
  if (!body.topicId || !body.briefingId) {
    throw createHttpError(400, "Missing required vote fields");
  }
}

function normalizeEmployeeId(value) {
  return String(value || "").trim();
}

function assertOpenWindow(briefing) {
  if (!briefing) {
    throw createHttpError(404, "Briefing not found");
  }

  if (briefing.status !== "open") {
    throw createHttpError(422, "Briefing is not open");
  }

  if (new Date(briefing.voting_ends_at).getTime() <= Date.now()) {
    throw createHttpError(422, "Voting window is closed");
  }
}

function normalizePostgresError(error) {
  const message = String(error.message || "");

  if (message.includes("User already voted this topic in this briefing")) {
    return createHttpError(409, "User already voted this topic in this briefing");
  }

  if (message.includes("Voting closed by briefing status") || message.includes("Voting closed by deadline")) {
    return createHttpError(422, "Voting is closed for this briefing");
  }

  if (message.includes("Briefing not found")) {
    return createHttpError(404, "Briefing not found");
  }

  return error;
}

app.post("/api/auth/login/employee", async (request, response, next) => {
  try {
    const employeeId = normalizeEmployeeId(request.body.employeeId);
    if (!employeeId) {
      throw createHttpError(400, "Employee ID is required");
    }

    const user = await findEmployeeByExternalId(pool, employeeId);
    if (!user || !user.is_active) {
      throw createHttpError(401, "Employee is not authorized");
    }

    const session = await createEmployeeSession(pool, user.id, config.sessionHours);
    response.json({
      sessionToken: session.session_token,
      role: "employee",
      employeeId: user.external_auth_id
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login/admin", async (request, response, next) => {
  try {
    const username = String(request.body.username || "").trim();
    const password = String(request.body.password || "");

    if (username !== config.adminUsername || password !== config.adminPassword) {
      throw createHttpError(401, "Invalid admin credentials");
    }

    const session = await createAdminSession(pool, username, config.sessionHours);
    response.json({
      sessionToken: session.session_token,
      role: "admin",
      username
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", async (request, response, next) => {
  try {
    const session = await requireSession(pool, request);
    response.json({
      session: {
        role: session.role,
        employeeId: session.employee_id || null,
        username: session.admin_username || null,
        expiresAt: session.expires_at
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (request, response, next) => {
  try {
    await logoutSession(pool, request);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/public/briefing", async (request, response, next) => {
  try {
    const session = await requireSession(pool, request);
    const briefing = await getPublicBriefing(pool);
    if (!briefing) {
      response.json({ briefing: null, topics: [] });
      return;
    }

    const topics = await listRankedTopicsByBriefing(pool, briefing.id, session.user_id || null);
    response.json({ briefing, topics });
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/topics", async (request, response, next) => {
  try {
    await requireEmployee(pool, request);
    validateTopicPayload(request.body);
    const briefing = await getBriefingById(pool, request.body.briefingId);
    assertOpenWindow(briefing);
    const topic = await createTopic(pool, request.body);
    response.status(201).json({ topic });
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/votes", async (request, response, next) => {
  try {
    const session = await requireEmployee(pool, request);
    validateVotePayload(request.body);
    const vote = await castVote(pool, {
      userId: session.user_id,
      topicId: request.body.topicId,
      briefingId: request.body.briefingId
    });
    response.status(201).json({ vote });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/briefings", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    const briefings = await listBriefings(pool);
    response.json({ briefings });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/briefings", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    validateBriefingPayload(request.body);
    const briefing = await createBriefing(pool, request.body);
    response.status(201).json({ briefing });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/briefings/:briefingId", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    const existing = await getBriefingById(pool, request.params.briefingId);
    if (!existing) {
      throw createHttpError(404, "Briefing not found");
    }

    const nextPayload = {
      name: request.body.name || existing.name,
      edition: request.body.edition || existing.edition,
      briefingAt: request.body.briefingAt || existing.briefing_at,
      votingEndsAt: request.body.votingEndsAt || existing.voting_ends_at,
      status: request.body.status || existing.status
    };

    validateBriefingPayload(nextPayload);
    const briefing = await updateBriefing(pool, request.params.briefingId, nextPayload);
    response.json({ briefing });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/briefings/:briefingId", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    const deleted = await deleteBriefing(pool, request.params.briefingId);
    if (!deleted) {
      throw createHttpError(404, "Briefing not found");
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/tracking/briefings/:briefingId", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    const topics = await listTopicsByBriefing(pool, request.params.briefingId);
    response.json({ topics });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/topics/:topicId", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    if (!request.body.status || !ALLOWED_TOPIC_STATUSES.has(request.body.status)) {
      throw createHttpError(400, "Invalid topic status");
    }
    const topic = await updateTopicStatus(pool, request.params.topicId, request.body.status);
    if (!topic) {
      throw createHttpError(404, "Topic not found");
    }
    response.json({ topic });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/employees", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    const employees = await listEmployees(pool);
    response.json({ employees });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/employees", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    const employeeId = normalizeEmployeeId(request.body.employeeId);
    if (!employeeId || !/^\d+$/.test(employeeId)) {
      throw createHttpError(400, "Employee ID must be numeric");
    }
    const employee = await createEmployee(pool, employeeId);
    response.status(201).json({ employee });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/employees/bulk", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    const employeeIds = Array.isArray(request.body.employeeIds) ? request.body.employeeIds : [];
    const employees = [];

    for (const rawEmployeeId of employeeIds) {
      const employeeId = normalizeEmployeeId(rawEmployeeId);
      if (!employeeId || !/^\d+$/.test(employeeId)) continue;
      const employee = await createEmployee(pool, employeeId);
      employees.push(employee);
    }

    response.status(201).json({ employees });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/employees/:employeeId", async (request, response, next) => {
  try {
    await requireAdmin(pool, request);
    const employee = await deactivateEmployee(pool, request.params.employeeId);
    if (!employee) {
      throw createHttpError(404, "Employee not found");
    }
    response.json({ employee });
  } catch (error) {
    next(error);
  }
});

app.use((request, response, next) => {
  next(createHttpError(404, "Route not found"));
});

app.use((error, request, response, next) => {
  const normalized = normalizePostgresError(error);
  const statusCode = normalized.statusCode || 500;
  response.status(statusCode).json({
    error: normalized.message || "Internal server error"
  });
});

export default app;
