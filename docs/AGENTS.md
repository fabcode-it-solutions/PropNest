# PropNest — Agent Reference Guide

> **Read this file before touching any code.** It contains the full project context, architecture decisions, implementation status, and coding conventions. All AI agents and developers should consult this before working on any module.

---

## What Is PropNest?

PropNest is a **full-stack real estate listing & mortgage pipeline platform** — a portfolio project demonstrating domain modeling, geospatial engineering, async processing, state machines, and security. It is a greenfield project built with a BaaS-first approach for rapid deployment.

**Audience:** Portfolio reviewers and interviewers — every feature must be *visible* and *interactive*. Cut features that are invisible to users.

---

## Repository Layout

```
propnest/                          ← monorepo root (pnpm workspaces)
├── apps/
│   ├── api/                      ← Fastify Node.js backend (TypeScript)
│   │   ├── src/
│   │   │   ├── app.ts            ← Fastify app builder
│   │   │   ├── server.ts         ← process entry point
│   │   │   ├── config/           ← env.ts, db.ts, redis.ts, es.ts, s3.ts
│   │   │   ├── shared/
│   │   │   │   ├── auth/         ← jwt.plugin.ts, rbac.ts, refresh.service.ts
│   │   │   │   ├── events/       ← emitter.ts, event-types.ts
│   │   │   │   ├── queues/       ← queue-registry.ts, worker-registry.ts
│   │   │   │   ├── storage/      ← presigned.service.ts
│   │   │   │   └── websockets/   ← socket.plugin.ts
│   │   │   └── modules/
│   │   │       ├── auth/         ← routes.ts (register/login/refresh/logout/google)
│   │   │       ├── listings/     ← routes, service, repo, state-machine, search/, images/, offers/, showings/, saved-searches/
│   │   │       ├── transactions/ ← routes, service, repo, documents/
│   │   │       ├── mortgage/     ← routes, service, repo, state-machine, ocr/, pdf/
│   │   │       ├── notifications/← routes, service, email.service.ts, listeners/
│   │   │       └── admin/        ← routes (users, listings, queues, stats)
│   │   ├── infra/
│   │   │   ├── migrations/       ← 001–018 SQL files (run via Neon MCP or node-pg-migrate)
│   │   │   ├── seeds/            ← dev.sql (20 Bay Area listings, 12 users, etc.)
│   │   │   └── es/               ← setup.ts (create ES index), seed.ts (sync listings)
│   │   ├── jobs/                 ← BullMQ workers: es-sync, ocr, showing-reminder, pdf, notifications
│   │   ├── fly.toml              ← Fly.io deployment config
│   │   ├── Dockerfile            ← multi-stage Node 20 alpine
│   │   └── .env.example          ← all required env vars with comments
│   └── web/                      ← Next.js 15 App Router frontend
│       ├── src/
│       │   ├── app/              ← App Router pages (layout.tsx, page.tsx per route group)
│       │   │   ├── (public)/     ← /, /listings/[slug], /search
│       │   │   ├── (auth)/       ← /login, /register, /auth/callback
│       │   │   ├── (buyer)/      ← /dashboard, /mortgage/[id]
│       │   │   ├── (agent)/      ← /crm
│       │   │   ├── (lender)/     ← /lender
│       │   │   └── (admin)/      ← /admin
│       │   ├── components/
│       │   │   ├── ui/           ← primitives: Button, Badge, Input, Card, Modal, Skeleton
│       │   │   ├── map/          ← MapboxMap, MapMarker, DrawSearchPolygon, ClusterLayer
│       │   │   ├── listing/      ← ListingCard, ListingGallery, ListingFilters, StatusPill
│       │   │   ├── offer/        ← OfferForm, OfferChain, OfferBadge
│       │   │   ├── mortgage/     ← MortgageStepper, DocumentDropzone, OCRResultCard
│       │   │   └── notifications/← NotificationBell, ToastProvider
│       │   ├── lib/
│       │   │   ├── api.ts        ← typed fetch client with auto-refresh interceptor
│       │   │   ├── stores/       ← Zustand: auth.ts, map.ts, filters.ts
│       │   │   └── hooks/        ← React Query hooks per domain
│       │   └── types/            ← re-exports from @propnest/shared-types
│       ├── tailwind.config.ts    ← full design system tokens
│       ├── next.config.ts
│       └── .env.local.example
├── packages/
│   └── shared-types/
│       └── src/index.ts          ← ALL TypeScript types shared between api and web
├── docker-compose.yml            ← local dev: Elasticsearch only
├── Dockerfile.fly                ← root-level Dockerfile for Fly.io remote builds
└── .github/workflows/ci.yml      ← lint → typecheck → test → build → deploy
```

