import { 
  FaHome, 
  FaKey, 
  FaCalculator, 
  FaChartLine, 
  FaChartBar,
  FaMoneyBillWave 
} from 'react-icons/fa';
import { useEffect, useState } from 'react';
import AcquisitionDetails from './AcquisitionDetails';
import { TaxRegime, Investment } from '../types/investment';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';
import { generateAmortizationSchedule } from '../utils/calculations';
import { Brain, X } from 'lucide-react';
import { processUserMessageWithMistral } from '../services/mistral';
import { processUserMessage } from '../services/openai';
import { saveTargetSaleYear } from '../lib/api';

type MainTab = 'acquisition' | 'location' | 'imposition' | 'rentabilite' | 'bilan';

interface SidebarContentProps {
  currentMainTab: MainTab;
  currentSubTab?: string;
  investmentData?: any;
  metrics?: any;
  onInvestmentUpdate?: (field: any, value: any) => void;
  propertyId?: string;
}

const tabConfigs = [
  { id: 'acquisition' as MainTab, label: 'Acquisition', icon: FaHome },
  { id: 'location' as MainTab, label: 'Location', icon: FaKey },
  { id: 'imposition' as MainTab, label: 'Imposition', icon: FaCalculator },
  { id: 'rentabilite' as MainTab, label: 'Rentabilité', icon: FaChartLine },
  { id: 'bilan' as MainTab, label: 'Bilan', icon: FaChartBar },
];

