# API Reference

Base URL: `https://propnest-api.fly.dev`

All protected routes require `Authorization: Bearer <accessToken>`. Role requirements are noted per endpoint.

---

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account (role in body: buyer/agent/admin) |
| POST | `/auth/login` | — | Email + password login |
| POST | `/auth/refresh` | — | Rotate access token using refresh token |
| POST | `/auth/logout` | ✓ | Revoke current session |
| GET | `/auth/me` | ✓ | Current user profile |
| GET | `/auth/google` | — | Redirect to Google OAuth (buyers only) |
| GET | `/auth/callback` | — | OAuth callback, returns `?accessToken=...` |

---

## Listings

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/listings` | — | Search listings (filters below) |
| GET | `/listings/featured` | — | 3 most recent active listings |
| GET | `/listings/:id` | — | Listing detail by ID |
| GET | `/listings/slug/:slug` | — | Listing detail by slug (SSR) |
| POST | `/listings` | agent | Create listing |
| PATCH | `/listings/:id` | agent/admin | Update listing |
| POST | `/listings/:id/status` | agent/admin | Transition listing status |
| POST | `/listings/:id/images/signature` | agent | Get Cloudinary upload signature |
| POST | `/listings/:id/images/confirm` | agent | Confirm image upload |
| DELETE | `/listings/:id/images/:imgId` | agent | Remove image |

**GET /listings query params:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Full-text search |
| `propertyType` | enum | single_family, condo, townhouse, multi_family, land, commercial |
| `minPrice` / `maxPrice` | number | Price range |
| `minBeds` | number | Minimum bedrooms |
| `lat` / `lng` / `radius` | number | Geo radius search (km) |
| `page` / `pageSize` | number | Pagination |

---

## Offers

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/offers` | ✓ | Current user's offers |
| GET | `/listings/:id/offers` | agent | All offers on a listing |
| POST | `/listings/:id/offers` | buyer | Submit offer |
| POST | `/offers/:id/accept` | buyer/agent | Accept offer |
| POST | `/offers/:id/reject` | buyer/agent | Reject offer |
| POST | `/offers/:id/counter` | buyer/agent | Counter offer |

**POST /listings/:id/offers body:**
```json
{
  "price": 950000,
  "earnestMoney": 19000,
  "closingDate": "2025-06-01",
  "contingencies": { "inspection": true, "financing": true, "appraisal": false },
  "expiryAt": "2025-04-10T23:59:00Z",
  "idempotencyKey": "<uuid>"
}
```

**POST /offers/:id/counter body:** same shape — `closingDate` and `earnestMoney` are optional (inherited from parent).

---

## Showings

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/showings` | ✓ | Current user's showings |
| POST | `/listings/:id/showings` | buyer | Schedule showing |
| PATCH | `/showings/:id` | ✓ | Confirm or cancel (`{ action: 'confirm' | 'cancel' }`) |

---

## Transactions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/transactions` | ✓ | Current user's transactions |
| GET | `/transactions/:id` | ✓ | Transaction detail |

---

## Mortgage

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/mortgage/applications` | buyer | List applications |
| POST | `/mortgage/applications` | buyer | Start application |
| PATCH | `/mortgage/applications/:id` | buyer/agent | Advance stage (`{ action: 'submit' | 'process' | ... }`) |
| POST | `/mortgage/applications/:id/documents` | buyer | Upload document (returns presigned PUT URL) |
| PATCH | `/mortgage/applications/:id/documents/:docId` | agent | Approve document with corrections |
| GET | `/mortgage/applications/:id/documents/:docId` | ✓ | Get presigned GET URL |

---

## Search

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search` | — | Elasticsearch-backed listing search |
| GET | `/search/suggest` | — | Autocomplete on city and address |

---

## Agents

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/agents` | — | List all licensed agents |
| GET | `/agents/:id` | — | Agent profile + active listings |

---

## CRM

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/crm/overview` | agent | Deals by stage + today's showings + offers needing response |

---

## Saved Searches

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/saved-searches` | buyer | List saved searches |
| POST | `/saved-searches` | buyer | Save current filters |
| DELETE | `/saved-searches/:id` | buyer | Remove saved search |

---

## Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/stats` | admin | Platform totals (users, listings, offers, revenue) |
| GET | `/admin/queues` | admin | BullMQ queue health |
| POST | `/admin/queues/:q/retry-failed` | admin | Retry all failed jobs in queue |
| GET | `/admin/users` | admin | Paginated user list |

---

## Error Format

All errors return:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Listing not found"
}
```

## Pagination Format

Paginated endpoints return:

```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```