---

## Infrastructure (Live — MCP Provisioned)

| Service | Provider | How Provisioned | Details |
|---|---|---|---|
| PostgreSQL | **Neon** | `mcp__Neon__*` | Project: `lively-forest-15922545` |
| — prod branch | | | `ep-noisy-cherry-ain4bxkg-pooler.c-4.us-east-1.aws.neon.tech` |
| — dev branch | | | `ep-frosty-shape-aizby6a0-pooler.c-4.us-east-1.aws.neon.tech` (seeded) |
| Backend API | **Fly.io** | `mcp__flyctl__*` | App: `propnest-api`, IP: `66.241.124.81` |
| Frontend | **Vercel** | GitHub integration | Auto-deploys `apps/web` on push to main |
| Redis | **Upstash** | Manual | Set `REDIS_URL` secret in Fly.io |
| Elasticsearch | **Elastic Cloud** | Manual | Set `ELASTICSEARCH_URL` secret in Fly.io |
| Images CDN | **Cloudinary** | Manual | Set `CLOUDINARY_*` secrets |
| Storage/OCR | **AWS S3 + Textract** | Manual | Set `AWS_*` secrets |
| Email | **Resend** | Manual | Set `RESEND_API_KEY` secret |
| Error tracking | **Sentry** | Manual | Set `SENTRY_DSN` secrets (both apps) |

**Credentials:** All secrets are staged in Fly.io via `mcp__flyctl__fly-secrets-set`. Replace `placeholder` values with real ones. The Neon password is `npg_j7cOYARU9bKH` (update if rotated).

**Local dev:** Only Elasticsearch runs locally (`docker compose up -d`). Postgres and Redis point at Neon dev branch and Upstash directly.

---

## Tech Stack

### Backend (`apps/api`)
- **Runtime:** Node.js 20, TypeScript (ESM)
- **Framework:** Fastify 4 — `@fastify/jwt`, `@fastify/cors`, `@fastify/helmet`, `@fastify/oauth2`
- **ORM:** Raw `pg` (node-postgres) — no ORM, hand-written SQL
- **Queue:** BullMQ 5 + ioredis (Upstash)
- **Search:** `@elastic/elasticsearch` 8
- **Auth:** Custom JWT (15min access) + SHA-256 hashed refresh tokens in Postgres + Redis
- **Realtime:** Socket.io 4
- **Email:** Resend SDK
- **PDF:** pdf-lib
- **Validation:** Zod (env + route schemas)
- **Testing:** Vitest

### Frontend (`apps/web`)
- **Framework:** Next.js 15 (App Router, Server Components)
- **State:** Zustand 5 (auth, map, filters)
- **Server state:** TanStack Query 5
- **Map:** Mapbox GL JS 3 + react-map-gl 7
- **Forms:** React Hook Form 7 + Zod
- **Animation:** Framer Motion 11
- **Icons:** Lucide React
- **DnD:** @dnd-kit/core (Agent CRM Kanban)
- **Realtime:** socket.io-client 4
- **Styling:** Tailwind CSS 3 (custom design tokens — see below)

---

## Design System ("PropNest Premium")

### Colors
```
navy.DEFAULT  #1B2D4F   primary brand — trust, authority
steel         #2C5F8A   interactive secondary
gold.DEFAULT  #C9A84C   CTAs, premium accent (Gold button = primary CTA)
ivory.DEFAULT #FAFAF8   page background
border        #E4E2DD   subtle dividers
muted         #6B7280   secondary text, labels

Semantic:
  success   #16A34A
  warning   #D97706  (also Pending status)
  error     #DC2626
  info      #0EA5E9

Status on map + cards:
  Active  → navy dot
  Pending → amber dot  (#D97706)
  Sold    → gray dot   (#9CA3AF)
```

