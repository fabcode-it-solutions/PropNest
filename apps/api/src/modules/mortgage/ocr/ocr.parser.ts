import type { MortgageDocType } from '@propnest/shared-types'

interface TextractBlock {
  BlockType: string
  Text?: string
  Confidence?: number
  Id?: string
}

interface ExtractedField {
  value: string
  confidence: number
}

type ExtractedData = Record<string, ExtractedField>

// Field patterns per doc type
const FIELD_PATTERNS: Record<MortgageDocType, Array<{ field: string; patterns: RegExp[] }>> = {
  w2: [
    { field: 'employer_name',    patterns: [/employer['']?s?\s+name[:\s]+(.+)/i] },
    { field: 'employee_name',    patterns: [/employee['']?s?\s+name[:\s]+(.+)/i, /name[:\s]+(.+)/i] },
    { field: 'wages',            patterns: [/wages.{0,30}tips.{0,30}[\$\s]+([\d,]+\.?\d*)/i, /box\s*1[:\s]+([\d,]+\.?\d*)/i] },
    { field: 'federal_tax',      patterns: [/federal\s+income\s+tax[:\s\$]+([\d,]+\.?\d*)/i, /box\s*2[:\s]+([\d,]+\.?\d*)/i] },
    { field: 'tax_year',         patterns: [/\b(20\d{2})\b/] },
    { field: 'ssn_last4',        patterns: [/xxx-xx-(\d{4})/i, /\*{3}-\*{2}-(\d{4})/] },
  ],
  pay_stub: [
    { field: 'employer_name',    patterns: [/company[:\s]+(.+)/i, /employer[:\s]+(.+)/i] },
    { field: 'employee_name',    patterns: [/employee[:\s]+(.+)/i, /name[:\s]+(.+)/i] },
    { field: 'gross_pay',        patterns: [/gross\s+pay[:\s\$]+([\d,]+\.?\d*)/i] },
    { field: 'net_pay',          patterns: [/net\s+pay[:\s\$]+([\d,]+\.?\d*)/i] },
    { field: 'pay_period_end',   patterns: [/period\s+end(?:ing)?[:\s]+([\d\/\-]+)/i] },
    { field: 'ytd_gross',        patterns: [/ytd\s+gross[:\s\$]+([\d,]+\.?\d*)/i] },
  ],
  tax_return: [
    { field: 'taxpayer_name',    patterns: [/your\s+first\s+name.{0,50}last\s+name[:\s]+(.+)/i] },
    { field: 'agi',              patterns: [/adjusted\s+gross\s+income[:\s\$]+([\d,]+\.?\d*)/i, /line\s+11[:\s\$]+([\d,]+\.?\d*)/i] },
    { field: 'total_income',     patterns: [/total\s+income[:\s\$]+([\d,]+\.?\d*)/i] },
    { field: 'tax_year',         patterns: [/\b(20\d{2})\b/] },
    { field: 'filing_status',    patterns: [/filing\s+status[:\s]+(.+)/i] },
  ],
  bank_statement: [
    { field: 'account_holder',   patterns: [/account\s+(?:holder|owner|name)[:\s]+(.+)/i] },
    { field: 'bank_name',        patterns: [/^(.+(?:bank|credit union|financial).*)$/im] },
    { field: 'ending_balance',   patterns: [/ending\s+balance[:\s\$]+([\d,]+\.?\d*)/i, /closing\s+balance[:\s\$]+([\d,]+\.?\d*)/i] },
    { field: 'statement_period', patterns: [/statement\s+period[:\s]+(.+)/i] },
    { field: 'account_last4',    patterns: [/account\s+(?:number|#)[:\s]*\*{0,8}(\d{4})/i] },
  ],
  employment_letter: [
    { field: 'employer_name',    patterns: [/(?:from|company|employer)[:\s]+(.+)/i] },
    { field: 'employee_name',    patterns: [/(?:employee|re)[:\s]+(.+)/i] },
    { field: 'job_title',        patterns: [/(?:title|position|role)[:\s]+(.+)/i] },
    { field: 'salary',           patterns: [/(?:salary|compensation|annual)[:\s\$]+([\d,]+\.?\d*)/i] },
    { field: 'start_date',       patterns: [/(?:start|hire|employment)\s+date[:\s]+(.+)/i] },
  ],
  other: [],
}

export function parseTextractBlocks(blocks: TextractBlock[], docType: MortgageDocType): {
  extractedData: ExtractedData
  confidenceScores: Record<string, number>
} {
  const lines = blocks
    .filter((b) => b.BlockType === 'LINE' && b.Text)
    .map((b) => ({ text: b.Text!, confidence: b.Confidence ?? 0 }))

  const fullText = lines.map((l) => l.text).join('\n')
  const patterns = FIELD_PATTERNS[docType] ?? []

  const extractedData: ExtractedData = {}
  const confidenceScores: Record<string, number> = {}

  for (const { field, patterns: regexList } of patterns) {
    for (const regex of regexList) {
      const match = fullText.match(regex)
      if (match && match[1]) {
        const value = match[1].trim()
        // Find the line containing this value and use its confidence
        const line = lines.find((l) => l.text.includes(value))
        const confidence = line?.confidence ?? 70
        extractedData[field] = { value, confidence }
        confidenceScores[field] = Math.round(confidence)
        break
      }
    }
  }

  return { extractedData, confidenceScores }
}
