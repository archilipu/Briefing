import { createHttpError } from "./http.js";
import { deleteSessionByToken, findSessionByToken } from "./repositories/sessions.js";

function getBearerToken(request) {
  const header = request.headers.authorization;
  if (!header) {
    throw createHttpError(401, "Missing Authorization header");
  }

  const [scheme, token] = String(header).split(" ");
  if (scheme !== "Bearer" || !token) {
    throw createHttpError(401, "Authorization header must be Bearer <token>");
  }

  return token;
}

export async function requireSession(pool, request) {
  const token = getBearerToken(request);
  const session = await findSessionByToken(pool, token);
  if (!session) {
    throw createHttpError(401, "Session not found or expired");
  }

  request.session = session;
  return session;
}

export async function requireAdmin(pool, request) {
  const session = await requireSession(pool, request);
  if (session.role !== "admin") {
    throw createHttpError(403, "Admin access required");
  }
  return session;
}

export async function requireEmployee(pool, request) {
  const session = await requireSession(pool, request);
  if (session.role !== "employee") {
    throw createHttpError(403, "Employee access required");
  }
  return session;
}

export async function logoutSession(pool, request) {
  const token = getBearerToken(request);
  await deleteSessionByToken(pool, token);
}
