/**
 * Composant AcquisitionDetails
 * 
 * Ce composant affiche les détails de l'acquisition dans la sidebar.
 * Il reprend la forme actuelle du formulaire mais dans un format compact
 * avec des valeurs modifiables et des infobulles d'aide.
 */

import { useState, useEffect } from 'react';
import { Investment } from '../types/investment';
import { HelpCircle, CreditCard } from 'lucide-react';
import { calculateMonthlyPayment, generateAmortizationSchedule } from '../utils/calculations';
import SCISelector from './SCISelector';

interface Props {
  investment: Investment;
  onUpdate: (field: keyof Investment, value: any) => void;
}

export default function AcquisitionDetails({ investment, onUpdate }: Props) {
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [localHasDeferral, setLocalHasDeferral] = useState(investment?.hasDeferral || false);
  
  // Synchroniser l'état local avec les props quand elles changent
  useEffect(() => {
    setLocalHasDeferral(investment?.hasDeferral || false);
  }, [investment?.hasDeferral]);
  
  // Utiliser l'état local pour l'affichage
  const hasDeferral = localHasDeferral;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const totalInvestmentCost = 
    Number(investment?.purchasePrice || 0) +
    Number(investment?.agencyFees || 0) +
    Number(investment?.notaryFees || 0) +
    Number(investment?.bankFees || 0) +
    Number(investment?.bankGuaranteeFees || 0) +
    Number(investment?.mandatoryDiagnostics || 0) +
    Number(investment?.renovationCosts || 0);

  const handleInputChange = (field: keyof Investment, value: any) => {
    // Gestion spéciale pour les champs différés - seulement lors de la désactivation
    if (field === 'hasDeferral' && value === false) {
      onUpdate(field, false);
      onUpdate('deferralType', 'none');
      onUpdate('deferredPeriod', 0);
      onUpdate('deferredInterest', 0);
      return;
    }
    
    const parsedValue = typeof value === 'string' ? (value === '' ? 0 : Number(value)) : value;

    if (typeof value === 'string') {
      onUpdate(field, parsedValue);
    } else {
      onUpdate(field, value);
    }
  };

  const handleDeferralChange = (checked: boolean) => {
    // Mettre à jour l'état local immédiatement pour l'affichage
    setLocalHasDeferral(checked);
    
    if (checked) {
      // Activation du différé - définir des valeurs par défaut
      onUpdate('hasDeferral', true);
      onUpdate('deferralType', 'partial'); // Valeur par défaut
      onUpdate('deferredPeriod', 0);
    } else {
      // Désactivation du différé - réinitialiser
      onUpdate('hasDeferral', false);
      onUpdate('deferralType', 'none');
      onUpdate('deferredPeriod', 0);
      onUpdate('deferredInterest', 0);
    }
  };

  const tooltips = {
    agencyFees: "Généralement inclus dans le prix de vente annoncé, sinon compter entre 3 et 8 %. Laisser à 0 s'ils sont inclus dans le prix de vente.",
    notaryFees: "Montant moyen : environ 7 à 8 % du prix pour l'ancien et 2 à 3 % dans le neuf. Dans le formulaire simplifié, les valeurs utilisées sont : • Bien ancien : 7,5% du prix d'achat • Bien neuf : 2,5% du prix d'achat",
    bankFees: "Généralement entre 500 à 1500 €",
    bankGuaranteeFees: "Hypothèque ou caution, entre 1 et 2 % du montant emprunté",
    mandatoryDiagnostics: "Généralement inclus dans le prix de vente annoncé car il est la plupart du temps à la charge du vendeur. Laisser à 0 si c'est bien le cas.",
    insuranceRate: "Assurance emprunteur (entre 0,1 % et 0,5 % du montant emprunté par an)"
  };

  const monthlyPayment =
    investment?.loanAmount && investment?.interestRate && investment?.loanDuration
      ? calculateMonthlyPayment(
          investment.loanAmount,
          investment.interestRate,
          investment.loanDuration,
          investment.deferralType || 'none',
          Number(investment.deferredPeriod || 0)
        )
      : 0;

  const monthlyInsurance =
    investment?.loanAmount && investment?.insuranceRate
      ? (investment.loanAmount * (investment.insuranceRate / 100)) / 12
      : 0;

  const totalMonthlyPayment = monthlyPayment + monthlyInsurance;

  const amortizationData =
    investment?.loanAmount && investment?.interestRate && investment?.loanDuration
      ? generateAmortizationSchedule(
          investment.loanAmount,
          investment.interestRate,
          investment.loanDuration,
          investment.deferralType || 'none',
          Number(investment.deferredPeriod || 0),
          investment.startDate || new Date().toISOString().split('T')[0]
        )
      : { schedule: [], deferredInterest: 0 };

  const firstNonDeferredRow = amortizationData.schedule.find(row => !row.isDeferred);
  const monthlyInterestPortion = firstNonDeferredRow
    ? firstNonDeferredRow.interest
    : investment?.loanAmount && investment?.interestRate
    ? (investment.loanAmount * investment.interestRate) / 12 / 100
    : 0;

  const downPayment = Number(investment?.downPayment || 0);
  const loanAmount = Number(investment?.loanAmount || 0);
  const financingTotal = downPayment + loanAmount;
  const financingDifference = totalInvestmentCost - financingTotal;
  const hasFinancingMismatch = Math.abs(financingDifference) > 1;

  const baseInputClasses = 'flex-1 px-3 py-1.5 text-sm border rounded-md focus:ring-2 text-right';
  const normalInputClasses = 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
  const errorInputClasses = 'border-red-500 focus:ring-red-500 focus:border-red-500';

  useEffect(() => {
    const expectedLoanAmount = Math.max(totalInvestmentCost - downPayment, 0);
    if (Math.abs(loanAmount - expectedLoanAmount) > 1) {
      onUpdate('loanAmount', expectedLoanAmount);
    }
  }, [
    totalInvestmentCost,
    downPayment,
    loanAmount,
    onUpdate
  ]);

  console.log('AcquisitionDetails render - hasDeferral:', hasDeferral, 'localHasDeferral:', localHasDeferral, 'investment.hasDeferral:', investment?.hasDeferral);
  
  const handleSCIChange = (sciId: string | undefined, propertyValue: number | undefined) => {
    onUpdate('sciId', sciId);
    onUpdate('sciPropertyValue', propertyValue);
  };

  return (
    <div className="space-y-3">
      
      {/* Sélection de la SCI */}
      <SCISelector
        selectedSCIId={investment?.sciId}
        propertyValue={investment?.sciPropertyValue}
        purchasePrice={investment?.purchasePrice || 0}
        onChange={handleSCIChange}
      />
      
      {/* Prix d'achat */}
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex-shrink-0">
          Prix d'achat
        </label>
        <input
          type="number"
          value={investment?.purchasePrice || ''}
          onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
        />
      </div>

      {/* Frais d'agence */}
      <div className="relative group flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
          Frais d'agence
          <HelpCircle 
            className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
            onMouseEnter={() => setHoveredField('agencyFees')}
            onMouseLeave={() => setHoveredField(null)}
          />
        </label>
        {hoveredField === 'agencyFees' && (
          <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
            {tooltips.agencyFees}
          </div>
        )}
        <input
          type="number"
          value={investment?.agencyFees || ''}
          onChange={(e) => handleInputChange('agencyFees', e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
        />
      </div>

      {/* Frais de notaire */}
      <div className="relative group flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
          Frais de notaire
          <HelpCircle 
            className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
            onMouseEnter={() => setHoveredField('notaryFees')}
            onMouseLeave={() => setHoveredField(null)}
          />
        </label>
        {hoveredField === 'notaryFees' && (
          <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-80">
            {tooltips.notaryFees}
          </div>
        )}
        <input
          type="number"
          value={investment?.notaryFees || ''}
          onChange={(e) => handleInputChange('notaryFees', e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
        />
      </div>

      {/* Frais de dossier bancaire */}
      <div className="relative group flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
          Frais de dossier bancaire
          <HelpCircle 
            className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
            onMouseEnter={() => setHoveredField('bankFees')}
            onMouseLeave={() => setHoveredField(null)}
          />
        </label>
        {hoveredField === 'bankFees' && (
          <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
            {tooltips.bankFees}
          </div>
        )}
        <input
          type="number"
          value={investment?.bankFees || ''}
          onChange={(e) => handleInputChange('bankFees', e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
        />
      </div>

      {/* Frais de garantie bancaire */}
      <div className="relative group flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
          Frais de garantie bancaire
          <HelpCircle 
            className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
            onMouseEnter={() => setHoveredField('bankGuaranteeFees')}
            onMouseLeave={() => setHoveredField(null)}
          />
        </label>
        {hoveredField === 'bankGuaranteeFees' && (
          <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
            {tooltips.bankGuaranteeFees}
          </div>
        )}
        <input
          type="number"
          value={investment?.bankGuaranteeFees || ''}
          onChange={(e) => handleInputChange('bankGuaranteeFees', e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
        />
      </div>

      {/* Diagnostics immobiliers */}
      <div className="relative group flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
          Diagnostics immobiliers
          <HelpCircle 
            className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
            onMouseEnter={() => setHoveredField('mandatoryDiagnostics')}
            onMouseLeave={() => setHoveredField(null)}
          />
        </label>
        {hoveredField === 'mandatoryDiagnostics' && (
          <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
            {tooltips.mandatoryDiagnostics}
          </div>
        )}
        <input
          type="number"
          value={investment?.mandatoryDiagnostics || ''}
          onChange={(e) => handleInputChange('mandatoryDiagnostics', e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
        />
      </div>

      {/* Travaux */}
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex-shrink-0">
          Travaux
        </label>
        <input
          type="number"
          value={investment?.renovationCosts || ''}
          onChange={(e) => handleInputChange('renovationCosts', e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
        />
      </div>

      {/* Coût total de l'opération */}
      <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
        <p className="text-sm text-blue-700 font-medium mb-1">Coût total de l'opération</p>
        <p className="text-xl font-bold text-blue-900">
          {formatCurrency(totalInvestmentCost)}
        </p>
      </div>

      {/* Financement */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h4 className="text-md font-semibold text-gray-900">Financement</h4>
        </div>
        
        <div className="space-y-3">
          {/* Date de début */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Date de début
            </label>
            <input
              type="date"
              value={investment?.startDate || ''}
              onChange={(e) => onUpdate('startDate', e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Différé */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Différé
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={hasDeferral}
                onChange={(e) => handleDeferralChange(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Activé</span>
            </div>
          </div>

          {/* Type de différé */}
          {hasDeferral && (
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                Type de différé
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="partial"
                    checked={investment?.deferralType === 'partial'}
                    onChange={(e) => onUpdate('deferralType', e.target.value)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm">Partiel</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="total"
                    checked={investment?.deferralType === 'total'}
                    onChange={(e) => onUpdate('deferralType', e.target.value)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm">Total</span>
                </label>
              </div>
            </div>
          )}

          {/* Différé (mois) */}
          {hasDeferral && (
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                Différé (mois)
              </label>
              <input
                type="number"
                min="0"
                value={investment?.deferredPeriod || ''}
                onChange={(e) => onUpdate('deferredPeriod', Number(e.target.value))}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
              />
            </div>
          )}

          {/* Apport */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Apport
            </label>
            <input
              type="number"
              value={investment?.downPayment || ''}
              onChange={(e) => handleInputChange('downPayment', e.target.value)}
              className={`${baseInputClasses} ${hasFinancingMismatch ? errorInputClasses : normalInputClasses}`}
            />
          </div>
          {hasFinancingMismatch && (
            <p className="text-xs text-red-600 mt-1 text-right">
              Écart de {formatCurrency(financingDifference)} avec le coût total de l'opération.
            </p>
          )}

          {/* Somme empruntée */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Somme empruntée
            </label>
            <input
              type="number"
              value={investment?.loanAmount || ''}
              onChange={(e) => handleInputChange('loanAmount', e.target.value)}
              className={`${baseInputClasses} ${hasFinancingMismatch ? errorInputClasses : normalInputClasses}`}
            />
          </div>
          {hasFinancingMismatch && (
            <p className="text-xs text-red-600 mt-1 text-right">
              Écart de {formatCurrency(financingDifference)} avec le coût total de l'opération.
            </p>
          )}

          {/* Durée */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Durée (années)
            </label>
            <input
              type="number"
              value={investment?.loanDuration || ''}
              onChange={(e) => handleInputChange('loanDuration', e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Taux d'intérêt */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Taux d'intérêt (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={investment?.interestRate || ''}
              onChange={(e) => handleInputChange('interestRate', e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Assurance */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Assurance (%)
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('insuranceRate')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'insuranceRate' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.insuranceRate}
              </div>
            )}
            <input
              type="number"
              step="0.01"
              value={investment?.insuranceRate || ''}
              onChange={(e) => handleInputChange('insuranceRate', e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>
        </div>

        {/* Informations calculées */}
        <div className="space-y-2 pt-2">
          <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-blue-700 font-medium">
                  Mensualité totale du crédit
                  {investment?.deferralType === 'total' && investment?.deferredPeriod && Number(investment.deferredPeriod) > 0 && (
                    <span className="block text-xs text-blue-600">(après différé total)</span>
                  )}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  dont intérêts : {formatCurrency(monthlyInterestPortion)}
                  {monthlyInsurance > 0 && (
                    <>
                      {' '}| assurance : {formatCurrency(monthlyInsurance)}
                    </>
                  )}
                </p>
              </div>
              <p className="text-lg font-bold text-blue-900">
                {formatCurrency(totalMonthlyPayment)}
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-blue-700 font-medium">Intérêts différés</p>
              <p className="text-lg font-bold text-blue-900">
                {formatCurrency(amortizationData.deferredInterest || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
