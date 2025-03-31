/**
 * Composant TaxDisplay
 * 
 * Ce composant gère l'affichage et le calcul des aspects fiscaux d'un investissement immobilier.
 * Il permet de :
 * - Choisir le type d'investissement (location nue, LMNP, SCI)
 * - Gérer le régime d'imposition (réel ou micro)
 * - Calculer les impôts selon le régime choisi
 * - Gérer les déficits fonciers et leur report
 * - Calculer les amortissements pour le LMNP
 * - Projeter les résultats fiscaux sur plusieurs années
 * 
 * Le composant utilise des états locaux pour gérer les différents aspects fiscaux
 * et met à jour l'investissement parent via la prop onUpdate.
 */

import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { Investment, LMNPData } from '../types/investment';

// Interface définissant les props du composant
interface Props {
  investment: Investment;
  onUpdate: (updatedInvestment: Investment) => void;
}

// Interface pour l'historique fiscal
interface TaxHistory {
  year: number;
  tax: number;
  deficit: number;
}

export default function TaxDisplay({ investment, onUpdate }: Props) {
  // États pour gérer le type d'investissement et le régime d'imposition
  const [taxType, setTaxType] = useState<'direct' | 'lmnp' | 'sci'>(investment.taxType || 'direct');
  const [taxationMethod, setTaxationMethod] = useState<'real' | 'micro'>(investment.taxationMethod || 'real');
  const [taxHistory, setTaxHistory] = useState<TaxHistory[]>([]);
  const [taxRate, setTaxRate] = useState<number>(investment.taxRate || 30);
  const [manualDeficit, setManualDeficit] = useState<number>(investment.manualDeficit || 0);
  
  // États spécifiques au régime LMNP
  const [buildingValue, setBuildingValue] = useState<number>(investment.lmnpData?.buildingValue || 0);
  const [furnitureValue, setFurnitureValue] = useState<number>(investment.lmnpData?.furnitureValue || 0);
  const [buildingAmortizationYears, setBuildingAmortizationYears] = useState<number>(
    investment.lmnpData?.buildingAmortizationYears || 30
  );
  const [furnitureAmortizationYears, setFurnitureAmortizationYears] = useState<number>(
    investment.lmnpData?.furnitureAmortizationYears || 5
  );
  const [lmnpDeficitHistory, setLmnpDeficitHistory] = useState<Record<number, number>>(
    investment.lmnpData?.deficitHistory || {}
  );
  const [excessAmortization, setExcessAmortization] = useState<Record<number, number>>(
    investment.lmnpData?.excessAmortization || {}
  );

  // Calcul des années de référence
  const currentYear = new Date().getFullYear();
  const startYear = new Date(investment.projectStartDate).getFullYear();
  const endYear = new Date(investment.projectEndDate).getFullYear();
  
  // Récupération des dépenses de l'année courante et précédente
  const currentYearExpenses = investment.expenses.find(e => e.year === currentYear);
  const previousYearExpenses = investment.expenses.find(e => e.year === currentYear - 1);

  // Initialisation de l'historique fiscal
  useEffect(() => {
    // Initialiser l'historique fiscal uniquement avec les années passées
    const initialTaxHistory = Array.from(
      { length: currentYear - startYear },
      (_, index) => {
        const year = startYear + index;
        const existingExpense = investment.expenses.find(e => e.year === year);
        return {
          year,
          tax: existingExpense?.tax || 0,
          deficit: existingExpense?.deficit || 0
        };
      }
    );
    
    setTaxHistory(initialTaxHistory);
  }, [investment.projectStartDate, currentYear, startYear, investment.expenses]);

  // Mise à jour de l'investissement lors des changements de type d'imposition
  useEffect(() => {
    onUpdate({
      ...investment,
      taxType,
      taxationMethod
    });
  }, [taxType, taxationMethod]);

  // Mise à jour des données LMNP
  useEffect(() => {
    if (taxType === 'lmnp' && taxationMethod === 'real') {
      const result = calculateLMNPTaxResult(currentYear);
      
      // Mise à jour des données LMNP pour l'année courante
      const updatedDeficitHistory = { ...lmnpDeficitHistory, [currentYear]: result.deficit };
      const updatedExcessAmortization = { ...excessAmortization, [currentYear]: result.excessAmortization };
      
      setLmnpDeficitHistory(updatedDeficitHistory);
      setExcessAmortization(updatedExcessAmortization);
      
      // Mise à jour de l'investissement avec les nouvelles données LMNP
      onUpdate({
        ...investment,
        lmnpData: {
          ...investment.lmnpData,
          buildingValue,
          furnitureValue,
          buildingAmortizationYears,
          furnitureAmortizationYears,
          deficitHistory: updatedDeficitHistory,
          excessAmortization: updatedExcessAmortization
        }
      });
    }
  }, [currentYear, taxType, taxationMethod, buildingValue, furnitureValue, 
      buildingAmortizationYears, furnitureAmortizationYears]);

  // Gestionnaire de modification de l'historique fiscal
  const handleTaxHistoryChange = (year: number, field: 'tax' | 'deficit', value: number) => {
    const updatedHistory = taxHistory.map(item => {
      if (item.year === year) {
        if (field === 'tax' && value !== 0) {
          return { ...item, [field]: value, deficit: 0 };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    setTaxHistory(updatedHistory);

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
        tax: field === 'tax' ? value : 0,
        deficit: field === 'deficit' ? value : 0,
        loanPayment: 0,
        loanInsurance: 0,
        taxBenefit: 0,
        interest: 0
      });
    } else {
      updatedExpenses[expenseIndex] = {
        ...updatedExpenses[expenseIndex],
        [field]: value
      };
    }

    onUpdate({
      ...investment,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  // Gestionnaires de modification des paramètres fiscaux
  const handleTaxRateChange = (value: number) => {
    setTaxRate(value);
    onUpdate({
      ...investment,
      taxRate: value
    });
  };

  const handleManualDeficitChange = (value: number) => {
    setManualDeficit(value);
    onUpdate({
      ...investment,
      manualDeficit: value
    });
  };

  const handleTaxTypeChange = (type: 'direct' | 'lmnp' | 'sci') => {
    setTaxType(type);
  };

  const handleTaxationMethodChange = (method: 'real' | 'micro') => {
    setTaxationMethod(method);
  };

  // Gestionnaire de modification des données LMNP
  const handleLMNPDataChange = (field: keyof LMNPData, value: any) => {
    // Mettre à jour l'état local
    switch (field) {
      case 'buildingValue':
        setBuildingValue(value);
        break;
      case 'furnitureValue':
        setFurnitureValue(value);
        break;
      case 'buildingAmortizationYears':
        setBuildingAmortizationYears(value);
        break;
      case 'furnitureAmortizationYears':
        setFurnitureAmortizationYears(value);
        break;
    }
  };

  // Fonctions utilitaires pour les calculs fiscaux
  const getDeductibleExpenses = (yearExpenses: any) => {
    if (!yearExpenses) return 0;
    
    return Number(yearExpenses.propertyTax || 0) +
      Number(yearExpenses.condoFees || 0) +
      Number(yearExpenses.propertyInsurance || 0) +
      Number(yearExpenses.managementFees || 0) +
      Number(yearExpenses.unpaidRentInsurance || 0) +
      Number(yearExpenses.repairs || 0) +
      Number(yearExpenses.otherDeductible || 0) +
      Number(yearExpenses.loanInsurance || 0) +
      Number(yearExpenses.interest || 0);
  };

  const calculateDirectTaxResult = (year: number, previousYearDeficit: number = 0) => {
    const yearExpenses = investment.expenses.find(e => e.year === year);
    if (!yearExpenses) return { tax: 0, nextYearDeficit: 0 };

    const rentalIncome = Number(yearExpenses.rent || 0);
    const tenantCharges = Number(yearExpenses.tenantCharges || 0);
    const totalIncome = rentalIncome + tenantCharges;

    if (taxationMethod === 'micro') {
      // Régime micro-foncier : abattement forfaitaire de 30%
      const taxableAmount = totalIncome * 0.7;
      return {
        tax: taxableAmount * (taxRate / 100),
        nextYearDeficit: 0
      };
    } else {
      // Régime réel
      const deductibleExpenses = getDeductibleExpenses(yearExpenses);
      const taxableAmount = totalIncome - deductibleExpenses - previousYearDeficit;

      if (taxableAmount <= 0) {
        return {
          tax: 0,
          nextYearDeficit: Math.abs(taxableAmount)
        };
      }

      return {
        tax: taxableAmount * (taxRate / 100),
        nextYearDeficit: 0
      };
    }
  };

  const calculateLMNPTaxResult = (year: number) => {
    const yearExpenses = investment.expenses.find(e => e.year === year);
    if (!yearExpenses) return { tax: 0, deficit: 0, excessAmortization: 0 };

    const rentalIncome = Number(yearExpenses.rent || 0);
    const tenantCharges = Number(yearExpenses.tenantCharges || 0);
    const totalIncome = rentalIncome + tenantCharges;

    if (taxationMethod === 'micro') {
      // Régime micro-BIC : abattement forfaitaire de 50%
      const taxableAmount = totalIncome * 0.5;
      return {
        tax: taxableAmount * (taxRate / 100),
        deficit: 0,
        excessAmortization: 0
      };
    } else {
      // Régime réel
      const deductibleExpenses = getDeductibleExpenses(yearExpenses);
      
      // Calcul des amortissements
      const buildingAmortization = buildingValue > 0 ? 
        (buildingValue * 0.85) / buildingAmortizationYears : 0;
      
      const furnitureAmortization = furnitureValue > 0 ? 
        furnitureValue / furnitureAmortizationYears : 0;
      
      const totalAmortization = buildingAmortization + furnitureAmortization;
      
      // Récupération du déficit reporté
      const previousDeficit = lmnpDeficitHistory[year - 1] || 0;
      const previousExcessAmortization = excessAmortization[year - 1] || 0;
      
      // Calcul du résultat avant amortissements
      const resultBeforeAmortization = totalIncome - deductibleExpenses - previousDeficit;
      
      // Si résultat positif, on peut utiliser les amortissements
      if (resultBeforeAmortization > 0) {
        // On utilise d'abord les amortissements excédentaires reportés
        const remainingResult = resultBeforeAmortization - previousExcessAmortization;
        
        if (remainingResult > 0) {
          // On peut utiliser les amortissements de l'année
          const resultAfterAmortization = remainingResult - totalAmortization;
          
          if (resultAfterAmortization > 0) {
            // Résultat imposable positif
            return {
              tax: resultAfterAmortization * (taxRate / 100),
              deficit: 0,
              excessAmortization: 0
            };
          } else {
            // Amortissements excédentaires à reporter
            return {
              tax: 0,
              deficit: 0,
              excessAmortization: Math.abs(resultAfterAmortization)
            };
          }
        } else {
          // Amortissements excédentaires restants à reporter
          return {
            tax: 0,
            deficit: 0,
            excessAmortization: Math.abs(remainingResult) + totalAmortization
          };
        }
      } else {
        // Déficit à reporter (plafonné à 10 700€)
        const deficit = Math.min(Math.abs(resultBeforeAmortization), 10700);
        
        // Amortissements à reporter intégralement
        return {
          tax: 0,
          deficit: deficit,
          excessAmortization: previousExcessAmortization + totalAmortization
        };
      }
    }
  };

  // Fonction de formatage des montants
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  // Fonction pour obtenir la décomposition des charges déductibles
  const getDeductibleExpensesBreakdown = () => {
    if (!currentYearExpenses) return '';

    return `Charges déductibles composées de :
- Taxe foncière : ${formatCurrency(currentYearExpenses.propertyTax || 0)}
- Charges copropriété : ${formatCurrency(currentYearExpenses.condoFees || 0)}
- Assurance propriétaire : ${formatCurrency(currentYearExpenses.propertyInsurance || 0)}
- Frais d'agence : ${formatCurrency(currentYearExpenses.managementFees || 0)}
- Assurance loyers impayés : ${formatCurrency(currentYearExpenses.unpaidRentInsurance || 0)}
- Travaux : ${formatCurrency(currentYearExpenses.repairs || 0)}
- Autres déductibles : ${formatCurrency(currentYearExpenses.otherDeductible || 0)}
- Assurance prêt : ${formatCurrency(currentYearExpenses.loanInsurance || 0)}
- Intérêts d'emprunt : ${formatCurrency(currentYearExpenses.interest || 0)}`;
  };

  // Fonctions de rendu des tableaux de projection
  const renderDirectProjectionTable = () => {
    const rows = [];
    let previousDeficit = manualDeficit || (previousYearExpenses?.deficit || 0);

    for (let year = currentYear; year <= endYear; year++) {
      const yearExpenses = investment.expenses.find(e => e.year === year);
      if (!yearExpenses) continue;

      const result = calculateDirectTaxResult(year, previousDeficit);

      rows.push(
        <tr key={year} className={year === currentYear ? 'bg-blue-50' : ''}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {year}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearExpenses.rent || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearExpenses.tenantCharges || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(previousDeficit)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(getDeductibleExpenses(yearExpenses))}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(result.tax)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(result.nextYearDeficit)}
          </td>
        </tr>
      );

      previousDeficit = result.nextYearDeficit;
    }

    return rows;
  };

  const renderLMNPProjectionTable = () => {
    const rows = [];
    let currentDeficit = lmnpDeficitHistory[currentYear - 1] || 0;
    let currentExcessAmortization = excessAmortization[currentYear - 1] || 0;

    for (let year = currentYear; year <= endYear; year++) {
      const yearExpenses = investment.expenses.find(e => e.year === year);
      if (!yearExpenses) continue;

      // Calcul des amortissements
      const buildingAmortization = buildingValue > 0 ? 
        (buildingValue * 0.85) / buildingAmortizationYears : 0;
      
      const furnitureAmortization = furnitureValue > 0 ? 
        furnitureValue / furnitureAmortizationYears : 0;
      
      const totalAmortization = buildingAmortization + furnitureAmortization;

      // Pour les années futures, nous calculons les résultats sans mettre à jour l'état
      const rentalIncome = Number(yearExpenses.rent || 0);
      const tenantCharges = Number(yearExpenses.tenantCharges || 0);
      const totalIncome = rentalIncome + tenantCharges;
      
      let tax = 0;
      let deficit = 0;
      let excessAmort = 0;

      if (taxationMethod === 'micro') {
        // Régime micro-BIC : abattement forfaitaire de 50%
        const taxableAmount = totalIncome * 0.5;
        tax = taxableAmount * (taxRate / 100);
      } else {
        // Régime réel
        const deductibleExpenses = getDeductibleExpenses(yearExpenses);
        
        // Calcul du résultat avant amortissements
        const resultBeforeAmortization = totalIncome - deductibleExpenses - currentDeficit;
        
        // Si résultat positif, on peut utiliser les amortissements
        if (resultBeforeAmortization > 0) {
          // On utilise d'abord les amortissements excédentaires reportés
          const remainingResult = resultBeforeAmortization - currentExcessAmortization;
          
          if (remainingResult > 0) {
            // On peut utiliser les amortissements de l'année
            const resultAfterAmortization = remainingResult - totalAmortization;
            
            if (resultAfterAmortization > 0) {
              // Résultat imposable positif
              tax = resultAfterAmortization * (taxRate / 100);
            } else {
              // Amortissements excédentaires à reporter
              excessAmort = Math.abs(resultAfterAmortization);
            }
          } else {
            // Amortissements excédentaires restants à reporter
            excessAmort = Math.abs(remainingResult) + totalAmortization;
          }
        } else {
          // Déficit à reporter (plafonné à 10 700€)
          deficit = Math.min(Math.abs(resultBeforeAmortization), 10700);
          
          // Amortissements à reporter intégralement
          excessAmort = currentExcessAmortization + totalAmortization;
        }
      }

      // Mettre à jour les valeurs pour l'année suivante
      currentDeficit = deficit;
      currentExcessAmortization = excessAmort;

      rows.push(
        <tr key={year} className={year === currentYear ? 'bg-blue-50' : ''}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {year}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearExpenses.rent || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearExpenses.tenantCharges || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(getDeductibleExpenses(yearExpenses))}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(totalAmortization)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(tax)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(deficit)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(excessAmort)}
          </td>
        </tr>
      );
    }

    return rows;
  };

  // Calcul des résultats fiscaux courants
  const currentDirectTaxResult = calculateDirectTaxResult(currentYear, manualDeficit || (previousYearExpenses?.deficit || 0));
  const currentLMNPTaxResult = calculateLMNPTaxResult(currentYear);

  // Rendu du composant
  return (
    <div className="space-y-6">
      {/* Type d'investissement */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Type d'investissement</h3>
        <div className="space-y-4">
          <div>
            <select
              value={taxType}
              onChange={(e) => handleTaxTypeChange(e.target.value as 'direct' | 'lmnp' | 'sci')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="direct">Location nue</option>
              <option value="lmnp">LMNP</option>
              <option value="sci">SCI à l'IS</option>
            </select>
          </div>

          {taxType === 'direct' && (
            <div className="space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="real"
                  checked={taxationMethod === 'real'}
                  onChange={() => handleTaxationMethodChange('real')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Frais réels</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="micro"
                  checked={taxationMethod === 'micro'}
                  onChange={() => handleTaxationMethodChange('micro')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Micro foncier</span>
              </label>
            </div>
          )}

          {taxType === 'lmnp' && (
            <div className="space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="real"
                  checked={taxationMethod === 'real'}
                  onChange={() => handleTaxationMethodChange('real')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Frais réels</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="micro"
                  checked={taxationMethod === 'micro'}
                  onChange={() => handleTaxationMethodChange('micro')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Micro-BIC</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {taxType === 'direct' && (
        <>
          {/* Historique d'imposition */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Historique d'imposition</h3>
            {taxHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Année
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Imposition
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Déficit foncier
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taxHistory.map((item) => (
                      <tr key={item.year}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <input
                            type="number"
                            value={item.tax}
                            onChange={(e) => handleTaxHistoryChange(item.year, 'tax', Number(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <input
                            type="number"
                            value={item.deficit}
                            onChange={(e) => handleTaxHistoryChange(item.year, 'deficit', Number(e.target.value))}
                            disabled={item.tax !== 0}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              item.tax !== 0 ? 'bg-gray-100' : ''
                            }`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">Pas d'historique disponible pour les années précédentes.</p>
            )}
          </div>

          {/* Détails de l'imposition */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Détails de l'imposition</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Loyers perçus
                </label>
                <input
                  type="number"
                  value={currentYearExpenses?.rent || 0}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Charges imputées au locataire
                </label>
                <input
                  type="number"
                  value={currentYearExpenses?.tenantCharges || 0}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Déficit foncier à considérer
                  <div className="group relative ml-1">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-pre-line">
                      Déficit foncier à prendre en compte pour le calcul de l'imposition de l'année en cours. Vous pouvez modifier cette valeur manuellement.
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={manualDeficit}
                  onChange={(e) => handleManualDeficitChange(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Charges déductibles
                  <div className="group relative ml-1">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-pre-line">
                      {getDeductibleExpensesBreakdown()}
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={getDeductibleExpenses(currentYearExpenses)}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  % d'imposition
                </label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Résultats */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Résultats</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Imposition</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(currentDirectTaxResult.tax)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Déficit pour l'année à venir</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(currentDirectTaxResult.nextYearDeficit)}
                </p>
              </div>
            </div>
          </div>

          {/* Projection */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Projection</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Année
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loyers perçus
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Charges locataires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Déficit reporté
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Charges déductibles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Imposition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Déficit généré
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renderDirectProjectionTable()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {taxType === 'lmnp' && (
        <>
          {/* Paramètres LMNP */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Paramètres LMNP</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Valeur du bien immobilier (hors terrain)
                  <div className="group relative ml-1">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-pre-line">
                      Valeur du bien immobilier hors terrain (environ 85% du prix d'achat)
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={buildingValue}
                  onChange={(e) => handleLMNPDataChange('buildingValue', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Valeur du mobilier
                  <div className="group relative ml-1">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-pre-line">
                      Valeur des équipements meublants
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={furnitureValue}
                  onChange={(e) => handleLMNPDataChange('furnitureValue', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Durée d'amortissement du bien (années)
                </label>
                <input
                  type="number"
                  value={buildingAmortizationYears}
                  onChange={(e) => handleLMNPDataChange('buildingAmortizationYears', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Durée d'amortissement du mobilier (années)
                </label>
                <input
                  type="number"
                  value={furnitureAmortizationYears}
                  onChange={(e) => handleLMNPDataChange('furnitureAmortizationYears', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  % d'imposition
                </label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Détails de l'imposition LMNP */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Détails de l'imposition</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Loyers perçus
                </label>
                <input
                  type="number"
                  value={currentYearExpenses?.rent || 0}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Charges imputées au locataire
                </label>
                <input
                  type="number"
                  value={currentYearExpenses?.tenantCharges || 0}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Charges déductibles
                  <div className="group relative ml-1">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-pre-line">
                      {getDeductibleExpensesBreakdown()}
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={getDeductibleExpenses(currentYearExpenses)}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Amortissements
                  <div className="group relative ml-1">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-pre-line">
                      Amortissement annuel = Amortissement du bien + Amortissement du mobilier
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={
                    (buildingValue > 0 ? (buildingValue * 0.85) / buildingAmortizationYears : 0) +
                    (furnitureValue > 0 ? furnitureValue / furnitureAmortizationYears : 0)
                  }
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Déficit reporté
                  <div className="group relative ml-1">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-pre-line">
                      Déficit fiscal reporté des années précédentes (plafonné à 10 700€ par an)
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={lmnpDeficitHistory[currentYear - 1] || 0}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Amortissements excédentaires reportés
                  <div className="group relative ml-1">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-pre-line">
                      Amortissements non utilisés des années précédentes (report illimité)
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={excessAmortization[currentYear - 1] || 0}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Résultats LMNP */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Résultats</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Imposition</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(currentLMNPTaxResult.tax)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Déficit fiscal reportable</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(currentLMNPTaxResult.deficit)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Amortissements excédentaires</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(currentLMNPTaxResult.excessAmortization)}
                </p>
              </div>
            </div>
          </div>

          {/* Projection LMNP */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Projection</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Année
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loyers perçus
                    </th>
                    <th className="px-6 py-3 text- left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Charges locataires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Charges déductibles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amortissements
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Imposition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Déficit fiscal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amort. excédentaires
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renderLMNPProjectionTable()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {taxType === 'sci' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-600">En cours de construction</p>
        </div>
      )}
    </div>
  );
}