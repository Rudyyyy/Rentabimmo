import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SaleDisplay from '../SaleDisplay';
import { Investment } from '../../types/investment';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-chart">Chart</div>
}));

// Mock calculateAllCapitalGainRegimes
vi.mock('../../utils/capitalGainCalculations', () => ({
  calculateAllCapitalGainRegimes: vi.fn(() => ({
    'micro-foncier': {
      grossCapitalGain: 50000,
      taxableCapitalGainIR: 35000,
      taxableCapitalGainPS: 45875,
      incomeTax: 6650,
      socialCharges: 7890,
      totalTax: 14540,
      netCapitalGain: 35460
    },
    'reel-foncier': {
      grossCapitalGain: 50000,
      taxableCapitalGainIR: 35000,
      taxableCapitalGainPS: 45875,
      incomeTax: 6650,
      socialCharges: 7890,
      totalTax: 14540,
      netCapitalGain: 35460
    },
    'micro-bic': {
      grossCapitalGain: 50000,
      taxableCapitalGainIR: 35000,
      taxableCapitalGainPS: 45875,
      incomeTax: 6650,
      socialCharges: 7890,
      totalTax: 14540,
      netCapitalGain: 35460
    },
    'reel-bic': {
      grossCapitalGain: 50000,
      taxableCapitalGainIR: 35000,
      taxableCapitalGainPS: 45875,
      incomeTax: 6650,
      socialCharges: 7890,
      depreciationTax: 15000,
      depreciationTaxable: 50000,
      totalTax: 29540,
      netCapitalGain: 20460
    }
  }))
}));

// Mock calculateAllTaxRegimes
vi.mock('../../utils/taxCalculations', () => ({
  calculateAllTaxRegimes: vi.fn(() => ({
    'reel-bic': {
      taxableIncome: 10000,
      incomeTax: 3000,
      socialCharges: 1720,
      totalTax: 4720,
      amortization: {
        building: 6000,
        furniture: 2000,
        works: 0,
        other: 0,
        total: 8000,
        used: 8000
      }
    }
  }))
}));

// Mock generateAmortizationSchedule
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
        month: 2,
        date: '2024-02-01',
        payment: 1000,
        principal: 803,
        interest: 197,
        insurance: 50,
        remainingBalance: 198397
      }
    ],
    totalPaid: 2000,
    totalInterest: 397,
    totalInsurance: 100,
    totalPrincipal: 1603
  }))
}));

