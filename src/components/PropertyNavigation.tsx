import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { FaHome, FaKey, FaCalculator, FaChartLine, FaChartBar } from 'react-icons/fa';

type MainTab = 'acquisition' | 'location' | 'imposition' | 'rentabilite' | 'bilan';
type SubTab = {
  [key in Exclude<MainTab, 'acquisition'>]: string;
};

interface PropertyNavigationProps {
  onTabChange: (mainTab: MainTab, subTab?: string) => void;
  initialMainTab?: MainTab;
  initialSubTab?: string;
}

export default function PropertyNavigation({ onTabChange, initialMainTab = 'acquisition', initialSubTab }: PropertyNavigationProps) {
  const [selectedMainTab, setSelectedMainTab] = useState<MainTab>(initialMainTab);
  const [selectedSubTabs, setSelectedSubTabs] = useState({
    location: 'revenus',
    imposition: initialSubTab || 'annee-courante',
    rentabilite: 'rentabilite-brute-nette',
    bilan: 'statistiques'
  });

  // Effet pour synchroniser avec l'état initial
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
    // Si le tab principal a des sous-tabs, on envoie aussi le sous-tab sélectionné
    if (tab !== 'acquisition') {
      onTabChange(tab, selectedSubTabs[tab]);
    } else {
      onTabChange(tab);
    }
  };

  const handleSubTabChange = (mainTab: MainTab, subTab: string) => {
    setSelectedSubTabs(prev => ({ ...prev, [mainTab]: subTab }));
    onTabChange(mainTab, subTab);
  };

  // Fonction pour obtenir l'index du tab principal sélectionné
  const getSelectedMainTabIndex = () => {
    const tabs = ['acquisition', 'location', 'imposition', 'rentabilite', 'bilan'];
    return tabs.indexOf(selectedMainTab);
  };

  // Fonction pour obtenir l'index du sous-tab sélectionné
  const getSelectedSubTabIndex = (mainTab: MainTab) => {
    switch (mainTab) {
      case 'location':
        return ['revenus', 'frais'].indexOf(selectedSubTabs[mainTab]);
      case 'imposition':
        return ['annee-courante', 'historique-projection'].indexOf(selectedSubTabs[mainTab]);
      case 'rentabilite':
        return ['rentabilite-brute-nette', 'cashflow', 'revente'].indexOf(selectedSubTabs[mainTab]);
      case 'bilan':
        return ['statistiques', 'analyse-ia'].indexOf(selectedSubTabs[mainTab]);
      default:
        return 0;
    }
  };

  return (
    <div className="w-full">
      {/* Navigation principale */}
      <Tab.Group selectedIndex={getSelectedMainTabIndex()} onChange={(index) => handleMainTabChange(['acquisition', 'location', 'imposition', 'rentabilite', 'bilan'][index] as MainTab)}>
        <Tab.List className="flex space-x-4 mb-6">
          <Tab className={({ selected }) =>
            `flex items-center px-6 py-3 text-base font-medium rounded-md focus:outline-none transition-colors duration-200
             ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
          }>
            <FaHome className="mr-2 h-5 w-5" />
            Acquisition
          </Tab>
          <Tab className={({ selected }) =>
            `flex items-center px-6 py-3 text-base font-medium rounded-md focus:outline-none transition-colors duration-200
             ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
          }>
            <FaKey className="mr-2 h-5 w-5" />
            Location
          </Tab>
          <Tab className={({ selected }) =>
            `flex items-center px-6 py-3 text-base font-medium rounded-md focus:outline-none transition-colors duration-200
             ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
          }>
            <FaCalculator className="mr-2 h-5 w-5" />
            Imposition
          </Tab>
          <Tab className={({ selected }) =>
            `flex items-center px-6 py-3 text-base font-medium rounded-md focus:outline-none transition-colors duration-200
             ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
          }>
            <FaChartLine className="mr-2 h-5 w-5" />
            Rentabilité
          </Tab>
          <Tab className={({ selected }) =>
            `flex items-center px-6 py-3 text-base font-medium rounded-md focus:outline-none transition-colors duration-200
             ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
          }>
            <FaChartBar className="mr-2 h-5 w-5" />
            Bilan
          </Tab>
        </Tab.List>
      </Tab.Group>

      {/* Sous-navigation (les onglets Revenus/Frais sont maintenant dans la sidebar pour Location) */}
      {selectedMainTab === 'imposition' && (
        <Tab.Group selectedIndex={getSelectedSubTabIndex('imposition')} onChange={(index) => handleSubTabChange('imposition', ['annee-courante', 'historique-projection'][index])}>
          <Tab.List className="flex space-x-2 mb-6 border-b border-gray-200">
            <Tab className={({ selected }) =>
              `px-6 py-3 text-base font-medium border-b-2 focus:outline-none transition-colors duration-200
               ${selected ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
            }>
              Année courante
            </Tab>
            <Tab className={({ selected }) =>
              `px-6 py-3 text-base font-medium border-b-2 focus:outline-none transition-colors duration-200
               ${selected ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
            }>
              Historique et projection
            </Tab>
          </Tab.List>
        </Tab.Group>
      )}

      {selectedMainTab === 'rentabilite' && (
        <Tab.Group selectedIndex={getSelectedSubTabIndex('rentabilite')} onChange={(index) => handleSubTabChange('rentabilite', ['rentabilite-brute-nette', 'cashflow', 'revente'][index])}>
          <Tab.List className="flex space-x-2 mb-6 border-b border-gray-200">
            <Tab className={({ selected }) =>
              `px-6 py-3 text-base font-medium border-b-2 focus:outline-none transition-colors duration-200
               ${selected ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
            }>
              Rentabilité
            </Tab>
            <Tab className={({ selected }) =>
              `px-6 py-3 text-base font-medium border-b-2 focus:outline-none transition-colors duration-200
               ${selected ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
            }>
              Cashflow
            </Tab>
            <Tab className={({ selected }) =>
              `px-6 py-3 text-base font-medium border-b-2 focus:outline-none transition-colors duration-200
               ${selected ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
            }>
              Revente
            </Tab>
          </Tab.List>
        </Tab.Group>
      )}

      {selectedMainTab === 'bilan' && (
        <Tab.Group selectedIndex={getSelectedSubTabIndex('bilan')} onChange={(index) => handleSubTabChange('bilan', ['statistiques', 'analyse-ia'][index])}>
          <Tab.List className="flex space-x-2 mb-6 border-b border-gray-200">
            <Tab className={({ selected }) =>
              `px-6 py-3 text-base font-medium border-b-2 focus:outline-none transition-colors duration-200
               ${selected ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
            }>
              Statistiques
            </Tab>
            <Tab className={({ selected }) =>
              `px-6 py-3 text-base font-medium border-b-2 focus:outline-none transition-colors duration-200
               ${selected ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
            }>
              Analyse IA
            </Tab>
          </Tab.List>
        </Tab.Group>
      )}
    </div>
  );
} 