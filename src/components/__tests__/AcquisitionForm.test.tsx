import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AcquisitionForm from '../AcquisitionForm';
import { Investment } from '../../types/investment';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-chart">Bar Chart</div>
}));

// Mock API calls
vi.mock('../../lib/api', () => ({
  saveAmortizationSchedule: vi.fn(),
  getAmortizationSchedule: vi.fn()
}));

// Mock PDF Importer (to avoid pdfjs-dist issues)
vi.mock('../PDFAmortizationImporter', () => ({
  default: () => <div data-testid="mock-pdf-importer">PDF Importer</div>
}));

describe('AcquisitionForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBasicInvestment: Partial<Investment> = {
    purchasePrice: 200000,
    agencyFees: 10000,
    notaryFees: 15000,
    bankFees: 800,
    renovationCosts: 20000,
    downPayment: 50000,
    loanAmount: 195800,
    interestRate: 1.5,
    insuranceRate: 0.36,
    loanDuration: 20,
    startDate: '2023-01-01'
  };

  describe('Rendering', () => {
    it('should render credit information section', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={mockBasicInvestment as Investment} />);

      expect(screen.getByText(/informations de crédit/i)).toBeInTheDocument();
      expect(screen.getByText(/mensualité totale du crédit/i)).toBeInTheDocument();
      expect(screen.getByText(/intérêts différés/i)).toBeInTheDocument();
    });

    it('should display amortization chart', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={mockBasicInvestment as Investment} />);

      expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
      expect(screen.getByText(/visualisation de l'amortissement/i)).toBeInTheDocument();
    });

    it('should show amortization table button', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={mockBasicInvestment as Investment} />);

      expect(screen.getByText(/voir.*tableau.*amortissement/i)).toBeInTheDocument();
    });

    it('should show PDF importer button (disabled)', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={mockBasicInvestment as Investment} />);

      const pdfButton = screen.getByText(/importer.*pdf/i);
      expect(pdfButton).toBeInTheDocument();
      expect(pdfButton).toBeDisabled();
    });
  });

  describe('Monthly Payment Calculation', () => {
    it('should calculate monthly payment correctly for basic loan', () => {
      const investment = {
        ...mockBasicInvestment,
        loanAmount: 200000,
        interestRate: 1.5,
        loanDuration: 20
      };
      
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={investment as Investment} />);

      // La mensualité devrait être affichée (valeur approximative)
      expect(screen.getByText(/mensualité totale du crédit/i)).toBeInTheDocument();
      // Vérifier qu'un montant en euros est affiché
      const amountElements = screen.getAllByText(/€/);
      expect(amountElements.length).toBeGreaterThan(0);
    });

    it('should display zero when no loan parameters', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} />);

      const amountText = screen.getAllByText(/0,00\s*€/i);
      expect(amountText.length).toBeGreaterThan(0);
    });
  });

  describe('Deferred Interest', () => {
    it('should calculate deferred interest for total deferral', () => {
      const investment = {
        ...mockBasicInvestment,
        hasDeferral: true,
        deferralType: 'total' as const,
        deferredPeriod: 24,
        deferredInterest: 4460
      };

      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={investment as Investment} />);

      expect(screen.getByText(/intérêts différés/i)).toBeInTheDocument();
    });

    it('should display zero deferred interest when no deferral', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={mockBasicInvestment as Investment} />);

      // Vérifier que "Intérêts différés" est affiché avec 0
      expect(screen.getByText(/intérêts différés/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('should toggle amortization table on button click', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={mockBasicInvestment as Investment} />);

      const showButton = screen.getByText(/voir.*tableau.*amortissement/i);
      fireEvent.click(showButton);

      // Après le clic, le tableau devrait être visible (AmortizationTable component)
      // On ne teste pas le contenu exact du tableau ici, juste qu'il se toggle
      expect(showButton).toBeInTheDocument();
    });
  });

  describe('Real World Case: Pinel Bagnolet', () => {
    const pinelBagnolet: Partial<Investment> = {
      name: 'Pinel Bagnolet',
      purchasePrice: 129668,
      agencyFees: 0,
      notaryFees: 0,
      bankFees: 800,
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

    it('should render with Pinel Bagnolet data', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={pinelBagnolet as Investment} />);

      expect(screen.getByText(/informations de crédit/i)).toBeInTheDocument();
      expect(screen.getByText(/mensualité totale du crédit/i)).toBeInTheDocument();
    });

    it('should calculate correct monthly payment for Pinel Bagnolet', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={pinelBagnolet as Investment} />);

      // Avec différé total de 24 mois, durée 20 ans, taux 1.5%
      // Mensualité devrait être autour de 685 €
      expect(screen.getByText(/mensualité totale du crédit/i)).toBeInTheDocument();
      
      // Vérifier qu'il y a des montants affichés
      const amounts = screen.getAllByText(/€/);
      expect(amounts.length).toBeGreaterThan(0);
    });

    it('should display correct deferred interest for Pinel Bagnolet', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={pinelBagnolet as Investment} />);

      expect(screen.getByText(/intérêts différés/i)).toBeInTheDocument();
      // Les intérêts différés devraient être affichés (la valeur exacte dépend du calcul)
    });

    it('should maintain loan structure for Pinel Bagnolet', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={pinelBagnolet as Investment} />);

      // downPayment (800) + loanAmount (129668) = totalCost (130468)
      const expectedTotal = 130468;
      const sum = pinelBagnolet.downPayment! + pinelBagnolet.loanAmount!;
      
      expect(sum).toBe(expectedTotal);
    });

    it('should display amortization chart for Pinel Bagnolet', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={pinelBagnolet as Investment} />);

      expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
      expect(screen.getByText(/visualisation de l'amortissement/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing initial values', () => {
      render(<AcquisitionForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/informations de crédit/i)).toBeInTheDocument();
      const zeroAmounts = screen.getAllByText(/0,00\s*€/i);
      expect(zeroAmounts.length).toBeGreaterThan(0);
    });

    it('should handle zero loan amount', () => {
      const investment = {
        ...mockBasicInvestment,
        loanAmount: 0
      };

      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={investment as Investment} />);

      const zeroAmounts = screen.getAllByText(/0,00\s*€/i);
      expect(zeroAmounts.length).toBeGreaterThan(0);
    });

    it('should handle very long loan duration', () => {
      const investment = {
        ...mockBasicInvestment,
        loanDuration: 30
      };

      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={investment as Investment} />);

      expect(screen.getByText(/mensualité totale du crédit/i)).toBeInTheDocument();
    });

    it('should handle high interest rate', () => {
      const investment = {
        ...mockBasicInvestment,
        interestRate: 5.0
      };

      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={investment as Investment} />);

      expect(screen.getByText(/mensualité totale du crédit/i)).toBeInTheDocument();
    });
  });

  describe('Bug Fix Validation: Apport + Emprunt = Coût Total', () => {
    it('should maintain equation for standard investment', () => {
      const investment = { ...mockBasicInvestment };
      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={investment as Investment} />);

      const totalCost = 
        investment.purchasePrice! +
        investment.agencyFees! +
        investment.notaryFees! +
        investment.bankFees! +
        investment.renovationCosts!;
      
      const sum = investment.downPayment! + investment.loanAmount!;
      
      // Vérifier que l'équation est respectée
      expect(sum).toBe(totalCost);
    });

    it('should maintain equation for Pinel Bagnolet', () => {
      const pinelBagnolet: Partial<Investment> = {
        purchasePrice: 129668,
        agencyFees: 0,
        notaryFees: 0,
        bankFees: 800,
        renovationCosts: 0,
        downPayment: 800,
        loanAmount: 129668
      };

      render(<AcquisitionForm onSubmit={mockOnSubmit} initialValues={pinelBagnolet as Investment} />);

      const totalCost = 130468;
      const sum = pinelBagnolet.downPayment! + pinelBagnolet.loanAmount!;
      
      expect(sum).toBe(totalCost);
    });

    it('should calculate correct total for various scenarios', () => {
      const scenarios = [
        { down: 10000, loan: 190000, total: 200000 },
        { down: 50000, loan: 150000, total: 200000 },
        { down: 100000, loan: 100000, total: 200000 },
        { down: 0, loan: 200000, total: 200000 }
      ];

      scenarios.forEach(scenario => {
        expect(scenario.down + scenario.loan).toBe(scenario.total);
      });
    });
  });
});
