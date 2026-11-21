# MathFuel

An adaptive math practice platform for Grade 1–2 students, featuring AI-powered hints, skill mastery tracking, and parent/teacher dashboards.

## Features

- **Adaptive Practice Engine** — Difficulty adjusts automatically based on student performance
- **Deterministic Answer Checking** — Reliable, AI-independent validation for numeric, boolean, text, and choice answers
- **Scaffolded Hint System** — Progressive, animated hints revealed one at a time
- **AI Tutor** — Age-appropriate explanations and hints powered by LLM integration
- **Skill Mastery Model** — Tracks progress per skill (not started → practicing → close → mastered)
- **Student Dashboard** — Streaks, badges, recommended sessions, and mastery overview
- **Parent Dashboard** — Child progress monitoring, strengths/weaknesses analysis, and session history
- **Visual Skill Map** — Interactive domain → skill tree with mastery status
- **Gamification** — Streaks, badges, celebrations, and confetti rewards
- **Custom Authentication** — Email/password login with JWT sessions, forgot/reset password flows
- **Parent-Child Linking** — Parents can link to and monitor multiple student accounts
- **Mobile-Optimized** — Responsive design with touch-friendly targets and safe-area insets

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Framer Motion |
| Backend | Node.js, Express, tRPC 11, Drizzle ORM |
| Database | MySQL |
| Auth | bcrypt, JWT (jose) |
| AI | LLM integration for hints and explanations |
| Payments | Stripe |
| Email | Resend |
| Testing | Vitest |

## Project Structure

```
├── client/             # React frontend (pages, components, hooks, contexts)
├── server/             # Express + tRPC backend (routers, core utilities)
├── drizzle/            # Database schema and migrations
├── shared/             # Shared types and constants
├── scripts/            # Build and utility scripts
├── patches/            # pnpm dependency patches
├── vite.config.ts      # Vite configuration
├── vitest.config.ts    # Vitest configuration
├── drizzle.config.ts   # Drizzle ORM configuration
└── tsconfig.json       # TypeScript configuration
```

## Getting Started

### Saved ten missions (review build)

This branch adds Make Ten and Bridge Through Ten at `/missions`, resumable server-saved steps, and a linked-parent mission flight log. Correctness, first tries, hints, and practice recommendations are computed on the server. A new database migration is required before enabling these routes.

See [the ten-mission review notes](docs/ten-missions-review.md) for schema changes, readiness assumptions, authentication repairs, verification evidence, and the remaining staging checks. This source change does not establish which version is deployed at MathFuel.org.

For a guided local setup, SQL exercises, and bringing saved mission data into Excel, use [the MySQL and Excel lab](docs/mysql-excel-lab.md). It distinguishes the five current migrations from the legacy SQL files and uses separate development and test databases.

The optional `/workshop` discovery path uses two learning clues to open ten lessons about the interface, server, meaningful records, SQL, Excel, and applied maths. All database examples are captured fictional lab records. The [T-shirt shop lesson blueprint](docs/applied-math-shop-lesson.md) extends those ideas to counting, revenue, contribution, customer choices, and evidence; the shop is a proposed classroom simulation, not a live store.

### Prerequisites

- [Node.js](https://nodejs.org/) (22.12 or later)
- [pnpm](https://pnpm.io/) (v10+)
- MySQL database

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and other required values

# Run database migrations
pnpm db:migrate
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Production

```bash
pnpm start
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with live reload |
| `pnpm build` | Build client (Vite) and server (esbuild) for production |
| `pnpm start` | Run the production server |
| `pnpm check` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run unit tests with Vitest |
| `pnpm db:push` | Generate and apply database migrations |

## License

MIT