### Typography
```
font-display  → Playfair Display (serif) — H1/H2/H3, hero text, listing price
font-sans     → Inter — all UI text
font-mono     → JetBrains Mono — OCR data, confidence values

Heading scale: H1=48px, H2=36px, H3=28px (Playfair)
               H4=22px, H5=18px, H6=16px (Inter)
```

### Spacing, Radius, Shadow
```
Base unit: 4px  →  scale: 4 8 12 16 24 32 48 64 96px
border-radius: card=8px, modal=12px, pill=9999px
shadow: card (subtle lift), floating (dropdowns), modal (overlay)
motion: 200ms ease-out on all transitions
```

### Key Component Specs
- **ListingCard** — 8px radius, card shadow, hover→floating, primary image (Cloudinary 400×300, blur placeholder), status pill top-right, price in Playfair, 3 stats row (beds/baths/sqft + Lucide icons), save heart (optimistic, fills gold)
- **MapMarker** — 12px circle, navy/amber/gray by status; hover→price bubble pill; click→preview drawer
- **StatusPill** — pill shape, navy bg (Active), amber bg (Pending), gray bg (Sold), dashed border (Draft)
- **MortgageStepper** — 7 stages horizontal desktop / vertical mobile; completed=navy+check, current=pulsing gold ring, future=gray
- **OCRResultCard** — 2-col: PDF left, extracted fields right; confidence badge green>80%/amber 50-80%/red<50%; lender edits inline

---

## Database Schema (Neon — already migrated)

### Tables (all 13 live on prod and dev branches)
```
users               id, email, password_hash, role, first_name, last_name, phone, avatar_url, is_active, oauth_provider, oauth_id
agents              id, user_id, license_number, agency_name, bio, specializations[], service_area_zips[]
listings            id, agent_id, seller_id, status, property_type, address fields, location GEOMETRY(Point,4326), price, bedrooms, bathrooms, sqft, year_built, description, features JSONB, slug, hoa_monthly, primary_image_url, listed_at, pending_at, sold_at
listing_images      id, listing_id, cloudinary_public_id, url, width, height, sort_order, is_primary
showings            id, listing_id, buyer_id, agent_id, status, scheduled_at, duration_minutes, notes, confirmed_at, cancelled_at, reminder_24h_sent, reminder_1h_sent
offers              id, listing_id, buyer_id, agent_id, parent_offer_id (self-ref), price, status, financing_contingency, inspection_contingency, appraisal_contingency, closing_date, earnest_money, message, expiry_at, idempotency_key UUID UNIQUE
transactions        id, listing_id UNIQUE, offer_id UNIQUE, buyer_id, seller_id, agent_id, status, closing_date, sale_price, escrow_company
transaction_documents  id, transaction_id, uploader_id, category, s3_key UNIQUE, filename, size_bytes, mime_type, version, is_current_version, download_count
mortgage_applications  id, buyer_id, transaction_id, lender_id, stage, loan_type, loan_amount, property_value, ltv (generated), credit_score, annual_income, monthly_income, monthly_debt, pre_approval_letter_s3_key, pre_approval_amount, denial_reason
mortgage_documents  id, application_id, uploader_id, doc_type, s3_key, filename, size_bytes, textract_job_id, extraction_status, extracted_data JSONB, confidence_scores JSONB, reviewed, reviewer_id, reviewer_corrections JSONB
mortgage_conditions id, application_id, description, status, created_by, resolved_by, resolved_at
saved_searches      id, buyer_id, name, filters JSONB, alert_frequency, is_active, last_matched_at, last_alerted_at
refresh_tokens      id, user_id, token_hash TEXT UNIQUE, session_id UUID UNIQUE, expires_at, revoked_at, revocation_reason, ip_address
notifications       id, user_id, type, title, body, read_at, payload JSONB, email_sent_at
audit_logs          id, user_id (nullable), action, resource_type, resource_id, old_values JSONB, new_values JSONB, metadata JSONB, ip_address
```

