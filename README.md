# Healthcare Appointment & Follow-up Manager

A full-stack healthcare appointment platform with separate portals for patients, doctors, and admin. Features AI-powered symptom summaries, email/calendar integration, medication reminders, and role-based access control.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router v6
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Queue:** Redis + Bull (background jobs)
- **AI:** OpenAI GPT-4o-mini
- **Email:** Nodemailer / SendGrid
- **Calendar:** Google Calendar API (OAuth 2.0)

---

## Project Structure

```
healthcare-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   ├── src/
│   │   ├── config/          # env config, prisma client
│   │   ├── middleware/       # auth, error handler
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── types/           # Shared types
│   │   ├── utils/           # helpers (JWT, slots)
│   │   └── workers/         # Bull queue workers
│   ├── docker-compose.yml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client
│   │   ├── components/      # Layout, ProtectedRoute
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Page components
│   │   │   ├── admin/       # Admin portal
│   │   │   ├── doctor/      # Doctor portal
│   │   │   └── patient/     # Patient portal
│   │   └── types/           # TypeScript types
│   └── vite.config.ts
└── README.md
```

---

## Setup Guide

### Prerequisites

- Node.js 18+
- PostgreSQL 16+
- Redis 7+
- Docker (optional, for local infra)

### 1. Clone & Install

```bash
git clone <repo-url>
cd healthcare-app

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Database Setup

**Option A: Using Docker (recommended)**

```bash
cd backend
docker compose up -d
```

This starts PostgreSQL (port 5433), Redis (port 6379), and Mailpit (port 1025/8025).

**Option B: Manual**

Ensure PostgreSQL and Redis are running locally.

### 3. Environment Variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values:

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `OPENAI_API_KEY` | OpenAI API key for LLM features | For LLM |
| `SENDGRID_API_KEY` | SendGrid API key for email | For email |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Calendar |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For Calendar |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth refresh token | For Calendar |
| `REDIS_URL` | Redis connection string | Yes |

For local development without external services, LLM and Calendar features gracefully degrade (logs instead of failing).

### 4. Database Migration & Seed

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Workers:**

```bash
cd backend
npm run worker:email
npm run worker:reminder
npm run worker:slot
```

**Terminal 3 - Frontend:**

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:4000`.

### 6. Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@healthcare.com` | `admin123` |
| Doctor | `dr.smith@healthcare.com` | `doctor123` |
| Doctor | `dr.jones@healthcare.com` | `doctor123` |
| Patient | `alice@example.com` | `patient123` |

---

## API Documentation

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register user | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/profile` | Get profile | Yes |

**Register:**
```json
{ "email": "user@example.com", "password": "pass123", "name": "John", "role": "PATIENT", "phone": "+1234567890" }
```

**Login:**
```json
{ "email": "user@example.com", "password": "pass123" }
```

### Admin Endpoints (requires ADMIN role)

| 
 |
|---|---|---|
| GET | `/api/admin/doctors` | List all doctors |
| POST | `/api/admin/doctors` | Create doctor |
| PUT | `/api/admin/doctors/:id` | Update doctor |
| DELETE | `/api/admin/doctors/:id` | Deactivate doctor |
| POST | `/api/admin/doctors/:id/availability` | Set availability schedule |
| POST | `/api/admin/doctors/:id/leave` | Mark doctor leave |
| GET | `/api/admin/appointments` | List all appointments |
| GET | `/api/admin/appointments/stats` | Dashboard stats |

### Patient Endpoints (requires PATIENT role)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patients/doctors` | Search doctors (`?specialization=Cardiology`) |
| GET | `/api/patients/doctors/:id/slots` | Get available slots (`?date=2026-07-10`) |
| POST | `/api/patients/slots/hold` | Hold a slot (10min expiry) |
| POST | `/api/patients/appointments` | Book appointment |
| PUT | `/api/patients/appointments/:id/symptoms` | Submit symptoms |
| GET | `/api/patients/appointments` | List my appointments |
| GET | `/api/patients/appointments/:id` | Get appointment details |
| DELETE | `/api/patients/appointments/:id` | Cancel appointment |
| GET | `/api/patients/medications` | Get medications |

### Doctor Endpoints (requires DOCTOR role)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/doctors/appointments` | List appointments |
| GET | `/api/doctors/appointments/:id` | Get appointment details |
| PUT | `/api/doctors/appointments/:id/notes` | Submit post-visit notes |
| PUT | `/api/doctors/appointments/:id/status` | Update status |
| GET | `/api/doctors/profile` | Get profile |
| GET | `/api/doctors/stats` | Dashboard stats |

### Calendar Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/calendar/auth` | Get Google OAuth URL |
| GET | `/api/calendar/oauth2callback` | Handle OAuth callback |
| GET | `/api/calendar/status` | Check Calendar config status |

---

## Database Schema

### Key Models

**User** - Base user with role-based access (PATIENT, DOCTOR, ADMIN)
**Doctor** - Doctor profile linked to User, with specialization, slot duration, fee
**DoctorAvailability** - Weekly schedule (dayOfWeek, startTime, endTime)
**DoctorLeave** - Leave records (date, reason)
**Patient** - Patient profile with medical info (DOB, blood group, allergies)
**Appointment** - Core entity linking Patient and Doctor with status, symptoms, LLM summaries
**SlotHold** - Temporary slot locks (10-min expiry) for booking flow
**Medication** - Prescribed medications with dosage, frequency, duration, reminders
**Notification** - Email notification queue with retry tracking
**CalendarEvent** - Google Calendar event references

