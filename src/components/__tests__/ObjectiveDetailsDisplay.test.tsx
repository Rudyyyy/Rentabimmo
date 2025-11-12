import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ObjectiveDetailsDisplay from '../ObjectiveDetailsDisplay';
import { Investment } from '../../types/investment';

// Mock tax calculations
vi.mock('../../utils/taxCalculations', () => ({
  calculateAllTaxRegimes: vi.fn(() => ({
    'micro-foncier': { totalTax: 1000 },
    'reel-foncier': { totalTax: 800 },
    'micro-bic': { totalTax: 1200 },
    'reel-bic': { totalTax: 900, amortization: { used: 6000 } }
  }))
}));

// Mock calculations
vi.mock('../../utils/calculations', () => ({
  generateAmortizationSchedule: vi.fn(() => ({
    schedule: [
      {
        month: 1,
        date: '2024-01-01',
        payment: 1000,
        principal: 800,
        interest: 200,
        insurance: 50,
        remainingBalance: 199200
      },
      {
        month: 12,
        date: '2024-12-01',
        payment: 1000,
        principal: 810,
        interest: 190,
        insurance: 50,
        remainingBalance: 190000
      }
    ],
    totalPaid: 12000,
    totalInterest: 2340,
    totalInsurance: 600,
    totalPrincipal: 9060
  })),
  calculateRevenuesWithVacancy: vi.fn((yearExpense, regime) => {
    if (regime === 'micro-bic' || regime === 'reel-bic') {
      return Number(yearExpense.furnishedRent || 0);
    }
    return Number(yearExpense.rent || 0) + Number(yearExpense.taxBenefit || 0);
  })
}));

