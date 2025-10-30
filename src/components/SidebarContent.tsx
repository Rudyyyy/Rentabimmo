import { 
  FaHome, 
  FaKey, 
  FaCalculator, 
  FaChartLine, 
  FaChartBar 
} from 'react-icons/fa';
import AcquisitionDetails from './AcquisitionDetails';
import { TaxRegime } from '../types/investment';

type MainTab = 'acquisition' | 'location' | 'imposition' | 'rentabilite' | 'bilan';

interface SidebarContentProps {
  currentMainTab: MainTab;
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

export default function SidebarContent({ currentMainTab, investmentData, metrics, onInvestmentUpdate }: SidebarContentProps) {
  const currentConfig = tabConfigs.find(tab => tab.id === currentMainTab);

  if (!currentConfig) return null;

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
        return (
          <div className="space-y-4">
            {metrics && (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Rentabilité brute</span>
                  <span className="text-sm font-semibold text-green-600">
                    {metrics.grossYield?.toFixed(2) || '0.00'}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Rentabilité nette</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {metrics.netYield?.toFixed(2) || '0.00'}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">TRI</span>
                  <span className="text-sm font-semibold text-purple-600">
                    {metrics.irr?.toFixed(2) || '0.00'}%
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center py-2 bg-gradient-to-r from-blue-50 to-green-50 rounded-md px-3">
                    <span className="text-sm font-semibold text-gray-900">ROI</span>
                    <span className="text-lg font-bold text-blue-900">
                      {metrics.roi?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
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
        <currentConfig.icon className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">{currentConfig.label}</h3>
      </div>
      <div className="border-t border-gray-100 pt-4">
        {renderSidebarContent()}
      </div>
    </div>
  );
}
