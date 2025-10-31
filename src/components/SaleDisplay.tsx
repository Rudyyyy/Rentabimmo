/**
 * Composant SaleDisplay
 * 
 * Ce composant gère l'affichage et le calcul des résultats de revente d'un investissement immobilier.
 * Il permet de simuler la revente d'un bien en tenant compte de différents paramètres et régimes fiscaux.
 * 
 * Fonctionnalités principales :
 * - Simulation de revente avec paramètres personnalisables (augmentation annuelle, frais d'agence, etc.)
 * - Calcul des plus-values selon différents régimes fiscaux (micro-foncier, reel-foncier, micro-bic, reel-bic)
 * - Affichage détaillé des calculs fiscaux (abattements, impôts, réintégration des amortissements)
 * - Visualisation graphique de l'évolution du solde selon le régime fiscal
 * - Explications détaillées des calculs pour chaque régime
 * 
 * Le composant utilise Chart.js pour la visualisation des données et gère la persistance
 * des paramètres de revente dans le localStorage.
 */

import { useState, useEffect } from 'react';
import { Investment, TaxRegime, CapitalGainResults } from '../types/investment';
import { generateAmortizationSchedule } from '../utils/calculations';
import { calculateAllCapitalGainRegimes } from '../utils/capitalGainCalculations';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Enregistrer les composants nécessaires de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Interface définissant les props du composant
interface Props {
  investment: Investment;
  onUpdate: (updatedInvestment: Investment) => void;
}

// Interface pour les paramètres de revente
interface SaleParameters {
  annualIncrease: number;
  agencyFees: number;
  earlyRepaymentFees: number;
}

// Labels des différents régimes fiscaux pour l'affichage
const REGIME_LABELS = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};

