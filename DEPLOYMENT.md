# E3 deployment checklist

E3 uses three shared services:

1. The Vite website, opened by teachers and students.
2. The Colyseus multiplayer server, which authorizes users and owns class rooms.
3. Supabase, which stores accounts, class memberships, inventory, layouts, and progress.

## Before deploying

1. Create a private GitHub repository for this project. Do not push to the original Phaser template repository.
2. Confirm that `server/.env` is ignored by Git. Never commit the Supabase service-role key.
3. In the Supabase SQL Editor, run `server/migrations/20260917_add_mission_position.sql`.
4. Confirm the `classes` table contains at least one class and each student has one `class_memberships` row.

## Render Blueprint

Create a Render Blueprint from `render.yaml`. It defines:

- `e3-multiplayer`: the Node/Colyseus Web Service.
- `e3-expedition`: the Vite Static Site.

Enter the environment variables when Render requests them.

### Multiplayer service

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: private service-role key.
- `CLIENT_ORIGINS`: the final static-site origin, such as `https://e3-expedition.onrender.com`.

### Static site

- `VITE_SUPABASE_URL`: Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key.
- `VITE_GAME_SERVER_URL`: multiplayer origin, such as `https://e3-multiplayer.onrender.com`.

After both services receive their URLs, update `CLIENT_ORIGINS` and `VITE_GAME_SERVER_URL`, then redeploy both services.

## Supabase Authentication

In Authentication > URL Configuration:

1. Set Site URL to the final `https://e3-expedition.onrender.com` address.
2. Add that same address to Redirect URLs.
3. Keep `http://localhost:8080/**` as an additional redirect while local development is needed.

## Connection test

1. Open `/health` on the multiplayer service and confirm it returns `{ "ok": true }`.
2. Sign in as the teacher. The game should retrieve classes through `/api/classes` and automatically join the remembered or first class.
3. Sign in as a student on another computer. The server should route the student using `class_memberships`.
4. Confirm chat and the expedition ship update on both computers.
5. Restart the multiplayer service and confirm the expedition ship reloads at its saved position.
