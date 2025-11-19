import { 
  FaHome, 
  FaKey, 
  FaCalculator, 
  FaChartLine, 
  FaChartBar,
  FaMoneyBillWave,
  FaChartPie
} from 'react-icons/fa';
import { useEffect, useState } from 'react';
import AcquisitionDetails from './AcquisitionDetails';
import { TaxRegime, Investment } from '../types/investment';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';
import { generateAmortizationSchedule } from '../utils/calculations';
import { getLoanInfoForYear, getYearCoverage, adjustForCoverage } from '../utils/propertyCalculations';
import SCITaxSidebar from './SCITaxSidebar';
import { Brain, X } from 'lucide-react';
import { processUserMessageWithMistral } from '../services/mistral';
import { processUserMessage } from '../services/openai';
import { saveTargetSaleYear, saveTargetGain, saveTargetCashflow } from '../lib/api';
import TotalGainGoal from './TotalGainGoal';
import CashFlowGoal from './CashFlowGoal';
import IRRSummary from './IRRSummary';
import SCIIRRSummary from './SCIIRRSummary';

type MainTab = 'acquisition' | 'location' | 'imposition' | 'rentabilite' | 'bilan';

interface SidebarContentProps {
  currentMainTab: MainTab;
  currentSubTab?: string;
  investmentData?: any;
  metrics?: any;
  onInvestmentUpdate?: (field: any, value: any) => void;
  propertyId?: string;
  onTabChange?: (mainTab: MainTab, subTab?: string) => void;
  objectiveType?: 'revente' | 'cashflow';
  objectiveYear?: number;
  objectiveTargetGain?: number;
  objectiveTargetCashflow?: number;
  onObjectiveTypeChange?: (type: 'revente' | 'cashflow') => void;
  onObjectiveYearChange?: (year: number) => void;
  onObjectiveTargetGainChange?: (gain: number) => void;
  onObjectiveTargetCashflowChange?: (cashflow: number) => void;
}

const tabConfigs = [
  { id: 'acquisition' as MainTab, label: 'Projet', icon: FaHome },
  { id: 'location' as MainTab, label: 'Location', icon: FaKey },
  { id: 'imposition' as MainTab, label: 'Imposition', icon: FaCalculator },
  { id: 'rentabilite' as MainTab, label: 'Rentabilité', icon: FaChartLine },
  { id: 'bilan' as MainTab, label: 'Bilan', icon: FaChartBar },
];

