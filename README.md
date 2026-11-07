# Avya Woodcraft LLP: Company Attendance and Operations App

React (Vite) frontend, Node/Express backend, PostgreSQL on Supabase.

## Status
| Part | State |
|---|---|
| `client/` React frontend (admin + employee) | **Done** (this commit) |
| `server/` attendance, device pairing, selfie, GPS, leave, work log (v1) | Done |
| `server/` routes for production, costing, inventory, petty cash, advances, teams, photos, day types | **Next**, contract in [`docs/API.md`](docs/API.md) |

Until the backend is extended, admin pages for those modules show an error. Login, employee punch, work log, hours and leave already work against the v1 backend.

## Admin screens
Overview, Approvals, **Production** (live items, completed items, who worked and how many hours, timeline, all editable), Work log, Employees, Teams, Advances, Leave, **Costing** (BOQ and completed-item history), Petty cash, Inventory, Salary, Monthly report (half day, double shift, custom days, Sunday off), Devices, Settings.

## Run locally
```bash
cd client && npm install && npm run dev      # http://localhost:5173, proxies /api to :4000
cd server && npm install && npm run dev      # needs server/.env
```
Copy `client/.env.example` and `server/.env.example` to `.env` and fill in your own values. Never commit real keys. Run `database/schema.sql` in the Supabase SQL editor.

## Deploy (free tiers)
Frontend on Vercel (root `client`, set `VITE_API_URL`), backend on Render (root `server`), database on Supabase.
