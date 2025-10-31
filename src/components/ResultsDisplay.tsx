/**
 * Composant ResultsDisplay
 * 
 * Ce composant affiche l'analyse de rentabilité détaillée d'un investissement immobilier.
 * Il permet de comparer les différents régimes fiscaux (micro-foncier, réel-foncier, micro-BIC, réel-BIC)
 * et fournit une vue complète des performances financières.
 * 
 * Fonctionnalités principales :
 * - Affichage des graphiques d'évolution de la rentabilité (brute et nette)
 * - Tableau détaillé des résultats par année
 * - Comparaison des différents régimes fiscaux
 * - Calcul et affichage des métriques clés (rendement brut, hors impôts, charges)
 * - Persistance de la sélection du régime fiscal dans le localStorage
 * 
 * Le composant utilise Chart.js pour les visualisations et fournit une interface
 * interactive permettant de basculer entre les différents régimes fiscaux.
 */

import { useState, useEffect } from 'react';
import { Investment, FinancialMetrics, TaxResults } from '../types/investment';
import { TaxRegime } from '../types/tax';
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
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  metrics: FinancialMetrics;
  investment: Investment;
  onUpdate: (updatedInvestment: Investment) => void;
  currentYearData?: {
    rent: number;
    expenses: number;
    totalInvestmentCost: number;
  };
  historicalData?: {
    years: number[];
    cashFlow: number[];
    revenue: number[];
  };
  projectionData?: {
    years: number[];
    cashFlow: number[];
    revenue: number[];
  };
}

const REGIME_LABELS: Record<TaxRegime, string> = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};


