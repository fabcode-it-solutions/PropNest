'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  // Base
  'inline-flex items-center justify-center gap-2 font-sans font-medium rounded-pill transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap',
  {
    variants: {
      variant: {
        // Primary: gold background, navy text — the hero CTA
        primary:
          'bg-gold text-navy hover:bg-gold-dark focus-visible:ring-gold active:scale-[0.98]',
        // Navy: solid navy background, white text
        navy:
          'bg-navy text-white hover:bg-navy-700 focus-visible:ring-navy active:scale-[0.98]',
        // Outline: navy border, navy text, no fill
        outline:
          'border border-navy text-navy bg-transparent hover:bg-navy-50 focus-visible:ring-navy active:scale-[0.98]',
        // Outline white: for use on dark backgrounds
        'outline-white':
          'border border-white/30 text-white bg-white/10 hover:bg-white/20 focus-visible:ring-white active:scale-[0.98]',
        // Ghost: no border, no fill — for tertiary actions
        ghost:
          'text-navy bg-transparent hover:bg-navy-50 focus-visible:ring-navy',
        // Destructive
        destructive:
          'bg-error text-white hover:bg-red-700 focus-visible:ring-error active:scale-[0.98]',
        // Link style
        link:
          'text-navy underline-offset-4 hover:underline p-0 h-auto focus-visible:ring-navy',
      },
      size: {
        sm:   'h-8  px-4   text-sm',
        md:   'h-10 px-5   text-sm',
        lg:   'h-12 px-7   text-base',
        xl:   'h-14 px-8   text-base',
        icon: 'h-10 w-10  text-sm',
      },
    },
    defaultVariants: {
      variant: 'navy',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{children}</span>
          </>
        ) : children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'
