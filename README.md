![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat&logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?style=flat&logo=elasticsearch&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat&logo=amazonaws&logoColor=white)
![Fly.io](https://img.shields.io/badge/Fly.io-8B5CF6?style=flat&logoColor=white)

# PropNest

Real estate listing and mortgage pipeline platform. Search properties, schedule showings, negotiate offers, and track mortgage applications — end to end.

---

![PropNest screenshot](./image.png)

---

## Features

**Buyers**
- Full-text and geo-radius property search (Elasticsearch)
- Schedule and manage showings
- Submit offers with a 3-step modal — price, contingencies, review
- Counter-offer chain with earnest money and closing date negotiation
- Mortgage application pipeline with document upload and OCR parsing

**Agents**
- Create and publish listings with Cloudinary image uploads
- CRM dashboard: Kanban board across deal stages, today's showings, pending offers
- Real-time offer negotiation via Socket.io

**Admin**
- Platform stats, BullMQ queue health monitoring, user management

---

## Architecture

```mermaid
graph TB
  subgraph "Vercel"
    Web["Next.js 15\nApp Router"]
  end

  subgraph "Fly.io"
    API["Fastify API\n(REST + WebSocket)"]
    Workers["BullMQ Workers\n× 5"]
    Redis[("Redis")]
  end

  subgraph "Neon"
    DB[("PostgreSQL\n15 tables")]
  end

  subgraph "AWS"
    S3[("S3\nImages & Docs")]
    Textract["Textract OCR"]
  end

  ES[("Elasticsearch\nListings index")]

  Web -->|"REST / Socket.io"| API
  API --> DB
  API --> Redis
  API --> ES
  API -->|"Presigned URLs"| S3
  Workers --> DB
  Workers --> ES
  Workers --> Textract
  Workers --> Redis
```

---

## Offer Negotiation Flow

```mermaid
sequenceDiagram
  participant Buyer
  participant API
  participant Agent

  Buyer->>API: POST /listings/:id/offers
  API-->>Agent: offer.submitted (Socket + email)

  Agent->>API: POST /offers/:id/counter
  API-->>Buyer: offer.countered (Socket + email)

  Buyer->>API: POST /offers/:id/accept
  API-->>Agent: offer.accepted (Socket + email)
  API->>API: Create transaction record
```

---

## Mortgage Pipeline

```mermaid
stateDiagram-v2
  [*] --> pre_qualification
  pre_qualification --> application_submitted
  application_submitted --> processing
  processing --> conditionally_approved
  processing --> denied
  conditionally_approved --> clear_to_close
  clear_to_close --> closed
  closed --> [*]
  denied --> [*]
```

---

## Monorepo Structure

```
propnest/
├── apps/
│   ├── api/          # Fastify backend — raw SQL, BullMQ, Socket.io
│   └── web/          # Next.js 15 — React Query, Zustand, Mapbox
├── packages/
│   └── shared-types/ # Shared TypeScript interfaces
└── docs/             # Architecture and API reference
```

---

## Getting Started

**Prerequisites:** Node 20+, pnpm 9+, Docker (for Elasticsearch)

```bash
# Install
git clone https://github.com/StephaneWamba/propnest.git
cd propnest && pnpm install

# Start Elasticsearch locally
docker compose up -d

# Copy env files and fill in values
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# Run database migrations
pnpm --filter @propnest/api db:migrate

# Start development servers
pnpm dev
# → API on http://localhost:3000
# → Web on http://localhost:3001
```

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `REDIS_URL` | Redis (BullMQ + idempotency) |
| `ELASTICSEARCH_URL` | Elasticsearch endpoint |
| `JWT_ACCESS_SECRET` | 32+ char access token secret |
| `JWT_REFRESH_SECRET` | 32+ char refresh token secret |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | S3 + Textract |
| `S3_BUCKET` | Bucket for documents and images |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Listing images |
| `RESEND_API_KEY` | Transactional email |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth2 |

See `apps/api/.env.example` for the full list.

### Web (`apps/web/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL map |

---

## Deployment

**API → Fly.io**
```bash
flyctl deploy --config apps/api/fly.toml --remote-only
```

**Web → Vercel**
```bash
npx vercel --prod --yes
```

**Database migrations** are run manually against Neon branches. Dev branch is pre-seeded with 20 Bay Area listings, agents, and a 5-round offer counter chain.

---

## Docs

- [Architecture](./docs/architecture.md) — services, data flow, state machines
- [API Reference](./docs/api-reference.md) — all endpoints with request/response shapes
- [Database Schema](./docs/database.md) — table definitions, indexes, relationships

---

## License

MIT
