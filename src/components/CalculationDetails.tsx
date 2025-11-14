/**
 * Composant CalculationDetails
 * 
 * Affiche les détails des calculs financiers et fiscaux
 * avec des explications et formules interactives
 */

import { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiCalculator } from 'react-icons/fi';
import Tooltip, { TooltipFormula } from './Tooltip';

interface CalculationStep {
  label: string;
  value: number | string;
  formula?: string;
  explanation?: string;
  subSteps?: CalculationStep[];
}

interface CalculationDetailsProps {
  title: string;
  description?: string;
  steps: CalculationStep[];
  finalResult?: {
    label: string;
    value: number | string;
  };
  defaultExpanded?: boolean;
  className?: string;
}

export default function CalculationDetails({
  title,
  description,
  steps,
  finalResult,
  defaultExpanded = false,
  className = ''
}: CalculationDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const formatValue = (value: number | string): string => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
    return value;
  };

  const renderStep = (step: CalculationStep, level: number = 0) => (
    <div
      key={step.label}
      className={`${level > 0 ? 'ml-6 mt-2' : 'mt-3'}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Label avec tooltip si formule disponible */}
        <div className="flex items-center gap-2 flex-1">
          <span className={`${level === 0 ? 'font-medium' : 'text-sm text-gray-600'}`}>
            {step.label}
          </span>
          
          {step.formula && (
            <TooltipFormula
              formula={step.formula}
              explanation={step.explanation}
              position="right"
            />
          )}
        </div>

        {/* Valeur */}
        <span className={`font-mono ${level === 0 ? 'font-semibold' : 'text-sm'}`}>
          {formatValue(step.value)}
        </span>
      </div>

      {/* Sous-étapes */}
      {step.subSteps && step.subSteps.length > 0 && (
        <div className="mt-2">
          {step.subSteps.map(subStep => renderStep(subStep, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* En-tête */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FiCalculator className="text-blue-600" size={20} />
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        
        {isExpanded ? (
          <FiChevronUp className="text-gray-400" size={20} />
        ) : (
          <FiChevronDown className="text-gray-400" size={20} />
        )}
      </button>

      {/* Contenu détaillé */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Étapes de calcul */}
          <div className="space-y-1">
            {steps.map(step => renderStep(step))}
          </div>

          {/* Résultat final */}
          {finalResult && (
            <div className="mt-4 pt-4 border-t-2 border-blue-100">
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                <span className="font-semibold text-blue-900">
                  {finalResult.label}
                </span>
                <span className="font-mono text-lg font-bold text-blue-600">
                  {formatValue(finalResult.value)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Composants pré-configurés pour les calculs spécifiques
 */

interface MonthlyPaymentDetailsProps {
  loanAmount: number;
  interestRate: number;
  years: number;
  monthlyPayment: number;
}

export function MonthlyPaymentDetails({
  loanAmount,
  interestRate,
  years,
  monthlyPayment
}: MonthlyPaymentDetailsProps) {
  const monthlyRate = interestRate / 12 / 100;
  const numberOfPayments = years * 12;

  const steps: CalculationStep[] = [
    {
      label: 'Montant emprunté',
      value: `${loanAmount.toLocaleString('fr-FR')} €`
    },
    {
      label: 'Taux annuel',
      value: `${interestRate} %`
    },
    {
      label: 'Taux mensuel',
      value: `${(monthlyRate * 100).toFixed(4)} %`,
      formula: 'Taux mensuel = Taux annuel ÷ 12 ÷ 100',
      explanation: 'Le taux annuel est divisé par 12 pour obtenir le taux mensuel'
    },
    {
      label: 'Nombre de mensualités',
      value: numberOfPayments,
      formula: 'Nombre de mensualités = Années × 12'
    }
  ];

  return (
    <CalculationDetails
      title="Calcul de la mensualité"
      description="Formule de l'emprunt à taux fixe"
      steps={steps}
      finalResult={{
        label: 'Mensualité',
        value: `${monthlyPayment.toLocaleString('fr-FR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })} €`
      }}
    />
  );
}

interface GrossYieldDetailsProps {
  annualRent: number;
  totalInvestment: number;
  grossYield: number;
  breakdown?: {
    purchasePrice: number;
    fees: number;
    renovation: number;
  };
}

