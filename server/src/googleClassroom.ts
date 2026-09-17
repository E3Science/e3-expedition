const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CLASSROOM_API = "https://classroom.googleapis.com/v1";

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
