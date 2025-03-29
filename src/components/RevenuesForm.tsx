import React, { useState, useMemo, useEffect } from 'react';
import { Investment, YearlyExpenses } from '../types/investment';

interface Props {
  investment: Investment;
  onUpdate: (updatedInvestment: Investment) => void;
}

export default function RevenuesForm({ investment, onUpdate }: Props) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const years = useMemo(() => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const currentYear = new Date().getFullYear();
    return { startYear, endYear, currentYear };
  }, [investment.projectStartDate, investment.projectEndDate]);

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
      rent: value,
      furnishedRent: updatedExpenses[expenseIndex]?.furnishedRent || 0,
      tenantCharges: updatedExpenses[expenseIndex]?.tenantCharges || 0
    };

    if (field === 'tenantCharges') {
      currentValues.rent = updatedExpenses[expenseIndex]?.rent || 0;
      currentValues.furnishedRent = updatedExpenses[expenseIndex]?.furnishedRent || 0;
      currentValues.tenantCharges = value;
    }

    if (field === 'furnishedRent') {
      currentValues.rent = updatedExpenses[expenseIndex]?.rent || 0;
      currentValues.furnishedRent = value;
      currentValues.tenantCharges = updatedExpenses[expenseIndex]?.tenantCharges || 0;
    }

    // Mettre à jour les projections pour toutes les années futures
    for (let projYear = years.currentYear + 1; projYear <= years.endYear; projYear++) {
      const yearsAhead = projYear - years.currentYear;
      const projectedRent = calculateProjectedValue(
        currentValues.rent,
        investment.expenseProjection.rentIncrease,
        yearsAhead
      );
      const projectedFurnishedRent = calculateProjectedValue(
        currentValues.furnishedRent,
        investment.expenseProjection.furnishedRentIncrease,
        yearsAhead
      );
      const projectedCharges = calculateProjectedValue(
        currentValues.tenantCharges,
        investment.expenseProjection.tenantChargesIncrease,
        yearsAhead
      );

      const projIndex = updatedExpenses.findIndex(e => e.year === projYear);
      if (projIndex === -1) {
        updatedExpenses.push({
          year: projYear,
          propertyTax: 0,
          condoFees: 0,
          propertyInsurance: 0,
          managementFees: 0,
          unpaidRentInsurance: 0,
          repairs: 0,
          otherDeductible: 0,
          otherNonDeductible: 0,
          rent: projectedRent,
          furnishedRent: projectedFurnishedRent,
          tenantCharges: projectedCharges,
          tax: 0,
          deficit: 0,
          loanPayment: 0,
          loanInsurance: 0,
          taxBenefit: 0,
          interest: 0
        });
      } else {
        updatedExpenses[projIndex] = {
          ...updatedExpenses[projIndex],
          rent: projectedRent,
          furnishedRent: projectedFurnishedRent,
          tenantCharges: projectedCharges
        };
      }
    }

    onUpdate({
      ...investment,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  const handleProjectionChange = (field: keyof Investment['expenseProjection'], value: number) => {
    const currentValues = getCurrentYearValues();
    const updatedExpenses = [...investment.expenses];

    // Mettre à jour les projections pour toutes les années futures
    for (let year = years.currentYear + 1; year <= years.endYear; year++) {
      const yearsAhead = year - years.currentYear;
      const projectedRent = calculateProjectedValue(
        currentValues.rent,
        field === 'rentIncrease' ? value : investment.expenseProjection.rentIncrease,
        yearsAhead
      );
      const projectedFurnishedRent = calculateProjectedValue(
        currentValues.furnishedRent,
        field === 'furnishedRentIncrease' ? value : investment.expenseProjection.furnishedRentIncrease,
        yearsAhead
      );
      const projectedCharges = calculateProjectedValue(
        currentValues.tenantCharges,
        field === 'tenantChargesIncrease' ? value : investment.expenseProjection.tenantChargesIncrease,
        yearsAhead
      );

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
          rent: projectedRent,
          furnishedRent: projectedFurnishedRent,
          tenantCharges: projectedCharges,
          tax: 0,
          deficit: 0,
          loanPayment: 0,
          loanInsurance: 0,
          taxBenefit: 0,
          interest: 0
        });
      } else {
        updatedExpenses[expenseIndex] = {
          ...updatedExpenses[expenseIndex],
          rent: projectedRent,
          furnishedRent: projectedFurnishedRent,
          tenantCharges: projectedCharges
        };
      }
    }

    onUpdate({
      ...investment,
      expenseProjection: {
        ...investment.expenseProjection,
        [field]: value
      },
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  const calculateProjectedValue = (baseValue: number, increaseRate: number, yearsAhead: number) => {
    return Number(baseValue) * Math.pow(1 + (Number(increaseRate) || 0) / 100, yearsAhead);
  };

  const getCurrentYearValues = () => {
    const currentExpense = investment.expenses.find(e => e.year === years.currentYear) || {
      rent: 0,
      furnishedRent: 0,
      tenantCharges: 0
    };
    return {
      rent: currentExpense.rent || 0,
      furnishedRent: currentExpense.furnishedRent || 0,
      tenantCharges: currentExpense.tenantCharges || 0
    };
  };

  // Initialisation des projections au montage du composant
  useEffect(() => {
    const currentValues = getCurrentYearValues();
    const updatedExpenses = [...investment.expenses];
    
    // S'assurer que toutes les années sont présentes
    for (let year = years.startYear; year <= years.endYear; year++) {
      if (!updatedExpenses.some(e => e.year === year)) {
        const yearsAhead = year - years.currentYear;
        const projectedRent = year <= years.currentYear ? 0 : calculateProjectedValue(
          currentValues.rent,
          investment.expenseProjection.rentIncrease,
          yearsAhead
        );
        const projectedFurnishedRent = year <= years.currentYear ? 0 : calculateProjectedValue(
          currentValues.furnishedRent,
          investment.expenseProjection.furnishedRentIncrease,
          yearsAhead
        );
        const projectedCharges = year <= years.currentYear ? 0 : calculateProjectedValue(
          currentValues.tenantCharges,
          investment.expenseProjection.tenantChargesIncrease,
          yearsAhead
        );

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
          rent: projectedRent,
          furnishedRent: projectedFurnishedRent,
          tenantCharges: projectedCharges,
          tax: 0,
          deficit: 0,
          loanPayment: 0,
          loanInsurance: 0,
          taxBenefit: 0,
          interest: 0
        });
      }
    }

    if (updatedExpenses.length > investment.expenses.length) {
      onUpdate({
        ...investment,
        expenses: updatedExpenses.sort((a, b) => a.year - b.year)
      });
    }
  }, [years.startYear, years.endYear]);

  const handleBaseYearChange = (field: keyof Investment['expenseProjection']['baseYear'], value: number) => {
    const updatedInvestment = {
      ...investment,
      expenseProjection: {
        ...investment.expenseProjection,
        baseYear: {
          ...investment.expenseProjection.baseYear,
          [field]: value
        }
      }
    };

    const updatedExpenses = [...investment.expenses];
    
    // Mettre à jour les projections pour toutes les années futures
    for (let year = years.currentYear + 1; year <= years.endYear; year++) {
      const yearsAhead = year - 2025; // Utiliser 2025 comme année de référence
      const projectedRent = calculateProjectedValue(
        field === 'rent' ? value : investment.expenseProjection.baseYear.rent,
        investment.expenseProjection.rentIncrease,
        yearsAhead
      );
      const projectedFurnishedRent = calculateProjectedValue(
        field === 'furnishedRent' ? value : investment.expenseProjection.baseYear.furnishedRent,
        investment.expenseProjection.furnishedRentIncrease,
        yearsAhead
      );
      const projectedCharges = calculateProjectedValue(
        field === 'tenantCharges' ? value : investment.expenseProjection.baseYear.tenantCharges,
        investment.expenseProjection.tenantChargesIncrease,
        yearsAhead
      );
      const projectedTaxBenefit = calculateProjectedValue(
        field === 'taxBenefit' ? value : investment.expenseProjection.baseYear.taxBenefit,
        investment.expenseProjection.taxBenefitIncrease,
        yearsAhead
      );

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
          rent: projectedRent,
          furnishedRent: projectedFurnishedRent,
          tenantCharges: projectedCharges,
          tax: 0,
          deficit: 0,
          loanPayment: 0,
          loanInsurance: 0,
          taxBenefit: projectedTaxBenefit,
          interest: 0
        });
      } else {
        updatedExpenses[expenseIndex] = {
          ...updatedExpenses[expenseIndex],
          rent: projectedRent,
          furnishedRent: projectedFurnishedRent,
          tenantCharges: projectedCharges,
          taxBenefit: projectedTaxBenefit
        };
      }
    }

    onUpdate({
      ...updatedInvestment,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  const renderHistoricalTable = () => {
    const rows = [];
    for (let year = years.startYear; year <= years.currentYear; year++) {
      const expense = investment.expenses.find(e => e.year === year) || {
        year,
        rent: 0,
        furnishedRent: 0,
        tenantCharges: 0,
        taxBenefit: 0
      };

      const totalNu = 
        Number(expense.rent || 0) +
        Number(expense.tenantCharges || 0) +
        Number(expense.taxBenefit || 0);

      const totalMeuble = 
        Number(expense.furnishedRent || 0) +
        Number(expense.tenantCharges || 0);

      rows.push(
        <tr key={year} className={year === years.currentYear ? 'bg-blue-50' : ''}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {year}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.rent || ''}
              onChange={(e) => handleExpenseChange(year, 'rent', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.furnishedRent || ''}
              onChange={(e) => handleExpenseChange(year, 'furnishedRent', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.taxBenefit || ''}
              onChange={(e) => handleExpenseChange(year, 'taxBenefit', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.tenantCharges || ''}
              onChange={(e) => handleExpenseChange(year, 'tenantCharges', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-700">
            {formatCurrency(totalNu)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-700">
            {formatCurrency(totalMeuble)}
          </td>
        </tr>
      );
    }
    return rows;
  };

  const renderProjectedTable = () => {
    const rows = [];
    for (let year = years.currentYear + 1; year <= years.endYear; year++) {
      const expense = investment.expenses.find(e => e.year === year);
      if (!expense) continue;

      const totalNu = 
        Number(expense.rent || 0) +
        Number(expense.tenantCharges || 0) +
        Number(expense.taxBenefit || 0);

      const totalMeuble = 
        Number(expense.furnishedRent || 0) +
        Number(expense.tenantCharges || 0);

      rows.push(
        <tr key={year}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {year}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.rent || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.furnishedRent || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <input
              type="number"
              value={expense.taxBenefit || ''}
              onChange={(e) => handleExpenseChange(year, 'taxBenefit', Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(expense.tenantCharges || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-700">
            {formatCurrency(totalNu)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-700">
            {formatCurrency(totalMeuble)}
          </td>
        </tr>
      );
    }
    return rows;
  };

  return (
    <div className="space-y-6">
      {/* Tableau d'historique */}
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
            {renderHistoricalTable()}
          </tbody>
        </table>
      </div>

      {/* Base de projection */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Base de projection (2025)
        </h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  value={investment.expenseProjection.baseYear?.rent || 0}
                  onChange={(e) => handleBaseYearChange('rent', Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  value={investment.expenseProjection.baseYear?.furnishedRent || 0}
                  onChange={(e) => handleBaseYearChange('furnishedRent', Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  value={investment.expenseProjection.baseYear?.taxBenefit || 0}
                  onChange={(e) => handleBaseYearChange('taxBenefit', Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  value={investment.expenseProjection.baseYear?.tenantCharges || 0}
                  onChange={(e) => handleBaseYearChange('tenantCharges', Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Paramètres de projection */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Paramètres de projection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Augmentation annuelle du loyer nu (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.rentIncrease}
              onChange={(e) => handleProjectionChange('rentIncrease', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Augmentation annuelle du loyer meublé (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.furnishedRentIncrease}
              onChange={(e) => handleProjectionChange('furnishedRentIncrease', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Augmentation annuelle des charges locataire (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.tenantChargesIncrease}
              onChange={(e) => handleProjectionChange('tenantChargesIncrease', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Augmentation annuelle de l'aide fiscale (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.taxBenefitIncrease}
              onChange={(e) => handleProjectionChange('taxBenefitIncrease', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tableau de projection */}
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
            {renderProjectedTable()}
          </tbody>
        </table>
      </div>
    </div>
  );
}