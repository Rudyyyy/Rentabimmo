/**
 * Composant GrossYieldChart
 * 
 * Ce composant affiche un graphique linéaire comparant l'évolution du rendement brut
 * pour les différents régimes fiscaux (micro-foncier, réel foncier, micro-BIC, réel BIC)
 * sur la durée totale de l'investissement.
 * 
 * Fonctionnalités principales :
 * - Calcul automatique des rendements bruts pour chaque régime fiscal
 * - Visualisation comparative des rendements sur une période donnée
 * - Mise à jour dynamique lors des changements d'investissement
 * - Légende interactive pour filtrer les régimes affichés
 * 
 * Le rendement brut est calculé en prenant en compte :
 * - Les revenus locatifs (loyers)
 * - Les charges locataires
 * - Les aides fiscales (selon le régime)
 * - Le coût total de l'investissement
 */

import React, { useEffect } from 'react';
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
  ChartOptions,
  Filler
} from 'chart.js';
import { Investment, TaxRegime } from '../types/investment';
import { calculateAllGrossYields } from '../utils/taxCalculations';

// Enregistrement des composants Chart.js nécessaires
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface GrossYieldChartProps {
  investment: Investment;
}

export const GrossYieldChart: React.FC<GrossYieldChartProps> = ({ investment }) => {
  
  // Générer les labels pour les années
  const startYear = new Date(investment.projectStartDate).getFullYear();
  const endYear = new Date(investment.projectEndDate).getFullYear();
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );


  // Calculer les rendements bruts pour chaque année et chaque régime
  const regimes: TaxRegime[] = ['micro-foncier', 'reel-foncier', 'micro-bic', 'reel-bic'];
  const datasets = regimes.map((regime) => {
    const yields = years.map(year => {
      const yieldsForYear = calculateAllGrossYields(investment, year);
      return yieldsForYear[regime];
    });

    return {
      label: getRegimeLabel(regime),
      data: yields,
      borderColor: getRegimeColor(regime),
      backgroundColor: getRegimeColor(regime),
      tension: 0.1,
      fill: false
    };
  });

  const data = {
    labels: years,
    datasets
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Évolution du rendement brut par régime fiscal'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Rendement brut (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Année'
        }
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow h-[400px]">
      <Line data={data} options={options} />
    </div>
  );
};

function getRegimeLabel(regime: TaxRegime): string {
  switch (regime) {
    case 'micro-foncier':
      return 'Micro-foncier';
    case 'reel-foncier':
      return 'Réel Foncier';
    case 'micro-bic':
      return 'Micro-BIC';
    case 'reel-bic':
      return 'Réel BIC';
    default:
      return '';
  }
}

function getRegimeColor(regime: TaxRegime): string {
  switch (regime) {
    case 'micro-foncier':
      return 'rgb(59, 130, 246)'; // blue-500
    case 'reel-foncier':
      return 'rgb(34, 197, 94)'; // green-500
    case 'micro-bic':
      return 'rgb(168, 85, 247)'; // purple-500
    case 'reel-bic':
      return 'rgb(234, 179, 8)'; // yellow-500
    default:
      return 'rgb(0, 0, 0)';
  }
} 