export default function ResultsDisplay({ investment }: Props) {
  // État pour le régime fiscal sélectionné, initialisé depuis le localStorage
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(() => {
    const stored = localStorage.getItem(`selectedRegime_${investment.purchasePrice}_${investment.startDate}`);
    return (stored as TaxRegime) || investment.selectedRegime || 'micro-foncier';
  });

  // Créer un identifiant unique basé sur le prix d'achat et la date de début
  const investmentId = `${investment.purchasePrice}_${investment.startDate}`;

  // Sauvegarde du régime sélectionné dans le localStorage
  useEffect(() => {
    localStorage.setItem(`selectedRegime_${investmentId}`, selectedRegime);
  }, [selectedRegime, investmentId]);

  // Mettre à jour le régime sélectionné si l'investissement change
  useEffect(() => {
    setSelectedRegime(investment.selectedRegime || 'micro-foncier');
  }, [investment.selectedRegime]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' %';

  const calculateTotalCharges = (yearExpense: any) => {
    return Number(yearExpense?.propertyTax || 0) +         // Taxe foncière
           Number(yearExpense?.condoFees || 0) +           // Charges copropriété
           Number(yearExpense?.propertyInsurance || 0) +   // Assurance propriétaire
           Number(yearExpense?.managementFees || 0) +      // Frais d'agence
           Number(yearExpense?.unpaidRentInsurance || 0) + // Assurance loyers impayés
           Number(yearExpense?.repairs || 0) +             // Travaux
           Number(yearExpense?.otherDeductible || 0) +     // Autres (déductibles)
           Number(yearExpense?.otherNonDeductible || 0) -  // Autres (non déductibles)
           Number(yearExpense?.tenantCharges || 0);        // Moins charges locataires
  };

  const renderProfitabilityTable = (regime: TaxRegime) => {
    // Calculer le coût total de l'investissement
    const totalCost = Number(investment.purchasePrice || 0) +
                     Number(investment.agencyFees || 0) +
                     Number(investment.notaryFees || 0) +
                     Number(investment.bankFees || 0) +
                     Number(investment.bankGuaranteeFees || 0) +
                     Number(investment.mandatoryDiagnostics || 0) +
                     Number(investment.renovationCosts || 0);

    // Générer les années du projet
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );

    // Plus de calculs liés à l'imposition pour ce tableau

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Année
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenus bruts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Charges
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coût total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rentabilité brute
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rentabilité hors impôts
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {years.map(year => {
              const yearExpense = investment.expenses.find(e => e.year === year);
              
              const rent = Number(yearExpense?.rent || 0);
              const furnishedRent = Number(yearExpense?.furnishedRent || 0);
              const taxBenefit = Number(yearExpense?.taxBenefit || 0);
              const grossRevenue = (regime === 'micro-bic' || regime === 'reel-bic') 
                ? furnishedRent 
                : rent + taxBenefit;
              const totalCharges = calculateTotalCharges(yearExpense);
              
              const grossYield = (grossRevenue / totalCost) * 100;
              const netYield = ((grossRevenue - totalCharges) / totalCost) * 100;

              return (
                <tr key={year}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(grossRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(totalCharges)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatPercent(grossYield)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatPercent(netYield)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const handleRegimeChange = (regime: TaxRegime) => {
    setSelectedRegime(regime);
  };

  const prepareChartData = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );

    const totalCost = Number(investment.purchasePrice || 0) +
                     Number(investment.agencyFees || 0) +
                     Number(investment.notaryFees || 0) +
                     Number(investment.bankFees || 0) +
                     Number(investment.bankGuaranteeFees || 0) +
                     Number(investment.mandatoryDiagnostics || 0) +
                     Number(investment.renovationCosts || 0);

    // Plus de calculs fiscaux nécessaires pour les graphiques hors impôts
    // Plus de résultats fiscaux requis pour le calcul hors impôts

    const datasets = (Object.keys(REGIME_LABELS) as TaxRegime[]).map(regime => {
      const data = years.map(year => {
        const yearExpense = investment.expenses.find(e => e.year === year);
        
        const rent = Number(yearExpense?.rent || 0);
        const furnishedRent = Number(yearExpense?.furnishedRent || 0);
        const taxBenefit = Number(yearExpense?.taxBenefit || 0);
        const grossRevenue = (regime === 'micro-bic' || regime === 'reel-bic') 
          ? furnishedRent 
          : rent + taxBenefit;
        const totalCharges = calculateTotalCharges(yearExpense);
        return {
          grossYield: (grossRevenue / totalCost) * 100,
          netYield: ((grossRevenue - totalCharges) / totalCost) * 100
        };
      });

      return {
        label: REGIME_LABELS[regime],
        data: data,
        borderColor: getRegimeColor(regime),
        backgroundColor: getRegimeColor(regime, 0.1),
        tension: 0.4
      };
    });

    return {
      labels: years,
      datasets
    };
  };

  const getRegimeColor = (regime: TaxRegime, alpha: number = 1) => {
    const colors = {
      'micro-foncier': `rgba(59, 130, 246, ${alpha})`, // blue
      'reel-foncier': `rgba(16, 185, 129, ${alpha})`, // emerald
      'micro-bic': `rgba(245, 158, 11, ${alpha})`,    // yellow
      'reel-bic': `rgba(239, 68, 68, ${alpha})`       // red
    };
    return colors[regime];
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
        text: 'Évolution de la rentabilité'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatPercent(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatPercent(value);
          }
        }
      }
    }
  };

  const chartData = prepareChartData();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Évolution de la rentabilité brute</h3>
          <div className="h-80">
            <Line 
              data={{
                labels: chartData.labels,
                datasets: chartData.datasets.map(dataset => ({
                  ...dataset,
                  data: dataset.data.map(d => d.grossYield)
                }))
              }}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    ...chartOptions.plugins.title,
                    text: 'Évolution de la rentabilité brute'
                  }
                }
              }}
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Évolution de la rentabilité hors impôts</h3>
          <div className="h-80">
            <Line 
              data={{
                labels: chartData.labels,
                datasets: chartData.datasets.map(dataset => ({
                  ...dataset,
                  data: dataset.data.map(d => d.netYield)
                }))
              }}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    ...chartOptions.plugins.title,
                    text: 'Évolution de la rentabilité hors impôts'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Onglets des régimes */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            {(Object.keys(REGIME_LABELS) as TaxRegime[]).map((regime) => (
              <div
                key={regime}
                onClick={() => handleRegimeChange(regime)}
                className={`
                  flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm cursor-pointer
                  ${selectedRegime === regime
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {REGIME_LABELS[regime]}
              </div>
            ))}
          </nav>
        </div>

        {/* Contenu de l'onglet */}
        <div className="p-6">
          {renderProfitabilityTable(selectedRegime)}
          
          {/* Section explicative */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Détail des calculs</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Revenus bruts</h4>
                <p className="text-sm text-gray-600">
                  {selectedRegime === 'micro-bic' || selectedRegime === 'reel-bic' 
                    ? 'Loyer meublé'
                    : 'Loyer nu + Aide fiscale'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Charges</h4>
                <p className="text-sm text-gray-600">
                  Somme des charges déductibles et non déductibles :
                  <ul className="list-disc ml-6 mt-2">
                    <li>Taxe foncière</li>
                    <li>Charges de copropriété</li>
                    <li>Assurance propriétaire</li>
                    <li>Frais d'agence</li>
                    <li>Assurance loyers impayés</li>
                    <li>Travaux</li>
                    <li>Autres charges déductibles</li>
                    <li>Autres charges non déductibles</li>
                    <li className="text-red-600">- Charges locataires</li>
                  </ul>
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Coût total</h4>
                <p className="text-sm text-gray-600">
                  Somme des coûts d'acquisition :
                  <ul className="list-disc ml-6 mt-2">
                    <li>Prix d'achat</li>
                    <li>Frais d'agence</li>
                    <li>Frais de notaire</li>
                    <li>Frais bancaires</li>
                    <li>Frais de garantie bancaire</li>
                    <li>Diagnostics obligatoires</li>
                    <li>Coûts de rénovation</li>
                  </ul>
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Rentabilité brute</h4>
                <p className="text-sm text-gray-600">
                  (Revenus bruts / Coût total) × 100
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Rentabilité hors impôts</h4>
                <p className="text-sm text-gray-600">
                  ((Revenus bruts - Charges) / Coût total) × 100
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}