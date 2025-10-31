import { useState } from 'react';
import { FaBars, FaTimes, FaHome, FaKey, FaCalculator, FaChartLine, FaChartBar } from 'react-icons/fa';

type MainTab = 'acquisition' | 'location' | 'imposition' | 'rentabilite' | 'bilan';

interface MobileNavigationProps {
  currentMainTab: MainTab;
  currentSubTab?: string;
  onTabChange: (mainTab: MainTab, subTab?: string) => void;
}

const tabConfigs = [
  { id: 'acquisition' as MainTab, label: 'Acquisition', icon: FaHome },
  { id: 'location' as MainTab, label: 'Location', icon: FaKey },
  { id: 'imposition' as MainTab, label: 'Imposition', icon: FaCalculator },
  { id: 'rentabilite' as MainTab, label: 'Rentabilité', icon: FaChartLine },
  { id: 'bilan' as MainTab, label: 'Bilan', icon: FaChartBar },
];

const subTabConfigs: Record<MainTab, { id: string; label: string }[]> = {
  acquisition: [],
  location: [
    { id: 'revenus', label: 'Revenus' },
    { id: 'frais', label: 'Frais' }
  ],
  imposition: [],
  rentabilite: [
    { id: 'rentabilite-brute-nette', label: 'Rentabilité' },
    { id: 'cashflow', label: 'Cashflow' },
    { id: 'revente', label: 'Revente' }
  ],
  bilan: [
    { id: 'statistiques', label: 'Statistiques' },
    { id: 'analyse-ia', label: 'Analyse IA' }
  ]
};

export default function MobileNavigation({ currentMainTab, currentSubTab, onTabChange }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMainTabClick = (tab: MainTab) => {
    const subTabs = subTabConfigs[tab];
    if (subTabs.length > 0) {
      // Si l'onglet a des sous-onglets, garder le menu ouvert
      onTabChange(tab, currentSubTab || subTabs[0].id);
    } else {
      // Si pas de sous-onglets, fermer le menu
      onTabChange(tab);
      setIsOpen(false);
    }
  };

  const handleSubTabClick = (subTab: string) => {
    onTabChange(currentMainTab, subTab);
    setIsOpen(false);
  };

  const currentSubTabs = subTabConfigs[currentMainTab] || [];

  return (
    <div className="lg:hidden">
      {/* Bouton de menu mobile */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
        >
          {isOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
          <span className="font-medium">Menu</span>
        </button>
        
        <div className="text-sm text-gray-600">
          {tabConfigs.find(tab => tab.id === currentMainTab)?.label}
          {currentSubTab && (
            <span className="ml-1">
              - {currentSubTabs.find(sub => sub.id === currentSubTab)?.label}
            </span>
          )}
        </div>
      </div>

      {/* Menu mobile */}
      {isOpen && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-lg">
          <div className="p-4">
            {/* Navigation principale */}
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Navigation</h3>
              {tabConfigs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleMainTabClick(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    currentMainTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Sous-navigation */}
            {currentSubTabs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {tabConfigs.find(tab => tab.id === currentMainTab)?.label}
                </h3>
                {currentSubTabs.map((subTab) => (
                  <button
                    key={subTab.id}
                    onClick={() => handleSubTabClick(subTab.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-2 rounded-md text-left transition-colors ${
                      currentSubTab === subTab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm">{subTab.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay pour fermer le menu */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

