'use client'

import React, { useState } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { useRequireRole } from '@/hooks/useRequireRole'
import { useAuthStore } from '@/lib/stores/auth'
import { api } from '@/lib/api'
import { toast } from '@/lib/stores/toast'
import { User, Mail, Phone, Shield, Key, LogOut, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/cn'

const ROLE_LABELS: Record<string, string> = {
  buyer:  'Buyer',
  seller: 'Seller',
  agent:  'Agent',
  lender: 'Lender',
  admin:  'Administrator',
}

const ROLE_COLORS: Record<string, string> = {
  buyer:  'text-[#0EA5E9] bg-sky-50',
  seller: 'text-[#D97706] bg-amber-50',
  agent:  'text-navy bg-navy/10',
  lender: 'text-[#16A34A] bg-green-50',
  admin:  'text-[#DC2626] bg-red-50',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-card border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-sans font-semibold text-heading-sm text-[#1A1A1A]">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-label uppercase tracking-widest text-muted text-[11px] mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  )
}

function InputField({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full border border-border rounded-card px-3 py-2.5 text-sm text-[#1A1A1A]',
        'focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40 transition-colors',
        disabled && 'bg-ivory-dark text-muted cursor-not-allowed'
      )}
    />
  )
}

export default function ProfilePage() {
  const { isLoading } = useRequireRole()
  const { user, clearAuth } = useAuthStore()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  if (isLoading || !user) return null

  async function handleSaveProfile() {
    setSaving(true)
    setSaved(false)
    try {
      await api.patch('/auth/me', { firstName, lastName, phone })
      toast('Profile updated', { variant: 'success' })
      setSaved(true)
    } catch (err: unknown) {
      toast((err as Error).message ?? 'Failed to save', { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match', { variant: 'error' })
      return
    }
    if (newPassword.length < 8) {
      toast('Password must be at least 8 characters', { variant: 'error' })
      return
    }
    setChangingPw(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      toast('Password changed successfully', { variant: 'success' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      toast((err as Error).message ?? 'Failed to change password', { variant: 'error' })
    } finally {
      setChangingPw(false)
    }
  }

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-10 space-y-6">

        {/* Avatar + header */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center shrink-0">
            <span className="text-white text-xl font-semibold">{initials}</span>
          </div>
          <div>
            <h1 className="font-sans font-semibold text-heading-xl text-[#1A1A1A]">
              {user.firstName} {user.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-pill',
                ROLE_COLORS[user.role] ?? 'text-muted bg-border'
              )}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span className="text-xs text-muted">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Personal info */}
        <Section title="Personal Information">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="First Name">
              <InputField value={firstName} onChange={setFirstName} />
            </Field>
            <Field label="Last Name">
              <InputField value={lastName} onChange={setLastName} />
            </Field>
          </div>
          <Field label="Email">
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <InputField value={user.email} onChange={() => {}} disabled />
            </div>
          </Field>
          <div className="mt-4">
            <Field label="Phone">
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (415) 555-0100"
                  className="w-full pl-9 pr-3 py-2.5 border border-border rounded-card text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40 transition-colors"
                />
              </div>
            </Field>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveProfile}
              loading={saving}
            >
              Save Changes
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-[#16A34A]">
                <CheckCircle2 size={14} />
                Saved
              </span>
            )}
          </div>
        </Section>

        {/* Account security */}
        <Section title="Account Security">
          <div className="space-y-4">
            <Field label="Current Password">
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3 py-2.5 border border-border rounded-card text-sm focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40 transition-colors"
                />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="New Password">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 border border-border rounded-card text-sm focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40 transition-colors"
                />
              </Field>
              <Field label="Confirm New Password">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={cn(
                    'w-full px-3 py-2.5 border rounded-card text-sm focus:outline-none focus:ring-1 transition-colors',
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-[#DC2626] focus:ring-[#DC2626]/40 focus:border-[#DC2626]'
                      : 'border-border focus:ring-navy/40 focus:border-navy/40'
                  )}
                />
              </Field>
            </div>
            <Button
              variant="navy"
              size="md"
              onClick={handleChangePassword}
              loading={changingPw}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              <Shield size={14} className="mr-2" />
              Update Password
            </Button>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Account">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Sign out of all devices</p>
              <p className="text-xs text-muted mt-0.5">Revokes all active sessions including this one</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { clearAuth(); window.location.href = '/login' }}
            >
              <LogOut size={13} className="mr-1.5" />
              Sign Out
            </Button>
          </div>
        </Section>

      </main>
      <Footer />
    </div>
  )
}
