# Database Schema

PostgreSQL on Neon. 15 tables across 18 migrations.

**Extensions:** `uuid-ossp` (PK generation), `postgis` (geo queries)
**Trigger:** `set_updated_at()` — fires on every UPDATE to keep `updated_at` current

---

## Tables

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `uuid_generate_v4()` |
| email | text UNIQUE | |
| password_hash | text | bcrypt, nullable (OAuth users) |
| role | user_role | buyer / seller / agent / lender / admin |
| first_name | text | |
| last_name | text | |
| phone | text | nullable |
| avatar_url | text | nullable |
| google_id | text | nullable |
| is_active | boolean | default true |
| created_at / updated_at | timestamptz | |

### agents
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | UNIQUE |
| license_number | text UNIQUE | |
| agency_name | text | nullable |
| bio | text | nullable |
| specializations | text[] | |
| service_area_zips | text[] | |
| avatar_url | text | nullable |

### listings
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| agent_id | uuid FK → agents | |
| seller_id | uuid FK → users | nullable |
| status | listing_status | draft / active / pending / sold / withdrawn |
| property_type | property_type | |
| address_line1 / city / state / zip | text | |
| lat / lng | numeric(9,6) | |
| price | numeric | stored as text in queries for precision |
| beds / baths | numeric | |
| sqft / year_built / lot_size | integer / numeric | nullable |
| description | text | nullable |
| features | text[] | |
| slug | text UNIQUE | `{city}-{address}` kebab-case |
| primary_image_url | text | nullable |
| listed_at | timestamptz | set when status → active |

### listing_images
Stores Cloudinary public IDs and URLs per listing. `sort_order` determines gallery order.

### showings
Buyer-scheduled property visits. Status: requested → confirmed → completed / cancelled.

### offers
Counter-offer chain: `parent_offer_id` self-references the offer being countered. Idempotency enforced via `idempotency_key` UNIQUE constraint.

| Key columns | |
|---|---|
| parent_offer_id | uuid FK → offers (nullable) |
| price | numeric |
| earnest_money | numeric (nullable, inherits from parent) |
| closing_date | date (nullable, inherits from parent) |
| contingencies | jsonb |
| status | offer_status |
| idempotency_key | text UNIQUE |

### transactions
Created when an offer is accepted. Tracks escrow, closing date, final sale price.

### transaction_documents
Documents attached to a transaction (purchase agreement, inspection reports, etc.). Versioned.

### mortgage_applications
One per buyer per transaction. Tracks all financial underwriting data and moves through the mortgage FSM.

### mortgage_documents
Documents uploaded by the buyer for OCR processing via AWS Textract. Stores raw extracted text, confidence scores, and reviewer corrections.

### mortgage_conditions
Conditions that must be satisfied before clear-to-close. Each has a status and an optional resolver.

### saved_searches
Buyer-saved search filters with configurable alert frequency (instant / daily / weekly / never).

### refresh_tokens
Refresh token revocation store. Partial index `WHERE revoked_at IS NULL` for fast lookups.

### notifications
Log of all email and socket push notifications. Read status tracked per user.

### audit_logs
Admin-visible record of sensitive operations (role changes, listing unpublishing, etc.).

---

## Enums

```sql
user_role:          buyer | seller | agent | lender | admin
listing_status:     draft | active | pending | sold | withdrawn
property_type:      single_family | condo | townhouse | multi_family | land | commercial
offer_status:       submitted | countered | accepted | rejected | withdrawn | expired
transaction_status: opened | in_escrow | closing | closed | cancelled
mortgage_stage:     pre_qualification | application_submitted | processing |
                    conditionally_approved | clear_to_close | closed | denied
mortgage_doc_type:  pay_stub | tax_return | bank_statement | w2 | employment_letter | other
extraction_status:  pending | processing | completed | failed
showing_status:     requested | confirmed | completed | cancelled
alert_frequency:    instant | daily | weekly | never
```

---

## Migrations

Run with `pnpm --filter @propnest/api db:migrate`. Each file is idempotent.

```
001_extensions.sql
002_enums.sql
003_updated_at_trigger.sql
004_users.sql
005_agents.sql
006_listings.sql
007_listing_images.sql
008_showings.sql
009_offers.sql
010_transactions.sql
011_transaction_documents.sql
012_mortgage_applications.sql
013_mortgage_documents.sql
014_mortgage_conditions.sql
015_saved_searches.sql
016_refresh_tokens.sql
017_notifications.sql
018_audit_logs.sql
```
