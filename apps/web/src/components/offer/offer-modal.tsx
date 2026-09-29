'use client'

import React, { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { DollarSign, Calendar, Shield, ChevronRight, CheckCircle2, Info } from 'lucide-react'
import { useSubmitOffer } from '@/lib/hooks/useOffers'

// ── Types ──────────────────────────────────────────────────────────────────────

interface OfferModalProps {
  open: boolean
  onClose: () => void
  listing: {
    id: string
    addressLine1: string
    city: string
    state: string
    price: number
    bedrooms: number
    bathrooms: number
    sqft: number
  }
}

interface OfferFormData {
  price: string
  closingDate: string
  earnestMoney: string
  financingContingency: boolean
  inspectionContingency: boolean
  appraisalContingency: boolean
  message: string
}

// ── Step indicators ───────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i + 1 === step
              ? 'w-6 h-2 bg-gold'
              : i + 1 < step
              ? 'w-2 h-2 bg-navy/40'
              : 'w-2 h-2 bg-border'
          )}
        />
      ))}
    </div>
  )
}

// ── Price delta helper ────────────────────────────────────────────────────────

function PriceDelta({ offerPrice, listingPrice }: { offerPrice: number; listingPrice: number }) {
  if (!offerPrice || isNaN(offerPrice)) return null
  const diff = offerPrice - listingPrice
  const pct = ((diff / listingPrice) * 100).toFixed(1)
  const isAbove = diff > 0
  const isEqual = diff === 0

  if (isEqual) return (
    <span className="text-xs text-muted">Matching list price</span>
  )

  return (
    <span className={cn('text-xs font-medium', isAbove ? 'text-[#16A34A]' : 'text-[#DC2626]')}>
      {isAbove ? '+' : ''}{pct}% {isAbove ? 'above' : 'below'} list price
    </span>
  )
}

// ── Contingency toggle ────────────────────────────────────────────────────────

function ContingencyToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-4 p-4 rounded-card border border-border cursor-pointer hover:border-navy/30 transition-colors group">
      <div className="pt-0.5">
        <div
          onClick={() => onChange(!checked)}
          className={cn(
            'w-10 h-6 rounded-full transition-colors duration-200 relative cursor-pointer',
            checked ? 'bg-navy' : 'bg-border'
          )}
        >
          <div className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-1'
          )} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
    </label>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function Step1Terms({
  data,
  onChange,
  listing,
}: {
  data: OfferFormData
  onChange: (updates: Partial<OfferFormData>) => void
  listing: OfferModalProps['listing']
}) {
  const offerNum = parseFloat(data.price.replace(/[,$]/g, ''))
  const minDate = new Date(Date.now() + 14 * 86_400_000).toISOString().split('T')[0]

  return (
    <div className="space-y-5">
      {/* Offer price */}
      <div>
        <label className="text-label uppercase tracking-widest text-muted text-[11px] mb-2 block">
          Offer Price
        </label>
        <div className="relative">
          <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            inputMode="numeric"
            placeholder={listing.price.toLocaleString()}
            value={data.price}
            onChange={(e) => onChange({ price: e.target.value })}
            className="w-full pl-9 pr-4 py-3 border border-border rounded-card text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40 transition-colors"
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted">
            List price: <span className="font-medium text-[#1A1A1A]">${listing.price.toLocaleString()}</span>
          </span>
          <PriceDelta offerPrice={offerNum} listingPrice={listing.price} />
        </div>
      </div>

      {/* Closing date */}
      <div>
        <label className="text-label uppercase tracking-widest text-muted text-[11px] mb-2 block">
          Target Closing Date
        </label>
        <div className="relative">
          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="date"
            min={minDate}
            value={data.closingDate}
            onChange={(e) => onChange({ closingDate: e.target.value })}
            className="w-full pl-9 pr-4 py-3 border border-border rounded-card text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40 transition-colors"
          />
        </div>
      </div>

      {/* Earnest money */}
      <div>
        <label className="text-label uppercase tracking-widest text-muted text-[11px] mb-2 block">
          Earnest Money Deposit
        </label>
        <div className="relative">
          <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            inputMode="numeric"
            placeholder="50,000"
            value={data.earnestMoney}
            onChange={(e) => onChange({ earnestMoney: e.target.value })}
            className="w-full pl-9 pr-4 py-3 border border-border rounded-card text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40 transition-colors"
          />
        </div>
        <p className="text-xs text-muted mt-1.5">Typically 1–3% of the offer price</p>
      </div>

      {/* Personal message */}
      <div>
        <label className="text-label uppercase tracking-widest text-muted text-[11px] mb-2 block">
          Message to Seller <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Introduce yourself and express your interest in the home..."
          value={data.message}
          onChange={(e) => onChange({ message: e.target.value })}
          className="w-full px-3 py-2.5 border border-border rounded-card text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40 transition-colors resize-none"
        />
      </div>
    </div>
  )
}

