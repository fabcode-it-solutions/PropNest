Real Estate Listing & Mortgage Pipeline — Complete Project Specification

Executive Summary
A full-stack real estate platform that covers the entire property transaction lifecycle — from browsing listings on an interactive map, to submitting an offer, to completing a mortgage application with document verification. Three distinct but interconnected domains: property discovery, transaction management, and mortgage underwriting.
The complexity that makes this portfolio-worthy is that each domain has its own data model, its own workflow logic, its own async processing needs, and they all have to talk to each other coherently.

System Domains
Domain 1 — Listing Platform
Buyers search and discover properties. Agents manage their listings. The core challenge here is geospatial search at scale combined with real-time status changes (a listing goes from Active to Pending the moment an offer is accepted, and every saved search subscriber needs to know).
Domain 2 — Transaction Layer
Once a buyer is interested, they submit an offer, negotiate, sign documents, and coordinate with their agent. This is a document-heavy, multi-party workflow with clear state transitions and audit requirements.
Domain 3 — Mortgage Pipeline
The most technically rich domain. A buyer applies for pre-qualification or full mortgage approval. The system collects financial documents, runs OCR to extract data, routes the application through an underwriting state machine, and coordinates with a lender user role.

User Roles & Permissions
Buyer — searches listings, saves searches, books showings, submits offers, applies for mortgage, uploads financial documents, tracks application status.
Seller — creates a listing (or delegates to agent), reviews incoming offers, accepts or counters, tracks transaction progress.
Agent — manages listings on behalf of sellers, coordinates showings, communicates with buyers, has access to a full CRM-style dashboard of their active deals.
Lender — receives mortgage applications routed to them, reviews extracted document data, updates underwriting stages, issues pre-approval letters.
Admin — platform oversight, user management, MLS data ingestion control, fraud flags.

Tech Stack
Backend

Runtime: Node.js with TypeScript — strong typing is essential given the complexity of mortgage application state and document schemas
Framework: Fastify — significantly faster than Express, has first-class JSON schema validation via AJV, and plugin architecture suits domain separation well
Architecture: Modular monolith — four modules (listings, transactions, mortgage, notifications) with strict internal API boundaries. Easier to deploy and demo than microservices, but structured so any module could be extracted later

Databases

Primary DB: PostgreSQL — relational integrity matters enormously here. Offers reference listings, mortgage applications reference users and transactions, nothing should be orphaned
Geospatial extension: PostGIS — enables native radius searches, bounding box queries, and neighborhood polygon containment. This is what makes "show me everything within 5km" fast and correct
Search engine: Elasticsearch — handles the full listing search experience with compound filters (price range + bedrooms + property type + geo distance + features), which PostgreSQL full-text search handles poorly at scale
Cache & queue broker: Redis — used for two separate purposes: caching hot listing data and powering the BullMQ job queue

File & Document Storage

AWS S3 — all user-uploaded documents (pay stubs, tax returns, bank statements) and listing photos live here. Never store binary files in the database
AWS Textract — managed OCR service that extracts structured data from financial documents. Feeds into the mortgage pipeline automatically

Background Jobs (BullMQ + Redis)
This is where a lot of the interesting work happens asynchronously:

Image optimization and resizing after listing photo upload
Elasticsearch index sync when a listing changes
Saved search matching — when a new listing goes active, find all saved searches it matches and trigger alerts
Mortgage document OCR processing — upload triggers a job, Textract runs, extracted fields populate the application
Appointment reminder emails (24h and 1h before showing)
Pre-approval letter PDF generation

Authentication & Authorization

JWT access tokens with short expiry (15 minutes)
Refresh token rotation stored in Redis with a session ID, invalidated on logout or suspicious activity
Role-based access control (RBAC) — enforced at the route level via middleware. A buyer cannot access lender routes. An agent can only modify their own listings
OAuth2 optional integration with Google for buyers (lower friction onboarding)

Frontend

Next.js — server-side rendering for listing pages is critical for SEO. A property page at /listings/123-maple-street should be fully crawlable
Mapbox GL JS — interactive map with clustering for dense areas, custom markers by listing status, draw-to-search (user draws a polygon on the map to define their search area)
React Query (TanStack Query) — server state management, cache invalidation on mutation, optimistic updates for saves and favorites
Zustand — lightweight client state for search filters, map viewport, auth session

Infrastructure

Docker — every service containerized. Docker Compose for local development with all dependencies (Postgres, Redis, Elasticsearch) running locally
GitHub Actions — CI pipeline: lint → type-check → unit tests → integration tests → build Docker image → push to registry → deploy
AWS ECS (Fargate) or Railway — container hosting without managing EC2 instances
AWS RDS — managed PostgreSQL in production with automated backups and read replica
AWS ElastiCache — managed Redis in production
CloudFront — CDN in front of S3 for listing images and documents

Observability

Pino — structured JSON logging built into Fastify. Every request logs user ID, role, duration, and status
OpenTelemetry — distributed tracing so you can follow a mortgage application submission across the job queue and OCR pipeline
Grafana + Prometheus — dashboards for API latency, job queue depth, Elasticsearch query times
Sentry — error tracking in both backend and frontend with source maps

Email & Notifications

Resend — transactional email (offer notifications, application status changes, showing confirmations)
WebSockets — real-time in-app notifications when an offer is countered or a mortgage stage changes. Socket.io integrated into the Fastify server


