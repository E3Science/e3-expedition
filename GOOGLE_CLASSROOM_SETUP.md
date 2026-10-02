# Google Classroom without Render multiplayer

E3 uses a Supabase Edge Function for Google OAuth and roster synchronization. The original world runs locally, while persistence, accounts, rosters, and class chat use Supabase. The `e3-multiplayer` Render service is not required.

## One-time Supabase setup

Install/login to the Supabase CLI and link this repository to the existing project. Then set these Edge Function secrets:

```powershell
supabase secrets set GOOGLE_CLASSROOM_CLIENT_ID="YOUR_CLIENT_ID"
supabase secrets set GOOGLE_CLASSROOM_CLIENT_SECRET="YOUR_CLIENT_SECRET"
supabase secrets set GOOGLE_CLASSROOM_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/classroom?action=callback"
supabase secrets set E3_FRONTEND_URL="https://e3-expedition.onrender.com"
supabase functions deploy classroom --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically inside hosted Edge Functions.

## Google Cloud

In the OAuth web client, replace the old Render callback with this exact authorized redirect URI:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/classroom?action=callback
```

Keep the Classroom API enabled. Existing encrypted refresh tokens remain compatible because both implementations use AES-256-GCM with a SHA-256 key derived from the same Google client secret.

## Local testing

The local Vite client calls the deployed Supabase Edge Function, so Classroom authorization and synchronization work locally without starting the old Node/Colyseus server. Add local Vite URLs to Supabase Auth redirect URLs for Google sign-in as usual.

## Render

Only `e3-expedition` needs to remain deployed. After the Edge Function is live and tested, the `e3-multiplayer` service may be deleted from Render.
