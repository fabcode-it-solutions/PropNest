// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'buyer' | 'seller' | 'agent' | 'lender' | 'admin'

export type ListingStatus = 'draft' | 'active' | 'pending' | 'sold' | 'withdrawn'

export type PropertyType =
  | 'single_family'
  | 'condo'
  | 'townhouse'
  | 'multi_family'
  | 'land'
  | 'commercial'

export type OfferStatus =
  | 'submitted'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'

export type TransactionStatus = 'opened' | 'in_escrow' | 'closing' | 'closed' | 'cancelled'

export type TransactionDocCategory =
  | 'purchase_agreement'
  | 'inspection_report'
  | 'appraisal'
  | 'title_report'
  | 'disclosure'
  | 'other'

export type MortgageStage =
  | 'pre_qualification'
  | 'document_collection'
  | 'document_verification'
  | 'underwriting_review'
  | 'conditional_approval'
  | 'final_approval'
  | 'closed'
  | 'denied'

export type MortgageDocType =
  | 'w2'
  | 'pay_stub'
  | 'tax_return'
  | 'bank_statement'
  | 'employment_letter'
  | 'other'

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type MortgageConditionStatus = 'open' | 'satisfied' | 'waived'

export type ShowingStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled'

export type AlertFrequency = 'immediate' | 'daily_digest' | 'off'

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  role: UserRole
  firstName: string
  lastName: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Agent {
  id: string
  userId: string
  licenseNumber: string
  agencyName: string
  bio: string | null
  specializations: string[]
  serviceAreaZips: string[]
}

export interface Listing {
  id: string
  agentId: string
  sellerId: string
  status: ListingStatus
  propertyType: PropertyType
  addressLine1: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  yearBuilt: number | null
  description: string | null
  features: Record<string, unknown>
  slug: string
  hoaMonthly: number | null
  primaryImageUrl: string | null
  listedAt: string | null
  pendingAt: string | null
  soldAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ListingImage {
  id: string
  listingId: string
  cloudinaryPublicId: string
  url: string
  width: number
  height: number
  sortOrder: number
  isPrimary: boolean
  uploadedAt: string
}

export interface Showing {
  id: string
  listingId: string
  buyerId: string
  agentId: string
  status: ShowingStatus
  scheduledAt: string
  durationMinutes: number
  notes: string | null
  confirmedAt: string | null
  cancelledAt: string | null
  createdAt: string
}

export interface Offer {
  id: string
  listingId: string
  buyerId: string
  agentId: string | null
  parentOfferId: string | null
  price: number
  status: OfferStatus
  financingContingency: boolean
  inspectionContingency: boolean
  appraisalContingency: boolean
  closingDate: string
  earnestMoney: number
  message: string | null
  expiryAt: string | null
  idempotencyKey: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  listingId: string
  offerId: string
  buyerId: string
  sellerId: string
  agentId: string
  status: TransactionStatus
  closingDate: string | null
  salePrice: number
  escrowCompany: string | null
  closedAt: string | null
  cancelledAt: string | null
  createdAt: string
}

export interface TransactionDocument {
  id: string
  transactionId: string
  uploaderId: string
  category: TransactionDocCategory
  s3Key: string
  filename: string
  sizeBytes: number
  mimeType: string
  version: number
  isCurrentVersion: boolean
  downloadCount: number
  uploadedAt: string
}

export interface MortgageApplication {
  id: string
  buyerId: string
  transactionId: string | null
  lenderId: string | null
  stage: MortgageStage
  loanType: string
  loanAmount: number
  propertyValue: number
  ltv: number
  creditScore: number | null
  annualIncome: number | null
  monthlyIncome: number | null
  monthlyDebt: number | null
  preApprovalLetterS3Key: string | null
  preApprovalAmount: number | null
  denialReason: string | null
  createdAt: string
  updatedAt: string
}

export interface MortgageDocument {
  id: string
  applicationId: string
  uploaderId: string
  docType: MortgageDocType
  s3Key: string
  filename: string
  sizeBytes: number
  textractJobId: string | null
  extractionStatus: ExtractionStatus
  extractedData: Record<string, unknown> | null
  confidenceScores: Record<string, number> | null
  reviewed: boolean
  reviewerId: string | null
  reviewerCorrections: Record<string, unknown> | null
  uploadedAt: string
}

export interface MortgageCondition {
  id: string
  applicationId: string
  description: string
  status: MortgageConditionStatus
  createdById: string
  resolvedById: string | null
  resolvedAt: string | null
  createdAt: string
}

export interface SavedSearch {
  id: string
  buyerId: string
  name: string
  filters: Record<string, unknown>
  alertFrequency: AlertFrequency
  isActive: boolean
  lastMatchedAt: string | null
  lastAlertedAt: string | null
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  readAt: string | null
  payload: Record<string, unknown>
  emailSentAt: string | null
  createdAt: string
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  statusCode: number
  error: string
  message: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends AuthTokens {
  user: User
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface GeoFilter {
  type: 'radius' | 'bbox' | 'polygon'
  /** radius: [lng, lat, radiusKm] */
  center?: [number, number]
  radiusKm?: number
  /** bbox: [minLng, minLat, maxLng, maxLat] */
  bbox?: [number, number, number, number]
  /** polygon: array of [lng, lat] points */
  polygon?: [number, number][]
}

export interface SearchFilters {
  q?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  minBathrooms?: number
  propertyTypes?: PropertyType[]
  features?: string[]
  geo?: GeoFilter
}

export interface SearchListingsRequest {
  filters: SearchFilters
  page?: number
  pageSize?: number
  sortBy?: 'price_asc' | 'price_desc' | 'listed_at_desc' | 'relevance'
}

export interface ListingSearchResult extends Listing {
  _score?: number
  distanceKm?: number
}
