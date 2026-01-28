# E2E Verification Checklist

## E-Menum Platform - Complete Flow Verification

This document provides a comprehensive checklist for verifying the end-to-end functionality of the E-Menum QR Menu platform.

---

## Prerequisites

Before running E2E verification, ensure:

- [ ] Node.js >= 20.9.0 installed
- [ ] Supabase project configured (local or cloud)
- [ ] Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Dependencies installed: `npm install --legacy-peer-deps`
- [ ] Database migrations applied: `supabase db push`
- [ ] Development server running: `npm run dev`

---

## Automated Verification

Run the automated E2E verification script:

```bash
# Full E2E test
npx tsx scripts/e2e-verification.ts

# Check file structure only
npx tsx scripts/e2e-verification.ts --check

# Run specific step
npx tsx scripts/e2e-verification.ts --step 3
```

---

## Manual Verification Steps

### Step 1: Register New Restaurant Owner

| # | Action | Expected Result | Status |
|---|--------|-----------------|--------|
| 1.1 | Navigate to http://localhost:3000/register | Registration form displays | [ ] |
| 1.2 | Fill in email, password (8+ chars, uppercase, lowercase, number) | Form validates in real-time | [ ] |
| 1.3 | Accept terms and click "Kayıt Ol" | Success message, redirect to verify-email | [ ] |
| 1.4 | Check email for verification link | Email received with verify link | [ ] |
| 1.5 | Click verification link | Redirect to login page | [ ] |
| 1.6 | Login with registered credentials | Redirect to dashboard | [ ] |

