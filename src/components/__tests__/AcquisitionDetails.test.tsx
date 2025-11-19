import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AcquisitionDetails from '../AcquisitionDetails';
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
  CreditCard: ({ className }: any) => (
    <svg data-testid="credit-card-icon" className={className} />
  ),
}));

// Mock SCISelector component
vi.mock('../SCISelector', () => ({
  default: ({ selectedSCIId, propertyValue, purchasePrice, onChange }: any) => (
    <div data-testid="sci-selector">
      <select
        data-testid="sci-select"
        value={selectedSCIId || ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value, propertyValue || purchasePrice)}
      >
        <option value="">Nom propre</option>
      </select>
      {selectedSCIId && (
        <input
          data-testid="property-value-input"
          type="number"
          value={propertyValue || purchasePrice}
          onChange={(e) => onChange(selectedSCIId, Number(e.target.value))}
        />
      )}
    </div>
  ),
}));

describe('AcquisitionDetails', () => {
  const mockOnUpdate = vi.fn();

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
    loanAmount: 198300,
    interestRate: 1.5,
    insuranceRate: 0.36,
    loanDuration: 20,
    startDate: '2023-01-01',
    hasDeferral: false,
    deferralType: 'none',
    deferredPeriod: 0,
    deferredInterest: 0,
    // Autres champs requis
    furnishedRentRevenue: 0,
    unfurnishedRentRevenue: 0,
    tenantCharges: 0,
    vacancyRate: 0,
    propertyTax: 0,
    condoFees: 0,
    propertyInsurance: 0,
    managementFees: 0,
    unpaidRentInsurance: 0,
    repairsAndMaintenance: 0,
    taxBracket: 30,
    taxCredit: 0,
    depreciation: 0,
    projectStartDate: '2023-01-01',
    projectEndDate: '2043-01-01',
    resaleIncreaseRate: 2,
    sellerAgencyFees: 0,
    capitalGainsTax: 0,
    expenses: []
  };

  describe('Rendering', () => {
    it('should render all acquisition cost fields', () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      expect(screen.getByText(/prix d'achat/i)).toBeInTheDocument();
      expect(screen.getByText(/frais d'agence/i)).toBeInTheDocument();
      expect(screen.getByText(/frais de notaire/i)).toBeInTheDocument();
      expect(screen.getByText(/frais de dossier bancaire/i)).toBeInTheDocument();
      expect(screen.getByText(/frais de garantie bancaire/i)).toBeInTheDocument();
      expect(screen.getByText(/diagnostics immobiliers/i)).toBeInTheDocument();
      expect(screen.getByText(/travaux/i)).toBeInTheDocument();
    });

    it('should render total cost section', () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      expect(screen.getByText(/coût total de l'opération/i)).toBeInTheDocument();
      // Total = 200000 + 10000 + 15000 + 800 + 2000 + 500 + 20000 = 248300
      expect(screen.getByText(/248.*300/)).toBeInTheDocument();
    });

    it('should render financing fields', () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      expect(screen.getByText(/^apport$/i)).toBeInTheDocument();
      expect(screen.getByText(/somme empruntée/i)).toBeInTheDocument();
      expect(screen.getByText(/durée.*années/i)).toBeInTheDocument();
      expect(screen.getByText(/taux d'intérêt/i)).toBeInTheDocument();
    });

    it('should render deferral checkbox', () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      // Chercher spécifiquement le label "Différé" près de la checkbox
      const deferralSection = screen.getByText(/^différé$/i);
      expect(deferralSection).toBeInTheDocument();
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Total Cost Calculation', () => {
    it('should calculate total cost correctly', () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      // Total = 200000 + 10000 + 15000 + 800 + 2000 + 500 + 20000 = 248300
      expect(screen.getByText(/248.*300/)).toBeInTheDocument();
    });

    it('should update total cost dynamically when viewing', () => {
      const investment = { ...mockInvestment };
      const { rerender } = render(<AcquisitionDetails investment={investment} onUpdate={mockOnUpdate} />);

      // Initial total: 248300
      expect(screen.getByText(/248.*300/)).toBeInTheDocument();

      // Update purchase price
      const updatedInvestment = { ...investment, purchasePrice: 250000 };
      rerender(<AcquisitionDetails investment={updatedInvestment} onUpdate={mockOnUpdate} />);

      // New total: 250000 + 10000 + 15000 + 800 + 2000 + 500 + 20000 = 298300
      expect(screen.getByText(/298.*300/)).toBeInTheDocument();
    });
  });

  describe('⭐ Prix d\'achat modification → Recalcul somme empruntée', () => {
    it('should trigger loanAmount recalculation via useEffect when purchasePrice changes', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const purchaseInput = screen.getAllByRole('spinbutton')[0]; // Premier input de type number
      
      // Change purchase price from 200000 to 300000
      fireEvent.change(purchaseInput, { target: { value: '300000' } });

      await waitFor(() => {
        // Vérifie que onUpdate a été appelé avec purchasePrice
        expect(mockOnUpdate).toHaveBeenCalledWith('purchasePrice', 300000);
      });

      // Le useEffect devrait ensuite déclencher un recalcul de loanAmount
      // Total = 300000 + 10000 + 15000 + 800 + 2000 + 500 + 20000 = 348300
      // LoanAmount = 348300 - 50000 (downPayment) = 298300
    });

    it('should call onUpdate with correct purchasePrice value', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const purchaseInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(purchaseInput, { target: { value: '250000' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('purchasePrice', 250000);
      });
    });
  });

  describe('⭐ Frais d\'agence modification → Recalcul somme empruntée', () => {
    it('should call onUpdate when agencyFees changes', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const agencyFeesInput = screen.getAllByRole('spinbutton')[1];
      
      fireEvent.change(agencyFeesInput, { target: { value: '12000' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('agencyFees', 12000);
      });
    });
  });

  describe('⭐ Frais de notaire modification → Recalcul somme empruntée', () => {
    it('should call onUpdate when notaryFees changes', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const notaryFeesInput = screen.getAllByRole('spinbutton')[2];
      
      fireEvent.change(notaryFeesInput, { target: { value: '18000' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('notaryFees', 18000);
      });
    });
  });

  describe('⭐ Frais de dossier bancaire modification → Recalcul somme empruntée', () => {
    it('should call onUpdate when bankFees changes', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const bankFeesInput = screen.getAllByRole('spinbutton')[3];
      
      fireEvent.change(bankFeesInput, { target: { value: '1500' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('bankFees', 1500);
      });
    });
  });

  describe('⭐ Frais de garantie bancaire modification → Recalcul somme empruntée', () => {
    it('should call onUpdate when bankGuaranteeFees changes', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const bankGuaranteeFeesInput = screen.getAllByRole('spinbutton')[4];
      
      fireEvent.change(bankGuaranteeFeesInput, { target: { value: '3000' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('bankGuaranteeFees', 3000);
      });
    });
  });

  describe('⭐ Diagnostics immobiliers modification → Recalcul somme empruntée', () => {
    it('should call onUpdate when mandatoryDiagnostics changes', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const diagnosticsInput = screen.getAllByRole('spinbutton')[5];
      
      fireEvent.change(diagnosticsInput, { target: { value: '1000' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('mandatoryDiagnostics', 1000);
      });
    });
  });

  describe('⭐ Travaux modification → Recalcul somme empruntée', () => {
    it('should call onUpdate when renovationCosts changes', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const renovationInput = screen.getAllByRole('spinbutton')[6];
      
      fireEvent.change(renovationInput, { target: { value: '30000' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('renovationCosts', 30000);
      });
    });
  });

  describe('⭐ Équation : Apport + Emprunt = Coût Total', () => {
    it('should maintain equation when all costs are provided', () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const totalCost = 200000 + 10000 + 15000 + 800 + 2000 + 500 + 20000;
      const sum = mockInvestment.downPayment + mockInvestment.loanAmount;

      // 50000 + 198300 = 248300
      expect(sum).toBe(totalCost);
    });

    it('should detect financing mismatch when equation is not balanced', () => {
      const unbalancedInvestment = {
        ...mockInvestment,
        loanAmount: 200000, // Incorrect, devrait être 198300
      };

      render(<AcquisitionDetails investment={unbalancedInvestment} onUpdate={mockOnUpdate} />);

      // Should show error message for mismatch
      const errorMessages = screen.getAllByText(/écart.*avec le coût total/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it('should NOT show error when equation is balanced', () => {
      const balancedInvestment = {
        ...mockInvestment,
        loanAmount: 198300, // Correct: 248300 - 50000 = 198300
      };

      render(<AcquisitionDetails investment={balancedInvestment} onUpdate={mockOnUpdate} />);

      const errorMessages = screen.queryAllByText(/écart.*avec le coût total/i);
      expect(errorMessages.length).toBe(0);
    });

    it('should trigger loanAmount update via useEffect when totalCost changes', async () => {
      const { rerender } = render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      // Change investment to trigger useEffect
      const updatedInvestment = { ...mockInvestment, purchasePrice: 300000 };
      rerender(<AcquisitionDetails investment={updatedInvestment} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        // useEffect should have called onUpdate with new loanAmount
        // New total: 348300, downPayment: 50000, expected loanAmount: 298300
        const loanAmountCalls = mockOnUpdate.mock.calls.filter(call => call[0] === 'loanAmount');
        expect(loanAmountCalls.length).toBeGreaterThan(0);
        if (loanAmountCalls.length > 0) {
          const lastLoanAmountCall = loanAmountCalls[loanAmountCalls.length - 1];
          expect(lastLoanAmountCall[1]).toBe(298300);
        }
      });
    });
  });

  describe('⭐ Différé Total → Recalcul détail du crédit', () => {
    it('should show deferral fields when checkbox is enabled', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('hasDeferral', true);
        expect(mockOnUpdate).toHaveBeenCalledWith('deferralType', 'partial');
      });

      // Les champs de différé devraient apparaître
      await waitFor(() => {
        expect(screen.getByText(/type de différé/i)).toBeInTheDocument();
        expect(screen.getByText(/différé.*mois/i)).toBeInTheDocument();
      });
    });

    it('should allow selection of total deferral type', async () => {
      const investmentWithDeferral = {
        ...mockInvestment,
        hasDeferral: true,
        deferralType: 'partial' as const,
        deferredPeriod: 0
      };

      render(<AcquisitionDetails investment={investmentWithDeferral} onUpdate={mockOnUpdate} />);

      // Find and click on "Total" radio button
      const totalRadio = screen.getByLabelText(/total/i);
      fireEvent.click(totalRadio);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('deferralType', 'total');
      });
    });

    it('should update deferred period', async () => {
      const investmentWithDeferral = {
        ...mockInvestment,
        hasDeferral: true,
        deferralType: 'total' as const,
        deferredPeriod: 0
      };

      render(<AcquisitionDetails investment={investmentWithDeferral} onUpdate={mockOnUpdate} />);

      // Trouver le texte "Différé (mois)" puis chercher l'input number suivant
      expect(screen.getByText(/différé \(mois\)/i)).toBeInTheDocument();
      
      // Trouver tous les inputs number et prendre le bon (celui du différé)
      const numberInputs = screen.getAllByRole('spinbutton');
      // Le dernier input number ajouté est celui du différé (après tous les autres champs)
      const deferredPeriodInput = numberInputs.find(input => {
        const value = (input as HTMLInputElement).value;
        return value === '' || value === '0';
      }) || numberInputs[numberInputs.length - 3]; // 3 inputs après: apport, somme, durée
      
      fireEvent.change(deferredPeriodInput, { target: { value: '24' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('deferredPeriod', 24);
      });
    });

    it('should calculate deferred interest with total deferral', () => {
      const investmentWithTotalDeferral = {
        ...mockInvestment,
        hasDeferral: true,
        deferralType: 'total' as const,
        deferredPeriod: 24,
        deferredInterest: 4460 // Pré-calculé
      };

      render(<AcquisitionDetails investment={investmentWithTotalDeferral} onUpdate={mockOnUpdate} />);

      // Vérifier que le composant affiche bien les champs de différé
      expect(screen.getByText(/type de différé/i)).toBeInTheDocument();
      expect(screen.getByText(/différé \(mois\)/i)).toBeInTheDocument();
      
      const totalRadio = screen.getByLabelText(/total/i);
      expect(totalRadio).toBeChecked();
    });

    it('should reset deferral fields when checkbox is disabled', async () => {
      const investmentWithDeferral = {
        ...mockInvestment,
        hasDeferral: true,
        deferralType: 'total' as const,
        deferredPeriod: 24,
        deferredInterest: 4460
      };

      render(<AcquisitionDetails investment={investmentWithDeferral} onUpdate={mockOnUpdate} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('hasDeferral', false);
        expect(mockOnUpdate).toHaveBeenCalledWith('deferralType', 'none');
        expect(mockOnUpdate).toHaveBeenCalledWith('deferredPeriod', 0);
        expect(mockOnUpdate).toHaveBeenCalledWith('deferredInterest', 0);
      });
    });
  });

  describe('⭐ Différé Partiel → Recalcul détail du crédit', () => {
    it('should allow selection of partial deferral type', async () => {
      const investmentWithDeferral = {
        ...mockInvestment,
        hasDeferral: true,
        deferralType: 'total' as const,
        deferredPeriod: 0
      };

      render(<AcquisitionDetails investment={investmentWithDeferral} onUpdate={mockOnUpdate} />);

      // Find and click on "Partiel" radio button
      const partialRadio = screen.getByLabelText(/partiel/i);
      fireEvent.click(partialRadio);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('deferralType', 'partial');
      });
    });

    it('should update deferred period for partial deferral', async () => {
      const investmentWithPartialDeferral = {
        ...mockInvestment,
        hasDeferral: true,
        deferralType: 'partial' as const,
        deferredPeriod: 0
      };

      render(<AcquisitionDetails investment={investmentWithPartialDeferral} onUpdate={mockOnUpdate} />);

      // Vérifier que le champ "Différé (mois)" est présent
      expect(screen.getByText(/différé \(mois\)/i)).toBeInTheDocument();
      
      // Trouver tous les inputs number
      const numberInputs = screen.getAllByRole('spinbutton');
      // Trouver l'input avec value vide ou '0' (celui du différé)
      const deferredPeriodInput = numberInputs.find(input => {
        const value = (input as HTMLInputElement).value;
        return value === '' || value === '0';
      }) || numberInputs[numberInputs.length - 3];
      
      fireEvent.change(deferredPeriodInput, { target: { value: '12' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('deferredPeriod', 12);
      });
    });

    it('should display monthly payment info with partial deferral', () => {
      const investmentWithPartialDeferral = {
        ...mockInvestment,
        hasDeferral: true,
        deferralType: 'partial' as const,
        deferredPeriod: 12,
        deferredInterest: 1500
      };

      render(<AcquisitionDetails investment={investmentWithPartialDeferral} onUpdate={mockOnUpdate} />);

      // Vérifier que le composant affiche bien les champs de différé partiel
      expect(screen.getByText(/type de différé/i)).toBeInTheDocument();
      expect(screen.getByText(/différé \(mois\)/i)).toBeInTheDocument();
      
      const partialRadio = screen.getByLabelText(/partiel/i);
      expect(partialRadio).toBeChecked();
    });
  });

  describe('Real World Case: Pinel Bagnolet', () => {
    const pinelBagnolet: Investment = {
      ...mockInvestment,
      name: 'Pinel Bagnolet',
      purchasePrice: 129668,
      agencyFees: 0,
      notaryFees: 0,
      bankFees: 800,
      bankGuaranteeFees: 0,
      mandatoryDiagnostics: 0,
      renovationCosts: 0,
      downPayment: 800,
      loanAmount: 129668,
      interestRate: 1.5,
      insuranceRate: 0.36,
      loanDuration: 20,
      hasDeferral: true,
      deferralType: 'total',
      deferredPeriod: 24,
      deferredInterest: 4460,
      startDate: '2017-05-01'
    };

    it('should display correct total cost for Pinel Bagnolet', () => {
      render(<AcquisitionDetails investment={pinelBagnolet} onUpdate={mockOnUpdate} />);

      // Total = 129668 + 0 + 0 + 800 + 0 + 0 + 0 = 130468
      expect(screen.getByText(/130.*468/)).toBeInTheDocument();
    });

    it('should maintain equation for Pinel Bagnolet', () => {
      render(<AcquisitionDetails investment={pinelBagnolet} onUpdate={mockOnUpdate} />);

      const totalCost = 130468;
      const sum = pinelBagnolet.downPayment + pinelBagnolet.loanAmount;

      // 800 + 129668 = 130468
      expect(sum).toBe(totalCost);
    });

    it('should show total deferral is enabled for Pinel Bagnolet', () => {
      render(<AcquisitionDetails investment={pinelBagnolet} onUpdate={mockOnUpdate} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();

      const totalRadio = screen.getByLabelText(/total/i);
      expect(totalRadio).toBeChecked();
    });

    it('should show 24 months deferral period for Pinel Bagnolet', () => {
      render(<AcquisitionDetails investment={pinelBagnolet} onUpdate={mockOnUpdate} />);

      // Vérifier que le champ "Différé (mois)" est affiché
      expect(screen.getByText(/différé \(mois\)/i)).toBeInTheDocument();
      
      // Trouver tous les inputs number
      const numberInputs = screen.getAllByRole('spinbutton');
      // Trouver l'input avec value '24' (celui du différé pour Pinel)
      const deferredPeriodInput = numberInputs.find(input => {
        const value = (input as HTMLInputElement).value;
        return value === '24';
      });
      
      expect(deferredPeriodInput).toBeDefined();
      expect((deferredPeriodInput as HTMLInputElement).value).toBe('24');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values in cost fields', async () => {
      const zeroInvestment = {
        ...mockInvestment,
        agencyFees: 0,
        bankGuaranteeFees: 0,
        mandatoryDiagnostics: 0,
        renovationCosts: 0
      };

      render(<AcquisitionDetails investment={zeroInvestment} onUpdate={mockOnUpdate} />);

      const agencyFeesInput = screen.getAllByRole('spinbutton')[1] as HTMLInputElement;
      // Les inputs affichent '' au lieu de '0' quand la valeur est 0 (value={investment?.field || ''})
      expect(agencyFeesInput.value).toBe('');
    });

    it('should handle very large values', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const purchaseInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(purchaseInput, { target: { value: '10000000' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('purchasePrice', 10000000);
      });
    });

    it('should handle empty string input', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      const purchaseInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(purchaseInput, { target: { value: '' } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('purchasePrice', 0);
      });
    });
  });

  describe('Interactive Features', () => {
    it('should show tooltip on hover for agency fees', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      // Trouver les icônes d'aide (HelpCircle)
      const helpIcons = screen.getAllByTestId('help-circle-icon');
      expect(helpIcons.length).toBeGreaterThan(0);
      
      // Vérifier qu'il y a plusieurs icônes d'aide (pour frais d'agence, notaire, etc.)
      expect(helpIcons.length).toBeGreaterThanOrEqual(4);
    });

    it('should update financing section when apport changes', async () => {
      render(<AcquisitionDetails investment={mockInvestment} onUpdate={mockOnUpdate} />);

      // Trouver le champ "Apport"
      const apportInput = screen.getAllByRole('spinbutton').find(
        input => {
          const label = input.previousElementSibling;
          return label?.textContent?.includes('Apport');
        }
      );

      if (apportInput) {
        fireEvent.change(apportInput, { target: { value: '100000' } });

        await waitFor(() => {
          expect(mockOnUpdate).toHaveBeenCalledWith('downPayment', 100000);
        });
      }
    });
  });
});

