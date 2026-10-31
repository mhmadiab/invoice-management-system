import "dotenv/config";

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const config = {
  get isDev() {
    return process.env.NODE_ENV === "development";
  },
  app: {
    get origin() {
      return process.env.APP_ORIGIN;
    },
  },
  auth: {
    get jwtSecret() {
      return process.env.AUTH_JWT_SECRET;
    },
    get accessSeconds() {
      return Number(process.env.ACCESS_SECONDS ?? 15 * 60);
    },
    get sessionSeconds() {
      return Number(process.env.SESSION_SECONDS ?? 30 * 24 * 60 * 60);
    },
  },
  database: {
    get url() {
      return process.env.DATABASE_URL;
    },
    get requiredUrl() {
      return requiredEnvironmentValue("DATABASE_URL");
    },
  },
  smtp: {
    get host() {
      return process.env.SMTP_HOST;
    },
    get port() {
      return Number(process.env.SMTP_PORT ?? 587);
    },
    get secure() {
      return process.env.SMTP_SECURE === "true";
    },
    get from() {
      return process.env.SMTP_FROM;
    },
    get user() {
      return process.env.SMTP_USER;
    },
    get password() {
      return process.env.SMTP_PASSWORD;
    },
  },
  reminders: {
    get significantlyOverdueDays() {
      return Number(process.env.SIGNIFICANTLY_OVERDUE_DAYS);
    },
    get contractExpiringSoonDays() {
      return Number(process.env.CONTRACT_EXPIRING_SOON_DAYS);
    },
  },
  pdf: {
    get fontPath() {
      return process.env.PDF_FONT_PATH;
    },
    get assetOrigins() {
      return (process.env.PDF_ASSET_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean);
    },
  },
  tests: {
    get baseUrl() {
      return process.env.TEST_BASE_URL ?? "http://127.0.0.1:3308";
    },
  },
};

export { config };
export default config;
