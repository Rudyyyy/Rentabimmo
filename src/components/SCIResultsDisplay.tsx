/**
 * Composant SCIResultsDisplay
 * 
 * Ce composant affiche l'analyse de rentabilité spécifique aux biens détenus en SCI.
 * Contrairement aux biens en nom propre, les régimes fiscaux IRPP ne s'appliquent pas.
 * 
 * Fonctionnalités principales :
 * - Comparaison entre location nue et location meublée
 * - Calcul de la rentabilité brute (revenus / coût total)
 * - Calcul de la rentabilité hors impôts (revenus - charges - prêt / coût total)
 * - Inclusion des coûts du prêt dans les charges
 * - Visualisation graphique de l'évolution de la rentabilité
 */

import { useState } from 'react';
import { Investment, FinancialMetrics } from '../types/investment';
import { getLoanInfoForYear, getYearCoverage, isPartialYear } from '../utils/propertyCalculations';
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
}

type RentalType = 'unfurnished' | 'furnished';

const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
  'unfurnished': 'Location nue',
  'furnished': 'Location meublée'
};

export default function SCIResultsDisplay({ investment }: Props) {
  // État pour le type de location sélectionné
  const [selectedRentalType, setSelectedRentalType] = useState<RentalType>('unfurnished');

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' %';

  /**
   * Ajuste une valeur selon le prorata temporel de l'année
   * Pour les années incomplètes (première et dernière année du projet),
   * seule la période effective est prise en compte.
   * @param value - Valeur annuelle à ajuster
   * @param coverage - Pourcentage de couverture de l'année (0-1)
   * @returns Valeur ajustée au prorata temporel
   */
  const adjustForCoverage = (value: number, coverage: number): number => {
    return value * coverage;
  };

  const renderProfitabilityTable = (rentalType: RentalType) => {
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
                Coûts prêt
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
              
              // Calculer le prorata temporel de l'année
              const coverage = getYearCoverage(investment, year);
              
              // Revenus bruts selon le type de location (avec prorata)
              const rent = adjustForCoverage(Number(yearExpense?.rent || 0), coverage);
              const furnishedRent = adjustForCoverage(Number(yearExpense?.furnishedRent || 0), coverage);
              const taxBenefit = adjustForCoverage(Number(yearExpense?.taxBenefit || 0), coverage);
              const grossRevenue = rentalType === 'furnished' 
                ? furnishedRent 
                : rent + taxBenefit;
              
              // Charges de gestion (sans le prêt, avec prorata)
              const managementCharges = 
                adjustForCoverage(Number(yearExpense?.propertyTax || 0), coverage) +
                adjustForCoverage(Number(yearExpense?.condoFees || 0), coverage) +
                adjustForCoverage(Number(yearExpense?.propertyInsurance || 0), coverage) +
                adjustForCoverage(Number(yearExpense?.managementFees || 0), coverage) +
                adjustForCoverage(Number(yearExpense?.unpaidRentInsurance || 0), coverage) +
                adjustForCoverage(Number(yearExpense?.repairs || 0), coverage) +
                adjustForCoverage(Number(yearExpense?.otherDeductible || 0), coverage) +
                adjustForCoverage(Number(yearExpense?.otherNonDeductible || 0), coverage) -
                adjustForCoverage(Number(yearExpense?.tenantCharges || 0), coverage);
              
              // Coûts du prêt (calculés dynamiquement avec prorata automatique) - pour affichage uniquement
              const loanInfo = getLoanInfoForYear(investment, year);
              const loanCosts = loanInfo.payment + loanInfo.insurance;
              
              // Annualiser pour les années partielles (rentabilité normalisée sur 12 mois)
              const annualizedGrossRevenue = coverage > 0 ? grossRevenue / coverage : 0;
              const annualizedManagementCharges = coverage > 0 ? managementCharges / coverage : 0;
              
              const grossYield = totalCost > 0 ? (annualizedGrossRevenue / totalCost) * 100 : 0;
              const netYield = totalCost > 0 ? ((annualizedGrossRevenue - annualizedManagementCharges) / totalCost) * 100 : 0;

              const isPartial = isPartialYear(investment, year);

              return (
                <tr key={year} className={isPartial ? 'bg-amber-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{year}</span>
                      {isPartial && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">partiel</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(grossRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(managementCharges)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(loanCosts)}
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

  const handleRentalTypeChange = (rentalType: RentalType) => {
    setSelectedRentalType(rentalType);
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

    const datasets = (['unfurnished', 'furnished'] as RentalType[]).map(rentalType => {
      const data = years.map(year => {
        const yearExpense = investment.expenses.find(e => e.year === year);
        
        // Calculer le prorata temporel de l'année
        const coverage = getYearCoverage(investment, year);
        
        // Revenus bruts avec prorata
        const rent = adjustForCoverage(Number(yearExpense?.rent || 0), coverage);
        const furnishedRent = adjustForCoverage(Number(yearExpense?.furnishedRent || 0), coverage);
        const taxBenefit = adjustForCoverage(Number(yearExpense?.taxBenefit || 0), coverage);
        const grossRevenue = rentalType === 'furnished' 
          ? furnishedRent 
          : rent + taxBenefit;
        
        // Charges de gestion avec prorata
        const managementCharges = 
          adjustForCoverage(Number(yearExpense?.propertyTax || 0), coverage) +
          adjustForCoverage(Number(yearExpense?.condoFees || 0), coverage) +
          adjustForCoverage(Number(yearExpense?.propertyInsurance || 0), coverage) +
          adjustForCoverage(Number(yearExpense?.managementFees || 0), coverage) +
          adjustForCoverage(Number(yearExpense?.unpaidRentInsurance || 0), coverage) +
          adjustForCoverage(Number(yearExpense?.repairs || 0), coverage) +
          adjustForCoverage(Number(yearExpense?.otherDeductible || 0), coverage) +
          adjustForCoverage(Number(yearExpense?.otherNonDeductible || 0), coverage) -
          adjustForCoverage(Number(yearExpense?.tenantCharges || 0), coverage);
        
        // Annualiser pour les années partielles (rentabilité normalisée sur 12 mois)
        const annualizedGrossRevenue = coverage > 0 ? grossRevenue / coverage : 0;
        const annualizedManagementCharges = coverage > 0 ? managementCharges / coverage : 0;
        
        return {
          grossYield: totalCost > 0 ? (annualizedGrossRevenue / totalCost) * 100 : 0,
          netYield: totalCost > 0 ? ((annualizedGrossRevenue - annualizedManagementCharges) / totalCost) * 100 : 0
        };
      });

      return {
        label: RENTAL_TYPE_LABELS[rentalType],
        data: data,
        borderColor: getRentalTypeColor(rentalType),
        backgroundColor: getRentalTypeColor(rentalType, 0.1),
        tension: 0.4
      };
    });

    return {
      labels: years,
      datasets
    };
  };

  const getRentalTypeColor = (rentalType: RentalType, alpha: number = 1) => {
    const colors = {
      'unfurnished': `rgba(59, 130, 246, ${alpha})`, // blue
      'furnished': `rgba(245, 158, 11, ${alpha})`    // yellow/orange
    };
    return colors[rentalType];
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
            return `${context.dataset.label}: ${formatPercent(context.parsed.y)}`;
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
      {/* Bannière d'information SCI */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Bien détenu en SCI à l'IS</span> - Les régimes fiscaux IRPP (micro-foncier, LMNP, etc.) ne s'appliquent pas. 
              La rentabilité est calculée hors imposition (l'IS sera calculé au niveau de la SCI sur l'ensemble de ses biens).
            </p>
          </div>
        </div>
      </div>

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

      {/* Onglets des types de location */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            {(['unfurnished', 'furnished'] as RentalType[]).map((rentalType) => (
              <div
                key={rentalType}
                onClick={() => handleRentalTypeChange(rentalType)}
                className={`
                  flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm cursor-pointer
                  ${selectedRentalType === rentalType
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {RENTAL_TYPE_LABELS[rentalType]}
              </div>
            ))}
          </nav>
        </div>

        {/* Contenu de l'onglet */}
        <div className="p-6">
          {renderProfitabilityTable(selectedRentalType)}
          
          {/* Section explicative */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Détail des calculs</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Revenus bruts</h4>
                <p className="text-sm text-gray-600">
                  {selectedRentalType === 'furnished' 
                    ? 'Loyer meublé'
                    : 'Loyer nu + Aide fiscale'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Charges</h4>
                <p className="text-sm text-gray-600">
                  Somme des charges de gestion courante :
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
                <h4 className="font-medium text-gray-900">Coûts prêt</h4>
                <p className="text-sm text-gray-600">
                  Coûts liés à l'emprunt :
                  <ul className="list-disc ml-6 mt-2">
                    <li>Remboursement du prêt (capital + intérêts)</li>
                    <li>Assurance emprunteur</li>
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
                <p className="text-xs text-gray-500 mt-2">
                  Note : Cette rentabilité est calculée hors imposition et hors coûts de financement (prêt). 
                  L'impôt sur les sociétés (IS) est calculé au niveau de la SCI sur l'ensemble de ses biens dans l'onglet "Imposition".
                  Les coûts du prêt sont affichés séparément dans la colonne "Coûts prêt" mais ne sont pas inclus dans le calcul de rentabilité.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Annualisation</h4>
                <p className="text-sm text-gray-600">
                  Pour les années partielles (première et dernière année), la rentabilité est annualisée 
                  pour être comparable aux années complètes.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Exemple : Si l'année couvre 1.5 mois avec 1 500 € de revenus, on annualise à 12 000 € 
                  pour calculer une rentabilité comparable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

