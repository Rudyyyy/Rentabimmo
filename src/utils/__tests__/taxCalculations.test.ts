import { describe, it, expect } from 'vitest';
import {
  calculateAllTaxRegimes,
  isEligibleForMicroFoncier,
  isEligibleForMicroBIC,
  getRecommendedRegime,
  calculateGrossYield,
  calculateAllGrossYields
} from '../taxCalculations';
import { Investment, YearlyExpenses } from '../../types/investment';

describe('taxCalculations', () => {
  const mockInvestment: Investment = {
    id: 'test-tax-1',
    userId: 'user-1',
    name: 'Test Tax Property',
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
    monthlyRent: 800,
    occupancyRate: 95,
    annualRentIncrease: 2,
    propertyTax: 1500,
    condoFees: 1200,
    propertyInsurance: 300,
    managementFees: 600,
    unpaidRentInsurance: 200,
    startDate: '2023-01-01',
    projectStartDate: '2023-01-01',
    projectEndDate: '2043-01-01',
    appreciationType: 'annual',
    appreciationValue: 3,
    address: 'Test Address',
    city: 'Test City',
    postalCode: '75001',
    surfaceArea: 50,
    numberOfRooms: 2,
    propertyType: 'appartement',
    expenses: [
      {
        year: 2023,
        propertyTax: 1500,
        condoFees: 1200,
        propertyInsurance: 300,
        managementFees: 600,
        unpaidRentInsurance: 200,
        repairs: 500,
        otherDeductible: 200,
        otherNonDeductible: 100,
        rent: 9600, // 800 * 12
        furnishedRent: 12000, // For LMNP tests
        tenantCharges: 600,
        tax: 0,
        deficit: 0,
        loanPayment: 1000,
        loanInsurance: 300,
        taxBenefit: 0,
        interest: 2000
      }
    ],
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

  describe('calculateAllTaxRegimes', () => {
    it('should calculate all four tax regimes', () => {
      const results = calculateAllTaxRegimes(mockInvestment, 2023);

      expect(results).toHaveProperty('micro-foncier');
      expect(results).toHaveProperty('reel-foncier');
      expect(results).toHaveProperty('micro-bic');
      expect(results).toHaveProperty('reel-bic');
    });

    it('should calculate micro-foncier correctly', () => {
      const results = calculateAllTaxRegimes(mockInvestment, 2023);
      const microFoncier = results['micro-foncier'];

      expect(microFoncier.regime).toBe('micro-foncier');
      expect(microFoncier.taxableIncome).toBeGreaterThan(0);
      expect(microFoncier.tax).toBeGreaterThanOrEqual(0);
      expect(microFoncier.socialCharges).toBeGreaterThanOrEqual(0);
      expect(microFoncier.totalTax).toBe(microFoncier.tax + microFoncier.socialCharges);
      expect(microFoncier.netIncome).toBeDefined();
      expect(microFoncier.amortization).toBeUndefined();
      expect(microFoncier.deficit).toBeUndefined();
    });

    it('should apply 30% allowance for micro-foncier', () => {
      const results = calculateAllTaxRegimes(mockInvestment, 2023);
      const microFoncier = results['micro-foncier'];
      
      // Annual revenue for micro-foncier is rent only (without vacancy in this test)
      const annualRevenue = 9600; // rent from expenses
      const expectedTaxableIncome = annualRevenue * 0.7; // 30% allowance
      
      expect(microFoncier.taxableIncome).toBeCloseTo(expectedTaxableIncome, 1);
    });

    it('should calculate reel-foncier with deductible expenses', () => {
      const results = calculateAllTaxRegimes(mockInvestment, 2023);
      const reelFoncier = results['reel-foncier'];

      expect(reelFoncier.regime).toBe('reel-foncier');
      expect(reelFoncier.deductibleExpenses).toBeGreaterThan(0);
      expect(reelFoncier.taxableIncome).toBeGreaterThanOrEqual(0);
      expect(reelFoncier.tax).toBeGreaterThanOrEqual(0);
      expect(reelFoncier.socialCharges).toBeGreaterThanOrEqual(0);
      expect(reelFoncier.totalTax).toBe(reelFoncier.tax + reelFoncier.socialCharges);
    });

    it('should handle deficit in reel-foncier', () => {
      const investmentWithDeficit = {
        ...mockInvestment,
        taxParameters: {
          ...mockInvestment.taxParameters,
          previousDeficit: 3000
        }
      };

      const results = calculateAllTaxRegimes(investmentWithDeficit, 2023);
      const reelFoncier = results['reel-foncier'];

      expect(reelFoncier.deficit).toBeDefined();
      expect(reelFoncier.usedDeficit).toBeDefined();
      expect(reelFoncier.taxableIncomeBeforeDeficit).toBeDefined();
    });

    it('should calculate micro-bic correctly', () => {
      const results = calculateAllTaxRegimes(mockInvestment, 2023);
      const microBic = results['micro-bic'];

      expect(microBic.regime).toBe('micro-bic');
      expect(microBic.taxableIncome).toBeGreaterThan(0);
      expect(microBic.tax).toBeGreaterThanOrEqual(0);
      expect(microBic.socialCharges).toBeGreaterThanOrEqual(0);
      expect(microBic.totalTax).toBe(microBic.tax + microBic.socialCharges);
      expect(microBic.amortization).toBeUndefined();
    });

    it('should apply 50% allowance for micro-bic', () => {
      const results = calculateAllTaxRegimes(mockInvestment, 2023);
      const microBic = results['micro-bic'];
      
      // Annual revenue for micro-bic is furnished rent only
      const annualRevenue = 12000; // furnished rent from expenses
      const expectedTaxableIncome = annualRevenue * 0.5; // 50% allowance
      
      expect(microBic.taxableIncome).toBeCloseTo(expectedTaxableIncome, 1);
    });

    it('should calculate reel-bic with amortization', () => {
      const results = calculateAllTaxRegimes(mockInvestment, 2023);
      const reelBic = results['reel-bic'];

      expect(reelBic.regime).toBe('reel-bic');
      expect(reelBic.deductibleExpenses).toBeGreaterThan(0);
      expect(reelBic.amortization).toBeDefined();
      expect(reelBic.amortization?.building).toBeGreaterThan(0);
      expect(reelBic.amortization?.furniture).toBeGreaterThan(0);
      expect(reelBic.amortization?.total).toBeGreaterThan(0);
      expect(reelBic.amortization?.used).toBeDefined();
      expect(reelBic.amortization?.carriedForward).toBeDefined();
    });

    it('should calculate amortization correctly for reel-bic', () => {
      const results = calculateAllTaxRegimes(mockInvestment, 2023);
      const reelBic = results['reel-bic'];

      const expectedBuildingAmortization = 150000 / 25; // 6000
      const expectedFurnitureAmortization = 10000 / 5; // 2000
      const expectedWorksAmortization = 5000 / 10; // 500

      expect(reelBic.amortization?.building).toBeCloseTo(expectedBuildingAmortization, 1);
      expect(reelBic.amortization?.furniture).toBeCloseTo(expectedFurnitureAmortization, 1);
      expect(reelBic.amortization?.works).toBeCloseTo(expectedWorksAmortization, 1);
    });

    it('should ensure totalTax equals tax + socialCharges for all regimes', () => {
      const results = calculateAllTaxRegimes(mockInvestment, 2023);

      Object.values(results).forEach(result => {
        const calculatedTotal = result.tax + result.socialCharges;
        expect(result.totalTax).toBeCloseTo(calculatedTotal, 2);
      });
    });
  });

  describe('eligibility checks', () => {
    it('should check micro-foncier eligibility correctly', () => {
      // Annual rent is 9600, which is below 15000 threshold
      const eligible = isEligibleForMicroFoncier(mockInvestment, 2023);
      expect(eligible).toBe(true);

      // Create investment with high rent (above threshold)
      const highRentInvestment = {
        ...mockInvestment,
        expenses: [
          {
            ...mockInvestment.expenses[0],
            rent: 20000
          }
        ]
      };

      const notEligible = isEligibleForMicroFoncier(highRentInvestment, 2023);
      expect(notEligible).toBe(false);
    });

    it('should check micro-bic eligibility correctly', () => {
      // Furnished rent is 12000, which is below 72600 threshold
      const eligible = isEligibleForMicroBIC(mockInvestment, 2023);
      expect(eligible).toBe(true);

      // Create investment with high rent (above threshold)
      const highRentInvestment = {
        ...mockInvestment,
        expenses: [
          {
            ...mockInvestment.expenses[0],
            furnishedRent: 80000
          }
        ]
      };

      const notEligible = isEligibleForMicroBIC(highRentInvestment, 2023);
      expect(notEligible).toBe(false);
    });
  });

  describe('getRecommendedRegime', () => {
    it('should recommend the regime with highest net income', () => {
      const recommended = getRecommendedRegime(mockInvestment, 2023);
      
      expect(recommended).toBeDefined();
      expect(['micro-foncier', 'reel-foncier', 'micro-bic', 'reel-bic']).toContain(recommended);

      // Verify it's actually the best one
      const results = calculateAllTaxRegimes(mockInvestment, 2023);
      const recommendedResult = results[recommended];
      
      Object.values(results).forEach(result => {
        expect(recommendedResult.netIncome).toBeGreaterThanOrEqual(result.netIncome);
      });
    });

    it('should not recommend ineligible micro regimes', () => {
      const highIncomeInvestment = {
        ...mockInvestment,
        expenses: [
          {
            ...mockInvestment.expenses[0],
            rent: 20000, // Above micro-foncier threshold
            furnishedRent: 80000 // Above micro-bic threshold
          }
        ]
      };

      const recommended = getRecommendedRegime(highIncomeInvestment, 2023);
      
      // Should recommend reel regime since micro is not eligible
      expect(['reel-foncier', 'reel-bic']).toContain(recommended);
    });
  });

  describe('calculateGrossYield', () => {
    const yearExpenses: YearlyExpenses = {
      year: 2023,
      propertyTax: 1500,
      condoFees: 1200,
      propertyInsurance: 300,
      managementFees: 600,
      unpaidRentInsurance: 200,
      repairs: 500,
      otherDeductible: 200,
      otherNonDeductible: 100,
      rent: 12000,
      furnishedRent: 15000,
      tenantCharges: 1200,
      tax: 0,
      deficit: 0,
      loanPayment: 1000,
      loanInsurance: 300,
      taxBenefit: 500,
      interest: 2000
    };

    it('should calculate gross yield for unfurnished rental', () => {
      const yield1 = calculateGrossYield(mockInvestment, 2023, 'micro-foncier', yearExpenses);
      
      expect(yield1).toBeGreaterThan(0);
      expect(yield1).toBeLessThan(100); // Reasonable yield
      
      // Manual calculation
      const totalRevenue = 12000 + 500 + 1200; // rent + taxBenefit + tenantCharges
      const totalInvestment = 200000 + 10000 + 20000; // purchase + agency + renovation
      const expectedYield = (totalRevenue / totalInvestment) * 100;
      
      expect(yield1).toBeCloseTo(expectedYield, 1);
    });

    it('should calculate gross yield for furnished rental', () => {
      const yield1 = calculateGrossYield(mockInvestment, 2023, 'micro-bic', yearExpenses);
      
      expect(yield1).toBeGreaterThan(0);
      
      // Manual calculation
      const totalRevenue = 15000 + 1200; // furnishedRent + tenantCharges
      const totalInvestment = 200000 + 10000 + 20000;
      const expectedYield = (totalRevenue / totalInvestment) * 100;
      
      expect(yield1).toBeCloseTo(expectedYield, 1);
    });

    it('should handle vacancy rate in gross yield calculation', () => {
      const investmentWithVacancy = {
        ...mockInvestment,
        expenseProjection: {
          ...mockInvestment.expenseProjection,
          vacancyRate: 10
        }
      };

      const yieldWithVacancy = calculateGrossYield(
        investmentWithVacancy,
        2023,
        'micro-foncier',
        yearExpenses
      );
      const yieldWithoutVacancy = calculateGrossYield(
        mockInvestment,
        2023,
        'micro-foncier',
        yearExpenses
      );

      expect(yieldWithVacancy).toBeLessThan(yieldWithoutVacancy);
    });
  });

  describe('calculateAllGrossYields', () => {
    it('should calculate gross yields for all regimes', () => {
      const yields = calculateAllGrossYields(mockInvestment, 2023);

      expect(yields).toHaveProperty('micro-foncier');
      expect(yields).toHaveProperty('reel-foncier');
      expect(yields).toHaveProperty('micro-bic');
      expect(yields).toHaveProperty('reel-bic');

      Object.values(yields).forEach(yield1 => {
        expect(yield1).toBeGreaterThanOrEqual(0);
        expect(yield1).toBeLessThan(1000); // Sanity check
      });
    });

    it('should have same yields for same rental type', () => {
      const yields = calculateAllGrossYields(mockInvestment, 2023);

      // Micro and reel foncier should have same gross yield (same revenue base)
      expect(yields['micro-foncier']).toBeCloseTo(yields['reel-foncier'], 2);
      
      // Micro and reel BIC should have same gross yield (same revenue base)
      expect(yields['micro-bic']).toBeCloseTo(yields['reel-bic'], 2);
    });

    it('should handle missing expenses gracefully', () => {
      const investmentWithoutExpenses = {
        ...mockInvestment,
        expenses: []
      };

      const yields = calculateAllGrossYields(investmentWithoutExpenses, 2023);

      Object.values(yields).forEach(yield1 => {
        expect(yield1).toBe(0); // Should return 0 when no expenses data
      });
    });
  });

  describe('📅 Années partielles (couverture partielle)', () => {
    it('should adjust revenues for partial year starting mid-year', () => {
      // Projet commençant le 1er septembre (4 mois en 2024)
      const partialYearInvestment: Investment = {
        ...mockInvestment,
        projectStartDate: '2024-09-01',
        projectEndDate: '2044-12-31',
        expenses: [
          {
            ...mockInvestment.expenses[0],
            year: 2024,
            rent: 12000, // Loyer annualisé
            furnishedRent: 15000 // Loyer meublé annualisé
          }
        ]
      };

      const results = calculateAllTaxRegimes(partialYearInvestment, 2024);

      // Avec 4 mois sur 12, la couverture est environ 4/12 = 0.333
      // Le loyer réel devrait être environ 12000 * 0.333 = 4000€
      // Le revenu imposable pour micro-foncier devrait être environ 4000 * 0.7 = 2800€
      expect(results['micro-foncier'].taxableIncome).toBeLessThan(5000);
      expect(results['micro-foncier'].taxableIncome).toBeGreaterThan(2000);

      // Pour micro-bic avec 15000€ annualisés
      // Loyer réel: 15000 * 0.333 = 5000€
      // Revenu imposable: 5000 * 0.5 = 2500€
      expect(results['micro-bic'].taxableIncome).toBeLessThan(3500);
      expect(results['micro-bic'].taxableIncome).toBeGreaterThan(1500);
    });

    it('should adjust expenses for partial year starting mid-year', () => {
      // Projet commençant le 1er juillet (6 mois en 2024)
      const partialYearInvestment: Investment = {
        ...mockInvestment,
        projectStartDate: '2024-07-01',
        projectEndDate: '2044-12-31',
        expenses: [
          {
            ...mockInvestment.expenses[0],
            year: 2024,
            rent: 12000, // Loyer annualisé
            propertyTax: 1200, // Taxe foncière annualisée
            interest: 2400 // Intérêts annualisés
          }
        ]
      };

      const results = calculateAllTaxRegimes(partialYearInvestment, 2024);

      // Avec 6 mois sur 12, les charges déductibles devraient être réduites de moitié
      expect(results['reel-foncier'].deductibleExpenses).toBeDefined();
      if (results['reel-foncier'].deductibleExpenses) {
        // Les charges annualisées totales incluent toutes les charges du mockInvestment
        // Pour 6 mois: environ la moitié des charges annuelles
        expect(results['reel-foncier'].deductibleExpenses).toBeLessThan(5000);
        expect(results['reel-foncier'].deductibleExpenses).toBeGreaterThan(1000);
      }
    });

    it('should handle full year correctly (coverage = 1)', () => {
      // Année complète
      const fullYearInvestment: Investment = {
        ...mockInvestment,
        projectStartDate: '2024-01-01',
        projectEndDate: '2044-12-31',
        expenses: [
          {
            ...mockInvestment.expenses[0],
            year: 2024,
            rent: 12000
          }
        ]
      };

      const results = calculateAllTaxRegimes(fullYearInvestment, 2024);

      // Pour une année complète avec 12000€ de loyer
      // Revenu imposable micro-foncier: 12000 * 0.7 = 8400€
      expect(results['micro-foncier'].taxableIncome).toBeCloseTo(8400, 0);
    });

    it('should handle project ending mid-year', () => {
      // Projet se terminant le 30 juin (6 mois en 2024)
      const partialYearInvestment: Investment = {
        ...mockInvestment,
        projectStartDate: '2024-01-01',
        projectEndDate: '2024-06-30',
        expenses: [
          {
            ...mockInvestment.expenses[0],
            year: 2024,
            rent: 12000, // Loyer annualisé
            furnishedRent: 15000
          }
        ]
      };

      const results = calculateAllTaxRegimes(partialYearInvestment, 2024);

      // 6 mois sur 12 = environ 0.5 de couverture (peut varier légèrement selon le nombre exact de jours)
      // Loyer réel: 12000 * ~0.5 = ~6000€
      // Revenu imposable micro-foncier: ~6000 * 0.7 = ~4200€
      expect(results['micro-foncier'].taxableIncome).toBeGreaterThan(4000);
      expect(results['micro-foncier'].taxableIncome).toBeLessThan(4400);
    });

    it('should calculate correct tax for partial year', () => {
      // Projet commençant le 1er octobre (3 mois en 2024)
      const partialYearInvestment: Investment = {
        ...mockInvestment,
        projectStartDate: '2024-10-01',
        projectEndDate: '2044-12-31',
        expenses: [
          {
            ...mockInvestment.expenses[0],
            year: 2024,
            rent: 12000 // Loyer annualisé
          }
        ],
        taxParameters: {
          ...mockInvestment.taxParameters,
          taxRate: 30,
          socialChargesRate: 17.2
        }
      };

      const results = calculateAllTaxRegimes(partialYearInvestment, 2024);

      // 3 mois sur 12 = environ 0.25 de couverture
      // Loyer réel: 12000 * ~0.25 = ~3000€
      // Revenu imposable: ~3000 * 0.7 = ~2100€
      // Impôt: ~2100 * 0.30 = ~630€
      // Prélèvements sociaux: ~2100 * 0.172 = ~361.2€
      // Total: ~991.2€

      expect(results['micro-foncier'].taxableIncome).toBeGreaterThan(2000);
      expect(results['micro-foncier'].taxableIncome).toBeLessThan(2200);
      expect(results['micro-foncier'].tax).toBeGreaterThan(600);
      expect(results['micro-foncier'].tax).toBeLessThan(660);
      expect(results['micro-foncier'].totalTax).toBeGreaterThan(950);
      expect(results['micro-foncier'].totalTax).toBeLessThan(1050);
    });
  });
});



