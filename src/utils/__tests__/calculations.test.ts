import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  calculateFinancialMetrics,
  calculateTotalNu,
  calculateTotalMeuble,
  calculateRevenuesWithVacancy
} from '../calculations';
import { Investment, YearlyExpenses } from '../../types/investment';

describe('calculations - Loan and Amortization', () => {
  describe('calculateMonthlyPayment', () => {
    it('should calculate monthly payment without deferral', () => {
      const monthlyPayment = calculateMonthlyPayment(200000, 1.5, 20);
      expect(monthlyPayment).toBeGreaterThan(0);
      // Calcul standard : 200 000 € à 1,5% sur 20 ans (240 mois)
      expect(monthlyPayment).toBeCloseTo(965.09, 1);
    });

    it('should return 0 for invalid inputs', () => {
      expect(calculateMonthlyPayment(0, 1.5, 20)).toBe(0);
      expect(calculateMonthlyPayment(200000, 0, 20)).toBe(0);
      expect(calculateMonthlyPayment(200000, 1.5, 0)).toBe(0);
    });

    it('should calculate monthly payment with partial deferral', () => {
      const monthlyPayment = calculateMonthlyPayment(200000, 1.5, 20, 'partial', 12);
      expect(monthlyPayment).toBeGreaterThan(0);
      // Différé partiel : on paie les intérêts pendant 12 mois, puis on rembourse
      // le capital sur 240 mois (20 ans). La durée de remboursement n'est pas réduite.
      // La mensualité est la même que sans différé
      expect(monthlyPayment).toBeCloseTo(965.09, 1);
    });

    it('should calculate monthly payment with total deferral', () => {
      const monthlyPayment = calculateMonthlyPayment(200000, 1.5, 20, 'total', 12);
      expect(monthlyPayment).toBeGreaterThan(0);
      // Différé total : on ne paie rien pendant 12 mois, les intérêts s'ajoutent au capital
      // Capital après différé ≈ 203 000 €, remboursé sur 240 mois (20 ans)
      // La mensualité est plus élevée que sans différé (plus de capital à rembourser)
      expect(monthlyPayment).toBeCloseTo(979.67, 1);
    });

    it('should have correct monthly payment relationships between deferral types', () => {
      const noDeferral = calculateMonthlyPayment(200000, 1.5, 20, 'none', 0);
      const partialDeferral = calculateMonthlyPayment(200000, 1.5, 20, 'partial', 12);
      const totalDeferral = calculateMonthlyPayment(200000, 1.5, 20, 'total', 12);

      // Sans différé et différé partiel : même mensualité (même capital remboursé sur même durée)
      expect(noDeferral).toBeCloseTo(partialDeferral, 2);
      
      // Différé total : mensualité plus élevée (capital + intérêts capitalisés remboursés sur même durée)
      expect(totalDeferral).toBeGreaterThan(noDeferral);
      expect(totalDeferral).toBeGreaterThan(partialDeferral);
    });

    it('should handle edge cases', () => {
      // Very low interest rate
      const lowRate = calculateMonthlyPayment(100000, 0.1, 10);
      expect(lowRate).toBeGreaterThan(0);

      // Short duration
      const shortDuration = calculateMonthlyPayment(50000, 2, 5);
      expect(shortDuration).toBeGreaterThan(0);

      // Long duration
      const longDuration = calculateMonthlyPayment(300000, 2.5, 30);
      expect(longDuration).toBeGreaterThan(0);
    });
  });

  describe('generateAmortizationSchedule', () => {
    it('should generate amortization schedule without deferral', () => {
      const { schedule, deferredInterest } = generateAmortizationSchedule(
        200000,
        1.5,
        2, // 2 years for testing
        'none',
        0,
        '2023-01-01'
      );

      expect(schedule).toHaveLength(24); // 2 years * 12 months
      expect(deferredInterest).toBe(0);

      // First payment
      const first = schedule[0];
      expect(first.month).toBe(1);
      expect(first.monthlyPayment).toBeGreaterThan(0);
      expect(first.interest).toBeGreaterThan(0);
      expect(first.principal).toBeGreaterThan(0);
      expect(first.isDeferred).toBe(false);

      // Last payment
      const last = schedule[schedule.length - 1];
      expect(last.remainingBalance).toBeCloseTo(0, 1);
      expect(last.remainingPrincipal).toBeCloseTo(0, 1);
    });

    it('should generate amortization schedule with partial deferral', () => {
      const { schedule, deferredInterest } = generateAmortizationSchedule(
        200000,
        1.5,
        2,
        'partial',
        6, // 6 months deferral
        '2023-01-01'
      );

      expect(schedule).toHaveLength(30); // 6 months deferral + 24 months repayment (2 years loan duration)
      expect(deferredInterest).toBe(0); // No deferred interest in partial deferral

      // Check deferral period
      for (let i = 0; i < 6; i++) {
        expect(schedule[i].isDeferred).toBe(true);
        expect(schedule[i].principal).toBe(0);
        expect(schedule[i].interest).toBeGreaterThan(0);
        expect(schedule[i].monthlyPayment).toBeGreaterThan(0);
      }

      // Check normal period
      expect(schedule[6].isDeferred).toBe(false);
      expect(schedule[6].principal).toBeGreaterThan(0);
    });

    it('should generate amortization schedule with total deferral', () => {
      const { schedule, deferredInterest } = generateAmortizationSchedule(
        200000,
        1.5,
        2,
        'total',
        6, // 6 months deferral
        '2023-01-01'
      );

      expect(schedule).toHaveLength(30); // 6 months deferral + 24 months repayment (2 years loan duration)
      expect(deferredInterest).toBeGreaterThan(0);

      // Check deferral period
      for (let i = 0; i < 6; i++) {
        expect(schedule[i].isDeferred).toBe(true);
        expect(schedule[i].principal).toBe(0);
        expect(schedule[i].interest).toBeGreaterThan(0);
        expect(schedule[i].monthlyPayment).toBe(0); // No payment during total deferral
      }

      // Check that remaining balance increased during deferral
      expect(schedule[5].remainingBalance).toBeGreaterThan(200000);
    });

    it('should have interest > 0 for all non-final payments with total deferral', () => {
      const { schedule } = generateAmortizationSchedule(
        200000,
        1.5,
        20, // Long duration to test the bug
        'total',
        12, // 12 months deferral
        '2023-01-01'
      );

      expect(schedule).toHaveLength(252); // 12 months deferral + 240 months repayment (20 years loan duration)

      // During the regular amortization period (after deferral), 
      // interest should always be > 0 until the very last payment
      const regularPayments = schedule.slice(12); // Skip deferral period
      
      for (let i = 0; i < regularPayments.length - 1; i++) {
        const payment = regularPayments[i];
        expect(payment.interest).toBeGreaterThan(0, 
          `Interest should be > 0 at month ${payment.month}, but got ${payment.interest}`);
        expect(payment.remainingBalance).toBeGreaterThan(0,
          `Remaining balance should be > 0 at month ${payment.month}, but got ${payment.remainingBalance}`);
      }

      // Last payment should have balance close to 0
      const lastPayment = regularPayments[regularPayments.length - 1];
      expect(lastPayment.remainingBalance).toBeCloseTo(0, 1);
      expect(lastPayment.remainingPrincipal).toBeCloseTo(0, 1);
    });

    it('should have interest > 0 for all non-final payments with partial deferral', () => {
      const { schedule } = generateAmortizationSchedule(
        200000,
        1.5,
        20, // Long duration to test
        'partial',
        12, // 12 months deferral
        '2023-01-01'
      );

      expect(schedule).toHaveLength(252); // 12 months deferral + 240 months repayment (20 years loan duration)

      // During the regular amortization period (after deferral), 
      // interest should always be > 0 until the very last payment
      const regularPayments = schedule.slice(12); // Skip deferral period
      
      for (let i = 0; i < regularPayments.length - 1; i++) {
        const payment = regularPayments[i];
        expect(payment.interest).toBeGreaterThan(0, 
          `Interest should be > 0 at month ${payment.month}, but got ${payment.interest}`);
        expect(payment.remainingBalance).toBeGreaterThan(0,
          `Remaining balance should be > 0 at month ${payment.month}, but got ${payment.remainingBalance}`);
      }

      // Last payment should have balance close to 0 (may have small rounding differences)
      const lastPayment = regularPayments[regularPayments.length - 1];
      expect(lastPayment.remainingBalance).toBeCloseTo(0, 0); // Less strict tolerance due to accumulated rounding
      expect(lastPayment.remainingPrincipal).toBeCloseTo(0, 0);
    });

    it('should correctly capitalize deferred interest into principal', () => {
      const { schedule, deferredInterest } = generateAmortizationSchedule(
        200000,
        1.5,
        20,
        'total',
        12, // 12 months deferral
        '2023-01-01'
      );

      // The deferred interest should be > 0
      expect(deferredInterest).toBeGreaterThan(0);
      
      // Check that during deferral, the balance increases
      const lastDeferredPayment = schedule[11]; // Last deferral month (month 12, index 11)
      expect(lastDeferredPayment.remainingBalance).toBeCloseTo(200000 + deferredInterest, 1);

      // After deferral, the first regular payment should have:
      // - Interest calculated on the total capital (initial + capitalized deferred interest)
      const firstRegularPayment = schedule[12]; // First payment after 12 months deferral
      
      // Before this first regular payment is made, the remaining balance should be 
      // initial capital + deferred interest. After the payment, it will have decreased.
      // So we check that the interest calculation is based on the full amount
      const expectedInterest = (200000 + deferredInterest) * (1.5 / 12 / 100);
      expect(firstRegularPayment.interest).toBeCloseTo(expectedInterest, 1);
      
      // And the remaining balance after this first payment should be less than the initial + deferred
      expect(firstRegularPayment.remainingBalance).toBeLessThan(200000 + deferredInterest);
      expect(firstRegularPayment.remainingBalance).toBeGreaterThan(200000); // But still more than initial
    });

    it('should handle dates correctly', () => {
      const startDate = '2023-06-15';
      const { schedule } = generateAmortizationSchedule(
        100000,
        2,
        1,
        'none',
        0,
        startDate
      );

      expect(schedule[0].date).toContain('2023-06');
      expect(schedule[11].date).toContain('2024-05');
    });
  });
});

