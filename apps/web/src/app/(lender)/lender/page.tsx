'use client'

import React, { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  LayoutDashboard, FileText, CheckSquare,
  ChevronRight, Clock, AlertCircle, CheckCircle2,
  XCircle, Eye, X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { useRequireRole } from '@/hooks/useRequireRole'
import {
  useMyMortgageApplications,
  useMortgageApplication,
  useAdvanceMortgageStage,
  useApproveDoc,
} from '@/lib/hooks/useMortgage'
import type { MortgageStage, ExtractionStatus, MortgageDocument } from '@propnest/shared-types'

const navItems = [
  { label: 'Applications', href: '/lender', icon: LayoutDashboard },
  { label: 'Documents',    href: '/lender', icon: FileText },
  { label: 'Conditions',   href: '/lender', icon: CheckSquare },
]

// ── Types ──────────────────────────────────────────────────────────────────────

interface OcrField {
  label: string
  value: string
  confidence: number
}

const NEXT_STAGE: Partial<Record<MortgageStage, MortgageStage>> = {
  pre_qualification: 'document_collection',
  document_collection: 'document_verification',
  document_verification: 'underwriting_review',
  underwriting_review: 'conditional_approval',
  conditional_approval: 'final_approval',
  final_approval: 'closed',
}

const STAGE_LABELS: Record<MortgageStage, string> = {
  pre_qualification: 'Pre-Qualification',
  document_collection: 'Doc Collection',
  document_verification: 'Doc Verification',
  underwriting_review: 'Underwriting',
  conditional_approval: 'Conditional Approval',
  final_approval: 'Final Approval',
  closed: 'Closed',
  denied: 'Denied',
}

const STAGE_COLORS: Record<MortgageStage, string> = {
  pre_qualification: 'text-muted bg-border',
  document_collection: 'text-[#D97706] bg-amber-50',
  document_verification: 'text-[#0EA5E9] bg-sky-50',
  underwriting_review: 'text-navy bg-navy/10',
  conditional_approval: 'text-[#D97706] bg-amber-50',
  final_approval: 'text-[#16A34A] bg-green-50',
  closed: 'text-muted bg-border',
  denied: 'text-[#DC2626] bg-red-50',
}

const DOC_TYPE_LABELS: Record<string, string> = {
  w2: 'W-2',
  pay_stub: 'Pay Stub',
  bank_statement: 'Bank Statement',
  tax_return: 'Tax Return',
  employment_letter: 'Employment Letter',
  other: 'Other',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 80) return (
    <span className="text-[10px] font-semibold text-[#16A34A] bg-green-50 px-1.5 py-0.5 rounded-full">
      {score}%
    </span>
  )
  if (score >= 50) return (
    <span className="text-[10px] font-semibold text-[#D97706] bg-amber-50 px-1.5 py-0.5 rounded-full">
      {score}%
    </span>
  )
  return (
    <span className="text-[10px] font-semibold text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded-full">
      {score}%
    </span>
  )
}

function DocStatusIcon({ status }: { status: ExtractionStatus }) {
  if (status === 'completed') return <CheckCircle2 size={14} className="text-[#16A34A]" />
  if (status === 'processing') return <Clock size={14} className="text-[#0EA5E9] animate-spin" />
  if (status === 'failed') return <XCircle size={14} className="text-[#DC2626]" />
  return <Clock size={14} className="text-muted" />
}

