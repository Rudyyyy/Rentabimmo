/**
 * Composant IRRSummary - Résumé du TRI pour la sidebar
 * 
 * Affiche le TRI de chaque régime fiscal à l'année de revente sélectionnée
 * et met en évidence le régime optimal
 */

import React from 'react';
import { Investment, TaxRegime } from '../types/investment';
import { calculateAllIRRs } from '../utils/irrCalculations';
import { TrendingUp, Award } from 'lucide-react';

interface Props {
  investment: Investment;
  calculateBalanceFunction: (index: number, regime: TaxRegime) => number;
  targetYear?: number; // Année de revente ciblée
}

// Labels pour les régimes fiscaux
const REGIME_LABELS: Record<TaxRegime, string> = {
  'micro-foncier': 'Micro-foncier',
  'reel-foncier': 'Réel foncier',
  'micro-bic': 'Micro-BIC',
  'reel-bic': 'Réel BIC (LMNP)'
};

// Couleurs pour les régimes
const REGIME_COLORS: Record<TaxRegime, string> = {
  'micro-foncier': 'text-blue-600',
  'reel-foncier': 'text-green-600',
  'micro-bic': 'text-purple-600',
  'reel-bic': 'text-amber-600'
};

export default function IRRSummary({ investment, calculateBalanceFunction, targetYear }: Props) {
  // Calculer les TRI pour tous les régimes
  const irrData = React.useMemo(() => {
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

  // Déterminer l'année cible (dernière année si non spécifiée)
  const yearToDisplay = targetYear || irrData.years[irrData.years.length - 1];
  
  // Trouver l'index de l'année cible
  const yearIndex = irrData.years.indexOf(yearToDisplay);
  
  if (yearIndex === -1 || irrData.years.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">TRI par régime fiscal</h3>
        </div>
        <p className="text-sm text-gray-500">Données insuffisantes pour calculer le TRI</p>
      </div>
    );
  }

  // Récupérer les TRI pour chaque régime à l'année cible
  const regimes: TaxRegime[] = ['micro-foncier', 'reel-foncier', 'micro-bic', 'reel-bic'];
  const irrValues = regimes.map(regime => ({
    regime,
    irr: irrData.irrs[regime][yearIndex],
    label: REGIME_LABELS[regime],
    color: REGIME_COLORS[regime]
  }));

  // Trouver le meilleur régime (TRI le plus élevé)
  const bestRegime = irrValues.reduce((best, current) => {
    if (!isFinite(current.irr)) return best;
    if (!best || !isFinite(best.irr) || current.irr > best.irr) {
      return current;
    }
    return best;
  }, irrValues[0]);

  const formatIRR = (value: number): string => {
    if (!isFinite(value)) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">TRI par régime fiscal</h3>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Année de revente : <span className="font-semibold text-gray-900">{yearToDisplay}</span>
      </div>

      <div className="space-y-3">
        {irrValues.map(({ regime, irr, label, color }) => {
          const isOptimal = regime === bestRegime.regime && isFinite(irr);
          
          return (
            <div
              key={regime}
              className={`
                relative p-3 rounded-lg border-2 transition-all
                ${isOptimal 
                  ? 'bg-green-50 border-green-300 shadow-sm' 
                  : 'bg-gray-50 border-gray-200'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isOptimal ? 'text-green-900' : 'text-gray-700'}`}>
                      {label}
                    </span>
                    {isOptimal && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-600 text-white">
                        <Award className="h-3 w-3" />
                        Optimal
                      </span>
                    )}
                  </div>
                  {isOptimal && (
                    <p className="text-xs text-green-700 mt-1">
                      Meilleur rendement annualisé
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    isOptimal 
                      ? 'text-green-700' 
                      : irr >= 0 
                        ? 'text-gray-900' 
                        : 'text-red-600'
                  }`}>
                    {formatIRR(irr)}
                  </div>
                  <div className="text-xs text-gray-500">TRI</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <span className="font-semibold">Le TRI</span> mesure la rentabilité annualisée 
            sur toute la durée du projet.
          </p>
          <p className="text-gray-500">
            Un TRI supérieur au taux d'emprunt indique généralement un investissement rentable.
          </p>
        </div>
      </div>

      {bestRegime && isFinite(bestRegime.irr) && bestRegime.irr > 0 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Recommandation :</span> Le régime{' '}
              <span className="font-semibold">{bestRegime.label}</span> offre le meilleur 
              TRI ({formatIRR(bestRegime.irr)}) pour une revente en {yearToDisplay}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

