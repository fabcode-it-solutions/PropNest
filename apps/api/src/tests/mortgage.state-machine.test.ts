import { describe, it, expect } from 'vitest'
import { applyMortgageTransition } from '../modules/mortgage/mortgage.state-machine.js'

const lenderCtx = { allDocsVerified: true, hasOpenConditions: false, role: 'lender' }
const adminCtx  = { allDocsVerified: true, hasOpenConditions: false, role: 'admin' }
const buyerCtx  = { allDocsVerified: true, hasOpenConditions: false, role: 'buyer' }

describe('mortgage state machine', () => {
  describe('role enforcement', () => {
    it('lender can advance', () => {
      expect(applyMortgageTransition('pre_qualification', 'start_doc_collection', lenderCtx))
        .toBe('document_collection')
    })

    it('admin can advance', () => {
      expect(applyMortgageTransition('pre_qualification', 'start_doc_collection', adminCtx))
        .toBe('document_collection')
    })

    it('buyer cannot advance', () => {
      expect(() =>
        applyMortgageTransition('pre_qualification', 'start_doc_collection', buyerCtx)
      ).toThrow('Insufficient role')
    })
  })

  describe('start_doc_collection', () => {
    it('pre_qualification → document_collection', () => {
      expect(applyMortgageTransition('pre_qualification', 'start_doc_collection', lenderCtx))
        .toBe('document_collection')
    })

    it('rejects from wrong stage', () => {
      expect(() =>
        applyMortgageTransition('document_verification', 'start_doc_collection', lenderCtx)
      ).toThrow('Cannot start_doc_collection')
    })
  })

  describe('submit_for_verification', () => {
    it('document_collection → document_verification', () => {
      expect(applyMortgageTransition('document_collection', 'submit_for_verification', lenderCtx))
        .toBe('document_verification')
    })
  })

  describe('request_more_docs', () => {
    it('document_verification → document_collection', () => {
      expect(applyMortgageTransition('document_verification', 'request_more_docs', lenderCtx))
        .toBe('document_collection')
    })
  })

  describe('send_to_underwriting', () => {
    it('succeeds when all docs verified', () => {
      expect(
        applyMortgageTransition('document_verification', 'send_to_underwriting', {
          ...lenderCtx, allDocsVerified: true,
        })
      ).toBe('underwriting_review')
    })

    it('blocks when docs not all verified', () => {
      expect(() =>
        applyMortgageTransition('document_verification', 'send_to_underwriting', {
          ...lenderCtx, allDocsVerified: false,
        })
      ).toThrow('All documents must be reviewed')
    })
  })

  describe('conditional_approve', () => {
    it('underwriting_review → conditional_approval', () => {
      expect(applyMortgageTransition('underwriting_review', 'conditional_approve', lenderCtx))
        .toBe('conditional_approval')
    })
  })

  describe('final_approve', () => {
    it('succeeds when no open conditions', () => {
      expect(
        applyMortgageTransition('conditional_approval', 'final_approve', {
          ...lenderCtx, hasOpenConditions: false,
        })
      ).toBe('final_approval')
    })

    it('blocks when open conditions remain', () => {
      expect(() =>
        applyMortgageTransition('conditional_approval', 'final_approve', {
          ...lenderCtx, hasOpenConditions: true,
        })
      ).toThrow('All conditions must be satisfied')
    })
  })

  describe('close', () => {
    it('final_approval → closed', () => {
      expect(applyMortgageTransition('final_approval', 'close', lenderCtx)).toBe('closed')
    })

    it('rejects from underwriting', () => {
      expect(() =>
        applyMortgageTransition('underwriting_review', 'close', lenderCtx)
      ).toThrow()
    })
  })

  describe('deny', () => {
    it('from underwriting_review → denied', () => {
      expect(applyMortgageTransition('underwriting_review', 'deny', lenderCtx)).toBe('denied')
    })

    it('from conditional_approval → denied', () => {
      expect(applyMortgageTransition('conditional_approval', 'deny', lenderCtx)).toBe('denied')
    })

    it('rejects from pre_qualification', () => {
      expect(() =>
        applyMortgageTransition('pre_qualification', 'deny', lenderCtx)
      ).toThrow()
    })
  })

  describe('unknown action', () => {
    it('throws', () => {
      expect(() =>
        applyMortgageTransition('pre_qualification', 'magic', lenderCtx)
      ).toThrow('Unknown action')
    })
  })
})
