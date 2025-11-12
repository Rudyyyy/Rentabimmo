/**
 * Composant SCITaxSidebar
 * 
 * Sidebar pour les paramètres fiscaux d'un bien en SCI.
 * Permet de saisir :
 * - Les paramètres d'amortissement du bien
 * - Les travaux effectués
 * - Les charges spécifiques au bien
 */

import { useState } from 'react';
import { Investment } from '../types/investment';
import { HelpCircle, Building2, Wrench, Calculator } from 'lucide-react';

interface Props {
  investment: Investment;
  onUpdate: (field: keyof Investment | Partial<Investment>, value?: any) => void;
}

export default function SCITaxSidebar({ investment, onUpdate }: Props) {
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const handleInputChange = (field: keyof Investment, value: any) => {
    const parsedValue = typeof value === 'string' ? (value === '' ? 0 : Number(value)) : value;
    onUpdate(field, parsedValue);
  };

  const tooltips = {
    buildingValue: "Valeur du bien immobilier (hors terrain). En général, on considère que 20% du prix d'achat correspond au terrain (non amortissable).",
    buildingAmortizationYears: "Durée d'amortissement du bien. Généralement entre 25 et 30 ans pour un immeuble.",
    furnitureValue: "Valeur du mobilier si le bien est meublé. Cela inclut tous les meubles et équipements.",
    furnitureAmortizationYears: "Durée d'amortissement du mobilier. Généralement entre 5 et 10 ans selon le type de mobilier.",
    renovationCosts: "Montant des travaux de rénovation effectués. Ces travaux seront amortis sur leur durée de vie.",
    worksAmortizationYears: "Durée d'amortissement des travaux. Généralement entre 10 et 15 ans selon la nature des travaux."
  };

  // Calcul automatique de la valeur du bien (80% du prix d'achat par défaut)
  const defaultBuildingValue = investment.purchasePrice * 0.8;
  const buildingValue = investment.taxParameters?.buildingValue || defaultBuildingValue;

  return (
    <div className="space-y-6">
      {/* En-tête informatif */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              Bien en SCI à l'IS
            </h4>
            <p className="text-xs text-blue-800">
              Les paramètres ci-dessous servent au calcul de l'IS global de la SCI. 
              L'impôt sera ensuite réparti par prorata sur chaque bien.
            </p>
          </div>
        </div>
      </div>

      {/* Section : Amortissements du bien */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <Calculator className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-900">Amortissements</h4>
        </div>

        {/* Valeur du bien */}
        <div className="relative group">
          <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1">
              Valeur du bien (hors terrain)
              <HelpCircle 
                className="h-3.5 w-3.5 text-gray-400 cursor-help"
                onMouseEnter={() => setHoveredField('buildingValue')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </span>
          </label>
          {hoveredField === 'buildingValue' && (
            <div className="absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded-lg p-3 w-64 shadow-lg">
              {tooltips.buildingValue}
            </div>
          )}
          <input
            type="number"
            value={buildingValue}
            onChange={(e) => handleInputChange('taxParameters', {
              ...investment.taxParameters,
              buildingValue: Number(e.target.value)
            })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Valeur amortissable"
          />
          <p className="text-xs text-gray-500 mt-1">
            Par défaut : {formatCurrency(defaultBuildingValue)} (80% du prix d'achat)
          </p>
        </div>

        {/* Durée d'amortissement du bien */}
        <div className="relative group">
          <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1">
              Durée d'amortissement (années)
              <HelpCircle 
                className="h-3.5 w-3.5 text-gray-400 cursor-help"
                onMouseEnter={() => setHoveredField('buildingAmortizationYears')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </span>
          </label>
          {hoveredField === 'buildingAmortizationYears' && (
            <div className="absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded-lg p-3 w-64 shadow-lg">
              {tooltips.buildingAmortizationYears}
            </div>
          )}
          <input
            type="number"
            value={investment.taxParameters?.buildingAmortizationYears || 25}
            onChange={(e) => handleInputChange('taxParameters', {
              ...investment.taxParameters,
              buildingAmortizationYears: Number(e.target.value)
            })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="50"
          />
          <div className="text-xs text-gray-500 mt-1">
            Amortissement annuel : {formatCurrency(buildingValue / (investment.taxParameters?.buildingAmortizationYears || 25))}
          </div>
        </div>
      </div>

      {/* Section : Mobilier (si meublé) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <Wrench className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-900">Mobilier</h4>
        </div>

        {/* Valeur du mobilier */}
        <div className="relative group">
          <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1">
              Valeur du mobilier
              <HelpCircle 
                className="h-3.5 w-3.5 text-gray-400 cursor-help"
                onMouseEnter={() => setHoveredField('furnitureValue')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </span>
          </label>
          {hoveredField === 'furnitureValue' && (
            <div className="absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded-lg p-3 w-64 shadow-lg">
              {tooltips.furnitureValue}
            </div>
          )}
          <input
            type="number"
            value={investment.taxParameters?.furnitureValue || 0}
            onChange={(e) => handleInputChange('taxParameters', {
              ...investment.taxParameters,
              furnitureValue: Number(e.target.value)
            })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
        </div>

        {/* Durée d'amortissement du mobilier */}
        {(investment.taxParameters?.furnitureValue || 0) > 0 && (
          <div className="relative group">
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                Durée d'amortissement (années)
                <HelpCircle 
                  className="h-3.5 w-3.5 text-gray-400 cursor-help"
                  onMouseEnter={() => setHoveredField('furnitureAmortizationYears')}
                  onMouseLeave={() => setHoveredField(null)}
                />
              </span>
            </label>
            {hoveredField === 'furnitureAmortizationYears' && (
              <div className="absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded-lg p-3 w-64 shadow-lg">
                {tooltips.furnitureAmortizationYears}
              </div>
            )}
            <input
              type="number"
              value={investment.taxParameters?.furnitureAmortizationYears || 10}
              onChange={(e) => handleInputChange('taxParameters', {
                ...investment.taxParameters,
                furnitureAmortizationYears: Number(e.target.value)
              })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="50"
            />
            <div className="text-xs text-gray-500 mt-1">
              Amortissement annuel : {formatCurrency((investment.taxParameters?.furnitureValue || 0) / (investment.taxParameters?.furnitureAmortizationYears || 10))}
            </div>
          </div>
        )}
      </div>

      {/* Section : Travaux */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <Wrench className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-900">Travaux</h4>
        </div>

        {/* Montant des travaux */}
        <div className="relative group">
          <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1">
              Montant des travaux
              <HelpCircle 
                className="h-3.5 w-3.5 text-gray-400 cursor-help"
                onMouseEnter={() => setHoveredField('renovationCosts')}
                onMouseLeave={() => setHoveredField(null)}
              />
            </span>
          </label>
          {hoveredField === 'renovationCosts' && (
            <div className="absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded-lg p-3 w-64 shadow-lg">
              {tooltips.renovationCosts}
            </div>
          )}
          <input
            type="number"
            value={investment.renovationCosts || 0}
            onChange={(e) => handleInputChange('renovationCosts', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
        </div>

        {/* Durée d'amortissement des travaux */}
        {(investment.renovationCosts || 0) > 0 && (
          <div className="relative group">
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                Durée d'amortissement (années)
                <HelpCircle 
                  className="h-3.5 w-3.5 text-gray-400 cursor-help"
                  onMouseEnter={() => setHoveredField('worksAmortizationYears')}
                  onMouseLeave={() => setHoveredField(null)}
                />
              </span>
            </label>
            {hoveredField === 'worksAmortizationYears' && (
              <div className="absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded-lg p-3 w-64 shadow-lg">
                {tooltips.worksAmortizationYears}
              </div>
            )}
            <input
              type="number"
              value={investment.taxParameters?.worksAmortizationYears || 10}
              onChange={(e) => handleInputChange('taxParameters', {
                ...investment.taxParameters,
                worksAmortizationYears: Number(e.target.value)
              })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="30"
            />
            <div className="text-xs text-gray-500 mt-1">
              Amortissement annuel : {formatCurrency((investment.renovationCosts || 0) / (investment.taxParameters?.worksAmortizationYears || 10))}
            </div>
          </div>
        )}
      </div>

      {/* Récapitulatif des amortissements */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-gray-900 mb-3">
          Récapitulatif des amortissements annuels
        </h5>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Bien immobilier :</span>
            <span className="font-medium">
              {formatCurrency(buildingValue / (investment.taxParameters?.buildingAmortizationYears || 25))}
            </span>
          </div>
          {(investment.taxParameters?.furnitureValue || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Mobilier :</span>
              <span className="font-medium">
                {formatCurrency((investment.taxParameters?.furnitureValue || 0) / (investment.taxParameters?.furnitureAmortizationYears || 10))}
              </span>
            </div>
          )}
          {(investment.renovationCosts || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Travaux :</span>
              <span className="font-medium">
                {formatCurrency((investment.renovationCosts || 0) / (investment.taxParameters?.worksAmortizationYears || 10))}
              </span>
            </div>
          )}
          <div className="pt-2 border-t border-gray-300 flex justify-between font-semibold">
            <span className="text-gray-900">Total annuel :</span>
            <span className="text-blue-600">
              {formatCurrency(
                buildingValue / (investment.taxParameters?.buildingAmortizationYears || 25) +
                (investment.taxParameters?.furnitureValue || 0) / (investment.taxParameters?.furnitureAmortizationYears || 10) +
                (investment.renovationCosts || 0) / (investment.taxParameters?.worksAmortizationYears || 10)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Note explicative */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-xs text-amber-800">
          <strong>ℹ️ Fonctionnement :</strong> Ces amortissements seront ajoutés aux charges 
          déductibles de ce bien lors du calcul de l'IS consolidé de la SCI. L'IS total sera 
          ensuite réparti sur chaque bien selon un prorata basé sur leur valeur.
        </p>
      </div>
    </div>
  );
}

