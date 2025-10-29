/**
 * Composant PropertyForm
 * 
 * Ce composant gère le formulaire principal d'un bien immobilier, permettant de saisir et d'analyser
 * tous les aspects d'un investissement immobilier. Il est composé de plusieurs sections :
 * 
 * Fonctionnalités principales :
 * - Gestion des données d'acquisition (prix, frais, travaux)
 * - Gestion des charges et revenus
 * - Calculs fiscaux et d'imposition
 * - Analyse de rentabilité et projections
 * - Gestion du cash flow et du bilan
 * - Calculs de TRI et d'IRR
 * 
 * Le composant utilise :
 * - React Hook Form pour la gestion des formulaires
 * - Supabase pour la persistance des données
 * - Des calculs en temps réel pour les métriques financières
 * - Une navigation par onglets pour les différentes sections
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Brain, Pencil, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Investment, defaultInvestment } from '../types/investment';
import { useAuth } from '../contexts/AuthContext';
import AcquisitionForm from './AcquisitionForm';
import ExpensesForm from './ExpensesForm';
import RevenuesForm from './RevenuesForm';
import ResultsDisplay from './ResultsDisplay';
import CashFlowDisplay from './CashFlowDisplay';
import TaxForm from './TaxForm';
import { calculateFinancialMetrics } from '../utils/calculations';
import SaleDisplay from './SaleDisplay';
import BalanceDisplay from './BalanceDisplay';
import Analysis from '../pages/Analysis';
import HierarchicalNavigation from './HierarchicalNavigation';
import MobileNavigation from './MobileNavigation';
import SidebarContent from './SidebarContent';
import Notification from './Notification';
import GeneralInfoSummary from './GeneralInfoSummary';

type View = 'acquisition' | 'frais' | 'revenus' | 'imposition' | 'profitability' | 'bilan' | 'cashflow' | 'sale' | 'irr' | 'analysis';

type MainTab = 'acquisition' | 'location' | 'imposition' | 'rentabilite' | 'bilan';
type SubTab = {
  location: 'frais' | 'revenus';
  imposition: 'annee-courante' | 'historique-projection';
  rentabilite: 'rentabilite-brute-nette' | 'cashflow' | 'revente';
  bilan: 'statistiques' | 'analyse-ia';
};

export default function PropertyForm() {
  // États pour gérer le chargement, les métriques et les données d'investissement
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [investmentData, setInvestmentData] = useState<Investment>(defaultInvestment);
  const [currentMainTab, setCurrentMainTab] = useState<MainTab>('acquisition');
  const [currentSubTab, setCurrentSubTab] = useState<string | undefined>(undefined);
  const [nameError, setNameError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<{ name: string, description?: string }>();
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
  
  // Surveiller les changements de nom dans l'état investmentData et synchroniser avec le formulaire
  useEffect(() => {
    if (investmentData.name) {
      setValue('name', investmentData.name);
    }
    if (investmentData.description) {
      setValue('description', investmentData.description);
    }
  }, [investmentData.name, investmentData.description, setValue]);

  // Synchronisation avec les paramètres d'URL
  useEffect(() => {
    const mainTab = searchParams.get('tab') as MainTab;
    const subTab = searchParams.get('subtab');
    
    if (mainTab && ['acquisition', 'location', 'imposition', 'rentabilite', 'bilan'].includes(mainTab)) {
      setCurrentMainTab(mainTab);
      if (subTab) {
        setCurrentSubTab(subTab);
      }
    }
  }, [searchParams]);

  // Chargement initial des données si un ID est fourni
  useEffect(() => {
    if (id) {
      loadProperty();
    } else {
      const initialMetrics = calculateFinancialMetrics(defaultInvestment);
      setMetrics(initialMetrics);
    }
  }, [id]);

  // Fonction pour charger les données d'un bien existant depuis Supabase
  async function loadProperty() {
    try {
      console.log('==================== DÉBUT CHARGEMENT PROPRIÉTÉ ====================');
      console.log('Chargement de la propriété avec ID:', id);
      
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Erreur lors du chargement de la propriété:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ Propriété récupérée avec succès, données brutes:', data);
        
        // Vérifier la présence des données d'investissement
        if (!data.investment_data) {
          console.warn('⚠️ Données d\'investissement manquantes ou invalides');
        } else {
          console.log('✅ Données d\'investissement trouvées');
          
          // Vérifier la présence du tableau d'amortissement
          if (data.investment_data.amortizationSchedule) {
            console.log('✅ Tableau d\'amortissement trouvé:', {
              longueur: data.investment_data.amortizationSchedule.length,
              premièreLigne: data.investment_data.amortizationSchedule[0] || 'Aucune donnée'
            });
          } else {
            console.warn('⚠️ Aucun tableau d\'amortissement trouvé dans les données');
          }
        }
        
        const loadedInvestmentData = {
          ...defaultInvestment,
          ...data.investment_data as Investment,
          id: id || '' // Assigner une chaîne vide si id est undefined
        };
        
        console.log('Données fusionnées avec les valeurs par défaut:', {
          id: loadedInvestmentData.id || 'Non défini',
          name: loadedInvestmentData.name || 'Non défini',
          tableauAmortissement: loadedInvestmentData.amortizationSchedule ? 
            `${loadedInvestmentData.amortizationSchedule.length} lignes` : 'Aucun'
        });
        
        // Analyser le tableau d'amortissement s'il existe
        if (loadedInvestmentData.amortizationSchedule && loadedInvestmentData.amortizationSchedule.length > 0) {
          console.log('Analyse du tableau d\'amortissement:', 
            `${loadedInvestmentData.amortizationSchedule.length} lignes`);
          console.log('Première ligne du tableau:', 
            loadedInvestmentData.amortizationSchedule[0]);
        }
        
        setInvestmentData(loadedInvestmentData);
        reset({ name: data.name });
        
        const initialMetrics = calculateFinancialMetrics(loadedInvestmentData);
        setMetrics(initialMetrics);
        
        console.log('==================== FIN CHARGEMENT PROPRIÉTÉ ====================');
      } else {
        console.error('❌ Aucune donnée retournée pour l\'ID:', id);
      }
    } catch (error) {
      console.error('❌ Exception lors du chargement de la propriété:', error);
      console.log('==================== FIN CHARGEMENT PROPRIÉTÉ (ERREUR) ====================');
    } finally {
      setLoading(false);
    }
  }

  // Gestionnaire pour les calculs d'investissement
  const handleCalculate = (data: Investment) => {
    const updatedInvestment = {
      ...defaultInvestment,
      ...data
    };
    setInvestmentData(updatedInvestment);
    const results = calculateFinancialMetrics(updatedInvestment);
    setMetrics(results);
  };

  // Gestionnaire pour les mises à jour d'investissement
  const handleInvestmentUpdate = (updatedInvestment: Investment) => {
    const newInvestment = {
      ...defaultInvestment,
      ...updatedInvestment
    };
    setInvestmentData(newInvestment);
    const newMetrics = calculateFinancialMetrics(newInvestment);
    setMetrics(newMetrics);
  };

  // Gestionnaire pour les mises à jour de champs individuels
  const handleFieldUpdate = (field: keyof Investment, value: any) => {
    console.log('handleFieldUpdate called with:', field, value);
    console.log('Current investmentData before update:', investmentData);
    const updatedInvestment = {
      ...investmentData,
      [field]: value
    };
    console.log('Updated investment:', updatedInvestment);
    setInvestmentData(updatedInvestment);
    const newMetrics = calculateFinancialMetrics(updatedInvestment);
    setMetrics(newMetrics);
    console.log('investmentData state updated, new value should be:', updatedInvestment);
  };

  // Gestionnaire de mise à jour de nom avec validation
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (!value) {
      setNameError("Le nom du bien est obligatoire");
    } else {
      setNameError(null);
    }
    handleInvestmentUpdate({ ...investmentData, name: e.target.value });
  };

  // Gestionnaire de mise à jour de description
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInvestmentUpdate({ ...investmentData, description: e.target.value });
  };

  // Fonction pour sauvegarder les données dans Supabase
  const onSubmit = async (formData: { name: string, description?: string }) => {
    if (!investmentData) {
      console.error("Données d'investissement manquantes");
      setNotification({
        message: "Erreur: Données d'investissement manquantes",
        type: 'error'
      });
      return;
    }

    if (!user) {
      console.error("Utilisateur non connecté");
      setNotification({
        message: "Erreur: Vous devez être connecté pour enregistrer un bien",
        type: 'error'
      });
      return;
    }

    try {
      console.log('==================== DÉBUT SAUVEGARDE PROPRIÉTÉ ====================');
      setLoading(true);

      // Vérifier les données minimales requises
      if (!formData.name.trim()) {
        throw new Error("Le nom du bien est requis");
      }

      // Mettre à jour l'investissement avec le nom et la description du formulaire
      const updatedInvestment = {
        ...investmentData,
        name: formData.name.trim(),
        description: formData.description?.trim() || ''
      };

      // Vérification détaillée du tableau d'amortissement
      if (updatedInvestment.amortizationSchedule && updatedInvestment.amortizationSchedule.length > 0) {
        console.log("✅ Tableau d'amortissement présent avant sauvegarde:", updatedInvestment.amortizationSchedule.length, "lignes");
        console.log("Première ligne du tableau:", updatedInvestment.amortizationSchedule[0]);
      } else {
        console.warn("⚠️ Aucun tableau d'amortissement trouvé avant sauvegarde");
      }

      console.log("Investissement mis à jour avant sauvegarde:", updatedInvestment);
      console.log("Tableau d'amortissement dans l'investissement:", 
        updatedInvestment.amortizationSchedule ? 
        `${updatedInvestment.amortizationSchedule.length} lignes` : 
        'Aucun tableau');

      // Préparation de l'objet à enregistrer
      const propertyData = {
        name: formData.name.trim(),
        investment_data: updatedInvestment,
        user_id: user.id
      };

      if (id) {
        // S'assurer que le nom est présent pour la mise à jour
        const updateData = {
          name: formData.name.trim(),
          investment_data: updatedInvestment,
          user_id: user.id
        };
        
        console.log("Données envoyées pour mise à jour:", updateData);
        
        const { data, error } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', id)
          .select();
        
        if (error) {
          console.error("❌ ERREUR lors de la mise à jour:", error);
          throw error;
        }
        
        console.log("✅ Mise à jour réussie, données retournées:", data);
        
        // Vérification des données après mise à jour
        if (data && data.length > 0) {
          const savedData = data[0];
          if (savedData.investment_data && savedData.investment_data.amortizationSchedule) {
            console.log("✅ Tableau d'amortissement correctement sauvegardé:", 
              savedData.investment_data.amortizationSchedule.length, "lignes");
          } else {
            console.warn("⚠️ Le tableau d'amortissement n'apparaît pas dans les données sauvegardées");
          }
        }
      } else {
        // Insertion du bien avec les données complètes
        console.log("Création d'un nouveau bien immobilier - Données:", propertyData);
        
        const { data, error } = await supabase
          .from('properties')
          .insert([propertyData])
          .select();
                
        if (error) {
          console.error("ERREUR lors de la création du bien:", error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          console.error("ERREUR: Le bien a été créé mais les données n'ont pas été retournées");
          throw new Error("Le bien a été créé mais les données n'ont pas été retournées");
        }
        
        console.log("✅ Bien créé avec succès - ID:", data[0].id);
        console.log("✅ Données complètes:", data[0]);
        
        // Vérification des données après création
        if (data[0].investment_data && data[0].investment_data.amortizationSchedule) {
          console.log("✅ Tableau d'amortissement correctement sauvegardé:", 
            data[0].investment_data.amortizationSchedule.length, "lignes");
        } else {
          console.warn("⚠️ Le tableau d'amortissement n'apparaît pas dans les données sauvegardées");
        }
      }
      
      console.log('==================== FIN SAUVEGARDE PROPRIÉTÉ ====================');
      
      // Afficher une notification de succès au lieu de rediriger
      setNotification({
        message: id ? "Les modifications ont été enregistrées avec succès" : "Le bien a été créé avec succès",
        type: 'success'
      });
    } catch (error) {
      // Affichage d'une notification d'erreur
      let errorMessage = 'Erreur lors de la sauvegarde du bien';
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
        console.error('Détails de l\'erreur:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.error('Erreur non standard:', error);
      }
      
      setNotification({
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour supprimer un bien
  async function handleDelete() {
    if (!id || !window.confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting property:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleTabChange = (mainTab: MainTab, subTab?: string) => {
    setCurrentMainTab(mainTab);
    setCurrentSubTab(subTab);
    
    // Mettre à jour l'URL avec les nouveaux paramètres
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', mainTab);
    
    if (subTab) {
      newSearchParams.set('subtab', subTab);
    } else {
      newSearchParams.delete('subtab');
    }
    
    setSearchParams(newSearchParams, { replace: true });
  };

  const renderContent = () => {
    if (!metrics) return null;

    switch (currentMainTab) {
      case 'acquisition':
        return (
          <AcquisitionForm
            onSubmit={handleCalculate}
            initialValues={investmentData}
          />
        );
      
      case 'location':
        if (currentSubTab === 'frais') {
          return (
            <ExpensesForm
              investment={investmentData}
              onUpdate={handleInvestmentUpdate}
            />
          );
        } else if (currentSubTab === 'revenus') {
          return (
            <RevenuesForm
              investment={investmentData}
              onUpdate={handleInvestmentUpdate}
            />
          );
        }
        break;

      case 'imposition':
        return (
          <TaxForm
            investment={investmentData}
            onUpdate={handleInvestmentUpdate}
            currentSubTab={currentSubTab as 'annee-courante' | 'historique-projection'}
          />
        );

      case 'rentabilite':
        if (currentSubTab === 'rentabilite-brute-nette') {
          return (
            <ResultsDisplay 
              metrics={metrics}
              investment={investmentData}
              currentYearData={getCurrentYearData()}
              historicalData={getHistoricalAndProjectionData().historicalData}
              projectionData={getHistoricalAndProjectionData().projectionData}
              onUpdate={handleInvestmentUpdate}
            />
          );
        } else if (currentSubTab === 'cashflow') {
          return (
            <CashFlowDisplay
              investment={investmentData}
            />
          );
        } else if (currentSubTab === 'revente') {
          return (
            <SaleDisplay 
              investment={investmentData} 
              onUpdate={handleInvestmentUpdate}
            />
          );
        }
        break;

      case 'bilan':
        if (currentSubTab === 'statistiques' || currentSubTab === 'analyse-ia') {
          return (
            <BalanceDisplay
              investment={investmentData}
              currentSubTab={currentSubTab}
            />
          );
        }
        break;
    }
    return null;
  };

  // Fonction pour obtenir les données de l'année courante
  const getCurrentYearData = () => {
    const currentYear = new Date().getFullYear();
    const currentYearExpense = investmentData.expenses.find(e => e.year === currentYear);

    if (!currentYearExpense) {
      return {
        rent: 0,
        expenses: 0,
        totalInvestmentCost: 0
      };
    }

    const totalInvestmentCost = 
      Number(investmentData.purchasePrice) +
      Number(investmentData.agencyFees) +
      Number(investmentData.notaryFees) +
      Number(investmentData.bankFees) +
      Number(investmentData.renovationCosts);

    const totalExpenses = 
      Number(currentYearExpense.propertyTax || 0) +
      Number(currentYearExpense.condoFees || 0) +
      Number(currentYearExpense.propertyInsurance || 0) +
      Number(currentYearExpense.managementFees || 0) +
      Number(currentYearExpense.unpaidRentInsurance || 0) +
      Number(currentYearExpense.repairs || 0) +
      Number(currentYearExpense.otherDeductible || 0) +
      Number(currentYearExpense.otherNonDeductible || 0) +
      Number(currentYearExpense.tax || 0) +
      Number(currentYearExpense.loanPayment || 0) +
      Number(currentYearExpense.loanInsurance || 0);

    return {
      rent: Number(currentYearExpense.rent || 0),
      expenses: totalExpenses,
      totalInvestmentCost
    };
  };

  // Fonction pour obtenir les données historiques et de projection
  const getHistoricalAndProjectionData = () => {
    const startYear = new Date(investmentData.projectStartDate).getFullYear();
    const endYear = new Date(investmentData.projectEndDate).getFullYear();
    const currentYear = new Date().getFullYear();

    const historical = {
      years: [] as number[],
      cashFlow: [] as number[],
      revenue: [] as number[]
    };
    const projection = {
      years: [] as number[],
      cashFlow: [] as number[],
      revenue: [] as number[]
    };

    const allYears = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );

    allYears.forEach(year => {
      const expense = investmentData.expenses.find(e => e.year === year) || {
        propertyTax: 0,
        condoFees: 0,
        propertyInsurance: 0,
        managementFees: 0,
        unpaidRentInsurance: 0,
        repairs: 0,
        otherDeductible: 0,
        otherNonDeductible: 0,
        tax: 0,
        loanPayment: 0,
        loanInsurance: 0,
        rent: 0,
        tenantCharges: 0,
        taxBenefit: 0
      };

      const totalExpenses = 
        Number(expense.propertyTax || 0) +
        Number(expense.condoFees || 0) +
        Number(expense.propertyInsurance || 0) +
        Number(expense.managementFees || 0) +
        Number(expense.unpaidRentInsurance || 0) +
        Number(expense.repairs || 0) +
        Number(expense.otherDeductible || 0) +
        Number(expense.otherNonDeductible || 0) +
        Number(expense.tax || 0) +
        Number(expense.loanPayment || 0) +
        Number(expense.loanInsurance || 0);

      const totalRevenue = 
        Number(expense.rent || 0) +
        Number(expense.tenantCharges || 0) +
        Number(expense.taxBenefit || 0);

      const cashFlow = totalRevenue - totalExpenses;

      if (year <= currentYear) {
        historical.years.push(year);
        historical.cashFlow.push(cashFlow);
        historical.revenue.push(totalRevenue);
      } else {
        projection.years.push(year);
        projection.cashFlow.push(cashFlow);
        projection.revenue.push(totalRevenue);
      }
    });

    return {
      historicalData: historical,
      projectionData: projection
    };
  };

  // Pour input normal caché qui récupérera la valeur du nom
  const nameRef = register('name', { required: "Le nom du bien est obligatoire" });

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Navigation mobile */}
      <MobileNavigation 
        currentMainTab={currentMainTab}
        currentSubTab={currentSubTab}
        onTabChange={handleTabChange}
      />
      
      <header className="bg-white shadow-sm">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo à gauche */}
            <div className="flex items-center">
              <img
                src="/logo.png"
                alt="Rentab'immo"
                className="h-8 w-auto"
              />
            </div>
            
            {/* Informations générales centrées */}
            <div className="flex items-center gap-4 min-w-0 max-w-2xl">
              <div className="group relative min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg font-semibold text-gray-900 truncate">
                    {investmentData?.name?.trim() || (id ? 'Bien sans nom' : 'Nouveau bien')}
                  </span>
                  {Boolean(investmentData?.description) && (
                    <span className="inline-flex items-center text-gray-500" aria-hidden>
                      <Info className="h-4 w-4" />
                    </span>
                  )}
                </div>
                {Boolean(investmentData?.description) && (
                  <div className="absolute left-0 top-full mt-2 w-96 max-w-xl z-20 hidden group-hover:block">
                    <div className="rounded-lg shadow-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                      {investmentData.description}
                    </div>
                  </div>
                )}
              </div>
              <div className="hidden sm:block text-sm text-gray-600">
                {investmentData?.projectStartDate && investmentData?.projectEndDate ? (
                  <span>
                    Du {new Date(investmentData.projectStartDate).toLocaleDateString()} au {new Date(investmentData.projectEndDate).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-gray-400">Dates non définies</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsGeneralModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 shadow-sm flex-shrink-0"
                title="Modifier les informations générales"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Éditer</span>
              </button>
            </div>
            
            {/* Bouton retour à droite */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation principale pour desktop */}
        <div className="hidden lg:block mb-6">
          <HierarchicalNavigation 
            onTabChange={handleTabChange} 
            initialMainTab={currentMainTab}
            initialSubTab={currentSubTab}
            investmentData={investmentData}
            metrics={metrics}
            showSidebar={false}
          />
        </div>

        <div className="flex gap-6 items-start">
          {/* Sidebar avec informations contextuelles uniquement */}
          <aside className="hidden lg:block w-110 shrink-0">
            <div className="sticky top-4">
              <SidebarContent 
                currentMainTab={currentMainTab}
                investmentData={investmentData}
                metrics={metrics}
                onInvestmentUpdate={handleFieldUpdate}
              />
            </div>
          </aside>
          
          {/* Zone principale avec contenu */}
          <section className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-md p-6">
              {renderContent()}
            </div>
          </section>
        </div>

        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annuler
          </button>
          
          <div className="flex space-x-4">
            {id && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Supprimer
              </button>
            )}
            
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={loading || !investmentData.name?.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {id ? 'Enregistrer les modifications' : 'Créer le bien'}
            </button>
          </div>
        </div>
      </main>

      {isGeneralModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsGeneralModalOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Informations générales</h3>
              <button onClick={() => setIsGeneralModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom du bien <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    {...register('name', { required: "Le nom du bien est obligatoire", minLength: { value: 2, message: "Le nom doit comporter au moins 2 caractères" } })}
                    value={investmentData.name || ''}
                    onChange={(e) => setInvestmentData({ ...investmentData, name: e.target.value })}
                    className={`mt-1 block w-full rounded-md ${!errors.name ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-500' : 'border-red-300 focus:border-red-500 focus:ring-red-500'} shadow-sm`}
                    placeholder="Ex: Appartement Centre-ville"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message?.toString() || "Le nom du bien est obligatoire"}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date de début</label>
                    <input
                      type="date"
                      value={investmentData.projectStartDate}
                      onChange={(e) => setInvestmentData({ ...investmentData, projectStartDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date de fin</label>
                    <input
                      type="date"
                      value={investmentData.projectEndDate}
                      onChange={(e) => setInvestmentData({ ...investmentData, projectEndDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    {...register('description')}
                    value={investmentData.description || ''}
                    onChange={(e) => setInvestmentData({ ...investmentData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Description du projet d'investissement..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsGeneralModalOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => { handleSubmit(onSubmit)(); setIsGeneralModalOpen(false); }}
                disabled={loading || !investmentData?.name?.trim()}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}