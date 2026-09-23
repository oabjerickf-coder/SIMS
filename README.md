# Student Information Management System

A glass-UI, role-based system (Student / Teacher / Admin) built with plain HTML/CSS/JavaScript and Supabase, matching this flow:

```
Start → Login (username/password) → Login successful?
  NO  → try again
  YES → Select role
          Student → View grade, View profile
          Teacher → View profile, Enter grades, Update grade
          Admin   → Manage student, Generate report
                → Logout → End
```

## Files

```
simsystem/
├── .gitignore            Prevents secret config files from being committed
├── index.html            Login / sign-up page
├── dashboard.html        Role-based dashboard (all views)
├── css/style.css         Glassmorphism design system
├── js/config.example.js  Template for Supabase credentials
├── js/config.js          (Ignored by git) Your actual Supabase API keys
├── js/supabase-client.js Initializes Supabase client
├── js/auth.js            Login / sign-up logic
├── js/dashboard.js       All dashboard views + data queries
└── supabase-schema.sql   Database schema + security rules
```

## Step 1 — Create a Supabase project

1. Go to **supabase.com** → sign in → **New project**.
2. Pick a name, database password, and region. Wait ~2 minutes for it to provision.

## Step 2 — Run the database schema

1. In your Supabase project, open **SQL Editor** → **New query**.
2. Open `supabase-schema.sql` from this project, copy all of it, paste it in, and click **Run**.
3. This creates:
   - `profiles`, `students`, `teachers`, `grades` tables
   - A trigger that auto-fills `profiles`/`students`/`teachers` whenever someone signs up
   - Row Level Security policies so students only see their own data, teachers can manage grades, and admins can see everything

## Step 3 — Turn off email confirmation (optional, for quick testing)

By default Supabase requires email confirmation before login works.
For local testing: **Authentication → Providers → Email → turn off "Confirm email"**.
(For a real deployment, leave confirmation on and configure a sender.)

## Step 4 — Connect the app to your project

1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon public key**.
3. Duplicate `js/config.example.js` and save it as `js/config.js` (this file is ignored by `.gitignore` so your keys won't be pushed to Git):
   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
   ```
4. Save the file.

## Step 5 — Run it locally

Any static file server works, for example:

```bash
cd simsystem
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

(Opening `index.html` directly by double-clicking can work too, but a local server avoids browser file-access restrictions.)

## Step 6 — Create your first accounts

1. On the login page, click **Create one**.
2. Fill in name, choose a role (Student / Teacher / Admin), email, password → **Create account**.
3. Create at least:
   - One **Admin** account (to manage students / generate reports)
   - One **Teacher** account (to enter/update grades)
   - One or more **Student** accounts (to view grades/profile)
4. Sign in with each to see their dashboard.

## Step 7 — Try the flow

- **Student**: View grade (empty until a teacher enters one), View profile.
- **Teacher**: Enter grades (pick a student, subject, term, grade) → Update grade (edit any existing grade).
- **Admin**: Manage student (roster + counts), Generate report (all grades, with CSV export).
- **Logout** from the sidebar returns everyone to the login page — matching the flowchart's end state.

## Step 8 — Deploy (optional)

This is a static site — no build step. Deploy the whole `simsystem` folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, etc.) and it will talk to your Supabase project directly. In Supabase, add your deployed domain under **Authentication → URL Configuration → Site URL / Redirect URLs**.

## Notes on the design

- Deep navy glass panels with a muted gold accent, "Fraunces" serif for headings and "Inter" for UI text — built to feel like an institutional records system rather than a generic SaaS template.
- All data access is enforced by Postgres Row Level Security, not just hidden in the UI — a student cannot fetch another student's grades even by editing requests directly.
