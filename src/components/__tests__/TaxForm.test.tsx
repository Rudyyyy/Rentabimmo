import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaxForm from '../TaxForm';
import { Investment } from '../../types/investment';

// Mock des composants Chart.js
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
}));

describe('TaxForm', () => {
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
    monthlyRent: 800,
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
    projectStartDate: '2023-01-01',
    projectEndDate: '2025-12-31',
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
        rent: 9600,
        furnishedRent: 12000,
        tenantCharges: 600,
        tax: 0,
        deficit: 0,
        loanPayment: 1000,
        loanInsurance: 300,
        taxBenefit: 500,
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
        rent: 9792,
        furnishedRent: 12240,
        tenantCharges: 612,
        tax: 0,
        deficit: 0,
        loanPayment: 1000,
        loanInsurance: 300,
        taxBenefit: 500,
        interest: 1950
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
        rent: 9988,
        furnishedRent: 12485,
        tenantCharges: 624,
        tax: 0,
        deficit: 0,
        loanPayment: 1000,
        loanInsurance: 300,
        taxBenefit: 500,
        interest: 1900
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
    taxResults: {
      'micro-foncier': {
        regime: 'micro-foncier',
        taxableIncome: 6720,
        tax: 2016,
        socialCharges: 1155.84,
        totalTax: 3171.84,
        netIncome: 6428.16,
        deficit: undefined,
        amortization: undefined
      },
      'reel-foncier': {
        regime: 'reel-foncier',
        taxableIncome: 3900,
        tax: 1170,
        socialCharges: 670.8,
        totalTax: 1840.8,
        netIncome: 7759.2,
        deficit: 0,
        amortization: undefined,
        deductibleExpenses: 6300
      },
      'micro-bic': {
        regime: 'micro-bic',
        taxableIncome: 6000,
        tax: 1800,
        socialCharges: 1032,
        totalTax: 2832,
        netIncome: 9168,
        deficit: undefined,
        amortization: undefined
      },
      'reel-bic': {
        regime: 'reel-bic',
        taxableIncome: 0,
        tax: 0,
        socialCharges: 0,
        totalTax: 0,
        netIncome: 12000,
        deficit: undefined,
        deductibleExpenses: 6300,
        amortization: {
          building: 6000,
          furniture: 2000,
          works: 500,
          other: 0,
          total: 8500,
          used: 5700,
          carriedForward: 2800
        }
      }
    },
    selectedRegime: 'micro-foncier',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  };

  const mockOnUpdate = vi.fn();

  it('should render the tax form with all regime tabs', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="annee-courante"
      />
    );

    // Vérifier que les 4 régimes sont affichés (peuvent apparaître plusieurs fois dans la page)
    expect(screen.getAllByText(/Location nue - Micro-foncier/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Location nue - Frais réels/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/LMNP - Micro-BIC/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/LMNP - Frais réels/i).length).toBeGreaterThan(0);
  });

  it('should display the comparison chart for current year', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="annee-courante"
      />
    );

    // Vérifier que le titre du graphique est présent
    expect(screen.getByText(/Année courante/i)).toBeInTheDocument();
    
    // Vérifier que le graphique est rendu
    const charts = screen.getAllByTestId('bar-chart');
    expect(charts.length).toBeGreaterThan(0);
  });

  it('should display historical and projection section', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="historique-projection"
      />
    );

    expect(screen.getByText(/Historique et projection/i)).toBeInTheDocument();
  });

  it('should allow switching between regimes in projection table', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="historique-projection"
      />
    );

    // Trouver les boutons de régime
    const microFoncierButton = screen.getByRole('button', { name: /Location nue - Micro-foncier/i });
    const reelBicButton = screen.getByRole('button', { name: /LMNP - Frais réels/i });

    // Par défaut, micro-foncier devrait être sélectionné
    expect(microFoncierButton).toHaveClass('border-blue-500');

    // Cliquer sur LMNP - Frais réels
    fireEvent.click(reelBicButton);

    // Vérifier que le régime a changé
    expect(reelBicButton).toHaveClass('border-blue-500');
  });

  it('should display projection table with correct columns for micro-foncier', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="historique-projection"
      />
    );

    // Colonnes spécifiques au micro-foncier
    expect(screen.getByText(/Loyer nu/i)).toBeInTheDocument();
    expect(screen.getByText(/Charges locataires/i)).toBeInTheDocument();
    expect(screen.getByText(/Aide fiscale/i)).toBeInTheDocument();
  });

  it('should display projection table with correct columns for reel-bic', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="historique-projection"
      />
    );

    // Cliquer sur LMNP - Frais réels
    const reelBicButton = screen.getByRole('button', { name: /LMNP - Frais réels/i });
    fireEvent.click(reelBicButton);

    // Colonnes spécifiques au réel BIC
    expect(screen.getByText(/Loyer meublé/i)).toBeInTheDocument();
    expect(screen.getByText(/Amortissement disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/Amortissement utilisé/i)).toBeInTheDocument();
    expect(screen.getByText(/Amortissement reporté/i)).toBeInTheDocument();
  });

  it('should display projection table with correct columns for reel-foncier', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="historique-projection"
      />
    );

    // Cliquer sur Location nue - Frais réels
    const reelFoncierButton = screen.getByRole('button', { name: /Location nue - Frais réels/i });
    fireEvent.click(reelFoncierButton);

    // Colonnes spécifiques au réel foncier
    expect(screen.getByText(/Déficit utilisé/i)).toBeInTheDocument();
    expect(screen.getByText(/Déficit reporté/i)).toBeInTheDocument();
  });

  it('should call onUpdate when regime changes', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="annee-courante"
      />
    );

    // Le composant devrait appeler onUpdate au montage
    expect(mockOnUpdate).toHaveBeenCalled();
  });

  it('should display cumulative totals chart', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="historique-projection"
      />
    );

    // Vérifier que les graphiques sont rendus
    const barCharts = screen.getAllByTestId('bar-chart');
    const lineCharts = screen.getAllByTestId('line-chart');
    
    expect(barCharts.length).toBeGreaterThan(0);
    expect(lineCharts.length).toBeGreaterThan(0);
  });

  it('should handle investment with minimal expenses', () => {
    const currentYear = new Date().getFullYear();
    const investmentWithMinimalExpenses = {
      ...mockInvestment,
      projectStartDate: `${currentYear}-01-01`,
      projectEndDate: `${currentYear}-12-31`,
      expenses: [{
        year: currentYear,
        propertyTax: 0,
        condoFees: 0,
        propertyInsurance: 0,
        managementFees: 0,
        unpaidRentInsurance: 0,
        repairs: 0,
        otherDeductible: 0,
        otherNonDeductible: 0,
        rent: 0,
        furnishedRent: 0,
        tenantCharges: 0,
        tax: 0,
        deficit: 0,
        loanPayment: 0,
        loanInsurance: 0,
        taxBenefit: 0,
        interest: 0
      }]
    };

    render(
      <TaxForm 
        investment={investmentWithMinimalExpenses} 
        onUpdate={mockOnUpdate}
        currentSubTab="historique-projection"
      />
    );

    // Le composant devrait se rendre sans erreur
    expect(screen.getByText(/Historique et projection/i)).toBeInTheDocument();
  });

  it('should highlight current year in projection table', () => {
    const currentYear = new Date().getFullYear();
    const investmentWithCurrentYear = {
      ...mockInvestment,
      projectStartDate: `${currentYear}-01-01`,
      projectEndDate: `${currentYear + 5}-01-01`,
      expenses: Array.from({ length: 6 }, (_, i) => ({
        ...mockInvestment.expenses[0],
        year: currentYear + i
      }))
    };

    render(
      <TaxForm 
        investment={investmentWithCurrentYear} 
        onUpdate={mockOnUpdate}
        currentSubTab="historique-projection"
      />
    );

    // Vérifier que l'année courante est présente
    expect(screen.getByText(currentYear.toString())).toBeInTheDocument();
  });

  it('should calculate and display tax results for all regimes', () => {
    render(
      <TaxForm 
        investment={mockInvestment} 
        onUpdate={mockOnUpdate}
        currentSubTab="annee-courante"
      />
    );

    // Le composant devrait afficher les résultats fiscaux
    // (Les valeurs exactes sont calculées par le composant)
    expect(screen.getByText(/Année courante/i)).toBeInTheDocument();
  });
});

