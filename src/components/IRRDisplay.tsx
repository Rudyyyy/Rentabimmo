/**
 * Composant IRRDisplay - Affichage du Taux de Rentabilité Interne (TRI)
 * 
 * Ce composant affiche l'évolution du TRI pour différents régimes fiscaux et années de revente.
 * Le TRI est un indicateur clé qui mesure la rentabilité annualisée d'un investissement.
 * 
 * Fonctionnalités:
 * - Graphique d'évolution du TRI par régime fiscal
 * - Tableau détaillé année par année
 * - Sélection multiple des régimes à comparer
 * - Explication du TRI pour l'utilisateur
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Investment, TaxRegime } from '../types/investment';
import { calculateAllIRRs } from '../utils/irrCalculations';

interface Props {
  investment: Investment;
  calculateBalanceFunction: (index: number, regime: TaxRegime) => number;
}

// Labels pour les régimes fiscaux
const REGIME_LABELS: Record<TaxRegime, string> = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};

// Couleurs pour les graphiques
const REGIME_COLORS: Record<TaxRegime, { border: string; background: string }> = {
  'micro-foncier': { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' },
  'reel-foncier': { border: 'rgb(16, 185, 129)', background: 'rgba(16, 185, 129, 0.1)' },
  'micro-bic': { border: 'rgb(139, 92, 246)', background: 'rgba(139, 92, 246, 0.1)' },
  'reel-bic': { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' }
};

export default function IRRDisplay({ investment, calculateBalanceFunction }: Props) {
  // État pour les régimes sélectionnés - tous par défaut
  const [selectedRegimes, setSelectedRegimes] = useState<TaxRegime[]>([
    'micro-foncier',
    'reel-foncier',
    'micro-bic',
    'reel-bic'
  ]);

  // Calculer les TRI pour tous les régimes et toutes les années
  const irrData = useMemo(() => {
    try {
      return calculateAllIRRs(investment, calculateBalanceFunction);
    } catch (error) {
      console.error('Erreur lors du calcul des TRI:', error);
      return {
        years: [],
        irrs: {
          'micro-foncier': [],
          'reel-foncier': [],
          'micro-bic': [],
          'reel-bic': []
        }
      };
    }
  }, [investment, calculateBalanceFunction]);

  // Fonction pour basculer la sélection d'un régime
  const toggleRegime = (regime: TaxRegime) => {
    setSelectedRegimes(prev =>
      prev.includes(regime)
        ? prev.filter(r => r !== regime)
        : [...prev, regime]
    );
  };

  // Préparer les données pour le graphique
  const chartData = {
    labels: irrData.years,
    datasets: selectedRegimes.map(regime => ({
      label: REGIME_LABELS[regime],
      data: irrData.irrs[regime],
      borderColor: REGIME_COLORS[regime].border,
      backgroundColor: REGIME_COLORS[regime].background,
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5
    }))
  };

  // Options du graphique
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw.toFixed(2)}%`;
          }
        }
      },
      title: {
        display: true,
        text: 'Évolution du TRI par année de revente et régime fiscal'
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return value.toFixed(1) + '%';
          }
        },
        title: {
          display: true,
          text: 'TRI (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Année de revente'
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Sélection des régimes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Taux de Rentabilité Interne (TRI)</h3>
        
        <div className="flex flex-wrap gap-4 mb-4">
          {(Object.keys(REGIME_LABELS) as TaxRegime[]).map(regime => (
            <label key={regime} className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRegimes.includes(regime)}
                onChange={() => toggleRegime(regime)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{REGIME_LABELS[regime]}</span>
            </label>
          ))}
        </div>

        {/* Graphique */}
        <div className="h-80">
          {selectedRegimes.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Sélectionnez au moins un régime fiscal pour afficher le graphique
            </div>
          )}
        </div>
      </div>

      {/* Tableau détaillé */}
      {selectedRegimes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Détail du TRI par année de revente</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Année
                  </th>
                  {selectedRegimes.map(regime => (
                    <th
                      key={regime}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {REGIME_LABELS[regime]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {irrData.years.map((year, idx) => (
                  <tr key={year} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {year}
                    </td>
                    {selectedRegimes.map(regime => {
                      const irr = irrData.irrs[regime][idx];
                      return (
                        <td
                          key={`${regime}-${year}`}
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            irr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
                          }`}
                        >
                          {irr !== undefined && isFinite(irr) ? `${irr.toFixed(2)}%` : 'N/A'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explication du TRI */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Comprendre le TRI</h3>
        
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Le <strong>Taux de Rentabilité Interne (TRI)</strong> est un indicateur financier 
            qui mesure la performance annualisée de votre investissement immobilier.
          </p>
          
          <p>
            Il représente le taux d'actualisation qui annule la valeur actuelle nette (VAN) 
            de tous les flux financiers de votre investissement.
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
            <h4 className="font-semibold text-blue-900 mb-2">Comment interpréter le TRI :</h4>
            <ul className="list-disc pl-5 space-y-1 text-blue-800">
              <li>Plus le TRI est élevé, plus l'investissement est rentable</li>
              <li>Un TRI supérieur au taux d'emprunt indique généralement un investissement rentable</li>
              <li>Le TRI prend en compte tous les flux : investissement initial, revenus locatifs, impôts et prix de revente</li>
              <li>Un TRI de 8% signifie que votre investissement rapporte 8% par an en moyenne</li>
            </ul>
          </div>
          
          <p>
            Notre calcul tient compte des spécificités fiscales de chaque régime, des charges annuelles,
            des remboursements d'emprunt, ainsi que de la plus-value à la revente.
          </p>
          
          <p className="text-xs text-gray-500 mt-4">
            <strong>Note :</strong> Le TRI peut varier significativement selon l'année de revente choisie.
            Utilisez ce graphique pour identifier l'année optimale de revente pour votre projet.
          </p>
        </div>
      </div>
    </div>
  );
}
