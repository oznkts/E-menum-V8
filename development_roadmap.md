# E-Menum Development Roadmap

## Executive Summary

E-Menum is a comprehensive Digital QR Menu and Price Ledger SaaS Platform targeting the Turkish Food & Beverage industry. This document outlines the complete development roadmap, technical decisions, and implementation status.

**Target Market:** Turkish restaurants, cafes, and F&B establishments
**Primary Value Proposition:**
- Digital QR menus with real-time updates
- Immutable price ledger for Turkish regulatory compliance
- Multi-tenant architecture with enterprise-grade security

---

## Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.1.x | Full-stack React framework (App Router) |
| React | 19.x | UI library |
| TypeScript | 5.7.x | Type-safe JavaScript (strict mode) |
| Node.js | >= 20.9.0 | Runtime (required for Supabase v2.79+) |

### Backend & Database
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | Latest | PostgreSQL, Auth, Storage, Realtime |
| PostgreSQL | 15+ | Primary database |
| Row Level Security | - | Multi-tenant data isolation |

### Frontend Libraries
| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 3.4.x | Utility-first CSS (v4 forbidden - breaking changes) |
| shadcn/ui | Latest | UI component library |
| TanStack Query | v5.62+ | Server state management |
| Zustand | v5 | Client state management |
| React Hook Form | v7.54+ | Form handling |
| Zod | v3.24+ | Schema validation |
| Framer Motion | v11 | Animations |
| Recharts | v3.6 | Charts and analytics |

### Testing
| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | v3+ | Unit and integration testing |
| Testing Library | Latest | Component testing |
| jsdom | v20+ | DOM environment |

### CDN Libraries (Lazy Loaded)
| Library | Purpose |
|---------|---------|
| canvas-confetti | Gamification celebrations |
| Sortable.js | Drag-and-drop reordering |
| Shepherd.js | Onboarding tours |
| DOMPurify | XSS protection |
| Papa Parse | CSV import/export |
| Phosphor Icons | Icon set |

---

## Implementation Phases

### Phase 1: Project Setup & Infrastructure ✅ COMPLETED
**Duration:** Foundation layer
**Status:** 7/7 subtasks completed

| Subtask | Description | Status |
|---------|-------------|--------|
| 1-1 | Initialize Next.js 15 with TypeScript strict mode | ✅ |
| 1-2 | Install core dependencies (Supabase, TanStack Query, Zustand, Zod) | ✅ |
| 1-3 | Initialize shadcn/ui with core components | ✅ |
| 1-4 | Create Supabase client utilities (browser, server, admin) | ✅ |
| 1-5 | Set up TanStack Query provider and Zustand stores | ✅ |
| 1-6 | Configure root layout with providers | ✅ |
| 1-7 | Configure Vitest for testing | ✅ |

**Key Deliverables:**
- Next.js 15 project with TypeScript strict mode
- Supabase SSR integration (browser, server, admin clients)
- TanStack Query with optimized defaults (staleTime: 1min, gcTime: 5min)
- Zustand stores (UI state, Cart with price locking)
- shadcn/ui components (Button, Input, Card, Dialog, Toast)
- Vitest configuration with React Testing Library

---

### Phase 2: Authentication System ✅ COMPLETED
**Duration:** Auth layer
**Status:** 7/7 subtasks completed

| Subtask | Description | Status |
|---------|-------------|--------|
| 2-1 | Create authentication Zod schemas | ✅ |
| 2-2 | Create authentication Server Actions | ✅ |
| 2-3 | Implement auth middleware for protected routes | ✅ |
| 2-4 | Create login page with form validation | ✅ |
| 2-5 | Create registration page with email verification | ✅ |
| 2-6 | Create password reset flow | ✅ |
| 2-7 | Create useAuth hook for client-side auth state | ✅ |

**Key Deliverables:**
- Complete auth flow (login, register, logout, password reset)
- Account enumeration protection (constant-time responses)
- Timing attack prevention (300-500ms response delay)
- Rate limiting preparation
- Turkish language error messages
- Middleware protection for dashboard routes
- useAuth hook with TanStack Query integration

