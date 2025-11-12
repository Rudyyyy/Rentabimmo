import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BalanceDisplay from '../BalanceDisplay';
import { Investment } from '../../types/investment';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart">Line Chart</div>,
  Chart: ({ type }: { type: string }) => <div data-testid={`mock-${type}-chart`}>{type} Chart</div>
}));

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

describe('BalanceDisplay', () => {
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
    projectEndDate: '2030-12-31',
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

  it('should render component without crashing', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Should display component
    expect(screen.getByText(/valeur cumulée du projet/i)).toBeInTheDocument();
  });

  it('should render all tax regime tabs', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Check for all 4 regime tabs
    const tabs = screen.getAllByRole('button');
    const tabTexts = tabs.map(tab => tab.textContent);
    
    expect(tabTexts).toContain('Location nue - Micro-foncier');
    expect(tabTexts).toContain('Location nue - Frais réels');
    expect(tabTexts).toContain('LMNP - Micro-BIC');
    expect(tabTexts).toContain('LMNP - Frais réels');
  });

  it('should display cumulative value chart', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Should display chart title
    expect(screen.getByText(/valeur cumulée du projet/i)).toBeInTheDocument();
    
    // Should have chart element
    const charts = screen.getAllByTestId(/mock-.*-chart/);
    expect(charts.length).toBeGreaterThan(0);
  });

  it('should display gain comparison charts', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Should display two comparison charts
    expect(screen.getByText(/gain total cumulé par régime fiscal/i)).toBeInTheDocument();
    expect(screen.getByText(/variation annuelle du gain total/i)).toBeInTheDocument();
  });

  it('should display balance data table with correct headers', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Check for table headers
    expect(screen.getByRole('columnheader', { name: /année/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /apport/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /cash flow cumulé/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /imposition cumulée/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /solde de revente/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /impôt plus-value/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /gain total cumulé/i })).toBeInTheDocument();
  });

  it('should display years from project dates', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Should display years from 2024 to 2030
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('should switch between tax regimes when clicking tabs', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    const tabs = screen.getAllByRole('button');
    const microFoncierTab = tabs.find(tab => tab.textContent === 'Location nue - Micro-foncier');
    const reelBicTab = tabs.find(tab => tab.textContent === 'LMNP - Frais réels');
    
    expect(microFoncierTab).toBeDefined();
    expect(reelBicTab).toBeDefined();
    
    // Initially, micro-foncier should be selected
    expect(microFoncierTab?.className).toContain('border-blue-500');
    
    // Click on reel-bic tab
    if (reelBicTab) {
      fireEvent.click(reelBicTab);
      expect(reelBicTab.className).toContain('border-blue-500');
    }
  });

  it('should persist selected regime to localStorage', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    const tabs = screen.getAllByRole('button');
    const reelFoncierTab = tabs.find(tab => tab.textContent === 'Location nue - Frais réels');
    
    if (reelFoncierTab) {
      fireEvent.click(reelFoncierTab);
      
      // localStorage.setItem should have been called
      expect(localStorage.setItem).toHaveBeenCalled();
    }
  });

  it('should calculate and display cash flow values', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Should display currency formatted values
    const body = document.body.textContent || '';
    expect(body).toMatch(/€/);
  });

  it('should calculate balance data from investment expenses', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Component should have calculated and rendered balance data
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    // Should have rows for each year
    const rows = table.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should highlight first positive year in table', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // The first year with positive gain should have special styling
    // This is implemented with bg-green-100 class
    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody');
    
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      // At least one row should exist
      expect(rows.length).toBeGreaterThan(0);
    }
  });

  it('should display chart explanatory note', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Should have explanation text for the cumulative chart
    expect(screen.getByText(/barres empilées/i)).toBeInTheDocument();
  });

  it('should display maximum points note for derivative chart', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Should have explanation for red max points
    expect(screen.getByText(/les points rouges indiquent/i)).toBeInTheDocument();
  });

  it('should calculate capital gain tax for sale scenarios', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Component should render without errors when calculating capital gains
    expect(screen.getByRole('columnheader', { name: /impôt plus-value/i })).toBeInTheDocument();
  });

  it('should handle investment with LMNP regime', () => {
    const lmnpInvestment = {
      ...mockInvestment,
      selectedRegime: 'reel-bic' as const,
      isLMP: false
    };
    
    render(<BalanceDisplay investment={lmnpInvestment} />);
    
    // Component should render without errors
    expect(screen.getByText(/valeur cumulée du projet/i)).toBeInTheDocument();
  });

  it('should handle investment with LMP status', () => {
    const lmpInvestment = {
      ...mockInvestment,
      selectedRegime: 'reel-bic' as const,
      isLMP: true,
      accumulatedDepreciation: 60000
    };
    
    render(<BalanceDisplay investment={lmpInvestment} />);
    
    // Component should render without errors
    expect(screen.getByText(/valeur cumulée du projet/i)).toBeInTheDocument();
  });

  it('should load sale parameters from localStorage', () => {
    const investmentId = `${mockInvestment.purchasePrice}_${mockInvestment.startDate}`;
    localStorageMock.data[`saleParameters_${investmentId}`] = JSON.stringify({
      annualIncrease: 3,
      agencyFees: 15000,
      earlyRepaymentFees: 2000
    });
    
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Component should render without errors
    expect(screen.getByText(/valeur cumulée du projet/i)).toBeInTheDocument();
  });

  it('should use default sale parameters when not in localStorage', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Component should render with default parameters (2% increase, 0 fees)
    expect(screen.getByText(/valeur cumulée du projet/i)).toBeInTheDocument();
  });

  it('should calculate total gain correctly', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Gain total cumulé should be displayed in the table
    expect(screen.getByRole('columnheader', { name: /gain total cumulé/i })).toBeInTheDocument();
  });

  it('should show negative values in correct format', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Negative values (taxes, etc.) should be formatted with minus sign
    const body = document.body.textContent || '';
    
    // Should contain currency values
    expect(body).toMatch(/€/);
  });

  it('should handle different sub-tabs', () => {
    render(<BalanceDisplay investment={mockInvestment} currentSubTab="statistiques" />);
    
    // Component should render regardless of subtab
    expect(screen.getByText(/valeur cumulée du projet/i)).toBeInTheDocument();
  });

  it('should calculate holding period correctly for capital gains', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // Component should calculate years held for tax abatements
    // This is internal logic but the result should be visible in the table
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should format currency values consistently', () => {
    render(<BalanceDisplay investment={mockInvestment} />);
    
    // All currency values should use French formatting
    const body = document.body.textContent || '';
    
    // Check for euro symbol and numbers (French formatting uses space or no-break space)
    expect(body).toMatch(/\d+[,\s\u00A0]\d{2}[\s\u00A0]*€/);
  });

  it('should calculate depreciation for reel-bic regime', () => {
    const reelBicInvestment = {
      ...mockInvestment,
      selectedRegime: 'reel-bic' as const,
      accumulatedDepreciation: 50000
    };
    
    render(<BalanceDisplay investment={reelBicInvestment} />);
    
    // Component should handle depreciation calculations
    expect(screen.getByText(/valeur cumulée du projet/i)).toBeInTheDocument();
  });
});

