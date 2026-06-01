# Mitra

Mitra is a collaborative experience-planning app for groups. The current MVP lets users sign in, create shared rooms for trips/events, view members, and manage RSVP status.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router
- Auth/database: Supabase Auth + Postgres + Row Level Security
- Backend: FastAPI health/API scaffold

## Project structure

```text
frontend/              React/Vite app
backend/               FastAPI service
supabase/migrations/   Database schema and RLS policies
```

## Prerequisites

- Node.js + npm
- Python 3.11+
- Supabase project
- Supabase CLI, optional but recommended

## Environment

Create `frontend/.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Create `backend/.env`:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

Never commit real `.env` files.

## Database setup

The app expects these public tables:

- `users`
- `rooms`
- `room_members`

Apply the migration in `supabase/migrations/001_initial_schema.sql` to your Supabase project.

If this repo is linked to Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Or paste/run the migration SQL in the Supabase SQL editor.

## Frontend development

```bash
cd frontend
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```

## Backend development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Health check:

```bash
curl http://localhost:8000/health
```

## Current MVP behavior

- Sign up/sign in with Supabase Auth
- Create an experience room
- Automatically add the creator as an admin member
- View rooms on the dashboard
- View room details and members
- Update your RSVP status

## Next product work

1. Build the invite flow behind the existing “Invite people” button.
2. Add itinerary/planning items inside rooms.
3. Add room activity/comments.
4. Add tests around Supabase data access and protected routes.
5. Decide whether FastAPI remains a thin service or owns business logic.