function Step2Contingencies({
  data,
  onChange,
}: {
  data: OfferFormData
  onChange: (updates: Partial<OfferFormData>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 p-3 bg-ivory-dark rounded-card border border-border">
        <Info size={14} className="text-muted shrink-0 mt-0.5" />
        <p className="text-xs text-muted leading-relaxed">
          Contingencies protect you as a buyer. Removing them can make your offer more competitive,
          but you take on greater risk. Consult with your agent before waiving any contingency.
        </p>
      </div>

      <ContingencyToggle
        label="Financing Contingency"
        description="Protects you if your mortgage loan falls through. You may back out and recover your earnest money deposit."
        checked={data.financingContingency}
        onChange={(v) => onChange({ financingContingency: v })}
      />

      <ContingencyToggle
        label="Inspection Contingency"
        description="Allows you to hire a home inspector and negotiate repairs or back out if serious issues are found."
        checked={data.inspectionContingency}
        onChange={(v) => onChange({ inspectionContingency: v })}
      />

      <ContingencyToggle
        label="Appraisal Contingency"
        description="Lets you back out (or renegotiate) if the home appraises for less than your offer price."
        checked={data.appraisalContingency}
        onChange={(v) => onChange({ appraisalContingency: v })}
      />
    </div>
  )
}

function Step3Review({
  data,
  listing,
  idempotencyKey,
}: {
  data: OfferFormData
  listing: OfferModalProps['listing']
  idempotencyKey: string
}) {
  const offerNum = parseFloat(data.price.replace(/[,$]/g, '')) || 0

  const rows = [
    { label: 'Property', value: `${listing.addressLine1}, ${listing.city}` },
    { label: 'Offer Price', value: offerNum ? `$${offerNum.toLocaleString()}` : '—', bold: true },
    { label: 'List Price', value: `$${listing.price.toLocaleString()}` },
    { label: 'Closing Date', value: data.closingDate || '—' },
    { label: 'Earnest Money', value: data.earnestMoney ? `$${data.earnestMoney}` : '—' },
    {
      label: 'Contingencies',
      value: [
        data.financingContingency && 'Financing',
        data.inspectionContingency && 'Inspection',
        data.appraisalContingency && 'Appraisal',
      ].filter(Boolean).join(', ') || 'None',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="bg-ivory-dark rounded-card border border-border overflow-hidden">
        {rows.map(({ label, value, bold }) => (
          <div
            key={label}
            className="flex items-start justify-between px-4 py-3 border-b border-border last:border-0"
          >
            <span className="text-xs text-muted">{label}</span>
            <span className={cn('text-sm text-right max-w-[60%]', bold ? 'font-display text-navy font-semibold text-base' : 'font-medium text-[#1A1A1A]')}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {data.message && (
        <div className="bg-ivory-dark rounded-card border border-border p-4">
          <p className="text-label uppercase tracking-widest text-muted text-[11px] mb-2">Your Message</p>
          <p className="text-sm text-[#1A1A1A] leading-relaxed">{data.message}</p>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-muted">
        <Shield size={13} className="shrink-0 mt-0.5 text-muted" />
        <span>
          Submitting this offer twice with the same session will not create a duplicate.
          Your offer is protected by an idempotency key.
        </span>
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

const STEP_TITLES = ['Offer Terms', 'Contingencies', 'Review & Submit']
const STEP_DESCRIPTIONS = [
  'Set your price, closing date, and earnest money.',
  'Choose which contingencies to include.',
  'Review your offer before submitting.',
]

export function OfferModal({ open, onClose, listing }: OfferModalProps) {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const submitOffer = useSubmitOffer(listing.id)

  const [formData, setFormData] = useState<OfferFormData>({
    price: listing.price.toString(),
    closingDate: '',
    earnestMoney: Math.round(listing.price * 0.02).toString(),
    financingContingency: true,
    inspectionContingency: true,
    appraisalContingency: true,
    message: '',
  })

  function handleChange(updates: Partial<OfferFormData>) {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  function handleClose() {
    if (submitOffer.isPending) return
    setStep(1)
    setSubmitted(false)
    submitOffer.reset()
    onClose()
  }

  async function handleSubmit() {
    const price = parseFloat(formData.price.replace(/[,$]/g, ''))
    const earnestMoney = parseFloat(formData.earnestMoney.replace(/[,$]/g, ''))
    try {
      await submitOffer.mutateAsync({
        price,
        closingDate: formData.closingDate,
        earnestMoney,
        financingContingency: formData.financingContingency,
        inspectionContingency: formData.inspectionContingency,
        appraisalContingency: formData.appraisalContingency,
        message: formData.message || undefined,
        idempotencyKey,
      })
      setSubmitted(true)
    } catch {
      // error visible via submitOffer.error
    }
  }

  const canProceedStep1 = Boolean(formData.price && formData.closingDate && formData.earnestMoney)

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogBody className="py-10 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#16A34A]/10 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-[#16A34A]" />
            </div>
            <div>
              <h3 className="font-display text-display-sm text-navy mb-1">Offer Submitted</h3>
              <p className="text-sm text-muted">
                Your offer on {listing.addressLine1} has been submitted successfully.
                The seller&apos;s agent will be notified immediately.
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={handleClose} className="w-full max-w-xs">
              Done
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle>{STEP_TITLES[step - 1]}</DialogTitle>
              <DialogDescription>{STEP_DESCRIPTIONS[step - 1]}</DialogDescription>
            </div>
            <StepDots step={step} total={3} />
          </div>
        </DialogHeader>

        <DialogBody>
          {step === 1 && (
            <Step1Terms data={formData} onChange={handleChange} listing={listing} />
          )}
          {step === 2 && (
            <Step2Contingencies data={formData} onChange={handleChange} />
          )}
          {step === 3 && (
            <Step3Review data={formData} listing={listing} idempotencyKey={idempotencyKey} />
          )}
          {submitOffer.error && (
            <p className="mt-3 text-xs text-error text-center">
              {(submitOffer.error as Error).message ?? 'Failed to submit offer. Please try again.'}
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          {step > 1 && (
            <Button variant="ghost" size="md" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}

          <div className="flex-1" />

          {step < 3 ? (
            <Button
              variant="navy"
              size="md"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !canProceedStep1}
            >
              Continue
              <ChevronRight size={15} className="ml-1 -mr-0.5" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              loading={submitOffer.isPending}
            >
              Submit Offer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