function OcrReviewPanel({
  doc,
  onClose,
  onApprove,
}: {
  doc: MortgageDocument
  onClose: () => void
  onApprove: (docId: string) => void
}) {
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const fields: OcrField[] = Object.entries(doc.extractedData ?? {}).map(([label, value]) => ({
    label,
    value: String(value ?? ''),
    confidence: doc.confidenceScores?.[label] ?? 0,
  }))

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-4xl bg-white shadow-modal flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-sans font-semibold text-heading-md text-[#1A1A1A]">
              OCR Review — {doc.filename}
            </h2>
            <p className="text-sm text-muted mt-0.5">
              {DOC_TYPE_LABELS[doc.docType] ?? doc.docType} · Review and correct extracted fields
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-[#1A1A1A] hover:bg-ivory-dark rounded-card transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — two columns */}
        <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-border">
          {/* Left — document preview */}
          <div className="flex flex-col p-6 overflow-auto">
            <p className="text-label uppercase tracking-widest text-muted mb-4">Document Preview</p>
            <div className="flex-1 bg-ivory-dark rounded-card border border-border flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <FileText size={40} className="text-muted mx-auto mb-3" />
                <p className="text-sm text-muted">{doc.filename}</p>
                <p className="text-xs text-muted/70 mt-1">
                  In production: PDF/image viewer
                </p>
              </div>
            </div>
          </div>

          {/* Right — extracted fields */}
          <div className="flex flex-col overflow-auto">
            <div className="px-6 pt-6 pb-4 shrink-0">
              <p className="text-label uppercase tracking-widest text-muted mb-1">Extracted Fields</p>
              <p className="text-xs text-muted">Click any field value to correct it inline.</p>
            </div>

            <div className="flex-1 px-6 pb-6 overflow-auto">
              {fields.length === 0 ? (
                <div className="flex items-center gap-2 py-8 text-muted justify-center">
                  <AlertCircle size={16} />
                  <span className="text-sm">No fields extracted yet</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field) => (
                    <div
                      key={field.label}
                      className="bg-ivory-dark rounded-card border border-border p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-muted uppercase tracking-wide">
                          {field.label}
                        </span>
                        <ConfidenceBadge score={field.confidence} />
                      </div>
                      <input
                        type="text"
                        defaultValue={corrections[field.label] ?? field.value}
                        onChange={(e) => {
                          setCorrections((prev) => ({ ...prev, [field.label]: e.target.value }))
                          setSaved(false)
                        }}
                        className="w-full bg-white border border-border rounded text-sm px-2.5 py-1.5 text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-border shrink-0 flex items-center gap-3">
              {Object.keys(corrections).length > 0 && !saved && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaved(true)}
                >
                  Save corrections
                </Button>
              )}
              {saved && (
                <span className="text-xs text-[#16A34A] flex items-center gap-1">
                  <CheckCircle2 size={13} /> Corrections saved
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onApprove(doc.id)}
                  disabled={doc.reviewed}
                >
                  {doc.reviewed ? 'Approved' : 'Approve Document'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApplicationDetail({
  appId,
  onBack,
}: {
  appId: string
  onBack: () => void
}) {
  const { data: app, isLoading } = useMortgageApplication(appId)
  const advanceStage = useAdvanceMortgageStage(appId)
  const approveDoc = useApproveDoc(appId)
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null)

  if (isLoading || !app) {
    return <div className="py-20 text-center text-muted text-sm">Loading application…</div>
  }

  const documents = app.documents
  const reviewingDoc = reviewingDocId ? documents.find((d) => d.id === reviewingDocId) ?? null : null

  async function handleApprove(docId: string) {
    await approveDoc.mutateAsync(docId)
    setReviewingDocId(null)
  }

  const openConditions = app.conditions.filter((c) => c.status === 'open').length

  return (
    <div className="space-y-6">
      {reviewingDoc && (
        <OcrReviewPanel
          doc={reviewingDoc}
          onClose={() => setReviewingDocId(null)}
          onApprove={handleApprove}
        />
      )}

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-muted hover:text-navy transition-colors flex items-center gap-1"
        >
          ← All applications
        </button>
        <ChevronRight size={14} className="text-border" />
        <span className="text-sm font-medium text-[#1A1A1A]">Application {app.id.slice(-6)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left — documents */}
        <div className="space-y-4">
          <div className="bg-white rounded-card border border-border p-5">
            <h3 className="font-sans font-semibold text-heading-sm text-[#1A1A1A] mb-4">
              Documents
            </h3>

            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-card bg-ivory-dark border border-border hover:border-navy/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded bg-white border border-border flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-navy" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{doc.filename}</p>
                    <p className="text-xs text-muted">
                      {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <DocStatusIcon status={doc.extractionStatus} />
                      <span className="capitalize">{doc.extractionStatus}</span>
                    </div>

                    {doc.reviewed && (
                      <span className="text-[10px] font-semibold text-[#16A34A] bg-green-50 px-1.5 py-0.5 rounded-full">
                        Approved
                      </span>
                    )}

                    {doc.extractionStatus === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewingDocId(doc.id)}
                        className="text-xs"
                      >
                        <Eye size={12} className="mr-1" />
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conditions */}
          {app.conditions.length > 0 && (
            <div className="bg-white rounded-card border border-border p-5">
              <h3 className="font-sans font-semibold text-heading-sm text-[#1A1A1A] mb-4">
                Conditions
                {openConditions > 0 && (
                  <span className="ml-2 text-[10px] font-semibold text-[#D97706] bg-amber-50 px-1.5 py-0.5 rounded-full">
                    {openConditions} open
                  </span>
                )}
              </h3>

              <div className="space-y-2">
                {app.conditions.map((cond) => (
                  <div
                    key={cond.id}
                    className="flex items-center gap-3 py-2.5 border-b border-border/60 last:border-0"
                  >
                    {cond.status === 'satisfied' ? (
                      <CheckCircle2 size={15} className="text-[#16A34A] shrink-0" />
                    ) : cond.status === 'waived' ? (
                      <CheckCircle2 size={15} className="text-muted shrink-0" />
                    ) : (
                      <AlertCircle size={15} className="text-[#D97706] shrink-0" />
                    )}
                    <span className={cn(
                      'text-sm flex-1',
                      cond.status !== 'open' && 'line-through text-muted'
                    )}>
                      {cond.description}
                    </span>
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize',
                      cond.status === 'satisfied' && 'text-[#16A34A] bg-green-50',
                      cond.status === 'waived' && 'text-muted bg-border',
                      cond.status === 'open' && 'text-[#D97706] bg-amber-50',
                    )}>
                      {cond.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — summary + stage controls */}
        <div className="space-y-4">
          {/* Application summary */}
          <div className="bg-white rounded-card border border-border p-5">
            <h3 className="font-sans font-semibold text-heading-sm text-[#1A1A1A] mb-4">
              Application Summary
            </h3>

            <div className="space-y-3">
              {[
                { label: 'Applicant ID', value: app.buyerId.slice(-8) },
                { label: 'Loan Type', value: app.loanType.toUpperCase() },
                { label: 'Loan Amount', value: `$${app.loanAmount.toLocaleString()}` },
                { label: 'Property Value', value: `$${app.propertyValue.toLocaleString()}` },
                { label: 'LTV', value: `${(Number(app.ltv) * 100).toFixed(1)}%` },
                { label: 'Credit Score', value: app.creditScore?.toString() ?? '—' },
                { label: 'Annual Income', value: app.annualIncome ? `$${app.annualIncome.toLocaleString()}` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between py-1 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-xs font-medium text-[#1A1A1A]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stage controls */}
          <div className="bg-white rounded-card border border-border p-5">
            <h3 className="font-sans font-semibold text-heading-sm text-[#1A1A1A] mb-3">
              Stage Controls
            </h3>
            <div className="mb-4">
              <span className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-pill',
                STAGE_COLORS[app.stage]
              )}>
                {STAGE_LABELS[app.stage]}
              </span>
            </div>

            <div className="space-y-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                disabled={!NEXT_STAGE[app.stage] || advanceStage.isPending}
                onClick={() => {
                  const next = NEXT_STAGE[app.stage]
                  if (next) advanceStage.mutate(next)
                }}
              >
                {advanceStage.isPending ? 'Advancing…' : 'Advance to Next Stage'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={advanceStage.isPending}
                onClick={() => advanceStage.mutate('document_collection')}
              >
                Request More Documents
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={advanceStage.isPending}
                onClick={() => advanceStage.mutate('denied')}
              >
                Deny Application
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LenderPage() {
  useRequireRole('lender', 'admin')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<MortgageStage | 'all'>('all')

  const { data: applicationsData } = useMyMortgageApplications()
  const applications = applicationsData?.data ?? []

  const filtered = stageFilter === 'all'
    ? applications
    : applications.filter((a) => a.stage === stageFilter)

  return (
    <DashboardLayout navItems={navItems} title="Lender Portal" subtitle="Mortgage Review">
      {selectedAppId ? (
        <ApplicationDetail appId={selectedAppId} onBack={() => setSelectedAppId(null)} />
      ) : (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Active Applications', value: applications.length, color: 'bg-navy' },
              { label: 'Pending Review', value: applications.filter(a => a.stage === 'document_verification').length, color: 'bg-[#D97706]' },
              { label: 'Underwriting', value: applications.filter(a => a.stage === 'underwriting_review').length, color: 'bg-[#0EA5E9]' },
              { label: 'Final Approved', value: applications.filter(a => a.stage === 'final_approval').length, color: 'bg-[#16A34A]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-card border border-border p-4 flex items-center gap-4">
                <div className={cn('w-2 self-stretch rounded-full shrink-0', color)} />
                <div>
                  <p className="text-2xl font-semibold text-[#1A1A1A]">{value}</p>
                  <p className="text-xs text-muted mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'document_collection', 'document_verification', 'underwriting_review', 'conditional_approval'] as const).map((stage) => (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={cn(
                  'px-3 py-1.5 rounded-pill text-xs font-medium transition-colors',
                  stageFilter === stage
                    ? 'bg-navy text-white'
                    : 'bg-white border border-border text-muted hover:text-[#1A1A1A]'
                )}
              >
                {stage === 'all' ? 'All' : STAGE_LABELS[stage]}
              </button>
            ))}
          </div>

          {/* Applications table */}
          <div className="bg-white rounded-card border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-ivory-dark">
                  <th className="text-left px-5 py-3 text-label uppercase tracking-widest text-muted font-medium">Applicant</th>
                  <th className="text-left px-5 py-3 text-label uppercase tracking-widest text-muted font-medium hidden md:table-cell">Loan Amount</th>
                  <th className="text-left px-5 py-3 text-label uppercase tracking-widest text-muted font-medium">Stage</th>
                  <th className="text-left px-5 py-3 text-label uppercase tracking-widest text-muted font-medium hidden lg:table-cell">Completeness</th>
                  <th className="text-left px-5 py-3 text-label uppercase tracking-widest text-muted font-medium hidden lg:table-cell">Days in Stage</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-ivory-dark/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedAppId(app.id)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center shrink-0">
                          <span className="text-white text-[11px] font-semibold">
                            {app.id.slice(-2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#1A1A1A]">Applicant …{app.buyerId.slice(-6)}</p>
                          <p className="text-xs text-muted capitalize">{app.loanType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="font-display text-navy font-semibold">
                        ${(app.loanAmount / 1_000_000).toFixed(2)}M
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-pill',
                        STAGE_COLORS[app.stage]
                      )}>
                        {STAGE_LABELS[app.stage]}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-border rounded-full h-1.5 max-w-[80px]">
                          <div
                            className="h-1.5 rounded-full bg-navy transition-all"
                            style={{ width: `${Math.round(Number(app.ltv) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted">LTV {Math.round(Number(app.ltv) * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {(() => {
                        const days = Math.floor((Date.now() - new Date(app.updatedAt).getTime()) / 86_400_000)
                        return (
                          <span className={cn('text-xs font-medium', days > 7 ? 'text-[#D97706]' : 'text-muted')}>
                            {days > 7 && <AlertCircle size={11} className="inline mr-1" />}
                            {days}d
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ChevronRight size={15} className="text-muted ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