describe('calculations - Financial Metrics', () => {
  const mockInvestment: Investment = {
    id: 'test-1',
    userId: 'user-1',
    name: 'Test Property',
    purchasePrice: 200000,
    agencyFees: 10000,
    notaryFees: 15000,
    bankFees: 2000,
    renovationCosts: 20000,
    downPayment: 50000,
    loanAmount: 197000,
    interestRate: 1.5,
    insuranceRate: 0.36,
    loanDuration: 20,
    monthlyRent: 1200,
    occupancyRate: 95,
    annualRentIncrease: 2,
    propertyTax: 1500,
    condoFees: 1200,
    propertyInsurance: 300,
    managementFees: 600,
    unpaidRentInsurance: 200,
    startDate: '2023-01-01',
    appreciationType: 'annual',
    appreciationValue: 3,
    address: 'Test Address',
    city: 'Test City',
    postalCode: '75001',
    surfaceArea: 50,
    numberOfRooms: 2,
    propertyType: 'appartement',
    expenses: [],
    taxParameters: {
      taxRate: 30,
      socialChargesRate: 17.2,
      buildingValue: 150000,
      buildingAmortizationYears: 25,
      furnitureValue: 10000,
      furnitureAmortizationYears: 5,
      worksValue: 0,
      worksAmortizationYears: 10,
      otherValue: 0,
      otherAmortizationYears: 5,
      previousDeficit: 0
    },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  };

  describe('calculateFinancialMetrics', () => {
    it('should calculate all financial metrics correctly', () => {
      const metrics = calculateFinancialMetrics(mockInvestment);

      expect(metrics.grossYield).toBeGreaterThan(0);
      expect(metrics.netYield).toBeLessThan(metrics.grossYield);
      expect(metrics.monthlyPayment).toBeGreaterThan(0);
      expect(metrics.monthlyCosts).toBeGreaterThan(0);
      expect(metrics.currentMonthlyRent).toBeGreaterThan(0);
      expect(metrics.annualRentalIncome).toBeInstanceOf(Array);
      expect(metrics.rentalYears).toBeInstanceOf(Array);
    });

    it('should calculate gross yield correctly', () => {
      const metrics = calculateFinancialMetrics(mockInvestment);
      const totalCost = 200000 + 10000 + 15000 + 2000 + 20000;
      
      // The gross yield uses the adjusted rent based on years since start
      // Since the mock uses a start date in the past (2023-01-01) and annualRentIncrease of 2%,
      // the rent will have increased, so we just verify it's calculated correctly
      expect(metrics.grossYield).toBeGreaterThan(0);
      expect(metrics.grossYield).toBeLessThan(10); // Reasonable range for real estate
      
      // Verify the calculation formula is correct (using current adjusted rent)
      const expectedGrossYield = (metrics.currentMonthlyRent * 12 / totalCost) * 100;
      expect(metrics.grossYield).toBeCloseTo(expectedGrossYield, 2);
    });

    it('should calculate cash flow correctly', () => {
      const metrics = calculateFinancialMetrics(mockInvestment);

      expect(metrics.monthlyCashFlow).toBeDefined();
      expect(metrics.annualCashFlow).toBe(metrics.monthlyCashFlow * 12);
    });

    it('should calculate ROI correctly', () => {
      const metrics = calculateFinancialMetrics(mockInvestment);

      expect(metrics.roi).toBeDefined();
      // ROI should be based on down payment
      if (mockInvestment.downPayment > 0) {
        expect(metrics.roi).toBe((metrics.annualCashFlow / mockInvestment.downPayment) * 100);
      }
    });

    it('should handle rental projections', () => {
      const metrics = calculateFinancialMetrics(mockInvestment);

      expect(metrics.annualRentalIncome.length).toBeGreaterThan(0);
      expect(metrics.rentalYears.length).toBe(metrics.annualRentalIncome.length);

      // With 2% annual increase, each year should be higher
      for (let i = 1; i < metrics.annualRentalIncome.length; i++) {
        expect(metrics.annualRentalIncome[i]).toBeGreaterThan(metrics.annualRentalIncome[i - 1]);
      }
    });

    it('should handle sale metrics when sale date is provided', () => {
      const investmentWithSale = {
        ...mockInvestment,
        saleDate: '2028-01-01'
      };

      const metrics = calculateFinancialMetrics(investmentWithSale);

      expect(metrics.remainingBalance).toBeDefined();
      expect(metrics.saleProfit).toBeDefined();
      expect(metrics.capitalGain).toBeDefined();
      expect(metrics.estimatedSalePrice).toBeGreaterThan(0);
    });
  });
});

