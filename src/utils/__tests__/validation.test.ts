import { describe, it, expect } from 'vitest';
import {
  safeNumber,
  safeDate,
  safePercentage,
  safeRate,
  safeAmount,
  toFixed,
  isNotEmpty,
  isValidEmail,
  isValidDateRange
} from '../validation';

describe('validation utilities', () => {
  describe('safeNumber', () => {
    it('should convert valid numbers', () => {
      expect(safeNumber(42)).toBe(42);
      expect(safeNumber('42')).toBe(42);
      expect(safeNumber('42.5')).toBe(42.5);
    });

    it('should return default value for invalid inputs', () => {
      expect(safeNumber('invalid')).toBe(0);
      expect(safeNumber(NaN)).toBe(0);
      expect(safeNumber(Infinity)).toBe(0);
      expect(safeNumber(undefined)).toBe(0);
      expect(safeNumber(null)).toBe(0);
    });

    it('should respect min and max constraints', () => {
      expect(safeNumber(5, 0, 0, 10)).toBe(5);
      expect(safeNumber(-5, 10, 0, 10)).toBe(10); // Below min
      expect(safeNumber(15, 10, 0, 10)).toBe(10); // Above max
    });

    it('should use custom default value', () => {
      expect(safeNumber('invalid', 100)).toBe(100);
      expect(safeNumber(NaN, 50)).toBe(50);
    });
  });

  describe('safeDate', () => {
    it('should parse valid date strings', () => {
      const date = safeDate('2023-01-15');
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });

    it('should return Date object as is', () => {
      const inputDate = new Date('2023-01-15');
      const result = safeDate(inputDate);
      expect(result).toEqual(inputDate);
    });

    it('should return default date for invalid strings', () => {
      const defaultDate = new Date('2020-01-01');
      const result = safeDate('invalid date', defaultDate);
      expect(result).toEqual(defaultDate);
    });

    it('should return current date by default for invalid input', () => {
      const beforeCall = new Date();
      const result = safeDate('invalid');
      const afterCall = new Date();
      
      // Should be between before and after (within a reasonable timeframe)
      expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 1000);
      expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000);
    });
  });

  describe('safePercentage', () => {
    it('should accept valid percentages', () => {
      expect(safePercentage(50)).toBe(50);
      expect(safePercentage('75')).toBe(75);
      expect(safePercentage(0)).toBe(0);
      expect(safePercentage(100)).toBe(100);
    });

    it('should return default for values outside 0-100', () => {
      expect(safePercentage(-10)).toBe(0);
      expect(safePercentage(150)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(safePercentage(0.5)).toBe(0.5);
      expect(safePercentage(99.99)).toBe(99.99);
    });
  });

  describe('safeRate', () => {
    it('should accept valid rates', () => {
      expect(safeRate(5)).toBe(5);
      expect(safeRate(-5)).toBe(-5);
      expect(safeRate(50)).toBe(50);
    });

    it('should return default for extreme values', () => {
      expect(safeRate(-150)).toBe(0);
      expect(safeRate(150)).toBe(0);
    });

    it('should accept negative values within range', () => {
      expect(safeRate(-50)).toBe(-50);
      expect(safeRate(-99.9)).toBe(-99.9);
    });
  });

  describe('safeAmount', () => {
    it('should accept positive amounts', () => {
      expect(safeAmount(1000)).toBe(1000);
      expect(safeAmount('5000')).toBe(5000);
      expect(safeAmount(0)).toBe(0);
    });

    it('should return default for negative values', () => {
      expect(safeAmount(-100)).toBe(0);
      expect(safeAmount(-0.01)).toBe(0);
    });

    it('should handle large amounts', () => {
      expect(safeAmount(1000000)).toBe(1000000);
      expect(safeAmount('999999.99')).toBe(999999.99);
    });
  });

  describe('toFixed', () => {
    it('should format numbers with 2 decimals by default', () => {
      expect(toFixed(10.12345)).toBe(10.12);
      expect(toFixed(10.999)).toBe(11);
      expect(toFixed(10)).toBe(10);
    });

    it('should respect custom decimal places', () => {
      expect(toFixed(10.12345, 0)).toBe(10);
      expect(toFixed(10.12345, 1)).toBe(10.1);
      expect(toFixed(10.12345, 3)).toBe(10.123);
      expect(toFixed(10.12345, 4)).toBe(10.1235);
    });

    it('should handle rounding correctly', () => {
      expect(toFixed(2.5, 0)).toBe(3); // Rounds up
      expect(toFixed(2.4, 0)).toBe(2); // Rounds down
      expect(toFixed(2.555, 2)).toBe(2.56); // Rounds up
    });
  });

  describe('isNotEmpty', () => {
    it('should return true for non-empty strings', () => {
      expect(isNotEmpty('hello')).toBe(true);
      expect(isNotEmpty('  world  ')).toBe(true);
      expect(isNotEmpty('a')).toBe(true);
    });

    it('should return false for empty or whitespace strings', () => {
      expect(isNotEmpty('')).toBe(false);
      expect(isNotEmpty('   ')).toBe(false);
      expect(isNotEmpty('\t\n')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isNotEmpty(null)).toBe(false);
      expect(isNotEmpty(undefined)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('first.last@company.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidDateRange', () => {
    it('should accept valid date ranges', () => {
      expect(isValidDateRange('2023-01-01', '2023-12-31')).toBe(true);
      expect(isValidDateRange(new Date('2023-01-01'), new Date('2023-12-31'))).toBe(true);
      expect(isValidDateRange('2023-01-01', '2023-01-02')).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      expect(isValidDateRange('2023-12-31', '2023-01-01')).toBe(false);
      expect(isValidDateRange('2023-01-01', '2023-01-01')).toBe(false);
    });

    it('should handle Date objects and strings mixed', () => {
      const startDate = new Date('2023-01-01');
      const endDate = '2023-12-31';
      expect(isValidDateRange(startDate, endDate)).toBe(true);
    });
  });
});

