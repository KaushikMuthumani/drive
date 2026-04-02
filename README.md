# DriveIndia — Driving School Management PWA

A complete PWA for driving schools. Admin and instructor access via web browser (installable as app). Students get a WhatsApp link — no install needed.

---

## Quick start (5 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a free project at [supabase.com](https://supabase.com) → choose **ap-south-1 (Mumbai)**
2. Go to **Settings → Database → Connection string → Transaction pooler** (port 6543)
3. Copy the URI

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env and set DATABASE_URL to your Supabase URI
```

### 4. Run database migrations
```bash
npm run db:migrate
```

### 5. Seed initial data
```bash
npm run db:seed
# Creates: 1 city, 1 school, 1 admin, 1 instructor, 1 vehicle
```

### 6. Start the app
```bash
npm run dev
# → http://localhost:3000
```

### 7. Log in
- Go to http://localhost:3000/auth/login
- Phone: **9876543211** (admin) or **9876543212** (instructor)
- OTP: **123456** (dev mode — no SMS needed)

---

## Deploy to Vercel (free)

```bash
npm install -g vercel
vercel deploy --prod
```

Set these in Vercel dashboard (Settings → Environment Variables):
| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase transaction pooler URI |
| `JWT_SECRET` | Run: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL e.g. https://driveindia.vercel.app |
| `NODE_ENV` | production |

---

## Install as PWA

**Android (Chrome):** Banner appears automatically → tap "Install app"

**iPhone (Safari):** Tap Share button → "Add to Home Screen"

Opens full-screen, no browser bar. Works like a native app.

---

## Always logged in

Login once — stay logged in for 1 year. The JWT auto-renews in the background every time you open the app.

---

## How it works

| Who | Access | How |
|---|---|---|
| Admin | `/admin/dashboard` | OTP login → JWT cookie |
| Instructor | `/instructor/schedule` | OTP login → JWT cookie |
| Student | `/s/:token` | WhatsApp link — no login |

### Student portal flow
1. Admin enrolls student → portal link generated
2. Admin copies link → pastes into WhatsApp → sends to student
3. Student taps link → opens in browser → sees schedule, progress, RTO, certificate
4. No app install. No login. No password.

### Dev OTP
In development (`NODE_ENV=development`), any phone number works and OTP is always `123456`. No MSG91 keys needed to develop.

---

## Project structure

```
src/
├── app/
│   ├── admin/         → 7 admin pages (dashboard, students, fleet, schedule, rto, instructors, reports)
│   ├── instructor/    → 3 instructor pages (schedule, students, progress)
│   ├── s/[token]/     → student portal (public, no auth)
│   ├── auth/login/    → OTP login page
│   └── api/           → 14 REST API routes
├── components/
│   ├── admin/         → 7 page components
│   ├── instructor/    → 3 page components
│   ├── student/       → StudentPortal component
│   ├── shared/        → Shell (sidebar + bottom tabs), PwaProvider, PageHeader
│   └── ui/            → Button, Card, Badge, Input, Modal, Avatar, ProgressBar…
├── db/
│   ├── schema.ts      → All 11 Drizzle ORM tables
│   └── seed.ts        → Initial data seed
└── lib/
    ├── auth/          → jwt.ts, otp.ts, session.ts
    ├── db/client.ts   → Drizzle + pg pool
    ├── course/config.ts → Course lessons, skills, token generator
    └── utils.ts       → formatINR, formatDate, cn, pct
```