### ENUM Types
```sql
user_role:                buyer | seller | agent | lender | admin
listing_status:           draft | active | pending | sold | withdrawn
property_type:            single_family | condo | townhouse | multi_family | land | commercial
offer_status:             submitted | countered | accepted | rejected | withdrawn | expired
transaction_status:       opened | in_escrow | closing | closed | cancelled
transaction_doc_category: purchase_agreement | inspection_report | appraisal | title_report | disclosure | other
mortgage_stage:           pre_qualification | document_collection | document_verification | underwriting_review | conditional_approval | final_approval | closed | denied
mortgage_doc_type:        w2 | pay_stub | tax_return | bank_statement | employment_letter | other
extraction_status:        pending | processing | completed | failed
mortgage_condition_status:open | satisfied | waived
showing_status:           requested | confirmed | completed | cancelled
alert_frequency:          immediate | daily_digest | off
```

---

## State Machines

### Listing Status Machine
```
draft ──[publish: 1+ image, price>0, location set]──► active
active ──[offer accepted]──► pending
pending ──[transaction closed]──► sold
pending ──[transaction cancelled]──► active  (re-list)
active ──[agent delist]──► draft
any ──[admin force]──► withdrawn
```
**Side effects:**
- `draft→active`: set `listed_at`, enqueue `listing-sync(upsert)`, emit `listing.published`
- `active→pending`: sync ES, emit `listing.pending`, notify other open offer holders
- `pending→sold`: set `sold_at`, sync ES, emit `listing.sold`
- `pending→active`: clear `pending_at`, sync ES, emit `listing.relisted`

### Mortgage State Machine
```
pre_qualification
  └─[lender advances]──► document_collection
       └─[all required docs uploaded]──► document_verification
            ├─[lender: docs insufficient]──► document_collection
            └─[lender: all verified]──► underwriting_review
                 ├─[lender: denied]──► denied (TERMINAL)
                 └─[lender: conditional]──► conditional_approval
                      ├─[all conditions satisfied/waived]──► final_approval
                      │    └─[loan funded]──► closed (TERMINAL)
                      └─[lender: denied]──► denied (TERMINAL)
```
**Guards:**
- `document_verification → underwriting_review`: ALL mortgage_documents have `extraction_status=completed` AND `reviewed=true`
- `conditional_approval → final_approval`: zero `mortgage_conditions` with `status=open`
- `denied` is terminal — no transitions out, create a new application

---

## BullMQ Queues

| Queue | Job types | Concurrency | Retry |
|---|---|---|---|
| `listing-sync` | `upsert-listing`, `delete-listing` | 2 | 5x exponential |
| `ocr-processing` | `submit-ocr`, `poll-ocr`, `parse-ocr` | 2 | 3x, 30s backoff |
| `notifications` | `send-email`, `send-realtime` | 4 | 5x email, 2x socket |
| `scheduled` | `showing-reminder`, `offer-expiry`, `saved-search-match` | 1 | 2x |
| `pdf-generation` | `generate-preapproval-letter` | 2 | 3x, 15s backoff |

**Key patterns:**
- `listing-sync` job ID = `listing:{listingId}:sync` → BullMQ deduplicates within 5s window
- `showing-reminder`: 2 delayed jobs on confirmation (fires 24h + 1h before `scheduled_at`), DB flag `reminder_24h_sent` guards double-send
- `offer-expiry`: repeatable cron every 5 min

---

## API Routes (complete inventory)

### Auth — `/auth`
```
POST   /auth/register            public     → {accessToken, refreshToken, user}
POST   /auth/login               public     → tokens
POST   /auth/refresh             public     → new tokens (rotates)
POST   /auth/logout              auth       → revokes token
GET    /auth/me                  auth       → current user
GET    /auth/google              public     → redirect to Google consent (buyers only)
GET    /auth/google/callback     public     → exchange code → issue tokens → redirect frontend
```

### Listings — `/listings`
```
GET    /listings                 public     paginated, basic filters
POST   /listings                 seller|agent  creates draft
GET    /listings/:id             public     full listing
PATCH  /listings/:id             owner|admin   partial update
POST   /listings/:id/publish     owner|admin   draft→active
POST   /listings/:id/status      agent|admin   state machine transition
GET    /listings/:id/offers      seller|agent|admin
POST   /listings/:id/images/presigned   owner|agent  Cloudinary upload signature
POST   /listings/:id/images/:imgId/confirm   owner|agent
DELETE /listings/:id/images/:imgId   owner|admin
PATCH  /listings/:id/images/:imgId/order   owner|agent
```

