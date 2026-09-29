import { describe, it, expect } from 'vitest'
import { parseTextractBlocks } from '../modules/mortgage/ocr/ocr.parser.js'

function makeBlocks(lines: string[], confidence = 95) {
  return lines.map((text) => ({ BlockType: 'LINE', Text: text, Confidence: confidence }))
}

describe('parseTextractBlocks', () => {
  describe('w2', () => {
    it('extracts wages and tax year', () => {
      const blocks = makeBlocks([
        'W-2 Wage and Tax Statement',
        'Tax Year: 2023',
        'Employer\'s Name: Acme Corp',
        'Employee\'s Name: Jane Smith',
        'Wages, tips, other compensation $85,000.00',
        'Federal income tax: $18,200.00',
      ])
      const { extractedData, confidenceScores } = parseTextractBlocks(blocks, 'w2')

      expect(extractedData.wages?.value).toContain('85,000')
      expect(extractedData.federal_tax?.value).toContain('18,200')
      expect(extractedData.tax_year?.value).toBe('2023')
      expect(confidenceScores.wages).toBe(95)
    })

    it('handles box 1 format for wages', () => {
      const blocks = makeBlocks(['Box 1: 120,500.00'])
      const { extractedData } = parseTextractBlocks(blocks, 'w2')
      expect(extractedData.wages?.value).toContain('120,500')
    })

    it('extracts SSN last 4', () => {
      const blocks = makeBlocks(['xxx-xx-4321'])
      const { extractedData } = parseTextractBlocks(blocks, 'w2')
      expect(extractedData.ssn_last4?.value).toBe('4321')
    })

    it('returns empty for no matching lines', () => {
      const blocks = makeBlocks(['This page is intentionally blank'])
      const { extractedData } = parseTextractBlocks(blocks, 'w2')
      expect(Object.keys(extractedData)).toHaveLength(0)
    })
  })

  describe('pay_stub', () => {
    it('extracts gross pay and YTD', () => {
      const blocks = makeBlocks([
        'Company: Bay Area Tech Inc',
        'Employee: Marcus Rodriguez',
        'Gross Pay: $12,500.00',
        'Net Pay: $9,100.00',
        'YTD Gross: $125,000.00',
        'Period Ending: 10/31/2023',
      ])
      const { extractedData } = parseTextractBlocks(blocks, 'pay_stub')

      expect(extractedData.gross_pay?.value).toContain('12,500')
      expect(extractedData.net_pay?.value).toContain('9,100')
      expect(extractedData.ytd_gross?.value).toContain('125,000')
    })
  })

  describe('bank_statement', () => {
    it('extracts ending balance and account last 4', () => {
      const blocks = makeBlocks([
        'Pacific Union Bank',
        'Account Holder: James Wilson',
        'Account Number: ****7890',
        'Ending Balance: $24,500.00',
        'Statement Period: Sep 1 - Sep 30, 2023',
      ])
      const { extractedData } = parseTextractBlocks(blocks, 'bank_statement')

      expect(extractedData.ending_balance?.value).toContain('24,500')
      expect(extractedData.account_last4?.value).toBe('7890')
      expect(extractedData.statement_period?.value).toBeDefined()
    })
  })

  describe('tax_return', () => {
    it('extracts AGI and tax year', () => {
      const blocks = makeBlocks([
        'U.S. Individual Income Tax Return 2022',
        'Adjusted Gross Income: $210,000.00',
        'Total income: $225,000.00',
        'Filing Status: Married Filing Jointly',
      ])
      const { extractedData } = parseTextractBlocks(blocks, 'tax_return')

      expect(extractedData.agi?.value).toContain('210,000')
      expect(extractedData.tax_year?.value).toBe('2022')
      expect(extractedData.filing_status?.value).toBeDefined()
    })
  })

  describe('employment_letter', () => {
    it('extracts salary and job title', () => {
      const blocks = makeBlocks([
        'From: Horizon Technologies',
        'Re: Jane Doe',
        'Title: Senior Software Engineer',
        'Annual Salary: $185,000.00',
        'Start Date: March 15, 2020',
      ])
      const { extractedData } = parseTextractBlocks(blocks, 'employment_letter')

      expect(extractedData.salary?.value).toContain('185,000')
      expect(extractedData.job_title?.value).toBeDefined()
      expect(extractedData.start_date?.value).toBeDefined()
    })
  })

  describe('other', () => {
    it('returns empty data for unknown doc type', () => {
      const blocks = makeBlocks(['Some text on a document'])
      const { extractedData, confidenceScores } = parseTextractBlocks(blocks, 'other')
      expect(Object.keys(extractedData)).toHaveLength(0)
      expect(Object.keys(confidenceScores)).toHaveLength(0)
    })
  })

  describe('confidence scores', () => {
    it('uses line confidence from Textract', () => {
      const blocks = [
        { BlockType: 'LINE', Text: 'Wages, tips, other compensation $50,000', Confidence: 82 },
        { BlockType: 'LINE', Text: 'Tax Year: 2023', Confidence: 99 },
      ]
      const { confidenceScores } = parseTextractBlocks(blocks, 'w2')
      expect(confidenceScores.wages).toBe(82)
      expect(confidenceScores.tax_year).toBe(99)
    })

    it('defaults to 0 when confidence missing from Textract block', () => {
      const blocks = [{ BlockType: 'LINE', Text: 'Box 1: 75,000' }]
      const { confidenceScores } = parseTextractBlocks(blocks, 'w2')
      // Confidence ?? 0 at block level; line found so no 70 fallback
      expect(confidenceScores.wages).toBe(0)
    })

    it('ignores non-LINE blocks', () => {
      const blocks = [
        { BlockType: 'PAGE', Text: 'Wages: $50,000' },
        { BlockType: 'WORD', Text: 'Wages: $50,000' },
      ]
      const { extractedData } = parseTextractBlocks(blocks, 'w2')
      expect(Object.keys(extractedData)).toHaveLength(0)
    })
  })
})
