/**
 * Composant SCIIRRDisplay - Affichage du Taux de Rentabilité Interne (TRI) pour les biens en SCI
 * 
 * Ce composant affiche l'évolution du TRI pour les biens détenus en SCI,
 * en comparant location nue et location meublée (sans régimes fiscaux IRPP).
 * Le TRI est un indicateur clé qui mesure la rentabilité annualisée d'un investissement.
 * 
 * Fonctionnalités:
 * - Graphique d'évolution du TRI par type de location
 * - Tableau détaillé année par année
 * - Sélection des types de location à comparer
 * - Explication du TRI pour les SCI
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Investment } from '../types/investment';
import { calculateAllIRRsSCI } from '../utils/irrCalculations';

interface Props {
  investment: Investment;
  calculateBalanceFunction: (index: number, rentalType: 'unfurnished' | 'furnished') => number;
}

// Type pour les locations
type RentalType = 'unfurnished' | 'furnished';

// Labels pour les types de location
const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
  'unfurnished': 'Location nue',
  'furnished': 'Location meublée'
};

// Couleurs pour les graphiques
const RENTAL_TYPE_COLORS: Record<RentalType, { border: string; background: string }> = {
  'unfurnished': { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' },
  'furnished': { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' }
};

export default function SCIIRRDisplay({ investment, calculateBalanceFunction }: Props) {
  // État pour les types de location sélectionnés - tous par défaut
  const [selectedRentalTypes, setSelectedRentalTypes] = useState<RentalType[]>([
    'unfurnished',
    'furnished'
  ]);

  // Calculer les TRI pour tous les types de location et toutes les années
  const irrData = useMemo(() => {
    try {
      return calculateAllIRRsSCI(investment, calculateBalanceFunction);
    } catch (error) {
      console.error('Erreur lors du calcul des TRI:', error);
      return {
        years: [],
        irrs: {
          'unfurnished': [],
          'furnished': []
        }
      };
    }
  }, [investment, calculateBalanceFunction]);

  // Fonction pour basculer la sélection d'un type de location
  const toggleRentalType = (rentalType: RentalType) => {
    setSelectedRentalTypes(prev =>
      prev.includes(rentalType)
        ? prev.filter(r => r !== rentalType)
        : [...prev, rentalType]
    );
  };

  // Préparer les données pour le graphique
  const chartData = {
    labels: irrData.years,
    datasets: selectedRentalTypes.map(rentalType => ({
      label: RENTAL_TYPE_LABELS[rentalType],
      data: irrData.irrs[rentalType],
      borderColor: RENTAL_TYPE_COLORS[rentalType].border,
      backgroundColor: RENTAL_TYPE_COLORS[rentalType].background,
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
        text: 'Évolution du TRI par année de revente et type de location'
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
      {/* Sélection des types de location */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Taux de Rentabilité Interne (TRI)</h3>
        
        <div className="flex flex-wrap gap-4 mb-4">
          {(Object.keys(RENTAL_TYPE_LABELS) as RentalType[]).map(rentalType => (
            <label key={rentalType} className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRentalTypes.includes(rentalType)}
                onChange={() => toggleRentalType(rentalType)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{RENTAL_TYPE_LABELS[rentalType]}</span>
            </label>
          ))}
        </div>

        {/* Graphique */}
        <div className="h-80">
          {selectedRentalTypes.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Sélectionnez au moins un type de location pour afficher le graphique
            </div>
          )}
        </div>
      </div>

      {/* Tableau détaillé */}
      {selectedRentalTypes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Détail du TRI par année de revente</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Année
                  </th>
                  {selectedRentalTypes.map(rentalType => (
                    <th
                      key={rentalType}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {RENTAL_TYPE_LABELS[rentalType]}
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
                    {selectedRentalTypes.map(rentalType => {
                      const irr = irrData.irrs[rentalType][idx];
                      return (
                        <td
                          key={`${rentalType}-${year}`}
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

      {/* Explication du TRI pour SCI */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Comprendre le TRI pour une SCI</h3>
        
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Le <strong>Taux de Rentabilité Interne (TRI)</strong> est un indicateur financier 
            qui mesure la performance annualisée de votre investissement immobilier en SCI.
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
              <li>Le TRI prend en compte tous les flux : investissement initial, revenus locatifs et prix de revente</li>
              <li>Un TRI de 8% signifie que votre investissement rapporte 8% par an en moyenne</li>
            </ul>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">
            <h4 className="font-semibold text-amber-900 mb-2">Spécificités SCI :</h4>
            <ul className="list-disc pl-5 space-y-1 text-amber-800">
              <li>L'impôt sur les sociétés (IS) à 25% est calculé au niveau de la SCI sur l'ensemble de ses biens</li>
              <li>Les calculs intègrent les cash flows après charges mais avant imposition</li>
              <li>La plus-value de cession est soumise à l'IS à 25% sans abattement pour durée de détention</li>
              <li>Le TRI peut différer significativement entre location nue et meublée selon les charges déductibles</li>
            </ul>
          </div>
          
          <p>
            Notre calcul tient compte des charges annuelles (avec prorata temporel pour les années incomplètes),
            des remboursements d'emprunt, ainsi que de la plus-value à la revente soumise à l'IS.
          </p>
          
          <p className="text-xs text-gray-500 mt-4">
            <strong>Note :</strong> Le TRI peut varier significativement selon l'année de revente choisie.
            Utilisez ce graphique pour identifier l'année optimale de revente pour votre projet en SCI.
          </p>
        </div>
      </div>
    </div>
  );
}

