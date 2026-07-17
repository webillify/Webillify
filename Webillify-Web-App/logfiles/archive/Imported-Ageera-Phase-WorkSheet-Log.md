## PHASE OVERVIEW

```
Angular / Backend Track
────────────────────────────────────────────────────────────
Phase 0 ✅ COMPLETE   — Planning & Architecture
Phase 1 ✅ COMPLETE   — Foundation & Core Backend + All Angular Apps
Phase 2 🔄 PARTIAL    — Core Business Engine (field-name audit done; DTO classes pending)
Phase 3 ⏳ UPCOMING   — Delivery PWA (Enhancements — offline, push, route map)
Phase 4 ⏳ UPCOMING   — Admin Panel ERP (Charts + Analytics UI)
Phase 5 ⏳ UPCOMING   — Storefront SSR / SEO (now largely superseded by Next.js apps/web)
Phase 6 🔄 PARTIAL    — Production & Launch (NestJS extensions done; self-hosting wiring done)

Next.js Storefront Track (apps/web)
────────────────────────────────────────────────────────────
NX-P0 ✅ COMPLETE   — Foundation (Next.js 16 + Tailwind v4 + shadcn + Framer + zustand)
NX-P1 ✅ COMPLETE   — Landing Selector (premium dual-business choice screen)
NX-P2 ✅ COMPLETE   — Shared Shell (header / footer / WhatsApp / business route groups)
NX-P3 ✅ COMPLETE   — Milk Wizards + Store PLP
NX-P4a ✅ COMPLETE   — PDP + Cart + Checkout (commerce flow)
NX-P4b ✅ COMPLETE   — Firebase Auth Scaffold (dev fake + real-ready)
NX-P5a ✅ COMPLETE   — Subs Mgmt + Calendar/Ledger + Real Images + Firestore Scaffold
NX-P5b ✅ COMPLETE   — Email Verify + Phone OTP + Order Tracking + Razorpay scaffold + Admin/Driver demos
NX-P6b ✅ COMPLETE   — Next.js ↔ NestJS API Client (auth-mode + data-mode flags)
NX-P6c ✅ COMPLETE   — NestJS Backend Additions (ownership guard + Orders + Razorpay + Categories slug)
NX-P6d ✅ COMPLETE   — Frontend Wiring to New Endpoints (Subscribe wizard, Razorpay, Auth register)
NX-P6e ✅ COMPLETE   — Final Wiring (Addresses + Checkout-from-API + PLP-from-API + Order History + Inventory)
NX-P7  ✅ COMPLETE   — Home Lab Production Stack (Next.js Dockerfile + nginx TLS + Postgres tuning + PgBouncer + backups + runbook)
NX-P8a ✅ COMPLETE   — Legal / Compliance pages (Terms · Privacy · Refund · Cookies)
NX-P8b ✅ COMPLETE   — Angular admin-panel + delivery-pwa wiring to new Order endpoints (both `nx build` runs green after .nx cache ownership restored)
NX-P8c ✅ COMPLETE   — Off-site backups (rclone) + Uptime-Kuma at status.ageera.online (Grafana/Loki deferred to Phase 9)
NX-P8d ✅ COMPLETE   — Error tracking (Glitchtip at errors.ageera.online) + Analytics (Umami at analytics.ageera.online)
NX-P8e ✅ COMPLETE   — E2E tests (Playwright) — landing/auth/milk-subscribe/store-checkout/order-tracking + Phase 9a upi-manual specs; existing specs fixed (Proceed-to-checkout button, default-UPI override for COD specs)
NX-P9a ✅ COMPLETE   — Staging environment (staging.ageera.online + admin/delivery staging) + Cloudflare Tunnel for both staging + prod
NX-P9a-payments ✅ COMPLETE   — UPI Manual Payment (primary gateway: QR + UTR + admin review queue)
NX-P9b ✅ COMPLETE   — MinIO self-hosted object storage — payment-screenshots (private, presigned) + product-images (public). NestJS UploadsModule, real upload in UPI sheet, admin thumbnail viewer (Next.js + Angular)
NX-P9c ✅ COMPLETE   — WhatsApp Click-to-Chat notifications (wa.me URLs, NO Meta Cloud API). Admin "Notify on WhatsApp" buttons + customer success-page CTA
NX-P9d ✅ COMPLETE   — Real Ageera Whole Cow Milk PNG wired + slider/dairy-poster banners on store + milk hero + docs/PRODUCT_PHOTOGRAPHY_BRIEF.md (shotlist for 14 remaining products)
NX-P9e ✅ COMPLETE   — Milk catalog consolidated to 3 consumer tiers: Standard (Toned ₹46) / Premium (Desi Cow Whole ₹54, real photo) / A2 (Gir ₹85). Plans, wizard, hero, bridge, API seed sortOrder all aligned
NX-P9f ✅ COMPLETE   — Observability — Grafana + Loki + Promtail self-hosted log stack (prod 30d / staging 7d retention). Loki datasource auto-provisioned. 6-panel starter dashboard. nginx upstream + observability.ageera.online server block. GRAFANA_ADMIN_PASSWORD env. Runbook updated
NX-P9g ✅ COMPLETE   — Playwright staging mode (E2E_TARGET=staging) — 9 read-only smoke tests against https://staging.ageera.online (homepage, business selector, store, milk, legal pages, API health, WhatsApp Channel, cf-ray, console errors). `npm run e2e:staging` + nx target. Local-mode unchanged
NX-P10  ✅ COMPLETE   — Launch readiness sweep — `/shipping` Delivery & Shipping Policy page wired (Footer + LegalLayout nav + staging-smoke), `sitemap.ts` (static + 22 product URLs), `robots.ts` (disallow /account /auth /api /admin /driver), `opengraph-image.tsx` + `twitter-image.tsx` (1200×630 Next.js ImageResponse with AGEERA brand + tagline), staging-smoke legal URLs corrected (route group means top-level paths), TS5095 fix in apps/web-e2e/tsconfig.json (moduleResolution: node)
NX-P11  ✅ COMPLETE   — Marketing pages — new `(marketing)` route group with shared SiteHeader + SiteFooter layout; `/about` (brand story + 3-value card row + dual-business CTA + operational + registered office + LegalCompanyBlock), `/contact` (3 channel cards: WhatsApp/Phone/Email + ContactForm client component prefilling wa.me deep link + grievance officer + map link + WhatsApp Channel), `/blog` (coming-soon landing with 3 teaser cards + WhatsApp Channel CTA); sitemap.ts updated with new URLs
NX-P12  ✅ COMPLETE   — Product.featured schema + admin-panel + delivery-pwa audits — Prisma Product.featured (boolean default false, @@index([featured])) + migration SQL + seed wires featured=tierBadge!==null (3 tier milk SKUs flagged), NestJS ProductQueryDto.featured + Create/Update DTOs, libs/api-client ProductQuery.featured + getFeatured() helper, apps/web ApiProduct.featured. Audit docs: docs/audits/ADMIN_PANEL_AUDIT.md + DELIVERY_PWA_AUDIT.md (P0/P1/P2 punch lists). Small fixes shipped by audit agents: 3 admin warnings removed; broken <app-nx-welcome> in delivery-pwa replaced + stale spec rewritten + nx-welcome.component.ts deleted + index.html title/theme-color/viewport-fit
NX-P13a ✅ COMPLETE   — Delivery PWA P0 fixes — wrong API paths fixed in route-sheet + record-delivery + collect (all 3 now use `DeliveryApiService` methods against the correct `/delivery/my-sheet`, `/delivery/ledger/:id/deliver|skip|collect` endpoints). Real PWA shipped: `ngsw-config.json` (app+assets prefetch + delivery-api freshness data group 1d/50/4s), `manifest.webmanifest` (name/colors/icons 192+512 + maskable), project.json serviceWorker config, dist/.../ngsw-worker.js confirmed present. Offline write queue via `idb` (delivery_pending_writes store, idempotencyKey UUID per op, retriable error classification, replay on `online` event, "Pending sync: N" pill in bottom nav). Photo capture via new NestJS `POST /uploads/delivery-photo/sign` presigned endpoint + canvas JPG compression to ≤200kB. Maps deep-link wrapping address; OnlineStatusComponent sticky offline banner. `:customerId` route param renamed to `:ledgerId`
NX-P13b ✅ COMPLETE   — Admin panel quick-wins — Record Payment routerLink to `/delivery/collect?customerCode=…` (delivery-collect auto-prefills + auto-lookups); new `/subscriptions` lazy route + nav item with paginated table, filters (status/search/dateRange), pause-with-dates dialog, resume + cancel confirms; customer-detail also lists customer's subscriptions inline with same actions. Response envelope fix in customers-list (CustomersApiService.getAll → res.data/res.meta.total) + billing-list (getPaginated<Invoice>, billingMonth/billingYear keys). Global ToastService + ToastContainerComponent + errorToastInterceptor (registered in app.config.ts after auth interceptor; 401→/login, 4xx→validation, 5xx→server-error). AdminLoginComponent + AdminAuthService now call `GET /auth/me` + `setProfile` on sign-in + onAuthStateChanged. SubscriptionsApiService: added pause/resume + typed SubscriptionQuery + fixed cancel to DELETE
NX-P14a ✅ COMPLETE   — Routes admin UI — new `RoutesApiService` (getAll/getById/getStats/create/update/assignCustomer + typed DTOs); `/delivery/routes` lazy route + nav item; list with status filter + search, create/edit modal with backend-conflict toast on duplicate code, "View customers" slide-over drawer (reuses GET /routes/:id embedded customers[]); `customer-form.component.ts` route dropdown migrated to typed `RoutesApiService.getAll({ status: 'ACTIVE', limit: 100 })`
NX-P14b ✅ COMPLETE   — Admin staff users + role management — Prisma `UserStatus` gains INVITED + DISABLED; `User.firebaseUid` made nullable; new `POST /api/v1/users/invite` endpoint (ADMIN role-guarded, InviteUserDto with INVITABLE_ROLES whitelist, email+phone conflict 409, transactional AuditLog `USER_INVITED`); deactivate now sets `DISABLED`; new `UsersApiService` end-to-end; `/settings/users` lazy route + `adminOnlyGuard` (only SUPER_ADMIN/ADMIN); Settings nav reshaped into group (General / Payments / Users); list view + invite dialog (4 invitable roles) + change-role dialog + deactivate confirm. **Auth guard fix shipped (firebase-auth.guard.ts)**: first sign-in of an INVITED staff user now looks up by `decoded.email`, atomically sets `firebaseUid: decoded.uid` + `status: ACTIVE`. Invited users can now sign in end-to-end
NX-P15  ✅ COMPLETE   — Phone OTP login for delivery-pwa — `delivery-auth.service.ts` adds `sendOtp/verifyOtp/resendOtp` via `signInWithPhoneNumber` + lazy invisible `RecaptchaVerifier`, 30s resend cooldown; `delivery-login.component.ts` rewritten as 2-step (`phone` → `otp`) with country-code selector (+91/+1/+44/+971/+65), `inputmode="numeric"` + `autocomplete="one-time-code"`, change-phone link, mapped Firebase error codes; `LOGIN_MODE: 'otp' | 'email'` flag preserved for local-dev fallback. **firebase-auth.guard.ts** gets a phone-fallback branch parallel to the Phase 14b email branch — INVITED drivers now linkable by `decoded.phone_number` on first sign-in. Runbook section "Firebase Phone Auth for delivery-pwa" — 6 steps (enable Phone provider / authorized domains / invisible reCAPTCHA / test phone +91 9999999999 → 123456 / onboarding flow / psql verify). WEEKLY_REPORT.md refreshed end-to-end through Phase 15
NX-P17  ✅ COMPLETE   — Auth hardening + Customer-Account upgrade (Phase 1) — (1) first-party Firebase auth: `/__/auth/*` Next rewrite + `authDomain`=app domain + Cloudflare rules + OAuth redirect URIs, fixes prod Google sign-in 3p-cookie failure (`579ccf6`); (2) redirect-loop root fix: 401 refresh-retry + no auto-signout + backend customer auto-provision via `/auth/register` (`94c411d`); (2b) auth hydration hardening: root `AuthProvider` (init once on every route incl. login/checkout) + `useAuth` read-only/`firebaseReady` + LoginForm auto-forward when authenticated + checkout gate waits for hydration + mobile Google-redirect wiring (`75b3139`, `e01f96a`); (3) My Orders revamp `2f53fa0`; (4) account shell + backend-persisted profile + security card `94ca044`; (5) address book (CRUD/default/landmark/geo) `a717ea2`; (6) notification preferences `a8189be`. Phase 2 deferred (backend-dependent: order cancel/reorder/invoice-PDF, wallet, sessions/devices, support/FAQ, address type/instructions, admin-seeded link-by-email)
NX-P16  ✅ COMPLETE   — Audit-log viewer in admin-panel — backend `GET /api/v1/admin/audit-logs` already existed (SUPER_ADMIN-guarded, paginated, filterable by userId/action/entity/from/to). New `libs/api-client AdminApiService` (getAuditLogs + getDashboard + getSystemStats, typed `AuditLogEntry` + `AuditLogQuery`). New `superAdminOnlyGuard` (stricter than `adminOnlyGuard` — SUPER_ADMIN only). New `/settings/audit-logs` lazy route + nav sub-item under Settings group (visible only to SUPER_ADMIN). `audit-logs.component.ts` — filters (action dropdown / entity dropdown / userId UUID / from / to date pickers), paginated table (When / Who / Action with colored badge / Entity / Entity ID truncated), per-row expand showing before/after JSON diffs + IP/UserAgent metadata. Builds clean

Retail ERP Track (Phase 17 — Central Product & Inventory System)
────────────────────────────────────────────────────────────
P17-A ✅ COMPLETE   — Product Master Foundation (Brand model + 12 retail fields on Product + BrandsModule + admin Brands feature + Product form rewrite with 4 tabs)
P17-B ✅ COMPLETE   — Vendor Management + Product Aliases (Vendor + VendorProductAlias models + PaymentTerms enum + VendorsModule with alias sub-resource + admin Vendors feature with 3-tab form + 4-card detail page + inline alias modal + accountantGuard)
P17-C ✅ COMPLETE   — Batches + Purchase Orders (Batch + PurchaseOrder + PurchaseOrderItem models + PurchaseOrderStatus enum + InventoryMovementType +EXPIRED +DAMAGED + InventoryLog batch/PO tagging + BatchesModule with expiring-soon + dead-stock + markExpired + PurchasesModule with full lifecycle including the atomic receive transaction + InventoryModule extended with valuation + dead-stock + expiry-alerts + admin features purchases-list/form/detail/receive + batches-list + inventory-dashboard + Store Operations nav group)
P17-D ✅ COMPLETE   — Retail Order Fulfillment (Order schema gains 8 nullable fields for pack/dispatch/refund/deliveryBoy tracking + DeliveryBoy back-relation + 4 new OrdersService methods including transactional refund with stock restoration + 4 new endpoints + admin retail-orders feature with status-driven action panel + dispatch/refund modals + printable Packing Slip)
P17-E ✅ COMPLETE   — Store Analytics Dashboard (StoreAnalyticsModule with 7 aggregation endpoints — dashboard summary + top products + category perf + vendor perf + purchase analytics + margin report + slow movers; admin store-analytics page with KPI cards + CSS bar charts + 5 tables; main dashboard extended with unified Store Ops summary section linking to full analytics)
P17-F ✅ COMPLETE   — Inventory Intelligence Cron Alerts (InventoryAlert model with composite-unique dedupe; InventoryAlertsModule with @Cron daily 06:00 expiry + low-stock scan + Monday-weekly dead-stock scan; AppSetting-driven thresholds; manual trigger endpoint for testing; 3 WhatsApp click-to-broadcast template builders; admin alerts inbox with filters + ack + Forward-to-WhatsApp + Run Scan Now button; main dashboard badge showing unread count)

Phase 18 — Operational Intelligence + Production Hardening + Automation
────────────────────────────────────────────────────────────
P18-pre  ✅ COMPLETE   — Pre-Cleanup (migrations committed + /delivery-boys 404 fixed + ThrottlerGuard global with @SkipThrottle on health)
P18-Fa   ✅ COMPLETE   — 18-F partial (migration governance + ThrottlerGuard application bundled with pre-cleanup)
P18-B    ✅ COMPLETE   — Event Bus + Notification Queue (BullMQ NotificationsProcessor with retry/exponential-backoff/DLQ + NotificationDispatchService subscribing to 6 domain events + @nestjs/event-emitter wired + NotificationLog with status tracking + NotificationPreference matrix + admin log inbox + per-user preferences page + 19 named domain events defined)
P18-A    ✅ COMPLETE   — Reconciliation Engine (ReconciliationRun + ReconciliationMismatch + 5 integrity checks via raw SQL + Sunday 02:00 dry-run cron + preview-then-execute repair flow inside prisma.$transaction + admin integrity dashboard with health-score + per-mismatch repair actions + SUPER_ADMIN-only execute path)
P18-E    ✅ COMPLETE   — Financial Intelligence (FinanceModule with 9 aggregation endpoints: executive dashboard + receivables aging + payables with computed due dates + SKU profitability with actual COGS from PO ledger + customer LTV + GST/HSN summary + 3-month moving-average revenue forecast + route P&L + tabbed admin page with 6 sections)
P18-C    🔄 PARTIAL    — Workforce Operations (Session 1 MVP COMPLETE: 5 Prisma models + AttendanceService with GPS check-in/out + ShiftAssignment CRUD + SettlementService with variance calculation + manual approve/reject + admin tabbed dashboard. Session 2/3 deferred: payroll calculation engine + cron auto-approval + WhatsApp settlement.approved dispatch)
P18-C    ⏳ UPCOMING   — Workforce Operations (attendance + settlements + payroll foundation)
P18-D    ⏳ UPCOMING   — Automation Engine (rules engine + auto-reorder + churn detection)
P18-Fb   ⏳ UPCOMING   — 18-F remainder (security hardening + OpenTelemetry + load testing + DR)

Product Catalog Import Track (349-product master import — apps/web storefront + admin-panel)
────────────────────────────────────────────────────────────
PC-A   ✅ COMPLETE   — Schema + Data Prep (catalog fields hsnCode/mrp/purchasePrice/taxInclusive/nutritionInfo JSON/countryOfOrigin/ingredients/allergens/SEO/isNew/isBestSeller/tags + ProductVariant + ProductContentDraft models; migrations add_product_catalog_fields + add_product_search_indexes + add_product_content_drafts applied)
PC-C   ✅ COMPLETE   — Bulk Import engine (transactional ≤2000-row preview-then-commit products-import.service + import DTO + admin import-products component with Vyapar CATEGORY_ALIASES mapping). Import has been RUN on dev (355 products / 349 variants / 22 categories) and that catalog copied to prod 2026-05-22
PC-DE  ✅ COMPLETE   — Content + Nutrition infra (product-content.service AI draft generation + ProductContentDraft review/apply flow + admin content-drafts component; nutrition stored as JSON, rendered in the PDP nutrition tab)
PC-G   ✅ COMPLETE   — Admin image-upload UI (presigned product-image sign endpoint + uploads flow against the MinIO product-images public bucket)
PC-RDY ✅ COMPLETE   — Product readiness audit (14-check storefront/inventory/seo/compliance scoring service + admin readiness dashboard)
PC-H   ✅ COMPLETE   — Frontend Hydration & Wiring (storefront adapter galleryImages + default-variant pricing + badges; PDP/PLP/category/search/cards render descriptions/nutrition/SEO/images/variants/tags; SEO + OpenGraph metadata on PDP + category; API public variant projection + storefront filters; Angular shared Product model + admin products-list enriched; safe fallbacks throughout; typecheck-clean; all uncommitted)
PC-DEPLOY ✅ COMPLETE — Production deployment 2026-05-22 (pre-flight DB backup + image rollback tags → heap-capped api/web rebuild → 3 catalog migrations via pinned prisma@6 + pg_trgm → dev→prod catalog data copy 355/349/22 → scoped api/web recreate → live verification at www.ageera.online/store). Category-nav 404s (SiteFooter/StoreHero/ProductDetail) fixed + redeployed
PC-IMG  🔄 PARTIAL    — Product images on MinIO: 29 SKU-named PNGs uploaded to prod product-images bucket (public-read), 24 products' images[] repointed local→`storage.ageera.online`; live on PDPs
PC-BRAND ✅ COMPLETE  — House brand "Ageera" seeded on prod + assigned to all 355 products (xlsx had no brand column; single-brand decision); replaces storefront "Ageera Farm" fallback
PC-CREDS ✅ COMPLETE  — Reconciled prod MinIO root-credential drift (ageera_minio_staging → ageera_minio) so the NestJS API S3 uploads authenticate; data/buckets/policy intact through recreate
PC-F   🔄 ONGOING    — Product photography (~325 of 349 products still need real images — Catalog Phase F, longest-running; 24 done. Adapter auto-serves MinIO images once present, falls back to seed galleries meanwhile)
```

---

## PHASE 0 — Planning & Architecture
**Status:** ✅ COMPLETE  
**Completed:** 2026-05-10  
**Duration:** ~1 session

### Deliverables
- [x] Technology stack selected (Angular 19 + NestJS + PostgreSQL + Prisma + Firebase Auth)
- [x] NX monorepo architecture decided (apps: storefront, admin-panel, delivery-pwa, api)
- [x] Shared libs defined (@ageera/ui, models, auth, api-client, utilities, constants)
- [x] Prisma schema designed — 15 models covering all business entities
- [x] Docker Compose setup (postgres, redis, pgadmin)
- [x] Firebase Auth strategy: token-in → verify → internal RBAC
- [x] Brand tokens extracted from WordPress theme (#00bcd4 primary, #3c3950 dark)
- [x] WordPress → Angular migration plan created (Reference/migration/)
- [x] Business domains identified: Milk Subscription, E-Commerce, Delivery ERP
- [x] Customer codes: AGR-XXXXX | Invoice: INV-YYYYMM-XXXX | Orders: ORD-YYYYMMDD-XXXX

---

## PHASE 1 — Foundation & Core Backend + All Angular Apps
**Status:** ✅ COMPLETE  
**Completed:** 2026-05-10  
**Duration:** ~2 sessions

### Backend Deliverables
- [x] NestJS AppModule — global FirebaseAuthGuard + RolesGuard via APP_GUARD
- [x] TransformInterceptor — `{ success, data, timestamp, path }` response shape
- [x] PrismaService + soft-delete middleware
- [x] @Public() + @Roles() + @CurrentUser() decorators
- [x] AUTH module — Firebase token verify + user upsert
- [x] USERS module — CRUD, role management
- [x] CUSTOMERS module — create/list/detail/update/deactivate + AGR-XXXXX codes
- [x] PRODUCTS module — CRUD, status, low-stock queries
- [x] CATEGORIES module — CRUD with active-product guard on delete
- [x] ADDRESSES module — per-customer address management, default logic
- [x] DELIVERY BOYS module — CRUD, route assignment
- [x] ROUTES module — zone CRUD, assign customer, getStats (deliveries + outstanding)
- [x] SUBSCRIPTIONS module — create/pause/resume/cancel, subscriptionCode generation
- [x] DELIVERY LEDGER module — idempotent daily generation (upsert), mark delivered, bulk-deliver
- [x] BILLING module — invoice generation from DELIVERED ledger entries only; aging report
- [x] INVOICES module — list/detail/recordPayment/cancel
- [x] PAYMENTS module — paymentNumber, method/collectionDate/reference fields correct
- [x] INVENTORY module — InventoryLog movements, outbound stock validation
- [x] ANALYTICS module — KPIs, revenue trends, route performance
- [x] REPORTS module — daily summary, monthly revenue, outstanding aging
- [x] SETTINGS module — AppSetting CRUD with Json-typed values
- [x] ADMIN module — dashboard aggregates, audit log
- [x] ORDERS module — checkout flow, order status
- [x] Cron job — 4 AM daily ledger generation (@nestjs/schedule)
- [x] BullMQ + Redis queue infrastructure
- [x] Code generators — generateInvoiceNumber(), generatePaymentNumber(), generateCustomerCode()
- [x] Prisma seed.ts — 6 products, categories, AppSettings

### Angular Storefront Deliverables
- [x] app.config.ts — provideRouter, provideHttpClient, Firebase, interceptors
- [x] Auth interceptor — Firebase ID token injected per request
- [x] StorefrontLayout — Header + Footer shell
- [x] HomeComponent — hero, features, featured products, subscription CTA, testimonials
- [x] ShopList + ShopDetail — product grid, filter, cart add
- [x] Cart + Checkout — signal-based state, address + payment selection
- [x] SubscriptionPlans + SubscriptionSetup — full signup flow (defaultQuantity + frequency)
- [x] Account section — Dashboard, Subscription, Ledger, Orders
- [x] Services — ProductsService, SubscriptionService, CartService, AddressService, OrderService

### Angular Admin Panel Deliverables
- [x] AdminLayout — sidebar nav, topbar
- [x] Dashboard — KPI cards
- [x] Products list + form — correct basePrice/subscriptionPrice/unitLabel/stockQuantity
- [x] Customer list + detail — subscription shows defaultQuantity × unitLabel
- [x] Delivery route sheet — scheduledQty/deliveredQty, status dropdown
- [x] Delivery collect — payment using `method` field
- [x] Invoice list + detail — line items with scheduledQty/deliveredQty

### Delivery PWA Deliverables
- [x] PWA manifest + service worker
- [x] DeliveryAuthService — Firebase login + delivery boy gate
- [x] RouteSheet — today's assignments with quantity × unitLabel badges
- [x] RecordDelivery — mark status + quantity
- [x] Collect — payment collection

---

## PHASE 2 — Core Business Engine (Active)
**Status:** 🔄 IN PROGRESS  
**Started:** 2026-05-10  
**Priority:** CRITICAL

### Completed
- [x] Full field-name audit against Prisma schema — all 3 Angular apps + all 17 backend modules corrected
- [x] Key field mapping established (see `doc/Log-Files/FIELD_NAME_REFERENCE.md` or memory)
- [x] DeliveryBoy/User ID resolution pattern confirmed (resolveDeliveryBoyId helper)
- [x] lineItems confirmed as Json? field on Invoice (not a relation)

### Remaining
- [ ] Convert inline TS interface DTOs to class-validator DTO classes in NestJS modules
- [ ] Delivery PWA — offline-first enhancements (IndexedDB sync, background sync)
- [ ] Delivery PWA — bulk entry UI (mark all as delivered in one tap)
- [ ] Admin Dashboard — connect real chart data to analytics endpoints
- [ ] Admin Dashboard — outstanding aging chart
- [ ] Admin Dashboard — route performance table
- [ ] WhatsApp notification stubs (billing + delivery confirmation)
- [ ] End-to-end test: subscription → daily ledger → invoice → payment flow

---

## PHASE 3 — Delivery PWA (Enhancements)
**Status:** ⏳ UPCOMING  
**Depends on:** Phase 2 complete  
**Priority:** HIGH

- [ ] Offline mode — IndexedDB queue, sync on reconnect
- [ ] Push notifications — route assignment alert
- [ ] Route map view (Google Maps / OpenStreetMap)
- [ ] Bulk-deliver UI — mark all pending as delivered with one tap
- [ ] Customer signature capture on delivery
- [ ] Photo proof of delivery upload
- [ ] UPI QR display for payment collection
- [ ] End-of-day settlement report for delivery boy
- [ ] Attendance & earnings summary

---

## PHASE 4 — Admin Panel ERP (Enhancements)
**Status:** ⏳ UPCOMING  
**Depends on:** Phase 2  
**Priority:** HIGH

- [ ] Real-time KPI charts (revenue trend, delivery completion, outstanding aging)
- [ ] Route management UI — create/edit routes, drag-drop customer sequence
- [ ] Bulk invoice generation UI — trigger month-end billing for all customers
- [ ] WhatsApp send button on invoice detail
- [ ] Payment collection summary — today vs target
- [ ] Inventory stock-in form
- [ ] Audit log viewer
- [ ] App settings editor (pricing, thresholds)
- [ ] ACCOUNTANT role — restricted view (payments + invoices only)

---

## PHASE 5 — Storefront & E-Commerce (Polish)
**Status:** ⏳ UPCOMING  
**Depends on:** Phase 1 complete  
**Priority:** MEDIUM

- [ ] SSR / Angular Universal for SEO
- [ ] Meta tags + structured data (JSON-LD)
- [ ] Blog section using migration components
- [ ] Product search with debounce
- [ ] Order tracking page
- [ ] Customer address book management
- [ ] Sitemap generation
- [ ] WordPress product data migration

---

## PHASE 6 — Production, Launch & Scale
**Status:** 🔄 PARTIAL  
**Depends on:** Phase 3 + 4 + 5  
**Priority:** HIGH (launch gate)

### Completed
- [x] **Razorpay payment gateway** — full integration. Server-side `POST /payments/razorpay/order` (idempotent on receipt) + signed `POST /payments/razorpay/webhook` (HMAC-SHA256, raw-body verification). Client uses bearer-token-authed apiPost from Next.js
- [x] **Next.js ↔ NestJS wiring** — three-mode flag (local / firestore / api); all repos route through factory; Firebase ID token automatically attached as Bearer
- [x] **Customer self-service** — `@CustomerOwnership` decorator + guard; customers can read/write their own profile, addresses, subscriptions, orders, invoices
- [x] **Auth registration linking** — Firebase signUp → `POST /auth/register` → NestJS Customer row created
- [x] **End-to-end api-mode** — register → subscribe → checkout → real Order in Postgres → atomic inventory decrement → AuditLog status history → tracking page with real timeline
- [x] **Production Docker Compose** — Next.js apps/web service added (standalone output, multi-stage build with NEXT_PUBLIC_* baked at build time), nginx reverse proxy rewritten for ageera.online with TLS termination + Next.js SSR proxy + Razorpay webhook raw-body passthrough, certbot service for Let's Encrypt auto-renewal (Phase 7a + 7b)
- [x] **PostgreSQL automated backups** — pg_dump cron with 7-daily / 4-weekly / 12-monthly retention; restore script for one-line rollback (Phase 7c)
- [x] **Connection pooling** — PgBouncer (transaction mode) fronting Postgres; Prisma DATABASE_URL routes through it with `?pgbouncer=true` (Phase 7c)
- [x] **Postgres production tuning** — postgresql.conf for 8GB-RAM target: shared_buffers=2GB, work_mem=16MB, wal_compression=lz4, slow-query log >500ms, IST timezone (Phase 7c)
- [x] **`.env.production.example`** + Home Lab Deployment Runbook at `doc/runbook/HOMELAB_DEPLOYMENT.md` — covers prerequisites, first-time deploy (DNS → cert issuance → bring-up → migrate), day-2 ops (rolling deploy, backups, restore, cert renewal), troubleshooting, rollback (Phase 7d)

### Remaining
- [ ] Environment secrets management (no .env in git; Vault / agenix / 1Password Connect)
- [ ] Off-site backup automation (rclone to S3/B2/SFTP — runbook documents the cron pattern but isn't wired)
- [ ] Nx Cloud — remote cache + distributed task execution
- [ ] Full e2e test coverage (Cypress/Playwright)
- [ ] Load testing — subscription cron at scale
- [ ] GDPR / DPDP Act 2023 data protection audit
- [ ] WhatsApp Business API production account
- [ ] Launch checklist sign-off
- [ ] Razorpay merchant KYC + live keys
- [ ] Firebase project hardening (real-mode credentials in Next.js + NestJS verify)
- [ ] First production deploy on home lab (following the runbook)

---

## NEXT.JS STOREFRONT TRACK (apps/web)

A parallel Next.js 16 customer storefront built alongside the Angular `apps/storefront`. After the user pivoted in 2026-05-11 to use the existing NestJS backend instead of Cloud Functions, this track was wired end-to-end to `apps/api` and is the **active customer-facing storefront**.

### NX-P0 — Foundation
**Status:** ✅ COMPLETE
- [x] apps/web scaffold: Next.js 16.2.6 (Turbopack), React 19, Tailwind v4, shadcn/ui, Framer Motion 12, zustand 5, TypeScript strict
- [x] Brand token layer (`lib/tokens.ts`, `app/globals.css`)
- [x] Montserrat (heading) + Source Sans 3 (body) via next/font
- [x] `proxy.ts` middleware (Next 16 convention) for business cookie routing

### NX-P1 — Landing Business Selector
**Status:** ✅ COMPLETE
- [x] Fullscreen dark canvas with procedural starfield
- [x] Two animated business cards (Daily Milk Delivery amber, Organic Store green)
- [x] Persists choice in localStorage + cookie
- [x] `?choose=1` bypass for switching businesses
- [x] CSS keyframe entrance animations (workaround for Framer hydration bug — see Notes)

### NX-P2 — Shared Shell
**Status:** ✅ COMPLETE
- [x] AgeeraLogo (3 variants), SiteHeader (sticky, mobile drawer, cart badge, switch-business), SiteFooter, WhatsAppFAB
- [x] Route groups (milk) / (store) with separate layouts

### NX-P3 — Milk Wizards + Store PLP
**Status:** ✅ COMPLETE
- [x] /milk/plans — 3-tier cards + live AnimatedNumber price calculator
- [x] /milk/service-area — pincode lookup + map placeholder
- [x] /milk/subscribe — 4-step wizard (Plan / Address / Schedule / Confirm) with Framer slide transitions
- [x] /store/category/[slug] — PLP with sidebar facets + sort + grid/list toggle + pagination
- [x] lib/seed-products.ts — 18 products across 6 categories

### NX-P4a — PDP + Cart + Checkout
**Status:** ✅ COMPLETE
- [x] lib/store/cart.ts zustand persist+skipHydration
- [x] /store/product/[slug] — gallery, qty stepper, tabs, related products
- [x] /store/cart — line items + Framer height transitions, sticky summary
- [x] /store/checkout — full form, payment method radio, fake submit + success page
- [x] Header cart badge live-wired

### NX-P4b — Firebase Auth Scaffold
**Status:** ✅ COMPLETE
- [x] `NEXT_PUBLIC_AUTH_MODE=dev` fake-user fallback
- [x] /auth/login, /auth/register, /auth/forgot-password
- [x] RequireAuth gate + SiteHeader user menu
- [x] /milk/account, /store/orders, /account/profile (all RequireAuth-gated)

### NX-P5a — Subs Management + Calendar/Ledger + Real Images + Firestore Scaffold
**Status:** ✅ COMPLETE
- [x] lib/store/subscriptions.ts + SubscribeWizard integration
- [x] SubscriptionsManager — Pause/Resume/Change-plan/Cancel modals (Base UI Dialog)
- [x] DeliveryCalendar (month grid) + DeliveryLedger (30-day filter chips) + shared seeded data
- [x] lib/data/{firestore,orders-repo,subscriptions-repo,profile-repo}.ts — repo factory (local + firestore)
- [x] 18 Unsplash photo IDs added to seed; next/image with onError gradient fallback

### NX-P5b — Auth Verification + Order Tracking + Razorpay + Admin/Driver Demos
**Status:** ✅ COMPLETE
- [x] Email verification flow (60s resend cooldown + dev helper) + verified badge on profile
- [x] Phone OTP (6-box auto-advance, dev code 123456)
- [x] Order tracking page (state-simulator advances every 30s, 5s polling, status timeline)
- [x] firestore.rules starter file
- [x] Razorpay client scaffold (dev fake sheet + real-mode SDK loader)
- [x] (admin) / (driver) Next.js route groups — **DEMO only** (real ones are Angular apps/admin-panel + apps/delivery-pwa)
- [x] DevRoleSwitcher floating gear (dev mode only)

### NX-P6b — Next.js ↔ NestJS API Client
**Status:** ✅ COMPLETE
- [x] lib/api/{config,types,client,customer-context}.ts
- [x] 9 typed endpoint modules
- [x] DataMode flag added (local / firestore / api)
- [x] orders-repo / subscriptions-repo / profile-repo gain 3rd `api*` impl
- [x] DTO adapters for enum + Decimal + displayName mismatches

### NX-P6c — NestJS Backend Additions
**Status:** ✅ COMPLETE
- [x] `@CustomerOwnership` decorator + companion guard (Path A — global APP_GUARD pattern)
- [x] Orders module (NEW) — controller + service + 3 DTOs
- [x] Customer self-service routes opened across Customers/Addresses/Subscriptions/Invoices/Orders
- [x] POST /subscriptions/self + UpdateSubscriptionDto.frequency
- [x] GET /categories/slug/:slug + /categories/slug/:slug/products
- [x] POST /payments/razorpay/order (idempotent) + POST /payments/razorpay/webhook (HMAC-verified)
- [x] main.ts rawBody:true enabled for webhook signature verification

### NX-P6d — Frontend Wiring to New Endpoints
**Status:** ✅ COMPLETE
- [x] Order status enum bidirectional adapter (PENDING/CONFIRMED↔placed, PROCESSING↔preparing, SHIPPED↔out_for_delivery)
- [x] SubscribeWizard resolves productId at plan-change + saves address at step transition → calls /subscriptions/self
- [x] RegisterForm calls /auth/register after Firebase signUp
- [x] Razorpay client now calls /payments/razorpay/order via bearer-authed apiPost
- [x] OrderTrackingContent handles missing statusHistory gracefully

### NX-P6e — Final API Wiring
**Status:** ✅ COMPLETE
- [x] lib/store/addresses.ts + lib/data/addresses-repo.ts (NEW) — 3-way factory
- [x] CheckoutForm saved-address picker (radio cards + "Use a different address" toggle); persists new address before order; resolves per-item productId at submit via productsApi.bySlug
- [x] /store/category/[slug] PLP uses categoriesApi.productsBySlug in api-mode
- [x] NestJS Orders.getHistory() reads AuditLog rows; GET /orders/:id/history endpoint
- [x] NestJS Orders.createForUser atomic transaction: inventory decrement + InventoryLog (SALE) + ConflictException on insufficient stock
- [x] OrderTrackingContent enriches statusHistory from real AuditLog

### NX-P7 — Home Lab Production Stack
**Status:** ✅ COMPLETE
- [x] **NX-P7a** — apps/web Next.js production Dockerfile (standalone output, non-root, multi-stage); `web` service added to infra/docker-compose.prod.yml (2 replicas, build args for NEXT_PUBLIC_* baked at build)
- [x] **NX-P7b** — infra/docker/nginx/nginx.conf rewritten for `ageera.online`: TLS 1.2/1.3 + HSTS preload + OCSP stapling, HTTP→HTTPS redirect with ACME challenge, Next.js SSR proxy with cache rules for `/_next/static/` + `/_next/image`, Razorpay webhook raw-body passthrough, admin + delivery PWA SPA static-served; certbot sidecar for 12h auto-renewal
- [x] **NX-P7c** — infra/docker/postgres/postgresql.conf production-tuned for 8GB RAM (shared_buffers=2GB, work_mem=16MB, wal_compression=lz4, slow-query >500ms, IST timezone); PgBouncer transaction-pool service; tiered pg_dump backup (7 daily / 4 weekly / 12 monthly) with restore.sh; postgres_backup container running BACKUP_SCHEDULE cron
- [x] **NX-P7d** — `.env.production.example` template; `docs/runbook/HOMELAB_DEPLOYMENT.md` (~250 lines) covering prerequisites, first-time deploy, day-2 ops, troubleshooting table, rollback procedures

### NX-P8d — Error Tracking + Analytics
**Status:** ✅ COMPLETE (both `next build` and `nx build api` green)

**NX-P8d-1 — Glitchtip (error tracking, Sentry-compatible):**
- [x] infra/docker-compose.prod.yml — `glitchtip_web` + `glitchtip_worker` services (`glitchtip/glitchtip:latest`), worker runs `./bin/run-celery-with-beat.sh`. DB on existing Postgres via PgBouncer (`glitchtip` database); Redis DB 2 as Celery broker (separate from app cache on DB 0). `glitchtip_uploads` named volume. `ENABLE_OPEN_USER_REGISTRATION=false`
- [x] infra/docker/postgres/init.sql — idempotent `DO $$` block creating `glitchtip` + `umami` databases owned by ${POSTGRES_USER}. Note: only fires on FRESH data dir; runbook documents manual fallback for existing clusters
- [x] infra/docker/nginx/nginx.conf — `errors.ageera.online` added to ACME redirect + new HTTPS server block with WebSocket upgrade headers + 7200s long-poll timeouts (admin UI uses WS) + `client_max_body_size 50M` for large stack traces
- [x] apps/web — installed `@sentry/browser` (8 packages); created `lib/sentry/init.ts` + `instrumentation-client.ts` (Next 16 client entry) + `instrumentation.ts` (Next 16 server entry with `onRequestError` hook). Dynamic import of `@sentry/node` keeps Edge runtime safe
- [x] apps/api — installed `@sentry/node` (root, `--legacy-peer-deps` for the pre-existing `@nestjs/bull` peer range); created `apps/api/src/sentry.ts` with `initSentry()` + `isSentryInitialised()`; main.ts calls `initSentry()` at very top BEFORE `NestFactory.create`
- [x] apps/api/src/app/common/interceptors/sentry-user.interceptor.ts (NEW) — `Sentry.withScope` per request, sets user.id/email from `req.user`, tags `firebaseUid` + `role`. Registered in `useGlobalInterceptors`
- [x] apps/api/src/app/common/filters/http-exception.filter.ts — `Sentry.captureException` for `status >= 500` only (4xx skipped — client noise). Tagged with `method` + `statusCode` + `path`
- [x] `.env.production.example` — `GLITCHTIP_*` block + `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` / `SENTRY_ENVIRONMENT` / `SENTRY_TRACES_SAMPLE_RATE`. DSNs come from Glitchtip UI after org+project creation
- [x] All Sentry init is a hard no-op when DSN is empty — dev mode pays zero cost, half-configured prod doesn't leak

**NX-P8d-2 — Umami (privacy-friendly analytics):**
- [x] infra/docker-compose.prod.yml — `umami` service (`ghcr.io/umami-software/umami:postgresql-latest`); DB on existing Postgres via PgBouncer (`umami` database). Healthcheck against `/api/heartbeat`. Internal-only (nginx fronts it)
- [x] infra/docker/nginx/nginx.conf — `analytics.ageera.online` added to ACME redirect + new HTTPS server block (standard HTTP proxy, no WebSocket needed)
- [x] `.env.production.example` — `UMAMI_POSTGRES_DB` / `UMAMI_APP_SECRET` + public tracker `NEXT_PUBLIC_UMAMI_WEBSITE_ID` / `NEXT_PUBLIC_UMAMI_SRC` (default `https://analytics.ageera.online/script.js`)
- [x] apps/web/app/layout.tsx — conditional `<Script src={NEXT_PUBLIC_UMAMI_SRC} data-website-id={NEXT_PUBLIC_UMAMI_WEBSITE_ID} strategy="afterInteractive" async defer />` in `<body>`. Tracker only renders when BOTH env vars are set
- [x] docs/runbook/HOMELAB_DEPLOYMENT.md — new sections "Error tracking (wired — Glitchtip)" + "Analytics (wired — Umami)" with first-time setup walkthroughs; DNS records + DNS sanity dig commands + cert-issuance flags updated for both new subdomains; future-hardening list updated

**Decisions:**
- Sentry SDK: bare `@sentry/browser` + `@sentry/node` instead of `@sentry/nextjs`/`@sentry/nestjs`. Reason: Webpack-plugin friction with Next 16 Turbopack; source-map upload deferred to Phase 9 anyway
- Default Umami credentials `admin`/`umami` per upstream image — runbook instructs to change immediately on first login (no env-var seed available)
- init.sql additions only run on FRESH Postgres data dir; runbook documents `docker compose exec postgres psql -c 'CREATE DATABASE ...'` manual fallback for existing clusters
- Source-map upload at build time, server-side Umami event tracking, and custom analytics events beyond pageview are all out-of-scope for this phase (Phase 9 polish items)

**Build verification:**
- `npx next build` → 60/60 static pages, 0 TS errors, no Sentry-related warnings (Turbopack 6.5s compile + 7.7s TS)
- `nx build api --skip-nx-cache` → webpack compiled successfully, no warnings

---

### NX-P8c — Off-site Backups + Uptime Monitoring
**Status:** ✅ COMPLETE
- [x] infra/docker/rclone/sync.sh + run-cron.sh — rclone-based mirror of postgres_backups to a remote (S3/B2/R2/GDrive/SFTP). Nightly 03:30 IST after pg_dump. 30-day retention on `daily/`; `weekly/` + `monthly/` kept indefinitely off-site
- [x] infra/docker-compose.prod.yml — `offsite_backup` service (rclone/rclone:latest), `rclone_config` named volume for persistent remote config
- [x] infra/docker-compose.prod.yml — `uptime_kuma` service (louislam/uptime-kuma:1), `uptime_kuma_data` named volume
- [x] infra/docker/nginx/nginx.conf — `status.ageera.online` HTTPS server block with WebSocket upgrade headers + 7200s long-poll timeouts; new `uptime_kuma_backend` upstream
- [x] `.env.production.example` — `RCLONE_REMOTE` / `RCLONE_REMOTE_PATH` / `OFFSITE_RETENTION_DAYS` / `OFFSITE_SCHEDULE` documented
- [x] `docs/runbook/HOMELAB_DEPLOYMENT.md` — DNS records + cert issuance for status.ageera.online; "Off-site backup (wired)" section with `rclone config` walkthrough; "Monitoring (wired)" section with Uptime-Kuma first-time setup (admin account + 4 default monitors + notification channels)
- **Deferred to Phase 9**: Grafana + Loki + Promtail + Prometheus + postgres-exporter
