/**
 * Authentication Validation Schema Tests
 *
 * Comprehensive tests for all authentication-related Zod validation schemas.
 * Tests cover both valid inputs and edge cases with Turkish error messages.
 */

import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  emailVerificationSchema,
  otpVerificationSchema,
  emailSchema,
  passwordSchema,
  loginPasswordSchema,
  fullNameSchema,
  phoneSchema,
  checkPasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  validateField,
  formatZodErrors,
  AUTH_ERROR_MESSAGES,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '../auth'

describe('Auth Validation Schemas', () => {
  // =============================================================================
  // EMAIL SCHEMA TESTS
  // =============================================================================
  describe('emailSchema', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co',
        'user+tag@example.org',
        'türkçe@örnek.com', // International characters in domain
      ]

      validEmails.forEach((email) => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid',
        '@example.com',
        'test@',
        'test@.com',
        'test@example',
      ]

      invalidEmails.forEach((email) => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(false)
      })
    })

    it('should normalize email to lowercase', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('test@example.com')
      }
    })

    it('should trim whitespace from email', () => {
      const result = emailSchema.safeParse('  test@example.com  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('test@example.com')
      }
    })

    it('should reject email longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@test.com'
      const result = emailSchema.safeParse(longEmail)
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // PASSWORD SCHEMA TESTS
  // =============================================================================
  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'Password1',
        'MySecure123',
        'Test1234',
        'Güçlü123', // Turkish characters allowed
      ]

      validPasswords.forEach((password) => {
        const result = passwordSchema.safeParse(password)
        expect(result.success).toBe(true)
      })
    })

    it('should reject password shorter than minimum length', () => {
      const result = passwordSchema.safeParse('Pass1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          AUTH_ERROR_MESSAGES.passwordTooShort.substring(0, 20)
        )
      }
    })

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('password123')
      expect(result.success).toBe(false)
    })

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('PASSWORD123')
      expect(result.success).toBe(false)
    })

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('PasswordABC')
      expect(result.success).toBe(false)
    })

    it('should reject password longer than bcrypt limit', () => {
      const longPassword = 'A1' + 'a'.repeat(PASSWORD_MAX_LENGTH)
      const result = passwordSchema.safeParse(longPassword)
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // LOGIN PASSWORD SCHEMA TESTS
  // =============================================================================
  describe('loginPasswordSchema', () => {
    it('should accept any non-empty password for login', () => {
      const passwords = ['123', 'abc', 'weakpass', 'StrongPass123!']

      passwords.forEach((password) => {
        const result = loginPasswordSchema.safeParse(password)
        expect(result.success).toBe(true)
      })
    })

    it('should reject empty password', () => {
      const result = loginPasswordSchema.safeParse('')
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // FULL NAME SCHEMA TESTS
  // =============================================================================
  describe('fullNameSchema', () => {
    it('should accept valid Turkish names', () => {
      const validNames = [
        'Ahmet Yılmaz',
        'Ayşe Öztürk',
        'Mehmet-Ali',
        "O'Connor",
        'İsmail Çelik',
        'Şükrü Güneş',
      ]

      validNames.forEach((name) => {
        const result = fullNameSchema.safeParse(name)
        expect(result.success).toBe(true)
      })
    })

    it('should reject names with numbers', () => {
      const result = fullNameSchema.safeParse('John123')
      expect(result.success).toBe(false)
    })

    it('should reject names that are too short', () => {
      const result = fullNameSchema.safeParse('A')
      expect(result.success).toBe(false)
    })

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(101)
      const result = fullNameSchema.safeParse(longName)
      expect(result.success).toBe(false)
    })

    it('should trim whitespace from names', () => {
      const result = fullNameSchema.safeParse('  Ahmet Yılmaz  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Ahmet Yılmaz')
      }
    })
  })

  // =============================================================================
  // PHONE SCHEMA TESTS
  // =============================================================================
  describe('phoneSchema', () => {
    it('should accept valid Turkish phone numbers', () => {
      const validPhones = [
        '5301234567',
        '+905301234567',
        '0530 123 45 67',
        '+90 (530) 123-4567',
      ]

      validPhones.forEach((phone) => {
        const result = phoneSchema.safeParse(phone)
        expect(result.success).toBe(true)
      })
    })

    it('should accept empty string or undefined', () => {
      expect(phoneSchema.safeParse('').success).toBe(true)
      expect(phoneSchema.safeParse(undefined).success).toBe(true)
    })

    it('should reject phone numbers with letters', () => {
      const result = phoneSchema.safeParse('phone123')
      expect(result.success).toBe(false)
    })

    it('should reject phone numbers that are too short', () => {
      const result = phoneSchema.safeParse('123')
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // LOGIN SCHEMA TESTS
  // =============================================================================
  describe('loginSchema', () => {
    it('should accept valid login credentials', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // REGISTER SCHEMA TESTS
  // =============================================================================
  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        fullName: 'Ahmet Yılmaz',
        phone: '5301234567',
        acceptTerms: true,
      })
      expect(result.success).toBe(true)
    })

    it('should reject when passwords do not match', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword123',
        fullName: 'Ahmet Yılmaz',
        acceptTerms: true,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const confirmPasswordError = result.error.errors.find(
          (e) => e.path.includes('confirmPassword')
        )
        expect(confirmPasswordError?.message).toBe(AUTH_ERROR_MESSAGES.passwordsDoNotMatch)
      }
    })

    it('should reject when terms are not accepted', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        fullName: 'Ahmet Yılmaz',
        acceptTerms: false,
      })
      expect(result.success).toBe(false)
    })

    it('should accept registration without optional phone', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        fullName: 'Ahmet Yılmaz',
        acceptTerms: true,
      })
      expect(result.success).toBe(true)
    })
  })

  // =============================================================================
  // FORGOT PASSWORD SCHEMA TESTS
  // =============================================================================
  describe('forgotPasswordSchema', () => {
    it('should accept valid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@example.com',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'invalid-email',
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // RESET PASSWORD SCHEMA TESTS
  // =============================================================================
  describe('resetPasswordSchema', () => {
    it('should accept valid password reset data', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      })
      expect(result.success).toBe(true)
    })

    it('should reject when passwords do not match', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      })
      expect(result.success).toBe(false)
    })

    it('should reject weak passwords', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'weak',
        confirmPassword: 'weak',
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // UPDATE PASSWORD SCHEMA TESTS
  // =============================================================================
  describe('updatePasswordSchema', () => {
    it('should accept valid password update data', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      })
      expect(result.success).toBe(true)
    })

    it('should reject when new password matches current password', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: 'SamePassword123',
        newPassword: 'SamePassword123',
        confirmPassword: 'SamePassword123',
      })
      expect(result.success).toBe(false)
    })

    it('should reject when new passwords do not match', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // EMAIL VERIFICATION SCHEMA TESTS
  // =============================================================================
  describe('emailVerificationSchema', () => {
    it('should accept valid verification data', () => {
      const result = emailVerificationSchema.safeParse({
        token: 'verification-token-123',
        type: 'signup',
      })
      expect(result.success).toBe(true)
    })

    it('should accept token without type', () => {
      const result = emailVerificationSchema.safeParse({
        token: 'verification-token-123',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty token', () => {
      const result = emailVerificationSchema.safeParse({
        token: '',
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // OTP VERIFICATION SCHEMA TESTS
  // =============================================================================
  describe('otpVerificationSchema', () => {
    it('should accept valid OTP', () => {
      const result = otpVerificationSchema.safeParse({
        email: 'test@example.com',
        token: '123456',
      })
      expect(result.success).toBe(true)
    })

    it('should reject OTP with wrong length', () => {
      const result = otpVerificationSchema.safeParse({
        email: 'test@example.com',
        token: '12345', // 5 digits instead of 6
      })
      expect(result.success).toBe(false)
    })

    it('should reject OTP with non-numeric characters', () => {
      const result = otpVerificationSchema.safeParse({
        email: 'test@example.com',
        token: 'abcdef',
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // UTILITY FUNCTION TESTS
  // =============================================================================
  describe('checkPasswordStrength', () => {
    it('should return weak for very short passwords', () => {
      const result = checkPasswordStrength('abc')
      expect(result.strength).toBe('weak')
      expect(result.score).toBeLessThanOrEqual(1)
    })

    it('should return strong for passwords meeting all criteria', () => {
      const result = checkPasswordStrength('StrongPass123')
      expect(result.strength).toBe('strong')
      expect(result.score).toBe(4)
      expect(result.feedback).toHaveLength(0)
    })

    it('should provide feedback for missing requirements', () => {
      const result = checkPasswordStrength('abcdefghij') // No uppercase or number
      expect(result.feedback.length).toBeGreaterThan(0)
    })
  })

  describe('getPasswordStrengthColor', () => {
    it('should return correct colors for each strength level', () => {
      expect(getPasswordStrengthColor('weak')).toBe('bg-red-500')
      expect(getPasswordStrengthColor('fair')).toBe('bg-orange-500')
      expect(getPasswordStrengthColor('good')).toBe('bg-yellow-500')
      expect(getPasswordStrengthColor('strong')).toBe('bg-green-500')
    })
  })

  describe('getPasswordStrengthLabel', () => {
    it('should return Turkish labels for each strength level', () => {
      expect(getPasswordStrengthLabel('weak')).toBe('Zayıf')
      expect(getPasswordStrengthLabel('fair')).toBe('Orta')
      expect(getPasswordStrengthLabel('good')).toBe('İyi')
      expect(getPasswordStrengthLabel('strong')).toBe('Güçlü')
    })
  })

  describe('validateField', () => {
    it('should return success with data for valid input', () => {
      const result = validateField(emailSchema, 'test@example.com')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('test@example.com')
      }
    })

    it('should return error message for invalid input', () => {
      const result = validateField(emailSchema, 'invalid-email')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(AUTH_ERROR_MESSAGES.emailInvalid)
      }
    })
  })

  describe('formatZodErrors', () => {
    it('should format errors into a simple map', () => {
      const result = loginSchema.safeParse({ email: '', password: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = formatZodErrors(result.error)
        expect(errors).toHaveProperty('email')
        expect(errors).toHaveProperty('password')
      }
    })

    it('should only take first error for each field', () => {
      const result = registerSchema.safeParse({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        acceptTerms: false,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = formatZodErrors(result.error)
        // Each field should have exactly one error
        Object.values(errors).forEach((error) => {
          expect(typeof error).toBe('string')
        })
      }
    })
  })
})
