# Google Classroom and remote-access setup

The E3 client and multiplayer server are now configurable for deployment. Google Classroom credentials are intentionally not committed to this repository.

## Google Cloud configuration

1. Create or select a Google Cloud project.
2. Enable the **Google Classroom API**.
3. Configure the Google Auth consent screen.
   - Use **Internal** only if every user belongs to the same Google Workspace organization.
   - Use **External** if teachers or students will sign in from other organizations or personal Google accounts.
4. Create an OAuth 2.0 client with application type **Web application**.
5. Add the deployed server callback URL as an authorized redirect URI, for example:
   `https://api.example.com/auth/google/classroom/callback`
6. Configure the variables listed in `.env.example` on the server host.

The requested read-only scopes cover active courses, rosters, student email identity, coursework, submissions, and grades. Refresh tokens and access tokens must be encrypted at rest and stored only on the server. Do not put the Google client secret or refresh tokens in Vite/browser variables.

The initial service implementation is in `server/src/googleClassroom.ts`. The remaining credential-dependent step is to expose authorization/callback endpoints, save each teacher's encrypted refresh token, and schedule course/roster/grade synchronization into Supabase.

## Making E3 available on other computers

Two services must be deployed:

1. The Vite production build (`npm run build`, output in `dist/`) on a static HTTPS host.
2. The Colyseus server (`server/src/index.ts`) on a Node host that supports WebSockets.

Set `VITE_GAME_SERVER_URL` to the public HTTPS/WSS-capable server origin before building the client. Configure the public client URL in Supabase Authentication under Site URL and Redirect URLs. The server host must receive `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PORT` as private environment variables.

Students should never receive Supabase's service-role key, Google OAuth client secret, or Google refresh tokens.