**Security Measures:**
- Password strength validation (8+ chars, uppercase, lowercase, number)
- Email verification flow
- Account enumeration protection on forgot password
- Session management with automatic refresh

---

### Phase 3: Database Schema & Multi-tenant Architecture ✅ COMPLETED
**Duration:** Database layer
**Status:** 7/7 subtasks completed

| Subtask | Description | Status |
|---------|-------------|--------|
| 3-1 | Create core tables (organizations, profiles, memberships) | ✅ |
| 3-2 | Create menu tables (categories, products, modifiers) | ✅ |
| 3-3 | Create immutable price_ledger with protection triggers | ✅ |
| 3-4 | Create order tables (orders, items, tables, service requests) | ✅ |
| 3-5 | Create subscription tables (features, plans, usage tracking) | ✅ |
| 3-6 | Implement RLS policies for all tables | ✅ |
| 3-7 | Generate TypeScript types from schema | ✅ |

**Database Tables (19 total):**
```
Core:           organizations, profiles, memberships
Menu:           categories, products, product_modifiers, modifier_options
Orders:         restaurant_tables, orders, order_items, service_requests
Subscriptions:  features, subscription_plans, plan_features,
                organization_subscriptions, feature_overrides, feature_usage
Audit:          price_ledger, audit_logs
```

**Key Features:**
- **Multi-tenancy:** organization_id on all tables with RLS
- **Immutable Price Ledger:** Triggers prevent UPDATE/DELETE (Turkish regulatory compliance)
- **Soft Delete:** deleted_at columns for reversible deletions
- **RBAC:** Role hierarchy (viewer < kitchen < staff < manager < admin < owner)
- **Subscription Tiers:** Lite, Gold, Platinum, Enterprise with feature gating

**Security:**
- RLS enabled on ALL tables
- No cross-tenant data access possible
- Superadmin bypass policies for platform administration
- Audit logging for sensitive operations

---

### Phase 4: Restaurant Dashboard Shell ✅ COMPLETED
**Duration:** Dashboard UI
**Status:** 5/5 subtasks completed

| Subtask | Description | Status |
|---------|-------------|--------|
| 4-1 | Create dashboard layout with sidebar and header | ✅ |
| 4-2 | Create mobile navigation with hamburger menu | ✅ |
| 4-3 | Create dashboard home page with overview widgets | ✅ |
| 4-4 | Create useOrganization hook for organization context | ✅ |
| 4-5 | Create theme provider with dark mode toggle | ✅ |

**Key Deliverables:**
- Responsive dashboard layout (desktop sidebar, mobile drawer)
- Mobile-first design with 48px touch targets (WCAG 2.1 AA)
- Dark mode support with system preference sync
- Organization context provider with role checking
- Stats widgets, quick actions, onboarding flow

**Navigation Sections:**
- General: Dashboard, Orders
- Menu Management: Categories, Products
- Restaurant: Tables, QR Codes
- Reports: Analytics
- Settings: Profile, Appearance, Subscription

---

### Phase 5: Menu Management ✅ COMPLETED
**Duration:** Menu CRUD
**Status:** 7/7 subtasks completed

| Subtask | Description | Status |
|---------|-------------|--------|
| 5-1 | Create Data Access Layer (DAL) for categories | ✅ |
| 5-2 | Create DAL for products and price ledger | ✅ |
| 5-3 | Create menu validation schemas | ✅ |
| 5-4 | Create Server Actions for menu operations | ✅ |
| 5-5 | Create categories management page with drag-and-drop | ✅ |
| 5-6 | Create products management page with forms | ✅ |
| 5-7 | Create image upload component with Supabase Storage | ✅ |

**Key Deliverables:**
- Full CRUD for categories and products
- Drag-and-drop reordering with Sortable.js
- Image upload with Supabase Storage
- Product modifiers (e.g., Size, Extras) with price adjustments
- Dietary information (allergens, vegetarian, vegan, gluten-free, spicy)
- Price ledger integration (automatic logging on price changes)

