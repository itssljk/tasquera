import { describe, expect, it } from 'vitest'
import { parseTaskInput } from './nlp'

describe('parseTaskInput', () => {
  const baseDate = '2026-08-21' // Friday

  it('parses pure title with no metadata', () => {
    const result = parseTaskInput('Buy fresh bread', baseDate)
    expect(result.title).toBe('Buy fresh bread')
    expect(result.dueDate).toBeNull()
    expect(result.priority).toBeUndefined()
  })

  it('parses relative dates: today, tomorrow, yesterday', () => {
    const r1 = parseTaskInput('Send email today', baseDate)
    expect(r1.title).toBe('Send email')
    expect(r1.dueDate).toBe('2026-08-21')

    const r2 = parseTaskInput('Call doctor tomorrow', baseDate)
    expect(r2.title).toBe('Call doctor')
    expect(r2.dueDate).toBe('2026-08-22')

    const r3 = parseTaskInput('Review logs yesterday', baseDate)
    expect(r3.title).toBe('Review logs')
    expect(r3.dueDate).toBe('2026-08-20')
  })

  it('parses in N days / in N weeks', () => {
    const r1 = parseTaskInput('Follow up in 3 days', baseDate)
    expect(r1.title).toBe('Follow up')
    expect(r1.dueDate).toBe('2026-08-24')

    const r2 = parseTaskInput('Launch beta in 2 weeks', baseDate)
    expect(r2.title).toBe('Launch beta')
    expect(r2.dueDate).toBe('2026-09-04')
  })

  it('parses weekdays and next weekday', () => {
    // 2026-08-21 is Friday (5). Next Monday is 2026-08-24
    const r1 = parseTaskInput('Sprint planning monday', baseDate)
    expect(r1.title).toBe('Sprint planning')
    expect(r1.dueDate).toBe('2026-08-24')

    const r2 = parseTaskInput('Deploy release next fri', baseDate)
    expect(r2.title).toBe('Deploy release')
    expect(r2.dueDate).toBe('2026-08-28')
  })

  it('parses explicit month and day', () => {
    const r = parseTaskInput('Dentist appointment Aug 28th', baseDate)
    expect(r.title).toBe('Dentist appointment')
    expect(r.dueDate).toBe('2026-08-28')
  })

  it('parses priority indicators', () => {
    const r1 = parseTaskInput('Fix critical bug !urgent', baseDate)
    expect(r1.title).toBe('Fix critical bug')
    expect(r1.priority).toBe('urgent')

    const r2 = parseTaskInput('Prepare slide deck !high', baseDate)
    expect(r2.title).toBe('Prepare slide deck')
    expect(r2.priority).toBe('high')

    const r3 = parseTaskInput('Clean desk !low', baseDate)
    expect(r3.title).toBe('Clean desk')
    expect(r3.priority).toBe('low')
  })

  it('parses combination of date and priority in any order', () => {
    const r = parseTaskInput('Deploy production release tomorrow !urgent', baseDate)
    expect(r.title).toBe('Deploy production release')
    expect(r.dueDate).toBe('2026-08-22')
    expect(r.priority).toBe('urgent')
  })
})
