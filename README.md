# HabitSquad 🎯

A habit tracking app with social accountability. Track personal habits, create groups, invite members, and compete on leaderboards.

## Features

- ✅ User authentication (register/login)
- ✅ Create habits with frequency & weightage
- ✅ Daily habit tracking with scoring
- ✅ Streak tracking
- ✅ Calendar heatmap view
- ✅ **Groups** - Create accountability groups
- ✅ **Group Habits** - Habits can belong to groups
- ✅ **Invite Members** - Add platform users or invite via email
- ✅ **Leaderboards** - Weekly/monthly rankings

## Tech Stack

- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Auth**: JWT

## Project Structure

```
habitsquad/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── index.js
│   │   ├── lib/
│   │   ├── middleware/
│   │   └── routes/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── app/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── package.json
│   └── .env.local.example
├── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud like Supabase/Neon)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd habitsquad
npm run install:all
```

### 2. Setup Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your database URL
# DATABASE_URL="postgresql://user:password@localhost:5432/habitsquad"

# Run database migrations
npx prisma migrate dev --name init

# (Optional) View database
npx prisma studio
```

### 3. Setup Frontend

```bash
cd frontend

# Copy environment file
cp .env.local.example .env.local

# Default API URL is http://localhost:3001/api (no changes needed for local dev)
```

### 4. Run Development Servers

From the root directory:

```bash
# Run both backend and frontend
npm run dev
```

Or run separately:

```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend && npm run dev
```

### 5. Open App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Prisma Studio**: http://localhost:5555 (run `npx prisma studio` in backend folder)

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/complete` - Mark complete
- `DELETE /api/tasks/:id/complete` - Unmark complete

### Groups
- `GET /api/groups` - List user's groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/join` - Join via invite code
- `POST /api/groups/:id/invite` - Invite user (email or userId)
- `GET /api/groups/:id/leaderboard` - Get leaderboard
- `DELETE /api/groups/:id/members/:userId` - Remove member
- `DELETE /api/groups/:id/leave` - Leave group

### Stats
- `GET /api/stats/daily` - Today's score
- `GET /api/stats/streak` - Current streak
- `GET /api/completions/calendar` - Calendar data

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/habitsquad"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Deployment

### Backend (Railway/Render)
1. Push to GitHub
2. Connect to Railway/Render
3. Set environment variables
4. Deploy

### Frontend (Vercel)
1. Push to GitHub
2. Import to Vercel
3. Set `NEXT_PUBLIC_API_URL` to your backend URL
4. Deploy

## License

MIT