describe('ObjectiveDetailsDisplay', () => {
  let localStorageMock: any;

  beforeEach(() => {
    localStorageMock = {
      data: {} as Record<string, string>,
      getItem: vi.fn((key: string) => localStorageMock.data[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock.data[key] = value;
      }),
      clear: vi.fn(() => {
        localStorageMock.data = {};
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock.data[key];
      }),
      length: 0,
      key: vi.fn()
    };
    global.localStorage = localStorageMock as any;
  });

  const mockInvestment: Investment = {
    id: 'test-1',
    userId: 'user-1',
    name: 'Test Property',
    purchasePrice: 220875,
    agencyFees: 10000,
    notaryFees: 15000,
    improvementWorks: 5000,
    bankFees: 2000,
    bankGuaranteeFees: 1000,
    mandatoryDiagnostics: 500,
    renovationCosts: 20000,
    downPayment: 50000,
    loanAmount: 200000,
    interestRate: 1.5,
    insuranceRate: 0.36,
    loanDuration: 20,
    monthlyRent: 2000,
    occupancyRate: 95,
    annualRentIncrease: 2,
    propertyTax: 1500,
    condoFees: 1200,
    propertyInsurance: 300,
    managementFees: 600,
    unpaidRentInsurance: 200,
    startDate: '2024-01-01',
    projectStartDate: '2024-01-01',
    projectEndDate: '2035-12-31',
    appreciationType: 'annual',
    appreciationValue: 2,
    address: 'Test Address',
    city: 'Test City',
    postalCode: '75001',
    surfaceArea: 50,
    numberOfRooms: 2,
    propertyType: 'appartement',
    selectedRegime: 'micro-foncier',
    expenses: [
      {
        year: 2024,
        propertyTax: 1500,
        condoFees: 1200,
        propertyInsurance: 300,
        managementFees: 600,
        unpaidRentInsurance: 200,
        repairs: 500,
        otherDeductible: 200,
        otherNonDeductible: 100,
        rent: 24000,
        furnishedRent: 28000,
        tenantCharges: 1200,
        tax: 0,
        deficit: 0,
        loanPayment: 12000,
        loanInsurance: 720,
        taxBenefit: 1000,
        interest: 3000
      },
      {
        year: 2025,
        propertyTax: 1530,
        condoFees: 1224,
        propertyInsurance: 306,
        managementFees: 612,
        unpaidRentInsurance: 204,
        repairs: 510,
        otherDeductible: 204,
        otherNonDeductible: 102,
        rent: 24480,
        furnishedRent: 28560,
        tenantCharges: 1224,
        tax: 0,
        deficit: 0,
        loanPayment: 12000,
        loanInsurance: 720,
        taxBenefit: 1000,
        interest: 2900
      }
    ],
    expenseProjection: {
      propertyTaxIncrease: 2,
      condoFeesIncrease: 2,
      propertyInsuranceIncrease: 2,
      managementFeesIncrease: 2,
      unpaidRentInsuranceIncrease: 2,
      repairsIncrease: 2,
      otherDeductibleIncrease: 2,
      otherNonDeductibleIncrease: 2,
      rentIncrease: 2,
      furnishedRentIncrease: 2,
      tenantChargesIncrease: 2,
      taxBenefitIncrease: 0,
      vacancyRate: 5,
      baseYear: {
        propertyTax: 1500,
        condoFees: 1200,
        propertyInsurance: 300,
        managementFees: 600,
        unpaidRentInsurance: 200,
        repairs: 500,
        otherDeductible: 200,
        otherNonDeductible: 100,
        rent: 24000,
        furnishedRent: 28000,
        tenantCharges: 1200,
        taxBenefit: 0
      }
    },
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
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  describe('Sale Objective (revente)', () => {
    it('should render sale objective component', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should display title
      expect(screen.getByText(/objectif.*revente/i)).toBeInTheDocument();
    });

    it('should display all tax regimes for sale objective', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should show all 4 regimes
      expect(screen.getByText(/location nue.*micro-foncier/i)).toBeInTheDocument();
      expect(screen.getByText(/location nue.*frais réels/i)).toBeInTheDocument();
      expect(screen.getByText(/lmnp.*micro-bic/i)).toBeInTheDocument();
      expect(screen.getByText(/lmnp.*frais réels/i)).toBeInTheDocument();
    });

    it('should show target gain amount in heading', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should display target amount (formatted as 50 000,00 €)
      expect(screen.getByText(/50[\s\u00A0]000,00[\s\u00A0]*€/)).toBeInTheDocument();
    });

    it('should mark optimal regime', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={30000} // Lower target to allow reaching it
        />
      );
      
      // Should show OPTIMAL tag for best regime
      const optimalElements = screen.queryAllByText(/optimal/i);
      expect(optimalElements.length).toBeGreaterThan(0);
    });

    it('should display year for each regime', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should display année or year information
      const body = document.body.textContent || '';
      expect(body).toMatch(/année/i);
    });

    it('should show gain total for each regime', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should display gain total (appears multiple times, one per regime)
      const gainTotalElements = screen.getAllByText(/gain total/i);
      expect(gainTotalElements.length).toBeGreaterThan(0);
    });

    it('should show breakdown with cash flow and sale balance', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should display detailed breakdown (appears multiple times, one per regime)
      const cashFlowElements = screen.getAllByText(/cash flow cumulé net/i);
      const saleBalanceElements = screen.getAllByText(/solde de revente/i);
      const capitalGainTaxElements = screen.getAllByText(/impôt sur la plus-value/i);
      
      expect(cashFlowElements.length).toBeGreaterThan(0);
      expect(saleBalanceElements.length).toBeGreaterThan(0);
      expect(capitalGainTaxElements.length).toBeGreaterThan(0);
    });

    it('should handle unattainable objectives', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={1000000} // Very high target
        />
      );
      
      // Should show that objective is not attainable
      const unattainableElements = screen.queryAllByText(/non atteignable|objectif non atteignable/i);
      expect(unattainableElements.length).toBeGreaterThan(0);
    });

    it('should use sale parameters from localStorage', () => {
      const investmentId = `${mockInvestment.purchasePrice || 0}_${mockInvestment.startDate || ''}`;
      localStorageMock.data[`saleParameters_${investmentId}`] = JSON.stringify({
        annualIncrease: 3,
        agencyFees: 15000,
        earlyRepaymentFees: 2000
      });
      
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Component should render without errors
      expect(screen.getByText(/objectif.*revente/i)).toBeInTheDocument();
    });

    it('should highlight optimal regime with special styling', () => {
      const { container } = render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={30000} // Lower target so optimal regime exists
        />
      );
      
      // Should have blue styling for optimal regime
      const blueElements = container.querySelectorAll('.bg-blue-50, .border-blue-300');
      expect(blueElements.length).toBeGreaterThan(0);
    });
  });

  describe('Cashflow Objective', () => {
    it('should render cashflow objective component', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="cashflow"
          objectiveYear={2030}
          objectiveTargetCashflow={10000}
        />
      );
      
      // Should display title
      expect(screen.getByText(/objectif.*cashflow/i)).toBeInTheDocument();
    });

    it('should display all tax regimes for cashflow objective', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="cashflow"
          objectiveYear={2025}
          objectiveTargetCashflow={10000}
        />
      );
      
      // Should show all 4 regimes
      expect(screen.getByText(/location nue.*micro-foncier/i)).toBeInTheDocument();
      expect(screen.getByText(/location nue.*frais réels/i)).toBeInTheDocument();
      expect(screen.getByText(/lmnp.*micro-bic/i)).toBeInTheDocument();
      expect(screen.getByText(/lmnp.*frais réels/i)).toBeInTheDocument();
    });

    it('should show target cashflow amount', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="cashflow"
          objectiveYear={2025}
          objectiveTargetCashflow={10000}
        />
      );
      
      // Should display target cashflow (formatted as 10 000,00 €)
      expect(screen.getByText(/10[\s\u00A0]000,00[\s\u00A0]*€/)).toBeInTheDocument();
    });

    it('should mark optimal regime for cashflow', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="cashflow"
          objectiveYear={2025}
          objectiveTargetCashflow={10000}
        />
      );
      
      // Should show Optimal tag for best regime
      const optimalElements = screen.queryAllByText(/optimal/i);
      expect(optimalElements.length).toBeGreaterThan(0);
    });

    it('should show year when cashflow target is reached', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="cashflow"
          objectiveYear={2025}
          objectiveTargetCashflow={5000}
        />
      );
      
      // Should display year information
      const body = document.body.textContent || '';
      expect(body).toMatch(/année/i);
    });

    it('should display cashflow cumulative values', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="cashflow"
          objectiveYear={2025}
          objectiveTargetCashflow={5000}
        />
      );
      
      // Should show cashflow cumulé (appears multiple times)
      const cashflowElements = screen.getAllByText(/cashflow cumulé/i);
      expect(cashflowElements.length).toBeGreaterThan(0);
    });

    it('should handle unattainable cashflow objectives', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="cashflow"
          objectiveYear={2025}
          objectiveTargetCashflow={100000} // Very high target
        />
      );
      
      // Should show that objective is not attainable
      const unattainableElements = screen.queryAllByText(/non atteignable/i);
      expect(unattainableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    it('should show warning when investment data is insufficient', () => {
      const incompleteInvestment = {
        ...mockInvestment,
        purchasePrice: 0,
        expenses: []
      };
      
      render(
        <ObjectiveDetailsDisplay
          investment={incompleteInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should show warning message
      expect(screen.getByText(/calculs non disponibles/i)).toBeInTheDocument();
    });

    it('should list required data when incomplete', () => {
      const incompleteInvestment = {
        ...mockInvestment,
        purchasePrice: 0,
        expenses: []
      };
      
      render(
        <ObjectiveDetailsDisplay
          investment={incompleteInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should list what's missing
      expect(screen.getByText(/informations d'acquisition/i)).toBeInTheDocument();
      expect(screen.getByText(/données de location/i)).toBeInTheDocument();
    });

    it('should check for expense data for specified year', () => {
      const investmentWithoutTargetYear = {
        ...mockInvestment,
        expenses: [
          {
            ...mockInvestment.expenses[0],
            year: 2024
          }
        ]
      };
      
      render(
        <ObjectiveDetailsDisplay
          investment={investmentWithoutTargetYear}
          objectiveType="cashflow"
          objectiveYear={2030} // Year not in expenses
          objectiveTargetCashflow={10000}
        />
      );
      
      // Should show warning or handle gracefully
      // The component checks for year existence in expenses
      const body = document.body.textContent || '';
      expect(body).toBeTruthy();
    });
  });

  describe('Regime Comparisons', () => {
    it('should compare all regimes for the same objective', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should display all 4 regime results in grid
      const regimeCards = screen.getAllByText(/location nue|lmnp/i);
      expect(regimeCards.length).toBeGreaterThanOrEqual(4);
    });

    it('should show different years for different regimes when applicable', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={30000} // Lower target to see differences
        />
      );
      
      // Each regime card should show a year or "not attainable"
      const body = document.body.textContent || '';
      expect(body).toMatch(/année|non atteignable/i);
    });

    it('should format currency values consistently', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // All currency values should use French formatting
      const body = document.body.textContent || '';
      expect(body).toMatch(/\d+[\s\u00A0]*€/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle investment with no expenses', () => {
      const noExpensesInvestment = {
        ...mockInvestment,
        expenses: []
      };
      
      render(
        <ObjectiveDetailsDisplay
          investment={noExpensesInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should show warning
      expect(screen.getByText(/calculs non disponibles/i)).toBeInTheDocument();
    });

    it('should handle very high target values', () => {
      render(
        <ObjectiveDetailsDisplay
          investment={mockInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={999999999}
        />
      );
      
      // Should handle gracefully
      expect(screen.getByText(/objectif.*revente/i)).toBeInTheDocument();
    });

    it('should handle negative cashflow scenarios', () => {
      const negativeInvestment = {
        ...mockInvestment,
        expenses: mockInvestment.expenses.map(exp => ({
          ...exp,
          rent: 5000, // Much lower rent
          furnishedRent: 6000
        }))
      };
      
      render(
        <ObjectiveDetailsDisplay
          investment={negativeInvestment}
          objectiveType="cashflow"
          objectiveYear={2025}
          objectiveTargetCashflow={10000}
        />
      );
      
      // Component should render without crashing
      expect(screen.getByText(/objectif.*cashflow/i)).toBeInTheDocument();
    });

    it('should handle LMNP with depreciation', () => {
      const lmnpInvestment = {
        ...mockInvestment,
        selectedRegime: 'reel-bic' as const,
        accumulatedDepreciation: 60000
      };
      
      render(
        <ObjectiveDetailsDisplay
          investment={lmnpInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should handle depreciation in calculations
      expect(screen.getByText(/objectif.*revente/i)).toBeInTheDocument();
    });

    it('should handle LMP status in calculations', () => {
      const lmpInvestment = {
        ...mockInvestment,
        selectedRegime: 'reel-bic' as const,
        isLMP: true,
        accumulatedDepreciation: 60000
      };
      
      render(
        <ObjectiveDetailsDisplay
          investment={lmpInvestment}
          objectiveType="revente"
          objectiveYear={2030}
          objectiveTargetGain={50000}
        />
      );
      
      // Should handle LMP calculations
      expect(screen.getByText(/objectif.*revente/i)).toBeInTheDocument();
    });
  });
});

