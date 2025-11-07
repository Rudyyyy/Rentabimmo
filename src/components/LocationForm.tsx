/**
 * Composant LocationForm
 * 
 * Ce composant gère la saisie des données de référence et des paramètres de projection
 * pour la section location. Il reprend le formalisme d'AcquisitionDetails avec un layout
 * horizontal et des infobulles d'aide.
 * 
 * Fonctionnalités principales :
 * - Sélection de l'année de référence
 * - Saisie des valeurs de référence pour les frais et revenus
 * - Configuration des paramètres de projection (taux d'augmentation)
 * - Mise à jour en temps réel des projections
 */

import { useState, useEffect, useRef } from 'react';
import { Investment, YearlyExpenses, ExpenseProjection } from '../types/investment';
import { HelpCircle, Calendar, TrendingUp } from 'lucide-react';
import { FaChartPie, FaMoneyBillWave } from 'react-icons/fa';

interface Props {
  investment: Investment;
  onUpdate: (investment: Investment) => void;
  currentSubTab: string;
  onManualEdit?: (isEditing: boolean) => void;
  isManualEdit?: boolean;
  onSubTabChange?: (subTab: 'revenus' | 'frais') => void;
}

export default function LocationForm({ investment, onUpdate, currentSubTab, onManualEdit, isManualEdit: externalIsManualEdit, onSubTabChange }: Props) {
  const [referenceYear, setReferenceYear] = useState(2025);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [autoCalculateHistorical, setAutoCalculateHistorical] = useState(true);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const manualEditTimerRef = useRef<number | undefined>(undefined);
  const latestInvestmentRef = useRef(investment);

  // Garder une référence toujours à jour de l'investment pour éviter les closures périmées
  useEffect(() => {
    latestInvestmentRef.current = investment;
  }, [investment]);

  // Calcul des années disponibles
  const years = {
    startYear: new Date(investment.projectStartDate).getFullYear(),
    endYear: new Date(investment.projectEndDate).getFullYear(),
    currentYear: new Date().getFullYear()
  };

  const availableYears = Array.from(
    { length: years.endYear - years.startYear + 1 },
    (_, i) => years.startYear + i
  );

  // Fonction utilitaire pour formater les montants en euros
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  // Infobulles d'aide
  const tooltips = {
    propertyTax: "Taxe foncière annuelle payée à la commune",
    condoFees: "Charges de copropriété mensuelles × 12",
    propertyInsurance: "Assurance propriétaire non occupant (PNO)",
    managementFees: "Frais de gestion locative (généralement 5-8% des loyers)",
    unpaidRentInsurance: "Assurance garantie des loyers impayés (GLI)",
    repairs: "Travaux d'entretien et de réparation",
    otherDeductible: "Autres charges déductibles fiscalement",
    otherNonDeductible: "Autres charges non déductibles",
    rent: "Loyer nu mensuel × 12",
    furnishedRent: "Loyer meublé mensuel × 12",
    taxBenefit: "Aides fiscales (Pinel, Censi-Bouvard, etc.)",
    tenantCharges: "Charges récupérables sur le locataire",
    vacancyRate: "Pourcentage de vacance locative du bien"
  };

  // Fonction pour calculer les valeurs projetées
  const calculateProjectedValue = (baseValue: number, increaseRate: number, yearsAhead: number) => {
    return Number(baseValue) * Math.pow(1 + (Number(increaseRate) || 0) / 100, yearsAhead);
  };

  // Fonction pour calculer les valeurs historiques (rétrograde)
  const calculateHistoricalValue = (baseValue: number, increaseRate: number, yearsBack: number) => {
    return Number(baseValue) / Math.pow(1 + (Number(increaseRate) || 0) / 100, yearsBack);
  };

  // Fonction pour calculer automatiquement toutes les données historiques
  const calculateAllHistoricalData = () => {
    if (isManualEdit) return; // Ne pas écraser pendant l'édition manuelle
    const current = latestInvestmentRef.current;
    const updatedExpenses = [...current.expenses];
    const baseValues = current.expenseProjection.baseYear;
    
    // Calculer les données historiques (années passées)
    for (let year = years.startYear; year < referenceYear; year++) {
      const yearsBack = referenceYear - year;
      
      const historicalValues = {
        propertyTax: calculateHistoricalValue(
          baseValues.propertyTax,
          current.expenseProjection.propertyTaxIncrease,
          yearsBack
        ),
        condoFees: calculateHistoricalValue(
          baseValues.condoFees,
          current.expenseProjection.condoFeesIncrease,
          yearsBack
        ),
        propertyInsurance: calculateHistoricalValue(
          baseValues.propertyInsurance,
          current.expenseProjection.propertyInsuranceIncrease,
          yearsBack
        ),
        managementFees: calculateHistoricalValue(
          baseValues.managementFees,
          current.expenseProjection.managementFeesIncrease,
          yearsBack
        ),
        unpaidRentInsurance: calculateHistoricalValue(
          baseValues.unpaidRentInsurance,
          current.expenseProjection.unpaidRentInsuranceIncrease,
          yearsBack
        ),
        repairs: calculateHistoricalValue(
          baseValues.repairs,
          current.expenseProjection.repairsIncrease,
          yearsBack
        ),
        otherDeductible: calculateHistoricalValue(
          baseValues.otherDeductible,
          current.expenseProjection.otherDeductibleIncrease,
          yearsBack
        ),
        otherNonDeductible: calculateHistoricalValue(
          baseValues.otherNonDeductible,
          current.expenseProjection.otherNonDeductibleIncrease,
          yearsBack
        ),
        rent: calculateHistoricalValue(
          baseValues.rent,
          current.expenseProjection.rentIncrease,
          yearsBack
        ),
        furnishedRent: calculateHistoricalValue(
          baseValues.furnishedRent,
          current.expenseProjection.furnishedRentIncrease,
          yearsBack
        ),
        tenantCharges: calculateHistoricalValue(
          baseValues.tenantCharges,
          current.expenseProjection.tenantChargesIncrease,
          yearsBack
        ),
        taxBenefit: calculateHistoricalValue(
          baseValues.taxBenefit,
          current.expenseProjection.taxBenefitIncrease,
          yearsBack
        )
      };

      const expenseIndex = updatedExpenses.findIndex(e => e.year === year);
      if (expenseIndex === -1) {
        updatedExpenses.push({
          year,
          ...historicalValues,
          tax: 0,
          deficit: 0,
          loanPayment: 0,
          loanInsurance: 0,
          interest: 0
        });
      } else {
        updatedExpenses[expenseIndex] = {
          ...updatedExpenses[expenseIndex],
          ...historicalValues
        };
      }
    }

    onUpdate({
      ...current,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  // Utilitaire: insérer/mettre à jour la ligne des dépenses pour une année donnée
  const upsertExpenseForYear = (
    updatedExpenses: YearlyExpenses[],
    year: number,
    values: Partial<YearlyExpenses>
  ) => {
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
        taxBenefit: 0,
        tax: 0,
        deficit: 0,
        loanPayment: 0,
        loanInsurance: 0,
        interest: 0,
        ...values
      } as YearlyExpenses);
    } else {
      updatedExpenses[expenseIndex] = {
        ...updatedExpenses[expenseIndex],
        ...values
      } as YearlyExpenses;
    }
  };

  // Recalcule toutes les années futures à partir de l'année de référence (incluse)
  const recalcFutureFromReferenceYear = (projection = investment.expenseProjection) => {
    const current = latestInvestmentRef.current;
    const updatedExpenses = [...current.expenses];

    // S'assurer que l'année de référence reflète les valeurs de base
    upsertExpenseForYear(updatedExpenses, referenceYear, {
      propertyTax: projection.baseYear.propertyTax || 0,
      condoFees: projection.baseYear.condoFees || 0,
      propertyInsurance: projection.baseYear.propertyInsurance || 0,
      managementFees: projection.baseYear.managementFees || 0,
      unpaidRentInsurance: projection.baseYear.unpaidRentInsurance || 0,
      repairs: projection.baseYear.repairs || 0,
      otherDeductible: projection.baseYear.otherDeductible || 0,
      otherNonDeductible: projection.baseYear.otherNonDeductible || 0,
      rent: projection.baseYear.rent || 0,
      furnishedRent: projection.baseYear.furnishedRent || 0,
      tenantCharges: projection.baseYear.tenantCharges || 0,
      taxBenefit: projection.baseYear.taxBenefit || 0
    });

    // Remplir les années historiques (avant l'année de référence) immédiatement
    for (let year = years.startYear; year < referenceYear; year++) {
      const yearsBack = referenceYear - year;
      const historicalValues = {
        propertyTax: calculateHistoricalValue(
          updatedProjection.baseYear.propertyTax,
          updatedProjection.propertyTaxIncrease,
          yearsBack
        ),
        condoFees: calculateHistoricalValue(
          updatedProjection.baseYear.condoFees,
          updatedProjection.condoFeesIncrease,
          yearsBack
        ),
        propertyInsurance: calculateHistoricalValue(
          updatedProjection.baseYear.propertyInsurance,
          updatedProjection.propertyInsuranceIncrease,
          yearsBack
        ),
        managementFees: calculateHistoricalValue(
          updatedProjection.baseYear.managementFees,
          updatedProjection.managementFeesIncrease,
          yearsBack
        ),
        unpaidRentInsurance: calculateHistoricalValue(
          updatedProjection.baseYear.unpaidRentInsurance,
          updatedProjection.unpaidRentInsuranceIncrease,
          yearsBack
        ),
        repairs: calculateHistoricalValue(
          updatedProjection.baseYear.repairs,
          updatedProjection.repairsIncrease,
          yearsBack
        ),
        otherDeductible: calculateHistoricalValue(
          updatedProjection.baseYear.otherDeductible,
          updatedProjection.otherDeductibleIncrease,
          yearsBack
        ),
        otherNonDeductible: calculateHistoricalValue(
          updatedProjection.baseYear.otherNonDeductible,
          updatedProjection.otherNonDeductibleIncrease,
          yearsBack
        ),
        rent: calculateHistoricalValue(
          updatedProjection.baseYear.rent,
          updatedProjection.rentIncrease,
          yearsBack
        ),
        furnishedRent: calculateHistoricalValue(
          updatedProjection.baseYear.furnishedRent,
          updatedProjection.furnishedRentIncrease,
          yearsBack
        ),
        tenantCharges: calculateHistoricalValue(
          updatedProjection.baseYear.tenantCharges,
          updatedProjection.tenantChargesIncrease,
          yearsBack
        ),
        taxBenefit: calculateHistoricalValue(
          updatedProjection.baseYear.taxBenefit,
          updatedProjection.taxBenefitIncrease,
          yearsBack
        )
      } as Partial<YearlyExpenses>;

      upsertExpenseForYear(updatedExpenses, year, historicalValues);
    }

    // Puis projeter les années futures à partir de l'année de référence
    for (let year = referenceYear + 1; year <= years.endYear; year++) {
      const yearsAhead = year - referenceYear;

      const projectedValues = {
        propertyTax: calculateProjectedValue(
          projection.baseYear.propertyTax,
          projection.propertyTaxIncrease,
          yearsAhead
        ),
        condoFees: calculateProjectedValue(
          projection.baseYear.condoFees,
          projection.condoFeesIncrease,
          yearsAhead
        ),
        propertyInsurance: calculateProjectedValue(
          projection.baseYear.propertyInsurance,
          projection.propertyInsuranceIncrease,
          yearsAhead
        ),
        managementFees: calculateProjectedValue(
          projection.baseYear.managementFees,
          projection.managementFeesIncrease,
          yearsAhead
        ),
        unpaidRentInsurance: calculateProjectedValue(
          projection.baseYear.unpaidRentInsurance,
          projection.unpaidRentInsuranceIncrease,
          yearsAhead
        ),
        repairs: calculateProjectedValue(
          projection.baseYear.repairs,
          projection.repairsIncrease,
          yearsAhead
        ),
        otherDeductible: calculateProjectedValue(
          projection.baseYear.otherDeductible,
          projection.otherDeductibleIncrease,
          yearsAhead
        ),
        otherNonDeductible: calculateProjectedValue(
          projection.baseYear.otherNonDeductible,
          projection.otherNonDeductibleIncrease,
          yearsAhead
        ),
        rent: calculateProjectedValue(
          projection.baseYear.rent,
          projection.rentIncrease,
          yearsAhead
        ),
        furnishedRent: calculateProjectedValue(
          projection.baseYear.furnishedRent,
          projection.furnishedRentIncrease,
          yearsAhead
        ),
        tenantCharges: calculateProjectedValue(
          projection.baseYear.tenantCharges,
          projection.tenantChargesIncrease,
          yearsAhead
        ),
        taxBenefit: calculateProjectedValue(
          projection.baseYear.taxBenefit,
          projection.taxBenefitIncrease,
          yearsAhead
        )
      } as Partial<YearlyExpenses>;

      upsertExpenseForYear(updatedExpenses, year, projectedValues);
    }

    onUpdate({
      ...current,
      expenseProjection: projection,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
  };

  // Gestionnaire de changement d'année de référence
  const handleReferenceYearChange = (year: number) => {
    setReferenceYear(year);
    
    // Mettre à jour les valeurs de base avec les données de l'année sélectionnée
    const yearData = investment.expenses.find(e => e.year === year);
    if (yearData) {
      const updatedProjection = {
        ...investment.expenseProjection,
        baseYear: {
          propertyTax: yearData.propertyTax || 0,
          condoFees: yearData.condoFees || 0,
          propertyInsurance: yearData.propertyInsurance || 0,
          managementFees: yearData.managementFees || 0,
          unpaidRentInsurance: yearData.unpaidRentInsurance || 0,
          repairs: yearData.repairs || 0,
          otherDeductible: yearData.otherDeductible || 0,
          otherNonDeductible: yearData.otherNonDeductible || 0,
          rent: yearData.rent || 0,
          furnishedRent: yearData.furnishedRent || 0,
          tenantCharges: yearData.tenantCharges || 0,
          taxBenefit: yearData.taxBenefit || 0
        }
      };

      onUpdate({
        ...investment,
        expenseProjection: updatedProjection
      });

      // Recalculer l'historique et les projections depuis la nouvelle année de référence
      if (autoCalculateHistorical) {
        setTimeout(() => {
          calculateAllHistoricalData();
          recalcFutureFromReferenceYear(updatedProjection);
        }, 0);
      } else {
        setTimeout(() => recalcFutureFromReferenceYear(updatedProjection), 0);
      }
    }
  };

  // Gestionnaire de modification des valeurs de référence
  const handleBaseYearChange = (field: keyof ExpenseProjection['baseYear'], value: number) => {
    // Marquer l'édition manuelle et la débouncer
    setIsManualEdit(true);
    if (onManualEdit) onManualEdit(true);
    if (manualEditTimerRef.current) {
      window.clearTimeout(manualEditTimerRef.current);
    }
    const updatedProjection = {
      ...investment.expenseProjection,
      baseYear: {
        ...investment.expenseProjection.baseYear,
        [field]: value
      }
    };

    // Recalculer les projections pour toutes les années futures
    const updatedExpenses = [...investment.expenses];

    // Mettre à jour la ligne de l'année de référence avec les valeurs de base
    upsertExpenseForYear(updatedExpenses, referenceYear, {
      ...updatedProjection.baseYear
    });

    for (let year = referenceYear + 1; year <= years.endYear; year++) {
      const yearsAhead = year - referenceYear;
      
      const projectedValues = {
        propertyTax: calculateProjectedValue(
          field === 'propertyTax' ? value : updatedProjection.baseYear.propertyTax,
          updatedProjection.propertyTaxIncrease,
          yearsAhead
        ),
        condoFees: calculateProjectedValue(
          field === 'condoFees' ? value : updatedProjection.baseYear.condoFees,
          updatedProjection.condoFeesIncrease,
          yearsAhead
        ),
        propertyInsurance: calculateProjectedValue(
          field === 'propertyInsurance' ? value : updatedProjection.baseYear.propertyInsurance,
          updatedProjection.propertyInsuranceIncrease,
          yearsAhead
        ),
        managementFees: calculateProjectedValue(
          field === 'managementFees' ? value : updatedProjection.baseYear.managementFees,
          updatedProjection.managementFeesIncrease,
          yearsAhead
        ),
        unpaidRentInsurance: calculateProjectedValue(
          field === 'unpaidRentInsurance' ? value : updatedProjection.baseYear.unpaidRentInsurance,
          updatedProjection.unpaidRentInsuranceIncrease,
          yearsAhead
        ),
        repairs: calculateProjectedValue(
          field === 'repairs' ? value : updatedProjection.baseYear.repairs,
          updatedProjection.repairsIncrease,
          yearsAhead
        ),
        otherDeductible: calculateProjectedValue(
          field === 'otherDeductible' ? value : updatedProjection.baseYear.otherDeductible,
          updatedProjection.otherDeductibleIncrease,
          yearsAhead
        ),
        otherNonDeductible: calculateProjectedValue(
          field === 'otherNonDeductible' ? value : updatedProjection.baseYear.otherNonDeductible,
          updatedProjection.otherNonDeductibleIncrease,
          yearsAhead
        ),
        rent: calculateProjectedValue(
          field === 'rent' ? value : updatedProjection.baseYear.rent,
          updatedProjection.rentIncrease,
          yearsAhead
        ),
        furnishedRent: calculateProjectedValue(
          field === 'furnishedRent' ? value : updatedProjection.baseYear.furnishedRent,
          updatedProjection.furnishedRentIncrease,
          yearsAhead
        ),
        tenantCharges: calculateProjectedValue(
          field === 'tenantCharges' ? value : updatedProjection.baseYear.tenantCharges,
          updatedProjection.tenantChargesIncrease,
          yearsAhead
        ),
        taxBenefit: calculateProjectedValue(
          field === 'taxBenefit' ? value : updatedProjection.baseYear.taxBenefit,
          updatedProjection.taxBenefitIncrease,
          yearsAhead
        )
      };

      const expenseIndex = updatedExpenses.findIndex(e => e.year === year);
      if (expenseIndex === -1) {
        updatedExpenses.push({
          year,
          ...projectedValues,
          tax: 0,
          deficit: 0,
          loanPayment: 0,
          loanInsurance: 0,
          interest: 0
        });
      } else {
        updatedExpenses[expenseIndex] = {
          ...updatedExpenses[expenseIndex],
          ...projectedValues
        };
      }
    }

    onUpdate({
      ...investment,
      expenseProjection: updatedProjection,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });

    // Recalculer les données historiques si l'option est activée, après un court délai sans saisie
    if (autoCalculateHistorical) {
      manualEditTimerRef.current = window.setTimeout(() => {
        setIsManualEdit(false);
        if (onManualEdit) onManualEdit(false);
        calculateAllHistoricalData();
      }, 800);
    } else {
      manualEditTimerRef.current = window.setTimeout(() => {
        setIsManualEdit(false);
        if (onManualEdit) onManualEdit(false);
      }, 800);
    }
  };

  // Gestionnaire de modification des paramètres de projection
  const handleProjectionChange = (field: keyof ExpenseProjection, value: number) => {
    // Marquer l'édition manuelle et la débouncer
    setIsManualEdit(true);
    if (onManualEdit) onManualEdit(true);
    if (manualEditTimerRef.current) {
      window.clearTimeout(manualEditTimerRef.current);
    }
    const updatedProjection = {
      ...investment.expenseProjection,
      [field]: value
    };

    // Recalculer les projections pour toutes les années futures
    const updatedExpenses = [...investment.expenses];

    // S'assurer que la ligne de l'année de référence reflète la base
    upsertExpenseForYear(updatedExpenses, referenceYear, {
      ...updatedProjection.baseYear
    });

    for (let year = referenceYear + 1; year <= years.endYear; year++) {
      const yearsAhead = year - referenceYear;
      
      const projectedValues = {
        propertyTax: calculateProjectedValue(
          updatedProjection.baseYear.propertyTax,
          field === 'propertyTaxIncrease' ? value : updatedProjection.propertyTaxIncrease,
          yearsAhead
        ),
        condoFees: calculateProjectedValue(
          updatedProjection.baseYear.condoFees,
          field === 'condoFeesIncrease' ? value : updatedProjection.condoFeesIncrease,
          yearsAhead
        ),
        propertyInsurance: calculateProjectedValue(
          updatedProjection.baseYear.propertyInsurance,
          field === 'propertyInsuranceIncrease' ? value : updatedProjection.propertyInsuranceIncrease,
          yearsAhead
        ),
        managementFees: calculateProjectedValue(
          updatedProjection.baseYear.managementFees,
          field === 'managementFeesIncrease' ? value : updatedProjection.managementFeesIncrease,
          yearsAhead
        ),
        unpaidRentInsurance: calculateProjectedValue(
          updatedProjection.baseYear.unpaidRentInsurance,
          field === 'unpaidRentInsuranceIncrease' ? value : updatedProjection.unpaidRentInsuranceIncrease,
          yearsAhead
        ),
        repairs: calculateProjectedValue(
          updatedProjection.baseYear.repairs,
          field === 'repairsIncrease' ? value : updatedProjection.repairsIncrease,
          yearsAhead
        ),
        otherDeductible: calculateProjectedValue(
          updatedProjection.baseYear.otherDeductible,
          field === 'otherDeductibleIncrease' ? value : updatedProjection.otherDeductibleIncrease,
          yearsAhead
        ),
        otherNonDeductible: calculateProjectedValue(
          updatedProjection.baseYear.otherNonDeductible,
          field === 'otherNonDeductibleIncrease' ? value : updatedProjection.otherNonDeductibleIncrease,
          yearsAhead
        ),
        rent: calculateProjectedValue(
          updatedProjection.baseYear.rent,
          field === 'rentIncrease' ? value : updatedProjection.rentIncrease,
          yearsAhead
        ),
        furnishedRent: calculateProjectedValue(
          updatedProjection.baseYear.furnishedRent,
          field === 'furnishedRentIncrease' ? value : updatedProjection.furnishedRentIncrease,
          yearsAhead
        ),
        tenantCharges: calculateProjectedValue(
          updatedProjection.baseYear.tenantCharges,
          field === 'tenantChargesIncrease' ? value : updatedProjection.tenantChargesIncrease,
          yearsAhead
        ),
        taxBenefit: calculateProjectedValue(
          updatedProjection.baseYear.taxBenefit,
          field === 'taxBenefitIncrease' ? value : updatedProjection.taxBenefitIncrease,
          yearsAhead
        )
      };

      const expenseIndex = updatedExpenses.findIndex(e => e.year === year);
      if (expenseIndex === -1) {
        updatedExpenses.push({
          year,
          ...projectedValues,
          tax: 0,
          deficit: 0,
          loanPayment: 0,
          loanInsurance: 0,
          interest: 0
        });
      } else {
        updatedExpenses[expenseIndex] = {
          ...updatedExpenses[expenseIndex],
          ...projectedValues
        };
      }
    }

    onUpdate({
      ...investment,
      expenseProjection: updatedProjection,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });

    // Recalculer les données historiques si l'option est activée, après un court délai sans saisie
    if (autoCalculateHistorical) {
      manualEditTimerRef.current = window.setTimeout(() => {
        setIsManualEdit(false);
        if (onManualEdit) onManualEdit(false);
        calculateAllHistoricalData();
      }, 800);
    } else {
      manualEditTimerRef.current = window.setTimeout(() => {
        setIsManualEdit(false);
        if (onManualEdit) onManualEdit(false);
      }, 800);
    }
  };

  // Initialiser l'année de référence
  useEffect(() => {
    if (investment.expenseProjection.baseYear) {
      // Trouver l'année correspondant aux valeurs de base actuelles
      const baseYearData = investment.expenses.find(e => 
        e.propertyTax === investment.expenseProjection.baseYear.propertyTax &&
        e.condoFees === investment.expenseProjection.baseYear.condoFees &&
        e.propertyInsurance === investment.expenseProjection.baseYear.propertyInsurance
      );
      if (baseYearData) {
        setReferenceYear(baseYearData.year);
      }
    }
  }, [investment.expenseProjection.baseYear, investment.expenses]);

  // Synchroniser l'état d'édition manuelle
  useEffect(() => {
    if (onManualEdit) {
      onManualEdit(isManualEdit);
    }
  }, [isManualEdit, onManualEdit]);

  // Fonction pour gérer l'édition manuelle
  const handleManualEdit = (isEditing: boolean) => {
    setIsManualEdit(isEditing);
  };

  // Rendu du formulaire des frais
  const renderExpensesForm = () => (
    <div className="space-y-3">
      {/* Sélection de l'année de référence */}
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
          <Calendar className="mr-1 h-4 w-4 text-blue-600" />
          Année de référence
        </label>
        <select
          value={referenceYear}
          onChange={(e) => handleReferenceYearChange(Number(e.target.value))}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
          disabled
          aria-readonly="true"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Option de calcul automatique des données historiques */}
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
          <TrendingUp className="mr-1 h-4 w-4 text-green-600" />
          Calcul automatique historique
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={autoCalculateHistorical}
            onChange={(e) => {
              setAutoCalculateHistorical(e.target.checked);
              if (e.target.checked && !isManualEdit) {
                calculateAllHistoricalData();
              }
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Activé</span>
        </div>
      </div>

      {/* Bouton pour recalculer manuellement */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={calculateAllHistoricalData}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Recalculer l'historique
        </button>
      </div>

      {/* Valeurs de référence pour les frais */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h4 className="text-md font-semibold text-gray-900">Valeurs de référence ({referenceYear})</h4>
        </div>
        
        <div className="space-y-3">
          {/* Taxe foncière */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Taxe foncière
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('propertyTax')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'propertyTax' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.propertyTax}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.propertyTax || ''}
              onChange={(e) => handleBaseYearChange('propertyTax', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Charges copropriété */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Charges copropriété
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('condoFees')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'condoFees' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.condoFees}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.condoFees || ''}
              onChange={(e) => handleBaseYearChange('condoFees', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Assurance propriétaire */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Assurance propriétaire
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('propertyInsurance')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'propertyInsurance' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.propertyInsurance}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.propertyInsurance || ''}
              onChange={(e) => handleBaseYearChange('propertyInsurance', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Frais d'agence */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Frais d'agence
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('managementFees')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'managementFees' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.managementFees}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.managementFees || ''}
              onChange={(e) => handleBaseYearChange('managementFees', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Assurance loyers impayés */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Assurance loyers impayés
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('unpaidRentInsurance')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'unpaidRentInsurance' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.unpaidRentInsurance}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.unpaidRentInsurance || ''}
              onChange={(e) => handleBaseYearChange('unpaidRentInsurance', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Travaux */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Travaux
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('repairs')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'repairs' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.repairs}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.repairs || ''}
              onChange={(e) => handleBaseYearChange('repairs', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Autres déductibles */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Autres déductibles
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('otherDeductible')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'otherDeductible' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.otherDeductible}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.otherDeductible || ''}
              onChange={(e) => handleBaseYearChange('otherDeductible', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Autres non déductibles */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Autres non déductibles
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('otherNonDeductible')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'otherNonDeductible' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.otherNonDeductible}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.otherNonDeductible || ''}
              onChange={(e) => handleBaseYearChange('otherNonDeductible', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>
        </div>
      </div>

      {/* Paramètres de projection */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h4 className="text-md font-semibold text-gray-900">Paramètres de projection</h4>
        </div>
        
        <div className="space-y-3">
          {/* Taxe foncière */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Taxe foncière (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.propertyTaxIncrease}
              onChange={(e) => handleProjectionChange('propertyTaxIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Charges copropriété */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Charges copropriété (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.condoFeesIncrease}
              onChange={(e) => handleProjectionChange('condoFeesIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Assurance propriétaire */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Assurance propriétaire (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.propertyInsuranceIncrease}
              onChange={(e) => handleProjectionChange('propertyInsuranceIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Frais d'agence */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Frais d'agence (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.managementFeesIncrease}
              onChange={(e) => handleProjectionChange('managementFeesIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Assurance loyers impayés */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Assurance loyers impayés (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.unpaidRentInsuranceIncrease}
              onChange={(e) => handleProjectionChange('unpaidRentInsuranceIncrease', Number(e.target.value))}
              className="w-24 flex-none px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Travaux */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Travaux (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.repairsIncrease}
              onChange={(e) => handleProjectionChange('repairsIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Autres déductibles */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Autres déductibles (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.otherDeductibleIncrease}
              onChange={(e) => handleProjectionChange('otherDeductibleIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Autres non déductibles */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Autres non déductibles (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.otherNonDeductibleIncrease}
              onChange={(e) => handleProjectionChange('otherNonDeductibleIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Rendu du formulaire des revenus
  const renderRevenuesForm = () => (
    <div className="space-y-3">
      {/* Sélection de l'année de référence */}
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
          <Calendar className="mr-1 h-4 w-4 text-blue-600" />
          Année de référence
        </label>
        <select
          value={referenceYear}
          onChange={(e) => handleReferenceYearChange(Number(e.target.value))}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
          disabled
          aria-readonly="true"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Option de calcul automatique des données historiques */}
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
          <TrendingUp className="mr-1 h-4 w-4 text-green-600" />
          Calcul automatique historique
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={autoCalculateHistorical}
            onChange={(e) => {
              setAutoCalculateHistorical(e.target.checked);
              if (e.target.checked) {
                calculateAllHistoricalData();
              }
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Activé</span>
        </div>
      </div>

      {/* Bouton pour recalculer manuellement */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={calculateAllHistoricalData}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Recalculer l'historique
        </button>
      </div>

      {/* Valeurs de référence pour les revenus */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h4 className="text-md font-semibold text-gray-900">Valeurs de référence ({referenceYear})</h4>
        </div>
        
        <div className="space-y-3">
          {/* Loyer nu */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Loyer nu
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('rent')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'rent' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.rent}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.rent || ''}
              onChange={(e) => handleBaseYearChange('rent', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Loyer meublé */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Loyer meublé
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('furnishedRent')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'furnishedRent' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.furnishedRent}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.furnishedRent || ''}
              onChange={(e) => handleBaseYearChange('furnishedRent', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Aide fiscale */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Aide fiscale
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('taxBenefit')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'taxBenefit' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.taxBenefit}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.taxBenefit || ''}
              onChange={(e) => handleBaseYearChange('taxBenefit', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Charges locataire */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Charges locataire
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('tenantCharges')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'tenantCharges' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                {tooltips.tenantCharges}
              </div>
            )}
            <input
              type="number"
              value={investment.expenseProjection.baseYear.tenantCharges || ''}
              onChange={(e) => handleBaseYearChange('tenantCharges', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Pourcentage de vacance locative */}
          <div className="relative group flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex items-center flex-shrink-0">
              Vacance locative (%)
              <HelpCircle 
                className="ml-1 h-4 w-4 text-gray-400 cursor-help" 
                onMouseEnter={() => setHoveredField('vacancyRate')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </label>
            {hoveredField === 'vacancyRate' && (
              <div className="absolute left-0 top-8 z-10 bg-gray-900 text-white text-xs rounded-lg p-2 w-64">
                Pourcentage de vacance locative du bien. Ce pourcentage sera appliqué aux totaux nu et meublé pour calculer les revenus réels.
              </div>
            )}
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={investment.expenseProjection.vacancyRate || ''}
              onChange={(e) => handleProjectionChange('vacancyRate', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>
        </div>
      </div>

      {/* Paramètres de projection */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h4 className="text-md font-semibold text-gray-900">Paramètres de projection</h4>
        </div>
        
        <div className="space-y-3">
          {/* Loyer nu */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Loyer nu (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.rentIncrease}
              onChange={(e) => handleProjectionChange('rentIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Loyer meublé */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Loyer meublé (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.furnishedRentIncrease}
              onChange={(e) => handleProjectionChange('furnishedRentIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Aide fiscale */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Aide fiscale (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.taxBenefitIncrease}
              onChange={(e) => handleProjectionChange('taxBenefitIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          {/* Charges locataire */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">
              Charges locataire (%/an)
            </label>
            <input
              type="number"
              step="0.1"
              value={investment.expenseProjection.tenantChargesIncrease}
              onChange={(e) => handleProjectionChange('tenantChargesIncrease', Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const subTabs = [
    { id: 'revenus', label: 'Revenus', icon: FaChartPie },
    { id: 'frais', label: 'Frais', icon: FaMoneyBillWave }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Onglets Revenus/Frais dans la sidebar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex">
          {subTabs.map((subTab) => {
            const isSelected = subTab.id === currentSubTab;
            return (
              <button
                key={subTab.id}
                type="button"
                onClick={() => {
                  if (onSubTabChange) {
                    onSubTabChange(subTab.id as 'revenus' | 'frais');
                  }
                }}
                className={`
                  flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm cursor-pointer
                  transition-colors duration-200 flex items-center justify-center gap-2
                  ${isSelected
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                <subTab.icon className="h-4 w-4" />
                {subTab.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="space-y-3">
        {currentSubTab === 'frais' ? renderExpensesForm() : renderRevenuesForm()}
      </div>
    </div>
  );
}
