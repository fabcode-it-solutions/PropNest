'use client'

import React, { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  LayoutDashboard, FileText,
  Upload, CheckCircle2, XCircle, Clock,
  AlertCircle, ChevronDown, ChevronUp, Check, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { useRequireRole } from '@/hooks/useRequireRole'
import {
  useMyMortgageApplications,
  useMortgageApplication,
  useCreateMortgageApplication,
  useRequestMortgagePresigned,
  useConfirmMortgageUpload,
} from '@/lib/hooks/useMortgage'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mortgage',  href: '/dashboard/mortgage', icon: FileText },
]

// ── Types ──────────────────────────────────────────────────────────────────────

type MortgageStage =
  | 'pre_qualification'
  | 'document_collection'
  | 'document_verification'
  | 'underwriting_review'
  | 'conditional_approval'
  | 'final_approval'
  | 'closed'
  | 'denied'

type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface OcrField { label: string; value: string; confidence: number }
interface MortgageDoc {
  id: string; docType: string; filename?: string
  extractionStatus: ExtractionStatus; fields: OcrField[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDoc(d: any): MortgageDoc {
  const extractedData = d.extracted_data ?? d.extractedData ?? null
  const confidenceScores = d.confidence_scores ?? d.confidenceScores ?? null
  const fields: OcrField[] = extractedData
    ? Object.entries(extractedData as Record<string, unknown>).map(([key, value]) => ({
        label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
        value: String(value),
        confidence: confidenceScores ? Math.round(Number(confidenceScores[key] ?? 0)) : 0,
      }))
    : []
  return {
    id: d.id,
    docType: d.doc_type ?? d.docType,
    filename: d.filename,
    extractionStatus: d.extraction_status ?? d.extractionStatus ?? 'pending',
    fields,
  }
}

const STAGES: { key: MortgageStage; label: string; short: string }[] = [
  { key: 'pre_qualification',    label: 'Pre-Qualification',    short: 'Pre-Qual' },
  { key: 'document_collection',  label: 'Document Collection',  short: 'Docs' },
  { key: 'document_verification',label: 'Verification',         short: 'Verify' },
  { key: 'underwriting_review',  label: 'Underwriting',         short: 'Underwriting' },
  { key: 'conditional_approval', label: 'Conditional Approval', short: 'Conditional' },
  { key: 'final_approval',       label: 'Final Approval',       short: 'Final' },
  { key: 'closed',               label: 'Closed',               short: 'Closed' },
]

const REQUIRED_DOCS = ['w2', 'pay_stub', 'tax_return', 'bank_statement']

const DOC_TYPE_LABELS: Record<string, string> = {
  w2: 'W-2 (last 2 years)',
  pay_stub: 'Recent Pay Stubs',
  tax_return: 'Tax Returns (last 2 years)',
  bank_statement: 'Bank Statements (last 3 months)',
  employment_letter: 'Employment Letter',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MortgageStepper({ currentStage }: { currentStage: MortgageStage }) {
  const isDenied = currentStage === 'denied'
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage)

  return (
    <div className="bg-white rounded-card border border-border p-6">
      {isDenied ? (
        <div className="flex items-center gap-3">
          <XCircle size={20} className="text-[#DC2626]" />
          <div>
            <p className="font-semibold text-[#1A1A1A]">Application Denied</p>
            <p className="text-sm text-muted">Please contact your lender for more information.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden md:flex items-center">
            {STAGES.map((stage, i) => {
              const isCompleted = i < currentIndex
              const isCurrent = i === currentIndex
              return (
                <React.Fragment key={stage.key}>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                      isCompleted && 'bg-navy',
                      isCurrent && 'bg-white border-2 border-gold ring-2 ring-gold/20',
                      !isCompleted && !isCurrent && 'bg-white border-2 border-border',
                    )}>
                      {isCompleted ? (
                        <Check size={14} className="text-white" />
                      ) : isCurrent ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-border" />
                      )}
                    </div>
                    <span className={cn(
                      'text-[10px] font-medium text-center leading-tight max-w-[60px]',
                      isCompleted && 'text-navy',
                      isCurrent && 'text-gold font-semibold',
                      !isCompleted && !isCurrent && 'text-muted',
                    )}>
                      {stage.short}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-2 transition-colors duration-300',
                      i < currentIndex ? 'bg-navy' : 'bg-border',
                    )} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
          <div className="md:hidden space-y-3">
            {STAGES.map((stage, i) => {
              const isCompleted = i < currentIndex
              const isCurrent = i === currentIndex
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                    isCompleted && 'bg-navy',
                    isCurrent && 'border-2 border-gold ring-2 ring-gold/20 bg-white',
                    !isCompleted && !isCurrent && 'border-2 border-border bg-white',
                  )}>
                    {isCompleted ? <Check size={11} className="text-white" /> :
                     isCurrent ? <div className="w-2 h-2 rounded-full bg-gold" /> : null}
                  </div>
                  <span className={cn(
                    'text-sm',
                    isCompleted && 'text-navy font-medium',
                    isCurrent && 'text-gold font-semibold',
                    !isCompleted && !isCurrent && 'text-muted',
                  )}>
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-[#16A34A] bg-green-50'
    : score >= 50 ? 'text-[#D97706] bg-amber-50' : 'text-[#DC2626] bg-red-50'
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', color)}>
      {score}%
    </span>
  )
}

function OcrResultCard({ doc }: { doc: MortgageDoc }) {
  const [expanded, setExpanded] = useState(false)
  if (doc.extractionStatus === 'pending') return (
    <div className="flex items-center gap-2 text-xs text-muted py-2"><Clock size={12} />Queued for extraction</div>
  )
  if (doc.extractionStatus === 'processing') return (
    <div className="flex items-center gap-2 text-xs text-[#0EA5E9] py-2"><Clock size={12} className="animate-spin" />Extracting document data…</div>
  )
  if (doc.extractionStatus === 'failed') return (
    <div className="flex items-center gap-2 text-xs text-[#DC2626] py-2"><XCircle size={12} />Extraction failed — please re-upload</div>
  )
  if (doc.fields.length === 0) return (
    <div className="flex items-center gap-2 text-xs text-muted py-2"><AlertCircle size={12} />No fields extracted</div>
  )
  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-navy hover:text-navy/70 transition-colors font-medium"
      >
        <CheckCircle2 size={12} className="text-[#16A34A]" />
        OCR Complete — {doc.fields.length} fields extracted
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="mt-3 bg-ivory-dark rounded-card border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-white">
                <th className="text-left px-3 py-2 text-label uppercase tracking-widest text-muted font-medium">Field</th>
                <th className="text-left px-3 py-2 text-label uppercase tracking-widest text-muted font-medium">Value</th>
                <th className="text-right px-3 py-2 text-label uppercase tracking-widest text-muted font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {doc.fields.map((field) => (
                <tr key={field.label}>
                  <td className="px-3 py-2 text-muted capitalize">{field.label}</td>
                  <td className="px-3 py-2 font-medium text-[#1A1A1A]">{field.value}</td>
                  <td className="px-3 py-2 text-right"><ConfidenceBadge score={field.confidence} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DocumentDropzone({
  docType, existingDoc, onUpload, isUploading,
}: {
  docType: string
  existingDoc?: MortgageDoc
  onUpload: (docType: string, file: File) => void
  isUploading?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) return
    onUpload(docType, file)
  }

  return (
    <div className="bg-white rounded-card border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-[#1A1A1A]">{DOC_TYPE_LABELS[docType] ?? docType}</p>
          {existingDoc?.filename && (
            <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
              <FileText size={10} />{existingDoc.filename}
            </p>
          )}
        </div>
        {existingDoc && (
          <div className="shrink-0">
            {existingDoc.extractionStatus === 'completed' ? (
              <span className="text-[10px] font-semibold text-[#16A34A] bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} />Uploaded
              </span>
            ) : existingDoc.extractionStatus === 'processing' ? (
              <span className="text-[10px] font-semibold text-[#0EA5E9] bg-sky-50 px-1.5 py-0.5 rounded-full">Processing</span>
            ) : existingDoc.extractionStatus === 'failed' ? (
              <span className="text-[10px] font-semibold text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded-full">Failed</span>
            ) : (
              <span className="text-[10px] font-semibold text-muted bg-border px-1.5 py-0.5 rounded-full">Pending</span>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          'border-2 border-dashed rounded-card p-5 flex flex-col items-center gap-2 transition-colors',
          isUploading ? 'cursor-not-allowed border-border bg-ivory-dark' : 'cursor-pointer',
          !isUploading && dragging ? 'border-navy bg-navy/5' : 'border-border hover:border-navy/40 hover:bg-ivory-dark',
        )}
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!isUploading) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!isUploading) handleFiles(e.dataTransfer.files) }}
      >
        {isUploading ? (
          <>
            <Loader2 size={18} className="text-navy animate-spin" />
            <p className="text-xs text-muted">Uploading & submitting to OCR…</p>
          </>
        ) : (
          <>
            <Upload size={18} className={cn('transition-colors', dragging ? 'text-navy' : 'text-muted')} />
            <p className="text-xs text-muted text-center">
              <span className="font-medium text-[#1A1A1A]">Click to upload</span> or drag & drop
            </p>
            <p className="text-[10px] text-muted">PDF, JPG, PNG — max 10 MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {existingDoc && <OcrResultCard doc={existingDoc} />}
    </div>
  )
}

// ── No-application state ───────────────────────────────────────────────────────

function CreateApplicationForm({ onCreate }: { onCreate: (data: { loanType: string; loanAmount: number; propertyValue: number; creditScore?: number }) => Promise<void> }) {
  const [form, setForm] = useState({ loanType: 'conventional', loanAmount: '', propertyValue: '', creditScore: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.loanAmount || !form.propertyValue) return
    setLoading(true)
    try {
      await onCreate({
        loanType: form.loanType,
        loanAmount: Number(form.loanAmount),
        propertyValue: Number(form.propertyValue),
        creditScore: form.creditScore ? Number(form.creditScore) : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl bg-white rounded-card border border-border p-8">
      <h2 className="font-display font-semibold text-xl text-navy mb-1">Start Your Application</h2>
      <p className="text-sm text-muted mb-6">Fill in the details below to begin your mortgage journey.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-1.5">Loan Type</label>
          <select
            value={form.loanType}
            onChange={(e) => setForm((f) => ({ ...f, loanType: e.target.value }))}
            className="w-full border border-border rounded-subtle px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
          >
            <option value="conventional">Conventional</option>
            <option value="fha">FHA</option>
            <option value="va">VA</option>
            <option value="jumbo">Jumbo</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-1.5">Loan Amount ($)</label>
            <input
              type="number" required min={1}
              value={form.loanAmount}
              onChange={(e) => setForm((f) => ({ ...f, loanAmount: e.target.value }))}
              placeholder="850000"
              className="w-full border border-border rounded-subtle px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-1.5">Property Value ($)</label>
            <input
              type="number" required min={1}
              value={form.propertyValue}
              onChange={(e) => setForm((f) => ({ ...f, propertyValue: e.target.value }))}
              placeholder="1200000"
              className="w-full border border-border rounded-subtle px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-1.5">Credit Score (optional)</label>
          <input
            type="number" min={300} max={850}
            value={form.creditScore}
            onChange={(e) => setForm((f) => ({ ...f, creditScore: e.target.value }))}
            placeholder="720"
            className="w-full border border-border rounded-subtle px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Creating…</> : 'Create Application'}
        </Button>
      </form>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MortgagePage() {
  useRequireRole('buyer', 'admin')
  const qc = useQueryClient()
  const [uploadingDocTypes, setUploadingDocTypes] = useState<Set<string>>(new Set())

  const { data: appsData, isLoading: appsLoading } = useMyMortgageApplications()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const application = (appsData as any)?.data?.[0] ?? (Array.isArray(appsData) ? (appsData as any)[0] : null)
  const appId: string = application?.id ?? ''

  const { data: detail, isLoading: detailLoading } = useMortgageApplication(appId)
  const createApp = useCreateMortgageApplication()
  const requestPresigned = useRequestMortgagePresigned(appId)
  const confirmUpload = useConfirmMortgageUpload(appId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stage = ((application as any)?.stage ?? null) as MortgageStage | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs: MortgageDoc[] = ((detail as any)?.documents ?? []).map(mapDoc)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = (detail as any)?.conditions ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = detail as any

  const uploadedCount = docs.filter((d) => d.extractionStatus !== 'failed').length
  const showDocSection = stage && stage !== 'pre_qualification'
  const showConditions = stage === 'conditional_approval'

  async function handleCreate(data: { loanType: string; loanAmount: number; propertyValue: number; creditScore?: number }) {
    await createApp.mutateAsync(data)
  }

  async function handleUpload(docType: string, file: File) {
    setUploadingDocTypes((prev) => new Set([...prev, docType]))
    try {
      const { uploadUrl, s3Key } = await requestPresigned.mutateAsync({
        docType, filename: file.name, mimeType: file.type,
      })
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      await confirmUpload.mutateAsync({ s3Key, filename: file.name, docType })
      qc.invalidateQueries({ queryKey: ['mortgage', appId] })
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploadingDocTypes((prev) => { const n = new Set(prev); n.delete(docType); return n })
    }
  }

  // Build simple timeline from document uploads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timelineEntries: { date: string; actor: string; event: string; type: string }[] = []
  if (application?.created_at ?? application?.createdAt) {
    timelineEntries.push({
      date: new Date(application.created_at ?? application.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      actor: 'You', event: 'Application created', type: 'created',
    })
  }
  for (const doc of docs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = ((detail as any)?.documents ?? []).find((d: any) => d.id === doc.id)
    const uploadedAt = raw?.uploaded_at ?? raw?.uploadedAt
    if (uploadedAt) {
      timelineEntries.push({
        date: new Date(uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        actor: 'You', event: `Uploaded ${DOC_TYPE_LABELS[doc.docType] ?? doc.docType}`, type: 'upload',
      })
      if (doc.extractionStatus === 'completed') {
        timelineEntries.push({
          date: new Date(uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          actor: 'System', event: `OCR extraction completed for ${DOC_TYPE_LABELS[doc.docType] ?? doc.docType}`, type: 'ocr',
        })
      }
    }
  }

  if (appsLoading || (appId && detailLoading)) {
    return (
      <DashboardLayout navItems={navItems} title="Mortgage Application" subtitle="Buyer Portal">
        <div className="max-w-3xl space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-card border border-border p-6 animate-pulse">
              <div className="h-4 bg-border rounded w-1/3 mb-3" />
              <div className="h-3 bg-border rounded w-2/3" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    )
  }

  if (!application) {
    return (
      <DashboardLayout navItems={navItems} title="Mortgage Application" subtitle="Buyer Portal">
        <div className="max-w-3xl space-y-6">
          <div className="bg-navy-50 border border-navy/20 rounded-card p-5 flex items-start gap-3">
            <AlertCircle size={16} className="text-navy shrink-0 mt-0.5" />
            <p className="text-sm text-navy">
              You don&apos;t have a mortgage application yet. Fill in the form below to get started —
              your lender will review it and guide you through the process.
            </p>
          </div>
          <CreateApplicationForm onCreate={handleCreate} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout navItems={navItems} title="Mortgage Application" subtitle="Buyer Portal">
      <div className="max-w-3xl space-y-6">

        {/* Summary banner */}
        <div className="bg-white rounded-card border border-border p-5 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-label uppercase tracking-widest text-muted text-[11px] mb-1">Loan Amount</p>
            <p className="font-display font-bold text-navy text-2xl">
              ${Number(app?.loan_amount ?? app?.loanAmount ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="w-px h-10 bg-border hidden sm:block" />
          <div>
            <p className="text-label uppercase tracking-widest text-muted text-[11px] mb-1">Property Value</p>
            <p className="font-semibold text-[#1A1A1A]">
              ${Number(app?.property_value ?? app?.propertyValue ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="w-px h-10 bg-border hidden sm:block" />
          <div>
            <p className="text-label uppercase tracking-widest text-muted text-[11px] mb-1">Loan Type</p>
            <p className="font-semibold text-[#1A1A1A] uppercase">{app?.loan_type ?? app?.loanType ?? '—'}</p>
          </div>
          {(app?.credit_score ?? app?.creditScore) && (
            <>
              <div className="w-px h-10 bg-border hidden sm:block" />
              <div>
                <p className="text-label uppercase tracking-widest text-muted text-[11px] mb-1">Credit Score</p>
                <p className="font-semibold text-[#1A1A1A]">{app?.credit_score ?? app?.creditScore}</p>
              </div>
            </>
          )}
        </div>

        {/* Stepper */}
        {stage && <MortgageStepper currentStage={stage} />}

        {/* Stage-specific action banner */}
        {stage === 'pre_qualification' && (
          <div className="bg-navy-50 border border-navy/20 rounded-card p-4 flex items-start gap-3">
            <Clock size={16} className="text-navy shrink-0 mt-0.5" />
            <p className="text-sm text-navy">
              Your application is in pre-qualification. Your lender will review your details and advance it to document collection.
            </p>
          </div>
        )}
        {stage === 'document_collection' && (
          <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Action required: Upload your financial documents</p>
              <p className="text-xs text-muted mt-0.5">
                {REQUIRED_DOCS.length - uploadedCount > 0
                  ? `Your lender is waiting for ${REQUIRED_DOCS.length - uploadedCount} more document${REQUIRED_DOCS.length - uploadedCount !== 1 ? 's' : ''}.`
                  : 'All documents uploaded. Awaiting lender verification.'}
              </p>
            </div>
          </div>
        )}
        {stage === 'document_verification' && (
          <div className="bg-sky-50 border border-sky-200 rounded-card p-4 flex items-start gap-3">
            <Clock size={16} className="text-[#0EA5E9] shrink-0 mt-0.5" />
            <p className="text-sm text-[#0EA5E9]">Your documents are being verified by the lender. No action needed.</p>
          </div>
        )}
        {stage === 'underwriting_review' && (
          <div className="bg-sky-50 border border-sky-200 rounded-card p-4 flex items-start gap-3">
            <Clock size={16} className="text-[#0EA5E9] shrink-0 mt-0.5" />
            <p className="text-sm text-[#0EA5E9]">Your application is under underwriting review. We'll notify you of any updates.</p>
          </div>
        )}
        {stage === 'conditional_approval' && (
          <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
            <p className="text-sm text-[#D97706]">
              Conditionally approved! Please resolve all outstanding conditions below to proceed to final approval.
            </p>
          </div>
        )}
        {stage === 'final_approval' && (
          <div className="bg-green-50 border border-green-200 rounded-card p-4 flex items-start gap-3">
            <CheckCircle2 size={16} className="text-[#16A34A] shrink-0 mt-0.5" />
            <p className="text-sm text-[#16A34A]">
              Congratulations! Your loan is fully approved. Your pre-approval letter will be available shortly.
            </p>
          </div>
        )}
        {stage === 'closed' && (
          <div className="bg-green-50 border border-green-200 rounded-card p-4 flex items-start gap-3">
            <CheckCircle2 size={16} className="text-[#16A34A] shrink-0 mt-0.5" />
            <p className="text-sm text-[#16A34A]">Your loan has been funded and closed. Congratulations on your new home!</p>
          </div>
        )}

        {/* Conditions (conditional approval stage) */}
        {showConditions && conditions.length > 0 && (
          <div className="bg-white rounded-card border border-border p-5">
            <h3 className="font-sans font-semibold text-heading-sm text-[#1A1A1A] mb-4">Outstanding Conditions</h3>
            <div className="space-y-3">
              {conditions.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-card bg-ivory-dark border border-border">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    c.status === 'satisfied' || c.status === 'waived' ? 'bg-[#16A34A]' : 'bg-amber-400',
                  )}>
                    {c.status === 'satisfied' || c.status === 'waived'
                      ? <Check size={10} className="text-white" />
                      : <Clock size={10} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{c.description}</p>
                    <p className="text-xs text-muted mt-0.5 capitalize">{c.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document upload section */}
        {showDocSection && (
          <div className="bg-white rounded-card border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans font-semibold text-heading-sm text-[#1A1A1A]">Required Documents</h3>
              <span className="text-sm text-muted">
                <span className="font-semibold text-navy">{uploadedCount}</span> / {REQUIRED_DOCS.length} uploaded
              </span>
            </div>
            <div className="bg-border rounded-full h-1.5 mb-6">
              <div
                className="bg-navy h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(uploadedCount / REQUIRED_DOCS.length) * 100}%` }}
              />
            </div>
            <div className="space-y-4">
              {REQUIRED_DOCS.map((docType) => (
                <DocumentDropzone
                  key={docType}
                  docType={docType}
                  existingDoc={docs.find((d) => d.docType === docType)}
                  onUpload={handleUpload}
                  isUploading={uploadingDocTypes.has(docType)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {timelineEntries.length > 0 && (
          <div className="bg-white rounded-card border border-border p-5">
            <h3 className="font-sans font-semibold text-heading-sm text-[#1A1A1A] mb-4">Application Timeline</h3>
            <div className="space-y-4">
              {timelineEntries.map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5 shrink-0',
                      entry.type === 'advance' ? 'bg-gold' :
                      entry.type === 'ocr' ? 'bg-[#16A34A]' : 'bg-navy',
                    )} />
                    {i < timelineEntries.length - 1 && <div className="flex-1 w-px bg-border mt-1 mb-0.5" />}
                  </div>
                  <div className="pb-4 last:pb-0">
                    <p className="text-sm font-medium text-[#1A1A1A]">{entry.event}</p>
                    <p className="text-xs text-muted mt-0.5">{entry.actor} · {entry.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
