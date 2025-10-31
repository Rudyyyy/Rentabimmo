import { 
  FaHome, 
  FaKey, 
  FaCalculator, 
  FaChartLine, 
  FaChartBar,
  FaMoneyBillWave 
} from 'react-icons/fa';
import { useEffect, useState } from 'react';
import AcquisitionDetails from './AcquisitionDetails';
import { TaxRegime, Investment } from '../types/investment';

type MainTab = 'acquisition' | 'location' | 'imposition' | 'rentabilite' | 'bilan';

interface SidebarContentProps {
  currentMainTab: MainTab;
  currentSubTab?: string;
  investmentData?: any;
  metrics?: any;
  onInvestmentUpdate?: (field: any, value: any) => void;
}

const tabConfigs = [
  { id: 'acquisition' as MainTab, label: 'Acquisition', icon: FaHome },
  { id: 'location' as MainTab, label: 'Location', icon: FaKey },
  { id: 'imposition' as MainTab, label: 'Imposition', icon: FaCalculator },
  { id: 'rentabilite' as MainTab, label: 'Rentabilité', icon: FaChartLine },
  { id: 'bilan' as MainTab, label: 'Bilan', icon: FaChartBar },
];

export default function SidebarContent({ currentMainTab, currentSubTab, investmentData, metrics, onInvestmentUpdate }: SidebarContentProps) {
  const currentConfig = tabConfigs.find(tab => tab.id === currentMainTab);

  if (!currentConfig) return null;

  // Utilitaires d'affichage
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const isCashflowView = currentMainTab === 'rentabilite' && currentSubTab === 'cashflow';
  const isReventeView = currentMainTab === 'rentabilite' && currentSubTab === 'revente';

  // Identifiant et états partagés (utilisés pour Revente)
  const investmentId = `${investmentData?.purchasePrice || 0}_${investmentData?.startDate || ''}`;
  type SaleParameters = { annualIncrease: number; agencyFees: number; earlyRepaymentFees: number };
  const [saleParams, setSaleParams] = useState<SaleParameters>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`saleParameters_${investmentId}`) : null;
    return stored ? JSON.parse(stored) : { annualIncrease: 2, agencyFees: 0, earlyRepaymentFees: 0 };
  });
  const [selectedRegime, setSelectedRegime] = useState<string>(() => localStorage.getItem(`selectedRegime_${investmentId}`) || 'micro-foncier');
  const [saleYears, setSaleYears] = useState<number[]>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`saleYears_${investmentId}`) : null;
    if (stored) return JSON.parse(stored);
    const startYear = investmentData?.projectStartDate ? new Date(investmentData.projectStartDate).getFullYear() : new Date().getFullYear();
    const endYear = investmentData?.projectEndDate ? new Date(investmentData.projectEndDate).getFullYear() : startYear;
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  });
  const [targetSaleYear, setTargetSaleYear] = useState<number>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`targetSaleYear_${investmentId}`) : null;
    if (stored) return Number(stored);
    return saleYears[saleYears.length - 1] || new Date().getFullYear();
  });
  const [targetBalance, setTargetBalance] = useState<number>(0);

  // Effets de synchronisation (écoute des mises à jour depuis la page centrale)
  useEffect(() => {
    const stored = localStorage.getItem(`saleParameters_${investmentId}`);
    if (stored) setSaleParams(JSON.parse(stored));
  }, [investmentId]);

  useEffect(() => {
    const onSelectedRegime = (e: any) => {
      if (e?.detail?.investmentId === investmentId) {
        setSelectedRegime(localStorage.getItem(`selectedRegime_${investmentId}`) || 'micro-foncier');
      }
    };
    const onBalancesUpdated = (e: any) => {
      if (e?.detail?.investmentId === investmentId) {
        const yearsStr = localStorage.getItem(`saleYears_${investmentId}`);
        if (yearsStr) setSaleYears(JSON.parse(yearsStr));
        updateTargetBalance(targetSaleYear);
      }
    };
    window.addEventListener('selectedRegimeUpdated', onSelectedRegime as EventListener);
    window.addEventListener('balancesUpdated', onBalancesUpdated as EventListener);
    return () => {
      window.removeEventListener('selectedRegimeUpdated', onSelectedRegime as EventListener);
      window.removeEventListener('balancesUpdated', onBalancesUpdated as EventListener);
    };
  }, [investmentId, targetSaleYear]);

  useEffect(() => {
    updateTargetBalance(targetSaleYear);
  }, [selectedRegime, targetSaleYear, investmentId]);

  const updateTargetBalance = (year: number) => {
    try {
      const key = `balances_${investmentId}_${selectedRegime}`;
      const data = localStorage.getItem(key);
      if (data) {
        const map = JSON.parse(data) as Record<string, number>;
        setTargetBalance(map[year] ?? 0);
      }
    } catch {}
  };

  // Calcul du cashflow (sans imposition) pour une année donnée selon un type de location
  const calculateYearCashFlow = (year: number, type: 'nu' | 'meuble') => {
    if (!investmentData?.expenses) return 0;
    const expense = investmentData.expenses.find((e: any) => e.year === year);
    if (!expense) return 0;

    const rent = Number(expense.rent || 0);
    const furnishedRent = Number(expense.furnishedRent || 0);
    const tenantCharges = Number(expense.tenantCharges || 0);
    const taxBenefit = Number(expense.taxBenefit || 0);

    const revenues = type === 'meuble'
      ? furnishedRent + tenantCharges
      : rent + taxBenefit + tenantCharges;

    const totalExpenses =
      Number(expense.propertyTax || 0) +
      Number(expense.condoFees || 0) +
      Number(expense.propertyInsurance || 0) +
      Number(expense.managementFees || 0) +
      Number(expense.unpaidRentInsurance || 0) +
      Number(expense.repairs || 0) +
      Number(expense.otherDeductible || 0) +
      Number(expense.otherNonDeductible || 0) +
      Number(expense.loanPayment || 0) +
      Number(expense.loanInsurance || 0);

    return revenues - totalExpenses;
  };

  const renderSidebarContent = () => {
    switch (currentMainTab) {
      case 'acquisition':
        return onInvestmentUpdate ? (
          <AcquisitionDetails 
            investment={investmentData} 
            onUpdate={onInvestmentUpdate} 
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Prix d'achat</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.purchasePrice?.toLocaleString('fr-FR') || '0'} €
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Frais de notaire</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.notaryFees?.toLocaleString('fr-FR') || '0'} €
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Travaux</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.renovationCosts?.toLocaleString('fr-FR') || '0'} €
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center py-2 bg-blue-50 rounded-md px-3">
                  <span className="text-sm font-semibold text-blue-900">Total acquisition</span>
                  <span className="text-lg font-bold text-blue-900">
                    {((investmentData?.purchasePrice || 0) + 
                      (investmentData?.notaryFees || 0) + 
                      (investmentData?.renovationCosts || 0)).toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'location':
        const monthlyRent = investmentData?.monthlyRent || 0;
        const monthlyCharges = investmentData?.monthlyCharges || 0;
        const netRent = monthlyRent - monthlyCharges;
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Loyer mensuel</span>
                <span className="text-sm font-semibold text-gray-900">
                  {monthlyRent.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Charges mensuelles</span>
                <span className="text-sm font-semibold text-gray-900">
                  {monthlyCharges.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Vacance locative</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.vacancyRate || 0}%
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center py-2 bg-green-50 rounded-md px-3">
                  <span className="text-sm font-semibold text-green-900">Loyer net mensuel</span>
                  <span className="text-lg font-bold text-green-900">
                    {netRent.toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'imposition':
        const regimeLabels: Record<TaxRegime, string> = {
          'micro-foncier': 'Location nue - Micro-foncier',
          'reel-foncier': 'Location nue - Frais réels',
          'micro-bic': 'LMNP - Micro-BIC',
          'reel-bic': 'LMNP - Frais réels'
        };

        const currentRegime: TaxRegime = investmentData?.selectedRegime || investmentData?.taxRegime || 'micro-foncier';

        const handleRegimeChange = (value: TaxRegime) => {
          if (onInvestmentUpdate) {
            onInvestmentUpdate('selectedRegime', value);
            onInvestmentUpdate('taxRegime', value);
          }
        };

        return (
          <div className="space-y-6">
            {/* Régime fiscal: libellé + saisie sur une ligne */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Régime fiscal</span>
                <select
                  value={currentRegime}
                  onChange={(e) => handleRegimeChange(e.target.value as TaxRegime)}
                  className="ml-3 w-56 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {(Object.keys(regimeLabels) as TaxRegime[]).map((regime) => (
                    <option key={regime} value={regime}>{regimeLabels[regime]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Paramètres fiscaux communs: libellé + saisie sur une ligne */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Paramètres fiscaux communs</h4>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Taux marginal d'imposition (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={investmentData?.taxParameters?.taxRate ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    taxRate: Number(e.target.value)
                  })}
                  className="ml-3 w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Taux des prélèvements sociaux (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={investmentData?.taxParameters?.socialChargesRate ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    socialChargesRate: Number(e.target.value)
                  })}
                  className="ml-3 w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            {/* Paramètres LMNP */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Paramètres LMNP</h4>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Valeur du bien (hors terrain)</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.buildingValue ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    buildingValue: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Durée d'amortissement du bien (années)</span>
                <input
                  type="number"
                  step="1"
                  value={investmentData?.taxParameters?.buildingAmortizationYears ?? 25}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    buildingAmortizationYears: Number(e.target.value)
                  })}
                  className="ml-3 w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Valeur du mobilier</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.furnitureValue ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    furnitureValue: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Durée d'amortissement du mobilier (années)</span>
                <input
                  type="number"
                  step="1"
                  value={investmentData?.taxParameters?.furnitureAmortizationYears ?? 10}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    furnitureAmortizationYears: Number(e.target.value)
                  })}
                  className="ml-3 w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Valeur des travaux</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.worksValue ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    worksValue: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Durée d'amortissement des travaux (années)</span>
                <input
                  type="number"
                  step="1"
                  value={investmentData?.taxParameters?.worksAmortizationYears ?? 10}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    worksAmortizationYears: Number(e.target.value)
                  })}
                  className="ml-3 w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Valeur des autres éléments</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.otherValue ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    otherValue: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Durée d'amortissement autres éléments (années)</span>
                <input
                  type="number"
                  step="1"
                  value={investmentData?.taxParameters?.otherAmortizationYears ?? 5}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    otherAmortizationYears: Number(e.target.value)
                  })}
                  className="ml-3 w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            {/* Paramètres Location Nue */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Paramètres Location Nue</h4>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Déficit foncier reporté</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.previousDeficit ?? 0}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    previousDeficit: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Plafond de déduction du déficit foncier</span>
                <input
                  type="number"
                  step="100"
                  value={investmentData?.taxParameters?.deficitLimit ?? 10700}
                  onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('taxParameters', {
                    ...investmentData?.taxParameters,
                    deficitLimit: Number(e.target.value)
                  })}
                  className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                />
              </div>
            </div>
          </div>
        );

      case 'rentabilite':
        if (isReventeView) {
          const updateSaleParams = (field: keyof SaleParameters, value: number) => {
            const next = { ...saleParams, [field]: value } as SaleParameters;
            setSaleParams(next);
            localStorage.setItem(`saleParameters_${investmentId}`, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent('saleParametersUpdated', { detail: { investmentId } }));
          };

          return (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Année objectif revente</span>
                  <select
                    value={targetSaleYear}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      setTargetSaleYear(y);
                      localStorage.setItem(`targetSaleYear_${investmentId}`, String(y));
                      updateTargetBalance(y);
                    }}
                    className="ml-3 w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {saleYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">% augmentation annuelle</span>
                  <input
                    type="number"
                    step={0.1}
                    value={saleParams.annualIncrease}
                    onChange={(e) => updateSaleParams('annualIncrease', Number(e.target.value))}
                    className="ml-3 w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                  />
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Frais d'agence</span>
                  <input
                    type="number"
                    value={saleParams.agencyFees}
                    onChange={(e) => updateSaleParams('agencyFees', Number(e.target.value))}
                    className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Frais de remboursements anticipés</span>
                  <input
                    type="number"
                    value={saleParams.earlyRepaymentFees}
                    onChange={(e) => updateSaleParams('earlyRepaymentFees', Number(e.target.value))}
                    className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                  />
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Travaux d'amélioration non déduits</span>
                  <input
                    type="number"
                    value={investmentData?.improvementWorks ?? 0}
                    onChange={(e) => onInvestmentUpdate && onInvestmentUpdate('improvementWorks', Number(e.target.value))}
                    className="ml-3 w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                  />
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className={`flex justify-between items-center py-2 rounded-md px-3 ${
                    (targetBalance || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className={`text-sm font-semibold ${
                      (targetBalance || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      Solde ({selectedRegime}) · {targetSaleYear}
                    </span>
                    <span className={`text-lg font-bold ${
                      (targetBalance || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {formatCurrency(targetBalance || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        const currentYear = new Date().getFullYear();
        const cashFlowNu = calculateYearCashFlow(currentYear, 'nu');
        const cashFlowMeuble = calculateYearCashFlow(currentYear, 'meuble');
        const monthlyNu = cashFlowNu / 12;
        const monthlyMeuble = cashFlowMeuble / 12;

        // Calculer les rentabilités pour micro-foncier et micro-bic (identiques au tableau ResultsDisplay)
        let grossYieldNu = 0;
        let netYieldNu = 0;
        let grossYieldMeuble = 0;
        let netYieldMeuble = 0;

        if (investmentData) {
          const investment = investmentData as Investment;
          const yearExpenses = investment.expenses?.find(e => e.year === currentYear);
          
          if (yearExpenses) {
            // Coût total identique au tableau (achat + frais annexes + travaux)
            const totalCost = Number(investment.purchasePrice || 0) +
                              Number(investment.agencyFees || 0) +
                              Number(investment.notaryFees || 0) +
                              Number(investment.bankFees || 0) +
                              Number(investment.bankGuaranteeFees || 0) +
                              Number(investment.mandatoryDiagnostics || 0) +
                              Number(investment.renovationCosts || 0);

            // Revenus bruts par régime (sans charges locataires)
            const rent = Number(yearExpenses?.rent || 0);
            const furnishedRent = Number(yearExpenses?.furnishedRent || 0);
            const taxBenefit = Number(yearExpenses?.taxBenefit || 0);
            const grossRevenueNu = rent + taxBenefit; // micro-foncier
            const grossRevenueMeuble = furnishedRent; // micro-bic

            // Charges identiques au tableau (hors charges locataires)
            const totalCharges =
              Number(yearExpenses?.propertyTax || 0) +
              Number(yearExpenses?.condoFees || 0) +
              Number(yearExpenses?.propertyInsurance || 0) +
              Number(yearExpenses?.managementFees || 0) +
              Number(yearExpenses?.unpaidRentInsurance || 0) +
              Number(yearExpenses?.repairs || 0) +
              Number(yearExpenses?.otherDeductible || 0) +
              Number(yearExpenses?.otherNonDeductible || 0) -
              Number(yearExpenses?.tenantCharges || 0);

            if (totalCost > 0) {
              grossYieldNu = (grossRevenueNu / totalCost) * 100;
              grossYieldMeuble = (grossRevenueMeuble / totalCost) * 100;
              netYieldNu = ((grossRevenueNu - totalCharges) / totalCost) * 100;
              netYieldMeuble = ((grossRevenueMeuble - totalCharges) / totalCost) * 100;
            }
          }
        }

        return (
          <div className="space-y-4">
            {!isCashflowView && (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Rentabilité brute location nue</span>
                  <span className="text-sm font-semibold text-green-600">
                    {grossYieldNu.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Rentabilité hors impôts location nue</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {netYieldNu.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-2">
                  <span className="text-sm text-gray-600">Rentabilité brute location meublée</span>
                  <span className="text-sm font-semibold text-green-600">
                    {grossYieldMeuble.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Rentabilité hors impôts location meublée</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {netYieldMeuble.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            {isCashflowView && (
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className={`flex justify-between items-center py-2 rounded-md px-3 ${
                  cashFlowNu >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <span className={`text-sm font-semibold ${
                    cashFlowNu >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Location nue
                    <span className="ml-2 text-xs font-normal text-gray-600">(Année {currentYear} · Mensuel {formatCurrency(monthlyNu)})</span>
                  </span>
                  <span className={`text-sm font-bold ${
                    cashFlowNu >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {formatCurrency(cashFlowNu)}
                  </span>
                </div>
                <div className={`flex justify-between items-center py-2 rounded-md px-3 ${
                  cashFlowMeuble >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <span className={`text-sm font-semibold ${
                    cashFlowMeuble >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Location meublée
                    <span className="ml-2 text-xs font-normal text-gray-600">(Année {currentYear} · Mensuel {formatCurrency(monthlyMeuble)})</span>
                  </span>
                  <span className={`text-sm font-bold ${
                    cashFlowMeuble >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {formatCurrency(cashFlowMeuble)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case 'bilan':
        return (
          <div className="space-y-4">
            {metrics && (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Cash flow annuel</span>
                  <span className={`text-sm font-semibold ${
                    (metrics.annualCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metrics.annualCashFlow?.toLocaleString('fr-FR') || '0'} €
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">ROI</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {metrics.roi?.toFixed(2) || '0.00'}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">TRI</span>
                  <span className="text-sm font-semibold text-purple-600">
                    {metrics.irr?.toFixed(2) || '0.00'}%
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className={`flex justify-between items-center py-2 rounded-md px-3 ${
                    (metrics.annualCashFlow || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className={`text-sm font-semibold ${
                      (metrics.annualCashFlow || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      Rentabilité
                    </span>
                    <span className={`text-lg font-bold ${
                      (metrics.annualCashFlow || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {(metrics.annualCashFlow || 0) >= 0 ? 'Positive' : 'Négative'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sélectionnez une section pour voir les informations détaillées.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex items-center space-x-2">
        {isCashflowView ? (
          <FaMoneyBillWave className="h-5 w-5 text-blue-600" />
        ) : isReventeView ? (
          <FaHome className="h-5 w-5 text-blue-600" />
        ) : (
          <currentConfig.icon className="h-5 w-5 text-blue-600" />
        )}
        <h3 className="text-lg font-semibold text-gray-900">{isCashflowView ? 'Cashflow' : isReventeView ? 'Revente' : currentConfig.label}</h3>
      </div>
      <div className="border-t border-gray-100 pt-4">
        {renderSidebarContent()}
      </div>
    </div>
  );
}
