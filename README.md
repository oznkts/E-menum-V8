# E-Menum Web Application

Digital QR Menu and Price Ledger SaaS Platform for the Turkish Food & Beverage industry.

## Overview

E-Menum is a comprehensive multi-tenant SaaS platform that enables restaurants, cafes, and F&B establishments to:
- Create and manage digital QR menus
- Process customer orders in real-time
- Track prices with an immutable price ledger (Turkish regulatory compliance)
- Generate branded QR codes for tables
- Manage kitchen operations with real-time updates

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.1.x | Full-stack React framework (App Router) |
| React | 19.x | UI library |
| TypeScript | 5.7.x | Type-safe JavaScript (strict mode) |
| Tailwind CSS | 3.4.x | Utility-first CSS framework |
| Supabase | Latest | PostgreSQL, Auth, Storage, Realtime |
| TanStack Query | v5.62+ | Server state management |
| Zustand | v5 | Client state management |
| Zod | v3.24+ | Schema validation |
| React Hook Form | v7.54+ | Form handling |
| Vitest | v3+ | Unit and integration testing |

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js >= 20.9.0** (Required for Supabase v2.79+ compatibility)
  ```bash
  node --version  # Should output v20.9.0 or higher
  ```
- **npm** (comes with Node.js)
- **Supabase CLI** (optional, for local development)
  ```bash
  npm install -g supabase
  ```

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd e-menum-web
```

### Step 2: Install Dependencies

> **Important**: Always use `--legacy-peer-deps` flag due to React 19 peer dependency requirements.

```bash
npm install --legacy-peer-deps
```

### Step 3: Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your Supabase credentials:
   ```env
   # Supabase Configuration (Required)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Optional: AI Features
   OPENAI_API_KEY=your_openai_api_key

   # Optional: Rate Limiting
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   ```

### Step 4: Database Setup

#### Option A: Using Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and keys to `.env.local`
3. Apply database migrations:
   ```bash
   # Using Supabase CLI
   supabase link --project-ref your-project-ref
   supabase db push
   ```

#### Option B: Using Supabase Local (Development)

1. Start local Supabase:
   ```bash
   supabase start
   ```
2. Apply migrations:
   ```bash
   supabase db push
   ```
3. Access Supabase Studio at http://localhost:54323

### Step 5: Create Storage Buckets

In Supabase Dashboard, create the following storage buckets:

| Bucket Name | Access | Purpose |
|-------------|--------|---------|
| `product-images` | Public | Product/menu item images |
| `organization-assets` | Private | Restaurant logos, covers |

### Step 6: Seed Demo Data (Optional)

To populate the database with realistic Turkish restaurant demo data:

```bash
npm run seed
```

To clear existing data before seeding:
```bash
npm run seed:clean
```

### Step 7: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create optimized production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint for code quality |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run seed` | Seed database with demo data |
| `npm run seed:clean` | Clear and reseed database |

## Project Structure

```
e-menum-web/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/               # Authentication pages (login, register, etc.)
│   │   ├── (dashboard)/          # Restaurant dashboard pages
│   │   ├── (public)/             # Public menu pages
│   │   ├── layout.tsx            # Root layout with providers
│   │   └── page.tsx              # Landing page
│   ├── components/
│   │   ├── features/             # Feature-specific components
│   │   │   ├── menu/             # Menu management components
│   │   │   ├── orders/           # Order management components
│   │   │   ├── public-menu/      # Public menu components
│   │   │   └── qr/               # QR code components
│   │   ├── layout/               # Layout components (sidebar, header)
│   │   ├── providers/            # Context providers
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/
│   │   ├── actions/              # Server Actions
│   │   ├── dal/                  # Data Access Layer
│   │   ├── hooks/                # Custom React hooks
│   │   ├── stores/               # Zustand stores
│   │   ├── supabase/             # Supabase client utilities
│   │   ├── utils/                # Utility functions
│   │   └── validations/          # Zod validation schemas
│   ├── styles/                   # Global styles
│   └── types/                    # TypeScript type definitions
├── supabase/
│   └── migrations/               # Database migrations
├── scripts/                      # Utility scripts
├── public/                       # Static assets
├── middleware.ts                 # Auth middleware
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── vitest.config.mts             # Vitest test configuration
└── package.json                  # Dependencies and scripts
```

## Development Guidelines

### Code Style

- **TypeScript**: Strict mode is enabled. Never use `any` type.
- **Imports**: Use path alias `@/` for all imports:
  ```typescript
  // Good
  import { Button } from '@/components/ui/button'

  // Bad
  import { Button } from '../../../components/ui/button'
  ```
- **Components**: Server Components by default. Add `'use client'` only for interactive components.
- **Styling**: Use Tailwind CSS utilities. Custom CSS only when necessary.
- **Console**: Remove all `console.log` statements before committing.
- **Language**: Turkish-first UI with English code comments.

### Database Access

- Always use the Data Access Layer (`@/lib/dal/`) for database operations
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code
- Use Server Actions (`@/lib/actions/`) for mutations

### Form Handling

- Use React Hook Form with Zod resolvers
- Validation schemas are in `@/lib/validations/`
- Error messages should be in Turkish

### Testing

- Write unit tests for validation schemas and utility functions
- Test files should be in `__tests__` directories
- Run tests before committing: `npm run test`

## Verification

Before deploying or creating a PR, verify your changes:

```bash
# Run all verification commands
npm run build && npm run lint && npm run typecheck && npm run test
```

All commands should pass without errors.

## Troubleshooting

### "peer dependency" errors during npm install

```bash
# Always use --legacy-peer-deps with React 19
npm install --legacy-peer-deps
npm install <package> --legacy-peer-deps
```

### TypeScript errors after schema changes

```bash
# Regenerate types from Supabase
supabase gen types typescript --local > src/types/database.ts
```

### RLS blocking queries

1. Check if user is authenticated
2. Verify organization membership
3. Check role permissions
4. Review RLS policies in Supabase Dashboard

### Price ledger UPDATE/DELETE failing

This is **expected behavior**. The price ledger is immutable by design (Turkish regulatory compliance). To change a price:

1. Update the product's `price` column
2. A new `price_ledger` entry is created automatically via database trigger

### Build fails with "Module not found"

1. Clear Next.js cache:
   ```bash
   rm -rf .next
   ```
2. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```

### Supabase connection issues

1. Verify environment variables are set correctly
2. Check if Supabase project is active
3. Verify network connectivity to Supabase

## Security Considerations

- **RLS Policies**: All tables have Row Level Security enabled
- **Multi-tenancy**: Data is isolated by `organization_id`
- **Auth**: Uses Supabase Auth with session management
- **Secrets**: Never commit `.env.local` or expose service role keys
- **Immutable Price Ledger**: Database triggers prevent modifications

## API Routes

The application uses Server Actions instead of traditional API routes for most operations. The only API routes are for webhooks:

- `/api/webhooks/` - External service webhooks

## Contributing

1. Follow the code style guidelines above
2. Write tests for new features
3. Run verification commands before PR
4. Use conventional commit messages

## License

Private - All rights reserved.

---

*For more detailed information, see `development_roadmap.md`*
