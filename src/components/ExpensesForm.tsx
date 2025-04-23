/**
 * Composant ExpensesForm
 * 
 * Ce composant gère la saisie et la projection des dépenses d'un investissement immobilier :
 * 1. Saisie des dépenses historiques année par année
 * 2. Configuration des taux d'évolution annuels pour chaque type de dépense
 * 3. Projection automatique des dépenses futures
 * 4. Calcul des intérêts et remboursements de prêt
 * 
 * Fonctionnalités principales :
 * - Gestion des dépenses déductibles et non déductibles
 * - Calcul automatique des projections avec taux d'évolution personnalisables
 * - Intégration avec le tableau d'amortissement du prêt
 * - Affichage des totaux et sous-totaux
 * 
 * Les types de dépenses gérés :
 * - Taxe foncière
 * - Charges de copropriété
 * - Assurance propriétaire
 * - Frais d'agence
 * - Assurance loyers impayés
 * - Travaux
 * - Autres charges déductibles et non déductibles
 */

import { useMemo, useEffect } from 'react';
import { Investment, YearlyExpenses, ExpenseProjection } from '../types/investment';
import { generateAmortizationSchedule } from '../utils/calculations';

// Interface définissant les props du composant
interface Props {
  investment: Investment;
  onUpdate: (investment: Investment) => void;
}