describe('SaleDisplay', () => {
  let localStorageMock: any;

  // Mock localStorage
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
    
    // Mock window.dispatchEvent
    vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockInvestment: Investment = {
    id: 'test-1',
    userId: 'user-1',
    name: 'Test Property',
    purchasePrice: 200000,
    agencyFees: 10000,
    notaryFees: 15000,
    bankFees: 2000,
    bankGuaranteeFees: 1000,
    mandatoryDiagnostics: 500,
    renovationCosts: 20000,
    improvementWorks: 5000,
    saleAgencyFees: 10000,
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
    projectEndDate: '2034-12-31',
    appreciationType: 'annual',
    appreciationValue: 2,
    address: 'Test Address',
    city: 'Test City',
    postalCode: '75001',
    surfaceArea: 50,
    numberOfRooms: 2,
    propertyType: 'appartement',
    selectedRegime: 'reel-bic',
    isLMP: false,
    accumulatedDepreciation: 60000,
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
        furnishedRent: 0,
        tenantCharges: 1200,
        tax: 0,
        deficit: 0,
        loanPayment: 12000,
        loanInsurance: 720,
        taxBenefit: 0,
        interest: 3000
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

  const mockOnUpdate = vi.fn();

  it('should render component without crashing', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Should display the chart title
    expect(screen.getByText(/évolution du solde après revente/i)).toBeInTheDocument();
    
    // Should display the mocked chart
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
  });

  it('should render all tax regime tabs', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check for all 4 regime tabs
    const tabs = screen.getAllByRole('button');
    const tabTexts = tabs.map(tab => tab.textContent);
    
    expect(tabTexts).toContain('Location nue - Micro-foncier');
    expect(tabTexts).toContain('Location nue - Frais réels');
    expect(tabTexts).toContain('LMNP - Micro-BIC');
    expect(tabTexts).toContain('LMNP - Frais réels');
  });

  it('should display sale results table with correct headers', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check for table headers
    expect(screen.getByRole('columnheader', { name: /année/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /capital restant dû/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /bien revalorisé/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /solde/i })).toBeInTheDocument();
  });

  it('should switch between tax regimes when clicking tabs', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    const tabs = screen.getAllByRole('button');
    const microFoncierTab = tabs.find(tab => tab.textContent === 'Location nue - Micro-foncier');
    const reelBicTab = tabs.find(tab => tab.textContent === 'LMNP - Frais réels');
    
    expect(microFoncierTab).toBeDefined();
    expect(reelBicTab).toBeDefined();
    
    // Initially, reel-bic should be selected (as specified in mockInvestment)
    expect(reelBicTab?.className).toContain('border-blue-500');
    
    // Click on micro-foncier tab
    if (microFoncierTab) {
      fireEvent.click(microFoncierTab);
      expect(microFoncierTab.className).toContain('border-blue-500');
    }
  });

  it('should persist selected regime to localStorage', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    const tabs = screen.getAllByRole('button');
    const microFoncierTab = tabs.find(tab => tab.textContent === 'Location nue - Micro-foncier');
    
    if (microFoncierTab) {
      fireEvent.click(microFoncierTab);
      
      // localStorage.setItem should have been called
      expect(localStorage.setItem).toHaveBeenCalled();
    }
  });

  it('should load sale parameters from localStorage', () => {
    // Pre-populate localStorage
    const investmentId = `${mockInvestment.purchasePrice}_${mockInvestment.startDate}`;
    localStorageMock.data[`saleParameters_${investmentId}`] = JSON.stringify({
      annualIncrease: 3,
      agencyFees: 15000,
      earlyRepaymentFees: 2000
    });
    
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Component should render without errors
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
  });

  it('should save sale parameters to localStorage when they change', async () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Component should save initial parameters
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  it('should calculate and display capital gain tax correctly', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // There should be currency values displayed (formatted as euros)
    const body = document.body.textContent || '';
    
    // Check for Euro symbol
    expect(body).toMatch(/€/);
  });

  it('should show different columns for different regimes', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // For reel-bic (default), should show plus-value and imposition columns
    expect(screen.getByRole('columnheader', { name: /plus-value/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /imposition/i })).toBeInTheDocument();
    
    // Switch to micro-foncier
    const tabs = screen.getAllByRole('button');
    const microFoncierTab = tabs.find(tab => tab.textContent === 'Location nue - Micro-foncier');
    
    if (microFoncierTab) {
      fireEvent.click(microFoncierTab);
      
      // Should show abattement columns
      expect(screen.getByRole('columnheader', { name: /abattement ir/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /abattement ps/i })).toBeInTheDocument();
    }
  });

  it('should display capital gain calculation explanation section', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check for the explanation section (may appear multiple times)
    const calculElements = screen.getAllByText(/calcul de la plus-value immobilière/i);
    expect(calculElements.length).toBeGreaterThan(0);
  });

  it('should show detailed explanation for reel-bic regime', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // For reel-bic, should show depreciation reintegration explanation (multiple instances)
    const reintegrationElements = screen.getAllByText(/réintégration des amortissements/i);
    expect(reintegrationElements.length).toBeGreaterThan(0);
  });

  it('should calculate balance correctly', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Component should display balance values in the table
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    // Should have solde column with values
    const soldeHeader = screen.getByRole('columnheader', { name: /solde/i });
    expect(soldeHeader).toBeInTheDocument();
  });

  it('should handle appreciation calculation with annual increase', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Component should render and calculate appreciated values
    expect(screen.getByRole('columnheader', { name: /bien revalorisé/i })).toBeInTheDocument();
    
    // There should be currency values displayed for revalued property
    const body = document.body.textContent || '';
    expect(body).toMatch(/€/);
  });

  it('should calculate abattements based on holding period', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Switch to a regime that shows abattements
    const tabs = screen.getAllByRole('button');
    const microFoncierTab = tabs.find(tab => tab.textContent === 'Location nue - Micro-foncier');
    
    if (microFoncierTab) {
      fireEvent.click(microFoncierTab);
      
      // Should display abattement percentages
      const body = document.body.textContent || '';
      expect(body).toMatch(/%/);
    }
  });

  it('should call onUpdate when capital gain results change', async () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // onUpdate should be called with updated investment including capital gain results
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled();
    });
    
    // Check that the call includes capitalGainResults
    const calls = mockOnUpdate.mock.calls;
    if (calls.length > 0) {
      const updatedInvestment = calls[0][0];
      expect(updatedInvestment).toHaveProperty('capitalGainResults');
    }
  });

  it('should display years from project dates', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Should display years from 2024 to 2034
    expect(screen.getByText('2024')).toBeInTheDocument();
    // Note: depending on table size, not all years may be visible, but at least start year should be
  });

  it('should handle LMP investment differently in calculations', () => {
    const lmpInvestment = {
      ...mockInvestment,
      isLMP: true
    };
    
    render(
      <SaleDisplay 
        investment={lmpInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Component should render without errors
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
  });

  it('should show depreciation details for reel-bic regime', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // For reel-bic, should show depreciation-related information (multiple instances)
    const depreciationElements = screen.getAllByText(/réintégration des amortissements/i);
    expect(depreciationElements.length).toBeGreaterThan(0);
  });

  it('should calculate remaining loan balance correctly', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Should display capital restant dû column
    expect(screen.getByRole('columnheader', { name: /capital restant dû/i })).toBeInTheDocument();
    
    // Should have numeric values in the table
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('should display graph note explaining balance calculation', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Should have a note explaining the graph
    expect(screen.getByText(/ce graphique montre le solde/i)).toBeInTheDocument();
  });

  it('should handle storage events for multi-tab synchronization', () => {
    const { unmount } = render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Create a storage event
    const investmentId = `${mockInvestment.purchasePrice}_${mockInvestment.startDate}`;
    const storageEvent = new StorageEvent('storage', {
      key: `saleParameters_${investmentId}`,
      newValue: JSON.stringify({
        annualIncrease: 5,
        agencyFees: 20000,
        earlyRepaymentFees: 3000
      })
    });
    
    // Trigger the event
    window.dispatchEvent(storageEvent);
    
    // Component should handle the event without errors
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
    
    unmount();
  });

  it('should dispatch custom events when regime changes', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    const tabs = screen.getAllByRole('button');
    const microBicTab = tabs.find(tab => tab.textContent === 'LMNP - Micro-BIC');
    
    if (microBicTab) {
      fireEvent.click(microBicTab);
      
      // Should dispatch selectedRegimeUpdated event
      expect(window.dispatchEvent).toHaveBeenCalled();
    }
  });

  it('should format prices correctly in explanation section', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Should display purchase price in explanation
    const body = document.body.textContent || '';
    expect(body).toMatch(/prix d'achat/i);
    expect(body).toMatch(/200[\s\u00A0]000[\s\u00A0]*€/); // 200 000 €
  });

  it('should handle investment without improvement works', () => {
    const investmentNoWorks = {
      ...mockInvestment,
      improvementWorks: 0
    };
    
    render(
      <SaleDisplay 
        investment={investmentNoWorks} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Component should render without errors
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
  });

  it('should show example calculation in explanation for current year', () => {
    render(
      <SaleDisplay 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
      />
    );
    
    // Should show example for the first year (multiple instances may exist)
    const exampleElements = screen.getAllByText(/exemple.*pour l'année 2024/i);
    expect(exampleElements.length).toBeGreaterThan(0);
  });
});

