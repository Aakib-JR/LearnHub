# LearnHub

LearnHub is a full-stack online learning platform built for course creators and learners. Instructors can create courses and publish lessons; students can discover courses, enroll, study lessons, and track their progress.

## Features

- Account registration, login, and logout with bcrypt password hashing and JWT authentication in HTTP-only cookies.
- Three application roles: administrator, instructor, and student (stored as `admin`, `instructor`, and `user`).
- Course discovery, search, creation, editing, and deletion, with seat availability management.
- Retryable MongoDB lesson-content cleanup when a course is deleted.
- Course lessons with text or video content, managed by course owners and administrators.
- Student enrollment and unenrollment, duplicate-enrollment protection, and seat availability updates.
- Lesson completion tracking and course progress summaries.
- Role-specific administrator, instructor, and student dashboards.
- Responsive pages styled with Bootstrap and CSS Modules.

## Technology stack

| Technology | Use |
|---|---|
| Next.js 16 App Router | Full-stack application and routing |
| React 19 | User interface |
| TypeScript | Application types |
| PostgreSQL | Users, courses, enrollments, lesson progress, and migration records |
| MongoDB and Mongoose | Course lesson content |
| Bootstrap 5 | Base and responsive styling |
| CSS Modules | Page and component-specific styling |
| bcryptjs | Password hashing |
| JSON Web Token | Cookie-based authentication |
| Zod | Request validation |

## Project structure

```text
learnhub/
├── migrations/                  # Ordered PostgreSQL SQL migrations
├── scripts/
│   ├── migrate.ts               # Migration runner
│   ├── seed.ts                  # Optional initial accounts and sample courses
│   └── retry-course-content-cleanup.ts
├── src/
│   ├── app/
│   │   ├── about/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── courses/
│   │   │   └── dashboard/
│   │   ├── courses/
│   │   │   ├── [id]/
│   │   │   │   └── edit/
│   │   │   └── new/
│   │   ├── dashboard/
│   │   ├── login/
│   │   └── register/
│   ├── components/
│   ├── lib/
│   │   └── validations/
│   └── models/
│       └── CourseContent.ts
├── .env.example
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20.9 or later and npm
- PostgreSQL
- MongoDB
- Git

## Installation and local setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/Aakib-JR/LearnHub.git
   cd LearnHub
   npm install
   ```

2. Create a PostgreSQL database named `learnhub` if it does not already exist. For example, connect to PostgreSQL as a role that can create databases and run:

   ```sql
   CREATE DATABASE learnhub;
   ```

3. Start MongoDB locally, or prepare a MongoDB connection URI for your environment. The database name in the example URI is `learnhub`; MongoDB creates the database when the application first writes data.

4. Create `.env.local` in the project root using `.env.example` and the safe placeholders below. Replace the PostgreSQL password and JWT placeholder locally. Do not commit `.env.local` or put real credentials in documentation.

   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/learnhub
   MONGODB_URI=mongodb://127.0.0.1:27017/learnhub
   JWT_SECRET=replace_with_a_long_random_secret
   ```

5. Apply pending PostgreSQL migrations:

   ```bash
   npm run migrate
   ```

   The runner applies unrecorded SQL migrations in filename order and records completed migrations in `schema_migrations`. It intentionally skips the historical role-promotion migrations `005_add_user_roles.sql` and `006_add_instructor_role.sql`; the forward migration defines the current role schema instead. It does not record skipped migrations as applied.

   Back up an existing database before migrating it. Migrations `007` and `008` require existing cleanup-job rows to have non-NULL `course_id` values; if an older cleanup table contains rows without IDs, map them before applying migrations.

6. Optionally provision accounts and sample course content as described under [Seeding](#seeding).

7. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

The application and scripts read these required variables from `.env.local`:

| Variable | Purpose | Example placeholder |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:YOUR_PASSWORD@localhost:5432/learnhub` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/learnhub` |
| `JWT_SECRET` | Secret used to sign authentication tokens | `replace_with_a_long_random_secret` |

Use a unique, unpredictable JWT secret in each environment. Keep all real passwords, connection strings, and secrets out of Git and logs.

## Database setup

### PostgreSQL

PostgreSQL stores user accounts, roles, courses, seat counts, enrollments, lesson progress, migration records, and pending course-content cleanup jobs. After creating the database and configuring `DATABASE_URL`, run:

```bash
npm run migrate
```

The migration runner applies pending migrations transactionally and skips filenames already recorded in `schema_migrations`. It skips migrations 005 and 006 because they are historical role-promotion migrations; migration 007 provides the forward role schema, and migration 008 repairs the cleanup-job schema. The runner does not reset or seed the database.

### MongoDB

MongoDB stores course lesson content in `CourseContent` documents, including embedded lesson IDs, titles, types, bodies, and optional video URLs. Set `MONGODB_URI` and make sure the MongoDB service is reachable before using lesson features or running the seed script.

## Seeding

Run the seed script with:

```bash
npm run seed
```

The seed script can create an initial administrator and an optional seed instructor when their environment variables are explicitly provided. It does not use a built-in demo password, reset an existing password, or change an existing user's role. Password values must be at least 12 characters. Add any variables needed for a one-time local setup to `.env.local`; never commit real values.

Optional administrator provisioning:

```env
LEARNHUB_INITIAL_ADMIN_EMAIL=admin@example.test
LEARNHUB_INITIAL_ADMIN_PASSWORD=replace_with_a_unique_password_of_12_or_more_characters
```

If an administrator already exists, the seed script preserves it and does not change its credentials. If the requested email belongs to an existing non-admin account, provisioning stops without changing that account.

Optional seed instructor provisioning:

```env
LEARNHUB_SEED_INSTRUCTOR_EMAIL=instructor@example.test
LEARNHUB_SEED_INSTRUCTOR_PASSWORD=replace_with_a_unique_password_of_12_or_more_characters
```

To select an existing instructor, set `LEARNHUB_SEED_INSTRUCTOR_EMAIL` and leave the password unset. To create a new instructor, set both variables. If no instructor is selected or created, sample course and lesson seeding is skipped; administrator provisioning can still run. If the configured email belongs to a non-instructor, the script stops instead of changing that account's role.

When an instructor is available, the script creates or updates its sample courses and seeded lessons. Existing seeded lesson IDs are preserved during updates; unrelated lessons are not deleted. Review the seed script before rerunning it against a database containing courses owned by the configured instructor.

If a course deletion leaves a queued MongoDB cleanup job, the retry worker can be run manually after checking the pending jobs and confirming both databases are available:

```bash
npx tsx scripts/retry-course-content-cleanup.ts
```

## Development and production

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Serve the production build
npm run lint      # Run ESLint
```

