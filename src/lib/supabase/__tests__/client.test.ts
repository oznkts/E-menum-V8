/**
 * Supabase Browser Client Tests
 *
 * Tests for the browser-side Supabase client creation.
 * Verifies environment variable validation and client instantiation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the @supabase/ssr module
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {},
    from: vi.fn(),
    storage: {},
    realtime: {},
  })),
}))

describe('Supabase Browser Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset modules to ensure fresh imports
    vi.resetModules()
    // Clone the original env
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  describe('createClient', () => {
    it('should throw an error when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      // Set up environment without SUPABASE_URL
      process.env.NEXT_PUBLIC_SUPABASE_URL = ''
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      // Dynamically import to get fresh module with new env vars
      const { createClient } = await import('../client')

      expect(() => createClient()).toThrow(
        'Missing Supabase environment variables'
      )
    })

    it('should throw an error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
      // Set up environment without ANON_KEY
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''

      // Dynamically import to get fresh module with new env vars
      const { createClient } = await import('../client')

      expect(() => createClient()).toThrow(
        'Missing Supabase environment variables'
      )
    })

    it('should throw an error when both environment variables are missing', async () => {
      // Set up environment without any env vars
      process.env.NEXT_PUBLIC_SUPABASE_URL = ''
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''

      // Dynamically import to get fresh module with new env vars
      const { createClient } = await import('../client')

      expect(() => createClient()).toThrow(
        'Missing Supabase environment variables'
      )
    })

    it('should create a Supabase client when environment variables are set', async () => {
      // Set up valid environment
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      // Dynamically import to get fresh module with new env vars
      const { createClient } = await import('../client')
      const { createBrowserClient } = await import('@supabase/ssr')

      const client = createClient()

      expect(createBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      )
      expect(client).toBeDefined()
      expect(client).toHaveProperty('auth')
      expect(client).toHaveProperty('from')
    })

    it('should return a client with expected properties', async () => {
      // Set up valid environment
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      // Dynamically import to get fresh module with new env vars
      const { createClient } = await import('../client')

      const client = createClient()

      // Verify client structure matches expected Supabase client interface
      expect(client).toHaveProperty('auth')
      expect(client).toHaveProperty('from')
      expect(client).toHaveProperty('storage')
      expect(client).toHaveProperty('realtime')
    })
  })

  describe('environment variable edge cases', () => {
    it('should handle undefined environment variables', async () => {
      // Remove env vars entirely
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      // Dynamically import to get fresh module with new env vars
      const { createClient } = await import('../client')

      expect(() => createClient()).toThrow(
        'Missing Supabase environment variables'
      )
    })

    it('should handle whitespace-only environment variables', async () => {
      // Set env vars to whitespace (should be falsy after trim in real usage)
      process.env.NEXT_PUBLIC_SUPABASE_URL = '   '
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '   '

      // Dynamically import to get fresh module with new env vars
      const { createClient } = await import('../client')

      // Note: Current implementation doesn't trim whitespace, so this would pass
      // This test documents current behavior - client will be created
      // If validation should reject whitespace, the implementation should be updated
      const client = createClient()
      expect(client).toBeDefined()
    })
  })
})
