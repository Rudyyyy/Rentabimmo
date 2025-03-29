/**
 * Composant AcquisitionForm
 * 
 * Ce composant gère le formulaire d'acquisition d'un bien immobilier. Il permet de saisir :
 * 1. Les informations générales du bien (prix, surface, etc.)
 * 2. Les paramètres du prêt (montant, taux, durée, etc.)
 * 3. Les paramètres de revente (augmentation annuelle, frais d'agence, etc.)
 * 
 * Fonctionnalités principales :
 * - Validation des données saisies
 * - Calcul automatique des montants (apport, frais de notaire, etc.)
 * - Sauvegarde des données dans le localStorage
 * - Gestion des différents types de prêts (classique, différé, in fine)
 * 
 * Les calculs prennent en compte :
 * - Les frais de notaire selon le type de bien
 * - Les frais de garantie selon le type de prêt
 * - Les frais de dossier selon le montant du prêt
 * - Les frais d'assurance selon le type de prêt
 */

import { useState, useMemo } from 'react';
import { Investment, YearlyExpenses, ExpenseProjection, TaxRegime, TaxParameters, TaxResults } from '../types/investment';
import { generateAmortizationSchedule } from '../utils/calculations';
import AmortizationTable from './AmortizationTable';
import { Bar } from 'react-chartjs-2';
import { HelpCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  onSubmit: (data: Investment) => void;
  initialValues?: Investment;
}