**Features:**
- Category nesting (parent/child)
- Soft delete with restore capability
- Bulk operations (delete, visibility toggle)
- Turkish character-safe URL slugs

---

### Phase 6: Public Menu & QR System ✅ COMPLETED
**Duration:** Public-facing menu
**Status:** 5/5 subtasks completed

| Subtask | Description | Status |
|---------|-------------|--------|
| 6-1 | Create public menu page with mobile-optimized design | ✅ |
| 6-2 | Create table-specific menu page with context | ✅ |
| 6-3 | Create QR code generation page in dashboard | ✅ |
| 6-4 | Create restaurant tables management with QR assignment | ✅ |
| 6-5 | Implement basic restaurant theming (colors, logo) | ✅ |

**Key Deliverables:**
- Public menu at `/r/[slug]` with mobile-first design
- Table-specific menus at `/r/[slug]/[tableId]`
- QR code generator with branding (colors, logo)
- PNG/SVG download and print functionality
- Table management with status tracking
- Restaurant theming (primary/secondary colors, logo, cover)

**Security:**
- Tables use UUID (qr_uuid) for unpredictable URLs
- No sequential IDs exposed in QR codes

---

### Phase 7: Customer Ordering System ✅ COMPLETED
**Duration:** Order flow
**Status:** 6/6 subtasks completed

| Subtask | Description | Status |
|---------|-------------|--------|
| 7-1 | Create cart store with Zustand | ✅ |
| 7-2 | Create order validation schemas | ✅ |
| 7-3 | Create Server Actions for order operations | ✅ |
| 7-4 | Create cart UI component for public menu | ✅ |
| 7-5 | Create order submission and confirmation flow | ✅ |
| 7-6 | Create basic order management page in dashboard | ✅ |

**Key Deliverables:**
- Cart with price locking (regulatory compliance)
- Modifier selection with min/max validation
- Order submission with auto-generated order numbers (ORD-YYYYMMDD-NNNN)
- Order confirmation page with status tracking
- Dashboard order management with status updates
- Filter and search capabilities

**Price Locking:**
- `price_at_add` captures price when item added to cart
- `price_ledger_id` tracks exact price entry for audit trail
- Price changes during browsing don't affect cart totals

---

### Phase 8: Integration & Polish 🔄 IN PROGRESS
**Duration:** Final integration
**Status:** 4/6 subtasks completed

| Subtask | Description | Status |
|---------|-------------|--------|
| 8-1 | Implement Supabase Realtime for order notifications | ✅ |
| 8-2 | Create waiter call button and notification system | ✅ |
| 8-3 | Create settings page with restaurant profile | ✅ |
| 8-4 | Create development_roadmap.md documentation | ✅ |
| 8-5 | Generate mock/dummy data with realistic Turkish values | ⏳ |
| 8-6 | End-to-end verification of complete flow | ⏳ |

**Completed Deliverables:**
- Real-time order notifications with Supabase Realtime
- Waiter call button with rate limiting (1 per minute)
- Service request notifications for staff
- Settings pages (profile, appearance)
- This development roadmap document

**Remaining Tasks:**
- Seed data with realistic Turkish restaurant/dish names
- End-to-end testing of complete flow

---

## Technical Decisions

### 1. Why Next.js 15 App Router?
- Server Components for optimal performance
- Built-in file-based routing
- Server Actions for mutations (no API routes needed)
- Streaming and Suspense support
- Edge compatibility for global deployment

### 2. Why Supabase over Firebase/Prisma?
- Native PostgreSQL with full SQL support
- Built-in Row Level Security for multi-tenancy
- Real-time subscriptions out of the box
- Integrated Auth with Turkish localization support
- Open source with self-hosting option

### 3. Why TanStack Query + Zustand?
- **TanStack Query:** Server state (caching, invalidation, background refetch)
- **Zustand:** Client state (UI state, cart, user preferences)
- Clear separation of concerns
- Better than Redux for this use case (less boilerplate)

