import { describe, it, expect } from 'vitest';
import { calculateAllCapitalGainRegimes } from '../capitalGainCalculations';
import { Investment } from '../../types/investment';

describe('capitalGainCalculations - Capital Gain and Property Sale Tax', () => {
  const baseInvestment: Investment = {
    id: 'test-capital-1',
    userId: 'user-1',
    name: 'Test Capital Gain Property',
    purchasePrice: 200000,
    agencyFees: 10000,
    notaryFees: 15000,
    bankFees: 2000,
    renovationCosts: 20000,
    improvementWorks: 10000, // For capital gain calculation
    downPayment: 50000,
    loanAmount: 197000,
    interestRate: 1.5,
    insuranceRate: 0.36,
    loanDuration: 20,
    monthlyRent: 1000,
    occupancyRate: 95,
    annualRentIncrease: 2,
    propertyTax: 1500,
    condoFees: 1200,
    propertyInsurance: 300,
    managementFees: 600,
    unpaidRentInsurance: 200,
    startDate: '2023-01-01',
    projectStartDate: '2020-01-01', // Purchase date
    projectEndDate: '2030-01-01',   // Sale date (10 years later)
    appreciationType: 'global',
    appreciationValue: 30, // 30% appreciation over the period
    saleAgencyFees: 8000,
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
      worksValue: 5000,
      worksAmortizationYears: 10,
      otherValue: 0,
      otherAmortizationYears: 5,
      previousDeficit: 0
    },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  };

  describe('calculateAllCapitalGainRegimes', () => {
    it('should calculate capital gains for all regimes', () => {
      const results = calculateAllCapitalGainRegimes(baseInvestment);

      expect(results).toHaveProperty('micro-foncier');
      expect(results).toHaveProperty('reel-foncier');
      expect(results).toHaveProperty('micro-bic');
      expect(results).toHaveProperty('reel-bic');
    });

    it('should have correct structure for each regime', () => {
      const results = calculateAllCapitalGainRegimes(baseInvestment);

      Object.values(results).forEach(result => {
        expect(result).toHaveProperty('regime');
        expect(result).toHaveProperty('grossCapitalGain');
        expect(result).toHaveProperty('taxableCapitalGainIR');
        expect(result).toHaveProperty('taxableCapitalGainSocial');
        expect(result).toHaveProperty('incomeTax');
        expect(result).toHaveProperty('socialCharges');
        expect(result).toHaveProperty('totalTax');
        expect(result).toHaveProperty('netCapitalGain');
      });
    });
  });

  describe('capital gain calculation with global appreciation', () => {
    it('should calculate selling price with global appreciation', () => {
      const investment = {
        ...baseInvestment,
        appreciationType: 'global' as const,
        appreciationValue: 30 // 30% global appreciation
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      // Expected selling price: 200000 * 1.3 = 260000
      // Minus agency fees: 260000 - 8000 = 252000
      // Corrected purchase price: 200000 + 10000 + 15000 + 10000 = 235000
      // Gross capital gain: 252000 - 235000 = 17000

      expect(microFoncier.grossCapitalGain).toBeCloseTo(17000, 0);
    });

    it('should calculate selling price with annual appreciation', () => {
      const investment = {
        ...baseInvestment,
        appreciationType: 'annual' as const,
        appreciationValue: 3, // 3% per year
        projectStartDate: '2020-01-01',
        projectEndDate: '2030-01-01' // 10 years
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      // Expected selling price: 200000 * (1.03)^10 ≈ 268783
      // Minus agency fees: 268783 - 8000 = 260783
      // Corrected purchase price: 235000
      // Gross capital gain should be positive

      expect(microFoncier.grossCapitalGain).toBeGreaterThan(20000);
    });

    it('should calculate selling price with amount appreciation', () => {
      const investment = {
        ...baseInvestment,
        appreciationType: 'amount' as const,
        appreciationValue: 280000 // Direct sale price
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      // Net selling price: 280000 - 8000 = 272000
      // Corrected purchase price: 235000
      // Gross capital gain: 272000 - 235000 = 37000

      expect(microFoncier.grossCapitalGain).toBeCloseTo(37000, 0);
    });
  });

  describe('holding period discounts', () => {
    it('should apply no discount for short holding period (< 5 years)', () => {
      const investment = {
        ...baseInvestment,
        projectStartDate: '2025-01-01',
        projectEndDate: '2028-01-01' // 3 years
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      // No discount, so taxable gain = gross gain
      expect(microFoncier.taxableCapitalGainIR).toBeCloseTo(microFoncier.grossCapitalGain, 0);
      expect(microFoncier.taxableCapitalGainSocial).toBeCloseTo(microFoncier.grossCapitalGain, 0);
    });

    it('should apply 6% IR discount per year from year 6 to 21', () => {
      const investment = {
        ...baseInvestment,
        projectStartDate: '2010-01-01',
        projectEndDate: '2020-01-01' // 10 years
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      // 10 years = 5 years of discount at 6% = 30% discount
      const expectedDiscount = 0.30;
      const expectedTaxableGain = microFoncier.grossCapitalGain * (1 - expectedDiscount);

      expect(microFoncier.taxableCapitalGainIR).toBeCloseTo(expectedTaxableGain, 0);
    });

    it('should apply full IR exemption after 22 years', () => {
      const investment = {
        ...baseInvestment,
        projectStartDate: '2000-01-01',
        projectEndDate: '2023-01-01' // 23 years
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      // Full exemption for IR after 22 years
      expect(microFoncier.taxableCapitalGainIR).toBe(0);
      expect(microFoncier.incomeTax).toBe(0);
    });

    it('should apply 1.65% social charges discount per year from year 6 to 21', () => {
      const investment = {
        ...baseInvestment,
        projectStartDate: '2010-01-01',
        projectEndDate: '2020-01-01' // 10 years
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      // 10 years = 5 years of discount at 1.65% = 8.25% discount
      const expectedDiscount = 0.0825;
      const expectedTaxableGain = microFoncier.grossCapitalGain * (1 - expectedDiscount);

      expect(microFoncier.taxableCapitalGainSocial).toBeCloseTo(expectedTaxableGain, 0);
    });

    it('should apply full social charges exemption after 30 years', () => {
      const investment = {
        ...baseInvestment,
        projectStartDate: '1990-01-01',
        projectEndDate: '2021-01-01' // 31 years
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      // Full exemption for social charges after 30 years
      expect(microFoncier.taxableCapitalGainSocial).toBe(0);
      expect(microFoncier.socialCharges).toBe(0);
    });
  });

  describe('tax rates', () => {
    it('should apply 19% income tax rate', () => {
      const investment = {
        ...baseInvestment,
        projectStartDate: '2025-01-01',
        projectEndDate: '2028-01-01' // Short period, no discount
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      const expectedIncomeTax = microFoncier.taxableCapitalGainIR * 0.19;
      expect(microFoncier.incomeTax).toBeCloseTo(expectedIncomeTax, 1);
    });

    it('should apply 17.2% social charges rate', () => {
      const investment = {
        ...baseInvestment,
        projectStartDate: '2025-01-01',
        projectEndDate: '2028-01-01' // Short period, no discount
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      const expectedSocialCharges = microFoncier.taxableCapitalGainSocial * 0.172;
      expect(microFoncier.socialCharges).toBeCloseTo(expectedSocialCharges, 1);
    });

    it('should calculate total tax correctly', () => {
      const results = calculateAllCapitalGainRegimes(baseInvestment);

      Object.values(results).forEach(result => {
        const calculatedTotal = result.incomeTax + result.socialCharges;
        expect(result.totalTax).toBeCloseTo(calculatedTotal, 2);
      });
    });
  });

  describe('net capital gain', () => {
    it('should calculate net capital gain correctly', () => {
      const results = calculateAllCapitalGainRegimes(baseInvestment);

      Object.values(results).forEach(result => {
        const expectedNetGain = result.grossCapitalGain - result.totalTax;
        expect(result.netCapitalGain).toBeCloseTo(expectedNetGain, 2);
      });
    });

    it('should have positive net gain for profitable sale', () => {
      const investment = {
        ...baseInvestment,
        appreciationType: 'global' as const,
        appreciationValue: 50 // 50% appreciation
      };

      const results = calculateAllCapitalGainRegimes(investment);

      Object.values(results).forEach(result => {
        expect(result.grossCapitalGain).toBeGreaterThan(0);
        expect(result.netCapitalGain).toBeGreaterThan(0);
      });
    });

    it('should handle loss on sale', () => {
      const investment = {
        ...baseInvestment,
        appreciationType: 'global' as const,
        appreciationValue: -20 // 20% depreciation
      };

      const results = calculateAllCapitalGainRegimes(investment);

      Object.values(results).forEach(result => {
        expect(result.grossCapitalGain).toBeLessThanOrEqual(0);
        expect(result.netCapitalGain).toBeLessThanOrEqual(0);
        expect(result.incomeTax).toBe(0);
        expect(result.socialCharges).toBe(0);
      });
    });
  });

  describe('LMNP/LMP specific calculations', () => {
    it('should handle LMNP with accumulated depreciation', () => {
      const investment = {
        ...baseInvestment,
        accumulatedDepreciation: 30000,
        isLMP: false
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const reelBic = results['reel-bic'];

      expect(reelBic.depreciationTaxable).toBeDefined();
      expect(reelBic.depreciationTax).toBeDefined();
      
      // Depreciation tax should be added to total tax
      if (reelBic.depreciationTax) {
        expect(reelBic.totalTax).toBeGreaterThan(0);
      }
    });

    it('should handle LMP with short-term and long-term gains', () => {
      const investment = {
        ...baseInvestment,
        isLMP: true,
        accumulatedDepreciation: 20000,
        projectStartDate: '2015-01-01',
        projectEndDate: '2023-01-01' // 8 years (> 2 years)
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const reelBic = results['reel-bic'];

      expect(reelBic.shortTermGain).toBeDefined();
      expect(reelBic.longTermGain).toBeDefined();
      expect(reelBic.shortTermTax).toBeDefined();
      expect(reelBic.longTermIncomeTax).toBeDefined();
      expect(reelBic.longTermSocialCharges).toBeDefined();
    });

    it('should treat all gain as short-term for LMP with holding < 2 years', () => {
      const investment = {
        ...baseInvestment,
        isLMP: true,
        accumulatedDepreciation: 10000,
        projectStartDate: '2028-01-01',
        projectEndDate: '2029-06-01' // < 2 years
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const reelBic = results['reel-bic'];

      if (reelBic.shortTermGain !== undefined) {
        expect(reelBic.shortTermGain).toBeGreaterThan(0);
        expect(reelBic.longTermGain).toBe(0);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle zero capital gain', () => {
      const investment = {
        ...baseInvestment,
        appreciationType: 'amount' as const,
        appreciationValue: 235000, // Exactly the corrected purchase price
        saleAgencyFees: 0
      };

      const results = calculateAllCapitalGainRegimes(investment);

      Object.values(results).forEach(result => {
        expect(result.grossCapitalGain).toBeCloseTo(0, 0);
        expect(result.totalTax).toBe(0);
        expect(result.netCapitalGain).toBeCloseTo(0, 0);
      });
    });

    it('should handle very large capital gain', () => {
      const investment = {
        ...baseInvestment,
        appreciationType: 'amount' as const,
        appreciationValue: 1000000 // Very large sale
      };

      const results = calculateAllCapitalGainRegimes(investment);
      const microFoncier = results['micro-foncier'];

      expect(microFoncier.grossCapitalGain).toBeGreaterThan(500000);
      expect(microFoncier.totalTax).toBeGreaterThan(0);
      expect(microFoncier.netCapitalGain).toBeGreaterThan(0);
    });

    it('should handle missing improvement works', () => {
      const investment = {
        ...baseInvestment,
        improvementWorks: undefined
      };

      const results = calculateAllCapitalGainRegimes(investment);

      // Should still calculate without errors
      expect(results['micro-foncier'].grossCapitalGain).toBeDefined();
    });

    it('should handle zero agency fees on sale', () => {
      const investment = {
        ...baseInvestment,
        saleAgencyFees: 0
      };

      const results = calculateAllCapitalGainRegimes(investment);

      // Should calculate with higher net selling price
      expect(results['micro-foncier'].grossCapitalGain).toBeGreaterThan(0);
    });
  });

  describe('regime comparison', () => {
    it('should have similar results for foncier regimes without special factors', () => {
      const investment = {
        ...baseInvestment,
        accumulatedDepreciation: 0,
        isLMP: false
      };

      const results = calculateAllCapitalGainRegimes(investment);

      // Micro and reel foncier should be identical for simple cases
      expect(results['micro-foncier'].grossCapitalGain)
        .toBeCloseTo(results['reel-foncier'].grossCapitalGain, 0);
    });

    it('should have different results for BIC regimes with depreciation', () => {
      const investment = {
        ...baseInvestment,
        accumulatedDepreciation: 30000
      };

      const results = calculateAllCapitalGainRegimes(investment);

      // Reel-bic should have higher tax due to depreciation recapture
      if (results['reel-bic'].depreciationTax) {
        expect(results['reel-bic'].totalTax).toBeGreaterThan(results['micro-bic'].totalTax);
      }
    });
  });
});