export default function SaleDisplay({ investment, onUpdate }: Props) {
  // Créer un identifiant unique basé sur le prix d'achat et la date de début
  const investmentId = `${investment.purchasePrice}_${investment.startDate}`;
  
  // État du régime fiscal sélectionné, persistant dans le localStorage
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(investment.selectedRegime || 'micro-foncier');
  const [capitalGainResults, setCapitalGainResults] = useState<Record<TaxRegime, CapitalGainResults> | undefined>(investment.capitalGainResults);

  // État pour les paramètres de revente avec persistance dans le localStorage
  const [saleParams, setSaleParams] = useState<SaleParameters>(() => {
    const stored = localStorage.getItem(`saleParameters_${investmentId}`);
    return stored ? JSON.parse(stored) : {
      annualIncrease: 2,
      agencyFees: 0,
      earlyRepaymentFees: 0
    };
  });

  // Sauvegarde du régime sélectionné et notification
  useEffect(() => {
    localStorage.setItem(`selectedRegime_${investmentId}`, selectedRegime);
    window.dispatchEvent(new CustomEvent('selectedRegimeUpdated', { detail: { investmentId, selectedRegime } }));
  }, [selectedRegime, investmentId]);

  // Calculer les résultats de plus-value à chaque modification des paramètres pertinents
  useEffect(() => {
    const results = calculateAllCapitalGainRegimes(investment);
    setCapitalGainResults(results);
    
    // Mettre à jour l'investment avec les nouveaux résultats
    if (onUpdate) {
      const updatedInvestment = {
        ...investment,
        capitalGainResults: results
      };
      onUpdate(updatedInvestment);
    }
  }, [investment.purchasePrice, investment.projectStartDate, investment.projectEndDate, 
      investment.appreciationType, investment.appreciationValue, investment.saleAgencyFees,
      investment.notaryFees, investment.agencyFees, investment.improvementWorks,
      investment.isLMP, investment.accumulatedDepreciation, investment.taxParameters]);

  // Sauvegarder les paramètres dans le localStorage
  useEffect(() => {
    localStorage.setItem(`saleParameters_${investmentId}`, JSON.stringify(saleParams));
  }, [saleParams, investmentId]);

  // Synchroniser les paramètres si la sidebar les met à jour (événement personnalisé)
  useEffect(() => {
    const handleParamsUpdated = (e: any) => {
      const changedId = e?.detail?.investmentId;
      if (changedId === investmentId) {
        const stored = localStorage.getItem(`saleParameters_${investmentId}`);
        if (stored) {
          setSaleParams(JSON.parse(stored));
        }
      }
    };
    window.addEventListener('saleParametersUpdated', handleParamsUpdated as EventListener);
    return () => window.removeEventListener('saleParametersUpdated', handleParamsUpdated as EventListener);
  }, [investmentId]);

  // Synchroniser via l'événement storage (multi-onglets)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === `saleParameters_${investmentId}` && e.newValue) {
        try {
          setSaleParams(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [investmentId]);

  // Fonctions utilitaires pour le formatage des valeurs
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const formatPercent = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);

  // Gestionnaire de modification des paramètres de revente
  const handleParamChange = (field: keyof SaleParameters, value: number) => {
    setSaleParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calcul du tableau de revente avec les valeurs projetées
  const calculateSaleTable = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );

    // Générer le tableau d'amortissement
    const amortizationSchedule = generateAmortizationSchedule(
      investment.loanAmount,
      investment.interestRate,
      investment.loanDuration,
      investment.deferralType,
      investment.deferredPeriod,
      investment.startDate
    );

    // Calculer le capital restant dû pour chaque année
    const yearlyBalances = years.map(year => {
      const yearEndDate = new Date(year, 11, 31);
      const yearPayments = amortizationSchedule.schedule.filter(row => new Date(row.date) <= yearEndDate);
      const totalPaid = yearPayments.reduce((sum, row) => sum + row.principal, 0);
      return investment.loanAmount - totalPaid;
    });

    // Calculer la valeur revalorisée du bien pour chaque année
    const revaluedValues = years.map((_, index) => {
      const yearsSincePurchase = index;
      return Number(investment.purchasePrice) * Math.pow(1 + saleParams.annualIncrease / 100, yearsSincePurchase);
    });

    return {
      years,
      yearlyBalances,
      revaluedValues
    };
  };

  const saleTable = calculateSaleTable();

  // Publier les années et soldes par année pour le régime courant
  useEffect(() => {
    try {
      const balances: Record<number, number> = {};
      saleTable.years.forEach((year, idx) => {
        balances[year] = calculateBalance(idx, selectedRegime);
      });
      localStorage.setItem(`saleYears_${investmentId}`, JSON.stringify(saleTable.years));
      localStorage.setItem(`balances_${investmentId}_${selectedRegime}`, JSON.stringify(balances));
      window.dispatchEvent(new CustomEvent('balancesUpdated', { detail: { investmentId, selectedRegime } }));
    } catch {}
  }, [investmentId, selectedRegime, saleParams, saleTable.years, saleTable.yearlyBalances, saleTable.revaluedValues]);
  
  // Calculer le cumul des amortissements effectivement utilisés jusqu'à une année donnée
  const calculateUsedAmortizationTotal = (targetYear: number) => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = Math.min(targetYear, new Date(investment.projectEndDate).getFullYear());
    let totalUsedAmortization = 0;
    
    for (let year = startYear; year <= endYear; year++) {
      // Calculer les résultats fiscaux pour chaque année
      const yearResults = calculateAllTaxRegimes(investment, year);
      
      // Ajouter l'amortissement utilisé cette année au total
      if (yearResults['reel-bic'].amortization?.used) {
        totalUsedAmortization += yearResults['reel-bic'].amortization.used;
      }
    }
    
    return totalUsedAmortization;
  };

  // Calculer l'impôt sur la plus-value pour un régime et une année spécifiques
  const calculateCapitalGainTax = (regime: TaxRegime, year: number, index: number) => {
    // Prix d'acquisition corrigé
    const correctedPurchasePrice = 
      (Number(investment.purchasePrice) || 0) + 
      (Number(investment.notaryFees) || 0) + 
      (Number(investment.agencyFees) || 0) + 
      (Number(investment.improvementWorks) || 0);
    
    // Prix de vente net après déduction des frais d'agence
    const netSellingPrice = saleTable.revaluedValues[index] - saleParams.agencyFees;
    
    // Plus-value brute pour cette année
    const plusValue = Math.max(0, netSellingPrice - correctedPurchasePrice);
    
    if (plusValue <= 0) {
      return { totalTax: 0, incomeTax: 0, socialCharges: 0, depreciationTax: 0 };
    }
    
    // Calculer les abattements pour cette année de détention
    const { abattementIR, abattementPS } = calculateAbattements(year);
    
    // Pour les régimes location nue (micro-foncier et reel-foncier) et LMNP (micro-bic)
    if (regime === 'micro-foncier' || regime === 'reel-foncier' || regime === 'micro-bic') {
      // Appliquer les abattements
      const plusValueIR = plusValue * (1 - abattementIR / 100);
      const plusValuePS = plusValue * (1 - abattementPS / 100);
      
      // Calculer l'impôt sur le revenu (19%)
      const incomeTax = plusValueIR * 0.19;
      
      // Calculer les prélèvements sociaux (17.2%)
      const socialCharges = plusValuePS * 0.172;
      
      // Impôt total sur la plus-value
      const totalTax = incomeTax + socialCharges;
      
      return { totalTax, incomeTax, socialCharges, depreciationTax: 0 };
    } 
    // Pour le régime LMNP réel (reel-bic)
    else if (regime === 'reel-bic') {
      // Taux marginal d'imposition
      const taxRate = Number(investment.taxParameters.taxRate) / 100 || 0.3;
      
      if (!capitalGainResults?.[regime]) {
        return { totalTax: 0, incomeTax: 0, socialCharges: 0, depreciationTax: 0 };
      }
      
      if (investment.isLMP) {
        // Cas LMP - Plus-values professionnelles
        const holdingPeriodYears = year - new Date(investment.projectStartDate).getFullYear();
        
        if (holdingPeriodYears <= 2) {
          // Plus-value à court terme (totalité) - Imposée au taux marginal
          const shortTermTax = plusValue * taxRate;
          return { totalTax: shortTermTax, incomeTax: shortTermTax, socialCharges: 0, depreciationTax: 0 };
        } else {
          // Calcul du cumul réel des amortissements utilisés jusqu'à cette année
          const usedAmortizationTotal = calculateUsedAmortizationTotal(year);
          
          // Court terme - Correspond aux amortissements pratiqués
          const shortTermGain = Math.min(usedAmortizationTotal, plusValue);
          // Long terme - Le reste de la plus-value
          const longTermGain = Math.max(0, plusValue - shortTermGain);
          
          // Court terme - Taux marginal
          const shortTermTax = shortTermGain * taxRate;
          
          // Long terme - 12.8% (PFU) + 17.2% de prélèvements sociaux
          const longTermIncomeTax = longTermGain * 0.128;
          const longTermSocialCharges = longTermGain * 0.172;
          
          return { 
            totalTax: shortTermTax + longTermIncomeTax + longTermSocialCharges,
            incomeTax: shortTermTax + longTermIncomeTax,
            socialCharges: longTermSocialCharges,
            depreciationTax: shortTermTax // La taxe sur les amortissements correspond à la taxe sur la plus-value à court terme
          };
        }
      } else {
        // Cas LMNP - Plus-values immobilières classiques + réintégration des amortissements
        
        // Calcul standard sur la plus-value immobilière avec abattements
        const plusValueIR = plusValue * (1 - abattementIR / 100);
        const plusValuePS = plusValue * (1 - abattementPS / 100);
        
        // Impôt standard sur la plus-value
        const standardIncomeTax = plusValueIR * 0.19;
        const socialCharges = plusValuePS * 0.172;
        
        // Calcul du cumul réel des amortissements utilisés jusqu'à cette année
        const usedAmortizationTotal = calculateUsedAmortizationTotal(year);
        
        // Les amortissements sont imposés au taux marginal, dans la limite de la plus-value
        const depreciationTaxable = Math.min(usedAmortizationTotal, plusValue);
        const depreciationTax = depreciationTaxable * taxRate;
        
        return { 
          totalTax: standardIncomeTax + socialCharges + depreciationTax,
          incomeTax: standardIncomeTax + depreciationTax,
          socialCharges: socialCharges,
          depreciationTax: depreciationTax // Isolé pour l'affichage
        };
      }
    }
    
    // Cas par défaut
    return { totalTax: 0, incomeTax: 0, socialCharges: 0, depreciationTax: 0 };
  };

  // Calculer le solde (Bien revalorisé - capital restant dû - impôt sur la plus-value - frais)
  const calculateBalance = (index: number, regime: TaxRegime) => {
    const year = saleTable.years[index];
    const { totalTax } = calculateCapitalGainTax(regime, year, index);
    
    // Prix de vente après déduction des frais d'agence
    const netSellingPrice = saleTable.revaluedValues[index] - saleParams.agencyFees;
    
    // Capital restant dû plus frais de remboursement anticipé
    const totalDebt = saleTable.yearlyBalances[index] + saleParams.earlyRepaymentFees;
    
    return netSellingPrice - totalDebt - totalTax;
  };

  // Calculer les pourcentages d'abattement en fonction de la durée de détention
  const calculateAbattements = (year: number) => {
    const purchaseYear = new Date(investment.projectStartDate).getFullYear();
    const holdingPeriodYears = year - purchaseYear;
    
    // Abattement IR
    let abattementIR = 0;
    if (holdingPeriodYears > 5) {
      if (holdingPeriodYears <= 21) {
        abattementIR = Math.min(100, (holdingPeriodYears - 5) * 6);
      } else {
        abattementIR = 100; // Exonération totale après 22 ans
      }
    }
    
    // Abattement prélèvements sociaux
    let abattementPS = 0;
    if (holdingPeriodYears > 5) {
      if (holdingPeriodYears <= 21) {
        abattementPS = (holdingPeriodYears - 5) * 1.65;
      } else if (holdingPeriodYears <= 30) {
        // 1.65% par an pendant 16 ans + 1.6% pour la 22e année + 9% par an pour les années restantes
        const yearsAfter22 = Math.max(0, holdingPeriodYears - 22);
        abattementPS = (16 * 1.65) + 1.6 + (yearsAfter22 * 9);
        abattementPS = Math.min(100, abattementPS); // Plafonner à 100%
      } else {
        abattementPS = 100; // Exonération totale après 30 ans
      }
    }
    
    return { abattementIR, abattementPS };
  };

  // Calculer la plus-value brute (Bien revalorisé - Prix d'acquisition corrigé)
  const calculateRawPlusValue = (index: number) => {
    const correctedPurchasePrice = 
      (Number(investment.purchasePrice) || 0) + 
      (Number(investment.notaryFees) || 0) + 
      (Number(investment.agencyFees) || 0) + 
      (Number(investment.improvementWorks) || 0);
    
    // Prix de vente net après déduction des frais d'agence
    const netSellingPrice = saleTable.revaluedValues[index] - saleParams.agencyFees;
    
    return netSellingPrice - correctedPurchasePrice;
  };

  // Génération des explications détaillées pour chaque régime fiscal
  const getRegimeExplanation = (regime: TaxRegime) => {
    // Utiliser la première année du tableau pour les exemples
    const exampleYear = saleTable.years[0];
    const holdingPeriodYears = exampleYear - new Date(investment.projectStartDate).getFullYear();
    const results = capitalGainResults?.[regime];
    
    if (!results) return "Aucune donnée disponible.";
    
    switch(regime) {
      case 'micro-foncier':
      case 'reel-foncier':
        // Explication identique pour les régimes location nue
        return (
          <div className="space-y-4">
            <p>Le calcul de la plus-value immobilière pour le régime {REGIME_LABELS[regime]} se fait selon les règles des plus-values immobilières des particuliers.</p>
            
            <h4 className="font-semibold">Étapes du calcul :</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Calcul du prix d'acquisition corrigé = Prix d'achat + Frais d'acquisition + Travaux non déduits</li>
              <li>Calcul du prix de vente net = Prix de vente - Frais d'agence</li>
              <li>Calcul de la plus-value brute = Prix de vente net - Prix d'acquisition corrigé</li>
              <li>Application des abattements pour durée de détention :
                <ul className="list-disc list-inside ml-4">
                  <li>Pour l'impôt sur le revenu : 6% par an de la 6e à la 21e année, 4% la 22e année (exonération totale après 22 ans)</li>
                  <li>Pour les prélèvements sociaux : 1,65% par an de la 6e à la 21e année, 1,6% la 22e année, puis 9% par an jusqu'à exonération totale à 30 ans</li>
                </ul>
              </li>
              <li>Calcul des impositions : 19% d'IR et 17,2% de prélèvements sociaux sur les montants imposables après abattements</li>
            </ol>
            
            <h4 className="font-semibold mt-4">Exemple concret pour l'année {exampleYear} (détention de {holdingPeriodYears} ans) :</h4>
            <div className="bg-blue-50 p-4 rounded-md">
              <p>Prix d'achat : {formatCurrency(Number(investment.purchasePrice) || 0)}</p>
              <p>Frais d'acquisition : {formatCurrency((Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0))}</p>
              <p>Travaux d'amélioration : {formatCurrency(Number(investment.improvementWorks) || 0)}</p>
              <p>Prix d'acquisition corrigé : {formatCurrency(
                (Number(investment.purchasePrice) || 0) + 
                (Number(investment.notaryFees) || 0) + 
                (Number(investment.agencyFees) || 0) + 
                (Number(investment.improvementWorks) || 0)
              )}</p>
              <p>Prix de vente estimé : {formatCurrency(saleTable.revaluedValues[0])}</p>
              <p>Frais d'agence : {formatCurrency(saleParams.agencyFees)}</p>
              <p>Prix de vente net : {formatCurrency(saleTable.revaluedValues[0] - saleParams.agencyFees)}</p>
              <p>Plus-value brute : {formatCurrency(calculateRawPlusValue(0))}</p>
              <p>Abattement IR ({holdingPeriodYears > 5 ? Math.min(100, (holdingPeriodYears - 5) * 6) : 0}%) : {formatCurrency(results.grossCapitalGain - results.taxableCapitalGainIR)}</p>
              <p>Plus-value imposable IR : {formatCurrency(results.taxableCapitalGainIR)}</p>
              <p>Impôt sur le revenu (19%) : {formatCurrency(results.incomeTax)}</p>
              <p>Prélèvements sociaux (17,2%) : {formatCurrency(results.socialCharges)}</p>
              <p className="font-bold text-red-600">Total impôt sur la plus-value : {formatCurrency(results.totalTax)}</p>
              <p className="font-bold text-emerald-600">Plus-value nette après impôt : {formatCurrency(results.netCapitalGain)}</p>
            </div>
          </div>
        );
      
      case 'micro-bic':
        return (
          <div className="space-y-4">
            <p>Le calcul de la plus-value immobilière pour le régime {REGIME_LABELS[regime]} suit également les règles des plus-values immobilières des particuliers.</p>
            
            <h4 className="font-semibold">Étapes du calcul :</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Calcul du prix d'acquisition corrigé = Prix d'achat + Frais d'acquisition + Travaux non déduits</li>
              <li>Calcul du prix de vente net = Prix de vente - Frais d'agence</li>
              <li>Calcul de la plus-value brute = Prix de vente net - Prix d'acquisition corrigé</li>
              <li>Application des abattements pour durée de détention :
                <ul className="list-disc list-inside ml-4">
                  <li>Pour l'impôt sur le revenu : 6% par an de la 6e à la 21e année, 4% la 22e année (exonération totale après 22 ans)</li>
                  <li>Pour les prélèvements sociaux : 1,65% par an de la 6e à la 21e année, 1,6% la 22e année, puis 9% par an jusqu'à exonération totale à 30 ans</li>
                </ul>
              </li>
              <li>Calcul des impositions : 19% d'IR et 17,2% de prélèvements sociaux sur les montants imposables après abattements</li>
            </ol>
            
            <h4 className="font-semibold mt-4">Exemple concret pour l'année {exampleYear} (détention de {holdingPeriodYears} ans) :</h4>
            <div className="bg-blue-50 p-4 rounded-md">
              <p>Prix d'achat : {formatCurrency(Number(investment.purchasePrice) || 0)}</p>
              <p>Frais d'acquisition : {formatCurrency((Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0))}</p>
              <p>Travaux d'amélioration : {formatCurrency(Number(investment.improvementWorks) || 0)}</p>
              <p>Prix d'acquisition corrigé : {formatCurrency(
                (Number(investment.purchasePrice) || 0) + 
                (Number(investment.notaryFees) || 0) + 
                (Number(investment.agencyFees) || 0) + 
                (Number(investment.improvementWorks) || 0)
              )}</p>
              <p>Prix de vente estimé : {formatCurrency(saleTable.revaluedValues[0])}</p>
              <p>Frais d'agence : {formatCurrency(saleParams.agencyFees)}</p>
              <p>Prix de vente net : {formatCurrency(saleTable.revaluedValues[0] - saleParams.agencyFees)}</p>
              <p>Plus-value brute : {formatCurrency(calculateRawPlusValue(0))}</p>
              <p>Abattement IR ({holdingPeriodYears > 5 ? Math.min(100, (holdingPeriodYears - 5) * 6) : 0}%) : {formatCurrency(results.grossCapitalGain - results.taxableCapitalGainIR)}</p>
              <p>Plus-value imposable IR : {formatCurrency(results.taxableCapitalGainIR)}</p>
              <p>Impôt sur le revenu (19%) : {formatCurrency(results.incomeTax)}</p>
              <p>Prélèvements sociaux (17,2%) : {formatCurrency(results.socialCharges)}</p>
              <p className="font-bold text-red-600">Total impôt sur la plus-value : {formatCurrency(results.totalTax)}</p>
              <p className="font-bold text-emerald-600">Plus-value nette après impôt : {formatCurrency(results.netCapitalGain)}</p>
            </div>
          </div>
        );
      
      case 'reel-bic':
        return (
          <div className="space-y-4">
            <p>Le calcul de la plus-value immobilière pour le régime {REGIME_LABELS[regime]} a une particularité importante : la reprise des amortissements.</p>
            
            <h4 className="font-semibold">Étapes du calcul :</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Calcul de la plus-value immobilière classique avec les abattements pour durée de détention</li>
              <li><strong>Réintégration des amortissements</strong> : Les amortissements qui ont été déduits du résultat fiscal pendant la période de location sont réintégrés et taxés au taux marginal d'imposition</li>
              <li>Cette réintégration fiscale vient s'ajouter à l'imposition de la plus-value immobilière</li>
              <li>Si le bien est détenu par un Loueur en Meublé Professionnel (LMP), la fiscalité est celle des BIC professionnels (distinction entre plus-values à court terme et à long terme)</li>
            </ol>
            
            <div className="bg-yellow-50 p-4 rounded-md border-l-4 border-yellow-500 mt-2">
              <p className="font-semibold">Important :</p>
              <p>La réintégration des amortissements représente souvent la part la plus importante de l'imposition lors de la revente d'un bien en LMNP.</p>
              <p>Ces amortissements, qui ont permis de réduire l'imposition pendant la période de détention, sont "récupérés" par l'administration fiscale lors de la vente.</p>
            </div>
            
            <h4 className="font-semibold mt-4">Exemple concret pour l'année {exampleYear} (détention de {holdingPeriodYears} ans) :</h4>
            <div className="bg-blue-50 p-4 rounded-md">
              <p>Imaginons un bien acquis pour 200 000 € (dont 160 000 € amortissables sur 25 ans et 10 000 € de mobilier sur 10 ans).</p>
              <p>Après 10 ans, les amortissements théoriques seraient de :</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Immeuble : 160 000 € × (10 ÷ 25) = 64 000 €</li>
                <li>Mobilier : 10 000 € × (10 ÷ 10) = 10 000 €</li>
                <li>Total théorique : 74 000 €</li>
              </ul>
              
              <p className="mt-3">Supposons que seuls 60 000 € d'amortissements ont été réellement utilisés pour réduire votre base imposable en raison de revenus locatifs insuffisants certaines années.</p>
              
              <p className="mt-3">Si vous vendez ce bien 250 000 € (après 10 ans) :</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Plus-value brute : 250 000 € - 200 000 € = 50 000 €</li>
                <li>Abattement IR (après 10 ans) : 30% (6% × 5 ans)</li>
                <li>Plus-value imposable IR : 50 000 € × (1 - 0,3) = 35 000 €</li>
                <li>Impôt IR (19%) : 35 000 € × 0,19 = 6 650 €</li>
                <li>Abattement PS (après 10 ans) : 8,25% (1,65% × 5 ans)</li>
                <li>Plus-value imposable PS : 50 000 € × (1 - 0,0825) = 45 875 €</li>
                <li>Prélèvements sociaux (17,2%) : 45 875 € × 0,172 = 7 890 €</li>
              </ul>
              
              <p className="font-semibold mt-3">Réintégration des amortissements :</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Amortissements à réintégrer : 60 000 € (montant effectivement utilisé)</li>
                <li>Limité à la plus-value : Min(60 000 €, 50 000 €) = 50 000 €</li>
                <li>Avec un TMI de 30% : 50 000 € × 0,3 = 15 000 €</li>
              </ul>
              
              <p className="font-bold text-red-600 mt-3">Total impôt sur la plus-value :</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Impôt IR sur plus-value : 6 650 €</li>
                <li>Prélèvements sociaux : 7 890 €</li>
                <li>Impôt sur les amortissements : 15 000 €</li>
                <li className="font-bold">Total : 29 540 €</li>
              </ul>
              
              <p className="mt-3 text-blue-800 font-semibold">Taux d'imposition effectif : 29 540 € ÷ 50 000 € = 59%</p>
              
              <p className="mt-3 italic">Notez que dans cet exemple, la réintégration des amortissements (15 000 €) représente plus de la moitié de l'imposition totale. C'est pourquoi il est crucial de prendre en compte ce paramètre lors de la planification d'une revente.</p>
            </div>
            
            <h4 className="font-semibold mt-2">Exemple pour l'année {exampleYear} (détention de {holdingPeriodYears} ans) :</h4>
            <div className="bg-blue-50 p-4 rounded-md">
              <p>Prix d'achat : {formatCurrency(Number(investment.purchasePrice) || 0)}</p>
              <p>Frais d'acquisition : {formatCurrency((Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0))}</p>
              <p>Travaux d'amélioration : {formatCurrency(Number(investment.improvementWorks) || 0)}</p>
              <p>Prix d'acquisition corrigé : {formatCurrency(
                (Number(investment.purchasePrice) || 0) + 
                (Number(investment.notaryFees) || 0) + 
                (Number(investment.agencyFees) || 0) + 
                (Number(investment.improvementWorks) || 0)
              )}</p>
              <p>Prix de vente estimé : {formatCurrency(saleTable.revaluedValues[0])}</p>
              <p>Frais d'agence : {formatCurrency(saleParams.agencyFees)}</p>
              <p>Prix de vente net : {formatCurrency(saleTable.revaluedValues[0] - saleParams.agencyFees)}</p>
              <p>Plus-value brute : {formatCurrency(calculateRawPlusValue(0))}</p>
              
              {investment.isLMP ? (
                // Cas LMP
                <>
                  <p>Plus-value à court terme : {formatCurrency(results.shortTermGain || 0)}</p>
                  <p>Plus-value à long terme : {formatCurrency(results.longTermGain || 0)}</p>
                  <p>Imposition de la PV court terme ({investment.taxParameters.taxRate}%) : {formatCurrency(results.shortTermTax || 0)}</p>
                  <p>Imposition de la PV long terme (12,8%) : {formatCurrency(results.longTermIncomeTax || 0)}</p>
                  <p>Prélèvements sociaux (17,2% sur PV long terme) : {formatCurrency(results.longTermSocialCharges || 0)}</p>
                </>
              ) : (
                // Cas LMNP
                <>
                  <p>Abattement IR ({holdingPeriodYears > 5 ? Math.min(100, (holdingPeriodYears - 5) * 6) : 0}%) : {formatCurrency(results.grossCapitalGain - results.taxableCapitalGainIR)}</p>
                  <p>Plus-value imposable IR : {formatCurrency(results.taxableCapitalGainIR)}</p>
                  <p>Impôt sur le revenu (19%) : {formatCurrency(results.incomeTax - (results.depreciationTax || 0))}</p>
                  <p>Prélèvements sociaux (17,2%) : {formatCurrency(results.socialCharges)}</p>
                  
                  {/* Réintégration des amortissements - Section détaillée */}
                  {results.depreciationTaxable && results.depreciationTax && (
                    <div className="mt-4 border-t-2 border-blue-100 pt-3">
                      <p className="font-semibold text-blue-800">Réintégration des amortissements :</p>
                      <p>Amortissements totaux théoriques : {formatCurrency(Number(investment.accumulatedDepreciation) || 0)}</p>
                      <p className="font-bold text-blue-700">Amortissements effectivement utilisés : {formatCurrency(calculateUsedAmortizationTotal(exampleYear))}</p>
                      
                      {/* Recalculer ces valeurs avec la même méthode que dans le tableau pour assurer la cohérence */}
                      {(() => {
                        // Prix d'acquisition corrigé
                        const correctedPurchasePrice = 
                          (Number(investment.purchasePrice) || 0) + 
                          (Number(investment.notaryFees) || 0) + 
                          (Number(investment.agencyFees) || 0) + 
                          (Number(investment.improvementWorks) || 0);
                        
                        // Prix de vente net après déduction des frais d'agence
                        const netSellingPrice = saleTable.revaluedValues[0] - saleParams.agencyFees;
                        
                        // Plus-value brute pour cette année
                        const plusValue = Math.max(0, netSellingPrice - correctedPurchasePrice);
                        
                        // Récupérer les amortissements utilisés
                        const usedAmortizationTotal = calculateUsedAmortizationTotal(exampleYear);
                        
                        // Les amortissements sont imposés au taux marginal, dans la limite de la plus-value
                        const depreciationTaxable = Math.min(usedAmortizationTotal, plusValue);
                        const depreciationTax = depreciationTaxable * (Number(investment.taxParameters.taxRate) / 100);
                        
                        return (
                          <>
                            <p>Amortissements réintégrés dans la plus-value : {formatCurrency(depreciationTaxable)}</p>
                            <p>Taux marginal d'imposition : {investment.taxParameters.taxRate}%</p>
                            <p className="font-semibold text-red-600">Impôt sur les amortissements : {formatCurrency(depreciationTax)}</p>
                            
                            {Math.abs(depreciationTaxable - (results.depreciationTaxable || 0)) > 1 && (
                              <div className="bg-yellow-50 p-3 rounded mt-2 text-sm">
                                <p><strong>Note :</strong> Le montant calculé ici ({formatCurrency(depreciationTaxable)}) peut différer légèrement de celui dans les résultats globaux ({formatCurrency(results.depreciationTaxable || 0)}) car ils sont calculés avec des méthodes différentes. Les valeurs affichées dans le tableau utilisent la méthode de calcul la plus précise.</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      
                      <div className="bg-blue-50 p-3 rounded mt-2 text-sm">
                        <p><strong>Note :</strong> Ces amortissements, qui ont réduit votre impôt pendant la période de location, sont maintenant récupérés par l'administration fiscale à votre taux marginal d'imposition (et non au taux de 19% comme la plus-value immobilière classique).</p>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <p className="font-bold text-red-600 mt-4 text-lg">Total impôt sur la plus-value : {formatCurrency(results.totalTax)}</p>
              <p className="font-bold text-emerald-600">Plus-value nette après impôt : {formatCurrency(results.netCapitalGain)}</p>
            </div>
          </div>
        );
      
      default:
        return "Sélectionnez un régime fiscal pour voir les explications.";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Formulaire des paramètres retiré: la sidebar pilote ces valeurs */}

      {/* Graphique d'évolution du solde */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold mb-4">Évolution du solde après revente selon le régime fiscal</h3>
        <div className="h-96">
          <Line 
            data={{
              labels: saleTable.years,
              datasets: Object.entries(REGIME_LABELS).map(([regime, label], index) => {
                const colors = [
                  'rgba(59, 130, 246, 0.7)', // blue
                  'rgba(16, 185, 129, 0.7)', // green
                  'rgba(139, 92, 246, 0.7)', // purple
                  'rgba(245, 158, 11, 0.7)'  // yellow
                ];
                return {
                  label,
                  data: saleTable.years.map((year, yearIndex) => {
                    return calculateBalance(yearIndex, regime as TaxRegime);
                  }),
                  borderColor: colors[index],
                  backgroundColor: colors[index].replace('0.7', '0.1'),
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4
                };
              })
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: true,
                  text: 'Évolution du solde après revente'
                },
                tooltip: {
                  callbacks: {
                    label: function(context: any) {
                      return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: false,
                  ticks: {
                    callback: function(value: any) {
                      return formatCurrency(value);
                    }
                  }
                }
              }
            }}
          />
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-md text-sm">
          <p><strong>Note :</strong> Ce graphique montre le solde que vous obtiendriez après la revente pour chaque année, en tenant compte des frais de vente, des impôts sur la plus-value et du capital restant dû. Il permet de comparer l'impact fiscal des différents régimes sur le solde net.</p>
        </div>
      </div>

      {/* Tableau des résultats */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Résultats de la revente</h3>
          
          {/* Navigation des onglets */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {Object.entries(REGIME_LABELS).map(([regime, label]) => (
                <button
                  key={regime}
                  type="button"
                  onClick={() => setSelectedRegime(regime as TaxRegime)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${selectedRegime === regime
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Année
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capital restant dû
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bien revalorisé
                  </th>
                  {selectedRegime === 'micro-foncier' || selectedRegime === 'reel-foncier' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plus-value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Abattement IR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Abattement PS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Imposition
                      </th>
                    </>
                  ) : null}
                  {selectedRegime === 'micro-bic' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plus-value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Abattement IR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Abattement PS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Imposition
                      </th>
                    </>
                  ) : null}
                  {selectedRegime === 'reel-bic' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plus-value
                      </th>
                      {!investment.isLMP && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Abattement IR
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Abattement PS
                          </th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Imposition
                      </th>
                    </>
                  ) : null}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solde
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {saleTable.years.map((year, index) => {
                  // Calculer l'impôt sur la plus-value pour le régime sélectionné
                  const { totalTax, incomeTax, socialCharges, depreciationTax } = calculateCapitalGainTax(selectedRegime, year, index);
                  
                  // Calculer le solde selon la nouvelle formule
                  const balance = calculateBalance(index, selectedRegime);
                  
                  // Calculer la plus-value brute
                  const rawPlusValue = calculateRawPlusValue(index);
                  
                  // Calculer les pourcentages d'abattement
                  const { abattementIR, abattementPS } = calculateAbattements(year);
                  
                  return (
                    <tr key={year}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(saleTable.yearlyBalances[index])}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(saleTable.revaluedValues[index])}
                      </td>
                      {selectedRegime === 'micro-foncier' || selectedRegime === 'reel-foncier' ? (
                        <>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            rawPlusValue >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(rawPlusValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatPercent(abattementIR)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatPercent(abattementPS)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {totalTax > 0 ? (
                              <div>
                                <div className="text-sm font-medium">{formatCurrency(totalTax)}</div>
                                <div className="text-xs text-gray-400">
                                  IR: {formatCurrency(incomeTax)} + PS: {formatCurrency(socialCharges)}
                                </div>
                              </div>
                            ) : (
                              formatCurrency(0)
                            )}
                          </td>
                        </>
                      ) : null}
                      {selectedRegime === 'micro-bic' ? (
                        <>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            rawPlusValue >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(rawPlusValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatPercent(abattementIR)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatPercent(abattementPS)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {totalTax > 0 ? (
                              <div>
                                <div className="text-sm font-medium">{formatCurrency(totalTax)}</div>
                                <div className="text-xs text-gray-400">
                                  IR: {formatCurrency(incomeTax)} + PS: {formatCurrency(socialCharges)}
                                </div>
                              </div>
                            ) : (
                              formatCurrency(0)
                            )}
                          </td>
                        </>
                      ) : null}
                      {selectedRegime === 'reel-bic' ? (
                        <>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            rawPlusValue >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(rawPlusValue)}
                          </td>
                          {!investment.isLMP && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatPercent(abattementIR)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatPercent(abattementPS)}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {totalTax > 0 ? (
                              <div>
                                <div className="text-sm font-medium">{formatCurrency(totalTax)}</div>
                                <div className="text-xs text-gray-400">
                                  IR: {formatCurrency(incomeTax - (depreciationTax || 0))} + PS: {formatCurrency(socialCharges)}
                                  {depreciationTax ? ` + Réint.: ${formatCurrency(depreciationTax)}` : ''}
                                </div>
                              </div>
                            ) : (
                              formatCurrency(0)
                            )}
                          </td>
                        </>
                      ) : null}
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                        balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Section du calcul de plus-value avec explication */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Calcul de la plus-value immobilière</h3>
        <div className="mt-4">
          {getRegimeExplanation(selectedRegime)}
        </div>
      </div>
    </div>
  );
} 