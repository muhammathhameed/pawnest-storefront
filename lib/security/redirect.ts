import { NextResponse } from 'next/server'

export function validateReturnUrl(nextUrl: string | null, origin: string): string {
  if (!nextUrl) return '/'
  
  // Clean and trim
  const trimmed = nextUrl.trim()

  // Prevent protocol-relative URLs, external domains, and javascript/data injections
  if (
    trimmed.startsWith('//') ||
    trimmed.includes('://') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('\\') ||
    trimmed.toLowerCase().includes('javascript:') ||
    trimmed.toLowerCase().includes('data:')
  ) {
    return '/'
  }

  // Ensure it starts with a single slash and doesn't point to external or malicious paths
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    // Double check it's not a sneaky bypass
    try {
      const parsed = new URL(trimmed, origin)
      if (parsed.origin === origin) {
        return trimmed
      }
    } catch {
      return '/'
    }
  }

  return '/'
}
