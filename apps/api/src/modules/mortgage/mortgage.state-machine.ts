import type { MortgageStage } from '@propnest/shared-types'

interface MortgageContext {
  allDocsVerified: boolean    // all mortgage_documents: extraction_status=completed AND reviewed=true
  hasOpenConditions: boolean  // any mortgage_conditions with status=open
  role: string
}

type Transition = {
  from: MortgageStage[]
  to: MortgageStage
  guard?: (ctx: MortgageContext) => void
  roles: string[]
}

const TRANSITIONS: Record<string, Transition> = {
  start_doc_collection: {
    from: ['pre_qualification'],
    to: 'document_collection',
    roles: ['lender', 'admin'],
  },
  submit_for_verification: {
    from: ['document_collection'],
    to: 'document_verification',
    roles: ['lender', 'admin'],
  },
  request_more_docs: {
    from: ['document_verification'],
    to: 'document_collection',
    roles: ['lender', 'admin'],
  },
  send_to_underwriting: {
    from: ['document_verification'],
    to: 'underwriting_review',
    roles: ['lender', 'admin'],
    guard(ctx) {
      if (!ctx.allDocsVerified) {
        throw { statusCode: 422, message: 'All documents must be reviewed before underwriting' }
      }
    },
  },
  conditional_approve: {
    from: ['underwriting_review'],
    to: 'conditional_approval',
    roles: ['lender', 'admin'],
  },
  final_approve: {
    from: ['conditional_approval'],
    to: 'final_approval',
    roles: ['lender', 'admin'],
    guard(ctx) {
      if (ctx.hasOpenConditions) {
        throw { statusCode: 422, message: 'All conditions must be satisfied or waived before final approval' }
      }
    },
  },
  close: {
    from: ['final_approval'],
    to: 'closed',
    roles: ['lender', 'admin'],
  },
  deny: {
    from: ['underwriting_review', 'conditional_approval'],
    to: 'denied',
    roles: ['lender', 'admin'],
  },
}

export function applyMortgageTransition(
  currentStage: MortgageStage,
  action: string,
  ctx: MortgageContext
): MortgageStage {
  const transition = TRANSITIONS[action]
  if (!transition) throw { statusCode: 400, message: `Unknown action: ${action}` }
  if (!transition.roles.includes(ctx.role)) {
    throw { statusCode: 403, message: 'Insufficient role for this transition' }
  }
  if (!transition.from.includes(currentStage)) {
    throw { statusCode: 422, message: `Cannot ${action} from stage ${currentStage}` }
  }
  transition.guard?.(ctx)
  return transition.to
}
