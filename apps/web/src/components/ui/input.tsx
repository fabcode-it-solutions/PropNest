import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/cn'

// ── Input ──────────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, startIcon, endIcon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <Label htmlFor={inputId}>{label}</Label>
        )}
        <div className="relative">
          {startIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
              {startIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full rounded-card border border-border bg-white px-3.5 py-2.5',
              'text-[#1A1A1A] placeholder:text-muted',
              'text-sm font-sans',
              'transition-colors duration-200',
              'focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10',
              'disabled:opacity-50 disabled:bg-ivory-dark cursor-default',
              error && 'border-error focus:border-error focus:ring-error/10',
              startIcon && 'pl-10',
              endIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {endIcon && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
              {endIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-muted">{hint}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ── Label ─────────────────────────────────────────────────────────────────

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-label uppercase tracking-widest text-[#1A1A1A]/60 font-sans cursor-pointer',
      className
    )}
    {...props}
  />
))
Label.displayName = 'Label'

// ── Textarea ──────────────────────────────────────────────────────────────

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-card border border-border bg-white px-3.5 py-2.5 min-h-[100px]',
            'text-[#1A1A1A] placeholder:text-muted text-sm font-sans',
            'resize-y transition-colors duration-200',
            'focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10',
            'disabled:opacity-50 disabled:bg-ivory-dark',
            error && 'border-error focus:ring-error/10',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
