import React, { useState } from 'react';
import { Investment, YearlyExpenses } from '../types/investment';

interface Props {
  onClose: () => void;
  onSave: (investment: Investment) => void;
  onDetailedForm: () => void;
}

const QuickPropertyForm: React.FC<Props> = ({ onClose, onSave, onDetailedForm }) => {
  const defaultName = `Bien ${new Date().getFullYear()}`;
  const defaultDescription = 'Description du bien';

  const [projectStartDate, setProjectStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [isNewProperty, setIsNewProperty] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [charges, setCharges] = useState<string>('');
  const [propertyTax, setPropertyTax] = useState<string>('');
  const [rent, setRent] = useState<string>('');
  const [isFurnished, setIsFurnished] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!projectStartDate) {
      newErrors.projectStartDate = 'La date de début du projet est requise';
    }
    
    if (!purchasePrice || isNaN(Number(purchasePrice)) || Number(purchasePrice) <= 0) {
      newErrors.purchasePrice = 'Le prix d\'achat doit être un nombre positif';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    const price = Number(purchasePrice);
    const agencyFees = price * 0.04; // 4% du prix d'achat
    const notaryFees = price * (isNewProperty ? 0.025 : 0.075); // 2.5% pour neuf, 7.5% pour ancien
    const bankFees = 1000; // Frais de dossier fixes
    const bankGuaranteeFees = price * 0.01; // 1% du prix d'achat
    const mandatoryDiagnostics = 0; // Diagnostic gratuit
    const renovationCosts = price * 0.05; // 5% du prix d'achat
    
    // Calcul du coût total
    const totalCost = price + agencyFees + notaryFees + bankFees + bankGuaranteeFees + mandatoryDiagnostics + renovationCosts;
    
    // Calcul de l'apport (10% du coût total)
    const downPayment = totalCost * 0.1;
    
    // Calcul du montant emprunté
    const loanAmount = totalCost - downPayment;
    
    // Calcul de la date de fin (20 ans après la date de début)
    const endDate = new Date(projectStartDate);
    endDate.setFullYear(endDate.getFullYear() + 20);
    
    // Traitement des valeurs saisies pour la location
    const chargesValue = charges ? Number(charges) : 0;
    const propertyTaxValue = propertyTax ? Number(propertyTax) : 0;
    const rentValue = rent ? Number(rent) : 0;
    
    // Calcul des charges locataires (moitié des charges)
    const tenantChargesValue = chargesValue / 2;
    
    // Calcul des loyers selon le type (meublé ou non meublé)
    // Si meublé : loyer meublé = valeur saisie, loyer nu = valeur / 1.1
    // Si non meublé : loyer nu = valeur saisie, loyer meublé = valeur * 1.1
    const rentValueAnnual = rentValue * 12; // Conversion mensuel -> annuel
    const furnishedRentValue = isFurnished ? rentValueAnnual : rentValueAnnual * 1.1;
    const unfurnishedRentValue = isFurnished ? rentValueAnnual / 1.1 : rentValueAnnual;
    
    // Calcul des valeurs par défaut pour les frais
    const propertyInsuranceValue = price * 0.002; // 0.2% du prix d'achat
    const repairsValue = price * 0.004; // 0.4% du prix d'achat
    const unpaidRentInsuranceValue = unfurnishedRentValue * 0.04; // 4% du loyer nu annuel
    
    // Année de référence (année courante)
    const currentYear = new Date().getFullYear();
    const startYear = new Date(projectStartDate).getFullYear();
    const endYear = endDate.getFullYear();
    const referenceYear = currentYear >= startYear && currentYear <= endYear ? currentYear : startYear;
    
    // Fonction pour calculer les valeurs projetées
    const calculateProjectedValue = (baseValue: number, increaseRate: number, yearsAhead: number) => {
      return Number(baseValue) * Math.pow(1 + (Number(increaseRate) || 0) / 100, yearsAhead);
    };
    
    // Fonction pour calculer les valeurs historiques
    const calculateHistoricalValue = (baseValue: number, increaseRate: number, yearsBack: number) => {
      return Number(baseValue) / Math.pow(1 + (Number(increaseRate) || 0) / 100, yearsBack);
    };
    
    // Créer les valeurs de base pour l'année de référence
    const baseYearValues = {
      propertyTax: propertyTaxValue,
      condoFees: chargesValue,
      propertyInsurance: propertyInsuranceValue,
      managementFees: 0,
      unpaidRentInsurance: unpaidRentInsuranceValue,
      repairs: repairsValue,
      otherDeductible: 0,
      otherNonDeductible: 0,
      rent: unfurnishedRentValue,
      furnishedRent: furnishedRentValue,
      tenantCharges: tenantChargesValue,
      taxBenefit: 0
    };
    
    // Taux d'augmentation par défaut
    const projectionRates = {
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
      taxBenefitIncrease: 1
    };
    
    // Calculer les tableaux d'historique et de projection
    const expenses: YearlyExpenses[] = [];
    
    // Calculer les années historiques (avant l'année de référence)
    for (let year = startYear; year < referenceYear; year++) {
      const yearsBack = referenceYear - year;
      expenses.push({
        year,
        propertyTax: calculateHistoricalValue(baseYearValues.propertyTax, projectionRates.propertyTaxIncrease, yearsBack),
        condoFees: calculateHistoricalValue(baseYearValues.condoFees, projectionRates.condoFeesIncrease, yearsBack),
        propertyInsurance: calculateHistoricalValue(baseYearValues.propertyInsurance, projectionRates.propertyInsuranceIncrease, yearsBack),
        managementFees: calculateHistoricalValue(baseYearValues.managementFees, projectionRates.managementFeesIncrease, yearsBack),
        unpaidRentInsurance: calculateHistoricalValue(baseYearValues.unpaidRentInsurance, projectionRates.unpaidRentInsuranceIncrease, yearsBack),
        repairs: calculateHistoricalValue(baseYearValues.repairs, projectionRates.repairsIncrease, yearsBack),
        otherDeductible: calculateHistoricalValue(baseYearValues.otherDeductible, projectionRates.otherDeductibleIncrease, yearsBack),
        otherNonDeductible: calculateHistoricalValue(baseYearValues.otherNonDeductible, projectionRates.otherNonDeductibleIncrease, yearsBack),
        rent: calculateHistoricalValue(baseYearValues.rent, projectionRates.rentIncrease, yearsBack),
        furnishedRent: calculateHistoricalValue(baseYearValues.furnishedRent, projectionRates.furnishedRentIncrease, yearsBack),
        tenantCharges: calculateHistoricalValue(baseYearValues.tenantCharges, projectionRates.tenantChargesIncrease, yearsBack),
        taxBenefit: calculateHistoricalValue(baseYearValues.taxBenefit, projectionRates.taxBenefitIncrease, yearsBack),
        tax: 0,
        deficit: 0,
        loanPayment: 0,
        loanInsurance: 0,
        interest: 0
      });
    }
    
    // Ajouter l'année de référence avec les valeurs de base
    expenses.push({
      year: referenceYear,
      ...baseYearValues,
      tax: 0,
      deficit: 0,
      loanPayment: 0,
      loanInsurance: 0,
      interest: 0
    });
    
    // Calculer les années de projection (après l'année de référence)
    for (let year = referenceYear + 1; year <= endYear; year++) {
      const yearsAhead = year - referenceYear;
      expenses.push({
        year,
        propertyTax: calculateProjectedValue(baseYearValues.propertyTax, projectionRates.propertyTaxIncrease, yearsAhead),
        condoFees: calculateProjectedValue(baseYearValues.condoFees, projectionRates.condoFeesIncrease, yearsAhead),
        propertyInsurance: calculateProjectedValue(baseYearValues.propertyInsurance, projectionRates.propertyInsuranceIncrease, yearsAhead),
        managementFees: calculateProjectedValue(baseYearValues.managementFees, projectionRates.managementFeesIncrease, yearsAhead),
        unpaidRentInsurance: calculateProjectedValue(baseYearValues.unpaidRentInsurance, projectionRates.unpaidRentInsuranceIncrease, yearsAhead),
        repairs: calculateProjectedValue(baseYearValues.repairs, projectionRates.repairsIncrease, yearsAhead),
        otherDeductible: calculateProjectedValue(baseYearValues.otherDeductible, projectionRates.otherDeductibleIncrease, yearsAhead),
        otherNonDeductible: calculateProjectedValue(baseYearValues.otherNonDeductible, projectionRates.otherNonDeductibleIncrease, yearsAhead),
        rent: calculateProjectedValue(baseYearValues.rent, projectionRates.rentIncrease, yearsAhead),
        furnishedRent: calculateProjectedValue(baseYearValues.furnishedRent, projectionRates.furnishedRentIncrease, yearsAhead),
        tenantCharges: calculateProjectedValue(baseYearValues.tenantCharges, projectionRates.tenantChargesIncrease, yearsAhead),
        taxBenefit: calculateProjectedValue(baseYearValues.taxBenefit, projectionRates.taxBenefitIncrease, yearsAhead),
        tax: 0,
        deficit: 0,
        loanPayment: 0,
        loanInsurance: 0,
        interest: 0
      });
    }
    
    const investment: Investment = {
      id: '',
      name: name || defaultName,
      description: description || defaultDescription,
      propertyType: isNewProperty ? 'new' : 'old',
      monthlyPayment: (loanAmount * (0.03/12) * Math.pow(1 + 0.03/12, 240)) / (Math.pow(1 + 0.03/12, 240) - 1), // Calcul PMT pour 20 ans à 3%
      monthlyCashFlow: 0,
      cashFlowYears: [],
      grossYield: 0,
      netYield: 0,
      cashOnCashReturn: 0,
      maintenanceProvision: price * 0.01, // 1% du prix d'achat pour la provision d'entretien
      projectStartDate,
      projectEndDate: endDate.toISOString().split('T')[0],
      purchasePrice: price,
      agencyFees,
      notaryFees,
      bankFees,
      bankGuaranteeFees,
      mandatoryDiagnostics: 0,
      renovationCosts,
      startDate: projectStartDate,
      hasDeferral: false,
      deferralType: 'none',
      deferredPeriod: 0,
      deferredInterest: 0,
      downPayment,
      loanAmount,
      loanDuration: 20,
      interestRate: 3,
      insuranceRate: 0.25,
      propertyTax: 0,
      condoFees: 0,
      propertyInsurance: propertyInsuranceValue,
      managementFees: 0,
      unpaidRentInsurance: unpaidRentInsuranceValue,
      expenses: expenses.sort((a, b) => a.year - b.year),
      expenseProjection: {
        propertyTaxIncrease: projectionRates.propertyTaxIncrease,
        condoFeesIncrease: projectionRates.condoFeesIncrease,
        propertyInsuranceIncrease: projectionRates.propertyInsuranceIncrease,
        managementFeesIncrease: projectionRates.managementFeesIncrease,
        unpaidRentInsuranceIncrease: projectionRates.unpaidRentInsuranceIncrease,
        repairsIncrease: projectionRates.repairsIncrease,
        otherDeductibleIncrease: projectionRates.otherDeductibleIncrease,
        otherNonDeductibleIncrease: projectionRates.otherNonDeductibleIncrease,
        rentIncrease: projectionRates.rentIncrease,
        furnishedRentIncrease: projectionRates.furnishedRentIncrease,
        tenantChargesIncrease: projectionRates.tenantChargesIncrease,
        taxBenefitIncrease: projectionRates.taxBenefitIncrease,
        vacancyRate: 3, // 3% de vacance locative par défaut
        baseYear: baseYearValues
      },
      saleDate: '',
      appreciationType: 'global',
      appreciationValue: 0,
      saleAgencyFees: 0,
      improvementWorks: 0,
      isLMP: false,
      accumulatedDepreciation: 0,
      monthlyRent: 0,
      annualRentIncrease: 0,
      occupancyRate: 100,
      rentalStartDate: projectStartDate,
      remainingBalance: 0,
      taxType: 'direct',
      taxationMethod: 'real',
      taxRate: 30,
      manualDeficit: 0,
      selectedRegime: 'micro-foncier',
      taxRegime: 'micro-foncier',
      taxResults: {
        'micro-foncier': {
          regime: 'micro-foncier',
          taxableIncome: 0,
          tax: 0,
          socialCharges: 0,
          totalTax: 0,
          netIncome: 0
        },
        'reel-foncier': {
          regime: 'reel-foncier',
          taxableIncome: 0,
          tax: 0,
          socialCharges: 0,
          totalTax: 0,
          netIncome: 0
        },
        'micro-bic': {
          regime: 'micro-bic',
          taxableIncome: 0,
          tax: 0,
          socialCharges: 0,
          totalTax: 0,
          netIncome: 0
        },
        'reel-bic': {
          regime: 'reel-bic',
          taxableIncome: 0,
          tax: 0,
          socialCharges: 0,
          totalTax: 0,
          netIncome: 0
        }
      },
      taxParameters: {
        taxRate: 30,
        socialChargesRate: 17.2,
        buildingValue: price * 0.8, // 80% du prix d'achat pour le bâtiment
        buildingAmortizationYears: 25,
        furnitureValue: price * 0.1, // 10% du prix d'achat pour les meubles
        furnitureAmortizationYears: 5,
        worksValue: renovationCosts,
        worksAmortizationYears: 10,
        otherValue: 0,
        otherAmortizationYears: 5,
        previousDeficit: 0,
        deficitLimit: 10700,
        rent: 0,
        furnishedRent: 0,
        tenantCharges: 0,
        taxBenefit: 0
      },
      amortizationSchedule: []
    };
    
    onSave(investment);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Création rapide de bien</h2>
        
        <div className="space-y-4">
          {/* Nom du bien et Type de bien sur la même ligne */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du bien
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={(e) => {
                  if (!name) e.target.placeholder = '';
                }}
                onBlur={(e) => {
                  if (!name) e.target.placeholder = defaultName;
                }}
                placeholder={defaultName}
                className="w-full px-3 py-2 border rounded-md border-gray-300 placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de bien
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={isNewProperty}
                    onChange={() => setIsNewProperty(true)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Neuf</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={!isNewProperty}
                    onChange={() => setIsNewProperty(false)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Ancien</span>
                </label>
              </div>
            </div>
          </div>

          {/* Description sur toute la largeur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={(e) => {
                if (!description) e.target.placeholder = '';
              }}
              onBlur={(e) => {
                if (!description) e.target.placeholder = defaultDescription;
              }}
              placeholder={defaultDescription}
              rows={3}
              className="w-full px-3 py-2 border rounded-md border-gray-300 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Grille 2 colonnes pour les autres champs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début du projet
              </label>
              <input
                type="date"
                value={projectStartDate}
                onChange={(e) => setProjectStartDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.projectStartDate ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.projectStartDate && (
                <p className="text-red-500 text-xs mt-1">{errors.projectStartDate}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix d'achat (€)
              </label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.purchasePrice ? 'border-red-500' : 'border-gray-300'}`}
                min="0"
                step="1000"
              />
              {errors.purchasePrice && (
                <p className="text-red-500 text-xs mt-1">{errors.purchasePrice}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Charges (€/an)
              </label>
              <input
                type="number"
                value={charges}
                onChange={(e) => setCharges(e.target.value)}
                className="w-full px-3 py-2 border rounded-md border-gray-300"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxe foncière (€/an)
              </label>
              <input
                type="number"
                value={propertyTax}
                onChange={(e) => setPropertyTax(e.target.value)}
                className="w-full px-3 py-2 border rounded-md border-gray-300"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de loyer
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={!isFurnished}
                    onChange={() => setIsFurnished(false)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Non meublé</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={isFurnished}
                    onChange={() => setIsFurnished(true)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Meublé</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loyer (€/mois)
              </label>
              <input
                type="number"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md border-gray-300"
                min="0"
                step="50"
                placeholder="0"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <div className="space-x-2">
            <button
              onClick={onDetailedForm}
              className="px-4 py-2 border border-blue-300 rounded-md text-blue-700 hover:bg-blue-50"
            >
              Formulaire détaillé
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickPropertyForm; 