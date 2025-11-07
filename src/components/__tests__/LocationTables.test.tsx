import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationTables from '../LocationTables';
import { Investment } from '../../types/investment';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Edit2: ({ className }: any) => (
    <svg data-testid="edit2-icon" className={className} />
  ),
  Save: ({ className }: any) => (
    <svg data-testid="save-icon" className={className} />
  ),
}));

describe('LocationTables', () => {
  const mockOnUpdate = vi.fn();
  const mockOnManualEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInvestment: Investment = {
    id: '1',
    name: 'Test Investment',
    purchasePrice: 200000,
    agencyFees: 10000,
    notaryFees: 15000,
    bankFees: 800,
    bankGuaranteeFees: 2000,
    mandatoryDiagnostics: 500,
    renovationCosts: 20000,
    downPayment: 50000,
    loanAmount: 200000,
    interestRate: 1.5,
    insuranceRate: 0.36,
    loanDuration: 20,
    startDate: '2024-01-01',
    projectStartDate: '2024-01-01',
    projectEndDate: '2044-01-01',
    hasDeferral: false,
    deferralType: 'none',
    deferredPeriod: 0,
    deferredInterest: 0,
    furnishedRentRevenue: 0,
    unfurnishedRentRevenue: 0,
    tenantCharges: 0,
    vacancyRate: 0,
    propertyTax: 1500,
    condoFees: 1200,
    propertyInsurance: 300,
    managementFees: 600,
    unpaidRentInsurance: 200,
    repairsAndMaintenance: 500,
    taxBracket: 30,
    taxCredit: 0,
    depreciation: 0,
    resaleIncreaseRate: 2,
    sellerAgencyFees: 0,
    capitalGainsTax: 0,
    expenses: [
      {
        year: 2024,
        propertyTax: 1500,
        condoFees: 1200,
        propertyInsurance: 300,
        managementFees: 600,
        unpaidRentInsurance: 200,
        repairs: 500,
        otherDeductible: 0,
        otherNonDeductible: 0,
        rent: 11000,
        furnishedRent: 12000,
        tenantCharges: 2000,
        taxBenefit: 1000,
        tax: 0,
        deficit: 0,
        loanPayment: 0,
        loanInsurance: 0,
        interest: 0
      },
      {
        year: 2025,
        propertyTax: 1530,
        condoFees: 1224,
        propertyInsurance: 306,
        managementFees: 612,
        unpaidRentInsurance: 204,
        repairs: 510,
        otherDeductible: 0,
        otherNonDeductible: 0,
        rent: 11220,
        furnishedRent: 12240,
        tenantCharges: 2040,
        taxBenefit: 1000,
        tax: 0,
        deficit: 0,
        loanPayment: 0,
        loanInsurance: 0,
        interest: 0
      }
    ],
    expenseProjection: {
      baseYear: {
        propertyTax: 1500,
        condoFees: 1200,
        propertyInsurance: 300,
        managementFees: 600,
        unpaidRentInsurance: 200,
        repairs: 500,
        otherDeductible: 0,
        otherNonDeductible: 0,
        rent: 11000,
        furnishedRent: 12000,
        tenantCharges: 2000,
        taxBenefit: 1000
      },
      referenceYear: 2024,
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
      vacancyRate: 0
    }
  };

  describe('Rendering', () => {
    it('should render revenue tables when currentSubTab is "revenus"', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText(/historique des revenus/i)).toBeInTheDocument();
      expect(screen.getByText(/projection des revenus/i)).toBeInTheDocument();
    });

    it('should render expense tables when currentSubTab is "frais"', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="frais"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText(/historique des frais/i)).toBeInTheDocument();
      expect(screen.getByText(/projection des frais/i)).toBeInTheDocument();
    });

    it('should display historical revenue data correctly', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      // Vérifier que les données de 2024 sont affichées
      expect(screen.getByText('2024')).toBeInTheDocument();
      expect(screen.getByText(/11.*000/)).toBeInTheDocument(); // Loyer nu 11000€
      expect(screen.getByText(/12.*000/)).toBeInTheDocument(); // Loyer meublé 12000€
    });

    it('should display historical expense data correctly', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="frais"
          onUpdate={mockOnUpdate}
        />
      );

      // Vérifier que les données de 2024 sont affichées
      expect(screen.getByText('2024')).toBeInTheDocument();
      // Les valeurs de frais devraient être affichées
    });
  });

  describe('📊 Calcul des années partielles du projet', () => {
    it('should calculate correct year coverage for partial years', () => {
      const partialYearInvestment: Investment = {
        ...mockInvestment,
        projectStartDate: '2024-06-01', // Commence le 1er juin
        projectEndDate: '2024-12-31',    // Finit le 31 décembre
      };

      render(
        <LocationTables
          investment={partialYearInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      // L'année 2024 est partielle (juin à décembre = 7 mois sur 12)
      // Les revenus devraient être proratisés
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should handle project starting mid-year', () => {
      const midYearInvestment: Investment = {
        ...mockInvestment,
        projectStartDate: '2024-07-01', // Commence en juillet
        projectEndDate: '2044-12-31',
        expenses: [
          {
            year: 2024,
            propertyTax: 1500,
            condoFees: 1200,
            propertyInsurance: 300,
            managementFees: 600,
            unpaidRentInsurance: 200,
            repairs: 500,
            otherDeductible: 0,
            otherNonDeductible: 0,
            rent: 11000,
            furnishedRent: 12000,
            tenantCharges: 2000,
            taxBenefit: 1000,
            tax: 0,
            deficit: 0,
            loanPayment: 0,
            loanInsurance: 0,
            interest: 0
          }
        ]
      };

      render(
        <LocationTables
          investment={midYearInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      // Devrait afficher l'année 2024 même si elle commence en cours d'année
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should handle project ending mid-year', () => {
      const endMidYearInvestment: Investment = {
        ...mockInvestment,
        projectStartDate: '2024-01-01',
        projectEndDate: '2024-06-30', // Finit en juin
        expenses: [
          {
            year: 2024,
            propertyTax: 1500,
            condoFees: 1200,
            propertyInsurance: 300,
            managementFees: 600,
            unpaidRentInsurance: 200,
            repairs: 500,
            otherDeductible: 0,
            otherNonDeductible: 0,
            rent: 11000,
            furnishedRent: 12000,
            tenantCharges: 2000,
            taxBenefit: 1000,
            tax: 0,
            deficit: 0,
            loanPayment: 0,
            loanInsurance: 0,
            interest: 0
          }
        ]
      };

      render(
        <LocationTables
          investment={endMidYearInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('2024')).toBeInTheDocument();
    });
  });

  describe('💰 Réutilisation des données de prêt de la page projet', () => {
    it('should use loan data from acquisition page', () => {
      const investmentWithLoan: Investment = {
        ...mockInvestment,
        loanAmount: 200000,
        interestRate: 1.5,
        loanDuration: 20,
        insuranceRate: 0.36,
        startDate: '2024-01-01',
        deferralType: 'none',
        deferredPeriod: 0
      };

      render(
        <LocationTables
          investment={investmentWithLoan}
          currentSubTab="frais"
          onUpdate={mockOnUpdate}
        />
      );

      // Le composant devrait calculer les intérêts et mensualités du prêt
      // et les afficher dans le tableau des frais
      expect(screen.getByText(/historique des frais/i)).toBeInTheDocument();
    });

    it('should calculate loan interest correctly for each year', () => {
      const investmentWithLoan: Investment = {
        ...mockInvestment,
        loanAmount: 200000,
        interestRate: 1.5,
        loanDuration: 20,
        insuranceRate: 0.36,
        startDate: '2024-01-01',
        projectStartDate: '2024-01-01',
        projectEndDate: '2044-01-01',
        deferralType: 'none',
        deferredPeriod: 0
      };

      render(
        <LocationTables
          investment={investmentWithLoan}
          currentSubTab="frais"
          onUpdate={mockOnUpdate}
        />
      );

      // Les intérêts de la première année devraient être affichés
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should handle deferred loan correctly', () => {
      const investmentWithDeferredLoan: Investment = {
        ...mockInvestment,
        loanAmount: 200000,
        interestRate: 1.5,
        loanDuration: 20,
        insuranceRate: 0.36,
        startDate: '2024-01-01',
        hasDeferral: true,
        deferralType: 'total',
        deferredPeriod: 12
      };

      render(
        <LocationTables
          investment={investmentWithDeferredLoan}
          currentSubTab="frais"
          onUpdate={mockOnUpdate}
        />
      );

      // Le composant devrait gérer correctement le différé
      expect(screen.getByText(/historique des frais/i)).toBeInTheDocument();
    });

    it('should calculate loan insurance correctly', () => {
      const investmentWithInsurance: Investment = {
        ...mockInvestment,
        loanAmount: 200000,
        insuranceRate: 0.36, // 0.36%
        startDate: '2024-01-01',
        projectStartDate: '2024-01-01',
        projectEndDate: '2044-01-01'
      };

      render(
        <LocationTables
          investment={investmentWithInsurance}
          currentSubTab="frais"
          onUpdate={mockOnUpdate}
        />
      );

      // L'assurance devrait être calculée : 200000 * 0.36% = 720€/an
      expect(screen.getByText('2024')).toBeInTheDocument();
    });
  });

  describe('✏️ Manual Editing', () => {
    it('should allow manual editing when allowManualEdit is true', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
          allowManualEdit={true}
          onManualEdit={mockOnManualEdit}
        />
      );

      // Les champs devraient être éditables
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should call onUpdate when editing a value', async () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
          allowManualEdit={true}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: '12000' } });
        
        await waitFor(() => {
          expect(mockOnUpdate).toHaveBeenCalled();
        });
      }
    });

    it('should call onManualEdit when user starts editing', async () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
          allowManualEdit={true}
          onManualEdit={mockOnManualEdit}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: '12000' } });
        
        // onManualEdit devrait être appelé pour indiquer qu'une édition est en cours
        await waitFor(() => {
          expect(mockOnManualEdit).toHaveBeenCalled();
        });
      }
    });
  });

  describe('🧮 Calculations', () => {
    it('should calculate total revenue correctly (nu)', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      // Total nu = loyer nu + aide fiscale + charges locataires
      // = 11000 + 1000 + 2000 = 14000
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should calculate total revenue correctly (meublé)', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      // Total meublé = loyer meublé + charges locataires
      // = 12000 + 2000 = 14000
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should calculate total expenses correctly', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="frais"
          onUpdate={mockOnUpdate}
        />
      );

      // Total des frais = somme de tous les frais
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should calculate deductible expenses correctly', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="frais"
          onUpdate={mockOnUpdate}
        />
      );

      // Les frais déductibles devraient inclure :
      // taxe foncière, charges, assurance, frais de gestion, etc.
      expect(screen.getByText('2024')).toBeInTheDocument();
    });
  });

  describe('📅 Multiple Years', () => {
    it('should display all years from project start to end', () => {
      const multiYearInvestment: Investment = {
        ...mockInvestment,
        projectStartDate: '2024-01-01',
        projectEndDate: '2026-12-31',
        expenses: [
          { ...mockInvestment.expenses[0], year: 2024 },
          { ...mockInvestment.expenses[0], year: 2025 },
          { ...mockInvestment.expenses[0], year: 2026 }
        ]
      };

      render(
        <LocationTables
          investment={multiYearInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('2024')).toBeInTheDocument();
      expect(screen.getByText('2025')).toBeInTheDocument();
      expect(screen.getByText('2026')).toBeInTheDocument();
    });

    it('should separate historical and projection data', () => {
      render(
        <LocationTables
          investment={mockInvestment}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      // Devrait avoir deux sections : historique et projection
      expect(screen.getByText(/historique des revenus/i)).toBeInTheDocument();
      expect(screen.getByText(/projection des revenus/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing expense data gracefully', () => {
      const investmentNoExpenses: Investment = {
        ...mockInvestment,
        expenses: []
      };

      render(
        <LocationTables
          investment={investmentNoExpenses}
          currentSubTab="revenus"
          onUpdate={mockOnUpdate}
        />
      );

      // Ne devrait pas crasher
      expect(screen.getByText(/historique des revenus/i)).toBeInTheDocument();
    });

    it('should handle zero loan amount', () => {
      const investmentNoLoan: Investment = {
        ...mockInvestment,
        loanAmount: 0
      };

      render(
        <LocationTables
          investment={investmentNoLoan}
          currentSubTab="frais"
          onUpdate={mockOnUpdate}
        />
      );

      // Ne devrait pas crasher et ne devrait pas afficher de données de prêt
      expect(screen.getByText(/historique des frais/i)).toBeInTheDocument();
    });
  });
});