function ExpensesForm({ investment, onUpdate }: Props) {
  // Fonction utilitaire pour formater les montants en euros
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  // Calcul des années de début, fin et année courante
  const years = useMemo(() => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const currentYear = new Date().getFullYear();
    return { startYear, endYear, currentYear };
  }, [investment.projectStartDate, investment.projectEndDate]);

  /**
   * Gestionnaire de modification des dépenses
   * Met à jour les dépenses pour une année donnée et recalcule les projections
   */
  const handleExpenseChange = (year: number, field: keyof YearlyExpenses, value: number) => {
    const updatedExpenses = [...investment.expenses];
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
        [field]: value
      });
    } else {
      updatedExpenses[expenseIndex] = {
        ...updatedExpenses[expenseIndex],
        [field]: value
      };
    }

    // Recalculer les projections après chaque modification
    const currentValues = {
      propertyTax: value,
      condoFees: updatedExpenses[expenseIndex]?.condoFees || 0,
      propertyInsurance: updatedExpenses[expenseIndex]?.propertyInsurance || 0,
      managementFees: updatedExpenses[expenseIndex]?.managementFees || 0,
      unpaidRentInsurance: updatedExpenses[expenseIndex]?.unpaidRentInsurance || 0,
      repairs: updatedExpenses[expenseIndex]?.repairs || 0,
      otherDeductible: updatedExpenses[expenseIndex]?.otherDeductible || 0,
      otherNonDeductible: updatedExpenses[expenseIndex]?.otherNonDeductible || 0
    };

    if (field !== 'propertyTax') currentValues.propertyTax = updatedExpenses[expenseIndex]?.propertyTax || 0;
    if (field === 'condoFees') currentValues.condoFees = value;
    if (field === 'propertyInsurance') currentValues.propertyInsurance = value;
    if (field === 'managementFees') currentValues.managementFees = value;
    if (field === 'unpaidRentInsurance') currentValues.unpaidRentInsurance = value;
    if (field === 'repairs') currentValues.repairs = value;
    if (field === 'otherDeductible') currentValues.otherDeductible = value;
    if (field === 'otherNonDeductible') currentValues.otherNonDeductible = value;

    // Mettre à jour les projections pour toutes les années futures
    for (let projYear = years.currentYear + 1; projYear <= years.endYear; projYear++) {
      const yearsAhead = projYear - years.currentYear;
      
      const projectedValues = {
        propertyTax: calculateProjectedValue(
          currentValues.propertyTax,
          investment.expenseProjection.propertyTaxIncrease,
          yearsAhead
        ),
        condoFees: calculateProjectedValue(
          currentValues.condoFees,
          investment.expenseProjection.condoFeesIncrease,
          yearsAhead
        ),
        propertyInsurance: calculateProjectedValue(
          currentValues.propertyInsurance,
          investment.expenseProjection.propertyInsuranceIncrease,
          yearsAhead
        ),
        managementFees: calculateProjectedValue(
          currentValues.managementFees,
          investment.expenseProjection.managementFeesIncrease,
          yearsAhead
        ),
        unpaidRentInsurance: calculateProjectedValue(
          currentValues.unpaidRentInsurance,
          investment.expenseProjection.unpaidRentInsuranceIncrease,
          yearsAhead
        ),
        repairs: calculateProjectedValue(
          currentValues.repairs,
          investment.expenseProjection.repairsIncrease,
          yearsAhead
        ),
        otherDeductible: calculateProjectedValue(
          currentValues.otherDeductible,
          investment.expenseProjection.otherDeductibleIncrease,
          yearsAhead
        ),
        otherNonDeductible: calculateProjectedValue(
          currentValues.otherNonDeductible,
          investment.expenseProjection.otherNonDeductibleIncrease,
          yearsAhead
        )
      };

      const yearlyInterests = getInterestForYear(projYear);
      const loanInfo = getLoanInfoForYear(projYear);

      const projIndex = updatedExpenses.findIndex(e => e.year === projYear);
      if (projIndex === -1) {
        updatedExpenses.push({
          year: projYear,
          ...projectedValues,
          rent: 0,
          furnishedRent: 0,
          tenantCharges: 0,
          tax: 0,
          deficit: 0,
          loanPayment: loanInfo.payment,
          loanInsurance: loanInfo.insurance,
          taxBenefit: 0,
          interest: yearlyInterests
        });
      } else {
        updatedExpenses[projIndex] = {
          ...updatedExpenses[projIndex],
          ...projectedValues,
          rent: 0,
          furnishedRent: 0,
          tenantCharges: 0,
          tax: 0,
          deficit: 0,
          loanPayment: loanInfo.payment,
          loanInsurance: loanInfo.insurance,
          taxBenefit: 0,
          interest: yearlyInterests
        };
      }
    }

    onUpdate({
      ...investment,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  /**
   * Gestionnaire de modification des paramètres de projection
   * Met à jour les taux d'évolution et recalcule les projections futures
   */
  const handleProjectionChange = (field: keyof ExpenseProjection, value: number) => {
    const baseValues = investment.expenseProjection.baseYear;
    const updatedExpenses = [...investment.expenses];

    // Mettre à jour les projections pour toutes les années futures
    for (let year = years.currentYear + 1; year <= years.endYear; year++) {
      const yearsAhead = year - 2025; // Utiliser 2025 comme année de référence
      const projectedValues = {
        propertyTax: calculateProjectedValue(
          baseValues.propertyTax,
          field === 'propertyTaxIncrease' ? value : investment.expenseProjection.propertyTaxIncrease,
          yearsAhead
        ),
        condoFees: calculateProjectedValue(
          baseValues.condoFees,
          field === 'condoFeesIncrease' ? value : investment.expenseProjection.condoFeesIncrease,
          yearsAhead
        ),
        propertyInsurance: calculateProjectedValue(
          baseValues.propertyInsurance,
          field === 'propertyInsuranceIncrease' ? value : investment.expenseProjection.propertyInsuranceIncrease,
          yearsAhead
        ),
        managementFees: calculateProjectedValue(
          baseValues.managementFees,
          field === 'managementFeesIncrease' ? value : investment.expenseProjection.managementFeesIncrease,
          yearsAhead
        ),
        unpaidRentInsurance: calculateProjectedValue(
          baseValues.unpaidRentInsurance,
          field === 'unpaidRentInsuranceIncrease' ? value : investment.expenseProjection.unpaidRentInsuranceIncrease,
          yearsAhead
        ),
        repairs: calculateProjectedValue(
          baseValues.repairs,
          field === 'repairsIncrease' ? value : investment.expenseProjection.repairsIncrease,
          yearsAhead
        ),
        otherDeductible: calculateProjectedValue(
          baseValues.otherDeductible,
          field === 'otherDeductibleIncrease' ? value : investment.expenseProjection.otherDeductibleIncrease,
          yearsAhead
        ),
        otherNonDeductible: calculateProjectedValue(
          baseValues.otherNonDeductible,
          field === 'otherNonDeductibleIncrease' ? value : investment.expenseProjection.otherNonDeductibleIncrease,
          yearsAhead
        )
      };

      const yearlyInterests = getInterestForYear(year);
      const loanInfo = getLoanInfoForYear(year);

      const expenseIndex = updatedExpenses.findIndex(e => e.year === year);
      if (expenseIndex === -1) {
        updatedExpenses.push({
          year,
          ...projectedValues,
          rent: 0,
          furnishedRent: 0,
          tenantCharges: 0,
          tax: 0,
          deficit: 0,
          loanPayment: loanInfo.payment,
          loanInsurance: loanInfo.insurance,
          taxBenefit: 0,
          interest: yearlyInterests
        });
      } else {
        updatedExpenses[expenseIndex] = {
          ...updatedExpenses[expenseIndex],
          ...projectedValues,
          rent: 0,
          furnishedRent: 0,
          tenantCharges: 0,
          tax: 0,
          deficit: 0,
          loanPayment: loanInfo.payment,
          loanInsurance: loanInfo.insurance,
          taxBenefit: 0,
          interest: yearlyInterests
        };
      }
    }

    const updatedProjection = { ...investment.expenseProjection };
    if (field !== 'baseYear') {
      updatedProjection[field] = value;
    }

    onUpdate({
      ...investment,
      expenseProjection: updatedProjection,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  /**
   * Calcule la valeur projetée d'une dépense en fonction du taux d'évolution
   */
  const calculateProjectedValue = (baseValue: number, increaseRate: number, yearsAhead: number) => {
    return Number(baseValue) * Math.pow(1 + (Number(increaseRate) || 0) / 100, yearsAhead);
  };

  // Initialisation des projections au montage du composant
  useEffect(() => {
    const baseValues = investment.expenseProjection.baseYear;
    const updatedExpenses = [...investment.expenses];
    
    // S'assurer que toutes les années sont présentes
    for (let year = years.startYear; year <= years.endYear; year++) {
      if (!updatedExpenses.some(e => e.year === year)) {
        const yearsAhead = year - 2025; // Utiliser 2025 comme année de référence
        const yearlyInterests = getInterestForYear(year);
        const loanInfo = getLoanInfoForYear(year);

        const projectedValues = year <= years.currentYear ? {
          propertyTax: 0,
          condoFees: 0,
          propertyInsurance: 0,
          managementFees: 0,
          unpaidRentInsurance: 0,
          repairs: 0,
          otherDeductible: 0,
          otherNonDeductible: 0
        } : {
          propertyTax: calculateProjectedValue(
            baseValues.propertyTax,
            investment.expenseProjection.propertyTaxIncrease,
            yearsAhead
          ),
          condoFees: calculateProjectedValue(
            baseValues.condoFees,
            investment.expenseProjection.condoFeesIncrease,
            yearsAhead
          ),
          propertyInsurance: calculateProjectedValue(
            baseValues.propertyInsurance,
            investment.expenseProjection.propertyInsuranceIncrease,
            yearsAhead
          ),
          managementFees: calculateProjectedValue(
            baseValues.managementFees,
            investment.expenseProjection.managementFeesIncrease,
            yearsAhead
          ),
          unpaidRentInsurance: calculateProjectedValue(
            baseValues.unpaidRentInsurance,
            investment.expenseProjection.unpaidRentInsuranceIncrease,
            yearsAhead
          ),
          repairs: calculateProjectedValue(
            baseValues.repairs,
            investment.expenseProjection.repairsIncrease,
            yearsAhead
          ),
          otherDeductible: calculateProjectedValue(
            baseValues.otherDeductible,
            investment.expenseProjection.otherDeductibleIncrease,
            yearsAhead
          ),
          otherNonDeductible: calculateProjectedValue(
            baseValues.otherNonDeductible,
            investment.expenseProjection.otherNonDeductibleIncrease,
            yearsAhead
          )
        };

        updatedExpenses.push({
          year,
          ...projectedValues,
          rent: 0,
          furnishedRent: 0,
          tenantCharges: 0,
          tax: 0,
          deficit: 0,
          loanPayment: loanInfo.payment,
          loanInsurance: loanInfo.insurance,
          taxBenefit: 0,
          interest: yearlyInterests
        });
      }
    }

    // Initialiser les valeurs de base avec les données de 2025 si elles ne sont pas déjà définies
    const baseYearExpenses = updatedExpenses.find(e => e.year === 2025);
    if (baseYearExpenses && !investment.expenseProjection.baseYear) {
      onUpdate({
        ...investment,
        expenseProjection: {
          ...investment.expenseProjection,
          baseYear: {
            propertyTax: baseYearExpenses.propertyTax,
            condoFees: baseYearExpenses.condoFees,
            propertyInsurance: baseYearExpenses.propertyInsurance,
            managementFees: baseYearExpenses.managementFees,
            unpaidRentInsurance: baseYearExpenses.unpaidRentInsurance,
            repairs: baseYearExpenses.repairs,
            otherDeductible: baseYearExpenses.otherDeductible,
            otherNonDeductible: baseYearExpenses.otherNonDeductible,
            rent: 0,
            furnishedRent: 0,
            tenantCharges: 0,
            taxBenefit: 0
          }
        },
        expenses: updatedExpenses.sort((a, b) => a.year - b.year)
      });
    } else if (updatedExpenses.length > investment.expenses.length) {
      onUpdate({
        ...investment,
        expenses: updatedExpenses.sort((a, b) => a.year - b.year)
      });
    }
  }, [years.startYear, years.endYear]);

  const handleBaseYearChange = (field: keyof ExpenseProjection['baseYear'], value: number) => {
    const updatedInvestment = { ...investment };
    if (!updatedInvestment.expenseProjection) {
      updatedInvestment.expenseProjection = {
        propertyTaxIncrease: 2,
        condoFeesIncrease: 2,
        propertyInsuranceIncrease: 1,
        managementFeesIncrease: 1,
        unpaidRentInsuranceIncrease: 1,
        repairsIncrease: 2,
        otherDeductibleIncrease: 1,
        otherNonDeductibleIncrease: 1,
        rentIncrease: 2,
        furnishedRentIncrease: 2,
        tenantChargesIncrease: 2,
        taxBenefitIncrease: 1,
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
      };
    }
    
    // Mettre à jour la valeur de base
    updatedInvestment.expenseProjection.baseYear = {
      ...updatedInvestment.expenseProjection.baseYear,
      [field]: value
    };

    // Recalculer les projections pour toutes les années futures
    const updatedExpenses = [...updatedInvestment.expenses];
    for (let year = years.currentYear + 1; year <= years.endYear; year++) {
      const yearsAhead = year - 2025; // Utiliser 2025 comme année de référence
      const projectedValues = {
        propertyTax: calculateProjectedValue(
          updatedInvestment.expenseProjection.baseYear.propertyTax,
          updatedInvestment.expenseProjection.propertyTaxIncrease,
          yearsAhead
        ),
        condoFees: calculateProjectedValue(
          updatedInvestment.expenseProjection.baseYear.condoFees,
          updatedInvestment.expenseProjection.condoFeesIncrease,
          yearsAhead
        ),
        propertyInsurance: calculateProjectedValue(
          updatedInvestment.expenseProjection.baseYear.propertyInsurance,
          updatedInvestment.expenseProjection.propertyInsuranceIncrease,
          yearsAhead
        ),
        managementFees: calculateProjectedValue(
          updatedInvestment.expenseProjection.baseYear.managementFees,
          updatedInvestment.expenseProjection.managementFeesIncrease,
          yearsAhead
        ),
        unpaidRentInsurance: calculateProjectedValue(
          updatedInvestment.expenseProjection.baseYear.unpaidRentInsurance,
          updatedInvestment.expenseProjection.unpaidRentInsuranceIncrease,
          yearsAhead
        ),
        repairs: calculateProjectedValue(
          updatedInvestment.expenseProjection.baseYear.repairs,
          updatedInvestment.expenseProjection.repairsIncrease,
          yearsAhead
        ),
        otherDeductible: calculateProjectedValue(
          updatedInvestment.expenseProjection.baseYear.otherDeductible,
          updatedInvestment.expenseProjection.otherDeductibleIncrease,
          yearsAhead
        ),
        otherNonDeductible: calculateProjectedValue(
          updatedInvestment.expenseProjection.baseYear.otherNonDeductible,
          updatedInvestment.expenseProjection.otherNonDeductibleIncrease,
          yearsAhead
        )
      };

      const yearlyInterests = getInterestForYear(year);
      const loanInfo = getLoanInfoForYear(year);

      const expenseIndex = updatedExpenses.findIndex(e => e.year === year);
      if (expenseIndex === -1) {
        updatedExpenses.push({
          year,
          ...projectedValues,
          rent: 0,
          furnishedRent: 0,
          tenantCharges: 0,
          tax: 0,
          deficit: 0,
          loanPayment: loanInfo.payment,
          loanInsurance: loanInfo.insurance,
          taxBenefit: 0,
          interest: yearlyInterests
        });
      } else {
        updatedExpenses[expenseIndex] = {
          ...updatedExpenses[expenseIndex],
          ...projectedValues,
          rent: 0,
          furnishedRent: 0,
          tenantCharges: 0,
          tax: 0,
          deficit: 0,
          loanPayment: loanInfo.payment,
          loanInsurance: loanInfo.insurance,
          taxBenefit: 0,
          interest: yearlyInterests
        };
      }
    }

    onUpdate({
      ...updatedInvestment,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  /**
   * Rendu du tableau des dépenses historiques
   * Affiche les dépenses passées avec possibilité de modification
   */
  const renderHistoricalTable = () => {
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

      const totalExpenses = 
        Number(expense.propertyTax || 0) +
        Number(expense.condoFees || 0) +
        Number(expense.propertyInsurance || 0) +
        Number(expense.managementFees || 0) +
        Number(expense.unpaidRentInsurance || 0) +
        Number(expense.repairs || 0) +
        Number(expense.otherDeductible || 0) +
        Number(expense.otherNonDeductible || 0) +
        loanInfo.payment +
        loanInfo.insurance;

      const deductibleExpenses = 
        Number(expense.propertyTax || 0) +
        Number(expense.condoFees || 0) +
        Number(expense.propertyInsurance || 0) +
        Number(expense.managementFees || 0) +
        Number(expense.unpaidRentInsurance || 0) +
        Number(expense.repairs || 0) +
        Number(expense.otherDeductible || 0) +
        loanInfo.insurance +
        yearlyInterests;

      rows.push(
        <tr key={year} className={year === years.currentYear ? 'bg-blue-50' : ''}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {year}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.propertyTax || ''}
              onChange={(e) => handleExpenseChange(year, 'propertyTax', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.condoFees || ''}
              onChange={(e) => handleExpenseChange(year, 'condoFees', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.propertyInsurance || ''}
              onChange={(e) => handleExpenseChange(year, 'propertyInsurance', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.managementFees || ''}
              onChange={(e) => handleExpenseChange(year, 'managementFees', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.unpaidRentInsurance || ''}
              onChange={(e) => handleExpenseChange(year, 'unpaidRentInsurance', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.repairs || ''}
              onChange={(e) => handleExpenseChange(year, 'repairs', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.otherDeductible || ''}
              onChange={(e) => handleExpenseChange(year, 'otherDeductible', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.otherNonDeductible || ''}
              onChange={(e) => handleExpenseChange(year, 'otherNonDeductible', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(loanInfo.payment)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearlyInterests)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(loanInfo.insurance)}
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

  /**
   * Rendu du tableau des projections
   * Affiche les dépenses futures calculées automatiquement
   */
  const renderProjectedTable = () => {
    const rows = [];
    for (let year = years.currentYear + 1; year <= years.endYear; year++) {
      const expense = investment.expenses.find(e => e.year === year);
      if (!expense) continue;

      const yearlyInterests = getInterestForYear(year);
      const loanInfo = getLoanInfoForYear(year);

      const totalExpenses = 
        Number(expense.propertyTax || 0) +
        Number(expense.condoFees || 0) +
        Number(expense.propertyInsurance || 0) +
        Number(expense.managementFees || 0) +
        Number(expense.unpaidRentInsurance || 0) +
        Number(expense.repairs || 0) +
        Number(expense.otherDeductible || 0) +
        Number(expense.otherNonDeductible || 0) +
        loanInfo.payment +
        loanInfo.insurance;

      const deductibleExpenses = 
        Number(expense.propertyTax || 0) +
        Number(expense.condoFees || 0) +
        Number(expense.propertyInsurance || 0) +
        Number(expense.managementFees || 0) +
        Number(expense.unpaidRentInsurance || 0) +
        Number(expense.repairs || 0) +
        Number(expense.otherDeductible || 0) +
        loanInfo.insurance +
        yearlyInterests;

      rows.push(
        <tr key={year}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {year}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.propertyTax || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.condoFees || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.propertyInsurance || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.managementFees || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.unpaidRentInsurance || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.repairs || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.otherDeductible || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.otherNonDeductible || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(loanInfo.payment)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearlyInterests)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(loanInfo.insurance)}
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

  /**
   * Calcule les intérêts d'une année donnée
   */
  const getInterestForYear = (year: number) => {
    const yearlyPayments = amortizationResult.schedule
      .filter(row => new Date(row.date).getFullYear() === year)
      .reduce((sum, row) => sum + row.interest, 0);
    return yearlyPayments;
  };

  /**
   * Calcule les informations de prêt pour une année donnée
   */
  const getLoanInfoForYear = (year: number) => {
    const yearlyPayments = amortizationResult.schedule
      .filter(row => new Date(row.date).getFullYear() === year)
      .reduce((acc, row) => {
        acc.payment += row.monthlyPayment;
        acc.insurance += (investment.loanAmount * (investment.insuranceRate || 0)) / (100 * 12);
        return acc;
      }, { payment: 0, insurance: 0 });

    return yearlyPayments;
  };

  /**
   * Calcul du tableau d'amortissement
   */
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

  /**
   * Rendu des paramètres de projection
   * Affiche les curseurs pour ajuster les taux d'évolution
   */
  const renderProjectionParameters = () => {
    const parameters = [
      { key: 'propertyTaxIncrease' as const, label: 'Taxe foncière' },
      { key: 'condoFeesIncrease' as const, label: 'Charges copropriété' },
      { key: 'propertyInsuranceIncrease' as const, label: 'Assurance propriétaire' },
      { key: 'managementFeesIncrease' as const, label: 'Frais d\'agence' },
      { key: 'unpaidRentInsuranceIncrease' as const, label: 'Assurance loyers impayés' },
      { key: 'repairsIncrease' as const, label: 'Travaux' },
      { key: 'otherDeductibleIncrease' as const, label: 'Autres (déductibles)' },
      { key: 'otherNonDeductibleIncrease' as const, label: 'Autres (non déductibles)' }
    ];

    return parameters.map(({ key, label }) => (
      <div key={key} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} (%)
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="-10"
            max="10"
            step="0.1"
            value={investment.expenseProjection[key]}
            onChange={(e) => handleProjectionChange(key, Number(e.target.value))}
            className="w-full"
          />
          <input
            type="number"
            value={investment.expenseProjection[key]}
            onChange={(e) => handleProjectionChange(key, Number(e.target.value))}
            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-8">
      {/* Historical Data */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Historique
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
                Dont intérêts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assurance prêt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                Total dépenses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                Dont déductible
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderHistoricalTable()}
          </tbody>
        </table>
      </div>

      {/* Projection Parameters */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Paramètres de projection
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderProjectionParameters()}
        </div>
      </div>

      {/* Base de projection */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Base de projection (2025)
        </h3>
        <div className="overflow-x-auto">
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
                  Autres déductibles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Autres non déductibles
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={investment.expenseProjection.baseYear?.propertyTax || 0}
                    onChange={(e) => handleBaseYearChange('propertyTax', Number(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={investment.expenseProjection.baseYear?.condoFees || 0}
                    onChange={(e) => handleBaseYearChange('condoFees', Number(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={investment.expenseProjection.baseYear?.propertyInsurance || 0}
                    onChange={(e) => handleBaseYearChange('propertyInsurance', Number(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={investment.expenseProjection.baseYear?.managementFees || 0}
                    onChange={(e) => handleBaseYearChange('managementFees', Number(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={investment.expenseProjection.baseYear?.unpaidRentInsurance || 0}
                    onChange={(e) => handleBaseYearChange('unpaidRentInsurance', Number(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={investment.expenseProjection.baseYear?.repairs || 0}
                    onChange={(e) => handleBaseYearChange('repairs', Number(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={investment.expenseProjection.baseYear?.otherDeductible || 0}
                    onChange={(e) => handleBaseYearChange('otherDeductible', Number(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={investment.expenseProjection.baseYear?.otherNonDeductible || 0}
                    onChange={(e) => handleBaseYearChange('otherNonDeductible', Number(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Projected Data */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Projection
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
                Dont intérêts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assurance prêt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                Total dépenses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                Dont déductible
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderProjectedTable()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExpensesForm;