export const config = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || "",
  adminUsername: process.env.ADMIN_USERNAME || "lomartin",
  adminPassword: process.env.ADMIN_PASSWORD || "12,Briefing?",
  sessionHours: Number(process.env.SESSION_HOURS || 12)
};

if (!config.databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable");
}
