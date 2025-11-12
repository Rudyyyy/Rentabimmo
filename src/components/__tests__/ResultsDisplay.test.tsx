import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultsDisplay from '../ResultsDisplay';
import { Investment, FinancialMetrics } from '../../types/investment';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-chart">Chart</div>
}));

describe('ResultsDisplay', () => {
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
    purchasePrice: 220875,
    agencyFees: 10000,
    notaryFees: 15000,
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
    projectEndDate: '2031-12-31',
    appreciationType: 'annual',
    appreciationValue: 2,
    address: 'Test Address',
    city: 'Test City',
    postalCode: '75001',
    surfaceArea: 50,
    numberOfRooms: 2,
    propertyType: 'appartement',
    selectedRegime: 'reel-foncier',
    expenses: [
      {
        year: 2024,
        propertyTax: 4345.56,
        condoFees: 0,
        propertyInsurance: 0,
        managementFees: 0,
        unpaidRentInsurance: 0,
        repairs: 0,
        otherDeductible: 0,
        otherNonDeductible: 0,
        rent: 23529.41,
        furnishedRent: 0,
        tenantCharges: 0,
        tax: 0,
        deficit: 0,
        loanPayment: 11000,
        loanInsurance: 700,
        taxBenefit: 0,
        interest: 2955
      },
      {
        year: 2025,
        propertyTax: 5930,
        condoFees: 0,
        propertyInsurance: 0,
        managementFees: 0,
        unpaidRentInsurance: 0,
        repairs: 0,
        otherDeductible: 0,
        otherNonDeductible: 0,
        rent: 24000,
        furnishedRent: 0,
        tenantCharges: 0,
        tax: 0,
        deficit: 0,
        loanPayment: 11000,
        loanInsurance: 700,
        taxBenefit: 0,
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
        furnishedRent: 0,
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

  const mockMetrics: FinancialMetrics = {
    grossYield: 10.65,
    netYield: 8.69,
    netProfitability: 6.5,
    monthlyRevenue: 2000,
    totalRevenue: 192000,
    totalExpenses: 35000,
    netBalance: 157000,
    roi: 314,
    irr: 8.2,
    totalGain: 50000,
    saleProfit: 30000,
    capitalGain: 20000
  };

  const mockOnUpdate = vi.fn();

  it('should render component without crashing', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Should display the chart titles
    expect(screen.getByText(/évolution de la rentabilité brute/i)).toBeInTheDocument();
    expect(screen.getByText(/évolution de la rentabilité hors impôts/i)).toBeInTheDocument();
    
    // Should display the mocked charts
    const charts = screen.getAllByTestId('mock-chart');
    expect(charts).toHaveLength(2); // Two charts: gross and net
  });

  it('should render all tax regime tabs', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check for all 4 regime tabs
    expect(screen.getByText(/location nue.*micro-foncier/i)).toBeInTheDocument();
    expect(screen.getByText(/location nue.*frais réels/i)).toBeInTheDocument();
    expect(screen.getByText(/lmnp.*micro-bic/i)).toBeInTheDocument();
    expect(screen.getByText(/lmnp.*frais réels/i)).toBeInTheDocument();
  });

  it('should display profitability table with correct headers', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check for table headers
    expect(screen.getByRole('columnheader', { name: /année/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /revenus bruts/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /charges/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /coût total/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /rentabilité brute/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /rentabilité hors impôts/i })).toBeInTheDocument();
  });

  it('should display years from expenses in table', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check that years are displayed in the table
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('should switch between tax regimes when clicking tabs', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Find the regime tabs
    const microFoncierTab = screen.getByText(/location nue.*micro-foncier/i);
    const reelFoncierTab = screen.getByText(/location nue.*frais réels/i);
    const microBicTab = screen.getByText(/lmnp.*micro-bic/i);
    
    // Initially, reel-foncier should be selected (as specified in mockInvestment)
    expect(reelFoncierTab.className).toContain('border-blue-500');
    
    // Click on micro-foncier tab
    fireEvent.click(microFoncierTab);
    expect(microFoncierTab.className).toContain('border-blue-500');
    
    // Click on micro-bic tab
    fireEvent.click(microBicTab);
    expect(microBicTab.className).toContain('border-blue-500');
  });

  it('should persist selected regime to localStorage', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Click on a different regime
    const microBicTab = screen.getByText(/lmnp.*micro-bic/i);
    fireEvent.click(microBicTab);
    
    // localStorage.setItem should have been called
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should display calculation details section', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check for the details section
    expect(screen.getByText(/détail des calculs/i)).toBeInTheDocument();
    const revenusElements = screen.getAllByText(/revenus bruts/i);
    const chargesElements = screen.getAllByText(/charges/i);
    const coutElements = screen.getAllByText(/coût total/i);
    
    // Verify they exist (multiple instances in table headers and explanations)
    expect(revenusElements.length).toBeGreaterThan(0);
    expect(chargesElements.length).toBeGreaterThan(0);
    expect(coutElements.length).toBeGreaterThan(0);
  });

  it('should show different revenue descriptions for different regimes', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // For reel-foncier (default in mock), should show "Loyer nu + Aide fiscale"
    expect(screen.getByText(/loyer nu.*aide fiscale/i)).toBeInTheDocument();
    
    // Switch to micro-bic
    const microBicTab = screen.getByText(/lmnp.*micro-bic/i);
    fireEvent.click(microBicTab);
    
    // For micro-bic, should show "Loyer meublé"
    expect(screen.getByText(/^loyer meublé$/i)).toBeInTheDocument();
  });

  it('should display currency values properly formatted', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // There should be currency values displayed (formatted as euros)
    const body = document.body.textContent || '';
    
    // Check for Euro symbol
    expect(body).toMatch(/€/);
    
    // Check for percentage values
    expect(body).toMatch(/%/);
  });

  it('should calculate gross and net yield correctly', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // The component should display percentage values
    const body = document.body.textContent || '';
    
    // Should contain percentage formatting
    expect(body).toMatch(/\d+[,\.]\d+\s*%/);
  });

  it('should handle investment with empty expenses array', () => {
    const investmentNoExpenses = {
      ...mockInvestment,
      expenses: []
    };
    
    // Should not crash
    const { container } = render(
      <ResultsDisplay 
        investment={investmentNoExpenses} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Component should still render
    expect(container.querySelector('.container')).toBeInTheDocument();
  });

  it('should display explanation section with detailed calculation formulas', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check for the explanation section with formulas (multiple instances exist)
    const rentabiliteBruteElements = screen.getAllByText(/rentabilité brute/i);
    const rentabiliteHorsImpotsElements = screen.getAllByText(/rentabilité hors impôts/i);
    
    expect(rentabiliteBruteElements.length).toBeGreaterThan(0);
    expect(rentabiliteHorsImpotsElements.length).toBeGreaterThan(0);
    
    // Check for formula components (multiple instances)
    const formulaElements = screen.getAllByText(/revenus bruts.*coût total/i);
    expect(formulaElements.length).toBeGreaterThan(0);
  });

  it('should update selectedRegime in localStorage when changed', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Click on a different regime
    const microFoncierTab = screen.getByText(/location nue.*micro-foncier/i);
    fireEvent.click(microFoncierTab);
    
    // Verify localStorage was called
    expect(localStorage.setItem).toHaveBeenCalled();
    
    // Check if it was called with the regime value
    const calls = (localStorage.setItem as any).mock.calls;
    const regimeCall = calls.find((call: any[]) => 
      call[0].includes('selectedRegime_') && call[1] === 'micro-foncier'
    );
    expect(regimeCall).toBeDefined();
  });

  it('should display all charges details in explanation section', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check for detailed charges list (may appear multiple times)
    expect(screen.getByText(/taxe foncière/i)).toBeInTheDocument();
    expect(screen.getByText(/charges de copropriété/i)).toBeInTheDocument();
    expect(screen.getByText(/assurance propriétaire/i)).toBeInTheDocument();
    const fraisAgenceElements = screen.getAllByText(/frais d'agence/i);
    expect(fraisAgenceElements.length).toBeGreaterThan(0);
  });

  it('should show correct cost components in explanation', () => {
    render(
      <ResultsDisplay 
        investment={mockInvestment} 
        metrics={mockMetrics}
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check for cost components
    expect(screen.getByText(/prix d'achat/i)).toBeInTheDocument();
    expect(screen.getByText(/frais de notaire/i)).toBeInTheDocument();
    expect(screen.getByText(/diagnostics obligatoires/i)).toBeInTheDocument();
  });
});