describe('calculations - Vacancy and Revenue', () => {
  describe('calculateTotalNu', () => {
    it('should calculate total for unfurnished rental without vacancy', () => {
      const total = calculateTotalNu(1000, 100, 50, 0);
      expect(total).toBe(1150);
    });

    it('should apply vacancy rate correctly', () => {
      const total = calculateTotalNu(1000, 100, 50, 10);
      expect(total).toBeCloseTo(1035, 1); // 1150 * 0.9
    });

    it('should handle 100% vacancy', () => {
      const total = calculateTotalNu(1000, 100, 50, 100);
      expect(total).toBe(0);
    });

    it('should handle negative values safely', () => {
      const total = calculateTotalNu(-1000, -100, -50, 10);
      expect(total).toBe(0);
    });
  });

  describe('calculateTotalMeuble', () => {
    it('should calculate total for furnished rental without vacancy', () => {
      const total = calculateTotalMeuble(1500, 100, 0);
      expect(total).toBe(1600);
    });

    it('should apply vacancy rate correctly', () => {
      const total = calculateTotalMeuble(1500, 100, 20);
      expect(total).toBeCloseTo(1280, 1); // 1600 * 0.8
    });

    it('should handle edge cases', () => {
      expect(calculateTotalMeuble(0, 0, 0)).toBe(0);
      expect(calculateTotalMeuble(1000, 0, 50)).toBeCloseTo(500, 1);
    });
  });

  describe('calculateRevenuesWithVacancy', () => {
    const mockExpenses: YearlyExpenses = {
      year: 2023,
      propertyTax: 1000,
      condoFees: 800,
      propertyInsurance: 200,
      managementFees: 400,
      unpaidRentInsurance: 150,
      repairs: 500,
      otherDeductible: 100,
      otherNonDeductible: 50,
      rent: 12000,
      furnishedRent: 15000,
      tenantCharges: 1200,
      tax: 0,
      deficit: 0,
      loanPayment: 0,
      loanInsurance: 0,
      taxBenefit: 500,
      interest: 0
    };

    it('should calculate revenues for micro-foncier with vacancy', () => {
      const revenue = calculateRevenuesWithVacancy(mockExpenses, 'micro-foncier', 10);
      expect(revenue).toBeGreaterThan(0);
      // Should use rent + taxBenefit + tenantCharges with 10% vacancy
      const expected = (12000 + 500 + 1200) * 0.9;
      expect(revenue).toBeCloseTo(expected, 1);
    });

    it('should calculate revenues for micro-bic with vacancy', () => {
      const revenue = calculateRevenuesWithVacancy(mockExpenses, 'micro-bic', 15);
      expect(revenue).toBeGreaterThan(0);
      // Should use furnishedRent + tenantCharges with 15% vacancy
      const expected = (15000 + 1200) * 0.85;
      expect(revenue).toBeCloseTo(expected, 1);
    });

    it('should handle different regimes correctly', () => {
      const microFoncier = calculateRevenuesWithVacancy(mockExpenses, 'micro-foncier', 10);
      const reelFoncier = calculateRevenuesWithVacancy(mockExpenses, 'reel-foncier', 10);
      const microBic = calculateRevenuesWithVacancy(mockExpenses, 'micro-bic', 10);
      const reelBic = calculateRevenuesWithVacancy(mockExpenses, 'reel-bic', 10);

      // Micro and reel should be the same for same category
      expect(microFoncier).toBe(reelFoncier);
      expect(microBic).toBe(reelBic);

      // BIC should be different from foncier (different rent amounts)
      expect(microBic).not.toBe(microFoncier);
    });
  });
});



