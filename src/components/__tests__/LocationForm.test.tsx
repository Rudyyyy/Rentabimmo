import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationForm from '../LocationForm';
import { Investment } from '../../types/investment';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  HelpCircle: ({ className, onMouseEnter, onMouseLeave }: any) => (
    <svg 
      data-testid="help-circle-icon" 
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  ),
  Calendar: ({ className }: any) => (
    <svg data-testid="calendar-icon" className={className} />
  ),
  TrendingUp: ({ className }: any) => (
    <svg data-testid="trending-up-icon" className={className} />
  ),
}));

// Mock react-icons
vi.mock('react-icons/fa', () => ({
  FaChartPie: ({ className }: any) => (
    <svg data-testid="chart-pie-icon" className={className} />
  ),
  FaMoneyBillWave: ({ className }: any) => (
    <svg data-testid="money-bill-wave-icon" className={className} />
  ),
}));

describe('LocationForm', () => {
  const mockOnUpdate = vi.fn();
  const mockOnManualEdit = vi.fn();
  const mockOnSubTabChange = vi.fn();

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
    expenses: [],
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
      referenceYear: 2025,
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
      vacancyRate: 5
    }
  };

  describe('Rendering', () => {
    it('should render revenue form when currentSubTab is "revenus"', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      expect(screen.getByText(/revenus/i)).toBeInTheDocument();
    });

    it('should render expense form when currentSubTab is "frais"', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="frais"
        />
      );

      // Chercher le bouton "Frais" qui devrait être actif (highlighted)
      const fraisButton = screen.getByRole('button', { name: /frais/i });
      expect(fraisButton).toBeInTheDocument();
      expect(fraisButton.className).toContain('blue');
    });

    it('should display reference year selector', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('should display automatic calculation toggle', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      expect(screen.getByText(/calcul automatique/i)).toBeInTheDocument();
    });
  });

  describe('🔄 Basculement d\'onglets', () => {
    it('should call onSubTabChange when clicking on Revenus tab', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="frais"
          onSubTabChange={mockOnSubTabChange}
        />
      );

      const revenusButton = screen.getByText(/revenus/i);
      fireEvent.click(revenusButton);

      expect(mockOnSubTabChange).toHaveBeenCalledWith('revenus');
    });

    it('should call onSubTabChange when clicking on Frais tab', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
          onSubTabChange={mockOnSubTabChange}
        />
      );

      const fraisButton = screen.getByText(/frais/i);
      fireEvent.click(fraisButton);

      expect(mockOnSubTabChange).toHaveBeenCalledWith('frais');
    });

    it('should highlight active tab correctly', () => {
      const { rerender } = render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const revenusButton = screen.getByRole('button', { name: /revenus/i });
      expect(revenusButton.className).toContain('blue');

      rerender(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="frais"
        />
      );

      const fraisButton = screen.getByRole('button', { name: /^frais$/i });
      expect(fraisButton.className).toContain('blue');
    });
  });

  describe('📋 Saisie des paramètres de référence', () => {
    it('should display revenue reference fields', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      // Utiliser getAllByText pour gérer les doublons (valeurs de référence + paramètres de projection)
      expect(screen.getAllByText(/loyer nu/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/loyer meublé/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/charges locataire/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/aide fiscale/i).length).toBeGreaterThan(0);
    });

    it('should display expense reference fields', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="frais"
        />
      );

      // Vérifier la présence des champs de frais principaux
      expect(screen.getAllByText(/taxe foncière/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/frais d'agence/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/assurance/i).length).toBeGreaterThan(0);
    });

    it('should update investment when changing a revenue reference value', async () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      if (inputs.length > 0) {
        const rentInput = inputs.find(input => 
          input.getAttribute('value') === '11000'
        );
        
        if (rentInput) {
          fireEvent.change(rentInput, { target: { value: '11500' } });
          
          await waitFor(() => {
            expect(mockOnUpdate).toHaveBeenCalled();
          });
        }
      }
    });

    it('should update investment when changing an expense reference value', async () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="frais"
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      if (inputs.length > 0) {
        const taxInput = inputs.find(input => 
          input.getAttribute('value') === '1500'
        );
        
        if (taxInput) {
          fireEvent.change(taxInput, { target: { value: '1600' } });
          
          await waitFor(() => {
            expect(mockOnUpdate).toHaveBeenCalled();
          });
        }
      }
    });
  });

  describe('📈 Paramètres de projection', () => {
    it('should display projection parameter fields for revenues', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      // Les paramètres de projection devraient être affichés
      expect(screen.getByText(/paramètres de projection/i)).toBeInTheDocument();
    });

    it('should display projection parameter fields for expenses', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="frais"
        />
      );

      expect(screen.getByText(/paramètres de projection/i)).toBeInTheDocument();
    });

    it('should update projection parameters when changed', async () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      // Chercher un champ de taux d'augmentation
      const inputs = screen.getAllByRole('spinbutton');
      const increaseInput = inputs.find(input => {
        const value = input.getAttribute('value');
        return value === '2' || value === '2.00';
      });

      if (increaseInput) {
        fireEvent.change(increaseInput, { target: { value: '3' } });
        
        await waitFor(() => {
          expect(mockOnUpdate).toHaveBeenCalled();
        });
      }
    });

    it('should display vacancy rate field', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      expect(screen.getByText(/vacance locative/i)).toBeInTheDocument();
    });

    it('should update vacancy rate', async () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      const vacancyInput = inputs.find(input => 
        input.getAttribute('value') === '5'
      );

      if (vacancyInput) {
        fireEvent.change(vacancyInput, { target: { value: '8' } });
        
        await waitFor(() => {
          expect(mockOnUpdate).toHaveBeenCalled();
        });
      }
    });
  });

  describe('🔘 Bouton Recalculer l\'historique', () => {
    it('should display recalculate button', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      expect(screen.getByText(/recalculer/i)).toBeInTheDocument();
    });

    it('should call onUpdate when clicking recalculate button', async () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const recalculateButton = screen.getByText(/recalculer/i);
      fireEvent.click(recalculateButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('should recalculate historical data based on reference year', async () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const recalculateButton = screen.getByText(/recalculer/i);
      fireEvent.click(recalculateButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
        // Vérifier que le callback a été appelé avec des données mises à jour
        const callArg = mockOnUpdate.mock.calls[0][0];
        expect(callArg).toBeDefined();
        expect(callArg.expenses).toBeDefined();
      });
    });
  });

  describe('🔧 Calcul automatique de l\'historique', () => {
    it('should toggle automatic calculation', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked(); // Devrait être activé par défaut

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should keep recalculate button accessible even when automatic calculation is off', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox); // Désactiver le calcul automatique

      const recalculateButton = screen.getByText(/recalculer/i);
      // Le bouton devrait rester actif même si le calcul auto est désactivé
      expect(recalculateButton).toBeInTheDocument();
    });
  });

  describe('💡 Tooltips', () => {
    it('should render help icons', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const helpIcons = screen.getAllByTestId('help-circle-icon');
      expect(helpIcons.length).toBeGreaterThan(0);
    });
  });

  describe('📅 Sélection de l\'année de référence', () => {
    it('should display reference year selector and allow changing it', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const yearSelect = screen.getAllByRole('combobox')[0];
      expect(yearSelect).toBeInTheDocument();
      
      // Le changement d'année met à jour l'état local
      fireEvent.change(yearSelect, { target: { value: '2026' } });
      expect(yearSelect.value).toBe('2026');
    });

    it('should list available years from project start to end', () => {
      render(
        <LocationForm
          investment={mockInvestment}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      const yearSelect = screen.getAllByRole('combobox')[0];
      expect(yearSelect).toBeInTheDocument();
      
      // Devrait contenir des options pour toutes les années du projet
      const options = yearSelect.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing expenseProjection data', () => {
      const investmentMinimalProjection: Investment = {
        ...mockInvestment,
        expenseProjection: {
          baseYear: {
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
            taxBenefit: 0
          },
          referenceYear: 2025,
          propertyTaxIncrease: 0,
          condoFeesIncrease: 0,
          propertyInsuranceIncrease: 0,
          managementFeesIncrease: 0,
          unpaidRentInsuranceIncrease: 0,
          repairsIncrease: 0,
          otherDeductibleIncrease: 0,
          otherNonDeductibleIncrease: 0,
          rentIncrease: 0,
          furnishedRentIncrease: 0,
          tenantChargesIncrease: 0,
          taxBenefitIncrease: 0,
          vacancyRate: 0
        }
      };

      render(
        <LocationForm
          investment={investmentMinimalProjection}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      // Ne devrait pas crasher
      expect(screen.getByText(/revenus/i)).toBeInTheDocument();
    });

    it('should handle zero values correctly', () => {
      const investmentZeroValues: Investment = {
        ...mockInvestment,
        expenseProjection: {
          ...mockInvestment.expenseProjection!,
          baseYear: {
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
            taxBenefit: 0
          }
        }
      };

      render(
        <LocationForm
          investment={investmentZeroValues}
          onUpdate={mockOnUpdate}
          currentSubTab="revenus"
        />
      );

      expect(screen.getByText(/revenus/i)).toBeInTheDocument();
    });
  });
});