export default function SidebarContent({ currentMainTab, currentSubTab, investmentData, metrics, onInvestmentUpdate, propertyId, onTabChange, objectiveType: externalObjectiveType, objectiveYear: externalObjectiveYear, objectiveTargetGain: externalObjectiveTargetGain, objectiveTargetCashflow: externalObjectiveTargetCashflow, onObjectiveTypeChange, onObjectiveYearChange, onObjectiveTargetGainChange, onObjectiveTargetCashflowChange }: SidebarContentProps) {
  const currentConfig = tabConfigs.find(tab => tab.id === currentMainTab);

  if (!currentConfig) return null;

  // Utilitaires d'affichage
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const isCashflowView = currentMainTab === 'rentabilite' && currentSubTab === 'cashflow';
  const isReventeView = currentMainTab === 'rentabilite' && currentSubTab === 'revente';

  // Identifiant et états partagés (utilisés pour Revente)
  const investmentId = `${investmentData?.purchasePrice || 0}_${investmentData?.startDate || ''}`;
  type SaleParameters = { annualIncrease: number; agencyFees: number; earlyRepaymentFees: number };
  const [saleParams, setSaleParams] = useState<SaleParameters>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`saleParameters_${investmentId}`) : null;
    return stored ? JSON.parse(stored) : { annualIncrease: 2, agencyFees: 0, earlyRepaymentFees: 0 };
  });

  // États pour le formulaire Objectif (utiliser les props si fournies, sinon état local)
  const [localObjectiveType, setLocalObjectiveType] = useState<'revente' | 'cashflow'>('revente');
  const [localObjectiveYear, setLocalObjectiveYear] = useState<number>(() => {
    // Priorité 1: investment_data.targetSaleYear (base de données)
    if (investmentData?.targetSaleYear) {
      return investmentData.targetSaleYear;
    }
    // Priorité 2: localStorage
    const investmentId = `${investmentData?.startDate || ''}`;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`targetSaleYear_${investmentId}`) : null;
    if (stored) return Number(stored);
    // Priorité 3: valeur par défaut
    if (!investmentData?.projectStartDate) return new Date().getFullYear() + 10;
    const startYear = new Date(investmentData.projectStartDate).getFullYear();
    return startYear + 10;
  });
  const [localObjectiveTargetGain, setLocalObjectiveTargetGain] = useState<number>(() => {
    // Priorité 1: investment_data.targetGain (base de données)
    if (investmentData?.targetGain !== undefined) {
      return investmentData.targetGain;
    }
    // Priorité 2: localStorage
    const investmentId = `${investmentData?.startDate || ''}`;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`targetGain_${investmentId}`) : null;
    if (stored) return Number(stored);
    // Priorité 3: valeur par défaut
    return 50000;
  });
  const [localObjectiveTargetCashflow, setLocalObjectiveTargetCashflow] = useState<number>(() => {
    // Priorité 1: investment_data.targetCashflow (base de données)
    if (investmentData?.targetCashflow !== undefined) {
      return investmentData.targetCashflow;
    }
    // Priorité 2: localStorage
    const investmentId = `${investmentData?.startDate || ''}`;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`targetCashflow_${investmentId}`) : null;
    if (stored) return Number(stored);
    // Priorité 3: valeur par défaut
    return 10000;
  });

  const objectiveType = externalObjectiveType !== undefined ? externalObjectiveType : localObjectiveType;
  const objectiveYear = externalObjectiveYear !== undefined ? externalObjectiveYear : localObjectiveYear;
  const objectiveTargetGain = externalObjectiveTargetGain !== undefined ? externalObjectiveTargetGain : localObjectiveTargetGain;
  const objectiveTargetCashflow = externalObjectiveTargetCashflow !== undefined ? externalObjectiveTargetCashflow : localObjectiveTargetCashflow;

  // Synchroniser localObjectiveYear avec investment_data.targetSaleYear quand il change
  useEffect(() => {
    if (investmentData?.targetSaleYear !== undefined) {
      setLocalObjectiveYear(investmentData.targetSaleYear);
      const investmentId = `${investmentData?.startDate || ''}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(`targetSaleYear_${investmentId}`, String(investmentData.targetSaleYear));
      }
    }
  }, [investmentData?.targetSaleYear, investmentData?.startDate]);

  // Synchroniser localObjectiveTargetGain avec investment_data.targetGain quand il change
  useEffect(() => {
    if (investmentData?.targetGain !== undefined) {
      setLocalObjectiveTargetGain(investmentData.targetGain);
      const investmentId = `${investmentData?.startDate || ''}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(`targetGain_${investmentId}`, String(investmentData.targetGain));
      }
    }
  }, [investmentData?.targetGain, investmentData?.startDate]);

  // Synchroniser localObjectiveTargetCashflow avec investment_data.targetCashflow quand il change
  useEffect(() => {
    if (investmentData?.targetCashflow !== undefined) {
      setLocalObjectiveTargetCashflow(investmentData.targetCashflow);
      const investmentId = `${investmentData?.startDate || ''}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(`targetCashflow_${investmentId}`, String(investmentData.targetCashflow));
      }
    }
  }, [investmentData?.targetCashflow, investmentData?.startDate]);

  const handleObjectiveTypeChange = async (type: 'revente' | 'cashflow') => {
    if (onObjectiveTypeChange) {
      onObjectiveTypeChange(type);
    } else {
      setLocalObjectiveType(type);
    }
    
    // Si on passe en mode "revente", sauvegarder l'année dans la base de données
    if (type === 'revente' && propertyId) {
      await saveTargetSaleYear(propertyId, objectiveYear);
    }
  };

  const handleObjectiveYearChange = async (year: number) => {
    if (onObjectiveYearChange) {
      onObjectiveYearChange(year);
    } else {
      setLocalObjectiveYear(year);
    }
    
    // Si on est dans le mode "revente", sauvegarder l'année dans la base de données
    if (objectiveType === 'revente' && propertyId) {
      await saveTargetSaleYear(propertyId, year);
    }
  };

  const handleObjectiveTargetGainChange = async (gain: number) => {
    if (onObjectiveTargetGainChange) {
      onObjectiveTargetGainChange(gain);
    } else {
      setLocalObjectiveTargetGain(gain);
    }
    
    // Sauvegarder dans localStorage
    const investmentId = `${investmentData?.startDate || ''}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`targetGain_${investmentId}`, String(gain));
    }
    
    // Mettre à jour le state parent
    if (onInvestmentUpdate) {
      onInvestmentUpdate('targetGain', gain);
    }
    
    // Sauvegarder dans la base de données si propertyId est disponible
    if (propertyId) {
      await saveTargetGain(propertyId, gain);
    }
  };

  const handleObjectiveTargetCashflowChange = async (cashflow: number) => {
    if (onObjectiveTargetCashflowChange) {
      onObjectiveTargetCashflowChange(cashflow);
    } else {
      setLocalObjectiveTargetCashflow(cashflow);
    }
    
    // Sauvegarder dans localStorage
    const investmentId = `${investmentData?.startDate || ''}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`targetCashflow_${investmentId}`, String(cashflow));
    }
    
    // Mettre à jour le state parent
    if (onInvestmentUpdate) {
      onInvestmentUpdate('targetCashflow', cashflow);
    }
    
    // Sauvegarder dans la base de données si propertyId est disponible
    if (propertyId) {
      await saveTargetCashflow(propertyId, cashflow);
    }
  };
  // Récupérer le régime depuis localStorage (synchronisé avec les onglets de BalanceDisplay)
  // On lit directement depuis localStorage à chaque rendu pour éviter les décalages
  const getSelectedRegime = (): TaxRegime => {
    if (typeof window === 'undefined') return 'micro-foncier';
    const regime = localStorage.getItem(`selectedRegime_${investmentId}`) || 'micro-foncier';
    return regime as TaxRegime;
  };
  
  // État pour forcer le re-render quand le localStorage change
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(getSelectedRegime);
  const [selectedRentalTypeSCI, setSelectedRentalTypeSCI] = useState<'unfurnished' | 'furnished'>('unfurnished');
  
  // Synchroniser avec les changements dans localStorage (quand l'onglet change dans BalanceDisplay)
  useEffect(() => {
    // Vérifier périodiquement les changements du localStorage
    const interval = setInterval(() => {
      const currentRegimeValue = getSelectedRegime();
      if (currentRegimeValue !== selectedRegime) {
        setSelectedRegime(currentRegimeValue);
      }
      // Pour SCI : vérifier le type de location
      if (investmentData?.sciId) {
        const stored = localStorage.getItem(`selectedRentalType_${investmentId}`);
        if (stored && stored !== selectedRentalTypeSCI) {
          setSelectedRentalTypeSCI(stored as 'unfurnished' | 'furnished');
        }
      }
    }, 200); // Vérifier toutes les 200ms
    
    return () => clearInterval(interval);
  }, [investmentId, selectedRegime, selectedRentalTypeSCI, investmentData]);
  
  const [selectedSaleYear, setSelectedSaleYear] = useState<number>(() => {
    if (!investmentData?.projectStartDate) return new Date().getFullYear() + 10;
    const startYear = new Date(investmentData.projectStartDate).getFullYear();
    return startYear + 10; // 10 ans après la date de début du projet
  });
  const [saleYears, setSaleYears] = useState<number[]>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`saleYears_${investmentId}`) : null;
    if (stored) return JSON.parse(stored);
    const startYear = investmentData?.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
    const endYear = investmentData?.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  });
  const [targetSaleYear, setTargetSaleYear] = useState<number>(() => {
    // Priorité 1: investment_data.targetSaleYear (base de données)
    if (investmentData?.targetSaleYear) {
      return investmentData.targetSaleYear;
    }
    // Priorité 2: localStorage
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`targetSaleYear_${investmentId}`) : null;
    if (stored) return Number(stored);
    // Priorité 3: dernière année disponible ou année courante
    return saleYears[saleYears.length - 1] || new Date().getFullYear();
  });

  // Synchroniser avec investment_data.targetSaleYear quand il change
  useEffect(() => {
    if (investmentData?.targetSaleYear !== undefined && investmentData.targetSaleYear !== targetSaleYear) {
      setTargetSaleYear(investmentData.targetSaleYear);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`targetSaleYear_${investmentId}`, String(investmentData.targetSaleYear));
      }
    }
  }, [investmentData?.targetSaleYear, investmentId]);
  const [targetBalance, setTargetBalance] = useState<number>(0);

  // États pour la popup d'analyse IA
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Effets de synchronisation (écoute des mises à jour depuis la page centrale)
  useEffect(() => {
    const stored = localStorage.getItem(`saleParameters_${investmentId}`);
    if (stored) setSaleParams(JSON.parse(stored));
  }, [investmentId]);

  useEffect(() => {
    const onSelectedRegime = (e: any) => {
      if (e?.detail?.investmentId === investmentId) {
        setSelectedRegime(localStorage.getItem(`selectedRegime_${investmentId}`) || 'micro-foncier');
      }
    };
    const onBalancesUpdated = (e: any) => {
      if (e?.detail?.investmentId === investmentId) {
        const yearsStr = localStorage.getItem(`saleYears_${investmentId}`);
        if (yearsStr) setSaleYears(JSON.parse(yearsStr));
        updateTargetBalance(targetSaleYear);
      }
    };
    window.addEventListener('selectedRegimeUpdated', onSelectedRegime as EventListener);
    window.addEventListener('balancesUpdated', onBalancesUpdated as EventListener);
    return () => {
      window.removeEventListener('selectedRegimeUpdated', onSelectedRegime as EventListener);
      window.removeEventListener('balancesUpdated', onBalancesUpdated as EventListener);
    };
  }, [investmentId, targetSaleYear]);

  useEffect(() => {
    updateTargetBalance(targetSaleYear);
  }, [selectedRegime, targetSaleYear, investmentId]);

  const updateTargetBalance = (year: number) => {
    try {
      const key = `balances_${investmentId}_${selectedRegime}`;
      const data = localStorage.getItem(key);
      if (data) {
        const map = JSON.parse(data) as Record<string, number>;
        setTargetBalance(map[year] ?? 0);
      }
    } catch {}
  };

  // Calcul du cashflow (sans imposition) pour une année donnée selon un type de location
  const calculateYearCashFlow = (year: number, type: 'nu' | 'meuble') => {
    if (!investmentData?.expenses) return 0;
    const expense = investmentData.expenses.find((e: any) => e.year === year);
    if (!expense) return 0;

    const investment = investmentData as Investment;
    
    // Calculer le prorata temporel de l'année
    const coverage = getYearCoverage(investment, year);
    
    /**
     * Ajuste une valeur selon le prorata temporel
     */
    const adjustForCoverage = (value: number): number => {
      return value * coverage;
    };

    // Revenus avec prorata
    const rent = adjustForCoverage(Number(expense.rent || 0));
    const furnishedRent = adjustForCoverage(Number(expense.furnishedRent || 0));
    const tenantCharges = adjustForCoverage(Number(expense.tenantCharges || 0));
    const taxBenefit = adjustForCoverage(Number(expense.taxBenefit || 0));

    const revenues = type === 'meuble'
      ? furnishedRent + tenantCharges
      : rent + taxBenefit + tenantCharges;

    // Charges de gestion avec prorata
    const managementExpenses =
      adjustForCoverage(Number(expense.propertyTax || 0)) +
      adjustForCoverage(Number(expense.condoFees || 0)) +
      adjustForCoverage(Number(expense.propertyInsurance || 0)) +
      adjustForCoverage(Number(expense.managementFees || 0)) +
      adjustForCoverage(Number(expense.unpaidRentInsurance || 0)) +
      adjustForCoverage(Number(expense.repairs || 0)) +
      adjustForCoverage(Number(expense.otherDeductible || 0)) +
      adjustForCoverage(Number(expense.otherNonDeductible || 0));

    // Coûts du prêt calculés dynamiquement (prorata automatique)
    const loanInfo = getLoanInfoForYear(investment, year);
    const loanCosts = loanInfo.payment + loanInfo.insurance;

    const totalExpenses = managementExpenses + loanCosts;

    return revenues - totalExpenses;
  };

  // Fonction helper pour calculer les valeurs de balance pour une année donnée
  const calculateBalanceForYear = (year: number, regime: TaxRegime) => {
    if (!investmentData) return null;

    const startYear = new Date(investmentData.projectStartDate).getFullYear();
    const endYear = new Date(investmentData.projectEndDate).getFullYear();
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    
    if (year < startYear || year > endYear) return null;

    // Calculer les résultats fiscaux pour toutes les années jusqu'à l'année sélectionnée
    // Ne calculer que pour les années qui ont des dépenses
    const yearlyResults: Record<number, Record<TaxRegime, any>> = {};
    years.forEach(yr => {
      if (yr > year) return;
      
      const yearExpense = investmentData.expenses?.find((e: any) => e.year === yr);
      
      // Si pas de dépenses pour cette année, utiliser des résultats fiscaux vides
      if (!yearExpense) {
        // Utiliser les résultats de l'année précédente ou des résultats vides
        if (yr === startYear) {
          // Pour la première année sans dépenses, créer des résultats vides
          yearlyResults[yr] = {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        } else {
          // Répéter les résultats de l'année précédente
          yearlyResults[yr] = yearlyResults[yr - 1] || {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        }
        return;
      }
      
      // Calculer les résultats fiscaux uniquement si des dépenses existent
      try {
        if (yr === startYear) {
          yearlyResults[yr] = calculateAllTaxRegimes(investmentData as Investment, yr);
        } else {
          yearlyResults[yr] = calculateAllTaxRegimes(investmentData as Investment, yr, yearlyResults[yr - 1]);
        }
      } catch (error) {
        // En cas d'erreur, utiliser les résultats de l'année précédente ou des résultats vides
        console.warn(`Erreur lors du calcul fiscal pour l'année ${yr}:`, error);
        yearlyResults[yr] = yearlyResults[yr - 1] || {
          'micro-foncier': { totalTax: 0 },
          'reel-foncier': { totalTax: 0 },
          'micro-bic': { totalTax: 0 },
          'reel-bic': { totalTax: 0 }
        } as Record<TaxRegime, any>;
      }
    });

    // Calculer les valeurs cumulées jusqu'à l'année sélectionnée
    let cumulativeCashFlowBeforeTax = 0;
    let cumulativeTax = 0;
    let cumulativeCashFlowNet = 0;

    years.forEach((yr, i) => {
      if (yr > year) return;
      
      const yearExpense = investmentData.expenses?.find((e: any) => e.year === yr);
      if (!yearExpense) return;

      // Calcul des revenus selon le régime
      const rent = Number(yearExpense.rent || 0);
      const furnishedRent = Number(yearExpense.furnishedRent || 0);
      const tenantCharges = Number(yearExpense.tenantCharges || 0);
      const taxBenefit = Number(yearExpense.taxBenefit || 0);
      
      const revenues = (regime === 'micro-bic' || regime === 'reel-bic')
        ? furnishedRent + tenantCharges
        : rent + taxBenefit + tenantCharges;

      // Total des dépenses
      const expenses = 
        Number(yearExpense.propertyTax || 0) +
        Number(yearExpense.condoFees || 0) +
        Number(yearExpense.propertyInsurance || 0) +
        Number(yearExpense.managementFees || 0) +
        Number(yearExpense.unpaidRentInsurance || 0) +
        Number(yearExpense.repairs || 0) +
        Number(yearExpense.otherDeductible || 0) +
        Number(yearExpense.otherNonDeductible || 0) +
        Number(yearExpense.loanPayment || 0) +
        Number(yearExpense.loanInsurance || 0);

      // Cash flow SANS imposition
      const annualCashFlowBeforeTax = revenues - expenses;
      
      // Imposition
      const taxation = yearlyResults[yr]?.[regime]?.totalTax || 0;
      cumulativeTax += taxation;
      
      // Cash flow NET (avec imposition)
      const annualCashFlowNet = annualCashFlowBeforeTax - taxation;
      
      cumulativeCashFlowBeforeTax += annualCashFlowBeforeTax;
      cumulativeCashFlowNet += annualCashFlowNet;
    });

    // Calculer le solde de revente pour l'année sélectionnée
    const yearsSincePurchase = year - startYear;
    const revaluedValue = Number(investmentData.purchasePrice) * Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase);
    const netSellingPrice = revaluedValue - Number(saleParams.agencyFees);

    // Calculer le capital restant dû
    const amortizationSchedule = generateAmortizationSchedule(
      Number(investmentData.loanAmount),
      Number(investmentData.interestRate),
      Number(investmentData.loanDuration),
      investmentData.deferralType,
      Number(investmentData.deferredPeriod),
      investmentData.startDate
    );

    const yearEndDate = new Date(year, 11, 31);
    const lastPayment = amortizationSchedule.schedule
      .filter(row => new Date(row.date) <= yearEndDate)
      .pop();

    const remainingBalance = lastPayment ? lastPayment.remainingBalance : Number(investmentData.loanAmount);
    const totalDebt = remainingBalance + Number(saleParams.earlyRepaymentFees);
    const saleBalance = netSellingPrice - totalDebt;

    // Calculer l'impôt sur la plus-value (simplifié - même logique que dans BalanceDisplay)
    const purchasePrice = Number(investmentData.purchasePrice) || 0;
    const acquisitionFees = (Number(investmentData.notaryFees) || 0) + (Number(investmentData.agencyFees) || 0);
    const improvementWorks = Number(investmentData.improvementWorks) || 0;
    const correctedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
    const grossCapitalGain = netSellingPrice - correctedPurchasePrice;
    
    let capitalGainTax = 0;
    if (grossCapitalGain > 0) {
      const holdingPeriodYears = year - startYear;
      let irDiscount = 0;
      if (holdingPeriodYears > 5) {
        if (holdingPeriodYears <= 21) {
          irDiscount = Math.min(1, (holdingPeriodYears - 5) * 0.06);
        } else {
          irDiscount = 1;
        }
      }
      
      let socialDiscount = 0;
      if (holdingPeriodYears > 5) {
        if (holdingPeriodYears <= 21) {
          socialDiscount = (holdingPeriodYears - 5) * 0.0165;
        } else if (holdingPeriodYears <= 30) {
          socialDiscount = (16 * 0.0165) + 0.016 + Math.min(8, holdingPeriodYears - 22) * 0.09;
        } else {
          socialDiscount = 1;
        }
      }
      
      const taxableCapitalGainIR = grossCapitalGain * (1 - irDiscount);
      const taxableCapitalGainSocial = grossCapitalGain * (1 - socialDiscount);
      const incomeTax = taxableCapitalGainIR * 0.19;
      const socialCharges = taxableCapitalGainSocial * 0.172;
      capitalGainTax = incomeTax + socialCharges;
      
      // Traitement spécial pour LMNP
      if (regime === 'micro-bic' || regime === 'reel-bic') {
        const isLMP = investmentData.isLMP || false;
        const businessTaxRate = Number(investmentData.taxParameters?.taxRate) || 30;
        const accumulatedDepreciation = Number(investmentData.accumulatedDepreciation) || 0;
        
        if (isLMP) {
          if (holdingPeriodYears <= 2) {
            capitalGainTax = grossCapitalGain * (businessTaxRate / 100);
          } else {
            const shortTermGain = Math.min(accumulatedDepreciation, grossCapitalGain);
            const longTermGain = Math.max(0, grossCapitalGain - shortTermGain);
            capitalGainTax = shortTermGain * (businessTaxRate / 100) + longTermGain * 0.128 + longTermGain * 0.172;
          }
        } else if (regime === 'reel-bic' && accumulatedDepreciation > 0) {
          const depreciationTaxable = Math.min(accumulatedDepreciation, grossCapitalGain);
          const depreciationTax = depreciationTaxable * (businessTaxRate / 100);
          capitalGainTax = incomeTax + socialCharges + depreciationTax;
        }
      }
    }

    // Gain total cumulé
    const downPayment = Number(investmentData.downPayment) || 0;
    const totalGain = cumulativeCashFlowNet + saleBalance - capitalGainTax - downPayment;

    return {
      year,
      downPayment,
      cumulativeCashFlowBeforeTax,
      cumulativeTax,
      saleBalance,
      capitalGainTax,
      totalGain
    };
  };

  // Fonction pour calculer le bilan pour un bien en SCI
  const calculateBalanceForYearSCI = (year: number, rentalType: 'unfurnished' | 'furnished') => {
    if (!investmentData) return null;

    const startYear = new Date(investmentData.projectStartDate).getFullYear();
    
    // Cash flow cumulé AVANT IS
    let cumulativeCashFlowBeforeTax = 0;
    let cumulativeTax = 0; // IS calculé au niveau SCI, donc 0 ici

    // Parcourir toutes les années jusqu'à l'année sélectionnée
    Array.from({ length: year - startYear + 1 }, (_, i) => startYear + i).forEach(yr => {
      const yearExpense = investmentData.expenses.find(e => e.year === yr);
      if (!yearExpense) return;

      // Calculer le prorata temporel de l'année
      const coverage = getYearCoverage(investmentData as Investment, yr);
      const adjustForCoverage = (value: number) => value * coverage;

      // Revenus avec prorata
      const revenues = rentalType === 'furnished'
        ? adjustForCoverage(Number(yearExpense.furnishedRent || 0))
        : adjustForCoverage(Number(yearExpense.rent || 0));

      const taxBenefit = rentalType === 'unfurnished' 
        ? adjustForCoverage(Number(yearExpense.taxBenefit || 0))
        : 0;

      const tenantCharges = adjustForCoverage(Number(yearExpense.tenantCharges || 0));

      // Charges avec prorata
      const charges =
        adjustForCoverage(Number(yearExpense.propertyTax || 0)) +
        adjustForCoverage(Number(yearExpense.condoFees || 0)) +
        adjustForCoverage(Number(yearExpense.propertyInsurance || 0)) +
        adjustForCoverage(Number(yearExpense.managementFees || 0)) +
        adjustForCoverage(Number(yearExpense.unpaidRentInsurance || 0)) +
        adjustForCoverage(Number(yearExpense.repairs || 0)) +
        adjustForCoverage(Number(yearExpense.otherDeductible || 0)) +
        adjustForCoverage(Number(yearExpense.otherNonDeductible || 0));

      // Coûts du prêt calculés dynamiquement (prorata automatique)
      const loanInfo = getLoanInfoForYear(investmentData as Investment, yr);
      const loanCosts = loanInfo.payment + loanInfo.insurance;

      // Cash flow annuel AVANT IS
      const annualCashFlowBeforeTax = revenues + taxBenefit + tenantCharges - charges - loanCosts;
      cumulativeCashFlowBeforeTax += annualCashFlowBeforeTax;
    });

    // Calculer le solde de revente
    const storedParams = localStorage.getItem(`saleParameters_${investmentData.purchasePrice}_${investmentData.startDate}`);
    const saleParams = storedParams ? JSON.parse(storedParams) : {
      annualIncrease: 2,
      agencyFees: 0,
      earlyRepaymentFees: 0
    };

    const yearsSincePurchase = year - startYear;
    const purchasePrice = Number(investmentData.purchasePrice) || 0;
    const revaluedValue = purchasePrice * Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase + 1);
    
    // Capital restant dû
    const amortizationSchedule = generateAmortizationSchedule(
      Number(investmentData.loanAmount),
      Number(investmentData.interestRate),
      Number(investmentData.loanDuration),
      investmentData.deferralType || 'none',
      Number(investmentData.deferredPeriod) || 0,
      investmentData.startDate
    );

    let remainingBalance = 0;
    if (amortizationSchedule && amortizationSchedule.schedule && Array.isArray(amortizationSchedule.schedule)) {
      const yearEndDate = new Date(year, 11, 31);
      const yearPayments = amortizationSchedule.schedule.filter(row => new Date(row.date) <= yearEndDate);
      
      if (yearPayments.length > 0) {
        const totalPaid = yearPayments.reduce((sum, row) => sum + row.principal, 0);
        remainingBalance = Number(investmentData.loanAmount) - totalPaid;
      } else {
        remainingBalance = Number(investmentData.loanAmount);
      }
    }

    const saleBalance = revaluedValue - saleParams.agencyFees - remainingBalance - saleParams.earlyRepaymentFees;

    // Impôt sur la plus-value (IS 25%)
    const acquisitionFees = (Number(investmentData.notaryFees) || 0) + (Number(investmentData.agencyFees) || 0);
    const improvementWorks = Number(investmentData.improvementWorks) || 0;
    const correctedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
    const grossCapitalGain = revaluedValue - saleParams.agencyFees - correctedPurchasePrice;
    
    const capitalGainTax = grossCapitalGain > 0 ? grossCapitalGain * 0.25 : 0;

    // Gain total
    const downPayment = Number(investmentData.downPayment) || 0;
    const totalGain = cumulativeCashFlowBeforeTax + saleBalance - capitalGainTax - downPayment;

    return {
      year,
      downPayment,
      cumulativeCashFlowBeforeTax,
      cumulativeTax, // 0 pour SCI
      saleBalance,
      capitalGainTax,
      totalGain
    };
  };

  // Fonction pour générer le prompt IA avec les données du bilan
  const generateBalanceAnalysisPrompt = () => {
    if (!investmentData) return '';

    const regimeForBalance = getSelectedRegime();
    const balanceData = calculateBalanceForYear(selectedSaleYear, regimeForBalance);
    
    // Récupérer les données de location de la première année
    const firstYear = investmentData.expenses?.[0];
    const isFurnished = regimeForBalance === 'micro-bic' || regimeForBalance === 'reel-bic';
    
    const REGIME_LABELS: Record<TaxRegime, string> = {
      'micro-foncier': 'Location nue - Micro-foncier',
      'reel-foncier': 'Location nue - Frais réels',
      'micro-bic': 'LMNP - Micro-BIC',
      'reel-bic': 'LMNP - Frais réels'
    };

    const prompt = `Tu es un expert en investissement immobilier en France. Analyse ce bilan d'investissement et donne ton avis détaillé.

**Informations sur le bien :**
- Nom : ${investmentData.name || 'Non renseigné'}
- Type : ${investmentData.propertyType === 'new' ? 'Neuf' : 'Ancien'}
- Prix d'achat : ${formatCurrency(Number(investmentData.purchasePrice) || 0)}
- Frais de notaire : ${formatCurrency(Number(investmentData.notaryFees) || 0)}
- Frais d'agence : ${formatCurrency(Number(investmentData.agencyFees) || 0)}
- Coûts de rénovation : ${formatCurrency(Number(investmentData.improvementWorks) || 0)}

**Financement :**
- Apport personnel : ${formatCurrency(Number(investmentData.downPayment) || 0)}
- Montant emprunté : ${formatCurrency(Number(investmentData.loanAmount) || 0)}
- Durée du prêt : ${investmentData.loanDuration} ans
- Taux d'intérêt : ${investmentData.interestRate}%
- Taux d'assurance : ${investmentData.insuranceRate}%

${firstYear ? `
**Exploitation (année de référence) :**
- Revenus locatifs annuels : ${formatCurrency(isFurnished ? Number(firstYear.furnishedRent || 0) : Number(firstYear.rent || 0))}
- Charges locatives : ${formatCurrency(Number(firstYear.tenantCharges || 0))}
- Taxe foncière : ${formatCurrency(Number(firstYear.propertyTax || 0))}
- Charges de copropriété : ${formatCurrency(Number(firstYear.condoFees || 0))}
- Assurance PNO : ${formatCurrency(Number(firstYear.propertyInsurance || 0))}
- Frais de gestion : ${formatCurrency(Number(firstYear.managementFees || 0))}
- Assurance impayés : ${formatCurrency(Number(firstYear.unpaidRentInsurance || 0))}
- Réparations/maintenance : ${formatCurrency(Number(firstYear.repairs || 0))}
- Mensualité de crédit : ${formatCurrency(Number(firstYear.loanPayment || 0))}
- Coût total annuel : ${formatCurrency(
  Number(firstYear.propertyTax || 0) +
  Number(firstYear.condoFees || 0) +
  Number(firstYear.propertyInsurance || 0) +
  Number(firstYear.managementFees || 0) +
  Number(firstYear.unpaidRentInsurance || 0) +
  Number(firstYear.repairs || 0) +
  Number(firstYear.loanPayment || 0) +
  Number(firstYear.loanInsurance || 0)
)}
` : ''}

**Régime fiscal :** ${REGIME_LABELS[regimeForBalance]}
**Année de revente analysée :** ${selectedSaleYear}

${balanceData ? `
**Bilan financier cumulé (année ${selectedSaleYear}) :**
- Apport personnel investi : ${formatCurrency(-balanceData.downPayment)}
- Cash flow cumulé avant impôt : ${formatCurrency(balanceData.cumulativeCashFlowBeforeTax)}
- Impôts cumulés payés : ${formatCurrency(-balanceData.cumulativeTax)}
- Solde de revente après frais : ${formatCurrency(balanceData.saleBalance)}
- Impôt sur la plus-value : ${formatCurrency(-balanceData.capitalGainTax)}
- **GAIN TOTAL NET : ${formatCurrency(balanceData.totalGain)}**

**Durée de détention :** ${selectedSaleYear - new Date(investmentData.projectStartDate).getFullYear()} ans
**Rendement brut du gain total :** ${balanceData.totalGain > 0 ? ((balanceData.totalGain / Number(investmentData.downPayment || 1)) * 100).toFixed(2) : 'Négatif'}%
**Rendement annualisé :** ${balanceData.totalGain > 0 ? ((balanceData.totalGain / Number(investmentData.downPayment || 1) / (selectedSaleYear - new Date(investmentData.projectStartDate).getFullYear())) * 100).toFixed(2) : 'Négatif'}% par an
` : 'Données de bilan non disponibles'}

**Demande :** En tant qu'expert en investissement immobilier, analyse cet investissement et donne ton avis détaillé :
1. Évaluation générale de la rentabilité (rentabilité brute/nette, TRI, cash flow)
2. Points forts et points faibles de cet investissement
3. Risques identifiés (liquidity, risque locatif, inflation, etc.)
4. Recommandations d'optimisation (réduction de charges, optimisation fiscale, etc.)
5. Recommandation finale claire : à retenir, à améliorer, ou à éviter

Réponds de manière professionnelle, concise et structurée avec des références chiffrées spécifiques.`;

    return prompt;
  };

  // Fonction pour lancer l'analyse IA
  const handleRunAIAnalysis = async () => {
    console.log('Démarrage de l\'analyse IA...');
    setIsAnalyzing(true);
    setShowAIModal(true);
    setAiAnalysis('');

    try {
      const prompt = generateBalanceAnalysisPrompt();
      console.log('Prompt généré:', prompt.substring(0, 200) + '...');
      
      // Déterminer l'environnement (dev et prod utilisent OpenAI GPT-4o-mini)
      const isDevelopment = import.meta.env.DEV;
      console.log('Environnement:', isDevelopment ? 'DEV (GPT-4o-mini)' : 'PROD (GPT-4o-mini)');
      
      const response = isDevelopment
        ? await processUserMessageWithMistral(prompt, {
            previousMessages: [],
            currentInvestment: investmentData
          })
        : await processUserMessage(prompt, {
            previousMessages: [],
            currentInvestment: investmentData
          });

      console.log('Réponse IA reçue:', response.response.substring(0, 100) + '...');
      setAiAnalysis(response.response);
    } catch (error: any) {
      console.error('Erreur lors de l\'analyse IA:', error);
      setAiAnalysis(`Erreur lors de l'analyse : ${error?.message || 'Erreur inconnue'}\n\nVérifiez que la clé API OpenAI (VITE_OPENAI_API_KEY) est correctement configurée.`);
    } finally {
      console.log('Fin de l\'analyse IA');
      setIsAnalyzing(false);
    }
  };

  // Fonction pour afficher la sidebar de l'onglet Objectif pour les biens en SCI
  const renderObjectifSidebarForSCI = () => {
    if (!investmentData) return null;

    type RentalType = 'unfurnished' | 'furnished';

    const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
      'unfurnished': 'Location nue',
      'furnished': 'Location meublée'
    };

    // Fonction pour calculer le cashflow cumulé pour un type de location
    const calculateCumulativeCashflowForRentalType = (year: number, rentalType: RentalType): number => {
      if (!investmentData) return 0;
      
      const startYear = investmentData.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
      const years = Array.from({ length: year - startYear + 1 }, (_, i) => startYear + i);
      
      let cumulativeCashflow = 0;
      
      years.forEach(yr => {
        const yearExpense = investmentData.expenses?.find((e: any) => e.year === yr);
        if (!yearExpense) return;

        const coverage = getYearCoverage(investmentData as Investment, yr);
        const adjustForCoverage = (value: number) => value * coverage;

        // Revenus selon le type de location
        const revenues = rentalType === 'furnished' 
          ? adjustForCoverage(Number(yearExpense.furnishedRent || 0))
          : adjustForCoverage(Number(yearExpense.rent || 0));
        
        const tenantCharges = adjustForCoverage(Number(yearExpense.tenantCharges || 0));
        const taxBenefit = adjustForCoverage(Number(yearExpense.taxBenefit || 0));

        // Charges
        const charges = 
          adjustForCoverage(Number(yearExpense.propertyTax || 0)) +
          adjustForCoverage(Number(yearExpense.condoFees || 0)) +
          adjustForCoverage(Number(yearExpense.insurance || 0)) +
          adjustForCoverage(Number(yearExpense.maintenance || 0)) +
          adjustForCoverage(Number(yearExpense.managementFees || 0)) +
          adjustForCoverage(Number(yearExpense.otherDeductible || 0)) +
          adjustForCoverage(Number(yearExpense.otherNonDeductible || 0)) -
          adjustForCoverage(Number(yearExpense.tenantCharges || 0));

        // Coûts du prêt
        const loanInfo = getLoanInfoForYear(investmentData as Investment, yr);
        const loanCosts = loanInfo.payment + loanInfo.insurance;

        // Cash flow annuel avant IS
        const annualCashFlow = revenues + taxBenefit + tenantCharges - charges - loanCosts;
        
        cumulativeCashflow += annualCashFlow;
      });

      return cumulativeCashflow;
    };

    // Fonction pour calculer le gain total à une année donnée
    const calculateBalanceForYearSCI = (year: number, rentalType: RentalType) => {
      if (!investmentData) return null;

      const startYear = new Date(investmentData.projectStartDate).getFullYear();
      const cumulativeCashFlow = calculateCumulativeCashflowForRentalType(year, rentalType);

      // Récupérer les paramètres de vente
      const investmentId = `${investmentData.purchasePrice || 0}_${investmentData.startDate || ''}`;
      const saleParamsStr = typeof window !== 'undefined' ? localStorage.getItem(`saleParameters_${investmentId}`) : null;
      const saleParams = saleParamsStr ? JSON.parse(saleParamsStr) : { annualIncrease: 2, agencyFees: 0, earlyRepaymentFees: 0 };

      const yearsSincePurchase = year - startYear;
      const revaluedValue = Number(investmentData.purchasePrice) * Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase);

      // Capital restant dû
      const amortizationSchedule = generateAmortizationSchedule(
        Number(investmentData.loanAmount),
        Number(investmentData.interestRate),
        Number(investmentData.loanDuration),
        investmentData.deferralType || 'none',
        Number(investmentData.deferredPeriod) || 0,
        investmentData.startDate
      );

      let remainingBalance = 0;
      if (amortizationSchedule && amortizationSchedule.schedule && Array.isArray(amortizationSchedule.schedule)) {
        const yearEndDate = new Date(year, 11, 31);
        const yearPayments = amortizationSchedule.schedule.filter(row => new Date(row.date) <= yearEndDate);
        
        if (yearPayments.length > 0) {
          const totalPaid = yearPayments.reduce((sum, row) => sum + row.principal, 0);
          remainingBalance = Number(investmentData.loanAmount) - totalPaid;
        } else {
          remainingBalance = Number(investmentData.loanAmount);
        }
      }

      const saleBalance = revaluedValue - saleParams.agencyFees - remainingBalance - saleParams.earlyRepaymentFees;

      // Impôt sur la plus-value (IS 25%)
      const purchasePrice = Number(investmentData.purchasePrice) || 0;
      const acquisitionFees = (Number(investmentData.notaryFees) || 0) + (Number(investmentData.agencyFees) || 0);
      const improvementWorks = Number(investmentData.improvementWorks) || 0;
      const adjustedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
      const grossCapitalGain = revaluedValue - adjustedPurchasePrice;
      const capitalGainTax = grossCapitalGain > 0 ? grossCapitalGain * 0.25 : 0;

      const downPayment = Number(investmentData.downPayment) || 0;
      const totalGain = cumulativeCashFlow + saleBalance - capitalGainTax - downPayment;

      return { year, totalGain, cumulativeCashFlow };
    };

    // Fonction pour trouver l'année optimale pour atteindre un gain
    const findYearForTargetGainSCI = (targetGain: number, rentalType: RentalType): { year: number | null; balanceData: any } => {
      if (!investmentData) return { year: null, balanceData: null };
      
      const startYear = investmentData.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
      const endYear = investmentData.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
      
      for (let year = startYear; year <= endYear; year++) {
        const balanceData = calculateBalanceForYearSCI(year, rentalType);
        if (balanceData && balanceData.totalGain >= targetGain) {
          return { year, balanceData };
        }
      }
      
      const lastYearBalance = calculateBalanceForYearSCI(endYear, rentalType);
      return { year: null, balanceData: lastYearBalance };
    };

    // Fonction pour trouver l'année optimale pour atteindre un cashflow cumulé
    const findYearForTargetCashflowSCI = (targetCashflow: number, rentalType: RentalType): { year: number | null; cashflow: number | null } => {
      if (!investmentData) return { year: null, cashflow: null };
      
      const startYear = investmentData.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
      const endYear = investmentData.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
      
      for (let year = startYear; year <= endYear; year++) {
        const cashflow = calculateCumulativeCashflowForRentalType(year, rentalType);
        if (cashflow >= targetCashflow) {
          return { year, cashflow };
        }
      }
      
      return { year: null, cashflow: null };
    };

    // Calculer le type de location optimal
    const calculateOptimalRentalType = () => {
      if (objectiveType !== 'revente' || !investmentData) return null;
      
      const rentalTypes: RentalType[] = ['unfurnished', 'furnished'];
      const results: Array<{ rentalType: RentalType; year: number | null; balanceData: any }> = [];
      
      rentalTypes.forEach(rentalType => {
        const result = findYearForTargetGainSCI(objectiveTargetGain, rentalType);
        results.push({ rentalType, ...result });
      });
      
      const validResults = results.filter(r => r.year !== null);
      if (validResults.length === 0) return null;
      
      const optimal = validResults.reduce((best, current) => {
        if (!best || !current.year) return current;
        if (!current.year) return best;
        return current.year < best.year ? current : best;
      });
      
      return { optimal, allResults: results };
    };

    const calculateOptimalRentalTypeForCashflow = () => {
      if (objectiveType !== 'cashflow' || !investmentData) return null;
      
      const rentalTypes: RentalType[] = ['unfurnished', 'furnished'];
      const results: Array<{ rentalType: RentalType; year: number | null; cashflow: number | null }> = [];
      
      rentalTypes.forEach(rentalType => {
        const result = findYearForTargetCashflowSCI(objectiveTargetCashflow, rentalType);
        results.push({ rentalType, ...result });
      });
      
      const validResults = results.filter(r => r.year !== null);
      if (validResults.length === 0) return null;
      
      const optimal = validResults.reduce((best, current) => {
        if (!best || !current.year) return current;
        if (!current.year) return best;
        return current.year < best.year ? current : best;
      });
      
      return { optimal, allResults: results };
    };

    const hasMinimumData = () => {
      if (!investmentData) return false;
      const hasAcquisitionData = investmentData.purchasePrice && investmentData.purchasePrice > 0;
      if (!hasAcquisitionData) return false;
      
      const hasExpenseData = investmentData.expenses && investmentData.expenses.length > 0;
      if (!hasExpenseData) return false;
      
      if (objectiveType === 'cashflow') {
        return investmentData.expenses.some((e: any) => e.year === objectiveYear);
      } else {
        const startYear = investmentData.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
        return investmentData.expenses.some((e: any) => {
          const expenseYear = e.year;
          return expenseYear >= startYear;
        });
      }
    };

    const canCalculate = hasMinimumData();
    const optimalRentalTypeResult = objectiveType === 'revente' && canCalculate ? calculateOptimalRentalType() : null;
    const optimalRentalTypeResultForCashflow = objectiveType === 'cashflow' && canCalculate ? calculateOptimalRentalTypeForCashflow() : null;

    return (
      <div className="space-y-4">
        {/* Sélection du type d'objectif */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Type d'objectif</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleObjectiveTypeChange('revente')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
                objectiveType === 'revente'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Revente
            </button>
            <button
              type="button"
              onClick={() => handleObjectiveTypeChange('cashflow')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
                objectiveType === 'cashflow'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cashflow
            </button>
          </div>
        </div>

        {/* Sélection selon le type d'objectif */}
        {objectiveType === 'revente' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Gain total cumulé souhaité (€)
            </label>
            <input
              type="number"
              value={objectiveTargetGain}
              onChange={(e) => handleObjectiveTargetGainChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="50000"
              min="0"
              step="1000"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Cashflow cumulé souhaité (€)
            </label>
            <input
              type="number"
              value={objectiveTargetCashflow}
              onChange={(e) => handleObjectiveTargetCashflowChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="10000"
              min="0"
              step="1000"
            />
          </div>
        )}

        {/* Affichage selon le type d'objectif */}
        {!canCalculate && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Calculs non disponibles
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Les données nécessaires ne sont pas suffisamment renseignées.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {objectiveType === 'revente' && canCalculate && optimalRentalTypeResult && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            {optimalRentalTypeResult.optimal && optimalRentalTypeResult.optimal.year ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-900">
                      Type optimal
                    </span>
                    <span className="text-lg font-bold text-blue-900">
                      {RENTAL_TYPE_LABELS[optimalRentalTypeResult.optimal.rentalType]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">
                      Année de revente
                    </span>
                    <span className="text-xl font-bold text-blue-900">
                      {optimalRentalTypeResult.optimal.year}
                    </span>
                  </div>
                  {optimalRentalTypeResult.optimal.balanceData && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">
                          Gain total cumulé
                        </span>
                        <span className={`text-lg font-bold ${
                          optimalRentalTypeResult.optimal.balanceData.totalGain >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(optimalRentalTypeResult.optimal.balanceData.totalGain)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-amber-600 mt-2 italic">
                    Note : L'IS est calculé au niveau de la SCI
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  L'objectif de {formatCurrency(objectiveTargetGain)} ne peut pas être atteint dans la période du projet.
                </p>
              </div>
            )}
          </div>
        )}

        {objectiveType === 'cashflow' && canCalculate && optimalRentalTypeResultForCashflow && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            {optimalRentalTypeResultForCashflow.optimal && optimalRentalTypeResultForCashflow.optimal.year ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-900">
                      Type optimal
                    </span>
                    <span className="text-lg font-bold text-blue-900">
                      {RENTAL_TYPE_LABELS[optimalRentalTypeResultForCashflow.optimal.rentalType]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">
                      Année d'atteinte
                    </span>
                    <span className="text-xl font-bold text-blue-900">
                      {optimalRentalTypeResultForCashflow.optimal.year}
                    </span>
                  </div>
                  {optimalRentalTypeResultForCashflow.optimal.cashflow !== null && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">
                          Cashflow cumulé
                        </span>
                        <span className={`text-lg font-bold ${
                          optimalRentalTypeResultForCashflow.optimal.cashflow >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(optimalRentalTypeResultForCashflow.optimal.cashflow)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-amber-600 mt-2 italic">
                    Note : Avant IS (calculé au niveau de la SCI)
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  L'objectif de {formatCurrency(objectiveTargetCashflow)} ne peut pas être atteint dans la période du projet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSidebarContent = () => {
    switch (currentMainTab) {
      case 'acquisition':
        // Sous-onglet acquisition (par défaut)
        return onInvestmentUpdate ? (
          <AcquisitionDetails 
            investment={investmentData} 
            onUpdate={onInvestmentUpdate} 
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Prix d'achat</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.purchasePrice?.toLocaleString('fr-FR') || '0'} €
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Frais de notaire</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.notaryFees?.toLocaleString('fr-FR') || '0'} €
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Travaux</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.renovationCosts?.toLocaleString('fr-FR') || '0'} €
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center py-2 bg-blue-50 rounded-md px-3">
                  <span className="text-sm font-semibold text-blue-900">Total acquisition</span>
                  <span className="text-lg font-bold text-blue-900">
                    {((investmentData?.purchasePrice || 0) + 
                      (investmentData?.notaryFees || 0) + 
                      (investmentData?.renovationCosts || 0)).toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'location':
        const monthlyRent = investmentData?.monthlyRent || 0;
        const monthlyCharges = investmentData?.monthlyCharges || 0;
        const netRent = monthlyRent - monthlyCharges;
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Loyer mensuel</span>
                <span className="text-sm font-semibold text-gray-900">
                  {monthlyRent.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Charges mensuelles</span>
                <span className="text-sm font-semibold text-gray-900">
                  {monthlyCharges.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Vacance locative</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.vacancyRate || 0}%
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center py-2 bg-green-50 rounded-md px-3">
                  <span className="text-sm font-semibold text-green-900">Loyer net mensuel</span>
                  <span className="text-lg font-bold text-green-900">
                    {netRent.toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'imposition':
        // Si le bien est en SCI, afficher la sidebar SCI
        if (investmentData?.sciId && onInvestmentUpdate) {
          return <SCITaxSidebar investment={investmentData} onUpdate={onInvestmentUpdate} />;
        }

        // Sinon, afficher la sidebar classique pour les biens en nom propre
        const regimeLabels: Record<TaxRegime, string> = {
          'micro-foncier': 'Location nue - Micro-foncier',
          'reel-foncier': 'Location nue - Frais réels',
          'micro-bic': 'LMNP - Micro-BIC',
          'reel-bic': 'LMNP - Frais réels'
        };

        const currentRegime: TaxRegime = investmentData?.selectedRegime || investmentData?.taxRegime || 'micro-foncier';

        const handleRegimeChange = (value: TaxRegime) => {
          if (onInvestmentUpdate) {
            onInvestmentUpdate('selectedRegime', value);
            onInvestmentUpdate('taxRegime', value);
          }
        };

        return (
          <div className="space-y-3">
            {/* Régime fiscal */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                Régime fiscal
              </label>
              <select
                value={currentRegime}
                onChange={(e) => handleRegimeChange(e.target.value as TaxRegime)}
                className="max-w-48 flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {(Object.keys(regimeLabels) as TaxRegime[]).map((regime) => (
                  <option key={regime} value={regime}>{regimeLabels[regime]}</option>
                ))}
              </select>
            </div>

            {/* Paramètres fiscaux communs */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <FaCalculator className="h-5 w-5 text-blue-600" />
                <h4 className="text-md font-semibold text-gray-900">Paramètres fiscaux communs</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Taux marginal d'imposition (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={investmentData?.taxParameters?.taxRate ?? 0}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      taxRate: Number(e.target.value)
                    })}
                    className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Taux des prélèvements sociaux (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={investmentData?.taxParameters?.socialChargesRate ?? 0}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      socialChargesRate: Number(e.target.value)
                    })}
                    className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Paramètres LMNP */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <FaCalculator className="h-5 w-5 text-blue-600" />
                <h4 className="text-md font-semibold text-gray-900">Paramètres LMNP</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Valeur du bien (hors terrain)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={investmentData?.taxParameters?.buildingValue ?? 0}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      buildingValue: Number(e.target.value)
                    })}
                    className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Durée d'amortissement du bien (années)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={investmentData?.taxParameters?.buildingAmortizationYears ?? 25}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      buildingAmortizationYears: Number(e.target.value)
                    })}
                    className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Valeur du mobilier
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={investmentData?.taxParameters?.furnitureValue ?? 0}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      furnitureValue: Number(e.target.value)
                    })}
                    className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Durée d'amortissement du mobilier (années)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={investmentData?.taxParameters?.furnitureAmortizationYears ?? 10}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      furnitureAmortizationYears: Number(e.target.value)
                    })}
                    className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Valeur des travaux
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={investmentData?.taxParameters?.worksValue ?? 0}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      worksValue: Number(e.target.value)
                    })}
                    className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Durée d'amortissement des travaux (années)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={investmentData?.taxParameters?.worksAmortizationYears ?? 10}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      worksAmortizationYears: Number(e.target.value)
                    })}
                    className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Valeur des autres éléments
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={investmentData?.taxParameters?.otherValue ?? 0}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      otherValue: Number(e.target.value)
                    })}
                    className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Durée d'amortissement autres éléments (années)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={investmentData?.taxParameters?.otherAmortizationYears ?? 5}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      otherAmortizationYears: Number(e.target.value)
                    })}
                    className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Paramètres Location Nue */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <FaCalculator className="h-5 w-5 text-blue-600" />
                <h4 className="text-md font-semibold text-gray-900">Paramètres Location Nue</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Déficit foncier reporté
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={investmentData?.taxParameters?.previousDeficit ?? 0}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      previousDeficit: Number(e.target.value)
                    })}
                    className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Plafond de déduction du déficit foncier
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={investmentData?.taxParameters?.deficitLimit ?? 10700}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                      ...investmentData?.taxParameters,
                      deficitLimit: Number(e.target.value)
                    })}
                    className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'rentabilite':
        if (isReventeView) {
          const updateSaleParams = (field: keyof SaleParameters, value: number) => {
            const next = { ...saleParams, [field]: value } as SaleParameters;
            setSaleParams(next);
            localStorage.setItem(`saleParameters_${investmentId}`, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent('saleParametersUpdated', { detail: { investmentId } }));
          };

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                  Année objectif revente
                </label>
                <select
                  value={targetSaleYear}
                  onChange={async (e) => {
                    const y = Number(e.target.value);
                    setTargetSaleYear(y);
                    localStorage.setItem(`targetSaleYear_${investmentId}`, String(y));
                    updateTargetBalance(y);
                    // Sauvegarder dans la base de données si propertyId est disponible
                    if (propertyId) {
                      await saveTargetSaleYear(propertyId, y);
                    }
                    // Notifier le composant parent de la mise à jour
                    if (onInvestmentUpdate) {
                      onInvestmentUpdate('targetSaleYear', y);
                    }
                  }}
                  className="max-w-40 flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {saleYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                  % augmentation annuelle
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={saleParams.annualIncrease}
                  onChange={(e) => updateSaleParams('annualIncrease', Number(e.target.value))}
                  className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                  Frais d'agence
                </label>
                <input
                  type="number"
                  value={saleParams.agencyFees}
                  onChange={(e) => updateSaleParams('agencyFees', Number(e.target.value))}
                  className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                  Frais de remboursements anticipés
                </label>
                <input
                  type="number"
                  value={saleParams.earlyRepaymentFees}
                  onChange={(e) => updateSaleParams('earlyRepaymentFees', Number(e.target.value))}
                  className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                  Travaux d'amélioration non déduits
                </label>
                <input
                  type="number"
                  value={investmentData?.improvementWorks ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('improvementWorks', Number(e.target.value))}
                  className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                />
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className={`flex justify-between items-center py-3 rounded-md px-4 ${
                  (targetBalance || 0) >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <span className={`text-base font-semibold ${
                    (targetBalance || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Solde ({selectedRegime}) · {targetSaleYear}
                  </span>
                  <span className={`text-xl font-bold ${
                    (targetBalance || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {formatCurrency(targetBalance || 0)}
                  </span>
                </div>
              </div>
            </div>
          );
        }
        const currentYear = new Date().getFullYear();
        let displayYear = currentYear;
        
        // Trouver la première année du projet qui a des données si l'année courante n'en a pas
        if (investmentData) {
          const investment = investmentData as Investment;
          const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
          const endYear = investment.projectEndDate ? new Date(investment.projectEndDate).getFullYear() : startYear;
          
          const currentYearExpense = investment.expenses?.find(e => e.year === currentYear);
          if (!currentYearExpense) {
            // Utiliser la première année du projet qui a des données
            for (let year = startYear; year <= endYear; year++) {
              const expense = investment.expenses?.find(e => e.year === year);
              if (expense) {
                displayYear = year;
                break;
              }
            }
          }
        }
        
        const cashFlowNu = calculateYearCashFlow(displayYear, 'nu');
        const cashFlowMeuble = calculateYearCashFlow(displayYear, 'meuble');
        
        // Calculer le nombre de mois effectifs dans l'année (pour le prorata)
        const investment = investmentData as Investment;
        const coverage = getYearCoverage(investment, displayYear);
        const monthsInYear = coverage * 12;
        
        const monthlyNu = monthsInYear > 0 ? cashFlowNu / monthsInYear : 0;
        const monthlyMeuble = monthsInYear > 0 ? cashFlowMeuble / monthsInYear : 0;

        // Calculer les rentabilités pour micro-foncier et micro-bic (identiques au tableau ResultsDisplay)
        let grossYieldNu = 0;
        let netYieldNu = 0;
        let grossYieldMeuble = 0;
        let netYieldMeuble = 0;

        if (investmentData) {
          const investment = investmentData as Investment;
          
          // Chercher d'abord l'année courante, sinon utiliser la première année du projet (déjà calculée ci-dessus)
          let yearExpenses = investment.expenses?.find(e => e.year === displayYear);
          if (!yearExpenses) {
            // Si displayYear n'a pas de données, chercher la première année disponible
            const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
            const endYear = investment.projectEndDate ? new Date(investment.projectEndDate).getFullYear() : startYear;
            
            for (let year = startYear; year <= endYear; year++) {
              const expense = investment.expenses?.find(e => e.year === year);
              if (expense) {
                yearExpenses = expense;
                displayYear = year;
                break;
              }
            }
          }
          
          if (yearExpenses) {
            // Coût total identique au tableau (achat + frais annexes + travaux)
            const totalCost = Number(investment.purchasePrice || 0) +
                              Number(investment.agencyFees || 0) +
                              Number(investment.notaryFees || 0) +
                              Number(investment.bankFees || 0) +
                              Number(investment.bankGuaranteeFees || 0) +
                              Number(investment.mandatoryDiagnostics || 0) +
                              Number(investment.renovationCosts || 0);

            // Calculer le prorata temporel de l'année (comme dans ResultsDisplay)
            const coverage = getYearCoverage(investment, displayYear);

            // Revenus bruts par régime avec prorata (comme dans ResultsDisplay)
            const rent = adjustForCoverage(Number(yearExpenses?.rent || 0), coverage);
            const furnishedRent = adjustForCoverage(Number(yearExpenses?.furnishedRent || 0), coverage);
            const taxBenefit = adjustForCoverage(Number(yearExpenses?.taxBenefit || 0), coverage);
            const grossRevenueNu = rent + taxBenefit; // micro-foncier
            const grossRevenueMeuble = furnishedRent; // micro-bic

            // Charges avec prorata (comme dans ResultsDisplay)
            let totalCharges =
              adjustForCoverage(Number(yearExpenses?.propertyTax || 0), coverage) +
              adjustForCoverage(Number(yearExpenses?.condoFees || 0), coverage) +
              adjustForCoverage(Number(yearExpenses?.propertyInsurance || 0), coverage) +
              adjustForCoverage(Number(yearExpenses?.managementFees || 0), coverage) +
              adjustForCoverage(Number(yearExpenses?.unpaidRentInsurance || 0), coverage) +
              adjustForCoverage(Number(yearExpenses?.repairs || 0), coverage) +
              adjustForCoverage(Number(yearExpenses?.otherDeductible || 0), coverage) +
              adjustForCoverage(Number(yearExpenses?.otherNonDeductible || 0), coverage) -
              adjustForCoverage(Number(yearExpenses?.tenantCharges || 0), coverage);

            // Pour les biens en SCI, ajouter les coûts du prêt (calculés dynamiquement)
            if (investment.sciId) {
              const loanInfo = getLoanInfoForYear(investment, displayYear);
              totalCharges += loanInfo.payment + loanInfo.insurance;
            }

            // Annualiser pour les années partielles (rentabilité normalisée sur 12 mois, comme dans ResultsDisplay)
            const annualizedGrossRevenueNu = coverage > 0 ? grossRevenueNu / coverage : 0;
            const annualizedGrossRevenueMeuble = coverage > 0 ? grossRevenueMeuble / coverage : 0;
            const annualizedTotalCharges = coverage > 0 ? totalCharges / coverage : 0;

            if (totalCost > 0) {
              grossYieldNu = (annualizedGrossRevenueNu / totalCost) * 100;
              grossYieldMeuble = (annualizedGrossRevenueMeuble / totalCost) * 100;
              netYieldNu = ((annualizedGrossRevenueNu - annualizedTotalCharges) / totalCost) * 100;
              netYieldMeuble = ((annualizedGrossRevenueMeuble - annualizedTotalCharges) / totalCost) * 100;
            }
          }
        }

        return (
          <div className="space-y-4">
            {!isCashflowView && (
              <div className="space-y-3">
                {displayYear !== currentYear && (
                  <div className="text-xs text-gray-500 mb-2 pb-2 border-b border-gray-200">
                    Données pour l'année {displayYear}
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Rentabilité brute location nue</span>
                  <span className="text-sm font-semibold text-green-600">
                    {grossYieldNu.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Rentabilité hors impôts location nue</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {netYieldNu.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-2">
                  <span className="text-sm text-gray-600">Rentabilité brute location meublée</span>
                  <span className="text-sm font-semibold text-green-600">
                    {grossYieldMeuble.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Rentabilité hors impôts location meublée</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {netYieldMeuble.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            {isCashflowView && (
              <div className="space-y-3">
                {displayYear !== currentYear && (
                  <div className="text-xs text-gray-500 mb-2 pb-2 border-b border-gray-200">
                    Données pour l'année {displayYear}
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">
                    Location nue (Année {displayYear} • Mensuel {formatCurrency(monthlyNu)})
                  </span>
                  <span className={`text-sm font-semibold ${
                    cashFlowNu >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(cashFlowNu)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-2">
                  <span className="text-sm text-gray-600">
                    Location meublée (Année {displayYear} • Mensuel {formatCurrency(monthlyMeuble)})
                  </span>
                  <span className={`text-sm font-semibold ${
                    cashFlowMeuble >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(cashFlowMeuble)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case 'bilan':
        // Gérer les sous-onglets bilan
        if (currentSubTab === 'objectif') {
          // Pour les biens en SCI
          if (investmentData?.sciId) {
            return renderObjectifSidebarForSCI();
          }
          
          // Sous-onglet Objectif - réutiliser le même fonctionnement que Projet - Objectif
          // Calculer les années disponibles
          const startYear = investmentData?.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
          const endYear = investmentData?.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
          const availableYears = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

          // Fonction pour calculer le cashflow net avec imposition pour un régime donné
          // On calcule cumulativement jusqu'à l'année donnée pour tenir compte des déficits reportés
          const calculateCashFlowForRegime = (year: number, regime: TaxRegime): number => {
            if (!investmentData?.expenses) return 0;
            
            const startYear = investmentData?.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
            const years = Array.from({ length: year - startYear + 1 }, (_, i) => startYear + i);
            
            // Calculer les résultats fiscaux pour toutes les années jusqu'à l'année sélectionnée
            const yearlyResults: Record<number, Record<TaxRegime, any>> = {};
            years.forEach(yr => {
              const yearExpense = investmentData.expenses?.find((e: any) => e.year === yr);
              
              if (!yearExpense && yr === startYear) {
                yearlyResults[yr] = {
                  'micro-foncier': { totalTax: 0 },
                  'reel-foncier': { totalTax: 0 },
                  'micro-bic': { totalTax: 0 },
                  'reel-bic': { totalTax: 0 }
                } as Record<TaxRegime, any>;
              } else if (yearExpense) {
                try {
                  if (yr === startYear) {
                    yearlyResults[yr] = calculateAllTaxRegimes(investmentData as Investment, yr);
                  } else {
                    yearlyResults[yr] = calculateAllTaxRegimes(investmentData as Investment, yr, yearlyResults[yr - 1]);
                  }
                } catch (error) {
                  yearlyResults[yr] = yearlyResults[yr - 1] || {
                    'micro-foncier': { totalTax: 0 },
                    'reel-foncier': { totalTax: 0 },
                    'micro-bic': { totalTax: 0 },
                    'reel-bic': { totalTax: 0 }
                  } as Record<TaxRegime, any>;
                }
              } else {
                yearlyResults[yr] = yearlyResults[yr - 1] || {
                  'micro-foncier': { totalTax: 0 },
                  'reel-foncier': { totalTax: 0 },
                  'micro-bic': { totalTax: 0 },
                  'reel-bic': { totalTax: 0 }
                } as Record<TaxRegime, any>;
              }
            });

            // Pour l'objectif cashflow, on veut le cashflow annuel NET (pas cumulé) pour l'année donnée
            const expense = investmentData.expenses.find((e: any) => e.year === year);
            if (!expense) return 0;

            // Calcul des revenus selon le régime
            const rent = Number(expense.rent || 0);
            const furnishedRent = Number(expense.furnishedRent || 0);
            const tenantCharges = Number(expense.tenantCharges || 0);
            const taxBenefit = Number(expense.taxBenefit || 0);

            const revenues = (regime === 'micro-bic' || regime === 'reel-bic')
              ? furnishedRent + tenantCharges
              : rent + taxBenefit + tenantCharges;

            // Total des dépenses
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
              Number(expense.loanInsurance || 0);

            // Cash flow SANS imposition pour cette année
            const cashFlowBeforeTax = revenues - expenses;

            // Calculer l'imposition pour cette année et ce régime (avec prise en compte des années précédentes)
            const taxation = yearlyResults[year]?.[regime]?.totalTax || 0;

            // Cash flow NET (avec imposition) pour cette année
            return cashFlowBeforeTax - taxation;
          };

          // Récupérer le gain total cumulé pour l'année de revente (pour tous les régimes)
          const REGIME_LABELS: Record<TaxRegime, string> = {
            'micro-foncier': 'Location nue - Micro-foncier',
            'reel-foncier': 'Location nue - Frais réels',
            'micro-bic': 'LMNP - Micro-BIC',
            'reel-bic': 'LMNP - Frais réels'
          };

          // Pour la revente et cashflow, utiliser le régime fiscal défini pour le bien
          const investmentRegime: TaxRegime = investmentData?.selectedRegime || investmentData?.taxRegime || 'micro-foncier';
          
          // Fonction pour trouver l'année minimale pour atteindre un gain total souhaité pour un régime donné
          const findYearForTargetGain = (targetGain: number, regime: TaxRegime): { year: number | null; balanceData: any } => {
            if (!investmentData) return { year: null, balanceData: null };
            
            const startYear = investmentData.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
            const endYear = investmentData.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
            
            // Parcourir toutes les années pour trouver la première où le gain total atteint ou dépasse le gain souhaité
            for (let year = startYear; year <= endYear; year++) {
              const balanceData = calculateBalanceForYear(year, regime);
              if (balanceData && balanceData.totalGain >= targetGain) {
                return { year, balanceData };
              }
            }
            
            // Si on n'a pas trouvé, retourner la dernière année disponible
            const lastYearBalance = calculateBalanceForYear(endYear, regime);
            return { year: null, balanceData: lastYearBalance };
          };

          // Fonction pour calculer le cashflow cumulé net jusqu'à une année donnée pour un régime
          const calculateCumulativeCashflowForRegime = (year: number, regime: TaxRegime): number => {
            if (!investmentData) return 0;
            
            const startYear = investmentData.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
            const years = Array.from({ length: year - startYear + 1 }, (_, i) => startYear + i);
            
            // Calculer les résultats fiscaux pour toutes les années jusqu'à l'année sélectionnée
            const yearlyResults: Record<number, Record<TaxRegime, any>> = {};
            years.forEach(yr => {
              const yearExpense = investmentData.expenses?.find((e: any) => e.year === yr);
              
              if (!yearExpense && yr === startYear) {
                yearlyResults[yr] = {
                  'micro-foncier': { totalTax: 0 },
                  'reel-foncier': { totalTax: 0 },
                  'micro-bic': { totalTax: 0 },
                  'reel-bic': { totalTax: 0 }
                } as Record<TaxRegime, any>;
              } else if (yearExpense) {
                try {
                  if (yr === startYear) {
                    yearlyResults[yr] = calculateAllTaxRegimes(investmentData as Investment, yr);
                  } else {
                    yearlyResults[yr] = calculateAllTaxRegimes(investmentData as Investment, yr, yearlyResults[yr - 1]);
                  }
                } catch (error) {
                  yearlyResults[yr] = yearlyResults[yr - 1] || {
                    'micro-foncier': { totalTax: 0 },
                    'reel-foncier': { totalTax: 0 },
                    'micro-bic': { totalTax: 0 },
                    'reel-bic': { totalTax: 0 }
                  } as Record<TaxRegime, any>;
                }
              } else {
                yearlyResults[yr] = yearlyResults[yr - 1] || {
                  'micro-foncier': { totalTax: 0 },
                  'reel-foncier': { totalTax: 0 },
                  'micro-bic': { totalTax: 0 },
                  'reel-bic': { totalTax: 0 }
                } as Record<TaxRegime, any>;
              }
            });

            // Calculer le cashflow cumulé net
            let cumulativeCashflowNet = 0;
            
            years.forEach(yr => {
              const yearExpense = investmentData.expenses?.find((e: any) => e.year === yr);
              if (!yearExpense) return;

              // Calcul des revenus selon le régime
              const rent = Number(yearExpense.rent || 0);
              const furnishedRent = Number(yearExpense.furnishedRent || 0);
              const tenantCharges = Number(yearExpense.tenantCharges || 0);
              const taxBenefit = Number(yearExpense.taxBenefit || 0);

              const revenues = (regime === 'micro-bic' || regime === 'reel-bic')
                ? furnishedRent + tenantCharges
                : rent + taxBenefit + tenantCharges;

              // Total des dépenses
              const expenses = 
                Number(yearExpense.propertyTax || 0) +
                Number(yearExpense.condoFees || 0) +
                Number(yearExpense.propertyInsurance || 0) +
                Number(yearExpense.managementFees || 0) +
                Number(yearExpense.unpaidRentInsurance || 0) +
                Number(yearExpense.repairs || 0) +
                Number(yearExpense.otherDeductible || 0) +
                Number(yearExpense.otherNonDeductible || 0) +
                Number(yearExpense.loanPayment || 0) +
                Number(yearExpense.loanInsurance || 0);

              // Cash flow SANS imposition pour cette année
              const cashFlowBeforeTax = revenues - expenses;

              // Calculer l'imposition pour cette année et ce régime
              const taxation = yearlyResults[yr]?.[regime]?.totalTax || 0;

              // Cash flow NET (avec imposition) pour cette année
              const annualCashFlowNet = cashFlowBeforeTax - taxation;
              
              cumulativeCashflowNet += annualCashFlowNet;
            });

            return cumulativeCashflowNet;
          };

          // Fonction pour trouver l'année minimale pour atteindre un cashflow cumulé souhaité pour un régime donné
          const findYearForTargetCashflow = (targetCashflow: number, regime: TaxRegime): { year: number | null; cashflow: number | null } => {
            if (!investmentData) return { year: null, cashflow: null };
            
            const startYear = investmentData.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
            const endYear = investmentData.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
            
            // Parcourir toutes les années pour trouver la première où le cashflow cumulé atteint ou dépasse le cashflow souhaité
            for (let year = startYear; year <= endYear; year++) {
              const cashflow = calculateCumulativeCashflowForRegime(year, regime);
              if (cashflow >= targetCashflow) {
                return { year, cashflow };
              }
            }
            
            // Si on n'a pas trouvé, retourner null
            return { year: null, cashflow: null };
          };

          // Calculer l'année minimale pour chaque régime fiscal pour atteindre le gain souhaité
          const calculateOptimalRegime = () => {
            if (objectiveType !== 'revente' || !investmentData) return null;
            
            const regimes: TaxRegime[] = ['micro-foncier', 'reel-foncier', 'micro-bic', 'reel-bic'];
            const results: Array<{ regime: TaxRegime; year: number | null; balanceData: any }> = [];
            
            regimes.forEach(regime => {
              const result = findYearForTargetGain(objectiveTargetGain, regime);
              results.push({ regime, ...result });
            });
            
            // Trouver le régime qui atteint l'objectif le plus rapidement (année minimale)
            const validResults = results.filter(r => r.year !== null);
            if (validResults.length === 0) return null;
            
            const optimal = validResults.reduce((best, current) => {
              if (!best || !current.year) return current;
              if (!current.year) return best;
              return current.year < best.year ? current : best;
            });
            
            return {
              optimal,
              allResults: results
            };
          };

          // Calculer l'année minimale pour chaque régime fiscal pour atteindre le cashflow cumulé souhaité
          const calculateOptimalRegimeForCashflow = () => {
            if (objectiveType !== 'cashflow' || !investmentData) return null;
            
            const regimes: TaxRegime[] = ['micro-foncier', 'reel-foncier', 'micro-bic', 'reel-bic'];
            const results: Array<{ regime: TaxRegime; year: number | null; cashflow: number | null }> = [];
            
            regimes.forEach(regime => {
              const result = findYearForTargetCashflow(objectiveTargetCashflow, regime);
              results.push({ regime, ...result });
            });
            
            // Trouver le régime qui atteint l'objectif le plus rapidement (année minimale)
            const validResults = results.filter(r => r.year !== null);
            if (validResults.length === 0) return null;
            
            const optimal = validResults.reduce((best, current) => {
              if (!best || !current.year) return current;
              if (!current.year) return best;
              return current.year < best.year ? current : best;
            });
            
            return {
              optimal,
              allResults: results
            };
          };

          // Vérifier si les données sont suffisamment renseignées pour les calculs
          const hasMinimumData = () => {
            if (!investmentData) return false;
            // Vérifier les données essentielles pour les calculs
            const hasAcquisitionData = investmentData.purchasePrice && investmentData.purchasePrice > 0;
            if (!hasAcquisitionData) return false;
            
            const hasExpenseData = investmentData.expenses && investmentData.expenses.length > 0;
            if (!hasExpenseData) return false;
            
            // Pour la revente, on a besoin d'au moins une année de données
            // Pour le cashflow, on a besoin des données pour l'année exacte
            if (objectiveType === 'cashflow') {
              return investmentData.expenses.some((e: any) => e.year === objectiveYear);
            } else {
              // Pour la revente, on doit avoir des données pour au moins une année
              const startYear = investmentData.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
              return investmentData.expenses.some((e: any) => {
                const expenseYear = e.year;
                return expenseYear >= startYear;
              });
            }
          };

          const canCalculate = hasMinimumData();
          const optimalRegimeResult = objectiveType === 'revente' && canCalculate ? calculateOptimalRegime() : null;
          const optimalRegimeResultForCashflow = objectiveType === 'cashflow' && canCalculate ? calculateOptimalRegimeForCashflow() : null;

          return (
            <div className="space-y-4">
              {/* Sélection du type d'objectif */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Type d'objectif</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleObjectiveTypeChange('revente')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
                      objectiveType === 'revente'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Revente
                  </button>
                  <button
                    type="button"
                    onClick={() => handleObjectiveTypeChange('cashflow')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
                      objectiveType === 'cashflow'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cashflow
                  </button>
                </div>
              </div>

              {/* Sélection selon le type d'objectif */}
              {objectiveType === 'revente' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Gain total cumulé souhaité (€)
                  </label>
                  <input
                    type="number"
                    value={objectiveTargetGain}
                    onChange={(e) => handleObjectiveTargetGainChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50000"
                    min="0"
                    step="1000"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Cashflow cumulé souhaité (€)
                  </label>
                  <input
                    type="number"
                    value={objectiveTargetCashflow}
                    onChange={(e) => handleObjectiveTargetCashflowChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10000"
                    min="0"
                    step="1000"
                  />
                </div>
              )}

              {/* Affichage selon le type d'objectif */}
              {!canCalculate && (
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Calculs non disponibles
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            Les calculs ne peuvent pas être réalisés tant que les données nécessaires ne sont pas suffisamment renseignées.
                          </p>
                          <p className="mt-2">
                            Veuillez compléter au minimum :
                          </p>
                          <ul className="mt-1 list-disc list-inside space-y-1">
                            <li>Les informations d'acquisition (prix d'achat, frais...)</li>
                            <li>Les données de location (revenus et frais)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {objectiveType === 'revente' && canCalculate && optimalRegimeResult && (
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  {optimalRegimeResult.optimal && optimalRegimeResult.optimal.year ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-blue-900">
                            Régime optimal
                          </span>
                          <span className="text-lg font-bold text-blue-900">
                            {REGIME_LABELS[optimalRegimeResult.optimal.regime]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-800">
                            Année de revente
                          </span>
                          <span className="text-xl font-bold text-blue-900">
                            {optimalRegimeResult.optimal.year}
                          </span>
                        </div>
                        {optimalRegimeResult.optimal.balanceData && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-800">
                                Gain total cumulé
                              </span>
                              <span className={`text-lg font-bold ${
                                optimalRegimeResult.optimal.balanceData.totalGain >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {formatCurrency(optimalRegimeResult.optimal.balanceData.totalGain)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <p className="text-sm text-yellow-800">
                        L'objectif de {formatCurrency(objectiveTargetGain)} ne peut pas être atteint dans la période du projet.
                      </p>
                      {optimalRegimeResult.allResults.length > 0 && (
                        <p className="text-xs text-yellow-700 mt-2">
                          Gain maximum possible : {formatCurrency(
                            Math.max(...optimalRegimeResult.allResults
                              .filter(r => r.balanceData)
                              .map(r => r.balanceData.totalGain))
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {objectiveType === 'cashflow' && canCalculate && optimalRegimeResultForCashflow && (
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  {optimalRegimeResultForCashflow.optimal && optimalRegimeResultForCashflow.optimal.year ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-blue-900">
                            Régime optimal
                          </span>
                          <span className="text-lg font-bold text-blue-900">
                            {REGIME_LABELS[optimalRegimeResultForCashflow.optimal.regime]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-800">
                            Année d'atteinte
                          </span>
                          <span className="text-xl font-bold text-blue-900">
                            {optimalRegimeResultForCashflow.optimal.year}
                          </span>
                        </div>
                        {optimalRegimeResultForCashflow.optimal.cashflow !== null && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-800">
                                Cashflow cumulé
                              </span>
                              <span className={`text-lg font-bold ${
                                optimalRegimeResultForCashflow.optimal.cashflow >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {formatCurrency(optimalRegimeResultForCashflow.optimal.cashflow)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <p className="text-sm text-yellow-800">
                        L'objectif de cashflow cumulé de {formatCurrency(objectiveTargetCashflow)} ne peut pas être atteint dans la période de projection.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }
        
        // Sous-onglet TRI
        if (currentSubTab === 'tri') {
          // Récupérer l'année de revente sélectionnée
          const startYear = investmentData?.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
          const endYear = investmentData?.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
          
          // Pour les biens en SCI
          if (investmentData?.sciId) {
            // Fonction pour calculer le solde de revente pour SCI
            const calculateBalanceForIRRSCI = (yearIndex: number, rentalType: 'unfurnished' | 'furnished'): number => {
              const year = startYear + yearIndex;
              
              // Récupérer les paramètres de vente depuis localStorage
              const investmentId = `${investmentData.purchasePrice || 0}_${investmentData.startDate || ''}`;
              const saleParamsStr = typeof window !== 'undefined' ? localStorage.getItem(`saleParameters_${investmentId}`) : null;
              const saleParams = saleParamsStr ? JSON.parse(saleParamsStr) : { annualIncrease: 2, agencyFees: 0, earlyRepaymentFees: 0 };

              // Calculer le prix de vente revalorisé
              const yearsSincePurchase = year - startYear;
              const revaluedValue = Number(investmentData.purchasePrice) * Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase);

              // Capital restant dû (utiliser l'échéancier d'amortissement)
              const amortizationSchedule = generateAmortizationSchedule(
                Number(investmentData.loanAmount),
                Number(investmentData.interestRate),
                Number(investmentData.loanDuration),
                investmentData.deferralType || 'none',
                Number(investmentData.deferredPeriod) || 0,
                investmentData.startDate
              );

              let remainingBalance = 0;
              if (amortizationSchedule && amortizationSchedule.schedule && Array.isArray(amortizationSchedule.schedule)) {
                const yearEndDate = new Date(year, 11, 31);
                const yearPayments = amortizationSchedule.schedule.filter(row => new Date(row.date) <= yearEndDate);
                
                if (yearPayments.length > 0) {
                  const totalPaid = yearPayments.reduce((sum, row) => sum + row.principal, 0);
                  remainingBalance = Number(investmentData.loanAmount) - totalPaid;
                } else {
                  remainingBalance = Number(investmentData.loanAmount);
                }
              }

              const saleBalance = revaluedValue - saleParams.agencyFees - remainingBalance - saleParams.earlyRepaymentFees;

              // Calculer l'impôt sur la plus-value (IS 25% pour SCI)
              const acquisitionFees = (Number(investmentData.notaryFees) || 0) + (Number(investmentData.agencyFees) || 0);
              const improvementWorks = Number(investmentData.improvementWorks) || 0;
              const adjustedPurchasePrice = Number(investmentData.purchasePrice) + acquisitionFees + improvementWorks;
              const grossCapitalGain = revaluedValue - adjustedPurchasePrice;
              const capitalGainTax = grossCapitalGain > 0 ? grossCapitalGain * 0.25 : 0;

              // Retourner le solde après impôt
              return saleBalance - capitalGainTax;
            };

            return (
              <SCIIRRSummary
                investment={investmentData as Investment}
                calculateBalanceFunction={calculateBalanceForIRRSCI}
                targetYear={selectedSaleYear}
              />
            );
          }
          
          // Pour les biens en nom propre
          // Fonction pour calculer le solde de revente (réutilisée de PropertyForm)
          const calculateBalanceForIRR = (yearIndex: number, regime: TaxRegime): number => {
            const year = startYear + yearIndex;
            
            // Récupérer les paramètres de vente depuis localStorage
            const investmentId = `${investmentData.purchasePrice || 0}_${investmentData.startDate || ''}`;
            const saleParamsStr = typeof window !== 'undefined' ? localStorage.getItem(`saleParameters_${investmentId}`) : null;
            const saleParams = saleParamsStr ? JSON.parse(saleParamsStr) : { annualIncrease: 2, agencyFees: 0, earlyRepaymentFees: 0 };

            // Calculer le prix de vente revalorisé
            const yearsSincePurchase = year - startYear;
            const revaluedValue = Number(investmentData.purchasePrice) * Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase);
            const netSellingPrice = revaluedValue - Number(saleParams.agencyFees);

            // Calculer le capital restant dû (simplifié - utilise une estimation linéaire)
            const loanDuration = Number(investmentData.loanDuration) || 20;
            const yearsPassed = Math.min(yearsSincePurchase, loanDuration);
            const remainingBalance = yearsPassed < loanDuration
              ? Number(investmentData.loanAmount) * (1 - yearsPassed / loanDuration)
              : 0;
            
            const totalDebt = remainingBalance + Number(saleParams.earlyRepaymentFees);
            const saleBalance = netSellingPrice - totalDebt;

            return saleBalance;
          };
          
          return (
            <IRRSummary
              investment={investmentData as Investment}
              calculateBalanceFunction={calculateBalanceForIRR}
              targetYear={selectedSaleYear}
            />
          );
        }
        
        // Sous-onglet Bilan (par défaut) - contenu existant inchangé
        const REGIME_LABELS: Record<TaxRegime, string> = {
          'micro-foncier': 'Location nue - Micro-foncier',
          'reel-foncier': 'Location nue - Frais réels',
          'micro-bic': 'LMNP - Micro-BIC',
          'reel-bic': 'LMNP - Frais réels'
        };
        
        const RENTAL_TYPE_LABELS: Record<string, string> = {
          'unfurnished': 'Location nue',
          'furnished': 'Location meublée'
        };
        
        // Récupérer les années disponibles
        const startYear = investmentData?.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
        const endYear = investmentData?.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
        const availableYears = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
        
        // Lire le régime actuel depuis localStorage (synchronisé avec l'onglet sélectionné)
        const regimeForBalance = getSelectedRegime();
        
        // Calculer les valeurs pour l'année et le régime/type sélectionnés
        const balanceData = investmentData.sciId 
          ? calculateBalanceForYearSCI(selectedSaleYear, selectedRentalTypeSCI)
          : calculateBalanceForYear(selectedSaleYear, regimeForBalance);
        
        return (
          <div className="space-y-4">
            {/* Sélecteur d'année de revente */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Année de revente souhaitée
              </label>
              <select
                value={selectedSaleYear}
                onChange={(e) => setSelectedSaleYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Affichage du régime fiscal ou type de location (synchronisé avec l'onglet sélectionné) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {investmentData.sciId ? 'Type de location' : 'Régime fiscal'}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-900">
                {investmentData.sciId 
                  ? (RENTAL_TYPE_LABELS[selectedRentalTypeSCI] || selectedRentalTypeSCI)
                  : (REGIME_LABELS[regimeForBalance] || regimeForBalance)
                }
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Sélectionné via l'onglet au-dessus du graphique
              </p>
            </div>

            {/* Affichage des valeurs */}
            {balanceData ? (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Apport personnel</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(-balanceData.downPayment)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Cash flow cumulé</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(balanceData.cumulativeCashFlowBeforeTax)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Imposition cumulée</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(-balanceData.cumulativeTax)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Solde de revente</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(balanceData.saleBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Impôt sur la plus-value</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(-balanceData.capitalGainTax)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className={`flex justify-between items-center py-3 rounded-md px-4 ${
                    balanceData.totalGain >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <span className={`text-base font-semibold ${
                      balanceData.totalGain >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      Gain total cumulé
                    </span>
                    <span className={`text-xl font-bold ${
                      balanceData.totalGain >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {formatCurrency(balanceData.totalGain)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-4">
                Impossible de calculer les valeurs pour cette année.
              </div>
            )}

            {/* Bouton d'analyse IA */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleRunAIAnalysis}
                disabled={!balanceData || isAnalyzing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <Brain className="h-5 w-5" />
                {isAnalyzing ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Obtenez une analyse détaillée de votre investissement
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sélectionnez une section pour voir les informations détaillées.
            </p>
          </div>
        );
    }
  };

  // Configuration des sous-onglets pour acquisition/projet (si applicable)
  const acquisitionSubTabs = currentMainTab === 'acquisition' ? [
    { id: 'acquisition', label: 'Acquisition', icon: FaHome }
  ] : [];

  // Configuration des sous-onglets pour rentabilité (si applicable)
  const rentabiliteSubTabs = currentMainTab === 'rentabilite' ? [
    { id: 'rentabilite-brute-nette', label: 'Rentabilité', icon: FaChartBar },
    { id: 'cashflow', label: 'Cashflow', icon: FaMoneyBillWave },
    { id: 'revente', label: 'Revente', icon: FaHome }
  ] : [];

  // Configuration des sous-onglets pour bilan (si applicable)
  const bilanSubTabs = currentMainTab === 'bilan' ? [
    { id: 'bilan', label: 'Bilan', icon: FaChartBar },
    { id: 'tri', label: 'TRI', icon: FaChartLine },
    { id: 'objectif', label: 'Objectif', icon: FaChartPie }
  ] : [];

  // Rendu des onglets pour acquisition/projet
  const renderAcquisitionTabs = () => {
    if (currentMainTab !== 'acquisition' || acquisitionSubTabs.length <= 1) return null;
    
    return (
      <div className="border-b border-gray-200 mb-6 -mx-6 px-6">
        <nav className="-mb-px flex">
          {acquisitionSubTabs.map((subTab) => {
            const isSelected = subTab.id === currentSubTab;
            return (
              <button
                key={subTab.id}
                type="button"
                onClick={() => {
                  if (onTabChange) {
                    onTabChange('acquisition', subTab.id);
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
    );
  };

  // Rendu des onglets pour rentabilité
  const renderRentabiliteTabs = () => {
    if (currentMainTab !== 'rentabilite' || rentabiliteSubTabs.length === 0) return null;
    
    return (
      <div className="border-b border-gray-200 mb-6 -mx-6 px-6">
        <nav className="-mb-px flex">
          {rentabiliteSubTabs.map((subTab) => {
            const isSelected = subTab.id === currentSubTab;
            return (
              <button
                key={subTab.id}
                type="button"
                onClick={() => {
                  if (onTabChange) {
                    onTabChange('rentabilite', subTab.id);
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
    );
  };

  // Rendu des onglets pour bilan
  const renderBilanTabs = () => {
    if (currentMainTab !== 'bilan' || bilanSubTabs.length === 0) return null;
    
    return (
      <div className="border-b border-gray-200 mb-6 -mx-6 px-6">
        <nav className="-mb-px flex">
          {bilanSubTabs.map((subTab) => {
            // Pour le sous-onglet 'bilan', on considère qu'il est sélectionné si currentSubTab est 'bilan' ou undefined/null
            const isSelected = subTab.id === 'bilan' 
              ? (currentSubTab === 'bilan' || !currentSubTab)
              : subTab.id === currentSubTab;
            return (
              <button
                key={subTab.id}
                type="button"
                onClick={() => {
                  if (onTabChange) {
                    onTabChange('bilan', subTab.id);
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
    );
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 space-y-6">
        {renderAcquisitionTabs()}
        {renderRentabiliteTabs()}
        {renderBilanTabs()}
        {currentMainTab !== 'rentabilite' && currentMainTab !== 'acquisition' && currentMainTab !== 'bilan' && (
          <div className="flex items-center space-x-2">
            {isCashflowView ? (
              <FaMoneyBillWave className="h-5 w-5 text-blue-600" />
            ) : isReventeView ? (
              <FaHome className="h-5 w-5 text-blue-600" />
            ) : (
              <currentConfig.icon className="h-5 w-5 text-blue-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">{isCashflowView ? 'Cashflow' : isReventeView ? 'Revente' : currentConfig.label}</h3>
          </div>
        )}
        <div className={currentMainTab === 'rentabilite' || currentMainTab === 'acquisition' || currentMainTab === 'bilan' ? '' : 'border-t border-gray-100 pt-4'}>
          {renderSidebarContent()}
        </div>
      </div>

      {/* Modal d'analyse IA */}
      {showAIModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* En-tête de la modal */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">Analyse IA</h2>
                </div>
                <button
                  onClick={() => setShowAIModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <span className="sr-only">Fermer</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Contenu de l'analyse */}
            <div className="overflow-auto flex-1 p-6">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600 text-lg">Analyse en cours...</p>
                  <p className="text-gray-500 text-sm mt-2">L'IA analyse votre investissement</p>
                </div>
              ) : aiAnalysis ? (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {aiAnalysis}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Aucune analyse disponible
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
