import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { 
  FaHome, 
  FaKey, 
  FaCalculator, 
  FaChartLine, 
  FaChartBar,
  FaInfoCircle,
  FaCog,
  FaFileAlt,
  FaMoneyBillWave,
  FaChartPie
} from 'react-icons/fa';
import { Investment } from '../types/investment';

type MainTab = 'acquisition' | 'location' | 'imposition' | 'rentabilite' | 'bilan';

interface SubTabConfig {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface MainTabConfig {
  id: MainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  subTabs?: SubTabConfig[];
  sidebarContent?: React.ReactNode;
}

interface HierarchicalNavigationProps {
  onTabChange: (mainTab: MainTab, subTab?: string) => void;
  initialMainTab?: MainTab;
  initialSubTab?: string;
  investmentData?: any;
  metrics?: any;
  showSidebar?: boolean;
}

// Configuration des onglets avec leurs sous-onglets et contenu de sidebar
const tabConfigs: MainTabConfig[] = [
  {
    id: 'acquisition',
    label: 'Acquisition',
    icon: FaHome,
    description: 'Détails de l\'acquisition du bien',
    sidebarContent: 'acquisition'
  },
  {
    id: 'location',
    label: 'Location',
    icon: FaKey,
    description: 'Gestion des charges et revenus locatifs',
    subTabs: [
      { id: 'revenus', label: 'Revenus', icon: FaChartPie, description: 'Revenus locatifs' },
      { id: 'frais', label: 'Frais', icon: FaMoneyBillWave, description: 'Charges et frais locatifs' }
    ],
    sidebarContent: 'location'
  },
  {
    id: 'imposition',
    label: 'Imposition',
    icon: FaCalculator,
    description: 'Calculs fiscaux et d\'imposition',
    subTabs: [
      { id: 'annee-courante', label: 'Année courante', icon: FaFileAlt, description: 'Imposition de l\'année en cours' },
      { id: 'historique-projection', label: 'Historique et projection', icon: FaChartLine, description: 'Évolution fiscale dans le temps' }
    ],
    sidebarContent: 'imposition'
  },
  {
    id: 'rentabilite',
    label: 'Rentabilité',
    icon: FaChartLine,
    description: 'Analyse de la rentabilité de l\'investissement',
    subTabs: [
      { id: 'rentabilite-brute-nette', label: 'Rentabilité', icon: FaChartBar, description: 'Métriques de rentabilité' },
      { id: 'cashflow', label: 'Cashflow', icon: FaMoneyBillWave, description: 'Flux de trésorerie' },
      { id: 'revente', label: 'Revente', icon: FaHome, description: 'Estimation de revente' }
    ],
    sidebarContent: 'rentabilite'
  },
  {
    id: 'bilan',
    label: 'Bilan',
    icon: FaChartBar,
    description: 'Bilan complet et analyse statistique',
    subTabs: [
      { id: 'statistiques', label: 'Statistiques', icon: FaChartPie, description: 'Statistiques détaillées' },
      { id: 'analyse-ia', label: 'Analyse IA', icon: FaCog, description: 'Analyse assistée par IA' }
    ],
    sidebarContent: 'bilan'
  }
];

export default function HierarchicalNavigation({ 
  onTabChange, 
  initialMainTab = 'acquisition', 
  initialSubTab,
  investmentData,
  metrics,
  showSidebar = true
}: HierarchicalNavigationProps) {
  const [selectedMainTab, setSelectedMainTab] = useState<MainTab>(initialMainTab);
  const [selectedSubTabs, setSelectedSubTabs] = useState<Record<string, string>>({
    location: 'revenus',
    imposition: initialSubTab || 'annee-courante',
    rentabilite: 'rentabilite-brute-nette',
    bilan: 'statistiques'
  });

  // Synchronisation avec l'état initial
  useEffect(() => {
    if (initialMainTab && initialSubTab) {
      setSelectedMainTab(initialMainTab);
      setSelectedSubTabs(prev => ({
        ...prev,
        [initialMainTab]: initialSubTab
      }));
    }
  }, [initialMainTab, initialSubTab]);

  const handleMainTabChange = (tab: MainTab) => {
    setSelectedMainTab(tab);
    const config = tabConfigs.find(t => t.id === tab);
    
    if (config?.subTabs && config.subTabs.length > 0) {
      // Si l'onglet a des sous-onglets, utiliser le premier ou celui sélectionné
      const defaultSubTab = selectedSubTabs[tab] || config.subTabs[0].id;
      onTabChange(tab, defaultSubTab);
    } else {
      onTabChange(tab);
    }
  };

  const handleSubTabChange = (mainTab: MainTab, subTab: string) => {
    setSelectedSubTabs(prev => ({ ...prev, [mainTab]: subTab }));
    onTabChange(mainTab, subTab);
  };

  const getSelectedMainTabIndex = () => {
    return tabConfigs.findIndex(tab => tab.id === selectedMainTab);
  };

  const getSelectedSubTabIndex = (mainTab: MainTab) => {
    const config = tabConfigs.find(t => t.id === mainTab);
    if (!config?.subTabs) return 0;
    return config.subTabs.findIndex(subTab => subTab.id === selectedSubTabs[mainTab]);
  };

  const currentConfig = tabConfigs.find(tab => tab.id === selectedMainTab);

  return (
    <div className="w-full">
      {/* Navigation principale */}
      <Tab.Group 
        selectedIndex={getSelectedMainTabIndex()} 
        onChange={(index) => handleMainTabChange(tabConfigs[index].id)}
      >
        <Tab.List className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg shadow-sm">
          {tabConfigs.map((tab) => (
            <Tab
              key={tab.id}
              className={({ selected }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-md focus:outline-none transition-all duration-300 flex-1 justify-center group
                 ${selected 
                   ? 'bg-white text-blue-600 shadow-md transform scale-105' 
                   : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:scale-105'
                 }`
              }
            >
              {({ selected }) => (
                <>
                  <tab.icon className={`mr-2 h-4 w-4 transition-colors duration-300 ${
                    selected ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                  }`} />
                  <span className="transition-colors duration-300">{tab.label}</span>
                </>
              )}
            </Tab>
          ))}
        </Tab.List>
      </Tab.Group>

      {/* Sous-navigation (désactivée pour Imposition car contenu fusionné sur la page) */}
      {selectedMainTab !== 'imposition' && currentConfig?.subTabs && currentConfig.subTabs.length > 0 && (
        <div className="animate-fadeIn">
          <Tab.Group 
            selectedIndex={getSelectedSubTabIndex(selectedMainTab)} 
            onChange={(index) => {
              const subTab = currentConfig.subTabs![index];
              handleSubTabChange(selectedMainTab, subTab.id);
            }}
          >
            <Tab.List className="flex space-x-1 mb-6 bg-gray-50 p-1 rounded-lg shadow-sm">
              {currentConfig.subTabs.map((subTab) => (
                <Tab
                  key={subTab.id}
                  className={({ selected }) =>
                    `flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none transition-all duration-300 group
                     ${selected 
                       ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                       : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:scale-105'
                     }`
                  }
                >
                  {({ selected }) => (
                    <>
                      {subTab.icon && (
                        <subTab.icon className={`mr-2 h-4 w-4 transition-colors duration-300 ${
                          selected ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                        }`} />
                      )}
                      <span className="transition-colors duration-300">{subTab.label}</span>
                    </>
                  )}
                </Tab>
              ))}
            </Tab.List>
          </Tab.Group>
        </div>
      )}

      {/* Informations contextuelles pour la sidebar */}
      {showSidebar && (
        <div className="hidden lg:block">
          <SidebarContent 
            config={currentConfig}
            investmentData={investmentData}
            metrics={metrics}
          />
        </div>
      )}
    </div>
  );
}

// Composant pour le contenu de la sidebar
function SidebarContent({ 
  config, 
  investmentData, 
  metrics 
}: { 
  config?: MainTabConfig; 
  investmentData?: any; 
  metrics?: any; 
}) {
  if (!config) return null;

  const renderSidebarContent = () => {
    switch (config.sidebarContent) {
      case 'acquisition':
        const totalAcquisition = (investmentData?.purchasePrice || 0) + 
                                (investmentData?.notaryFees || 0) + 
                                (investmentData?.renovationCosts || 0);
        return (
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
                    {totalAcquisition.toLocaleString('fr-FR')} €
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
            <h3 className="text-lg font-semibold text-gray-900">Informations fiscales</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Régime fiscal</span>
                <span className="text-sm font-medium">
                  {investmentData?.taxRegime || 'Non défini'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Taux d'imposition</span>
                <span className="text-sm font-medium">
                  {investmentData?.taxRate || 0}%
                </span>
              </div>
            </div>
          </div>
        );

      case 'rentabilite':
        const currentYear = new Date().getFullYear();
        
        // Calculer les rentabilités pour micro-foncier et micro-bic (identiques au tableau ResultsDisplay)
        let grossYieldNu = 0;
        let netYieldNu = 0;
        let grossYieldMeuble = 0;
        let netYieldMeuble = 0;

        if (investmentData) {
          const investment = investmentData as Investment;
          const yearExpenses = investment.expenses?.find(e => e.year === currentYear);
          
          if (yearExpenses) {
            // Coût total identique au tableau
            const totalCost = Number(investment.purchasePrice || 0) +
                              Number(investment.agencyFees || 0) +
                              Number(investment.notaryFees || 0) +
                              Number(investment.bankFees || 0) +
                              Number(investment.bankGuaranteeFees || 0) +
                              Number(investment.mandatoryDiagnostics || 0) +
                              Number(investment.renovationCosts || 0);

            // Revenus bruts par régime
            const rent = Number(yearExpenses?.rent || 0);
            const furnishedRent = Number(yearExpenses?.furnishedRent || 0);
            const taxBenefit = Number(yearExpenses?.taxBenefit || 0);
            const grossRevenueNu = rent + taxBenefit;
            const grossRevenueMeuble = furnishedRent;

            // Charges identiques au tableau
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
            <h3 className="text-lg font-semibold text-gray-900">Informations</h3>
            <p className="text-sm text-gray-600">
              {config.description}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <config.icon className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
      </div>
      <div className="border-t border-gray-100 pt-4">
        {renderSidebarContent()}
      </div>
    </div>
  );
}
