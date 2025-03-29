import React from 'react';
import { Investment } from '../types/investment';
import { formatCurrency } from '../utils/formatters';

interface InvestmentSummaryProps {
  investment: Investment;
  currentYear: number;
}

export const InvestmentSummary: React.FC<InvestmentSummaryProps> = ({ investment, currentYear }) => {
  const currentYearExpense = investment.expenses.find(e => e.year === currentYear);
  const annualRent = Number(currentYearExpense?.rent || 0);
  const tenantCharges = Number(currentYearExpense?.tenantCharges || 0);
  const taxBenefit = Number(currentYearExpense?.taxBenefit || 0);
  const totalInvestmentCost = 
    Number(investment.purchasePrice) + 
    Number(investment.renovationCosts) + 
    Number(investment.notaryFees) + 
    Number(investment.agencyFees) +
    Number(investment.bankFees) +
    Number(investment.bankGuaranteeFees) +
    Number(investment.mandatoryDiagnostics);

  const calculateGrossYield = () => {
    return (annualRent / totalInvestmentCost) * 100;
  };

  const calculateNetYield = () => {
    // Calcul des revenus totaux (loyers + charges locataire + aide fiscale)
    const totalRevenue = annualRent + tenantCharges + taxBenefit;

    // Calcul des charges annuelles
    const annualCharges = 
      Number(currentYearExpense?.propertyTax || 0) +
      Number(currentYearExpense?.condoFees || 0) +
      Number(currentYearExpense?.propertyInsurance || 0) +
      Number(currentYearExpense?.managementFees || 0) +
      Number(currentYearExpense?.unpaidRentInsurance || 0) +
      Number(currentYearExpense?.repairs || 0) +
      Number(currentYearExpense?.otherDeductible || 0) +
      Number(currentYearExpense?.otherNonDeductible || 0) +
      Number(currentYearExpense?.loanPayment || 0) +
      Number(currentYearExpense?.loanInsurance || 0);

    // Calcul du revenu net (revenus totaux - charges - impôts)
    const netIncome = totalRevenue - annualCharges - Number(currentYearExpense?.tax || 0);

    // Calcul du rendement net
    return (netIncome / totalInvestmentCost) * 100;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Rentabilité globale</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rendement brut */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Rendement brut actuel</h3>
          <div className="text-2xl font-bold text-gray-900">
            {calculateGrossYield().toFixed(2)}%
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Calculé à partir des loyers annuels de {formatCurrency(annualRent)} et d'un coût total de {formatCurrency(totalInvestmentCost)}
          </div>
        </div>

        {/* Rendement net */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Rendement net actuel</h3>
          <div className="text-2xl font-bold text-gray-900">
            {calculateNetYield().toFixed(2)}%
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Calculé à partir des revenus totaux de {formatCurrency(annualRent + tenantCharges + taxBenefit)} (loyers + charges locataire + aide fiscale), des charges de {formatCurrency(Number(currentYearExpense?.propertyTax || 0) + Number(currentYearExpense?.condoFees || 0) + Number(currentYearExpense?.propertyInsurance || 0) + Number(currentYearExpense?.managementFees || 0) + Number(currentYearExpense?.unpaidRentInsurance || 0) + Number(currentYearExpense?.repairs || 0) + Number(currentYearExpense?.otherDeductible || 0) + Number(currentYearExpense?.otherNonDeductible || 0) + Number(currentYearExpense?.loanPayment || 0) + Number(currentYearExpense?.loanInsurance || 0))}, des impôts de {formatCurrency(Number(currentYearExpense?.tax || 0))} et d'un coût total de {formatCurrency(totalInvestmentCost)}
          </div>
        </div>
      </div>
    </div>
  );
}; 