export default function SidebarContent({ currentMainTab, currentSubTab, investmentData, metrics, onInvestmentUpdate, propertyId }: SidebarContentProps) {
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
  // Récupérer le régime depuis localStorage (synchronisé avec les onglets de BalanceDisplay)
  // On lit directement depuis localStorage à chaque rendu pour éviter les décalages
  const getSelectedRegime = (): TaxRegime => {
    if (typeof window === 'undefined') return 'micro-foncier';
    const regime = localStorage.getItem(`selectedRegime_${investmentId}`) || 'micro-foncier';
    return regime as TaxRegime;
  };
  
  // État pour forcer le re-render quand le localStorage change
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(getSelectedRegime);
  
  // Synchroniser avec les changements dans localStorage (quand l'onglet change dans BalanceDisplay)
  useEffect(() => {
    // Vérifier périodiquement les changements du localStorage
    const interval = setInterval(() => {
      const currentRegimeValue = getSelectedRegime();
      if (currentRegimeValue !== selectedRegime) {
        setSelectedRegime(currentRegimeValue);
      }
    }, 200); // Vérifier toutes les 200ms
    
    return () => clearInterval(interval);
  }, [investmentId, selectedRegime]);
  
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
    if (investmentData?.targetSaleYear && investmentData.targetSaleYear !== targetSaleYear) {
      setTargetSaleYear(investmentData.targetSaleYear);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`targetSaleYear_${investmentId}`, String(investmentData.targetSaleYear));
      }
    }
  }, [investmentData?.targetSaleYear, investmentId, targetSaleYear]);
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

    const rent = Number(expense.rent || 0);
    const furnishedRent = Number(expense.furnishedRent || 0);
    const tenantCharges = Number(expense.tenantCharges || 0);
    const taxBenefit = Number(expense.taxBenefit || 0);

    const revenues = type === 'meuble'
      ? furnishedRent + tenantCharges
      : rent + taxBenefit + tenantCharges;

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
      Number(expense.loanInsurance || 0);

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
      
      // Déterminer l'environnement (dev = Mistral, prod = OpenAI)
      const isDevelopment = import.meta.env.DEV;
      console.log('Environnement:', isDevelopment ? 'DEV (Mistral)' : 'PROD (OpenAI)');
      
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
      setAiAnalysis(`Erreur lors de l'analyse : ${error?.message || 'Erreur inconnue'}\n\nVérifiez que Ollama est démarré avec le modèle 'mixtral' installé si vous êtes en développement.`);
    } finally {
      console.log('Fin de l\'analyse IA');
      setIsAnalyzing(false);
    }
  };

  const renderSidebarContent = () => {
    switch (currentMainTab) {
      case 'acquisition':
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
          <div className="space-y-6">
            {/* Régime fiscal: libellé + saisie sur une ligne */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Régime fiscal</span>
                <select
                  value={currentRegime}
                  onChange={(e) => handleRegimeChange(e.target.value as TaxRegime)}
                  className="ml-3 w-56 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {(Object.keys(regimeLabels) as TaxRegime[]).map((regime) => (
                    <option key={regime} value={regime}>{regimeLabels[regime]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Paramètres fiscaux communs: libellé + saisie sur une ligne */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Paramètres fiscaux communs</h4>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Taux marginal d'imposition (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={investmentData?.taxParameters?.taxRate ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    taxRate: Number(e.target.value)
                  })}
                  className="ml-3 w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Taux des prélèvements sociaux (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={investmentData?.taxParameters?.socialChargesRate ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    socialChargesRate: Number(e.target.value)
                  })}
                  className="ml-3 w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            {/* Paramètres LMNP */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Paramètres LMNP</h4>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Valeur du bien (hors terrain)</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.buildingValue ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    buildingValue: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Durée d'amortissement du bien (années)</span>
                <input
                  type="number"
                  step="1"
                  value={investmentData?.taxParameters?.buildingAmortizationYears ?? 25}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    buildingAmortizationYears: Number(e.target.value)
                  })}
                  className="ml-3 w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Valeur du mobilier</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.furnitureValue ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    furnitureValue: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Durée d'amortissement du mobilier (années)</span>
                <input
                  type="number"
                  step="1"
                  value={investmentData?.taxParameters?.furnitureAmortizationYears ?? 10}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    furnitureAmortizationYears: Number(e.target.value)
                  })}
                  className="ml-3 w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Valeur des travaux</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.worksValue ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    worksValue: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Durée d'amortissement des travaux (années)</span>
                <input
                  type="number"
                  step="1"
                  value={investmentData?.taxParameters?.worksAmortizationYears ?? 10}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    worksAmortizationYears: Number(e.target.value)
                  })}
                  className="ml-3 w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Valeur des autres éléments</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.otherValue ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    otherValue: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Durée d'amortissement autres éléments (années)</span>
                <input
                  type="number"
                  step="1"
                  value={investmentData?.taxParameters?.otherAmortizationYears ?? 5}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    otherAmortizationYears: Number(e.target.value)
                  })}
                  className="ml-3 w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            {/* Paramètres Location Nue */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Paramètres Location Nue</h4>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Déficit foncier reporté</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.previousDeficit ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    previousDeficit: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Plafond de déduction du déficit foncier</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.deficitLimit ?? 10700}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    deficitLimit: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
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
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Année objectif revente</span>
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
                    className="ml-3 w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {saleYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">% augmentation annuelle</span>
                  <input
                    type="number"
                    step={0.1}
                    value={saleParams.annualIncrease}
                    onChange={(e) => updateSaleParams('annualIncrease', Number(e.target.value))}
                    className="ml-3 w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                  />
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Frais d'agence</span>
                  <input
                    type="number"
                    value={saleParams.agencyFees}
                    onChange={(e) => updateSaleParams('agencyFees', Number(e.target.value))}
                    className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Frais de remboursements anticipés</span>
                  <input
                    type="number"
                    value={saleParams.earlyRepaymentFees}
                    onChange={(e) => updateSaleParams('earlyRepaymentFees', Number(e.target.value))}
                    className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                  />
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Travaux d'amélioration non déduits</span>
                  <input
                    type="number"
                    value={investmentData?.improvementWorks ?? 0}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('improvementWorks', Number(e.target.value))}
                    className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                  />
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className={`flex justify-between items-center py-2 rounded-md px-3 ${
                    (targetBalance || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className={`text-sm font-semibold ${
                      (targetBalance || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      Solde ({selectedRegime}) · {targetSaleYear}
                    </span>
                    <span className={`text-lg font-bold ${
                      (targetBalance || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {formatCurrency(targetBalance || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        const currentYear = new Date().getFullYear();
        const cashFlowNu = calculateYearCashFlow(currentYear, 'nu');
        const cashFlowMeuble = calculateYearCashFlow(currentYear, 'meuble');
        const monthlyNu = cashFlowNu / 12;
        const monthlyMeuble = cashFlowMeuble / 12;

        // Calculer les rentabilités pour micro-foncier et micro-bic (identiques au tableau ResultsDisplay)
        let grossYieldNu = 0;
        let netYieldNu = 0;
        let grossYieldMeuble = 0;
        let netYieldMeuble = 0;

        if (investmentData) {
          const investment = investmentData as Investment;
          const yearExpenses = investment.expenses?.find(e => e.year === currentYear);
          
          if (yearExpenses) {
            // Coût total identique au tableau (achat + frais annexes + travaux)
            const totalCost = Number(investment.purchasePrice || 0) +
                              Number(investment.agencyFees || 0) +
                              Number(investment.notaryFees || 0) +
                              Number(investment.bankFees || 0) +
                              Number(investment.bankGuaranteeFees || 0) +
                              Number(investment.mandatoryDiagnostics || 0) +
                              Number(investment.renovationCosts || 0);

            // Revenus bruts par régime (sans charges locataires)
            const rent = Number(yearExpenses?.rent || 0);
            const furnishedRent = Number(yearExpenses?.furnishedRent || 0);
            const taxBenefit = Number(yearExpenses?.taxBenefit || 0);
            const grossRevenueNu = rent + taxBenefit; // micro-foncier
            const grossRevenueMeuble = furnishedRent; // micro-bic

            // Charges identiques au tableau (hors charges locataires)
            const totalCharges =
              Number(yearExpenses?.propertyTax || 0) +
              Number(yearExpenses?.condoFees || 0) +
              Number(yearExpenses?.propertyInsurance || 0) +
              Number(yearExpenses?.managementFees || 0) +
              Number(yearExpenses?.unpaidRentInsurance || 0) +
              Number(yearExpenses?.repairs || 0) +
              Number(yearExpenses?.otherDeductible || 0) +
              Number(yearExpenses?.otherNonDeductible || 0) -
              Number(yearExpenses?.tenantCharges || 0);

            if (totalCost > 0) {
              grossYieldNu = (grossRevenueNu / totalCost) * 100;
              grossYieldMeuble = (grossRevenueMeuble / totalCost) * 100;
              netYieldNu = ((grossRevenueNu - totalCharges) / totalCost) * 100;
              netYieldMeuble = ((grossRevenueMeuble - totalCharges) / totalCost) * 100;
            }
          }
        }

        return (
          <div className="space-y-4">
            {!isCashflowView && (
              <div className="space-y-3">
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
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className={`flex justify-between items-center py-2 rounded-md px-3 ${
                  cashFlowNu >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <span className={`text-sm font-semibold ${
                    cashFlowNu >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Location nue
                    <span className="ml-2 text-xs font-normal text-gray-600">(Année {currentYear} · Mensuel {formatCurrency(monthlyNu)})</span>
                  </span>
                  <span className={`text-sm font-bold ${
                    cashFlowNu >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {formatCurrency(cashFlowNu)}
                  </span>
                </div>
                <div className={`flex justify-between items-center py-2 rounded-md px-3 ${
                  cashFlowMeuble >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <span className={`text-sm font-semibold ${
                    cashFlowMeuble >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Location meublée
                    <span className="ml-2 text-xs font-normal text-gray-600">(Année {currentYear} · Mensuel {formatCurrency(monthlyMeuble)})</span>
                  </span>
                  <span className={`text-sm font-bold ${
                    cashFlowMeuble >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {formatCurrency(cashFlowMeuble)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case 'bilan':
        const REGIME_LABELS: Record<TaxRegime, string> = {
          'micro-foncier': 'Location nue - Micro-foncier',
          'reel-foncier': 'Location nue - Frais réels',
          'micro-bic': 'LMNP - Micro-BIC',
          'reel-bic': 'LMNP - Frais réels'
        };
        
        // Récupérer les années disponibles
        const startYear = investmentData?.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
        const endYear = investmentData?.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
        const availableYears = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
        
        // Lire le régime actuel depuis localStorage (synchronisé avec l'onglet sélectionné)
        const regimeForBalance = getSelectedRegime();
        
        // Calculer les valeurs pour l'année et le régime sélectionnés
        const balanceData = calculateBalanceForYear(selectedSaleYear, regimeForBalance);
        
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

            {/* Affichage du régime fiscal (synchronisé avec l'onglet sélectionné) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Régime fiscal
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-900">
                {REGIME_LABELS[regimeForBalance] || regimeForBalance}
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

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 space-y-6">
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
        <div className="border-t border-gray-100 pt-4">
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