### Unique Constraint

`@@unique([doctorId, date, startTime])` on Appointment prevents double-booking at the database level.

---

## LLM Prompts

### Pre-Visit Summary

```
Analyse these symptoms and return a JSON object (no markdown, no code fences, pure JSON only) with:
- urgencyLevel: "Low" | "Medium" | "High"
- chiefComplaint: string (main issue identified)
- suggestedQuestions: string[] (three questions for the doctor)

Symptoms: {symptoms}
Patient age: {age}
Existing conditions: {conditions}
```

**Graceful degradation:** If the LLM call fails or returns invalid JSON, the system logs the error and continues without the summary. The appointment booking is never blocked by an LLM failure.

### Post-Visit Summary

```
Convert these clinical notes into a patient-friendly summary. Return a JSON object (no markdown, no code fences, pure JSON only) with:
- summary: string (easy to understand visit summary)
- diagnosis: string
- medicationSchedule: array of { name: string, dosage: string, frequency: string, duration: string, instructions: string }
- followUpSteps: string[]
- whenToSeekHelp: string

Clinical Notes: {notes}
Prescriptions: {prescriptions}
```

The medication schedule from the LLM response is automatically parsed and stored as `Medication` records in the database, enabling automated reminder scheduling.

---

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable **Google Calendar API**
3. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Set application type to **Web application**
5. Add redirect URI: `http://localhost:4000/api/calendar/oauth2callback`
6. Copy **Client ID** and **Client Secret** to `.env`
7. Visit `http://localhost:4000/api/calendar/auth` to get the auth URL
8. Authorize the app and copy the returned refresh token
9. Add all values to `.env`

```env
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/calendar/oauth2callback"
GOOGLE_REFRESH_TOKEN="your-refresh-token"
```

Without configuration, Calendar features log actions instead of making API calls (mock mode).

---

## System Design Write-up

### Double-Booking Prevention

The system prevents double-booking through a multi-layered approach. At the database level, the Appointment model has a composite unique constraint `@@unique([doctorId, date, startTime])`, ensuring PostgreSQL rejects any duplicate insertion atomically. At the application level, booking happens inside a Prisma transaction (`$transaction`): we first check for existing bookings, then create the appointment, and finally clean up any slot holds — all within a single DB transaction. The frontend also displays real-time available slots by querying both confirmed bookings and active slot holds (with expiry checks), preventing users from even selecting an already-taken slot. For simultaneous booking attempts, the transaction's serializable isolation ensures that only the first conflicting write succeeds; the second attempt receives a Prisma unique constraint error which the service layer translates to a user-friendly "Slot already booked" response.

### Doctor Leave Conflict Handling

When an admin marks a doctor on leave for a specific date, the `notifyDoctorLeave` function queries all appointments with SCHEDULED or CONFIRMED status for that doctor on that date. Each affected appointment is atomically updated to CANCELLED status with the leave reason stored as `cancellationReason`. For each affected patient, the system creates a notification record (EMAIL channel, PENDING status) and sends an immediate email notification explaining the cancellation due to doctor leave. The email worker retries failed deliveries up to 5 times with exponential backoff. The leave date is validated against the schedule before being applied, and the admin dashboard shows the count of cancelled appointments as confirmation feedback.

### Slot Hold Mechanism

The booking flow implements a temporary hold pattern to prevent conflicts during the symptom-form-filling step. When a patient selects a slot, a `SlotHold` record is created with a 10-minute TTL (`expiresAt = now + 10min`). The hold is checked before displaying a slot as available: queries filter out slots with active (non-expired) holds held by other patients. If a patient's hold expires before they complete booking, they must re-select a slot. Upon successful booking within the transaction, the hold is explicitly deleted. A background worker (`slotCleanupWorker`) runs every 5 minutes to remove expired holds from the database as a safety net. The hold mechanism includes the patient's identity, preventing a patient from holding a slot they cannot book while allowing them to extend their own hold if needed.

### Notification Failure Handling

All email notifications follow a persistent queue pattern using the `Notification` model in PostgreSQL. Each notification starts with `PENDING` status and a `nextRetryAt` timestamp. The `processNotification` function handles individual delivery: on success, status is set to `SENT` with a timestamp; on failure, the retry count increments and `nextRetryAt` is calculated using exponential backoff delays (1min, 5min, 15min, 1hr, 6hrs). After 5 failed attempts, the notification is marked `FAILED` and no more retries occur. The Bull-based `emailWorker` polls for pending notifications every 30 seconds and processes them through the queue with its own retry/backoff configuration. This dual-layer approach (DB persistence + Bull queue) ensures no notifications are lost during system restarts and provides observability into delivery status for admin monitoring.

---

## Portals Overview

### Patient Portal
- Register/login, search doctors by specialization
- View available slots, book appointments with symptom form
- View AI-generated pre-visit urgency assessment
- Cancel appointments with reason
- View post-visit summaries and medication schedules
- Receive email confirmations, reminders, cancellation notices
- Google Calendar integration for appointments

### Doctor Portal
- View appointments with patient details
- Review AI-generated pre-visit symptom summaries with urgency
- Confirm or cancel appointments
- Submit post-visit clinical notes (AI generates patient-friendly summary)
- Prescribe medications (automatic reminder scheduling)

### Admin Portal
- Create and manage doctor profiles (specialization, working hours, slot duration)
- Set doctor availability schedules by day of week
- Mark doctor leave (auto-cancels appointments, notifies patients)
- View all appointments with status filtering
- Dashboard with system-wide statistics
