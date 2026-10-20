# TaskMaster — Full-stack task management app

A responsive task manager starter with:
- React + Vite frontend
- Express REST API
- MongoDB + Mongoose persistence
- JWT authentication and per-user task authorization
- Task CRUD, search/filter, status and priority, due dates
- Optional Socket.IO real-time task events
- Responsive dashboard UI

## Requirements
- Node.js 20+
- MongoDB local instance or MongoDB Atlas connection string

## 1. Configure and run the API
```bash
cd backend
cp .env.example .env
# Set MONGODB_URI and JWT_SECRET in .env
npm install
npm run dev
```
API defaults to `http://localhost:5000`.

## 2. Configure and run the frontend
In a second terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173).

## Demo flow
1. Register a user.
2. Create tasks with title, description, priority, status and due date.
3. Search and filter the task list; edit, complete, or delete tasks.
4. Open the app in another browser session to try live updates.

## API
- `POST /api/auth/register` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me` — current user (JWT required)
- `GET /api/tasks?search=&status=&priority=` — list your tasks
- `POST /api/tasks` — create task
- `GET /api/tasks/:id` — read one of your tasks
- `PATCH /api/tasks/:id` — update one of your tasks
- `DELETE /api/tasks/:id` — delete one of your tasks
- `GET /api/health` — health check

All `/api/tasks` endpoints require `Authorization: Bearer <token>`.
Task ownership is enforced on the server; users cannot read or modify another user's tasks.

## Production notes
This is a learning starter, not a production security audit. Before deployment:
- use HTTPS and a strong unique JWT secret
- consider secure HttpOnly cookie-based auth, CSRF protections, rate limiting, and email verification
- add request validation, logging, monitoring, automated tests, and database backups
- configure CORS to your exact frontend origin
- never commit `.env` files or secrets
