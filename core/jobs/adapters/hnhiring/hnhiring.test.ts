import { describe, it, expect } from 'vitest'
import { parseFirstLine, parseRelativeTime, recencyCutoffDate, parsePostings } from './index'

// ─── recencyCutoffDate ────────────────────────────────────────────────────────

describe('recencyCutoffDate', () => {
  it('returns a YYYY-MM-DD string', () => {
    const result = recencyCutoffDate('week')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('day cutoff is 1 day before today', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(recencyCutoffDate('day')).toBe(yesterday.toISOString().slice(0, 10))
  })

  it('week cutoff is 7 days before today', () => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    expect(recencyCutoffDate('week')).toBe(d.toISOString().slice(0, 10))
  })

  it('month cutoff is 1 calendar month before today', () => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    expect(recencyCutoffDate('month')).toBe(d.toISOString().slice(0, 10))
  })
})

// ─── parseFirstLine ───────────────────────────────────────────────────────────

describe('parseFirstLine', () => {
  it('parses company, title, location from a standard 3-segment line', () => {
    const result = parseFirstLine('Apple | SRE | San Diego')
    expect(result).toEqual({ company: 'Apple', title: 'SRE', location: 'San Diego' })
  })

  it('parses extra segments beyond location without error', () => {
    const result = parseFirstLine('Proven Software | QA Analyst | REMOTE (US) | Full-Time | $85k-$110k')
    expect(result.company).toBe('Proven Software')
    expect(result.title).toBe('QA Analyst')
    expect(result.location).toBe('REMOTE (US)')
  })

  it('handles 2-segment line with missing location', () => {
    const result = parseFirstLine('SomeCompany | Engineer')
    expect(result.company).toBe('SomeCompany')
    expect(result.title).toBe('Engineer')
    expect(result.location).toBe('')
  })

  it('handles 1-segment line (no pipes)', () => {
    const result = parseFirstLine('Remote')
    expect(result.company).toBe('Remote')
    expect(result.title).toBe('')
    expect(result.location).toBe('')
  })

  it('trims whitespace around pipe segments', () => {
    const result = parseFirstLine('  Acme Corp  |  Backend Engineer  |  New York  ')
    expect(result.company).toBe('Acme Corp')
    expect(result.title).toBe('Backend Engineer')
    expect(result.location).toBe('New York')
  })

  it('handles pipe-heavy first line preserving first three fields', () => {
    const result = parseFirstLine(
      'Greenhouse Software | Engineering Manager (Analytics Product) | REMOTE (Ontario or BC, Canada) | Full-time',
    )
    expect(result.company).toBe('Greenhouse Software')
    expect(result.title).toBe('Engineering Manager (Analytics Product)')
    expect(result.location).toBe('REMOTE (Ontario or BC, Canada)')
  })
})

// ─── parseRelativeTime ────────────────────────────────────────────────────────

describe('parseRelativeTime', () => {
  const anchor = new Date('2026-05-04T12:00:00Z')
  const today  = '2026-05-04'

  it('treats minutes as today', () => {
    expect(parseRelativeTime('38 minutes ago', anchor)).toBe(today)
  })

  it('treats hours as today', () => {
    expect(parseRelativeTime('about 4 hours ago', anchor)).toBe(today)
  })

  it('handles 1 day ago', () => {
    expect(parseRelativeTime('1 day ago', anchor)).toBe('2026-05-03')
  })

  it('handles 3 days ago', () => {
    expect(parseRelativeTime('3 days ago', anchor)).toBe('2026-05-01')
  })

  it('handles 2 weeks ago', () => {
    expect(parseRelativeTime('2 weeks ago', anchor)).toBe('2026-04-20')
  })

  it('handles 1 month ago', () => {
    expect(parseRelativeTime('1 month ago', anchor)).toBe('2026-04-04')
  })

  it('falls back to today for unrecognised strings', () => {
    expect(parseRelativeTime('just now', anchor)).toBe(today)
  })

  it('returns YYYY-MM-DD format', () => {
    expect(parseRelativeTime('5 days ago', anchor)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ─── parsePostings ────────────────────────────────────────────────────────────

describe('parsePostings', () => {
  const PAGE_URL = 'https://hnhiring.com/may-2026'

  const minimalHtml = (body: string) => `
    <ul class="jobs">
      <li class="job">
        <div class="container">
          <div class="user green"><a href="https://news.ycombinator.com/user?id=testuser">testuser</a>
            <span class="gray right type-info">2 hours ago</span>
          </div>
          <div class="body">${body}</div>
        </div>
      </li>
    </ul>
  `

  it('parses a standard posting', () => {
    const html = minimalHtml('Acme Corp | Backend Engineer | Remote\n<p>We are building great things.</p>')
    const result = parsePostings(html, PAGE_URL)
    expect(result).toHaveLength(1)
    const p = result[0]
    expect(p.company).toBe('Acme Corp')
    expect(p.title).toBe('Backend Engineer')
    expect(p.location).toBe('Remote')
    expect(p.source).toBe('hnhiring')
  })

  it('skips SEEKING posts', () => {
    const html = minimalHtml('SEEKING | Work | Anywhere\n<p>Looking for a job.</p>')
    expect(parsePostings(html, PAGE_URL)).toHaveLength(0)
  })

  it('skips postings with no company', () => {
    const html = minimalHtml('\n<p>Just some text with no header.</p>')
    expect(parsePostings(html, PAGE_URL)).toHaveLength(0)
  })

  it('constructs synthetic URL with company-title fragment', () => {
    const html = minimalHtml('Kanmon | Senior FullStack Engineer | Remote\n<p>Description.</p>')
    const result = parsePostings(html, PAGE_URL)
    expect(result[0].url).toBe('https://hnhiring.com/may-2026#kanmon-senior-fullstack-engineer')
  })

  it('extracts resolved_domain from first non-HN link', () => {
    const html = minimalHtml(`Acme | Engineer | SF\n<p>Apply at <a href="https://acme.io/jobs">acme.io</a></p>`)
    const result = parsePostings(html, PAGE_URL)
    expect(result[0].resolved_domain).toBe('acme.io')
  })

  it('includes raw_text', () => {
    const html = minimalHtml('Acme | SRE | NYC\n<p>Great opportunity.</p>')
    const result = parsePostings(html, PAGE_URL)
    expect(result[0].raw_text).toContain('Great opportunity')
  })

  it('parses hidden jobs (li.job.hidden)', () => {
    const html = `
      <ul class="jobs">
        <li class="job">
          <div class="container">
            <div class="user green"><a href="https://news.ycombinator.com/user?id=u1">u1</a>
              <span class="gray right type-info">1 hour ago</span>
            </div>
            <div class="body">VisibleCo | Dev | NYC\n<p>Visible job.</p></div>
          </div>
        </li>
        <li class="job hidden">
          <div class="container">
            <div class="user green"><a href="https://news.ycombinator.com/user?id=u2">u2</a>
              <span class="gray right type-info">3 hours ago</span>
            </div>
            <div class="body">HiddenCo | Eng | SF\n<p>Hidden job.</p></div>
          </div>
        </li>
      </ul>
    `
    const result = parsePostings(html, PAGE_URL)
    expect(result).toHaveLength(2)
    expect(result.map(p => p.company)).toContain('HiddenCo')
  })
})