### Search — `/search`
```
POST   /search/listings          public     body:{filters,geoFilter,page} → ES results
GET    /search/suggest           public     ?q= → autocomplete
```

### Showings — `/showings` + nested
```
POST   /listings/:id/showings    buyer|agent  conflict check
GET    /listings/:id/showings    seller|agent|admin
GET    /showings                 buyer|agent   own showings
PATCH  /showings/:id             agent|seller  confirm or cancel
DELETE /showings/:id             buyer|agent|admin
```

### Offers — `/offers`
```
POST   /listings/:id/offers      buyer|agent   Idempotency-Key header required
GET    /listings/:id/offers/:offerId  buyer(own)|seller|agent|admin  with chain
POST   /offers/:id/counter       seller|agent
POST   /offers/:id/accept        seller|agent  → creates transaction
POST   /offers/:id/reject        seller|agent
POST   /offers/:id/withdraw      buyer(own)
```

### Transactions — `/transactions`
```
GET    /transactions             agent|admin   own deals
GET    /transactions/:id         parties|admin
PATCH  /transactions/:id         agent|admin   status, closing_date
GET    /transactions/:id/documents      parties|admin
POST   /transactions/:id/documents/presigned   parties  S3 presigned PUT
POST   /transactions/:id/documents/:docId/confirm  uploader
GET    /transactions/:id/documents/:docId/download  role-scoped  presigned GET + audit log
DELETE /transactions/:id/documents/:docId   uploader|admin
```

### Mortgage — `/mortgage`
```
POST   /mortgage/applications                           buyer
GET    /mortgage/applications                           buyer(own)|lender(assigned)|admin
GET    /mortgage/applications/:id                       parties|admin
PATCH  /mortgage/applications/:id/stage                 lender|admin  state machine
POST   /mortgage/applications/:id/documents/presigned   buyer
POST   /mortgage/applications/:id/documents/:docId/confirm  buyer  triggers OCR
GET    /mortgage/applications/:id/documents/:docId      parties
PATCH  /mortgage/applications/:id/documents/:docId/corrections  lender
POST   /mortgage/applications/:id/conditions            lender
PATCH  /mortgage/applications/:id/conditions/:condId    lender
POST   /mortgage/applications/:id/preapproval-letter    lender  enqueue PDF job
GET    /mortgage/applications/:id/preapproval-letter    buyer|lender  presigned download
```

### Other
```
POST/GET/PATCH/DELETE  /saved-searches             buyer
GET/PATCH/POST         /notifications              auth
GET                    /agents/:id/profile         public
GET/PATCH              /admin/users                admin
GET/PATCH              /admin/listings             admin
GET/POST               /admin/queues               admin  (BullMQ stats + retry)
GET                    /admin/stats                admin
```

---

## Security Patterns

### JWT + Refresh Token Rotation
1. **Access token** — JWT, 15min, `{userId, role, jti}`, secret `JWT_ACCESS_SECRET`
2. **Refresh token** — 32-byte random hex, stored as SHA-256 hash in `refresh_tokens` table + Redis key `session:{sessionId}` TTL 7d
3. **On rotation:** delete old Redis key → issue new token → set `revoked_at` on old DB row
4. **On logout:** revoke both DB row and Redis key

### RBAC
`requireRole(...roles)` Fastify preHandler — checks `request.user.role`. Applied per-route after `app.authenticate`. Ownership checks in service layer (e.g. agent can only edit own listings).

### S3 Presigned URL Flow (never expose raw S3 keys)
1. `POST .../presigned` → server validates role, returns S3 presigned PUT URL (15min TTL)
2. Client uploads binary directly to S3
3. Client calls `/confirm` → server calls `HeadObject` to verify
4. On download: server validates role, writes `audit_logs`, returns presigned GET URL (5min TTL)