### 4. Why Immutable Price Ledger?
- Turkish regulatory requirement for price auditing
- Database triggers prevent modifications at DB level
- Full audit trail with timestamps and user attribution
- Historical price queries for any date

### 5. Why Tailwind CSS 3.4.x (not v4)?
- v4 has breaking changes and is not production-ready
- 3.4.x is stable with excellent ecosystem support
- Design tokens via CSS variables for theming

### 6. Why CDN for some libraries?
- Non-critical features (confetti, tours) lazy-loaded
- Reduces initial bundle size
- Better LCP and TTI metrics

---

## Security Architecture

### Multi-Tenant Isolation
```
User → Middleware (Auth Check) → RLS Policy (org_id Filter) → Data
```

- All tables have `organization_id` column
- RLS policies enforce isolation at database level
- No application-level filtering needed (defense in depth)

### Role-Based Access Control (RBAC)
```
Hierarchy: viewer < kitchen < staff < manager < admin < owner
```

| Role | Permissions |
|------|-------------|
| viewer | Read menu, view orders |
| kitchen | Above + update order status |
| staff | Above + create/edit menu items |
| manager | Above + manage tables, view analytics |
| admin | Above + manage team members |
| owner | Full access including billing |

### Price Ledger Immutability
```sql
-- Trigger prevents all modifications
CREATE TRIGGER no_price_update
  BEFORE UPDATE OR DELETE ON price_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_price_modification();
```

### Authentication Security
- Password hashing via Supabase Auth (bcrypt)
- JWT tokens with short expiry
- Account enumeration protection
- Rate limiting on auth endpoints
- Email verification required

---

## Future Phases (Roadmap)

### Phase 2: Growth Features
- AI-powered menu description generator
- AI image suggestions (Unsplash API)
- Advanced analytics with drill-down
- Multi-location management
- Menu templates

### Phase 3: Scale & Enterprise
- API access for enterprise integrations
- Webhook system for external services
- Inventory integration
- Multi-language support (English, Arabic, Russian)
- Customer feedback system

### Phase 4: Advanced Features
- Kitchen Display System (KDS) enhancements
- Reservation system
- Loyalty program
- Payment gateway integration
- Native mobile apps (React Native)

---

## Installation Guide

### Prerequisites
- Node.js >= 20.9.0
- npm
- Supabase account (or local Supabase CLI)

### Quick Start
```bash
# 1. Clone repository
git clone <repository-url>
cd e-menum-web

# 2. Install dependencies (React 19 requires legacy-peer-deps)
npm install --legacy-peer-deps

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Apply database migrations
supabase db push

# 5. Start development server
npm run dev
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Supabase Setup
1. Create Supabase project at https://supabase.com
2. Run migrations: `supabase db push`
3. Create Storage buckets:
   - `product-images` (public)
   - `organization-assets` (private with signed URLs)

---

## Verification Commands

```bash
# TypeScript check
npm run typecheck

# ESLint check
npm run lint

# Build check
npm run build

# Run tests
npm run test

# All verification
npm run build && npm run lint && npm run typecheck
```

---

## Troubleshooting

### "peer dependency" errors
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
This is **expected behavior**. Price ledger is immutable by design. To change a price:
1. Update the product's `price` column
2. A new price_ledger entry is created automatically via trigger

---

## Contributing

1. Follow TypeScript strict mode (no `any` types)
2. Use Server Components by default
3. Add `'use client'` only for interactive components
4. Use path alias `@/` for imports
5. Turkish-first UI with English code comments
6. Remove all console.log before committing
7. Run verification commands before PR

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Phases | 8 |
| Total Subtasks | 47 |
| Completed Subtasks | 45 |
| Remaining Subtasks | 2 |
| Database Tables | 19 |
| RLS Policies | All tables covered |
| Test Coverage | Unit tests configured |

---

*Last Updated: 2026-01-23*
*Version: 1.0.0 (MVP)*
