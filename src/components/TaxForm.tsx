/**
 * Composant TaxForm
 * 
 * Ce composant gère la partie fiscale d'un investissement immobilier. Il permet de :
 * 1. Configurer les paramètres fiscaux (taux d'imposition, prélèvements sociaux, etc.)
 * 2. Comparer les différents régimes fiscaux (micro-foncier, réel, LMNP, etc.)
 * 3. Visualiser les projections fiscales sur plusieurs années
 * 
 * Fonctionnalités principales :
 * - Calcul automatique des impôts selon le régime choisi
 * - Comparaison visuelle des régimes via graphiques
 * - Projection des revenus et charges sur plusieurs années
 * - Gestion des amortissements pour le régime LMNP
 * 
 * Les calculs prennent en compte :
 * - Les revenus locatifs (nus et meublés)
 * - Les charges déductibles
 * - Les amortissements
 * - Les déficits reportables
 * - Les prélèvements sociaux
 */

import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { HelpCircle, Info, Award, ChevronDown, ChevronUp, Calculator, X } from 'lucide-react';
import { Investment, TaxRegime, TaxResults, YearlyExpenses } from '../types/investment';
import { calculateAllTaxRegimes, getRecommendedRegime } from '../utils/taxCalculations';

interface Props {
  investment: Investment;
  onUpdate: (updatedInvestment: Investment) => void;
  currentSubTab: 'annee-courante' | 'historique-projection';
}

const REGIME_LABELS: { [key in TaxRegime]: string } = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};