### Offer Idempotency
- Client generates UUID v4 `Idempotency-Key` header
- Middleware checks Redis `idempotency:{userId}:{key}` before handler
- If exists: return cached response (no DB write)
- DB UNIQUE constraint on `offers.idempotency_key` as backstop

### Google OAuth2 (buyers only)
- `GET /auth/google` → `@fastify/oauth2` redirects to Google consent screen
- `GET /auth/google/callback` → exchange code → fetch Google profile → upsert user with `oauth_provider='google'` → issue JWT tokens → redirect to frontend `/auth/callback?accessToken=...&refreshToken=...`
- Non-buyer roles must use email/password — Google OAuth is buyer fast-path only

---

## Event-Driven Architecture

In-process EventEmitter (`shared/events/emitter.ts`). All events typed as discriminated union in `event-types.ts`.

| Event | Emitted by | Action |
|---|---|---|
| `listing.published` | listing.service | ES sync upsert |
| `listing.status_changed` | listing.service | ES sync, notify parties |
| `offer.received` | offer.service | Email + WebSocket to seller/agent |
| `offer.countered` | offer.service | Email + WebSocket to buyer |
| `offer.accepted` | offer.service | Create transaction, listing→pending, notify other offer holders |
| `offer.rejected` | offer.service | Email to buyer |
| `offer.expired` | expiry worker | Email to buyer, notify seller |
| `showing.confirmed` | showing.service | Email to buyer, enqueue 2 reminder delayed jobs |
| `showing.cancelled` | showing.service | Email all parties, cancel reminder jobs |
| `showing.reminder` | reminder worker | Email + WebSocket to buyer + agent |
| `transaction.created` | transaction.service | Welcome email all parties |
| `document.uploaded` | document.service | Notify other parties; if mortgage doc → enqueue OCR |
| `mortgage.stage_changed` | mortgage.service | Email + WebSocket to buyer |
| `mortgage.final_approved` | mortgage.service | Enqueue PDF generation job |
| `ocr.completed` | ocr worker | Notify lender doc ready for review |
| `ocr.failed` | ocr worker | Notify buyer to re-upload |
| `saved_search.matched` | matching worker | Immediate email alert |

### WebSocket Rooms (Socket.io)
```
user:{userId}               personal channel — all authenticated users
agent-crm:{agentId}         CRM Kanban live updates
transaction:{transactionId} all transaction parties
mortgage:{applicationId}    buyer + assigned lender
```

---

## Page-by-Page UI Spec

### A. Home / Landing Page (`/`)
- **Hero**: Full-viewport Mapbox map (non-interactive), dark overlay, Playfair H1 "Find Your Place", SearchBar at 60vh
- **Featured Listings**: 3-col grid desktop / carousel mobile, ListingCards with `priority=true`
- **How It Works**: 3-step, numbered navy icons, Playfair H3: "Search & Save" / "Make Your Move" / "Close with Confidence"
- **Nav**: PropNest wordmark (Playfair), Buy/Sell/Agents links, Login + gold "Get Started" CTA

### B. Search Results / Map View (`/search`)
- Split: 380px left panel (cards + filters) | right = Mapbox fills remaining
- Clustering with navy circles, markers colored by status
- **Draw-to-search**: "Draw area" button → freehand polygon → "Search this area" → API call
- Mobile: full-screen map + bottom sheet (pull-up for cards)
- Hover card ↔ highlight marker (two-way sync)

### C. Listing Detail (`/listings/[slug]`) — SSR
- `generateMetadata` → SEO title + og:image (Cloudinary URL)
- Hero gallery: 100vw, 60vh, lightbox with keyboard nav, blur placeholder
- Two-column: left 65% content, right 35% sticky sidebar
- Sticky sidebar: price (Playfair gold), StatusPill, "Schedule Showing" (gold) + "Make Offer" (navy outline), AgentAvatar card

### D. Offer Submission Modal
- 3-step: Terms → Contingencies → Review & Submit
- Idempotency-Key UUID generated client-side on modal open
- Loading spinner on submit, toast on success, listing card animates to amber if now pending

### E. Buyer Dashboard (`/dashboard`)
- Sidebar nav with notification badges
- Overview: 3 summary cards (Active Offers, Upcoming Showings, Mortgage Stage), recent activity feed
- Showings: timeline, "Add to Calendar" links
- Offers: offer chain cards with round counter ("Round 2 of 3")
- Mortgage: links to full stepper view

