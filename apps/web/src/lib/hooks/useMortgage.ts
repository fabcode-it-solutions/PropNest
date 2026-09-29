import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MortgageApplication, MortgageDocument, MortgageCondition } from '@propnest/shared-types'

// Map from target stage name (what lender UI knows) → action name (what API state machine expects)
const STAGE_TO_ACTION: Record<string, string> = {
  document_collection:   'start_doc_collection',
  document_verification: 'submit_for_verification',
  underwriting_review:   'send_to_underwriting',
  conditional_approval:  'conditional_approve',
  final_approval:        'final_approve',
  closed:                'close',
  denied:                'deny',
  request_more_docs:     'request_more_docs',
}

interface MortgageApplicationDetail extends MortgageApplication {
  documents: MortgageDocument[]
  conditions: MortgageCondition[]
}

interface MortgageApplicationsResponse {
  data: MortgageApplication[]
  total: number
}

export function useMyMortgageApplications() {
  return useQuery<MortgageApplicationsResponse>({
    queryKey: ['mortgage', 'mine'],
    queryFn: () => api.get<MortgageApplicationsResponse>('/mortgage/applications'),
    staleTime: 30_000,
  })
}

export function useMortgageApplication(id: string) {
  return useQuery<MortgageApplicationDetail>({
    queryKey: ['mortgage', id],
    queryFn: () => api.get<MortgageApplicationDetail>(`/mortgage/applications/${id}`),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

// Accepts a target stage name or special action key ('request_more_docs', 'deny', 'denied')
export function useAdvanceMortgageStage(applicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stageOrAction: string) => {
      const action = STAGE_TO_ACTION[stageOrAction] ?? stageOrAction
      return api.patch(`/mortgage/applications/${applicationId}/stage`, { action })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mortgage'] })
    },
  })
}

export function useCreateMortgageApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      loanType: string
      loanAmount: number
      propertyValue: number
      creditScore?: number
      annualIncome?: number
    }) => api.post<MortgageApplication>('/mortgage/applications', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mortgage'] })
    },
  })
}

export function useRequestMortgagePresigned(applicationId: string) {
  return useMutation({
    mutationFn: (body: { docType: string; filename: string; mimeType: string }) =>
      api.post<{ uploadUrl: string; s3Key: string }>(
        `/mortgage/applications/${applicationId}/documents/presigned`,
        body
      ),
  })
}

export function useConfirmMortgageUpload(applicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { s3Key: string; filename: string; docType: string }) =>
      api.post(`/mortgage/applications/${applicationId}/documents/confirm`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mortgage', applicationId] })
    },
  })
}

export function useSaveDocCorrections(applicationId: string, docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (corrections: Record<string, string>) =>
      api.patch(`/mortgage/applications/${applicationId}/documents/${docId}/corrections`, { corrections }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mortgage', applicationId] })
    },
  })
}

// Approve doc — passes empty corrections dict which sets reviewed = true in the DB
export function useApproveDoc(applicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) =>
      api.patch(`/mortgage/applications/${applicationId}/documents/${docId}/corrections`, { corrections: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mortgage', applicationId] })
    },
  })
}

export type { MortgageApplicationDetail }
