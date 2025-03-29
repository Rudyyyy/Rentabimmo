import React, { useState } from 'react';
import { Investment } from '../types/investment';
import { HelpCircle } from 'lucide-react';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';

interface Props {
  investment: Investment;
  onUpdate: (updatedInvestment: Investment) => void;
}

interface TaxHistory {
  year: number;
  tax: number;
  deficit: number;
}

interface LMNPData {
  buildingValue: number;
  furnitureValue: number;
  buildingAmortizationYears: number;
  furnitureAmortizationYears: number;
  deficitHistory: Record<number, number>;
  excessAmortization: Record<number, number>;
}

export default function TaxForm({ investment, onUpdate }: Props) {
  const [taxType, setTaxType] = useState<'direct' | 'lmnp' | 'sci'>(investment.taxType || 'direct');
  const [taxationMethod, setTaxationMethod] = useState<'real' | 'micro'>(investment.taxationMethod || 'real');
  const [taxHistory, setTaxHistory] = useState<TaxHistory[]>([]);
  const [taxRate, setTaxRate] = useState<number>(investment.taxRate || 30);
  const [manualDeficit, setManualDeficit] = useState<number>(investment.manualDeficit || 0);
  
  // LMNP specific state
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

  const currentYear = new Date().getFullYear();
  const startYear = new Date(investment.projectStartDate).getFullYear();
  const endYear = new Date(investment.projectEndDate).getFullYear();
  
  const currentYearExpenses = investment.expenses.find(e => e.year === currentYear);
  const previousYearExpenses = investment.expenses.find(e => e.year === currentYear - 1);

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
    onUpdate({
      ...investment,
      taxType: type
    });
  };

  const handleTaxationMethodChange = (method: 'real' | 'micro') => {
    setTaxationMethod(method);
    onUpdate({
      ...investment,
      taxationMethod: method
    });
  };

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

    // Mettre à jour l'investment
    onUpdate({
      ...investment,
      lmnpData: {
        buildingValue: field === 'buildingValue' ? value : buildingValue,
        furnitureValue: field === 'furnitureValue' ? value : furnitureValue,
        buildingAmortizationYears: field === 'buildingAmortizationYears' ? value : buildingAmortizationYears,
        furnitureAmortizationYears: field === 'furnitureAmortizationYears' ? value : furnitureAmortizationYears,
        deficitHistory: lmnpDeficitHistory,
        excessAmortization: excessAmortization
      }
    });
  };

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
      const currentDeficit = lmnpDeficitHistory[year - 1] || 0;
      const currentExcessAmortization = excessAmortization[year - 1] || 0;

      // Calcul des amortissements
      const buildingAmortization = buildingValue / buildingAmortizationYears;
      const furnitureAmortization = furnitureValue / furnitureAmortizationYears;
      const totalAmortization = buildingAmortization + furnitureAmortization;

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
          excessAmortization: currentExcessAmortization + totalAmortization
        };
      }
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

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

  const currentDirectTaxResult = calculateDirectTaxResult(currentYear, manualDeficit || (previousYearExpenses?.deficit || 0));
  const currentLMNPTaxResult = calculateLMNPTaxResult(currentYear);

  return (
    <div className="space-y-6">
      {/* Type d'imposition */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Type d'imposition</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => handleTaxTypeChange('direct')}
            className={`px-4 py-2 rounded-md ${
              taxType === 'direct'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Location nue
          </button>
          <button
            type="button"
            onClick={() => handleTaxTypeChange('lmnp')}
            className={`px-4 py-2 rounded-md ${
              taxType === 'lmnp'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            LMNP
          </button>
          <button
            type="button"
            onClick={() => handleTaxTypeChange('sci')}
            className={`px-4 py-2 rounded-md ${
              taxType === 'sci'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } opacity-50 cursor-not-allowed`}
            disabled
          >
            SCI (à venir)
          </button>
        </div>
      </div>

      {/* Méthode d'imposition */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Méthode d'imposition</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleTaxationMethodChange('real')}
            className={`px-4 py-2 rounded-md ${
              taxationMethod === 'real'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Régime réel
          </button>
          <button
            type="button"
            onClick={() => handleTaxationMethodChange('micro')}
            className={`px-4 py-2 rounded-md ${
              taxationMethod === 'micro'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {taxType === 'direct' ? 'Micro-foncier' : 'Micro-BIC'}
          </button>
        </div>
      </div>

      {/* Paramètres d'imposition */}
      {taxType === 'direct' ? (
        <>
          {/* Paramètres location nue */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Paramètres d'imposition</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </>
      ) : (
        <>
          {/* Paramètres LMNP */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Paramètres d'imposition LMNP</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valeur du bien (hors mobilier)
                </label>
                <input
                  type="number"
                  value={buildingValue}
                  onChange={(e) => handleLMNPDataChange('buildingValue', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valeur du mobilier
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </>
      )}
    </div>
  );
} 