---
name: Admin credentials
description: Default admin login and how bcrypt hash is stored/updated
---

Default admin credentials: `admin` / `admin123`

**Why this matters:** The bcrypt hash in `db/schema.sql` uses `ON CONFLICT (username) DO NOTHING` — so if the wrong hash was inserted on first migration, later schema re-runs won't fix it. Must update via SQL query directly.

**How to apply:**
- Hash is stored in `db/schema.sql` in the INSERT for admins table
- If hash needs regeneration: `node -e "import('bcryptjs').then(m => m.default.hash('newpass', 10).then(h => console.log(h)))"`
- To update live DB: `UPDATE admins SET password_hash = '$2a$10$...' WHERE username = 'admin';`
- Current working hash for admin123: `$2a$10$DVPUGNzoCrVsJYtlJKqaj.fflicVQK8LJaZYoDUw0.pCWp4QuTp5q`
- Change password from Settings page in dashboard or via `PUT /api/auth/change-password`
