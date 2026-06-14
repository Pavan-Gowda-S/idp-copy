# AI Construction Monitoring Backend - Supabase Version

This backend connects the existing `b2c_fixed2.html` frontend to Supabase.

It uses:

- Supabase PostgreSQL for database tables.
- Supabase Storage for uploaded images, PDFs, bills, and documents.
- Express + JWT for builder/customer login protection.
- The same frontend API routes, so the existing UI design does not need to change.

## Current Architecture

- `src/app.js`: Creates the Express app, CORS, JSON parsing, security middleware, and API routes.
- `src/routes`: Defines URLs like `/api/projects`, `/api/progress/:code`, and `/api/uploads/:code/bills`.
- `src/controllers`: Handles each request and response.
- `src/middlewares`: JWT login protection, role checks, validation, uploads, and errors.
- `src/services`: Shared database, upload, project, notification, and activity logic.
- `src/supabase`: Supabase client and table-name configuration.
- `src/ai-services`: Future-ready AI placeholders for Python/OpenCV/YOLO or AI APIs.
- `supabase-schema.sql`: Complete SQL file to create the database tables and Storage bucket.

## Step 1 - Create Supabase Project

1. Open [Supabase](https://supabase.com/).
2. Sign in and click **New project**.
3. Enter a project name, for example `construction-monitoring`.
4. Create a database password and save it somewhere safe.
5. Choose a region near you.
6. Click **Create new project**.

Wait until Supabase finishes creating the project.

## Step 2 - Run SQL Tables

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Click **New query**.
4. Open this file in VS Code:

```text
backend/supabase-schema.sql
```

5. Copy the full SQL content.
6. Paste it into Supabase SQL Editor.
7. Click **Run**.

This creates:

- `users`
- `builders`
- `customers`
- `projects`
- `uploads`
- `progress_updates`
- `estimations`
- `notifications`
- `tasks`
- `feedback`
- `approvals`
- `schedules`
- `delays`
- `activity_logs`
- `ai_reports`
- Supabase Storage bucket `construction-uploads`

## Step 3 - Check Storage Bucket

1. In Supabase, go to **Storage**.
2. Confirm that the bucket `construction-uploads` exists.
3. Open the bucket settings.
4. Make sure it is **Public** for college-demo image viewing.

The backend uploads files into this bucket and saves the public URL in the `uploads` table.

## Step 4 - Get Supabase Keys

1. Go to **Project Settings**.
2. Open **API**.
3. Copy:

- Project URL
- `anon public` key
- `service_role` key

Important: the `service_role` key is secret. It must stay only inside `backend/.env`. Never paste it into frontend HTML.

## Step 5 - Create `.env`

Inside the `backend` folder, copy `.env.example` to `.env`.

PowerShell command:

```bash
copy .env.example .env
```

Open `backend/.env` and fill it like this:

```env
NODE_ENV=development
PORT=5000
JWT_SECRET=write_a_long_random_secret_here
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://127.0.0.1:5500,http://localhost:5500,null
MAX_FILE_SIZE_MB=10

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=construction-uploads
```

## Step 6 - Install Packages

Open VS Code terminal in:

```text
C:\Users\lenovo\Pictures\dummy\backend
```

Run:

```bash
npm install
```

If PowerShell blocks `npm`, use:

```bash
npm.cmd install
```

If npm cache permission fails on Windows, use:

```bash
npm.cmd install --cache .\.npm-cache
```

## Step 7 - Test Supabase Connection

Run:

```bash
npm run test:supabase
```

Windows fallback:

```bash
npm.cmd run test:supabase
```

If it says `Supabase connection OK`, your backend can write and read PostgreSQL data.

## Step 8 - Seed Demo Data

Run:

```bash
npm run seed
```

Windows fallback:

```bash
npm.cmd run seed
```

Demo credentials:

- Builder username: `demo_builder`
- Builder password: `demo_builder_123456`
- Customer project code: `9823456712`

## Step 9 - Start Backend

Run:

```bash
npm run dev
```

Windows fallback:

```bash
npm.cmd run dev
```

Backend URL:

```text
http://construction-backend-7yhd.onrender.com
```

Health check:

```text
http:/construction-backend-7yhd.onrender.com/health
```

## Step 10 - Run Frontend

Open `b2c_fixed2.html` in your browser.

The frontend already calls:

```text
http://construction-backend-7yhd.onrender.com/api
```

Recommended VS Code workflow:

1. Open the full `dummy` folder in VS Code.
2. Start backend from `backend` terminal.
3. Open `b2c_fixed2.html` with Live Server or directly in browser.
4. Login as builder.
5. Open/create a 10-digit project code.
6. Upload progress images.
7. Login as customer using the same project code.
8. Confirm uploaded images and updates appear dynamically.

## Main API Routes

- `POST /api/auth/builder/register`
- `POST /api/auth/builder/login`
- `POST /api/auth/customer/login`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:code`
- `GET /api/projects/:code/dashboard`
- `GET /api/projects/:code/activity`
- `GET /api/progress/:code`
- `POST /api/progress/:code`
- `GET /api/uploads/:code/:category`
- `POST /api/uploads/:code/planned-images`
- `POST /api/uploads/:code/bills`
- `POST /api/uploads/:code/documents`
- `GET /api/feedback/:code`
- `POST /api/feedback/:code`
- `GET /api/tasks/:code`
- `POST /api/tasks/:code`
- `PATCH /api/tasks/:id`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/approvals/:code`
- `POST /api/approvals/:code`
- `PATCH /api/approvals/:id/decision`
- `GET /api/schedules/:code`
- `POST /api/schedules/:code`
- `PATCH /api/schedules/:id`
- `GET /api/delays/:code`
- `POST /api/delays/:code`
- `POST /api/ai/:code/image-analysis`
- `POST /api/ai/:code/progress-estimation`
- `POST /api/ai/:code/timeline-prediction`
- `POST /api/ai/:code/material-prediction`
- `POST /api/ai/:code/chatbot`

## Testing Checklist

1. Run `npm.cmd test`.
2. Run `npm.cmd run test:supabase`.
3. Run `npm.cmd run seed`.
4. Start backend with `npm.cmd run dev`.
5. Open frontend.
6. Login builder.
7. Create/open project code.
8. Add estimation.
9. Upload daily progress image.
10. Upload planned image.
11. Upload bill/document.
12. Login customer with same project code.
13. Check progress timeline, images, approvals, bills, documents, and feedback.

## Future AI Integration

The backend already has AI-ready endpoints. Later you can connect:

- Python scripts for OpenCV image processing.
- YOLO models for activity detection.
- AI APIs for progress summaries.
- Material prediction models.
- Remaining-day prediction models.
- Chatbot logic in `src/ai-services/ai.service.js`.

The frontend and API routes can stay stable while the AI implementation grows.
