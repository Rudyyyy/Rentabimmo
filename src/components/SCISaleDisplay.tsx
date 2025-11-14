/**
 * Composant SCISaleDisplay
 * 
 * Ce composant gère l'affichage et le calcul des résultats de revente pour un bien détenu en SCI.
 * Contrairement aux biens en nom propre, les SCI à l'IS ne bénéficient pas des abattements IRPP.
 * 
 * Fonctionnalités principales :
 * - Simulation de revente avec paramètres personnalisables
 * - Calcul simplifié pour SCI (location nue vs meublée uniquement)
 * - Calcul de la plus-value selon les règles de l'IS
 * - Visualisation graphique de l'évolution du solde
 * - Explications détaillées du calcul de plus-value en SCI
 */

import { useState, useEffect } from 'react';
import { Investment } from '../types/investment';
import { generateAmortizationSchedule } from '../utils/calculations';
import { getLoanInfoForYear, getYearCoverage } from '../utils/propertyCalculations';
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

// Types de location pour SCI (simplifié)
type RentalType = 'unfurnished' | 'furnished';

// Labels des types de location
const RENTAL_TYPE_LABELS = {
  'unfurnished': 'Location nue',
  'furnished': 'Location meublée'
};

export default function SCISaleDisplay({ investment, onUpdate }: Props) {
  // Créer un identifiant unique basé sur le prix d'achat et la date de début
  const investmentId = `${investment.purchasePrice}_${investment.startDate}`;
  
  // État du type de location sélectionné
  const [selectedType, setSelectedType] = useState<RentalType>('unfurnished');

  // État pour les paramètres de revente avec persistance dans le localStorage
  const [saleParams, setSaleParams] = useState<SaleParameters>(() => {
    const stored = localStorage.getItem(`saleParameters_${investmentId}`);
    return stored ? JSON.parse(stored) : {
      annualIncrease: 2,
      agencyFees: 0,
      earlyRepaymentFees: 0
    };
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value || 0);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' %';

  // Calculer le prix d'achat total
  const purchasePrice = Number(investment.purchasePrice) || 0;
  const acquisitionFees = (Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0);
  const improvementWorks = Number(investment.improvementWorks) || 0;
  const correctedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;

  // Préparer les données pour le tableau
  const prepareTableData = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

    // Calculer les valeurs revalorisées pour chaque année
    const revaluedValues = years.map((year, index) => {
      return purchasePrice * Math.pow(1 + saleParams.annualIncrease / 100, index + 1);
    });

    return {
      years,
      revaluedValues
    };
  };

  const saleTable = prepareTableData();

  // Calculer le capital restant dû pour une année donnée
  const getRemainingBalance = (yearIndex: number) => {
    if (!investment.loanAmount || investment.loanAmount === 0) {
      return 0;
    }

    const year = saleTable.years[yearIndex];
    
    // Générer le tableau d'amortissement
    const amortizationSchedule = generateAmortizationSchedule(
      Number(investment.loanAmount),
      Number(investment.interestRate),  // ← Correction : interestRate au lieu de loanRate
      Number(investment.loanDuration),
      investment.deferralType || 'none',
      Number(investment.deferredPeriod) || 0,
      investment.startDate  // ← Correction : startDate au lieu de loanStartDate
    );

    // Vérifier que le schedule est valide
    if (!amortizationSchedule || !amortizationSchedule.schedule || !Array.isArray(amortizationSchedule.schedule)) {
      return 0;
    }

    // Calculer le capital restant dû à la fin de l'année
    const yearEndDate = new Date(year, 11, 31);
    const yearPayments = amortizationSchedule.schedule.filter(row => new Date(row.date) <= yearEndDate);
    
    if (yearPayments.length === 0) {
      return Number(investment.loanAmount);
    }
    
    const totalPaid = yearPayments.reduce((sum, row) => sum + row.principal, 0);
    return Number(investment.loanAmount) - totalPaid;
  };

  // Calculer la plus-value brute
  const calculateRawPlusValue = (yearIndex: number) => {
    const revaluedValue = saleTable.revaluedValues[yearIndex];
    const netSellingPrice = revaluedValue - saleParams.agencyFees;
    return netSellingPrice - correctedPurchasePrice;
  };

  // Calculer l'impôt sur la plus-value (IS simplifié à 25%)
  // Note: Dans la réalité, c'est plus complexe car il faut tenir compte des amortissements
  const calculateCapitalGainTax = (yearIndex: number) => {
    const rawPlusValue = calculateRawPlusValue(yearIndex);
    
    // Pour les SCI à l'IS, la plus-value est imposée au taux de l'IS (25%)
    // Pas d'abattement pour durée de détention
    const taxRate = 0.25;
    
    if (rawPlusValue > 0) {
      return rawPlusValue * taxRate;
    }
    
    return 0;
  };

  // Calculer le solde après revente
  const calculateBalance = (yearIndex: number, rentalType: RentalType) => {
    const revaluedValue = saleTable.revaluedValues[yearIndex];
    const netSellingPrice = revaluedValue - saleParams.agencyFees;
    const remainingBalance = getRemainingBalance(yearIndex);
    const capitalGainTax = calculateCapitalGainTax(yearIndex);
    const earlyRepaymentFees = saleParams.earlyRepaymentFees;
    
    // Calculer le cash flow cumulé jusqu'à cette année
    const year = saleTable.years[yearIndex];
    const startYear = saleTable.years[0];
    const cumulativeCashFlow = calculateCumulativeCashFlow(startYear, year, rentalType);
    
    // Apport initial
    const downPayment = correctedPurchasePrice + 
                       Number(investment.bankFees || 0) + 
                       Number(investment.bankGuaranteeFees || 0) + 
                       Number(investment.mandatoryDiagnostics || 0) + 
                       Number(investment.renovationCosts || 0) - 
                       Number(investment.loanAmount || 0);
    
    // Solde = Prix de vente net - Capital restant dû - Frais de remboursement anticipé - Impôt PV + Cash flow cumulé - Apport
    return netSellingPrice - remainingBalance - earlyRepaymentFees - capitalGainTax + cumulativeCashFlow - downPayment;
  };

  // Calculer le cash flow cumulé entre deux années
  const calculateCumulativeCashFlow = (fromYear: number, toYear: number, rentalType: RentalType) => {
    let total = 0;
    
    for (let year = fromYear; year <= toYear; year++) {
      const expense = investment.expenses.find(e => e.year === year);
      if (expense) {
        // Calculer le prorata temporel de l'année
        const coverage = getYearCoverage(investment, year);
        const adjustForCoverage = (value: number) => value * coverage;
        
        // Revenus avec prorata
        const revenues = rentalType === 'furnished' 
          ? adjustForCoverage(Number(expense.furnishedRent || 0))
          : adjustForCoverage(Number(expense.rent || 0));
        
        // Charges avec prorata
        const charges = 
          adjustForCoverage(Number(expense.propertyTax || 0)) +
          adjustForCoverage(Number(expense.condoFees || 0)) +
          adjustForCoverage(Number(expense.propertyInsurance || 0)) +
          adjustForCoverage(Number(expense.managementFees || 0)) +
          adjustForCoverage(Number(expense.unpaidRentInsurance || 0)) +
          adjustForCoverage(Number(expense.repairs || 0)) +
          adjustForCoverage(Number(expense.otherDeductible || 0)) +
          adjustForCoverage(Number(expense.otherNonDeductible || 0)) -
          adjustForCoverage(Number(expense.tenantCharges || 0));
        
        // Coûts du prêt calculés dynamiquement (prorata automatique)
        const loanInfo = getLoanInfoForYear(investment, year);
        const loanCosts = loanInfo.payment + loanInfo.insurance;
        
        total += revenues - charges - loanCosts;
      }
    }
    
    return total;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Bannière explicative SCI */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Bien détenu en SCI :</strong> Les plus-values immobilières réalisées par une SCI soumise à l'IS 
              sont imposées au taux de l'impôt sur les sociétés (25%). Contrairement aux particuliers, il n'existe pas 
              d'abattement pour durée de détention. L'impôt est calculé sur la différence entre le prix de vente net 
              et le prix d'acquisition corrigé.
            </p>
          </div>
        </div>
      </div>

      {/* Graphique d'évolution du solde */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold mb-4">Évolution du solde après revente</h3>
        <div className="h-96">
          <Line 
            data={{
              labels: saleTable.years,
              datasets: Object.entries(RENTAL_TYPE_LABELS).map(([type, label], index) => {
                const colors = [
                  'rgba(59, 130, 246, 0.7)', // blue
                  'rgba(139, 92, 246, 0.7)', // purple
                ];
                return {
                  label,
                  data: saleTable.years.map((year, yearIndex) => {
                    return calculateBalance(yearIndex, type as RentalType);
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
          <p><strong>Note :</strong> Ce graphique montre le solde que vous obtiendriez après la revente pour chaque année, 
          en tenant compte des frais de vente, de l'impôt sur la plus-value au taux de l'IS (25%), et du capital restant dû. 
          Il permet de comparer l'impact du type de location sur le solde net.</p>
        </div>
      </div>

      {/* Tableau des résultats */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Résultats de la revente</h3>
          
          {/* Navigation des onglets */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {Object.entries(RENTAL_TYPE_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type as RentalType)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${selectedType === type
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Année de revente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix de vente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plus-value brute
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impôt PV (IS 25%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capital restant dû
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solde net
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {saleTable.years.map((year, index) => {
                  const revaluedValue = saleTable.revaluedValues[index];
                  const rawPlusValue = calculateRawPlusValue(index);
                  const capitalGainTax = calculateCapitalGainTax(index);
                  const remainingBalance = getRemainingBalance(index);
                  const balance = calculateBalance(index, selectedType);

                  return (
                    <tr key={year}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(revaluedValue)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        rawPlusValue >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(rawPlusValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {formatCurrency(capitalGainTax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(remainingBalance)}
                      </td>
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

      {/* Section explicative du calcul de plus-value en SCI */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Calcul de la plus-value immobilière en SCI à l'IS</h3>
        
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 mb-4">
            Lorsqu'une SCI soumise à l'impôt sur les sociétés (IS) revend un bien immobilier, la plus-value réalisée 
            est imposée différemment des particuliers. Voici comment se déroule le calcul :
          </p>

          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Étapes du calcul :</h4>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                <strong>Prix d'acquisition corrigé</strong> = Prix d'achat + Frais d'acquisition (notaire + agence) + Travaux d'amélioration
              </li>
              <li>
                <strong>Prix de vente net</strong> = Prix de vente - Frais d'agence à la revente
              </li>
              <li>
                <strong>Plus-value brute</strong> = Prix de vente net - Prix d'acquisition corrigé
              </li>
              <li>
                <strong>Impôt sur la plus-value</strong> = Plus-value brute × 25% (taux IS)
              </li>
              <li>
                <strong>Solde net après revente</strong> = Prix de vente net - Capital restant dû - Frais remboursement anticipé - Impôt PV + Cash flow cumulé - Apport initial
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">Exemple concret (première année du tableau) :</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="grid grid-cols-2 gap-2">
                <span>Prix d'achat :</span>
                <span className="font-medium">{formatCurrency(purchasePrice)}</span>
                
                <span>Frais d'acquisition :</span>
                <span className="font-medium">{formatCurrency(acquisitionFees)}</span>
                
                <span>Travaux d'amélioration :</span>
                <span className="font-medium">{formatCurrency(improvementWorks)}</span>
                
                <span className="font-bold">Prix d'acquisition corrigé :</span>
                <span className="font-bold">{formatCurrency(correctedPurchasePrice)}</span>
                
                <span>Prix de vente estimé :</span>
                <span className="font-medium">{formatCurrency(saleTable.revaluedValues[0])}</span>
                
                <span>Frais d'agence :</span>
                <span className="font-medium">{formatCurrency(saleParams.agencyFees)}</span>
                
                <span className="font-bold">Prix de vente net :</span>
                <span className="font-bold">{formatCurrency(saleTable.revaluedValues[0] - saleParams.agencyFees)}</span>
                
                <span className="font-bold text-emerald-700">Plus-value brute :</span>
                <span className="font-bold text-emerald-700">{formatCurrency(calculateRawPlusValue(0))}</span>
                
                <span className="font-bold text-red-700">Impôt sur la plus-value (25%) :</span>
                <span className="font-bold text-red-700">{formatCurrency(calculateCapitalGainTax(0))}</span>
                
                <span className="font-bold text-emerald-700">Plus-value nette après impôt :</span>
                <span className="font-bold text-emerald-700">{formatCurrency(calculateRawPlusValue(0) - calculateCapitalGainTax(0))}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Différences avec les particuliers :</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800">
              <li>
                <strong>Pas d'abattement pour durée de détention</strong> : Contrairement aux particuliers qui bénéficient 
                d'abattements progressifs (exonération totale après 22 ans pour l'IR et 30 ans pour les prélèvements sociaux), 
                les SCI à l'IS ne profitent d'aucun abattement, quelle que soit la durée de détention.
              </li>
              <li>
                <strong>Taux d'imposition fixe</strong> : La plus-value est imposée au taux de l'IS (25% actuellement), 
                alors que les particuliers paient 19% d'IR + 17,2% de prélèvements sociaux = 36,2%.
              </li>
              <li>
                <strong>Amortissements à réintégrer</strong> : Si la SCI a pratiqué des amortissements comptables 
                (cas de la location meublée), ceux-ci doivent être réintégrés fiscalement lors de la revente, 
                ce qui augmente la plus-value imposable. Ce calcul complexe n'est pas détaillé ici.
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <h4 className="font-semibold text-green-900 mb-2">💡 Points à retenir :</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-green-800">
              <li>
                Le calcul présenté ici est <strong>simplifié</strong>. Dans la réalité, il faut tenir compte des amortissements 
                pratiqués, des provisions, et d'autres éléments comptables spécifiques aux SCI.
              </li>
              <li>
                L'<strong>impôt sur les sociétés</strong> calculé au niveau de la SCI doit être distingué de l'imposition 
                des associés sur les dividendes qu'ils percevront lors de la distribution du produit de la vente.
              </li>
              <li>
                Le solde net indiqué dans le tableau représente le montant disponible pour la SCI après règlement 
                de tous les frais et impôts liés à la revente.
              </li>
              <li>
                Pour une analyse fiscale précise, il est recommandé de consulter un expert-comptable ou un conseiller 
                en gestion de patrimoine spécialisé dans les SCI.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