**Files Involved:**
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/verify-email/page.tsx`
- `src/lib/actions/auth.ts`
- `src/lib/validations/auth.ts`

---

### Step 2: Create Menu Categories and Products

| # | Action | Expected Result | Status |
|---|--------|-----------------|--------|
| 2.1 | Navigate to /dashboard/categories | Categories page displays | [ ] |
| 2.2 | Click "Yeni Kategori" button | Category form opens | [ ] |
| 2.3 | Fill in category name, description | Form validates | [ ] |
| 2.4 | Click "Kaydet" | Category created, appears in list | [ ] |
| 2.5 | Navigate to /dashboard/products | Products page displays | [ ] |
| 2.6 | Click "Yeni Ürün" button | Product form opens | [ ] |
| 2.7 | Fill in name, description, price (e.g., 125.00) | Form validates | [ ] |
| 2.8 | Select category, upload image | Image preview shown | [ ] |
| 2.9 | Click "Kaydet" | Product created, appears in list | [ ] |
| 2.10 | Verify price in database price_ledger | Entry with price exists | [ ] |

**Files Involved:**
- `src/app/(dashboard)/dashboard/categories/page.tsx`
- `src/app/(dashboard)/dashboard/products/page.tsx`
- `src/components/features/menu/category-form.tsx`
- `src/components/features/menu/product-form.tsx`
- `src/lib/dal/categories.ts`
- `src/lib/dal/products.ts`
- `src/lib/dal/price-ledger.ts`

---

### Step 3: Generate QR Code for Table

| # | Action | Expected Result | Status |
|---|--------|-----------------|--------|
| 3.1 | Navigate to /dashboard/tables | Tables page displays | [ ] |
| 3.2 | Click "Yeni Masa" or "Toplu Oluştur" | Table form/dialog opens | [ ] |
| 3.3 | Enter table name, capacity, section | Form validates | [ ] |
| 3.4 | Click "Oluştur" | Table created with QR UUID | [ ] |
| 3.5 | Navigate to /dashboard/qr-codes | QR codes page displays | [ ] |
| 3.6 | Select table from dropdown | QR code generates | [ ] |
| 3.7 | Customize colors (optional) | QR updates in preview | [ ] |
| 3.8 | Click "PNG İndir" or "SVG İndir" | QR code downloads | [ ] |
| 3.9 | Verify QR points to correct URL | URL matches /r/[slug]/[qr_uuid] | [ ] |

**Files Involved:**
- `src/app/(dashboard)/dashboard/tables/page.tsx`
- `src/app/(dashboard)/dashboard/qr-codes/page.tsx`
- `src/components/features/qr/qr-generator.tsx`
- `src/lib/dal/tables.ts`

---

### Step 4: Scan QR and View Public Menu

| # | Action | Expected Result | Status |
|---|--------|-----------------|--------|
| 4.1 | Scan QR code or navigate to /r/[slug] | Public menu page loads | [ ] |
| 4.2 | Verify restaurant name/branding | Matches organization settings | [ ] |
| 4.3 | View categories in navigation | All visible categories shown | [ ] |
| 4.4 | Click on a category | Products for category display | [ ] |
| 4.5 | View product details (name, price, image) | All info correctly displayed | [ ] |
| 4.6 | Navigate to /r/[slug]/[tableId] | Table context banner shows | [ ] |
| 4.7 | Verify table name displayed | Shows "Masa X" banner | [ ] |
| 4.8 | Page loads in < 3 seconds on 3G | Performance acceptable | [ ] |

**Files Involved:**
- `src/app/(public)/r/[slug]/page.tsx`
- `src/app/(public)/r/[slug]/[tableId]/page.tsx`
- `src/components/features/public-menu/menu-view.tsx`

---

### Step 5: Add Items to Cart and Submit Order

| # | Action | Expected Result | Status |
|---|--------|-----------------|--------|
| 5.1 | Click "+" on a product | Item added to cart | [ ] |
| 5.2 | Verify cart FAB shows item count | Badge shows "1" | [ ] |
| 5.3 | Click cart FAB | Cart drawer opens | [ ] |
| 5.4 | Verify item, quantity, price in cart | Matches added item | [ ] |
| 5.5 | Adjust quantity with +/- buttons | Total updates correctly | [ ] |
| 5.6 | Click "Siparişi Tamamla" | Checkout form opens | [ ] |
| 5.7 | Fill in customer name (optional) | Form validates | [ ] |
| 5.8 | Add special notes (optional) | Notes accepted | [ ] |
| 5.9 | Click "Siparişi Gönder" | Loading state, then success | [ ] |
| 5.10 | Verify order confirmation page | Shows order number | [ ] |

**Files Involved:**
- `src/lib/stores/cart-store.ts`
- `src/components/features/public-menu/cart-drawer.tsx`
- `src/components/features/public-menu/cart-item.tsx`
- `src/components/features/public-menu/checkout-form.tsx`
- `src/app/(public)/r/[slug]/order-confirmation/page.tsx`
- `src/lib/actions/orders.ts`

---

### Step 6: Verify Order Appears in Dashboard

| # | Action | Expected Result | Status |
|---|--------|-----------------|--------|
| 6.1 | Navigate to /dashboard/orders | Orders page displays | [ ] |
| 6.2 | Verify new order in list | Order shows with "pending" status | [ ] |
| 6.3 | Verify order number format | ORD-YYYYMMDD-NNNN format | [ ] |
| 6.4 | Verify table assignment | Shows correct table name | [ ] |
| 6.5 | Click on order card | Order details expand | [ ] |
| 6.6 | Verify items match cart | Product, quantity, price correct | [ ] |
| 6.7 | Real-time update (open 2nd tab) | New orders appear automatically | [ ] |
| 6.8 | Toast notification appears | "Yeni sipariş alındı" message | [ ] |

**Files Involved:**
- `src/app/(dashboard)/dashboard/orders/page.tsx`
- `src/components/features/orders/order-list.tsx`
- `src/components/features/orders/order-card.tsx`
- `src/lib/hooks/use-realtime-orders.ts`
- `src/lib/dal/orders.ts`

---

### Step 7: Update Order Status

| # | Action | Expected Result | Status |
|---|--------|-----------------|--------|
| 7.1 | Click status dropdown on order | Shows available transitions | [ ] |
| 7.2 | Select "Onaylandı" (confirmed) | Status updates to confirmed | [ ] |
| 7.3 | Select "Hazırlanıyor" (preparing) | Status updates to preparing | [ ] |
| 7.4 | Select "Hazır" (ready) | Status updates to ready | [ ] |
| 7.5 | Verify status badge color changes | Visual feedback for each status | [ ] |
| 7.6 | Select "Teslim Edildi" (delivered) | Order marked complete | [ ] |
| 7.7 | Verify order moves to completed filter | Filter shows completed orders | [ ] |
| 7.8 | Invalid transition prevented | Error message shown | [ ] |

**Files Involved:**
- `src/components/features/orders/order-card.tsx`
- `src/lib/actions/orders.ts`
- `src/lib/validations/orders.ts`

---

### Step 8: Verify Customer Can Call Waiter

| # | Action | Expected Result | Status |
|---|--------|-----------------|--------|
| 8.1 | Navigate to /r/[slug]/[tableId] | Table context loaded | [ ] |
| 8.2 | Click "Garson Çağır" FAB | Expandable menu opens | [ ] |
| 8.3 | Select "Garson Çağır" option | Request created | [ ] |
| 8.4 | Verify success feedback | Toast/animation shows | [ ] |
| 8.5 | Verify cooldown timer | Button disabled for 60s | [ ] |
| 8.6 | Check dashboard for notification | Service request appears | [ ] |
| 8.7 | Staff acknowledges request | Status updates | [ ] |
| 8.8 | Rate limiting works | Max 3 requests in 5 min | [ ] |

**Files Involved:**
- `src/components/features/public-menu/waiter-call-button.tsx`
- `src/lib/actions/service-requests.ts`
- `src/lib/hooks/use-realtime-service-requests.ts`

---

## Database Verification

| Check | SQL/Method | Expected |
|-------|-----------|----------|
| RLS enabled on all tables | `SELECT * FROM pg_tables WHERE schemaname = 'public'` | All tables have RLS |
| Price ledger immutable | `UPDATE price_ledger SET price = 0` | Operation rejected |
| Order number auto-generated | Insert order, check order_number | ORD-YYYYMMDD-NNNN format |
| Price locked at order time | Compare price_at_add vs current price | May differ |
| Multi-tenant isolation | Query with different org context | No cross-tenant data |

---

## Browser Compatibility

| Browser | Desktop | Mobile | Status |
|---------|---------|--------|--------|
| Chrome 120+ | [ ] | [ ] | |
| Safari 17+ | [ ] | [ ] | |
| Firefox 120+ | [ ] | [ ] | |
| Edge 120+ | [ ] | [ ] | |

---

## Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Public menu LCP | < 2.5s | | [ ] |
| Dashboard TTI | < 3.5s | | [ ] |
| First Input Delay | < 100ms | | [ ] |
| Cumulative Layout Shift | < 0.1 | | [ ] |

---

## Security Checklist

| Check | Status |
|-------|--------|
| No sensitive data in client bundle | [ ] |
| SUPABASE_SERVICE_ROLE_KEY not exposed | [ ] |
| RLS prevents cross-tenant access | [ ] |
| Price ledger entries immutable | [ ] |
| Auth tokens not in URLs | [ ] |
| CSRF protection via cookies | [ ] |
| Rate limiting on auth endpoints | [ ] |

---

## Accessibility Checklist

| Check | Status |
|-------|--------|
| All images have alt text | [ ] |
| Form labels properly associated | [ ] |
| Keyboard navigation works | [ ] |
| Color contrast WCAG AA | [ ] |
| Touch targets >= 44px | [ ] |
| Screen reader compatible | [ ] |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA Engineer | | | |
| Product Owner | | | |

---

## Notes

_Add any observations, issues, or notes during verification:_

---

**Document Version:** 1.0
**Last Updated:** 2026-01-23
**Related Files:**
- `scripts/e2e-verification.ts` - Automated E2E script
- `development_roadmap.md` - Project documentation
- `.auto-claude/specs/001-*/implementation_plan.json` - Implementation plan
