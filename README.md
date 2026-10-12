# Nexus Assignment Deadline Dashboard

An intelligent academic assignment tracking and study planning dashboard designed for students to manage deadlines, calculate automated risk and priority scores, track subtasks and resources, optimize study schedules using an algorithmic daily planner, and collaborate via study groups.

---

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, Lucide React, Recharts
- **Backend**: Node.js, Express 5
- **Authentication**: Clerk (`@clerk/react` on frontend, `@clerk/backend` in production)
- **Database**: Google Cloud Firestore (via `firebase-admin` on the backend only)
- **Deployment**: Vercel Serverless Functions (`api/index.js`)

---

## 🔑 Required Environment Variables

### Backend (`backend/.env` and Vercel Environment Variables)

| Variable | Description |
| :--- | :--- |
| `FIREBASE_PROJECT_ID` | Your Firebase Project ID (e.g. `student-assignment-manag-4a947`) |
| `FIREBASE_CLIENT_EMAIL` | Service account email from Firebase serviceAccountKey.json |
| `FIREBASE_PRIVATE_KEY` | Private key string from Firebase service account (including `\n`) |
| `CLERK_SECRET_KEY` | Clerk Secret Key for production backend token verification |
| `NODE_ENV` | Set to `production` in Vercel settings |
| `PORT` | Local dev port (defaults to `5000`) |

### Frontend (`frontend/.env` and Vercel Environment Variables)

| Variable | Description |
| :--- | :--- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key (e.g. `pk_test_...`) |

---

## 🛠️ Firebase Setup Guide

1. **Create a Firebase Project**:
   - Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.
   - Under **Build > Firestore Database**, click **Create Database** (choose production or test mode in your preferred region).

2. **Generate Service Account Key**:
   - Go to **Project Settings (gear icon) > Service Accounts**.
   - Click **Generate new private key** and download the JSON file.
   - Extract `project_id`, `client_email`, and `private_key` into `backend/.env`.
   - **Never commit `serviceAccountKey.json` or `.env` to Git.** (Already protected in `.gitignore`).

3. **Install Dependencies & Seed Database**:
   ```bash
   cd backend
   npm install
   npm run seed
   ```

---

## 🏃 Running the Application Locally

1. **Start Backend Server**:
   ```bash
   cd backend
   npm start
   ```
   *Runs on `http://localhost:5000`.*

2. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Runs on `http://localhost:3000` and proxies `/api` calls to port 5000.*

3. **Run Backend Test Suites**:
   ```bash
   cd backend
   npm test
   ```
   *(Executes all tests in `backend/tests/`: Firebase connection, Auth, Assignments, Planner/Analytics, Gamification, and Study Groups).*

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub.
2. Import the project in Vercel.
3. In **Project Settings > Environment Variables**, add:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `CLERK_SECRET_KEY`
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `NODE_ENV=production`
4. Deploy! Vercel automatically routes `/api/*` to `api/index.js` and serves the frontend Single Page App.
