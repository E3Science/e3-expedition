import { createClient } from "npm:@supabase/supabase-js@2";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CLASSROOM_API = "https://classroom.googleapis.com/v1";
const SCOPES = [
  "openid", "email", "profile",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.profile.emails"
];
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}
function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
async function hmac(value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(env("GOOGLE_CLASSROOM_CLIENT_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}
async function createState(userId: string) {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ userId, expiresAt: Date.now() + 600000, nonce: crypto.randomUUID() })));
  return `${payload}.${await hmac(payload)}`;
}
async function verifyState(value: string) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature || signature !== await hmac(payload)) throw new Error("Google authorization state is invalid.");
  const parsed = JSON.parse(decoder.decode(base64UrlToBytes(payload)));
  if (!parsed.userId || Number(parsed.expiresAt) < Date.now()) throw new Error("Google authorization state has expired.");
  return parsed as { userId: string };
}
async function encryptionKey() {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(env("GOOGLE_CLASSROOM_CLIENT_SECRET")));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, await encryptionKey(), encoder.encode(token)));
  const ciphertext = encrypted.slice(0, -16);
  const tag = encrypted.slice(-16);
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(tag)}.${bytesToBase64Url(ciphertext)}`;
}
async function decryptToken(value: string) {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Stored Google token is invalid.");
  const ciphertext = base64UrlToBytes(ciphertextValue);
  const tag = base64UrlToBytes(tagValue);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext); combined.set(tag, ciphertext.length);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64UrlToBytes(ivValue), tagLength: 128 }, await encryptionKey(), combined);
  return decoder.decode(plain);
}
async function tokenRequest(parameters: Record<string, string>) {
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(parameters) });
  if (!response.ok) throw new Error(`Google token request failed (${response.status}).`);
  return response.json();
}
async function classroomGet(accessToken: string, path: string) {
  const response = await fetch(`${CLASSROOM_API}${path}`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Google Classroom request failed (${response.status}).`);
  return response.json();
}
function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
}
async function teacherFromRequest(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sign in before using Google Classroom.");
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  const user = data.user;
  if (error || !user) throw new Error("Your sign-in session is no longer valid.");
  if (user.email?.toLowerCase() !== "mnelsen@susd.net" && user.app_metadata?.e3_role !== "teacher") throw new Error("Teacher access required.");
  return user;
}
async function authorizationUrl(request: Request) {
  const teacher = await teacherFromRequest(request);
  const query = new URLSearchParams({
    client_id: env("GOOGLE_CLASSROOM_CLIENT_ID"),
    redirect_uri: env("GOOGLE_CLASSROOM_REDIRECT_URI"),
    response_type: "code", access_type: "offline", prompt: "consent", include_granted_scopes: "true",
    scope: SCOPES.join(" "), state: await createState(teacher.id)
  });
  return { url: `${GOOGLE_AUTH_URL}?${query}` };
}
async function callback(url: URL) {
  const frontend = env("E3_FRONTEND_URL");
  try {
    if (url.searchParams.get("error")) throw new Error(url.searchParams.get("error") || "Google authorization failed.");
    const state = await verifyState(url.searchParams.get("state") || "");
    const tokens = await tokenRequest({
      code: url.searchParams.get("code") || "",
      client_id: env("GOOGLE_CLASSROOM_CLIENT_ID"), client_secret: env("GOOGLE_CLASSROOM_CLIENT_SECRET"),
      redirect_uri: env("GOOGLE_CLASSROOM_REDIRECT_URI"), grant_type: "authorization_code"
    });
    const admin = adminClient();
    const existing = await admin.from("google_classroom_connections").select("refresh_token_ciphertext").eq("teacher_user_id", state.userId).maybeSingle();
    const encrypted = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : existing.data?.refresh_token_ciphertext;
    if (!encrypted) throw new Error("Google did not return a refresh token. Revoke the app grant and connect again.");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` } });
    if (!profileResponse.ok) throw new Error("Google profile request failed.");
    const profile = await profileResponse.json();
    const { error } = await admin.from("google_classroom_connections").upsert({ teacher_user_id: state.userId, google_email: profile.email || null, refresh_token_ciphertext: encrypted, updated_at: new Date().toISOString() });
    if (error) throw error;
    return Response.redirect(`${frontend}/?classroom=connected`, 302);
  } catch (error) {
    console.error(error);
    return Response.redirect(`${frontend}/?classroom=error`, 302);
  }
}
async function syncClassroom(request: Request) {
  const teacher = await teacherFromRequest(request);
  const admin = adminClient();
  const { data: connection, error } = await admin.from("google_classroom_connections").select("refresh_token_ciphertext").eq("teacher_user_id", teacher.id).single();
  if (error || !connection) throw new Error("Connect Google Classroom before synchronizing.");
  const access = await tokenRequest({ refresh_token: await decryptToken(connection.refresh_token_ciphertext), client_id: env("GOOGLE_CLASSROOM_CLIENT_ID"), client_secret: env("GOOGLE_CLASSROOM_CLIENT_SECRET"), grant_type: "refresh_token" });
  const courses: Array<{ id: string; name: string; section?: string }> = [];
  let pageToken = "";
  do {
    const query = new URLSearchParams({ courseStates: "ACTIVE", pageSize: "100" }); if (pageToken) query.set("pageToken", pageToken);
    const page = await classroomGet(access.access_token, `/courses?${query}`); courses.push(...(page.courses || [])); pageToken = page.nextPageToken || "";
  } while (pageToken);
  const authByEmail = new Map<string, string>(); let authPage = 1;
  while (true) {
    const { data, error: usersError } = await admin.auth.admin.listUsers({ page: authPage, perPage: 1000 }); if (usersError) throw usersError;
    data.users.forEach((user) => { if (user.email) authByEmail.set(user.email.toLowerCase(), user.id); });
    if (data.users.length < 1000) break; authPage += 1;
  }
  let rosterEntries = 0; let matchedStudents = 0;
  for (const course of courses) {
    const classCode = `GC${course.id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
    const { data: classRow, error: classError } = await admin.from("classes").upsert({ google_course_id: course.id, class_code: classCode, class_name: course.section ? `${course.name} · ${course.section}` : course.name, classroom_synced_at: new Date().toISOString() }, { onConflict: "google_course_id" }).select("class_id").single();
    if (classError) throw classError;
    let studentPage = "";
    do {
      const query = new URLSearchParams({ pageSize: "100" }); if (studentPage) query.set("pageToken", studentPage);
      const page = await classroomGet(access.access_token, `/courses/${encodeURIComponent(course.id)}/students?${query}`);
      for (const student of page.students || []) {
        const email = student.profile?.emailAddress?.toLowerCase() || null;
        const { error: rosterError } = await admin.from("google_classroom_roster").upsert({ google_course_id: course.id, google_user_id: student.userId, email, display_name: student.profile?.name?.fullName || null, synced_at: new Date().toISOString() }, { onConflict: "google_course_id,google_user_id" });
        if (rosterError) throw rosterError; rosterEntries += 1;
        const userId = email ? authByEmail.get(email) : null;
        if (userId) { const membership = await admin.from("class_memberships").upsert({ user_id: userId, class_id: classRow.class_id, role: "student" }, { onConflict: "user_id" }); if (!membership.error) matchedStudents += 1; }
      }
      studentPage = page.nextPageToken || "";
    } while (studentPage);
  }
  await admin.from("google_classroom_connections").update({ updated_at: new Date().toISOString() }).eq("teacher_user_id", teacher.id);
  return { success: true, courses: courses.length, rosterEntries, matchedStudents };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(request.url);
  if (request.method === "GET" && url.searchParams.get("action") === "callback") return callback(url);
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === "authorization-url") return json(await authorizationUrl(request));
    if (body.action === "sync") return json(await syncClassroom(request));
    return json({ error: "Unknown Classroom action." }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Google Classroom request failed." }, 500);
  }
});
