import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Pencil, Info, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Investment, defaultInvestment, FinancialMetrics, AmortizationRow } from '../types/investment';
import { SCI } from '../types/sci';
import { useAuth } from '../contexts/AuthContext';
import InvestmentForm from '../components/InvestmentForm';
import ResultsDisplay from '../components/ResultsDisplay';
import SCIResultsDisplay from '../components/SCIResultsDisplay';
import SaleEstimation from '../components/SaleEstimation';
import { calculateFinancialMetrics } from '../utils/calculations';
import { getSCIById } from '../lib/api';
import Notification from '../components/Notification';

type View = 'form' | 'profitability' | 'sale' | 'tax';

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [investmentData, setInvestmentData] = useState<Investment>(defaultInvestment);
  const [currentView, setCurrentView] = useState<View>('form');
  const { register, handleSubmit, reset, formState } = useForm<{ name: string, description?: string }>();
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
  const [sciInfo, setSciInfo] = useState<SCI | null>(null);

  useEffect(() => {
    if (id) {
      loadProperty();
    }
  }, [id]);

  // Charger les informations de la SCI quand investmentData change
  useEffect(() => {
    async function loadSCI() {
      if (investmentData.sciId) {
        console.log('🏢 Chargement de la SCI avec ID:', investmentData.sciId);
        const sci = await getSCIById(investmentData.sciId);
        if (sci) {
          console.log('✅ SCI chargée:', sci.name);
          setSciInfo(sci);
        } else {
          console.log('❌ SCI non trouvée');
          setSciInfo(null);
        }
      } else {
        console.log('📄 Bien en nom propre (pas de sciId)');
        setSciInfo(null);
      }
    }
    loadSCI();
  }, [investmentData.sciId]);

  async function loadProperty() {
    try {
      setLoading(true);
      console.log('============ DÉBUT CHARGEMENT DU BIEN ============');
      console.log('Chargement du bien avec ID:', id);
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Erreur lors du chargement du bien:', error);
        throw error;
      }
      
      if (data && id) {
        console.log('✅ Bien chargé avec succès, ID:', id);
        console.log('Données brutes:', data);
        
        // S'assurer que l'ID est présent dans l'investissement
        const loadedInvestmentData = {
          ...defaultInvestment,
          ...data.investment_data as Investment,
          id: id // Ajouter l'ID explicitement pour s'assurer qu'il est disponible
        };
        
        console.log('✅ Données d\'investissement chargées avec succès');
        console.log('🏢 sciId trouvé:', loadedInvestmentData.sciId || 'AUCUN (bien en nom propre)');
        
        // Vérifier spécifiquement le tableau d'amortissement
        if (loadedInvestmentData.amortizationSchedule && loadedInvestmentData.amortizationSchedule.length > 0) {
          console.log('✅ Tableau d\'amortissement trouvé:', 
            `${loadedInvestmentData.amortizationSchedule.length} lignes`);
          // Afficher quelques lignes pour vérification
          console.log('Exemple de données (première ligne):', 
            loadedInvestmentData.amortizationSchedule[0]);
        } else {
          console.log('⚠️ Aucun tableau d\'amortissement personnalisé trouvé');
        }
        
        console.log('Mise à jour de l\'état avec les données chargées...');
        setInvestmentData(loadedInvestmentData);
        reset({ 
          name: data.name,
          description: loadedInvestmentData.description || ''
        });
        
        // Calculate initial metrics
        const initialMetrics = calculateFinancialMetrics(loadedInvestmentData);
        setMetrics(initialMetrics);
        
        console.log('✅ Chargement du bien terminé avec succès');
      } else {
        console.error('❌ Aucune donnée trouvée pour l\'ID:', id);
      }
      
      console.log('============ FIN CHARGEMENT DU BIEN ============');
    } catch (error) {
      console.error('❌ Exception lors du chargement du bien:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCalculate = (data: Investment) => {
    console.log('============ DÉBUT CALCUL DES MÉTRIQUES ============');
    console.log('handleCalculate appelé avec données:', data);
    
    // S'assurer de conserver l'ID
    const currentId = data.id || investmentData.id;
    console.log('ID à préserver:', currentId);
    
    // S'assurer de conserver le tableau d'amortissement s'il existe
    const hasCustomAmortization = !!data.amortizationSchedule && data.amortizationSchedule.length > 0;
    const existingAmortization = !!investmentData.amortizationSchedule && investmentData.amortizationSchedule.length > 0;
    
    // Décider quel tableau d'amortissement utiliser
    let amortizationSchedule: AmortizationRow[] = [];
    if (hasCustomAmortization && data.amortizationSchedule) {
      console.log('Utilisation du tableau d\'amortissement fourni:', 
        `${data.amortizationSchedule.length} lignes`);
      amortizationSchedule = data.amortizationSchedule;
    } else if (existingAmortization && investmentData.amortizationSchedule) {
      console.log('Conservation du tableau d\'amortissement existant:', 
        `${investmentData.amortizationSchedule.length} lignes`);
      amortizationSchedule = investmentData.amortizationSchedule;
    } else {
      console.log('Aucun tableau d\'amortissement disponible');
      amortizationSchedule = [];
    }
    
    // Créer une copie profonde des données pour éviter les références
    const updatedInvestment = JSON.parse(JSON.stringify({
      ...defaultInvestment,
      ...data,
      id: currentId, // Préserver explicitement l'ID
      amortizationSchedule: amortizationSchedule // Préserver explicitement le tableau d'amortissement
    }));
    
    console.log('Mise à jour de l\'investissement terminée');
    console.log('- ID préservé:', updatedInvestment.id);
    console.log('- Tableau d\'amortissement:', 
      updatedInvestment.amortizationSchedule.length > 0 ? 
      `${updatedInvestment.amortizationSchedule.length} lignes` : 
      'Aucun tableau'
    );
    
    // Mettre à jour l'état avec la nouvelle copie
    setInvestmentData(updatedInvestment);
    
    // Calculer les métriques
    console.log('Calcul des métriques...');
    const results = calculateFinancialMetrics(updatedInvestment);
    setMetrics(results);
    
    console.log('============ FIN CALCUL DES MÉTRIQUES ============');
  };

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

  const renderContent = () => {
    switch (currentView) {
      case 'profitability':
        return metrics && investmentData ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Rentabilité globale
            </h2>
            {investmentData.sciId ? (
              <SCIResultsDisplay 
                metrics={metrics} 
                investment={investmentData}
                onUpdate={(updatedInvestment) => {
                  const newInvestment = {
                    ...defaultInvestment,
                    ...updatedInvestment
                  };
                  setInvestmentData(newInvestment);
                  const newMetrics = calculateFinancialMetrics(newInvestment);
                  setMetrics(newMetrics);
                }}
              />
            ) : (
              <ResultsDisplay 
                metrics={metrics} 
                investment={investmentData}
                onUpdate={(updatedInvestment) => {
                  const newInvestment = {
                    ...defaultInvestment,
                    ...updatedInvestment
                  };
                  setInvestmentData(newInvestment);
                  const newMetrics = calculateFinancialMetrics(newInvestment);
                  setMetrics(newMetrics);
                }}
              />
            )}
          </div>
        ) : null;
      case 'sale':
        return metrics && investmentData ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Estimation de revente
            </h2>
            <SaleEstimation
              saleProfit={metrics.saleProfit || 0}
              capitalGain={metrics.capitalGain || 0}
              appreciationType={investmentData.appreciationType}
              appreciationValue={investmentData.appreciationValue}
              purchasePrice={investmentData.purchasePrice}
              investment={investmentData}
              onUpdate={(updatedInvestment) => {
                const newInvestment = {
                  ...defaultInvestment,
                  ...updatedInvestment
                };
                setInvestmentData(newInvestment);
                const newMetrics = calculateFinancialMetrics(newInvestment);
                setMetrics(newMetrics);
              }}
            />
          </div>
        ) : null;
      case 'tax':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900">
              Imposition
            </h2>
            <p className="mt-4 text-gray-600">
              Cette fonctionnalité est en cours de construction.
            </p>
          </div>
        );
      default:
        return (
          <InvestmentForm 
            onSubmit={handleCalculate}
            initialValues={investmentData}
          />
        );
    }
  };

  return (
    <div className="min-h-screen relative">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Image de fond avec overlay */}
      <div 
        className="fixed inset-0 z-0 bg-repeat"
        style={{ 
          backgroundImage: 'url("/fond2.jpg")',
          backgroundSize: '100px 100px',
          opacity: 1
        }}
      />
      
      {/* Contenu principal avec fond semi-transparent */}
      <div className="relative z-10 min-h-screen bg-white/80">
        <header className="bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/logo.png"
                  alt="Rentab'immo"
                  className="h-8 w-auto"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <div className="group relative min-w-0">
                      <span className="text-xl font-semibold text-gray-900 truncate max-w-[52vw]">
                        {investmentData?.name?.trim() || (id ? 'Bien sans nom' : 'Nouveau bien')}
                      </span>
                      {/* Infobulle description au survol (à côté du nom) */}
                      {Boolean(investmentData?.description) && (
                        <span className="inline-flex items-center align-middle ml-2 text-gray-500" aria-hidden>
                          <Info className="h-4 w-4" />
                        </span>
                      )}
                      {Boolean(investmentData?.description) && (
                        <div className="absolute left-0 top-full mt-2 w-[48vw] max-w-xl z-20 hidden group-hover:block">
                          <div className="rounded-lg shadow-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                            {investmentData.description}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Badge SCI */}
                    {sciInfo && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        <Building2 className="h-3.5 w-3.5" />
                        SCI {sciInfo.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {investmentData?.projectStartDate && investmentData?.projectEndDate ? (
                      <span>
                        Du {new Date(investmentData.projectStartDate).toLocaleDateString()} au {new Date(investmentData.projectEndDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">Dates non définies</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Bouton édition via popup */}
                <button
                  type="button"
                  onClick={() => setIsGeneralModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 shadow-sm"
                  title="Modifier les informations générales"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Éditer</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Retour
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setCurrentView('form')}
                    className={`px-4 py-2 rounded-md ${
                      currentView === 'form'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Formulaire
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('profitability')}
                    className={`px-4 py-2 rounded-md ${
                      currentView === 'profitability'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Rentabilité globale
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('sale')}
                    className={`px-4 py-2 rounded-md ${
                      currentView === 'sale'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Estimation revente
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('tax')}
                    className={`px-4 py-2 rounded-md ${
                      currentView === 'tax'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Imposition
                  </button>
                </div>
              </div>

              {renderContent()}

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
                    type="submit"
                    disabled={loading || !investmentData?.name?.trim()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {id ? 'Enregistrer les modifications' : 'Créer le bien'}
                  </button>
                </div>
              </div>
            </form>
          )}
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
                      className={`mt-1 block w-full rounded-md ${!formState.errors.name ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-500' : 'border-red-300 focus:border-red-500 focus:ring-red-500'} shadow-sm`}
                      placeholder="Ex: Appartement Centre-ville"
                    />
                    {formState.errors.name && (
                      <p className="mt-1 text-sm text-red-600">{formState.errors.name.message?.toString() || "Le nom du bien est obligatoire"}</p>
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
                  onClick={() => {
                    // Déclencher la sauvegarde puis fermer la popup
                    handleSubmit(onSubmit)();
                    setIsGeneralModalOpen(false);
                  }}
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
    </div>
  );
}