Core Features Breakdown
Listing Management
Agents create listings with a multi-step form: address (geocoded via Mapbox), property details, pricing, photo uploads, and feature tags. Photos are uploaded directly to S3 via presigned URLs (the backend never touches the binary), then a background job resizes them to multiple dimensions and syncs the listing to Elasticsearch. Listing status follows a strict state machine: Draft → Active → Pending (offer accepted) → Sold or back to Active (deal fell through).
Property Search
The search experience is the heart of the listing platform. Buyers can search via text (address, neighborhood, city), map viewport, radius around a point, or a hand-drawn polygon. Filters include price range, bedrooms, bathrooms, square footage, property type, year built, and feature tags. Results are served from Elasticsearch with PostGIS used for the more precise geo operations. Listing cards show primary photo, price, key stats, and days on market.
Saved Searches & Alerts
Buyers can save any search with a name and opt into email alerts. A background job runs periodically (and also triggers on new listing activation) to match new listings against all saved searches. Matches are batched into a daily digest email or sent immediately depending on user preference.
Showings & Availability
Agents set their availability windows. Buyers request a showing slot. The system prevents double-booking using a simple calendar conflict check. Confirmation emails go to both parties. Reminder jobs fire 24h and 1h before the showing.
Offer System
Buyers (through their agent or directly) submit offers on active listings. An offer includes price, financing contingency, inspection contingency, closing date preference, and an earnest money amount. The seller can accept, reject, or counter. Counters create a new offer record linked to the original, preserving the full negotiation history. Acceptance triggers a status change on the listing (Active → Pending) and kicks off the transaction workflow.
Document Vault
Every transaction has a secure document vault. Documents are categorized: purchase agreement, inspection report, appraisal, title report. All uploads go to S3 with server-side encryption. Access is strictly role-scoped — only parties to that specific transaction can retrieve documents. Every download is logged for audit purposes.
Mortgage Application State Machine
This is the most architecturally interesting part of the project. A mortgage application moves through these stages:
Pre-qualification → Document Collection → Document Verification → Underwriting Review → Conditional Approval → Final Approval → Closed
Each stage transition is explicit and logged. Lenders can add conditions at the Conditional Approval stage (e.g., "provide 2 additional months of bank statements"). The system tracks which conditions are satisfied and blocks progression until they are. Buyers see a visual pipeline showing exactly where their application is and what's needed from them.
Document OCR Pipeline
When a buyer uploads a financial document (W-2, pay stub, tax return, bank statement), a BullMQ job triggers AWS Textract. Textract returns structured key-value pairs and tables. A parsing layer interprets the document type and maps extracted fields to the application schema (annual income from W-2, monthly income from pay stub, account balance from bank statement). Lenders see both the raw document and the extracted data side by side, and can correct any extraction errors. Extraction confidence scores are shown so lenders know where to scrutinize.
Pre-Approval Letter Generation
Once an application reaches Conditional or Final Approval, a lender can generate a pre-approval letter as a PDF. The letter is generated server-side using a template, signed with the lender's credentials, stored in S3, and made available to the buyer to share with listing agents.
Agent CRM Dashboard
Agents see a pipeline view of all their active deals, grouped by stage. They can see which offers are outstanding, which transactions need document uploads, which mortgage applications are blocking a deal from closing. Designed to surface the most urgent actions.

API Design
The API follows REST conventions with a consistent envelope structure. All responses include a data field and an optional meta field for pagination. Errors follow RFC 7807 (Problem Details for HTTP APIs) with a type, title, status, and detail.
Key resource groups:

/auth — register, login, refresh, logout
/listings — CRUD, search, status transitions
/listings/:id/images — presigned upload URLs, reorder, delete
/showings — request, confirm, cancel
/offers — submit, counter, accept, reject
/transactions/:id/documents — upload, download, list
/mortgage/applications — create, get status, list
/mortgage/applications/:id/documents — upload financial docs
/mortgage/applications/:id/stages — advance stage (lender only)
/saved-searches — create, update alert preferences, delete
/agents/:id/profile — public agent profile and listings
/admin/* — platform management (admin only)

All mutating endpoints are idempotent where appropriate. Offer submission, for example, uses a client-generated idempotency key to prevent double submission on network retry.

Key Engineering Challenges
Geospatial search performance — keeping Elasticsearch and PostGIS in sync, and deciding which engine handles which query type. Elasticsearch handles the fuzzy/compound search, PostGIS handles precision geo operations like neighborhood polygon containment.
Listing status consistency — when an offer is accepted, the listing goes Pending, all other pending offers get notified, and the Elasticsearch index updates. This sequence needs to be transactional or at minimum idempotent with retry logic.
OCR reliability — Textract isn't perfect. The pipeline needs confidence thresholds, fallback handling for low-confidence extractions, and a clean UI for lenders to correct mistakes without invalidating the whole document.
Document access security — presigned S3 URLs expire quickly. The system never exposes raw S3 keys to clients. All document access goes through the API which validates role and transaction membership before issuing a short-lived presigned URL.
Mortgage state machine integrity — stage transitions need to be validated server-side, never trusted from the client. Moving from Underwriting Review to Conditional Approval requires all required documents to be present and verified. This logic lives in a dedicated state machine class, not scattered across route handlers.

What This Demonstrates to Reviewers

Domain modeling — three distinct domains with clean separation and well-thought-out relational schema
Geospatial engineering — PostGIS + Elasticsearch working together, not just a Google Maps embed
Async processing — OCR pipeline, search indexing, notifications, all properly queued with retry and failure handling
State machines — mortgage pipeline is a textbook example of a real-world multi-stage workflow
Security thinking — document access control, role enforcement, JWT rotation, S3 access patterns
Observability — structured logging, tracing across async jobs, dashboards
Production infrastructure — not just "it runs on my laptop" but a real deployment pipeline