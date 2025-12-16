import { describe, it, expect } from 'vitest'
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  truncate,
  getInitials,
  isValidEmail,
  isValidPhone,
  generateId,
  ORDER_STATUS,
  getStatusBadgeClass,
} from './helpers'

describe('cn (className merge)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})

describe('formatCurrency', () => {
  it('formats number as USD currency', () => {
    expect(formatCurrency(100)).toBe('$100.00')
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('handles string numbers', () => {
    expect(formatCurrency('50.00')).toBe('$50.00')
  })

  it('handles null/undefined', () => {
    expect(formatCurrency(null)).toBe('$0.00')
    expect(formatCurrency(undefined)).toBe('$0.00')
  })

  it('handles NaN', () => {
    expect(formatCurrency('not a number')).toBe('$0.00')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('handles negative numbers', () => {
    expect(formatCurrency(-50)).toBe('-$50.00')
  })
})

describe('formatDate', () => {
  it('formats date correctly', () => {
    const result = formatDate('2025-12-15')
    expect(result).toContain('Dec')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })
})

describe('formatDateTime', () => {
  it('formats date and time correctly', () => {
    const result = formatDateTime('2025-12-15T10:30:00')
    expect(result).toContain('Dec')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })
})

describe('formatPhone', () => {
  it('formats 10-digit phone number', () => {
    expect(formatPhone('1234567890')).toBe('(123) 456-7890')
  })

  it('handles empty string', () => {
    expect(formatPhone('')).toBe('')
  })

  it('handles null', () => {
    expect(formatPhone(null)).toBe('')
  })

  it('returns original for non-10-digit numbers', () => {
    expect(formatPhone('+1 234 567 8901')).toBe('+1 234 567 8901')
  })
})

describe('truncate', () => {
  it('truncates long text', () => {
    const longText = 'This is a very long text that should be truncated'
    expect(truncate(longText, 20)).toBe('This is a very long ...')
  })

  it('returns original for short text', () => {
    expect(truncate('Short', 20)).toBe('Short')
  })

  it('handles empty string', () => {
    expect(truncate('')).toBe('')
  })

  it('handles null', () => {
    expect(truncate(null)).toBe('')
  })

  it('uses default length of 50', () => {
    const text = 'a'.repeat(60)
    expect(truncate(text)).toBe('a'.repeat(50) + '...')
  })
})

describe('getInitials', () => {
  it('gets initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('handles single name', () => {
    expect(getInitials('John')).toBe('J')
  })

  it('handles multiple names', () => {
    expect(getInitials('John Michael Doe')).toBe('JM')
  })

  it('handles empty string', () => {
    expect(getInitials('')).toBe('')
  })

  it('handles null', () => {
    expect(getInitials(null)).toBe('')
  })
})

describe('isValidEmail', () => {
  it('validates correct email', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.org')).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('invalid@')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
  })
})

describe('isValidPhone', () => {
  it('validates correct phone', () => {
    expect(isValidPhone('1234567890')).toBe(true)
    expect(isValidPhone('+1 234 567 8901')).toBe(true)
    expect(isValidPhone('(123) 456-7890')).toBe(true)
  })

  it('rejects invalid phone', () => {
    expect(isValidPhone('123')).toBe(false)
    expect(isValidPhone('abc')).toBe(false)
  })
})

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })

  it('generates string IDs', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBe(7)
  })
})

describe('ORDER_STATUS', () => {
  it('has all expected statuses', () => {
    expect(ORDER_STATUS.PENDING).toBe('Pending')
    expect(ORDER_STATUS.ACCEPTED).toBe('Accepted')
    expect(ORDER_STATUS.PACKED).toBe('Packed')
    expect(ORDER_STATUS.SHIPPED).toBe('Shipped')
    expect(ORDER_STATUS.IN_TRANSIT).toBe('In Transit')
    expect(ORDER_STATUS.DELIVERED).toBe('Delivered')
    expect(ORDER_STATUS.CANCELLED).toBe('Cancelled')
  })
})

describe('getStatusBadgeClass', () => {
  it('returns correct badge class for each status', () => {
    expect(getStatusBadgeClass('Pending')).toBe('badge-warning')
    expect(getStatusBadgeClass('Accepted')).toBe('badge-info')
    expect(getStatusBadgeClass('Delivered')).toBe('badge-success')
    expect(getStatusBadgeClass('Cancelled')).toBe('badge-danger')
  })

  it('returns default for unknown status', () => {
    expect(getStatusBadgeClass('Unknown')).toBe('badge-gray')
  })
})
