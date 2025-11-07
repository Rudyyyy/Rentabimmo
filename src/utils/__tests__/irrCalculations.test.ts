import { describe, it, expect } from 'vitest';
import { calculateIRR } from '../irrCalculations';

describe('irrCalculations - Internal Rate of Return', () => {
  describe('calculateIRR', () => {
    it('should calculate IRR for simple cash flows', () => {
      // Investment: -100, Returns: 10, 10, 10, 10, 110
      const cashFlows = [-100, 10, 10, 10, 10, 110];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeGreaterThan(0);
      expect(irr).toBeLessThan(0.2); // Should be around 10-15%
      expect(irr).toBeCloseTo(0.1, 1); // Approximately 10%
    });

    it('should calculate IRR for typical real estate investment', () => {
      // Investment: -200000
      // Annual cash flows: 5000 per year for 20 years
      // Sale: 250000 in year 20
      const cashFlows = [-200000];
      for (let i = 0; i < 19; i++) {
        cashFlows.push(5000);
      }
      cashFlows.push(5000 + 250000); // Last year includes sale

      const irr = calculateIRR(cashFlows);

      expect(irr).toBeGreaterThan(0);
      expect(irr).toBeLessThan(0.1); // Should be reasonable for real estate
      expect(irr).toBeCloseTo(0.04, 1); // Approximately 4%
    });

    it('should handle negative IRR', () => {
      // Bad investment: more money out than in
      const cashFlows = [-100, 10, 10, 10];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeLessThan(0); // Negative return
    });

    it('should handle zero NPV case', () => {
      // Break-even investment
      const cashFlows = [-100, 50, 50];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(irr).toBeGreaterThan(-0.1);
      expect(irr).toBeLessThan(0.1);
    });

    it('should converge for complex cash flows', () => {
      // Variable cash flows
      const cashFlows = [-50000, 5000, 7000, 6000, 8000, 9000, 60000];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeGreaterThan(0);
      expect(irr).toBeLessThan(1); // Should be reasonable
    });

    it('should handle very small cash flows', () => {
      const cashFlows = [-10, 2, 2, 2, 2, 2, 2];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isFinite(irr)).toBe(true);
    });

    it('should handle large cash flows', () => {
      const cashFlows = [-1000000, 100000, 150000, 200000, 250000, 1500000];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeGreaterThan(0);
      expect(irr).toBeLessThan(1);
    });

    it('should use custom guess if provided', () => {
      const cashFlows = [-100, 10, 10, 10, 10, 110];
      
      // Should converge with different initial guesses
      const irr1 = calculateIRR(cashFlows, 0.05);
      const irr2 = calculateIRR(cashFlows, 0.15);

      // Both should converge to same result (within tolerance)
      expect(irr1).toBeCloseTo(irr2, 5);
    });

    it('should respect tolerance parameter', () => {
      const cashFlows = [-100, 10, 10, 10, 10, 110];
      
      const irr1 = calculateIRR(cashFlows, 0.1, 1e-10);
      const irr2 = calculateIRR(cashFlows, 0.1, 1e-5);

      expect(irr1).toBeDefined();
      expect(irr2).toBeDefined();
      // Results should be very close
      expect(Math.abs(irr1 - irr2)).toBeLessThan(0.0001);
    });

    it('should handle max iterations', () => {
      const cashFlows = [-100, 10, 10, 10, 10, 110];
      
      // Even with very few iterations, should return something
      const irr = calculateIRR(cashFlows, 0.1, 1e-7, 10);

      expect(irr).toBeDefined();
      expect(isFinite(irr)).toBe(true);
    });

    it('should handle all positive cash flows', () => {
      // No initial investment (unusual case)
      const cashFlows = [10, 20, 30, 40];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isFinite(irr)).toBe(true);
    });

    it('should handle all negative cash flows', () => {
      // All losses (bad investment)
      const cashFlows = [-100, -10, -10, -10];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(irr).toBeLessThan(0);
    });

    it('should handle alternating cash flows', () => {
      // Complex pattern
      const cashFlows = [-100, 50, -20, 30, -10, 80];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isFinite(irr)).toBe(true);
    });

    it('should verify NPV is close to zero at calculated IRR', () => {
      const cashFlows = [-100, 10, 10, 10, 10, 110];
      const irr = calculateIRR(cashFlows);

      // Calculate NPV at the IRR
      const npv = cashFlows.reduce((sum, cf, t) => {
        return sum + cf / Math.pow(1 + irr, t);
      }, 0);

      // NPV should be very close to zero at IRR
      expect(Math.abs(npv)).toBeLessThan(0.01);
    });

    it('should handle real estate with renovation', () => {
      // Initial investment + renovation in year 2
      const cashFlows = [
        -200000, // Purchase
        -50000,  // Renovation
        5000,    // Start receiving rent
        7000,
        7000,
        7000,
        7000,
        257000   // Sale + last rent
      ];

      const irr = calculateIRR(cashFlows);

      expect(irr).toBeGreaterThan(-0.5);
      expect(irr).toBeLessThan(0.5);
    });

    it('should handle long-term investment (30 years)', () => {
      const cashFlows = [-300000];
      
      // 30 years of rent with 2% annual increase
      let rent = 15000;
      for (let i = 0; i < 29; i++) {
        cashFlows.push(rent);
        rent *= 1.02;
      }
      
      // Final year with sale
      cashFlows.push(rent + 450000);

      const irr = calculateIRR(cashFlows);

      expect(irr).toBeGreaterThan(0);
      expect(irr).toBeLessThan(0.15);
    });
  });

  describe('IRR edge cases and validation', () => {
    it('should handle single cash flow', () => {
      const cashFlows = [-100];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isFinite(irr)).toBe(true);
    });

    it('should handle two cash flows', () => {
      const cashFlows = [-100, 110];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeCloseTo(0.1, 5); // Exactly 10% return
    });

    it('should be consistent across multiple runs', () => {
      const cashFlows = [-100, 10, 10, 10, 10, 110];
      
      const irr1 = calculateIRR(cashFlows);
      const irr2 = calculateIRR(cashFlows);
      const irr3 = calculateIRR(cashFlows);

      expect(irr1).toBeCloseTo(irr2, 10);
      expect(irr2).toBeCloseTo(irr3, 10);
    });

    it('should handle zero cash flows in the middle', () => {
      const cashFlows = [-100, 10, 0, 0, 10, 110];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isFinite(irr)).toBe(true);
      expect(irr).toBeGreaterThan(0);
    });

    it('should handle investment with immediate return', () => {
      // Unusual but possible: invest and get return same period
      const cashFlows = [-100, 120];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeCloseTo(0.2, 5); // 20% return
    });
  });

  describe('IRR comparison with known values', () => {
    it('should match known IRR for standard example', () => {
      // Classic IRR example from finance textbooks
      // Initial: -1000, Returns: 300, 400, 400, 300
      const cashFlows = [-1000, 300, 400, 400, 300];
      const irr = calculateIRR(cashFlows);

      // Known IRR for this is approximately 21.16%
      expect(irr).toBeCloseTo(0.2116, 2);
    });

    it('should match known IRR for breakeven', () => {
      // Breakeven: invest 100, get back 100 in year 1
      const cashFlows = [-100, 100];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeCloseTo(0, 5); // 0% return
    });

    it('should match known IRR for 100% return in one year', () => {
      const cashFlows = [-100, 200];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeCloseTo(1, 5); // 100% return
    });
  });
});



