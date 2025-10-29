import { 
  FaHome, 
  FaKey, 
  FaCalculator, 
  FaChartLine, 
  FaChartBar 
} from 'react-icons/fa';
import AcquisitionDetails from './AcquisitionDetails';

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
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Régime fiscal</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.taxRegime || 'Non défini'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Taux d'imposition</span>
                <span className="text-sm font-semibold text-gray-900">
                  {investmentData?.taxRate || 0}%
                </span>
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