function AcquisitionForm({ onSubmit, initialValues }: Props) {
  const [showAmortization, setShowAmortization] = useState(false);
  const [loanAmountWarning, setLoanAmountWarning] = useState(false);

  const handleInputChange = (field: keyof Investment, value: string | number | boolean) => {
    let updatedInvestment = {
      ...initialValues,
      [field]: value,
      projectStartDate: field === 'projectStartDate' ? (value as string) : (initialValues?.projectStartDate || ''),
      projectEndDate: field === 'projectEndDate' ? (value as string) : (initialValues?.projectEndDate || ''),
      purchasePrice: field === 'purchasePrice' ? (value as number) : (initialValues?.purchasePrice || 0),
      agencyFees: field === 'agencyFees' ? (value as number) : (initialValues?.agencyFees || 0),
      notaryFees: field === 'notaryFees' ? (value as number) : (initialValues?.notaryFees || 0),
      bankFees: field === 'bankFees' ? (value as number) : (initialValues?.bankFees || 0),
      bankGuaranteeFees: field === 'bankGuaranteeFees' ? (value as number) : (initialValues?.bankGuaranteeFees || 0),
      mandatoryDiagnostics: field === 'mandatoryDiagnostics' ? (value as number) : (initialValues?.mandatoryDiagnostics || 0),
      renovationCosts: field === 'renovationCosts' ? (value as number) : (initialValues?.renovationCosts || 0),
      downPayment: field === 'downPayment' ? (value as number) : (initialValues?.downPayment || 0),
      loanAmount: field === 'loanAmount' ? (value as number) : (initialValues?.loanAmount || 0),
      loanDuration: field === 'loanDuration' ? (value as number) : (initialValues?.loanDuration || 0),
      interestRate: field === 'interestRate' ? (value as number) : (initialValues?.interestRate || 0),
      insuranceRate: field === 'insuranceRate' ? (value as number) : (initialValues?.insuranceRate || 0),
      startDate: field === 'startDate' ? (value as string) : (initialValues?.startDate || ''),
      hasDeferral: field === 'hasDeferral' ? (value as boolean) : (initialValues?.hasDeferral || false),
      deferralType: field === 'deferralType' ? (value as 'none' | 'partial' | 'total') : (initialValues?.deferralType || 'none'),
      deferredPeriod: field === 'deferredPeriod' ? (value as number) : (initialValues?.deferredPeriod || 0),
      deferredInterest: field === 'deferredInterest' ? (value as number) : (initialValues?.deferredInterest || 0),
      propertyTax: field === 'propertyTax' ? (value as number) : (initialValues?.propertyTax || 0),
      condoFees: field === 'condoFees' ? (value as number) : (initialValues?.condoFees || 0),
      propertyInsurance: field === 'propertyInsurance' ? (value as number) : (initialValues?.propertyInsurance || 0),
      managementFees: field === 'managementFees' ? (value as number) : (initialValues?.managementFees || 0),
      unpaidRentInsurance: field === 'unpaidRentInsurance' ? (value as number) : (initialValues?.unpaidRentInsurance || 0),
      expenses: field === 'expenses' ? (value as unknown as YearlyExpenses[]) : (initialValues?.expenses || []),
      expenseProjection: field === 'expenseProjection' ? (value as unknown as ExpenseProjection) : (initialValues?.expenseProjection || {
        propertyTaxIncrease: 0,
        condoFeesIncrease: 0,
        propertyInsuranceIncrease: 0,
        managementFeesIncrease: 0,
        unpaidRentInsuranceIncrease: 0,
        renovationCostsIncrease: 0,
        otherExpensesIncrease: 0,
        repairsIncrease: 0,
        otherDeductibleIncrease: 0,
        otherNonDeductibleIncrease: 0,
        rentIncrease: 0,
        tenantChargesIncrease: 0,
        taxBenefitIncrease: 0,
        furnishedRentIncrease: 0,
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
        type: 'fixed',
        value: 0
      }),
      saleDate: field === 'saleDate' ? (value as string) : (initialValues?.saleDate || ''),
      appreciationType: field === 'appreciationType' ? (value as 'global' | 'annual' | 'amount') : (initialValues?.appreciationType || 'global'),
      appreciationValue: field === 'appreciationValue' ? (value as number) : (initialValues?.appreciationValue || 0),
      saleAgencyFees: field === 'saleAgencyFees' ? (value as number) : (initialValues?.saleAgencyFees || 0),
      improvementWorks: field === 'improvementWorks' ? (value as number) : (initialValues?.improvementWorks || 0),
      isLMP: field === 'isLMP' ? (value as boolean) : (initialValues?.isLMP || false),
      accumulatedDepreciation: field === 'accumulatedDepreciation' ? (value as number) : (initialValues?.accumulatedDepreciation || 0),
      selectedRegime: field === 'selectedRegime' ? (value as TaxRegime) : (initialValues?.selectedRegime || 'micro-foncier'),
      taxParameters: field === 'taxParameters' ? (value as unknown as TaxParameters) : (initialValues?.taxParameters || {
        taxRate: 0.30,
        socialChargesRate: 0.1728,
        buildingValue: 0,
        buildingAmortizationYears: 0,
        furnitureValue: 0,
        furnitureAmortizationYears: 0,
        previousDeficit: 0,
        deficitLimit: 0,
        rent: 0,
        furnishedRent: 0,
        tenantCharges: 0,
        taxBenefit: 0,
        microFoncier: { rate: 0.30 },
        microBIC: { rate: 0.50 },
        real: { rate: 0.1728 },
        nonProfessional: { rate: 0.1728 },
        professional: { rate: 0.1728 }
      }),
      taxResults: field === 'taxResults' ? (value as unknown as Record<TaxRegime, TaxResults>) : (initialValues?.taxResults || {
        'micro-foncier': { tax: 0, socialCharges: 0, regime: 'micro-foncier', taxableIncome: 0, totalTax: 0, netIncome: 0 },
        'micro-bic': { tax: 0, socialCharges: 0, regime: 'micro-bic', taxableIncome: 0, totalTax: 0, netIncome: 0 },
        'reel-foncier': { tax: 0, socialCharges: 0, regime: 'reel-foncier', taxableIncome: 0, totalTax: 0, netIncome: 0 },
        'reel-bic': { tax: 0, socialCharges: 0, regime: 'reel-bic', taxableIncome: 0, totalTax: 0, netIncome: 0 },
        'non-professional': { tax: 0, socialCharges: 0, regime: 'non-professional', taxableIncome: 0, totalTax: 0, netIncome: 0 },
        'professional': { tax: 0, socialCharges: 0, regime: 'professional', taxableIncome: 0, totalTax: 0, netIncome: 0 }
      }),
    };

    // Reset deferral-related fields when hasDeferral is set to false
    if (field === 'hasDeferral' && value === false) {
      updatedInvestment = {
        ...updatedInvestment,
        deferralType: 'none',
        deferredPeriod: 0,
        deferredInterest: 0
      };
    }

    // Calculate total investment cost
    const totalCost = 
      Number(updatedInvestment.purchasePrice || 0) +
      Number(updatedInvestment.agencyFees || 0) +
      Number(updatedInvestment.notaryFees || 0) +
      Number(updatedInvestment.bankFees || 0) +
      Number(updatedInvestment.bankGuaranteeFees || 0) +
      Number(updatedInvestment.mandatoryDiagnostics || 0) +
      Number(updatedInvestment.renovationCosts || 0);

    // Auto-calculate loan amount when downPayment changes
    if (field === 'downPayment') {
      const calculatedLoanAmount = totalCost - Number(value);
      updatedInvestment.loanAmount = calculatedLoanAmount;
      setLoanAmountWarning(false);
    }

    // Check loan amount consistency
    if (field === 'loanAmount') {
      const expectedLoanAmount = totalCost - Number(updatedInvestment.downPayment || 0);
      setLoanAmountWarning(Number(value) !== expectedLoanAmount);
    }

    // Recalculate deferredInterest when relevant fields change
    if (['loanAmount', 'interestRate', 'deferredPeriod', 'deferralType'].includes(field)) {
      const { deferredInterest } = generateAmortizationSchedule(
        updatedInvestment.loanAmount,
        updatedInvestment.interestRate,
        updatedInvestment.loanDuration,
        updatedInvestment.deferralType,
        updatedInvestment.deferredPeriod,
        updatedInvestment.startDate
      );
      updatedInvestment.deferredInterest = deferredInterest;
    }

    onSubmit(updatedInvestment);
  };

  const amortizationResult = useMemo(() => {
    if (!initialValues?.loanAmount || !initialValues?.interestRate || !initialValues?.loanDuration) {
      return { schedule: [], deferredInterest: 0 };
    }
    return generateAmortizationSchedule(
      initialValues.loanAmount,
      initialValues.interestRate,
      initialValues.loanDuration,
      initialValues.deferralType,
      initialValues.deferredPeriod,
      initialValues.startDate
    );
  }, [
    initialValues?.loanAmount,
    initialValues?.interestRate,
    initialValues?.loanDuration,
    initialValues?.deferralType,
    initialValues?.deferredPeriod,
    initialValues?.startDate
  ]);

  const chartData = {
    labels: amortizationResult.schedule
      .filter((_, index) => index % 12 === 0)
      .map(row => {
        const date = new Date(row.date);
        return `${date.getFullYear()}`;
      }),
    datasets: [
      {
        label: 'Capital',
        data: amortizationResult.schedule
          .filter((_, index) => index % 12 === 0)
          .map(row => row.principal),
        backgroundColor: 'rgb(59, 130, 246)',
        stack: 'Stack 0',
      },
      {
        label: 'Intérêts',
        data: amortizationResult.schedule
          .filter((_, index) => index % 12 === 0)
          .map(row => row.interest),
        backgroundColor: 'rgb(239, 68, 68)',
        stack: 'Stack 0',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Répartition capital / intérêts par année'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR' 
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      }
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const totalInvestmentCost = 
    Number(initialValues?.purchasePrice || 0) +
    Number(initialValues?.agencyFees || 0) +
    Number(initialValues?.notaryFees || 0) +
    Number(initialValues?.bankFees || 0) +
    Number(initialValues?.bankGuaranteeFees || 0) +
    Number(initialValues?.mandatoryDiagnostics || 0) +
    Number(initialValues?.renovationCosts || 0);

  return (
    <div className="space-y-6">
      {/* Project Dates */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Dates du projet</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de début
            </label>
            <input
              type="date"
              value={initialValues?.projectStartDate || ''}
              onChange={(e) => handleInputChange('projectStartDate', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de fin
            </label>
            <input
              type="date"
              value={initialValues?.projectEndDate || ''}
              onChange={(e) => handleInputChange('projectEndDate', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Purchase Details */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Détails d'acquisition</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Prix d'achat
            </label>
            <input
              type="number"
              value={initialValues?.purchasePrice || ''}
              onChange={(e) => handleInputChange('purchasePrice', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Frais d'agence
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Généralement inclus dans le prix de vente annoncé, sinon compter entre 3 et 8 %. Laisser à 0 s'ils sont inclus dans le prix de vente.
            </div>
            <input
              type="number"
              value={initialValues?.agencyFees || ''}
              onChange={(e) => handleInputChange('agencyFees', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Frais de notaire
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Montant moyen : environ 7 à 8 % du prix pour l'ancien et 2 à 3 % dans le neuf.
            </div>
            <input
              type="number"
              value={initialValues?.notaryFees || ''}
              onChange={(e) => handleInputChange('notaryFees', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Frais de dossier bancaire
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Généralement entre 500 à 1500 €
            </div>
            <input
              type="number"
              value={initialValues?.bankFees || ''}
              onChange={(e) => handleInputChange('bankFees', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Frais de garantie bancaire
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Hypothèque ou caution, entre 1 et 2 % du montant emprunté
            </div>
            <input
              type="number"
              value={initialValues?.bankGuaranteeFees || ''}
              onChange={(e) => handleInputChange('bankGuaranteeFees', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Diagnostics immobiliers obligatoires
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Généralement inclus dans le prix de vente annoncé car il est la plupart du temps à la charge du vendeur. Laisser à 0 si c'est bien le cas.
            </div>
            <input
              type="number"
              value={initialValues?.mandatoryDiagnostics || ''}
              onChange={(e) => handleInputChange('mandatoryDiagnostics', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Travaux
            </label>
            <input
              type="number"
              value={initialValues?.renovationCosts || ''}
              onChange={(e) => handleInputChange('renovationCosts', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-gray-50 p-4 rounded-md w-full">
              <p className="text-sm text-gray-600">Coût total de l'opération</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(totalInvestmentCost)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financing */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Financement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de début
            </label>
            <input
              type="date"
              value={initialValues?.startDate || ''}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={initialValues?.hasDeferral || false}
                onChange={(e) => handleInputChange('hasDeferral', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Différé</span>
            </label>
          </div>

          {initialValues?.hasDeferral && (
            <>
              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Type de différé
                  <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
                </label>
                <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-96">
                  • Différé total : Pendant cette période, vous ne remboursez ni capital, ni intérêts. Tous les intérêts s'ajoutent au capital restant dû.<br/>
                  • Différé partiel : Vous remboursez uniquement les intérêts du prêt, mais pas le capital.
                </div>
                <div className="mt-2 space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="partial"
                      checked={initialValues.deferralType === 'partial'}
                      onChange={(e) => handleInputChange('deferralType', e.target.value)}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2">Partiel</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="total"
                      checked={initialValues.deferralType === 'total'}
                      onChange={(e) => handleInputChange('deferralType', e.target.value)}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2">Total</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Différé (mois)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialValues?.deferredPeriod || ''}
                  onChange={(e) => handleInputChange('deferredPeriod', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {initialValues.deferralType === 'total' && initialValues.deferredInterest > 0 && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Intérêts du différé
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(initialValues.deferredInterest)}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Apport
            </label>
            <input
              type="number"
              value={initialValues?.downPayment || ''}
              onChange={(e) => handleInputChange('downPayment', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Somme empruntée
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              La valeur doit être égale au coût total de l'opération moins l'apport.
            </div>
            <div className="space-y-1">
              <input
                type="number"
                value={initialValues?.loanAmount || ''}
                onChange={(e) => handleInputChange('loanAmount', Number(e.target.value))}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  loanAmountWarning ? 'border-red-300' : ''
                }`}
              />
              {loanAmountWarning && (
                <p className="text-sm text-red-600">
                  La valeur donnée est incohérente : la somme empruntée devrait être égale au coût total de l'opération moins l'apport.
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Durée (années)
            </label>
            <input
              type="number"
              value={initialValues?.loanDuration || ''}
              onChange={(e) => handleInputChange('loanDuration', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Taux d'intérêt (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={initialValues?.interestRate || ''}
              onChange={(e) => handleInputChange('interestRate', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Assurance (%)
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Assurance emprunteur (entre 0,1 % et 0,5 % du montant emprunté par an)
            </div>
            <input
              type="number"
              step="0.01"
              value={initialValues?.insuranceRate || ''}
              onChange={(e) => handleInputChange('insuranceRate', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Graphique d'amortissement */}
        {amortizationResult.schedule.length > 0 && (
          <div className="mt-6">
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAmortization(true)}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Voir le tableau d'amortissement détaillé
              </button>
            </div>
          </div>
        )}
      </div>

      {showAmortization && (
        <AmortizationTable
          schedule={amortizationResult.schedule}
          onClose={() => setShowAmortization(false)}
        />
      )}
    </div>
  );
}

export default AcquisitionForm;