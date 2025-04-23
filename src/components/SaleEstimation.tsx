/**
 * Composant SaleEstimation
 * 
 * Ce composant gère l'estimation et l'affichage des résultats de revente d'un investissement immobilier.
 * Il permet de simuler différents scénarios de revente en tenant compte de plusieurs paramètres :
 * 
 * Fonctionnalités principales :
 * - Calcul du solde en fin d'opération (global, annuel, mensuel)
 * - Simulation de revente avec différents types de revalorisation (global, annuel, montant fixe)
 * - Gestion des paramètres de revente (frais d'agence, remboursement anticipé)
 * - Affichage des résultats détaillés (prix de vente, capital restant dû, bénéfice net, plus-value)
 * - Calcul du solde total de l'opération (avec ou sans revente)
 * 
 * Le composant utilise des tooltips pour expliquer les calculs et propose une interface
 * intuitive pour modifier les paramètres de revente.
 */

import { useState, useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import { Investment } from '../types/investment';

// Interface définissant les props du composant
interface Props {
  saleProfit: number;
  capitalGain: number;
  appreciationType: 'global' | 'annual' | 'amount';
  appreciationValue: number;
  purchasePrice: number;
  investment: Investment;
  onUpdate: (updatedInvestment: Investment) => void;
}

export default function SaleEstimation({ 
  saleProfit, 
  capitalGain, 
  appreciationValue,
  purchasePrice,
  investment,
  onUpdate
}: Props) {
  // États pour gérer l'inclusion de la revente et le remboursement anticipé
  const [includeSale, setIncludeSale] = useState<boolean>(true);
  const [earlyRepayment, setEarlyRepayment] = useState<number>(0);

  // Fonctions utilitaires pour le formatage des valeurs
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(value / 100);

  // Gestionnaire de modification des champs d'investissement
  const handleInputChange = (field: keyof Investment, value: string | number) => {
    const updatedInvestment = {
      ...investment,
      [field]: value
    };
    onUpdate(updatedInvestment);
  };

  // Fonction pour obtenir le libellé de revalorisation selon le type choisi
  const getAppreciationLabel = () => {
    switch (investment.appreciationType) {
      case 'global':
        return `Revalorisation globale de ${formatPercent(investment.appreciationValue)}`;
      case 'annual':
        return `Revalorisation annuelle de ${formatPercent(investment.appreciationValue)}`;
      case 'amount':
        return `Prix de vente estimé : ${formatCurrency(investment.appreciationValue)}`;
      default:
        return '';
    }
  };

  // Calcul des métriques d'opération (solde global, mensuel, annuel)
  const operationMetrics = useMemo(() => {
    const startDate = new Date(investment.projectStartDate);
    const endDate = new Date(investment.projectEndDate);
    const monthsDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    const yearsDiff = monthsDiff / 12;

    // Calcul du solde global (somme des cash-flows)
    let globalBalance = 0;
    for (const expense of investment.expenses) {
      const totalRevenue = Number(expense.rent || 0);
      const totalExpenses = 
        Number(expense.propertyTax || 0) +
        Number(expense.condoFees || 0) +
        Number(expense.propertyInsurance || 0) +
        Number(expense.managementFees || 0) +
        Number(expense.unpaidRentInsurance || 0) +
        Number(expense.repairs || 0) +
        Number(expense.otherDeductible || 0) +
        Number(expense.otherNonDeductible || 0) +
        Number(expense.loanPayment || 0) +
        Number(expense.loanInsurance || 0) +
        Number(expense.tax || 0);

      globalBalance += totalRevenue - totalExpenses;
    }

    return {
      globalBalance,
      monthlyBalance: globalBalance / monthsDiff,
      annualBalance: globalBalance / yearsDiff,
      months: monthsDiff,
      years: yearsDiff,
      finalYearCashFlow: investment.expenses
        .filter(e => new Date(e.year, 0).getFullYear() === endDate.getFullYear())
        .reduce((sum, expense) => {
          const revenue = Number(expense.rent || 0);
          const expenses = 
            Number(expense.propertyTax || 0) +
            Number(expense.condoFees || 0) +
            Number(expense.propertyInsurance || 0) +
            Number(expense.managementFees || 0) +
            Number(expense.unpaidRentInsurance || 0) +
            Number(expense.repairs || 0) +
            Number(expense.otherDeductible || 0) +
            Number(expense.otherNonDeductible || 0) +
            Number(expense.loanPayment || 0) +
            Number(expense.loanInsurance || 0) +
            Number(expense.tax || 0);
          return sum + (revenue - expenses);
        }, 0)
    };
  }, [investment]);

  // Calcul du bénéfice net de revente et du solde total
  const adjustedSaleProfit = saleProfit - earlyRepayment;
  const totalBalance = includeSale ? adjustedSaleProfit + operationMetrics.globalBalance : operationMetrics.globalBalance;

  return (
    <div className="space-y-6">
      {/* Section : Solde en fin d'opération */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Solde en fin d'opération</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Solde global</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(operationMetrics.globalBalance)}
              </p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
              <p>Somme de tous les cash-flows sur la durée de l'opération</p>
            </div>
          </div>

          <div className="relative group">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Solde annuel</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(operationMetrics.annualBalance)}
              </p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
              <p>Solde global / {operationMetrics.years.toFixed(2)} années</p>
            </div>
          </div>

          <div className="relative group">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Solde mensuel</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(operationMetrics.monthlyBalance)}
              </p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
              <p>Solde global / {operationMetrics.months.toFixed(2)} mois</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section : Option de revente */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Revente</h3>
          <div className="space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={includeSale}
                onChange={() => setIncludeSale(true)}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2">Oui</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={!includeSale}
                onChange={() => setIncludeSale(false)}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2">Non</span>
            </label>
          </div>
        </div>
      </div>

      {includeSale ? (
        <>
          {/* Section : Paramètres de revente */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Paramètres de revente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700">
                  Date de vente
                  <HelpCircle className="inline-block ml-1 h-4 w-4 text-gray-400" />
                </label>
                <input
                  type="date"
                  value={investment.projectEndDate}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                  <p>Date de fin de projet, non modifiable</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type de revalorisation
                </label>
                <select
                  value={investment.appreciationType}
                  onChange={(e) => handleInputChange('appreciationType', e.target.value as 'global' | 'annual' | 'amount')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="global">Pourcentage global</option>
                  <option value="annual">Pourcentage annuel</option>
                  <option value="amount">Montant fixe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {investment.appreciationType === 'amount' ? 'Prix de vente estimé' : 'Pourcentage de revalorisation'}
                </label>
                <input
                  type="number"
                  step={investment.appreciationType === 'amount' ? '1000' : '0.1'}
                  value={investment.appreciationValue || 0}
                  onChange={(e) => handleInputChange('appreciationValue', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Frais d'agence
                </label>
                <input
                  type="number"
                  step="1000"
                  value={investment.saleAgencyFees || 0}
                  onChange={(e) => handleInputChange('saleAgencyFees', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700">
                  Remboursement anticipé
                  <HelpCircle className="inline-block ml-1 h-4 w-4 text-gray-400" />
                </label>
                <input
                  type="number"
                  step="1000"
                  value={earlyRepayment}
                  onChange={(e) => setEarlyRepayment(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                  <p>Montant du remboursement anticipé qui sera déduit du bénéfice net</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section : Résultats de la revente */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Résultats de la revente</h3>
            <p className="text-sm text-gray-600 mb-4">{getAppreciationLabel()}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-600">Prix de vente estimé</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(investment.appreciationType === 'amount' ? investment.appreciationValue : purchasePrice * (1 + appreciationValue / 100))}
                  </p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                  <p>Prix de vente calculé selon le type de revalorisation choisi</p>
                </div>
              </div>

              <div className="relative group">
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-600">Capital restant dû</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(investment.remainingBalance || 0)}
                  </p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                  <p>Montant restant à rembourser sur le prêt</p>
                </div>
              </div>
              
              <div className="relative group">
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-600">Bénéfice net</p>
                  <p className={`text-xl font-semibold ${adjustedSaleProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(adjustedSaleProfit)}
                  </p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                  <p>Prix de vente - Capital restant dû - Remboursement anticipé</p>
                </div>
              </div>
              
              <div className="relative group">
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-600">Plus-value brute</p>
                  <p className={`text-xl font-semibold ${capitalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(capitalGain)}
                  </p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                  <p>Prix de vente - Prix d'achat initial</p>
                </div>
              </div>

              <div className="relative group col-span-2">
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-600">Impôt sur la plus-value</p>
                  <p className="text-xl font-semibold text-gray-900">En construction</p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                  <p>Calcul de l'impôt sur la plus-value immobilière en cours d'implémentation</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Section : Revenu passif (sans revente)
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Revenu passif généré</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative group">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Cash-flow annuel</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(operationMetrics.finalYearCashFlow)}
                </p>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                <p>Cash-flow de la dernière année du projet</p>
              </div>
            </div>

            <div className="relative group">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Cash-flow mensuel</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(operationMetrics.finalYearCashFlow / 12)}
                </p>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                <p>Cash-flow mensuel de la dernière année du projet</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section : Solde total de l'opération */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Solde total de l'opération</h3>
        <div className="relative group">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-600">Total</p>
            <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
            <p>{includeSale ? 'Solde global + Bénéfice net de la revente' : 'Solde global uniquement'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}