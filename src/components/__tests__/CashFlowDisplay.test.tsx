import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CashFlowDisplay from '../CashFlowDisplay';
import { Investment } from '../../types/investment';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-chart">Chart</div>
}));

describe('CashFlowDisplay', () => {
  // Mock localStorage
  beforeEach(() => {
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn()
    };
    global.localStorage = localStorageMock as any;
  });

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
    projectStartDate: '2023-01-01',
    projectEndDate: '2025-12-31',
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
        rent: 14400, // 1200 * 12
        furnishedRent: 18000, // For LMNP
        tenantCharges: 1200,
        tax: 0,
        deficit: 0,
        loanPayment: 11000,
        loanInsurance: 700,
        taxBenefit: 0,
        interest: 2000
      },
      {
        year: 2024,
        propertyTax: 1530,
        condoFees: 1224,
        propertyInsurance: 306,
        managementFees: 612,
        unpaidRentInsurance: 204,
        repairs: 510,
        otherDeductible: 204,
        otherNonDeductible: 102,
        rent: 14688,
        furnishedRent: 18360,
        tenantCharges: 1224,
        tax: 0,
        deficit: 0,
        loanPayment: 11000,
        loanInsurance: 700,
        taxBenefit: 0,
        interest: 1900
      },
      {
        year: 2025,
        propertyTax: 1561,
        condoFees: 1248,
        propertyInsurance: 312,
        managementFees: 624,
        unpaidRentInsurance: 208,
        repairs: 520,
        otherDeductible: 208,
        otherNonDeductible: 104,
        rent: 14982,
        furnishedRent: 18727,
        tenantCharges: 1248,
        tax: 0,
        deficit: 0,
        loanPayment: 11000,
        loanInsurance: 700,
        taxBenefit: 0,
        interest: 1800
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
      vacancyRate: 10,
      baseYear: {
        propertyTax: 1500,
        condoFees: 1200,
        propertyInsurance: 300,
        managementFees: 600,
        unpaidRentInsurance: 200,
        repairs: 500,
        otherDeductible: 200,
        otherNonDeductible: 100,
        rent: 14400,
        furnishedRent: 18000,
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
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  };

  it('should render component without crashing', () => {
    render(<CashFlowDisplay investment={mockInvestment} />);
    
    // Should display the chart title
    expect(screen.getByText(/évolution du cash flow net par régime fiscal/i)).toBeInTheDocument();
    
    // Should display the mocked chart
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
  });

  it('should render all tax regime tabs', () => {
    render(<CashFlowDisplay investment={mockInvestment} />);
    
    // Check for all 4 regime tabs
    expect(screen.getByText(/location nue.*micro-foncier/i)).toBeInTheDocument();
    expect(screen.getByText(/location nue.*frais réels/i)).toBeInTheDocument();
    expect(screen.getByText(/lmnp.*micro-bic/i)).toBeInTheDocument();
    expect(screen.getByText(/lmnp.*frais réels/i)).toBeInTheDocument();
  });

  it('should display cash flow table', () => {
    render(<CashFlowDisplay investment={mockInvestment} />);
    
    // Check for table headers (using column headers to avoid ambiguity)
    expect(screen.getAllByText(/année/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: /revenus/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /dépenses/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /cash flow net/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /mensualisé/i })).toBeInTheDocument();
  });

  it('should display years from expenses', () => {
    render(<CashFlowDisplay investment={mockInvestment} />);
    
    // Check that years are displayed
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('should switch between tax regimes when clicking tabs', () => {
    render(<CashFlowDisplay investment={mockInvestment} />);
    
    // Initially, micro-foncier should be selected (default)
    const microFoncierTab = screen.getByText(/location nue.*micro-foncier/i);
    expect(microFoncierTab.className).toContain('border-blue-500');
    
    // Click on another tab
    const microBicTab = screen.getByText(/lmnp.*micro-bic/i);
    fireEvent.click(microBicTab);
    
    // The new tab should be selected
    expect(microBicTab.className).toContain('border-blue-500');
  });

  it('should display calculation details section', () => {
    render(<CashFlowDisplay investment={mockInvestment} />);
    
    // Check for the details section
    expect(screen.getByText(/détail des calculs/i)).toBeInTheDocument();
    
    // Check for subsections using getAllByText since they appear in both table and details
    const revenusElements = screen.getAllByText(/^Revenus$/);
    const depensesElements = screen.getAllByText(/^Dépenses$/);
    const cashFlowElements = screen.getAllByText(/^Cash Flow$/);
    
    expect(revenusElements.length).toBeGreaterThan(0);
    expect(depensesElements.length).toBeGreaterThan(0);
    expect(cashFlowElements.length).toBeGreaterThan(0);
  });

  it('should show different revenue descriptions for different regimes', () => {
    render(<CashFlowDisplay investment={mockInvestment} />);
    
    // For micro-foncier (default), should show "Loyer nu"
    expect(screen.getByText(/loyer nu.*aide fiscale.*charges locataires/i)).toBeInTheDocument();
    
    // Switch to micro-bic
    const microBicTab = screen.getByText(/lmnp.*micro-bic/i);
    fireEvent.click(microBicTab);
    
    // For micro-bic, should show "Loyer meublé"
    expect(screen.getByText(/loyer meublé.*charges locataires/i)).toBeInTheDocument();
  });

  it('should persist selected regime to localStorage', () => {
    render(<CashFlowDisplay investment={mockInvestment} />);
    
    // Click on a different regime
    const reelFoncierTab = screen.getByText(/location nue.*frais réels/i);
    fireEvent.click(reelFoncierTab);
    
    // localStorage.setItem should have been called
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should handle investment with no expenses gracefully', () => {
    const investmentNoExpenses = {
      ...mockInvestment,
      expenses: []
    };
    
    // Should not crash
    const { container } = render(<CashFlowDisplay investment={investmentNoExpenses} />);
    
    // Component should still render
    expect(container.querySelector('.container')).toBeInTheDocument();
  });

  it('should calculate and display cash flow values', () => {
    render(<CashFlowDisplay investment={mockInvestment} />);
    
    // There should be currency values displayed (formatted as euros)
    const body = document.body.textContent || '';
    
    // Check for Euro symbol or currency formatting
    expect(body).toMatch(/€/);
  });
});