Run `npm run build` before `npm run start`. Configure the required environment variables in the environment where the application runs.

## API overview

All course IDs represented by `[id]` are PostgreSQL course IDs. Authenticated requests use the HTTP-only authentication cookie.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Register a student (`user`) or instructor account |
| `POST` | `/api/auth/login` | Authenticate and set the session cookie |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/auth/me` | Return the authenticated user's information |
| `GET` | `/api/courses` | List courses; supports the `search` query parameter |
| `POST` | `/api/courses` | Create a course as an administrator or instructor |
| `GET` | `/api/courses/[id]` | Get course details |
| `PATCH` | `/api/courses/[id]` | Update a course |
| `DELETE` | `/api/courses/[id]` | Delete a course |
| `GET` | `/api/courses/[id]/lessons` | Read lessons when authorized |
| `PUT` | `/api/courses/[id]/lessons` | Create or update course lessons |
| `GET` | `/api/courses/[id]/enroll` | Check the current user's enrollment |
| `POST` | `/api/courses/[id]/enroll` | Enroll the current student |
| `DELETE` | `/api/courses/[id]/enroll` | Unenroll the current student |
| `GET` | `/api/courses/[id]/progress` | Read course progress |
| `POST` | `/api/courses/[id]/progress` | Mark a lesson complete |
| `GET` | `/api/dashboard` | Return data for the current user's role-specific dashboard |
| `GET` | `/api/db-test` | Check PostgreSQL connectivity |
| `GET` | `/api/mongo-test` | Check MongoDB connectivity |

The database diagnostic endpoints return connection status; protect or disable access to them as appropriate when deploying the application publicly.

## Authentication and roles

- Passwords are hashed with `bcryptjs`; the plain-text password is not stored.
- A signed JWT is stored in an HTTP-only cookie, which client-side JavaScript cannot read.
- Public registration supports the `user` and `instructor` roles. The application labels the `user` role as **Student**.
- Instructors can create and manage their own courses and lessons.
- Administrators can manage courses across the platform.
- Students can enroll in courses, access lessons for courses they are enrolled in, and track lesson completion.
- Administrator provisioning is an explicit seed operation; public registration does not offer the administrator role.

## Testing and validation

Run the available validation commands:

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

`package.json` does not currently define a test script.

## Project notes

- PostgreSQL handles relational records and enrollment transactions; MongoDB stores flexible lesson documents.
- Zod schemas validate API input.
- The seed script is optional and should be reviewed before running against an existing database.
- Do not use production credentials or real user data for local demonstrations.

## AI disclosure

AI tools were used as development assistance for learning, debugging, code suggestions, and documentation. The implementation was reviewed during development.

## Author

**LearnHub - Software Development Intern Take-Home Assessment**

[GitHub repository](https://github.com/Aakib-JR/LearnHub)
