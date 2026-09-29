import Link from 'next/link'
import { cn } from '@/lib/cn'

const FOOTER_LINKS = {
  Buy: [
    { label: 'Search listings', href: '/search' },
    { label: 'Saved searches',  href: '/dashboard' },
    { label: 'Map search',      href: '/search' },
    { label: 'New listings',    href: '/search' },
  ],
  'Sell & Agent': [
    { label: 'Find an agent',    href: '/agents' },
    { label: 'List your home',   href: '/register' },
    { label: 'Agent resources',  href: '/agents' },
    { label: 'Market insights',  href: '/search' },
  ],
  Mortgage: [
    { label: 'Get pre-approved',    href: '/dashboard/mortgage' },
    { label: 'Mortgage calculator', href: '/dashboard/mortgage' },
    { label: 'Lender directory',    href: '/dashboard/mortgage' },
    { label: 'Loan types',          href: '/dashboard/mortgage' },
  ],
  Company: [
    { label: 'About PropNest',  href: '/' },
    { label: 'Careers',        href: '/' },
    { label: 'Press',          href: '/' },
    { label: 'Contact',        href: '/' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-navy text-white/80">
      {/* Main footer grid */}
      <div className="max-w-8xl mx-auto px-5 md:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <span className="font-display font-bold text-xl text-white tracking-tight">
              PropNest
            </span>
            <p className="text-sm text-white/50 leading-relaxed max-w-[200px]">
              The modern platform for finding, financing, and closing on your next home.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group} className="flex flex-col gap-3">
              <h4 className="text-label uppercase tracking-widest text-white/40 font-sans">
                {group}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-8xl mx-auto px-5 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} PropNest, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {[
              { label: 'Privacy', href: '/' },
              { label: 'Terms', href: '/' },
              { label: 'Accessibility', href: '/' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