### F. Mortgage Pipeline (`/mortgage/[id]`)
- MortgageStepper (7 stages) full width top
- Current stage action panel: document checklist or "Awaiting lender review"
- DocumentUploadDropzone per doc type (w2, pay_stub, etc.)
- Each uploaded doc: filename, extraction status pill, "View OCR Results" expand → OCRResultCard
- Conditions list at conditional_approval stage
- Timeline sidebar: all stage transitions with dates and actors

### G. Agent CRM (`/crm`)
- Kanban: columns = deal stages (Offer Pending | In Escrow | Closing | Closed)
- Deal cards: listing thumbnail, buyer name, address, last activity, stalled >7d warning badge
- Right sidebar: Today's Showings, Needs Response (pending offers), Stalled Deals
- Real-time: Socket.io moves cards on offer events without page reload

### H. Lender Dashboard (`/lender`)
- Applications table: Applicant, Loan Amount, Stage (pill), Doc Completeness (progress bar), Days in Stage, Action
- Application detail: left = summary + stage controls + conditions, right = document list with OCRResultCard
- Full-screen OCR review mode: PDF iframe left, extracted fields table right, editable inputs, confidence scores

### I. Admin Panel (`/admin`)
- **Stats** (overview): user counts by role, active listings, open mortgage apps, total transactions
- **Users** (`/admin/users`): table with role dropdown (inline edit), status toggle, search/filter by role
- **Listings** (`/admin/listings`): all listings, force any status transition (bypasses state machine guards)
- **Queues** (`/admin/queues`): BullMQ stats per queue (active/waiting/failed counts), "Retry failed" button per queue

---

## Implementation Status

### Completed ✅
- **Monorepo scaffold** — `apps/api`, `apps/web`, `packages/shared-types`, `pnpm-workspace.yaml`, root `package.json`
- **Shared types** — `packages/shared-types/src/index.ts` (all domain types, enums, API wrappers)
- **API config** — `env.ts` (Zod validation), `db.ts`, `redis.ts`, `es.ts`, `s3.ts`
- **API skeleton** — `app.ts` (Fastify builder), `server.ts`, health check `/healthz`
- **Web skeleton** — Next.js 15, Tailwind design tokens, layout, root page
- **Neon DB** — project `lively-forest-15922545`, PostGIS enabled, all 13 tables + indexes + triggers migrated on prod branch
- **Dev branch** — `br-long-sky-aisre9bc` (inherits schema), seeded with 20 Bay Area listings, 12 users, 3 agents, 5 offers (counter chain), 1 transaction, 2 mortgage apps, 3 showings
- **Fly.io** — app `propnest-api` created, IP `66.241.124.81`, all secrets staged
- **Docker Compose** — Elasticsearch only (no local Postgres/Redis)
- **CI/CD** — `.github/workflows/ci.yml` (lint→typecheck→test→build→deploy on main)
- **Migration files** — `infra/migrations/001–018` all written
- **Seed file** — `infra/seeds/dev.sql` (idempotent, `ON CONFLICT DO NOTHING`)
- **Shared auth** — `jwt.plugin.ts`, `rbac.ts`

### In Progress 🔄
- **Phase 2: Auth module** — `refresh.service.ts`, auth routes (register/login/refresh/logout/me/google), authStore frontend

### Pending ⏳
- Phase 2: Auth frontend
- Phase 3: Listings backend + frontend
- Phase 4: Offers & Transactions
- Phase 5: Mortgage Pipeline
- Phase 6: Notifications & Real-time
- Phase 7: Role Dashboards (Agent CRM, Lender, Seller)
- Phase 8: Admin Panel + SEO + Polish
- Phase 9: Tests

---

## Coding Conventions

