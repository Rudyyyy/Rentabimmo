/**
 * Composant SCITaxDisplay
 * 
 * Affiche les résultats fiscaux consolidés d'une SCI à l'IS.
 * Ce composant remplace le formulaire fiscal classique pour les biens détenus en SCI.
 * 
 * Sections affichées :
 * 1. Vue d'ensemble de la SCI
 * 2. Résultats fiscaux consolidés (année courante)
 * 3. Répartition par bien (tableau avec highlight sur le bien actuel)
 * 4. Projection pluriannuelle
 * 5. Paramètres globaux de la SCI
 */

import { useState, useEffect } from 'react';
import { Building2, TrendingUp, AlertCircle, Info, Calculator, DollarSign, PieChart } from 'lucide-react';
import { Investment } from '../types/investment';
import { SCI, SCITaxResults } from '../types/sci';
import { getSCIById } from '../lib/api';
import { calculateSCITaxResults, calculateAllSCITaxResults } from '../utils/sciTaxCalculations';
import { getYearCoverage, getInterestForYear, getLoanInfoForYear, adjustForCoverage } from '../utils/propertyCalculations';
import { Line } from 'react-chartjs-2';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  investment: Investment;
  currentYear: number;
}

export default function SCITaxDisplay({ investment, currentYear }: Props) {
  const [sci, setSCI] = useState<SCI | null>(null);
  const [sciProperties, setSCIProperties] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showSCIParams, setShowSCIParams] = useState(false);
  const [showChargesDetail, setShowChargesDetail] = useState(false);
  const [showRevenuesDetail, setShowRevenuesDetail] = useState(false);
  const [showAmortizationDetail, setShowAmortizationDetail] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadSCIData();
  }, [investment.sciId, user]);

  async function loadSCIData() {
    if (!investment.sciId || !user) return;

    setLoading(true);
    try {
      // Charger la SCI
      const loadedSCI = await getSCIById(investment.sciId);
      if (loadedSCI) {
        setSCI(loadedSCI);

        // Charger TOUS les biens de la SCI depuis Supabase
        const { data: properties, error } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Erreur lors du chargement des biens:', error);
          setSCIProperties([investment]);
        } else {
          // Filtrer pour ne garder que les biens de cette SCI
          const sciPropertiesData = properties
            .filter(prop => {
              const inv = prop.investment_data as unknown as Investment;
              return inv && inv.sciId === investment.sciId;
            })
            .map(prop => ({
              ...prop.investment_data as unknown as Investment,
              id: prop.id,
              name: prop.name
            }));

          console.log(`✅ Chargé ${sciPropertiesData.length} bien(s) pour la SCI ${loadedSCI.name}`);
          setSCIProperties(sciPropertiesData.length > 0 ? sciPropertiesData : [investment]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la SCI:', error);
      setSCIProperties([investment]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!sci) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">
          Impossible de charger les informations de la SCI
        </p>
      </div>
    );
  }

  // Calculer les résultats fiscaux pour l'année sélectionnée
  const taxResults = calculateSCITaxResults(sci, sciProperties, selectedYear);
  
  // Calculer tous les résultats pour la projection
  const allResults = calculateAllSCITaxResults(sci, sciProperties);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value || 0);

  const formatPercent = (value: number) => 
    `${(value * 100).toFixed(1)}%`;

  // Contribution du bien actuel
  const currentPropertyContribution = taxResults.propertyContributions[investment.id];

  return (
    <div className="space-y-4">
      {/* Section 1: Vue d'ensemble de la SCI */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                SCI {sci.name}
              </h2>
              {sci.description && (
                <p className="text-xs text-gray-600 mb-2">{sci.description}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Biens :</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {sciProperties.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Capital :</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {formatCurrency(sci.capital)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Taux IS réduit :</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {sci.taxParameters.reducedRate}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Taux IS normal :</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {sci.taxParameters.standardRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSCIParams(!showSCIParams)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <Info className="h-4 w-4" />
            {showSCIParams ? 'Masquer' : 'Paramètres'}
          </button>
        </div>

        {/* Paramètres globaux de la SCI (repliable) */}
        {showSCIParams && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Charges de fonctionnement annuelles de la SCI
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div className="bg-white bg-opacity-60 p-2 rounded-md">
                <span className="text-gray-600">Comptabilité :</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(sci.taxParameters.accountingFees)}
                </span>
              </div>
              <div className="bg-white bg-opacity-60 p-2 rounded-md">
                <span className="text-gray-600">Frais juridiques :</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(sci.taxParameters.legalFees)}
                </span>
              </div>
              <div className="bg-white bg-opacity-60 p-2 rounded-md">
                <span className="text-gray-600">Frais bancaires :</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(sci.taxParameters.bankFees)}
                </span>
              </div>
              <div className="bg-white bg-opacity-60 p-2 rounded-md">
                <span className="text-gray-600">Assurances :</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(sci.taxParameters.insuranceFees)}
                </span>
              </div>
              {sci.taxParameters.otherExpenses > 0 && (
                <div className="bg-white bg-opacity-60 p-2 rounded-md">
                  <span className="text-gray-600">Autres charges :</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(sci.taxParameters.otherExpenses)}
                  </span>
                </div>
              )}
              <div className="bg-blue-100 p-2 rounded-md font-semibold">
                <span className="text-gray-900">Total :</span>
                <span className="ml-2 text-blue-600">
                  {formatCurrency(
                    sci.taxParameters.accountingFees +
                    sci.taxParameters.legalFees +
                    sci.taxParameters.bankFees +
                    sci.taxParameters.insuranceFees +
                    sci.taxParameters.otherExpenses
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bandeau d'explication */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <p className="font-semibold mb-0.5">📊 Fonctionnement de l'IS pour les SCI</p>
            <p className="text-amber-800">
              Contrairement aux biens en nom propre, l'Impôt sur les Sociétés (IS) est calculé de manière 
              <strong> consolidée</strong> sur l'ensemble des biens de la SCI. Les revenus et charges de tous 
              les biens sont additionnés, puis l'IS est calculé sur le résultat global. Enfin, cet IS est 
              réparti sur chaque bien proportionnellement à sa valeur (prorata).
            </p>
          </div>
        </div>
      </div>

      {/* Sélection de l'année */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">
          Année fiscale :
        </label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.keys(allResults).map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Section 2: Résultats fiscaux consolidés */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Résultats fiscaux consolidés - {selectedYear}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Colonne gauche : Revenus et charges */}
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900">
                  Total des revenus
                </span>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(taxResults.totalRevenues)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-green-700">
                  Loyers de tous les biens de la SCI
                </p>
                <button
                  onClick={() => setShowRevenuesDetail(!showRevenuesDetail)}
                  className="text-xs text-green-700 hover:text-green-900 font-medium underline"
                >
                  {showRevenuesDetail ? 'Masquer' : 'Détail'}
                </button>
              </div>
              
              {showRevenuesDetail && (
                <div className="mt-3 pt-3 border-t border-green-300 space-y-2 text-xs">
                  {/* Détail par bien */}
                  {Object.values(taxResults.propertyContributions).map(contrib => {
                    const property = sciProperties.find(p => p.id === contrib.propertyId);
                    const yearExpense = property?.expenses.find(e => e.year === selectedYear);
                    const coverage = property ? getYearCoverage(property, selectedYear) : 1;
                    const partial = coverage > 0 && coverage < 1;
                    
                    return (
                      <div
                        key={contrib.propertyId}
                        className={`border border-green-200 rounded p-2 ${
                          contrib.propertyId === investment.id ? 'bg-green-100' : 'bg-white'
                        }`}
                      >
                        <div className="font-semibold text-green-900 mb-1.5 pb-1 border-b border-green-200 flex items-center justify-between">
                          <span>{contrib.propertyName}</span>
                          {partial && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              partiel {Math.round(coverage * 100)}%
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 text-green-800">
                          {yearExpense && (
                            <>
                              {sci.taxParameters.rentalType === 'unfurnished' ? (
                                <div className="flex justify-between">
                                  <span className="pl-2">• Loyer nu :</span>
                                  <span>{formatCurrency(adjustForCoverage(Number(yearExpense.rent || 0), coverage))}</span>
                                </div>
                              ) : (
                                <div className="flex justify-between">
                                  <span className="pl-2">• Loyer meublé :</span>
                                  <span>{formatCurrency(adjustForCoverage(Number(yearExpense.furnishedRent || 0), coverage))}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex justify-between font-bold text-green-900 pt-1 mt-1 border-t border-green-300">
                            <span>Total bien :</span>
                            <span>{formatCurrency(contrib.revenues)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-900">
                  Charges déductibles
                </span>
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(taxResults.totalDeductibleExpenses)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-red-700">
                  Charges immobilières + intérêts prêts + assurances + charges SCI
                </p>
                <button
                  onClick={() => setShowChargesDetail(!showChargesDetail)}
                  className="text-xs text-red-700 hover:text-red-900 font-medium underline"
                >
                  {showChargesDetail ? 'Masquer' : 'Détail'}
                </button>
              </div>
              
              {showChargesDetail && (
                <div className="mt-3 pt-3 border-t border-red-300 space-y-2 text-xs">
                  {/* Détail par bien */}
                  {Object.values(taxResults.propertyContributions).map(contrib => {
                    const property = sciProperties.find(p => p.id === contrib.propertyId);
                    const yearExpense = property?.expenses.find(e => e.year === selectedYear);
                    
                    // Utiliser les fonctions de calcul communes
                    const coverage = property ? getYearCoverage(property, selectedYear) : 1;
                    const partial = coverage > 0 && coverage < 1;
                    
                    // Calculer les intérêts et assurances du prêt directement
                    const yearlyInterest = property ? getInterestForYear(property, selectedYear) : 0;
                    const loanInfo = property ? getLoanInfoForYear(property, selectedYear) : { payment: 0, insurance: 0 };
                    const adjustedInterest = adjustForCoverage(yearlyInterest, coverage);
                    const adjustedInsurance = adjustForCoverage(loanInfo.insurance, coverage);
                    
                    return (
                      <div key={contrib.propertyId} className="border border-red-200 rounded p-2 bg-red-50">
                        <div className="font-semibold text-red-900 mb-1.5 pb-1 border-b border-red-200 flex items-center justify-between">
                          <span>{contrib.propertyName}</span>
                          {partial && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-normal">
                              partiel {(coverage * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 text-red-800">
                          <div className="flex justify-between">
                            <span className="pl-2">• Taxe foncière :</span>
                            <span>{formatCurrency((yearExpense?.propertyTax || 0) * coverage)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="pl-2">• Charges copropriété :</span>
                            <span>{formatCurrency((yearExpense?.condoFees || 0) * coverage)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="pl-2">• Assurance propriétaire :</span>
                            <span>{formatCurrency((yearExpense?.propertyInsurance || 0) * coverage)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="pl-2">• Frais d'agence :</span>
                            <span>{formatCurrency((yearExpense?.managementFees || 0) * coverage)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="pl-2">• Assurance loyers impayés :</span>
                            <span>{formatCurrency((yearExpense?.unpaidRentInsurance || 0) * coverage)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="pl-2">• Travaux :</span>
                            <span>{formatCurrency((yearExpense?.repairs || 0) * coverage)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="pl-2">• Autres déductibles :</span>
                            <span>{formatCurrency((yearExpense?.otherDeductible || 0) * coverage)}</span>
                          </div>
                          <div className="flex justify-between font-medium text-blue-800 pt-0.5 border-t border-red-200">
                            <span className="pl-2">• Assurance emprunteur (calculée) :</span>
                            <span>{formatCurrency(adjustedInsurance)}</span>
                          </div>
                          <div className="flex justify-between font-medium text-blue-800">
                            <span className="pl-2">• Intérêts du prêt (calculés) :</span>
                            <span>{formatCurrency(adjustedInterest)}</span>
                          </div>
                          {yearExpense?.tenantCharges && yearExpense.tenantCharges > 0 && (
                            <div className="flex justify-between text-orange-700 pt-0.5 border-t border-red-200">
                              <span className="pl-2">• Charges locataire (non déduct.) :</span>
                              <span>- {formatCurrency(yearExpense.tenantCharges * coverage)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-red-900 pt-1 mt-1 border-t border-red-300">
                            <span>Total bien :</span>
                            <span>{formatCurrency(contrib.expenses)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Charges de fonctionnement SCI */}
                  {(() => {
                    // Calculer le prorata temporel pour l'affichage
                    const coverage = getYearCoverage(investment, currentYear);
                    const adjustForCoverage = (value: number) => Number((value * coverage).toFixed(2));
                    
                    return (
                      <div className="border border-red-200 rounded p-2 bg-red-50">
                        <div className="font-semibold text-red-900 mb-1.5 pb-1 border-b border-red-200 flex items-center justify-between">
                          <span>Charges de fonctionnement SCI</span>
                          {coverage < 1 && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              partiel {Math.round(coverage * 100)}%
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 text-red-800">
                          {sci.taxParameters.accountingFees > 0 && (
                            <div className="flex justify-between">
                              <span className="pl-2">• Frais comptables :</span>
                              <span>{formatCurrency(adjustForCoverage(sci.taxParameters.accountingFees))}</span>
                            </div>
                          )}
                          {sci.taxParameters.legalFees > 0 && (
                            <div className="flex justify-between">
                              <span className="pl-2">• Frais juridiques :</span>
                              <span>{formatCurrency(adjustForCoverage(sci.taxParameters.legalFees))}</span>
                            </div>
                          )}
                          {sci.taxParameters.bankFees > 0 && (
                            <div className="flex justify-between">
                              <span className="pl-2">• Frais bancaires :</span>
                              <span>{formatCurrency(adjustForCoverage(sci.taxParameters.bankFees))}</span>
                            </div>
                          )}
                          {sci.taxParameters.insuranceFees > 0 && (
                            <div className="flex justify-between">
                              <span className="pl-2">• Assurances SCI :</span>
                              <span>{formatCurrency(adjustForCoverage(sci.taxParameters.insuranceFees))}</span>
                            </div>
                          )}
                          {sci.taxParameters.otherExpenses > 0 && (
                            <div className="flex justify-between">
                              <span className="pl-2">• Autres charges :</span>
                              <span>{formatCurrency(adjustForCoverage(sci.taxParameters.otherExpenses))}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-red-900 pt-1 mt-1 border-t border-red-300">
                            <span>Total SCI :</span>
                            <span>
                              {formatCurrency(
                                adjustForCoverage(
                                  sci.taxParameters.accountingFees +
                                  sci.taxParameters.legalFees +
                                  sci.taxParameters.bankFees +
                                  sci.taxParameters.insuranceFees +
                                  sci.taxParameters.otherExpenses
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">
                  Amortissements
                </span>
                <Calculator className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(taxResults.totalAmortization)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-purple-700">
                  Biens, mobilier et travaux
                </p>
                <button
                  onClick={() => setShowAmortizationDetail(!showAmortizationDetail)}
                  className="text-xs text-purple-700 hover:text-purple-900 font-medium underline"
                >
                  {showAmortizationDetail ? 'Masquer' : 'Détail'}
                </button>
              </div>
              
              {showAmortizationDetail && (
                <div className="mt-3 pt-3 border-t border-purple-300 space-y-2 text-xs">
                  {/* Détail par bien */}
                  {Object.values(taxResults.propertyContributions).map(contrib => {
                    const property = sciProperties.find(p => p.id === contrib.propertyId);
                    const coverage = property ? getYearCoverage(property, selectedYear) : 1;
                    const partial = coverage > 0 && coverage < 1;
                    
                    // Calculer les composants de l'amortissement
                    const startYear = property ? new Date(property.projectStartDate).getFullYear() : selectedYear;
                    const yearsElapsed = selectedYear - startYear;
                    
                    const buildingAmortYears = property?.taxParameters?.buildingAmortizationYears || sci.taxParameters.buildingAmortizationYears;
                    const furnitureAmortYears = property?.taxParameters?.furnitureAmortizationYears || sci.taxParameters.furnitureAmortizationYears;
                    const worksAmortYears = property?.taxParameters?.worksAmortizationYears || sci.taxParameters.worksAmortizationYears;
                    
                    const buildingValue = property?.taxParameters?.buildingValue || (property?.purchasePrice * 0.8);
                    const furnitureValue = property?.taxParameters?.furnitureValue || property?.lmnpData?.furnitureValue || 0;
                    const worksValue = property?.renovationCosts || 0;
                    
                    const buildingAmort = (yearsElapsed >= 0 && yearsElapsed < buildingAmortYears) 
                      ? adjustForCoverage(buildingValue / buildingAmortYears, coverage) 
                      : 0;
                    const furnitureAmort = (furnitureValue > 0 && yearsElapsed >= 0 && yearsElapsed < furnitureAmortYears) 
                      ? adjustForCoverage(furnitureValue / furnitureAmortYears, coverage) 
                      : 0;
                    const worksAmort = (worksValue > 0 && yearsElapsed >= 0 && yearsElapsed < worksAmortYears) 
                      ? adjustForCoverage(worksValue / worksAmortYears, coverage) 
                      : 0;
                    
                    return (
                      <div
                        key={contrib.propertyId}
                        className={`border border-purple-200 rounded p-2 ${
                          contrib.propertyId === investment.id ? 'bg-purple-100' : 'bg-white'
                        }`}
                      >
                        <div className="font-semibold text-purple-900 mb-1.5 pb-1 border-b border-purple-200 flex items-center justify-between">
                          <span>{contrib.propertyName}</span>
                          {partial && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              partiel {Math.round(coverage * 100)}%
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 text-purple-800">
                          {buildingAmort > 0 && (
                            <div className="flex justify-between">
                              <span className="pl-2">• Bâtiment ({buildingAmortYears} ans) :</span>
                              <span>{formatCurrency(buildingAmort)}</span>
                            </div>
                          )}
                          {furnitureAmort > 0 && (
                            <div className="flex justify-between">
                              <span className="pl-2">• Mobilier ({furnitureAmortYears} ans) :</span>
                              <span>{formatCurrency(furnitureAmort)}</span>
                            </div>
                          )}
                          {worksAmort > 0 && (
                            <div className="flex justify-between">
                              <span className="pl-2">• Travaux ({worksAmortYears} ans) :</span>
                              <span>{formatCurrency(worksAmort)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-purple-900 pt-1 mt-1 border-t border-purple-300">
                            <span>Total bien :</span>
                            <span>{formatCurrency(contrib.amortization)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite : Résultats et IS */}
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-sm font-medium text-blue-900">
                Résultat avant déficit
              </span>
              <p className={`text-2xl font-bold mt-1 ${
                taxResults.resultBeforeDeficit >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>
                {formatCurrency(taxResults.resultBeforeDeficit)}
              </p>
            </div>

            {taxResults.deficitUsed > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <span className="text-sm font-medium text-orange-900">
                  Déficit utilisé
                </span>
                <p className="text-xl font-bold text-orange-600 mt-1">
                  {formatCurrency(taxResults.deficitUsed)}
                </p>
              </div>
            )}

            {taxResults.deficitGenerated > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <span className="text-sm font-medium text-orange-900">
                  Déficit généré (reportable)
                </span>
                <p className="text-xl font-bold text-orange-600 mt-1">
                  {formatCurrency(taxResults.deficitGenerated)}
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Reportable sans limite de temps
                </p>
              </div>
            )}

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <span className="text-sm font-medium text-indigo-900">
                Revenu imposable
              </span>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {formatCurrency(taxResults.taxableIncome)}
              </p>
            </div>

            {taxResults.totalIS > 0 && (
              <>
                <div className="border-t border-gray-200 pt-3 space-y-1.5">
                  {taxResults.isAtReducedRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        IS à 15% (jusqu'à {formatCurrency(sci.taxParameters.reducedRateThreshold)}) :
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(taxResults.isAtReducedRate)}
                      </span>
                    </div>
                  )}
                  {taxResults.isAtStandardRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        IS à 25% (au-delà de {formatCurrency(sci.taxParameters.reducedRateThreshold)}) :
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(taxResults.isAtStandardRate)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-3">
                  <span className="text-sm font-medium">
                    IMPÔT SUR LES SOCIÉTÉS (IS)
                  </span>
                  <p className="text-3xl font-bold mt-1">
                    {formatCurrency(taxResults.totalIS)}
                  </p>
                  <p className="text-xs mt-1 opacity-90">
                    À répartir entre les {sciProperties.length} bien(s) de la SCI
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Répartition par bien */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Répartition de l'IS par bien (prorata)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bien
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenus
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Charges
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amort.
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrib. résultat
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prorata
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IS alloué
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.values(taxResults.propertyContributions).map((contrib) => {
                const isCurrentProperty = contrib.propertyId === investment.id;
                return (
                  <tr 
                    key={contrib.propertyId}
                    className={isCurrentProperty ? 'bg-blue-50 font-semibold' : ''}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {contrib.propertyName}
                      {isCurrentProperty && (
                        <span className="ml-2 text-xs text-blue-600">(bien actuel)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(contrib.revenues)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">
                      {formatCurrency(contrib.expenses)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-purple-600">
                      {formatCurrency(contrib.amortization)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                      contrib.contributionToResult >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(contrib.contributionToResult)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                      {formatPercent(contrib.prorataWeight)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${
                      isCurrentProperty ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {formatCurrency(contrib.allocatedIS)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-100 font-bold">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  TOTAL SCI
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                  {formatCurrency(taxResults.totalRevenues)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                  {formatCurrency(taxResults.totalDeductibleExpenses)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                  {formatCurrency(taxResults.totalAmortization)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                  taxResults.resultBeforeDeficit >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {formatCurrency(taxResults.resultBeforeDeficit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  100%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                  {formatCurrency(taxResults.totalIS)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Highlight du bien actuel */}
        {currentPropertyContribution && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">
              💡 IS alloué à votre bien "{investment.name}"
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Part dans la SCI :</span>
                <p className="font-semibold text-blue-900 text-lg mt-1">
                  {formatPercent(currentPropertyContribution.prorataWeight)}
                </p>
              </div>
              <div>
                <span className="text-blue-700">Valeur du bien :</span>
                <p className="font-semibold text-blue-900 text-lg mt-1">
                  {formatCurrency(currentPropertyContribution.propertyValue)}
                </p>
              </div>
              <div>
                <span className="text-blue-700">Contribution :</span>
                <p className={`font-semibold text-lg mt-1 ${
                  currentPropertyContribution.contributionToResult >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(currentPropertyContribution.contributionToResult)}
                </p>
              </div>
              <div>
                <span className="text-blue-700">IS alloué :</span>
                <p className="font-semibold text-red-600 text-lg mt-1">
                  {formatCurrency(currentPropertyContribution.allocatedIS)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Projection pluriannuelle */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Projection de l'IS sur plusieurs années
        </h3>

        <div className="h-[400px]">
          <Line
            data={{
              labels: Object.keys(allResults).sort(),
              datasets: [
                {
                  label: 'Revenu imposable',
                  data: Object.values(allResults).map(r => r.taxableIncome),
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  yAxisID: 'y'
                },
                {
                  label: 'IS à payer',
                  data: Object.values(allResults).map(r => r.totalIS),
                  borderColor: 'rgb(239, 68, 68)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  yAxisID: 'y'
                },
                {
                  label: 'Déficit reportable',
                  data: Object.values(allResults).map(r => r.deficitCarriedForward),
                  borderColor: 'rgb(245, 158, 11)',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  yAxisID: 'y'
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index',
                intersect: false
              },
              scales: {
                y: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                  ticks: {
                    callback: (value) => formatCurrency(Number(value))
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top'
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