export default function TaxForm({ investment, onUpdate, currentSubTab }: Props) {
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(investment.selectedRegime || 'micro-foncier');
  const [projectionRegime, setProjectionRegime] = useState<TaxRegime>('micro-foncier');
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [calculationDetailModal, setCalculationDetailModal] = useState<{
    isOpen: boolean;
    year: number;
    regime: TaxRegime;
    results: TaxResults;
    yearExpenses: YearlyExpenses;
  } | null>(null);
  const currentYear = new Date().getFullYear();
  
  // Utiliser l'année effective (dans la période du bien)
  const projectStartYear = new Date(investment.projectStartDate).getFullYear();
  const projectEndYear = new Date(investment.projectEndDate).getFullYear();
  const effectiveYear = Math.max(projectStartYear, Math.min(currentYear, projectEndYear));
  
  // Calculer le régime recommandé pour l'année effective
  const recommendedRegime = getRecommendedRegime(investment, effectiveYear);

  // Mise à jour des résultats fiscaux à chaque changement de paramètres
  useEffect(() => {
    const results = calculateAllTaxRegimes(investment, effectiveYear);
    
    onUpdate({
      ...investment,
      selectedRegime: selectedRegime,
      taxRegime: selectedRegime,
      taxResults: results
    });
  }, [investment.taxParameters, selectedRegime, effectiveYear, investment.expenses]);

  // Synchronisation avec la sélection provenant de l'extérieur (sidebar)
  useEffect(() => {
    if (investment.selectedRegime && investment.selectedRegime !== selectedRegime) {
      setSelectedRegime(investment.selectedRegime);
    }
  }, [investment.selectedRegime]);

  // Synchronisation de projectionRegime avec selectedRegime
  useEffect(() => {
    setProjectionRegime(selectedRegime);
  }, [selectedRegime]);

  // Synchronisation des revenus avec les paramètres fiscaux
  useEffect(() => {
    const effectiveYearExpense = investment.expenses.find(e => e.year === effectiveYear);
    if (effectiveYearExpense && (!investment.taxParameters.rent || !investment.taxParameters.furnishedRent || !investment.taxParameters.tenantCharges || !investment.taxParameters.taxBenefit)) {
      onUpdate({
        ...investment,
        taxParameters: {
          ...investment.taxParameters,
          rent: effectiveYearExpense.rent || 0,
          furnishedRent: effectiveYearExpense.furnishedRent || 0,
          tenantCharges: effectiveYearExpense.tenantCharges || 0,
          taxBenefit: effectiveYearExpense.taxBenefit || 0
        }
      });
    }
  }, [effectiveYear, investment.expenses]);

  // Gestionnaires d'événements pour les changements de paramètres
  const handleTaxParameterChange = (field: keyof Investment['taxParameters'], value: number) => {
    onUpdate({
      ...investment,
      taxParameters: {
        ...investment.taxParameters,
        [field]: value
      }
    });
  };

  const handleExpenseProjectionChange = (field: keyof Investment['expenseProjection'], value: number) => {
    onUpdate({
      ...investment,
      expenseProjection: {
        ...investment.expenseProjection,
        [field]: value
      }
    });
  };

  // Formatage des montants en euros
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  // Calcul de la couverture d'une année (pour les années partielles)
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

  // Ajustement d'une valeur pour la couverture d'année
  const adjustForCoverage = (value: number, year: number): number => {
    const coverage = getYearCoverage(year);
    return Number((Number(value || 0) * coverage).toFixed(2));
  };

  // Détection d'une année partielle
  const isPartialYear = (year: number): boolean => {
    const coverage = getYearCoverage(year);
    return coverage > 0 && coverage < 1;
  };

  // Données pour le graphique de comparaison
  const chartData = {
    labels: Object.values(REGIME_LABELS),
    datasets: [
      {
        label: 'Revenu net',
        data: Object.values(investment.taxResults).map(result => result.netIncome),
        backgroundColor: 'rgba(16, 185, 129, 0.5)', // emerald
      },
      {
        label: 'Impôt sur le revenu',
        data: Object.values(investment.taxResults).map(result => result.tax),
        backgroundColor: 'rgba(239, 68, 68, 0.5)', // red
      },
      {
        label: 'Prélèvements sociaux',
        data: Object.values(investment.taxResults).map(result => result.socialCharges),
        backgroundColor: 'rgba(245, 158, 11, 0.5)', // yellow
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Comparaison des régimes fiscaux'
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
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const handleProjectionRegimeChange = (regime: TaxRegime) => {
    setProjectionRegime(regime);
  };

  const renderHistoricalAndProjectionTable = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const rows = [];

    // On va stocker les résultats de l'année précédente pour les utiliser dans le calcul de l'année suivante
    let previousYearResults: Record<TaxRegime, TaxResults> | undefined;

    for (let year = startYear; year <= endYear; year++) {
      // On passe les résultats de l'année précédente à calculateAllTaxRegimes
      const yearResults = calculateAllTaxRegimes(investment, year, previousYearResults);
      const yearExpense = investment.expenses.find(e => e.year === year);
      
      if (!yearExpense) continue;

      rows.push(
        <tr key={year} className={`${year === currentYear ? 'bg-blue-50' : ''} ${isPartialYear(year) ? 'bg-amber-50' : ''}`}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            <div className="flex items-center gap-2">
              <span>{year}</span>
              {isPartialYear(year) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">partiel</span>
              )}
            </div>
          </td>
          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
            <button
              onClick={() => {
                if (yearExpense) {
                  setCalculationDetailModal({
                    isOpen: true,
                    year,
                    regime: projectionRegime,
                    results: yearResults[projectionRegime],
                    yearExpenses: yearExpense
                  });
                }
              }}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
              aria-label="Voir le détail du calcul"
              title="Voir le détail du calcul"
            >
              <Calculator className="h-5 w-5" />
            </button>
          </td>
          {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(yearExpense.rent || 0, year))}
            </td>
          )}
          {(projectionRegime === 'micro-bic' || projectionRegime === 'reel-bic') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(yearExpense.furnishedRent || 0, year))}
            </td>
          )}
          {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(yearExpense.tenantCharges || 0, year))}
            </td>
          )}
          {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(adjustForCoverage(yearExpense.taxBenefit || 0, year))}
            </td>
          )}
          {projectionRegime === 'reel-foncier' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-foncier'].deductibleExpenses || 0)}
            </td>
          )}
          {projectionRegime === 'reel-foncier' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-foncier'].usedDeficit || 0)}
            </td>
          )}
          {projectionRegime === 'reel-foncier' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-foncier'].deficit || 0)}
            </td>
          )}
          {projectionRegime === 'reel-bic' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-bic'].deductibleExpenses || 0)}
            </td>
          )}
          {projectionRegime === 'reel-bic' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-bic'].amortization?.total || 0)}
            </td>
          )}
          {projectionRegime === 'reel-bic' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-bic'].amortization?.used || 0)}
            </td>
          )}
          {projectionRegime === 'reel-bic' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-bic'].amortization?.carriedForward || 0)}
            </td>
          )}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearResults[projectionRegime].taxableIncome)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {yearResults[projectionRegime].totalTax > 0 ? (
              <div>
                <div className="text-sm font-medium">{formatCurrency(yearResults[projectionRegime].totalTax)}</div>
                <div className="text-xs text-gray-400">
                  IR: {formatCurrency(yearResults[projectionRegime].tax)} + PS: {formatCurrency(yearResults[projectionRegime].socialCharges)}
                </div>
              </div>
            ) : (
              formatCurrency(0)
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearResults[projectionRegime].netIncome)}
          </td>
        </tr>
      );

      // On stocke les résultats de cette année pour les utiliser l'année suivante
      previousYearResults = yearResults;
    }

    // Composant pour les en-têtes de colonnes avec tooltip
    const TableHeader = ({ label, tooltip }: { label: string; tooltip?: string }) => (
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="flex items-center gap-1">
          {label}
          {tooltip && (
            <div className="group relative inline-block">
              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-normal z-50 shadow-xl normal-case">
                {tooltip}
              </div>
            </div>
          )}
        </div>
      </th>
    );

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <TableHeader label="Année" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <Calculator className="h-4 w-4 text-blue-600" />
                </div>
              </th>
              {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
                <TableHeader 
                  label="Loyer nu" 
                  tooltip="Loyers perçus en location nue (non meublée)" 
                />
              )}
              {(projectionRegime === 'micro-bic' || projectionRegime === 'reel-bic') && (
                <TableHeader 
                  label="Loyer meublé" 
                  tooltip="Loyers perçus en location meublée (LMNP)" 
                />
              )}
              {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
                <TableHeader 
                  label="Charges locataires" 
                  tooltip="Charges récupérables auprès du locataire (eau, ordures ménagères, etc.)" 
                />
              )}
              {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
                <TableHeader 
                  label="Aide fiscale" 
                  tooltip="Avantages fiscaux (Pinel, Denormandie, etc.)" 
                />
              )}
              {projectionRegime === 'reel-foncier' && (
                <TableHeader 
                  label="Charges déductibles" 
                  tooltip="Total des charges déductibles (taxe foncière, intérêts d'emprunt, travaux, etc.)" 
                />
              )}
              {projectionRegime === 'reel-foncier' && (
                <TableHeader 
                  label="Déficit utilisé" 
                  tooltip="Déficit des années précédentes utilisé cette année pour réduire l'impôt" 
                />
              )}
              {projectionRegime === 'reel-foncier' && (
                <TableHeader 
                  label="Déficit reporté" 
                  tooltip="Déficit reportable sur les 10 prochaines années" 
                />
              )}
              {projectionRegime === 'reel-bic' && (
                <TableHeader 
                  label="Charges déductibles" 
                  tooltip="Total des charges déductibles (hors amortissements)" 
                />
              )}
              {projectionRegime === 'reel-bic' && (
                <TableHeader 
                  label="Amortissement disponible" 
                  tooltip="Amortissement annuel calculé (bien + mobilier + travaux)" 
                />
              )}
              {projectionRegime === 'reel-bic' && (
                <TableHeader 
                  label="Amortissement utilisé" 
                  tooltip="Part de l'amortissement effectivement déduite cette année" 
                />
              )}
              {projectionRegime === 'reel-bic' && (
                <TableHeader 
                  label="Amortissement reporté" 
                  tooltip="Amortissement non utilisé, reportable sans limite de durée" 
                />
              )}
              <TableHeader 
                label="Revenu imposable" 
                tooltip="Montant sur lequel sont calculés l'impôt et les prélèvements sociaux" 
              />
              <TableHeader 
                label="Imposition" 
                tooltip="Total de l'impôt sur le revenu (IR) + prélèvements sociaux (PS)" 
              />
              <TableHeader 
                label="Revenu net" 
                tooltip="Revenu après impôts et prélèvements sociaux" 
              />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows}
          </tbody>
        </table>
      </div>
    );
  };

  // Calculer les totaux cumulés pour chaque régime
  const calculateCumulativeTotals = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const totals: Record<TaxRegime, { netIncome: number; tax: number; socialCharges: number }> = {
      'micro-foncier': { netIncome: 0, tax: 0, socialCharges: 0 },
      'reel-foncier': { netIncome: 0, tax: 0, socialCharges: 0 },
      'micro-bic': { netIncome: 0, tax: 0, socialCharges: 0 },
      'reel-bic': { netIncome: 0, tax: 0, socialCharges: 0 }
    };

    // On garde les résultats de l'année précédente pour chaque régime
    const previousResults: Record<TaxRegime, TaxResults> = {
      'micro-foncier': {} as TaxResults,
      'reel-foncier': {} as TaxResults,
      'micro-bic': {} as TaxResults,
      'reel-bic': {} as TaxResults
    };

    for (let year = startYear; year <= endYear; year++) {
      // On calcule les résultats de l'année en utilisant les résultats de l'année précédente
      const yearResults = calculateAllTaxRegimes(investment, year, previousResults);
      
      // On met à jour les totaux
      Object.keys(totals).forEach(regime => {
        const regimeType = regime as TaxRegime;
        totals[regimeType].netIncome += yearResults[regimeType].netIncome;
        totals[regimeType].tax += yearResults[regimeType].tax;
        totals[regimeType].socialCharges += yearResults[regimeType].socialCharges;
      });

      // On sauvegarde les résultats pour l'année suivante
      Object.keys(previousResults).forEach(regime => {
        previousResults[regime as TaxRegime] = yearResults[regime as TaxRegime];
      });
    }

    return totals;
  };

  // Données pour le graphique de comparaison des totaux cumulés
  const cumulativeTotals = calculateCumulativeTotals();
  const cumulativeChartData = {
    labels: Object.values(REGIME_LABELS),
    datasets: [
      {
        label: 'Revenu net total',
        data: Object.values(cumulativeTotals).map(result => result.netIncome),
        backgroundColor: 'rgba(16, 185, 129, 0.5)', // emerald
      },
      {
        label: 'Impôt sur le revenu total',
        data: Object.values(cumulativeTotals).map(result => result.tax),
        backgroundColor: 'rgba(239, 68, 68, 0.5)', // red
      },
      {
        label: 'Prélèvements sociaux totaux',
        data: Object.values(cumulativeTotals).map(result => result.socialCharges),
        backgroundColor: 'rgba(245, 158, 11, 0.5)', // yellow
      }
    ]
  };

  const cumulativeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Comparaison des régimes fiscaux - Totaux cumulés'
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
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  // Données pour le graphique d'évolution des revenus nets
  const netIncomeEvolutionData = {
    labels: (() => {
      const startYear = new Date(investment.projectStartDate).getFullYear();
      const endYear = new Date(investment.projectEndDate).getFullYear();
      return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    })(),
    datasets: Object.entries(REGIME_LABELS).map(([regime, label], index) => {
      const colors = [
        'rgba(59, 130, 246, 0.5)', // blue
        'rgba(16, 185, 129, 0.5)', // green
        'rgba(139, 92, 246, 0.5)', // purple
        'rgba(245, 158, 11, 0.5)'  // yellow
      ];
      
      // On recalcule les revenus nets pour chaque année pour s'assurer d'utiliser les bonnes valeurs
      const startYear = new Date(investment.projectStartDate).getFullYear();
      const endYear = new Date(investment.projectEndDate).getFullYear();
      
      // On garde les résultats de l'année précédente pour chaque régime
      let previousYearResults: Record<TaxRegime, TaxResults> | undefined;
      
      const netIncomeData = [];
      for (let year = startYear; year <= endYear; year++) {
        // On calcule avec les résultats de l'année précédente
        const yearResults = calculateAllTaxRegimes(investment, year, previousYearResults);
        const taxResults = yearResults[regime as TaxRegime];
        netIncomeData.push(taxResults?.netIncome || 0);
                        
        // On sauvegarde les résultats pour l'année suivante
        previousYearResults = yearResults;
      }
      
      return {
        label,
        data: netIncomeData,
        borderColor: colors[index],
        backgroundColor: colors[index],
        fill: false,
        tension: 0.4
      };
    })
  };
  
    const netIncomeEvolutionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Évolution des revenus nets par régime'
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
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  // Composant Tooltip Helper
  const Tooltip = ({ content }: { content: string }) => (
    <div className="group relative inline-block ml-1">
      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help inline" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-80 bg-gray-900 text-white text-xs rounded-lg p-3 whitespace-pre-line z-50 shadow-xl">
        {content}
      </div>
    </div>
  );

  // Composant Modal de détails de calcul
  const CalculationDetailModal = () => {
    if (!calculationDetailModal?.isOpen || !calculationDetailModal) return null;

    const { year, regime, results, yearExpenses } = calculationDetailModal;
    const coverage = getYearCoverage(year);
    const vacancyRate = investment.expenseProjection?.vacancyRate || 0;
    const taxRate = investment.taxParameters.taxRate;
    const socialChargesRate = investment.taxParameters.socialChargesRate;

    const renderCalculationDetails = () => {
      switch (regime) {
        case 'micro-foncier': {
          const rent = adjustForCoverage(yearExpenses.rent || 0, year);
          const rentWithVacancy = rent * (1 - vacancyRate / 100);
          const abatement = rentWithVacancy * 0.3;
          const taxableIncome = rentWithVacancy * 0.7;
          
          return (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Principe du Micro-foncier</h4>
                <p className="text-sm text-blue-800">
                  Le régime micro-foncier applique un abattement forfaitaire de <strong>30%</strong> sur les loyers perçus.
                  Vous êtes imposé sur les 70% restants.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-gray-600">1. Loyer annuel</p>
                  <p className="text-lg font-semibold">{formatCurrency(rent)}</p>
                  {isPartialYear(year) && (
                    <p className="text-xs text-amber-600">⚠️ Année partielle - couverture: {(coverage * 100).toFixed(1)}%</p>
                  )}
                </div>

                {vacancyRate > 0 && (
                  <>
                    <div className="text-center text-gray-400">↓</div>
                    <div className="border-l-4 border-orange-500 pl-4">
                      <p className="text-sm text-gray-600">2. Ajustement vacance locative (-{vacancyRate}%)</p>
                      <p className="text-lg font-semibold">{formatCurrency(rentWithVacancy)}</p>
                    </div>
                  </>
                )}

                <div className="text-center text-gray-400">↓</div>
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-sm text-gray-600">3. Abattement forfaitaire (30%)</p>
                  <p className="text-lg font-semibold text-green-600">- {formatCurrency(abatement)}</p>
                </div>

                <div className="text-center text-gray-400">↓</div>
                <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-3 rounded">
                  <p className="text-sm text-gray-600">4. Revenu imposable (70% du loyer)</p>
                  <p className="text-xl font-bold text-purple-700">{formatCurrency(taxableIncome)}</p>
                </div>

                <div className="text-center text-gray-400">↓</div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Impôt sur le revenu ({taxRate}%)</span>
                    <span className="font-semibold">{formatCurrency(results.tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Prélèvements sociaux ({socialChargesRate}%)</span>
                    <span className="font-semibold">{formatCurrency(results.socialCharges)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total Imposition</span>
                    <span className="text-xl font-bold text-red-600">{formatCurrency(results.totalTax)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        case 'reel-foncier': {
          const rent = adjustForCoverage(yearExpenses.rent || 0, year);
          const rentWithVacancy = rent * (1 - vacancyRate / 100);
          const deductibleExpenses = results.deductibleExpenses || 0;
          const usedDeficit = results.usedDeficit || 0;
          const carriedForwardDeficit = results.deficit || 0;
          
          return (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Principe du Réel foncier</h4>
                <p className="text-sm text-blue-800">
                  Le régime réel permet de déduire toutes vos <strong>charges réelles</strong> (intérêts d'emprunt, travaux, taxe foncière, etc.).
                  Si les charges dépassent les revenus, vous créez un <strong>déficit foncier</strong> reportable 10 ans.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-gray-600">1. Loyer annuel</p>
                  <p className="text-lg font-semibold">{formatCurrency(rent)}</p>
                  {isPartialYear(year) && (
                    <p className="text-xs text-amber-600">⚠️ Année partielle - couverture: {(coverage * 100).toFixed(1)}%</p>
                  )}
                </div>

                {vacancyRate > 0 && (
                  <>
                    <div className="text-center text-gray-400">↓</div>
                    <div className="border-l-4 border-orange-500 pl-4">
                      <p className="text-sm text-gray-600">2. Ajustement vacance locative (-{vacancyRate}%)</p>
                      <p className="text-lg font-semibold">{formatCurrency(rentWithVacancy)}</p>
                    </div>
                  </>
                )}

                <div className="text-center text-gray-400">↓</div>
                <div className="border-l-4 border-red-500 pl-4">
                  <p className="text-sm text-gray-600">3. Charges déductibles réelles</p>
                  <p className="text-lg font-semibold text-red-600">- {formatCurrency(deductibleExpenses)}</p>
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Voir le détail des charges</summary>
                    <div className="mt-2 text-xs space-y-1 bg-gray-50 p-2 rounded">
                      <div className="flex justify-between"><span>Taxe foncière</span><span>{formatCurrency(adjustForCoverage(yearExpenses.propertyTax || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Charges de copropriété</span><span>{formatCurrency(adjustForCoverage(yearExpenses.condoFees || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Assurance PNO</span><span>{formatCurrency(adjustForCoverage(yearExpenses.propertyInsurance || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Frais de gestion</span><span>{formatCurrency(adjustForCoverage(yearExpenses.managementFees || 0, year))}</span></div>
                      <div className="flex justify-between"><span>GLI</span><span>{formatCurrency(adjustForCoverage(yearExpenses.unpaidRentInsurance || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Travaux et réparations</span><span>{formatCurrency(adjustForCoverage(yearExpenses.repairs || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Intérêts d'emprunt</span><span>{formatCurrency(adjustForCoverage(yearExpenses.interest || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Assurance emprunteur</span><span>{formatCurrency(adjustForCoverage(yearExpenses.loanInsurance || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Autres charges</span><span>{formatCurrency(adjustForCoverage(yearExpenses.otherDeductible || 0, year))}</span></div>
                    </div>
                  </details>
                </div>

                {usedDeficit > 0 && (
                  <>
                    <div className="text-center text-gray-400">↓</div>
                    <div className="border-l-4 border-yellow-500 pl-4">
                      <p className="text-sm text-gray-600">4. Déficit reporté utilisé</p>
                      <p className="text-lg font-semibold text-yellow-600">- {formatCurrency(usedDeficit)}</p>
                      <p className="text-xs text-gray-500 mt-1">Déficit des années précédentes déduit cette année</p>
                    </div>
                  </>
                )}

                <div className="text-center text-gray-400">↓</div>
                <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Revenu imposable</p>
                  <p className="text-xl font-bold text-purple-700">{formatCurrency(results.taxableIncome)}</p>
                </div>

                {carriedForwardDeficit > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800">💡 Déficit reporté</p>
                    <p className="text-lg font-bold text-yellow-700">{formatCurrency(carriedForwardDeficit)}</p>
                    <p className="text-xs text-yellow-600 mt-1">Reportable sur les 10 prochaines années</p>
                  </div>
                )}

                <div className="text-center text-gray-400">↓</div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Impôt sur le revenu ({taxRate}%)</span>
                    <span className="font-semibold">{formatCurrency(results.tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Prélèvements sociaux ({socialChargesRate}%)</span>
                    <span className="font-semibold">{formatCurrency(results.socialCharges)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total Imposition</span>
                    <span className="text-xl font-bold text-red-600">{formatCurrency(results.totalTax)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        case 'micro-bic': {
          const furnishedRent = adjustForCoverage(yearExpenses.furnishedRent || 0, year);
          const rentWithVacancy = furnishedRent * (1 - vacancyRate / 100);
          const abatement = rentWithVacancy * 0.5;
          const taxableIncome = rentWithVacancy * 0.5;
          
          return (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Principe du Micro-BIC (LMNP)</h4>
                <p className="text-sm text-blue-800">
                  Le régime micro-BIC applique un abattement forfaitaire de <strong>50%</strong> sur les loyers perçus en location meublée.
                  Vous êtes imposé sur les 50% restants.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-gray-600">1. Loyer meublé annuel</p>
                  <p className="text-lg font-semibold">{formatCurrency(furnishedRent)}</p>
                  {isPartialYear(year) && (
                    <p className="text-xs text-amber-600">⚠️ Année partielle - couverture: {(coverage * 100).toFixed(1)}%</p>
                  )}
                </div>

                {vacancyRate > 0 && (
                  <>
                    <div className="text-center text-gray-400">↓</div>
                    <div className="border-l-4 border-orange-500 pl-4">
                      <p className="text-sm text-gray-600">2. Ajustement vacance locative (-{vacancyRate}%)</p>
                      <p className="text-lg font-semibold">{formatCurrency(rentWithVacancy)}</p>
                    </div>
                  </>
                )}

                <div className="text-center text-gray-400">↓</div>
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-sm text-gray-600">3. Abattement forfaitaire (50%)</p>
                  <p className="text-lg font-semibold text-green-600">- {formatCurrency(abatement)}</p>
                </div>

                <div className="text-center text-gray-400">↓</div>
                <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-3 rounded">
                  <p className="text-sm text-gray-600">4. Revenu imposable (50% du loyer)</p>
                  <p className="text-xl font-bold text-purple-700">{formatCurrency(taxableIncome)}</p>
                </div>

                <div className="text-center text-gray-400">↓</div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Impôt sur le revenu ({taxRate}%)</span>
                    <span className="font-semibold">{formatCurrency(results.tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Prélèvements sociaux ({socialChargesRate}%)</span>
                    <span className="font-semibold">{formatCurrency(results.socialCharges)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total Imposition</span>
                    <span className="text-xl font-bold text-red-600">{formatCurrency(results.totalTax)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        case 'reel-bic': {
          const furnishedRent = adjustForCoverage(yearExpenses.furnishedRent || 0, year);
          const rentWithVacancy = furnishedRent * (1 - vacancyRate / 100);
          const deductibleExpenses = results.deductibleExpenses || 0;
          const totalAmortization = results.amortization?.total || 0;
          const usedAmortization = results.amortization?.used || 0;
          const carriedForwardAmortization = results.amortization?.carriedForward || 0;
          
          return (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Principe du Réel BIC (LMNP)</h4>
                <p className="text-sm text-blue-800">
                  Le régime réel BIC permet de déduire toutes vos <strong>charges réelles</strong> ET les <strong>amortissements</strong> du bien et du mobilier.
                  C'est le régime le plus avantageux pour les locations meublées ! Les amortissements non utilisés sont reportables sans limite de durée.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-gray-600">1. Loyer meublé annuel</p>
                  <p className="text-lg font-semibold">{formatCurrency(furnishedRent)}</p>
                  {isPartialYear(year) && (
                    <p className="text-xs text-amber-600">⚠️ Année partielle - couverture: {(coverage * 100).toFixed(1)}%</p>
                  )}
                </div>

                {vacancyRate > 0 && (
                  <>
                    <div className="text-center text-gray-400">↓</div>
                    <div className="border-l-4 border-orange-500 pl-4">
                      <p className="text-sm text-gray-600">2. Ajustement vacance locative (-{vacancyRate}%)</p>
                      <p className="text-lg font-semibold">{formatCurrency(rentWithVacancy)}</p>
                    </div>
                  </>
                )}

                <div className="text-center text-gray-400">↓</div>
                <div className="border-l-4 border-red-500 pl-4">
                  <p className="text-sm text-gray-600">3. Charges déductibles réelles</p>
                  <p className="text-lg font-semibold text-red-600">- {formatCurrency(deductibleExpenses)}</p>
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Voir le détail des charges</summary>
                    <div className="mt-2 text-xs space-y-1 bg-gray-50 p-2 rounded">
                      <div className="flex justify-between"><span>Taxe foncière</span><span>{formatCurrency(adjustForCoverage(yearExpenses.propertyTax || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Charges de copropriété</span><span>{formatCurrency(adjustForCoverage(yearExpenses.condoFees || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Assurance PNO</span><span>{formatCurrency(adjustForCoverage(yearExpenses.propertyInsurance || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Frais de gestion</span><span>{formatCurrency(adjustForCoverage(yearExpenses.managementFees || 0, year))}</span></div>
                      <div className="flex justify-between"><span>GLI</span><span>{formatCurrency(adjustForCoverage(yearExpenses.unpaidRentInsurance || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Travaux et réparations</span><span>{formatCurrency(adjustForCoverage(yearExpenses.repairs || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Intérêts d'emprunt</span><span>{formatCurrency(adjustForCoverage(yearExpenses.interest || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Assurance emprunteur</span><span>{formatCurrency(adjustForCoverage(yearExpenses.loanInsurance || 0, year))}</span></div>
                      <div className="flex justify-between"><span>Autres charges</span><span>{formatCurrency(adjustForCoverage(yearExpenses.otherDeductible || 0, year))}</span></div>
                    </div>
                  </details>
                </div>

                <div className="text-center text-gray-400">↓</div>
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-sm text-gray-600">4. Amortissements disponibles</p>
                  <p className="text-lg font-semibold text-green-600">- {formatCurrency(totalAmortization)}</p>
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Voir le détail des amortissements</summary>
                    <div className="mt-2 text-xs space-y-1 bg-gray-50 p-2 rounded">
                      <div className="flex justify-between"><span>Bien immobilier</span><span>{formatCurrency(results.amortization?.building || 0)}</span></div>
                      <div className="flex justify-between"><span>Mobilier</span><span>{formatCurrency(results.amortization?.furniture || 0)}</span></div>
                      <div className="flex justify-between"><span>Travaux</span><span>{formatCurrency(results.amortization?.works || 0)}</span></div>
                      <div className="flex justify-between"><span>Autres</span><span>{formatCurrency(results.amortization?.other || 0)}</span></div>
                    </div>
                  </details>
                  {usedAmortization < totalAmortization && (
                    <div className="mt-2 text-xs bg-yellow-50 p-2 rounded border border-yellow-200">
                      <p className="text-yellow-800">
                        ⚠️ Amortissement utilisé: {formatCurrency(usedAmortization)}<br/>
                        L'amortissement ne peut pas créer de déficit
                      </p>
                    </div>
                  )}
                </div>

                {carriedForwardAmortization > 0 && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">💡 Amortissement reporté</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(carriedForwardAmortization)}</p>
                    <p className="text-xs text-green-600 mt-1">Reportable sans limite de durée !</p>
                  </div>
                )}

                <div className="text-center text-gray-400">↓</div>
                <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Revenu imposable</p>
                  <p className="text-xl font-bold text-purple-700">{formatCurrency(results.taxableIncome)}</p>
                </div>

                <div className="text-center text-gray-400">↓</div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Impôt sur le revenu ({taxRate}%)</span>
                    <span className="font-semibold">{formatCurrency(results.tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Prélèvements sociaux ({socialChargesRate}%)</span>
                    <span className="font-semibold">{formatCurrency(results.socialCharges)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total Imposition</span>
                    <span className="text-xl font-bold text-red-600">{formatCurrency(results.totalTax)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        default:
          return null;
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-blue-600" />
                Détail du calcul de l'imposition
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Année {year} - {REGIME_LABELS[regime]}
              </p>
            </div>
            <button
              onClick={() => setCalculationDetailModal(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          
          <div className="px-6 py-6">
            {renderCalculationDetails()}
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={() => setCalculationDetailModal(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Modal de détails de calcul */}
      <CalculationDetailModal />
      
      {/* Section d'aide en haut de page */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-5 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-2 text-base">
              💡 Comment choisir votre régime fiscal ?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1.5 mb-3">
              <li>• Les graphiques ci-dessous comparent automatiquement les 4 régimes fiscaux disponibles</li>
              <li>• Le régime optimal est celui avec le <strong>revenu net le plus élevé</strong> (en vert)</li>
              <li>• Les régimes "réels" permettent de déduire les charges réelles et créer des déficits</li>
              <li>• Les régimes "micro" appliquent un abattement forfaitaire (30% ou 50%)</li>
            </ul>
            <button
              onClick={() => setIsGlossaryOpen(!isGlossaryOpen)}
              className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
            >
              {isGlossaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {isGlossaryOpen ? 'Masquer le glossaire' : 'Afficher le glossaire fiscal'}
            </button>
          </div>
        </div>
      </div>

      {/* Glossaire fiscal (déroulant) */}
      {isGlossaryOpen && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📚 Glossaire fiscal
          </h4>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-gray-900">Micro-foncier (Location nue) :</dt>
              <dd className="ml-4 text-gray-600">Abattement forfaitaire de 30% sur les loyers perçus. Limité à 15 000€ de revenus annuels. Simple mais moins avantageux si vous avez beaucoup de charges.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Réel foncier (Location nue) :</dt>
              <dd className="ml-4 text-gray-600">Déduction de toutes les charges réelles (intérêts d'emprunt, travaux, etc.). Permet de créer un déficit foncier reportable pendant 10 ans.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Micro-BIC / LMNP (Location meublée) :</dt>
              <dd className="ml-4 text-gray-600">Abattement forfaitaire de 50% sur les loyers de location meublée. Limité à 72 600€ de revenus annuels. Avantageux pour les petits revenus.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Réel BIC / LMNP (Location meublée) :</dt>
              <dd className="ml-4 text-gray-600">Déduction des charges réelles + amortissement du bien immobilier et du mobilier. Permet de réduire fortement voire annuler l'impôt pendant plusieurs années.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Revenu imposable :</dt>
              <dd className="ml-4 text-gray-600">Montant sur lequel vous serez imposé après déduction des charges ou application de l'abattement.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Déficit foncier :</dt>
              <dd className="ml-4 text-gray-600">Lorsque vos charges dépassent vos revenus locatifs. Ce déficit est reportable pendant 10 ans et vient diminuer vos revenus fonciers futurs.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Amortissement (LMNP) :</dt>
              <dd className="ml-4 text-gray-600">Déduction comptable de la perte de valeur du bien et du mobilier répartie sur plusieurs années (20-30 ans pour le bien, 5-10 ans pour le mobilier).</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Prélèvements sociaux :</dt>
              <dd className="ml-4 text-gray-600">Cotisations sociales (17,2%) calculées sur le revenu imposable, en plus de l'impôt sur le revenu.</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Section 1: Année courante */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">Année courante ({currentYear})</h3>
          <Tooltip content="Ce graphique compare les 4 régimes fiscaux pour l'année en cours. Les barres vertes représentent votre revenu net après impôts et prélèvements sociaux. Choisissez le régime avec la barre verte la plus haute !" />
        </div>
        <div className="h-96">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Section 2: Historique et projection */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">Historique et projection</h3>
          <Tooltip content="Visualisez vos résultats fiscaux sur toute la durée de votre investissement. Comparez les totaux cumulés et l'évolution année par année." />
        </div>

        {/* Graphiques de projection */}
        <div className="mt-6 space-y-6">
          {/* Graphique des totaux cumulés */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-medium text-gray-700">Totaux cumulés sur la période</h4>
              <Tooltip content="Ce graphique montre le total cumulé des revenus nets, impôts et prélèvements sociaux sur toute la durée de votre projet. Idéal pour comparer l'impact fiscal global de chaque régime." />
            </div>
            <div className="h-96">
              <Bar data={cumulativeChartData} options={cumulativeChartOptions} />
            </div>
          </div>

          {/* Graphique d'évolution des revenus nets */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-medium text-gray-700">Évolution année par année</h4>
              <Tooltip content="Ce graphique montre l'évolution de votre revenu net fiscal année après année pour chaque régime. Les différences s'expliquent par les déficits reportés (réel foncier) et les amortissements (LMNP réel)." />
            </div>
            <div className="h-96">
              <Line 
                data={netIncomeEvolutionData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Évolution des revenus nets par régime fiscal'
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
          </div>
        </div>

        {/* Sélection du régime juste au-dessus du tableau */}
        <div className="mt-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              Détails par régime fiscal
              <Tooltip content="Sélectionnez un régime pour voir le détail année par année avec toutes les données fiscales (charges, déficits, amortissements, etc.)" />
            </h4>
            {recommendedRegime && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Award className="h-4 w-4" />
                <span className="font-medium">Régime recommandé : {REGIME_LABELS[recommendedRegime]}</span>
              </div>
            )}
          </div>
          <nav className="-mb-px flex space-x-4">
            {Object.entries(REGIME_LABELS).map(([regime, label]) => {
              const isRecommended = regime === recommendedRegime;
              return (
                <button
                  key={regime}
                  type="button"
                  onClick={() => handleProjectionRegimeChange(regime as TaxRegime)}
                  className={`
                    whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm relative
                    ${projectionRegime === regime
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    ${isRecommended ? 'bg-green-50' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {label}
                    {isRecommended && (
                      <Award className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Table de projection */}
        <div className="mt-6">
          {renderHistoricalAndProjectionTable()}
        </div>
      </div>
    </div>
  );
}