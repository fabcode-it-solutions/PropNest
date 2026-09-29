import { describe, it, expect } from 'vitest'
import { applyListingTransition } from '../modules/listings/listing.state-machine.js'

const agentCtx = { imageCount: 2, price: 500_000, hasLocation: true, role: 'agent' }
const buyerCtx = { imageCount: 2, price: 500_000, hasLocation: true, role: 'buyer' }
const adminCtx = { imageCount: 2, price: 500_000, hasLocation: true, role: 'admin' }

describe('listing state machine', () => {
  describe('publish (draft → active)', () => {
    it('succeeds with valid context', () => {
      expect(applyListingTransition('draft', 'publish', agentCtx)).toBe('active')
    })

    it('rejects when no images', () => {
      expect(() =>
        applyListingTransition('draft', 'publish', { ...agentCtx, imageCount: 0 })
      ).toThrow('At least one image required')
    })

    it('rejects when price is zero', () => {
      expect(() =>
        applyListingTransition('draft', 'publish', { ...agentCtx, price: 0 })
      ).toThrow('Price must be set')
    })

    it('rejects when location not set', () => {
      expect(() =>
        applyListingTransition('draft', 'publish', { ...agentCtx, hasLocation: false })
      ).toThrow('Location must be set')
    })

    it('rejects publishing from active', () => {
      expect(() =>
        applyListingTransition('active', 'publish', agentCtx)
      ).toThrow('Cannot publish a listing that is active')
    })
  })

  describe('delist (active → draft)', () => {
    it('succeeds from active', () => {
      expect(applyListingTransition('active', 'delist', agentCtx)).toBe('draft')
    })

    it('rejects from draft', () => {
      expect(() =>
        applyListingTransition('draft', 'delist', agentCtx)
      ).toThrow('Cannot delist')
    })
  })

  describe('accept_offer (active → pending)', () => {
    it('succeeds', () => {
      expect(applyListingTransition('active', 'accept_offer', agentCtx)).toBe('pending')
    })

    it('rejects from pending', () => {
      expect(() =>
        applyListingTransition('pending', 'accept_offer', agentCtx)
      ).toThrow()
    })
  })

  describe('reopen (pending → active)', () => {
    it('succeeds', () => {
      expect(applyListingTransition('pending', 'reopen', agentCtx)).toBe('active')
    })
  })

  describe('close (pending → sold)', () => {
    it('succeeds', () => {
      expect(applyListingTransition('pending', 'close', agentCtx)).toBe('sold')
    })

    it('rejects from active', () => {
      expect(() =>
        applyListingTransition('active', 'close', agentCtx)
      ).toThrow()
    })
  })

  describe('withdraw', () => {
    it('agent can withdraw from draft', () => {
      expect(applyListingTransition('draft', 'withdraw', agentCtx)).toBe('withdrawn')
    })

    it('agent can withdraw from active', () => {
      expect(applyListingTransition('active', 'withdraw', agentCtx)).toBe('withdrawn')
    })

    it('agent can withdraw from pending', () => {
      expect(applyListingTransition('pending', 'withdraw', agentCtx)).toBe('withdrawn')
    })

    it('admin can withdraw', () => {
      expect(applyListingTransition('active', 'withdraw', adminCtx)).toBe('withdrawn')
    })

    it('buyer cannot withdraw', () => {
      expect(() =>
        applyListingTransition('active', 'withdraw', buyerCtx)
      ).toThrow('Only agents or admins')
    })

    it('rejects from sold', () => {
      expect(() =>
        applyListingTransition('sold', 'withdraw', agentCtx)
      ).toThrow()
    })
  })

  describe('unknown action', () => {
    it('throws on unknown action', () => {
      expect(() =>
        applyListingTransition('active', 'delete_forever', agentCtx)
      ).toThrow('Unknown action')
    })
  })
})
