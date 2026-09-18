const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CLASSROOM_API = "https://classroom.googleapis.com/v1";
import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

export const GOOGLE_CLASSROOM_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.profile.emails",
  "https://www.googleapis.com/auth/classroom.coursework.students.readonly"
];

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function createClassroomAuthorizationUrl(state: string) {
  const query = new URLSearchParams({
    client_id: requiredEnv("GOOGLE_CLASSROOM_CLIENT_ID"),
    redirect_uri: requiredEnv("GOOGLE_CLASSROOM_REDIRECT_URI"),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_CLASSROOM_SCOPES.join(" "),
    state
  });
  return `${GOOGLE_AUTH_URL}?${query}`;
}

export async function exchangeClassroomAuthorizationCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv("GOOGLE_CLASSROOM_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLASSROOM_CLIENT_SECRET"),
      redirect_uri: requiredEnv("GOOGLE_CLASSROOM_REDIRECT_URI"),
      grant_type: "authorization_code"
    })
  });
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status}).`);
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

export async function refreshClassroomAccessToken(refreshToken: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requiredEnv("GOOGLE_CLASSROOM_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLASSROOM_CLIENT_SECRET"),
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) throw new Error(`Google token refresh failed (${response.status}).`);
  return response.json() as Promise<{ access_token: string; expires_in: number }>;
}

function encryptionKey() {
  return createHash("sha256").update(requiredEnv("GOOGLE_CLASSROOM_CLIENT_SECRET")).digest();
}

export function encryptClassroomRefreshToken(refreshToken: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptClassroomRefreshToken(value: string) {
  const [ivValue, tagValue, ciphertextValue] = String(value || "").split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Stored Google token is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}

export function createClassroomState(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + 10 * 60 * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  const signature = createHmac("sha256", requiredEnv("GOOGLE_CLASSROOM_CLIENT_SECRET")).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyClassroomState(state: string) {
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature) throw new Error("Google authorization state is missing.");
  const expected = createHmac("sha256", requiredEnv("GOOGLE_CLASSROOM_CLIENT_SECRET")).update(payload).digest("base64url");
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) throw new Error("Google authorization state is invalid.");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!parsed?.userId || Number(parsed.expiresAt) < Date.now()) throw new Error("Google authorization state has expired.");
  return parsed as { userId: string; expiresAt: number; nonce: string };
}

export function getGoogleProfile(accessToken: string) {
  return fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${accessToken}` } }).then(async (response) => {
    if (!response.ok) throw new Error(`Google profile request failed (${response.status}).`);
    return response.json() as Promise<{ email?: string; name?: string }>;
  });
}

async function classroomGet<T>(accessToken: string, path: string) {
  const response = await fetch(`${CLASSROOM_API}${path}`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Google Classroom request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export function listClassroomCourses(accessToken: string, pageToken = "") {
  const query = new URLSearchParams({ courseStates: "ACTIVE", pageSize: "100" });
  if (pageToken) query.set("pageToken", pageToken);
  return classroomGet<{ courses?: Array<{ id: string; name: string; section?: string; enrollmentCode?: string }>; nextPageToken?: string }>(accessToken, `/courses?${query}`);
}

export function listClassroomStudents(accessToken: string, courseId: string, pageToken = "") {
  const query = new URLSearchParams({ pageSize: "100" });
  if (pageToken) query.set("pageToken", pageToken);
  return classroomGet<{ students?: Array<{ userId: string; profile: { name: { fullName: string }; emailAddress?: string } }>; nextPageToken?: string }>(accessToken, `/courses/${encodeURIComponent(courseId)}/students?${query}`);
}

export function listClassroomCoursework(accessToken: string, courseId: string, pageToken = "") {
  const query = new URLSearchParams({ pageSize: "100", orderBy: "dueDate desc" });
  if (pageToken) query.set("pageToken", pageToken);
  return classroomGet<{ courseWork?: Array<{ id: string; title: string; maxPoints?: number }>; nextPageToken?: string }>(accessToken, `/courses/${encodeURIComponent(courseId)}/courseWork?${query}`);
}

export function listClassroomSubmissions(accessToken: string, courseId: string, courseworkId: string, userId?: string) {
  const query = new URLSearchParams({ pageSize: "100" });
  if (userId) query.set("userId", userId);
  return classroomGet<{ studentSubmissions?: Array<{ userId: string; assignedGrade?: number; draftGrade?: number }> }>(accessToken, `/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseworkId)}/studentSubmissions?${query}`);
}

export function calculateClassroomPercentage(grades: Array<{ earned?: number; possible?: number }>) {
  const totals = grades.reduce((result, grade) => {
    if (Number.isFinite(grade.earned) && Number(grade.possible) > 0) {
      result.earned += Number(grade.earned);
      result.possible += Number(grade.possible);
    }
    return result;
  }, { earned: 0, possible: 0 });
  return totals.possible > 0 ? Math.round((totals.earned / totals.possible) * 1000) / 10 : null;
}