### Backend
- **All SQL is raw** — no ORM. Use `query(sql, values)` from `config/db.ts`. Use parameterized queries always.
- **Module structure** — each module has: `routes.ts`, `service.ts`, `repo.ts`, `schema.ts` (Zod schemas for request validation)
- **Route registration** — each module exports a Fastify plugin, registered in `app.ts`
- **Error handling** — throw Fastify `createError` with appropriate status codes. Global error handler in `app.ts`.
- **RBAC** — `[app.authenticate, requireRole('agent')]` as `preHandler` array on routes that need auth
- **Service layer** — business logic only, no HTTP. Calls `repo.ts` for DB access.
- **Repo layer** — raw SQL only, returns typed objects. Never leaks DB internals.
- **Events** — emit after DB commit, never before
- **ESM** — all imports must include `.js` extension (TypeScript compiles to ESM)

### Frontend
- **Fetch client** — always use `lib/api.ts` typed client, never raw `fetch`. It handles token refresh automatically.
- **Data fetching** — use React Query hooks from `lib/hooks/`. No direct API calls in components.
- **Auth state** — read from `stores/auth.ts` Zustand store. `useRequireRole` hook for protected routes.
- **Forms** — React Hook Form + Zod resolver. Never uncontrolled inputs for important forms.
- **Images** — always `next/image` with Cloudinary URLs and `blurDataURL` from Cloudinary blur transform
- **Server Components** — use for all pages that need SEO (listings, search). Client Components for interactive UI (map, forms, real-time).
- **Route groups** — `(public)`, `(auth)`, `(buyer)`, `(agent)`, `(lender)`, `(admin)` — each has its own layout
- **Mobile** — bottom tab nav for main pages, vertical MortgageStepper, bottom sheet for search filters

### Shared
- **Types** — define in `packages/shared-types/src/index.ts`, import via `@propnest/shared-types`
- **Naming** — camelCase in TypeScript/JS, snake_case in SQL and DB column names
- **Dates** — always ISO 8601 strings in API responses, `TIMESTAMPTZ` in Postgres

---

## Key File Paths (Quick Reference)

```
packages/shared-types/src/index.ts       ← ALL shared types — edit here, import everywhere
apps/api/src/config/env.ts               ← env validation — add new env vars here first
apps/api/src/app.ts                      ← register all module plugins here
apps/api/src/shared/auth/jwt.plugin.ts   ← JWT verify + app.authenticate decorator
apps/api/src/shared/auth/rbac.ts         ← requireRole() factory
apps/api/src/shared/auth/refresh.service.ts ← refresh token rotation (most security-critical)
apps/api/src/shared/events/event-types.ts   ← discriminated union — all domain events
apps/api/src/shared/queues/queue-registry.ts ← all BullMQ queue instances
apps/api/src/modules/listings/listing.state-machine.ts  ← listing transitions + guards
apps/api/src/modules/mortgage/mortgage.state-machine.ts ← mortgage pipeline, most complex
apps/api/src/modules/mortgage/ocr/ocr.parser.ts         ← Textract → structured fields
apps/web/src/lib/api.ts                  ← typed fetch client with auto-refresh
apps/web/src/lib/stores/auth.ts          ← Zustand auth store (accessToken, user)
apps/web/components/map/MapboxMap.tsx    ← Mapbox GL wrapper — complex, needs early attention
apps/web/components/mortgage/MortgageStepper.tsx ← most visually impressive component
```

---

## Neon MCP Quick Commands

```
# Check schema
mcp__Neon__get_database_tables     projectId=lively-forest-15922545
mcp__Neon__describe_table_schema   projectId=lively-forest-15922545  tableName=listings

# Run query against dev branch
mcp__Neon__run_sql                 projectId=lively-forest-15922545  branchId=br-long-sky-aisre9bc  sql="SELECT ..."

# Compare prod vs dev schema drift
mcp__Neon__compare_database_schema projectId=lively-forest-15922545

# Get dev connection string
mcp__Neon__get_connection_string   projectId=lively-forest-15922545  branchId=br-long-sky-aisre9bc
```

## Fly.io MCP Quick Commands

```
# Check app status
mcp__flyctl__fly-status            app=propnest-api

# View logs
mcp__flyctl__fly-logs              app=propnest-api

# Update a secret
mcp__flyctl__fly-secrets-set       app=propnest-api  keyvalues=["REDIS_URL=rediss://..."]

# List all secrets (values hidden)
mcp__flyctl__fly-secrets-list      app=propnest-api
```
