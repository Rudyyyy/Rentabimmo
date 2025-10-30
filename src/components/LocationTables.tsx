/**
 * Composant LocationTables
 * 
 * Ce composant affiche les tableaux historiques et de projections pour la section location.
 * Il est destiné à être affiché dans la zone principale de droite.
 * 
 * Fonctionnalités principales :
 * - Affichage des tableaux historiques (données passées)
 * - Affichage des tableaux de projections (données futures)
 * - Calculs automatiques des totaux et sous-totaux
 * - Mise à jour en temps réel lors des modifications
 */

import { useMemo, useState, useEffect } from 'react';
import { Investment, YearlyExpenses } from '../types/investment';
import { generateAmortizationSchedule } from '../utils/calculations';

interface Props {
  investment: Investment;
  currentSubTab: string;
  onUpdate?: (investment: Investment) => void;
  allowManualEdit?: boolean;
  onManualEdit?: (isEditing: boolean) => void;
}

export default function LocationTables({ investment, currentSubTab, onUpdate, allowManualEdit = false, onManualEdit }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Réinitialiser l'état d'édition après un délai
  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => {
        setIsEditing(false);
        if (onManualEdit) {
          onManualEdit(false);
        }
      }, 2000); // Réinitialiser après 2 secondes d'inactivité
      
      return () => clearTimeout(timer);
    }
  }, [isEditing, onManualEdit]);
  
  // Fonction utilitaire pour formater les montants en euros
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  // Calcul des années
  const years = useMemo(() => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const currentYear = new Date().getFullYear();
    return { startYear, endYear, currentYear };
  }, [investment.projectStartDate, investment.projectEndDate]);

  // Calcul du tableau d'amortissement
  const amortizationResult = useMemo(() => {
    if (!investment.loanAmount || !investment.interestRate || !investment.loanDuration) {
      return { schedule: [], deferredInterest: 0 };
    }
    return generateAmortizationSchedule(
      investment.loanAmount,
      investment.interestRate,
      investment.loanDuration,
      investment.deferralType,
      investment.deferredPeriod,
      investment.startDate
    );
  }, [
    investment.loanAmount,
    investment.interestRate,
    investment.loanDuration,
    investment.deferralType,
    investment.deferredPeriod,
    investment.startDate
  ]);

  // Calcule les intérêts d'une année donnée
  const getInterestForYear = (year: number) => {
    const projectStart = new Date(investment.projectStartDate);
    const projectEnd = new Date(investment.projectEndDate);
    const yearlyPayments = amortizationResult.schedule
      .filter(row => {
        const d = new Date(row.date);
        return d.getFullYear() === year && d >= projectStart && d <= projectEnd;
      })
      .reduce((sum, row) => sum + row.interest, 0);
    return yearlyPayments;
  };

  // Calcule les informations de prêt pour une année donnée
  const getLoanInfoForYear = (year: number) => {
    const projectStart = new Date(investment.projectStartDate);
    const projectEnd = new Date(investment.projectEndDate);
    const yearlyPayments = amortizationResult.schedule
      .filter(row => {
        const d = new Date(row.date);
        return d.getFullYear() === year && d >= projectStart && d <= projectEnd;
      })
      .reduce((acc, row) => {
        acc.payment += row.monthlyPayment;
        acc.insurance += (investment.loanAmount * (investment.insuranceRate || 0)) / (100 * 12);
        return acc;
      }, { payment: 0, insurance: 0 });

    return yearlyPayments;
  };

  // Fraction de l'année couverte par le projet pour une année donnée (1 pour années complètes)
  const getYearCoverage = (year: number): number => {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    const projectStart = new Date(investment.projectStartDate);
    const projectEnd = new Date(investment.projectEndDate);
    const start = projectStart > startOfYear ? projectStart : startOfYear;
    const end = projectEnd < endOfYear ? projectEnd : endOfYear;
    if (end < start) return 0;
    const msInDay = 1000 * 60 * 60 * 24;
    const daysInYear = Math.round((new Date(year + 1, 0, 1).getTime() - new Date(year, 0, 1).getTime()) / msInDay);
    const coveredDays = Math.floor((end.getTime() - start.getTime()) / msInDay) + 1;
    return Math.min(1, Math.max(0, coveredDays / daysInYear));
  };

  const adjustForCoverage = (value: number, year: number): number => {
    const coverage = getYearCoverage(year);
    return Number((Number(value || 0) * coverage).toFixed(2));
  };

  const isPartialYear = (year: number): boolean => {
    const c = getYearCoverage(year);
    return c > 0 && c < 1;
  };

  // Fonction pour déterminer si une colonne de projection doit être masquée
  const shouldHideProjectionColumn = (field: keyof YearlyExpenses) => {
    const projectedExpenses = investment.expenses.filter(expense => expense.year > years.currentYear);
    if (projectedExpenses.length === 0) return true;
    return projectedExpenses.every(expense => {
      const value = expense[field];
      return value === 0 || value === null || value === undefined;
    });
  };

  // Gestionnaire de modification manuelle des données historiques
  const handleHistoricalChange = (year: number, field: keyof YearlyExpenses, value: number) => {
    if (!onUpdate) return;

    // Signaler qu'une édition manuelle est en cours
    setIsEditing(true);
    if (onManualEdit) {
      onManualEdit(true);
    }

    const updatedExpenses = [...investment.expenses];
    const coverage = getYearCoverage(year);
    const annualizedValue = coverage > 0 ? Number((Number(value || 0) / coverage).toFixed(2)) : Number(value || 0);
    const expenseIndex = updatedExpenses.findIndex(e => e.year === year);
    
    if (expenseIndex === -1) {
      updatedExpenses.push({
        year,
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
        interest: 0,
        [field]: annualizedValue
      });
    } else {
      updatedExpenses[expenseIndex] = {
        ...updatedExpenses[expenseIndex],
        [field]: annualizedValue
      };
    }

    onUpdate({
      ...investment,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  // Rendu du tableau des frais historiques
  const renderExpensesHistoricalTable = () => {
    const rows = [];
    for (let year = years.startYear; year <= years.currentYear; year++) {
      const expense = investment.expenses.find(e => e.year === year) || {
        year,
        propertyTax: 0,
        condoFees: 0,
        propertyInsurance: 0,
        managementFees: 0,
        unpaidRentInsurance: 0,
        repairs: 0,
        otherDeductible: 0,
        otherNonDeductible: 0,
        loanPayment: 0,
        loanInsurance: 0
      };

      const yearlyInterests = getInterestForYear(year);
      const loanInfo = getLoanInfoForYear(year);

      const coverage = getYearCoverage(year);
      const totalExpenses = 
        adjustForCoverage(expense.propertyTax || 0, year) +
        adjustForCoverage(expense.condoFees || 0, year) +
        adjustForCoverage(expense.propertyInsurance || 0, year) +
        adjustForCoverage(expense.managementFees || 0, year) +
        adjustForCoverage(expense.unpaidRentInsurance || 0, year) +
        adjustForCoverage(expense.repairs || 0, year) +
        adjustForCoverage(expense.otherDeductible || 0, year) +
        adjustForCoverage(expense.otherNonDeductible || 0, year) +
        (loanInfo.payment * coverage) +
        (loanInfo.insurance * coverage);

      const deductibleExpenses = 
        adjustForCoverage(expense.propertyTax || 0, year) +
        adjustForCoverage(expense.condoFees || 0, year) +
        adjustForCoverage(expense.propertyInsurance || 0, year) +
        adjustForCoverage(expense.managementFees || 0, year) +
        adjustForCoverage(expense.unpaidRentInsurance || 0, year) +
        adjustForCoverage(expense.repairs || 0, year) +
        adjustForCoverage(expense.otherDeductible || 0, year) +
        (loanInfo.insurance * coverage) +
        (yearlyInterests * coverage);

      rows.push(
        <tr key={year} className={`${year === years.currentYear ? 'bg-blue-50' : ''} ${isPartialYear(year) ? 'bg-amber-50' : ''}`}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            <div className="flex items-center gap-2">
              <span>{year}</span>
              {isPartialYear(year) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">partiel</span>
              )}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(expense.propertyTax || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'propertyTax', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(expense.propertyTax || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(expense.condoFees || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'condoFees', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(expense.condoFees || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(expense.propertyInsurance || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'propertyInsurance', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(expense.propertyInsurance || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(expense.managementFees || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'managementFees', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(expense.managementFees || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(expense.unpaidRentInsurance || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'unpaidRentInsurance', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(expense.unpaidRentInsurance || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(expense.repairs || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'repairs', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(expense.repairs || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(expense.otherDeductible || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'otherDeductible', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(expense.otherDeductible || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(expense.otherNonDeductible || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'otherNonDeductible', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(expense.otherNonDeductible || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <div>
              {formatCurrency(loanInfo.payment * coverage)}
              <div className="text-xs text-gray-400 mt-1">
                Intérêts : {formatCurrency(yearlyInterests * coverage)}
                {(loanInfo.insurance * coverage) > 0 && (
                  <>
                    {" | Ass. : "}{formatCurrency(loanInfo.insurance * coverage)}
                  </>
                )}
              </div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-800">
            {formatCurrency(totalExpenses)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-800">
            {formatCurrency(deductibleExpenses)}
          </td>
        </tr>
      );
    }
    return rows;
  };

  // Rendu du tableau des frais projetés
  const renderExpensesProjectedTable = () => {
    const rows = [];
    for (let year = years.currentYear + 1; year <= years.endYear; year++) {
      const expense = investment.expenses.find(e => e.year === year);
      if (!expense) continue;

      const yearlyInterests = getInterestForYear(year);
      const loanInfo = getLoanInfoForYear(year);

      const coverage = getYearCoverage(year);
      const totalExpenses = 
        adjustForCoverage(expense.propertyTax || 0, year) +
        adjustForCoverage(expense.condoFees || 0, year) +
        adjustForCoverage(expense.propertyInsurance || 0, year) +
        adjustForCoverage(expense.managementFees || 0, year) +
        adjustForCoverage(expense.unpaidRentInsurance || 0, year) +
        adjustForCoverage(expense.repairs || 0, year) +
        adjustForCoverage(expense.otherDeductible || 0, year) +
        adjustForCoverage(expense.otherNonDeductible || 0, year) +
        (loanInfo.payment * coverage) +
        (loanInfo.insurance * coverage);

      const deductibleExpenses = 
        adjustForCoverage(expense.propertyTax || 0, year) +
        adjustForCoverage(expense.condoFees || 0, year) +
        adjustForCoverage(expense.propertyInsurance || 0, year) +
        adjustForCoverage(expense.managementFees || 0, year) +
        adjustForCoverage(expense.unpaidRentInsurance || 0, year) +
        adjustForCoverage(expense.repairs || 0, year) +
        adjustForCoverage(expense.otherDeductible || 0, year) +
        (loanInfo.insurance * coverage) +
        (yearlyInterests * coverage);

      rows.push(
        <tr key={year} className={`${isPartialYear(year) ? 'bg-amber-50' : ''}`}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            <div className="flex items-center gap-2">
              <span>{year}</span>
              {isPartialYear(year) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">partiel</span>
              )}
            </div>
          </td>
          {!shouldHideProjectionColumn('propertyTax') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(expense.propertyTax || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('condoFees') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(expense.condoFees || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('propertyInsurance') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(expense.propertyInsurance || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('managementFees') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(expense.managementFees || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('unpaidRentInsurance') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(expense.unpaidRentInsurance || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('repairs') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(expense.repairs || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('otherDeductible') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(expense.otherDeductible || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('otherNonDeductible') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(expense.otherNonDeductible || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('loanPayment') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <div>
              {formatCurrency(loanInfo.payment * coverage)}
                <div className="text-xs text-gray-400 mt-1">
                Intérêts : {formatCurrency(yearlyInterests * coverage)}
                {(loanInfo.insurance * coverage) > 0 && (
                    <>
                    {" | Ass. : "}{formatCurrency(loanInfo.insurance * coverage)}
                    </>
                  )}
                </div>
              </div>
            </td>
          )}
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-800">
            {formatCurrency(totalExpenses)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-800">
            {formatCurrency(deductibleExpenses)}
          </td>
        </tr>
      );
    }
    return rows;
  };

  // Rendu du tableau des revenus historiques
  const renderRevenuesHistoricalTable = () => {
    const rows = [];
    for (let year = years.startYear; year <= years.currentYear; year++) {
      const yearExpense = investment.expenses.find(e => e.year === year);
      if (!yearExpense) continue;

      rows.push(
        <tr key={year} className={`${year === years.currentYear ? 'bg-blue-50' : ''} ${isPartialYear(year) ? 'bg-amber-50' : ''}`}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            <div className="flex items-center gap-2">
              <span>{year}</span>
              {isPartialYear(year) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">partiel</span>
              )}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(yearExpense.rent || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'rent', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(yearExpense.rent || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(yearExpense.furnishedRent || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'furnishedRent', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(yearExpense.furnishedRent || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(yearExpense.taxBenefit || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'taxBenefit', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(yearExpense.taxBenefit || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {allowManualEdit ? (
              <input
                type="number"
                value={adjustForCoverage(yearExpense.tenantCharges || 0, year) || ''}
                onChange={(e) => handleHistoricalChange(year, 'tenantCharges', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              formatCurrency(adjustForCoverage(yearExpense.tenantCharges || 0, year))
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(adjustForCoverage((yearExpense.rent || 0) + (yearExpense.tenantCharges || 0) + (yearExpense.taxBenefit || 0), year))}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(adjustForCoverage((yearExpense.furnishedRent || 0) + (yearExpense.tenantCharges || 0), year))}
          </td>
        </tr>
      );
    }
    return rows;
  };

  // Rendu du tableau des revenus projetés
  const renderRevenuesProjectedTable = () => {
    const rows = [];
    for (let year = years.currentYear + 1; year <= years.endYear; year++) {
      const yearExpense = investment.expenses.find(e => e.year === year);
      if (!yearExpense) continue;

      rows.push(
        <tr key={year} className={`${isPartialYear(year) ? 'bg-amber-50' : ''}`}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            <div className="flex items-center gap-2">
              <span>{year}</span>
              {isPartialYear(year) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">partiel</span>
              )}
            </div>
          </td>
          {!shouldHideProjectionColumn('rent') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(yearExpense.rent || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('furnishedRent') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(yearExpense.furnishedRent || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('taxBenefit') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(yearExpense.taxBenefit || 0, year))}
            </td>
          )}
          {!shouldHideProjectionColumn('tenantCharges') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(yearExpense.tenantCharges || 0, year))}
            </td>
          )}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(adjustForCoverage((yearExpense.rent || 0) + (yearExpense.tenantCharges || 0) + (yearExpense.taxBenefit || 0), year))}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(adjustForCoverage((yearExpense.furnishedRent || 0) + (yearExpense.tenantCharges || 0), year))}
          </td>
        </tr>
      );
    }
    return rows;
  };

  // Rendu des tableaux des frais
  const renderExpensesTables = () => (
    <div className="space-y-8">
      {/* Tableau historique des frais */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Historique des frais
        </h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Année
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taxe foncière
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Charges copropriété
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assurance propriétaire
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frais d'agence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assurance loyers impayés
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Travaux
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Autres (déductibles)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Autres (non déductibles)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prêt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dépenses déductibles
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderExpensesHistoricalTable()}
          </tbody>
        </table>
      </div>

      {/* Tableau de projection des frais */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Projection des frais
        </h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Année
              </th>
              {!shouldHideProjectionColumn('propertyTax') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxe foncière
                </th>
              )}
              {!shouldHideProjectionColumn('condoFees') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Charges copropriété
                </th>
              )}
              {!shouldHideProjectionColumn('propertyInsurance') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assurance propriétaire
                </th>
              )}
              {!shouldHideProjectionColumn('managementFees') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais d'agence
                </th>
              )}
              {!shouldHideProjectionColumn('unpaidRentInsurance') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assurance loyers impayés
                </th>
              )}
              {!shouldHideProjectionColumn('repairs') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Travaux
                </th>
              )}
              {!shouldHideProjectionColumn('otherDeductible') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Autres déductibles
                </th>
              )}
              {!shouldHideProjectionColumn('otherNonDeductible') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Autres non déductibles
                </th>
              )}
              {!shouldHideProjectionColumn('loanPayment') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prêt
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                Total dépenses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                Dépenses déductibles
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderExpensesProjectedTable()}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Rendu des tableaux des revenus
  const renderRevenuesTables = () => (
    <div className="space-y-8">
      {/* Tableau historique des revenus */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Historique des revenus
        </h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Année
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loyer nu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loyer meublé
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aide fiscale
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Charges locataire
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total nu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total meublé
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderRevenuesHistoricalTable()}
          </tbody>
        </table>
      </div>

      {/* Tableau de projection des revenus */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Projection des revenus
        </h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Année
              </th>
              {!shouldHideProjectionColumn('rent') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loyer nu
                </th>
              )}
              {!shouldHideProjectionColumn('furnishedRent') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loyer meublé
                </th>
              )}
              {!shouldHideProjectionColumn('taxBenefit') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aide fiscale
                </th>
              )}
              {!shouldHideProjectionColumn('tenantCharges') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Charges locataire
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total nu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total meublé
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderRevenuesProjectedTable()}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {currentSubTab === 'frais' ? renderExpensesTables() : renderRevenuesTables()}
    </div>
  );
}