export function GrossYieldDetails({
  annualRent,
  totalInvestment,
  grossYield,
  breakdown
}: GrossYieldDetailsProps) {
  const steps: CalculationStep[] = [
    {
      label: 'Loyer annuel brut',
      value: `${annualRent.toLocaleString('fr-FR')} €`,
      explanation: 'Loyer mensuel × 12'
    },
    {
      label: 'Coût total de l\'investissement',
      value: `${totalInvestment.toLocaleString('fr-FR')} €`,
      subSteps: breakdown ? [
        {
          label: 'Prix d\'achat',
          value: `${breakdown.purchasePrice.toLocaleString('fr-FR')} €`
        },
        {
          label: 'Frais (notaire + agence)',
          value: `${breakdown.fees.toLocaleString('fr-FR')} €`
        },
        {
          label: 'Travaux',
          value: `${breakdown.renovation.toLocaleString('fr-FR')} €`
        }
      ] : undefined
    }
  ];

  return (
    <CalculationDetails
      title="Calcul du rendement brut"
      description="Rendement locatif avant charges et impôts"
      steps={steps}
      finalResult={{
        label: 'Rendement brut',
        value: `${grossYield.toFixed(2)} %`
      }}
    />
  );
}

interface TaxCalculationDetailsProps {
  regime: 'micro-foncier' | 'reel-foncier' | 'micro-bic' | 'reel-bic';
  annualRevenue: number;
  deductibleExpenses?: number;
  allowanceRate?: number;
  taxableIncome: number;
  taxRate: number;
  socialChargesRate: number;
  tax: number;
  socialCharges: number;
  totalTax: number;
}

export function TaxCalculationDetails({
  regime,
  annualRevenue,
  deductibleExpenses,
  allowanceRate,
  taxableIncome,
  taxRate,
  socialChargesRate,
  tax,
  socialCharges,
  totalTax
}: TaxCalculationDetailsProps) {
  const regimeLabels = {
    'micro-foncier': 'Micro-foncier (30% d\'abattement)',
    'reel-foncier': 'Réel foncier (frais réels)',
    'micro-bic': 'Micro-BIC (50% d\'abattement)',
    'reel-bic': 'Réel BIC (frais réels + amortissements)'
  };

  const isMicro = regime === 'micro-foncier' || regime === 'micro-bic';

  const steps: CalculationStep[] = [
    {
      label: 'Revenus locatifs annuels',
      value: `${annualRevenue.toLocaleString('fr-FR')} €`
    }
  ];

  if (isMicro && allowanceRate) {
    steps.push({
      label: `Abattement forfaitaire (${allowanceRate * 100}%)`,
      value: `${(annualRevenue * allowanceRate).toLocaleString('fr-FR')} €`,
      formula: `Abattement = Revenus × ${allowanceRate * 100}%`,
      explanation: 'Abattement forfaitaire couvrant les charges'
    });
  } else if (deductibleExpenses !== undefined) {
    steps.push({
      label: 'Charges déductibles',
      value: `${deductibleExpenses.toLocaleString('fr-FR')} €`,
      explanation: 'Charges réelles (taxe foncière, travaux, intérêts d\'emprunt, etc.)'
    });
  }

  steps.push(
    {
      label: 'Revenu imposable',
      value: `${taxableIncome.toLocaleString('fr-FR')} €`,
      formula: isMicro
        ? `Revenu imposable = Revenus × (1 - ${allowanceRate! * 100}%)`
        : 'Revenu imposable = Revenus - Charges déductibles'
    },
    {
      label: `Impôt sur le revenu (${taxRate}%)`,
      value: `${tax.toLocaleString('fr-FR')} €`,
      formula: `Impôt = Revenu imposable × ${taxRate}%`
    },
    {
      label: `Prélèvements sociaux (${socialChargesRate}%)`,
      value: `${socialCharges.toLocaleString('fr-FR')} €`,
      formula: `Prélèvements = Revenu imposable × ${socialChargesRate}%`
    }
  );

  return (
    <CalculationDetails
      title={`Calcul fiscal - ${regimeLabels[regime]}`}
      description="Détail du calcul de l'imposition"
      steps={steps}
      finalResult={{
        label: 'Total impôts et charges sociales',
        value: `${totalTax.toLocaleString('fr-FR')} €`
      }}
    />
  );
}









