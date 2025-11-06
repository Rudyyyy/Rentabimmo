/**
 * Composant AcquisitionForm
 * 
 * Ce composant gère le formulaire d'acquisition d'un bien immobilier. Il permet de saisir :
 * 1. Les informations générales du bien (prix, surface, etc.)
 * 2. Les paramètres du prêt (montant, taux, durée, etc.)
 * 3. Les paramètres de revente (augmentation annuelle, frais d'agence, etc.)
 * 
 * Fonctionnalités principales :
 * - Validation des données saisies
 * - Calcul automatique des montants (apport, frais de notaire, etc.)
 * - Sauvegarde des données dans le localStorage
 * - Gestion des différents types de prêts (classique, différé, in fine)
 * 
 * Les calculs prennent en compte :
 * - Les frais de notaire selon le type de bien
 * - Les frais de garantie selon le type de prêt
 * - Les frais de dossier selon le montant du prêt
 * - Les frais d'assurance selon le type de prêt
 */

import { useState, useMemo } from 'react';
import { Investment, defaultInvestment, AmortizationRow } from '../types/investment';
import { generateAmortizationSchedule, calculateMonthlyPayment } from '../utils/calculations';
import AmortizationTable from './AmortizationTable';
import { Bar } from 'react-chartjs-2';
import { HelpCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import PDFAmortizationImporter from './PDFAmortizationImporter';
import { saveAmortizationSchedule, getAmortizationSchedule } from '../lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  onSubmit: (data: Investment) => void;
  initialValues?: Investment;
}

function AcquisitionForm({ onSubmit, initialValues }: Props) {
  const [showAmortization, setShowAmortization] = useState(false);
  const [loanAmountWarning, setLoanAmountWarning] = useState(false);
  const [showPdfImporter, setShowPdfImporter] = useState(false);
  const [manualAmortizationSchedule, setManualAmortizationSchedule] = useState<AmortizationRow[] | null>(null);

  const handleInputChange = (field: keyof Investment, value: any) => {
    let updatedInvestment = {
      ...defaultInvestment,
      ...initialValues,
      [field]: value
    };

    // Reset deferral-related fields when hasDeferral is set to false
    if (field === 'hasDeferral' && value === false) {
      updatedInvestment = {
        ...updatedInvestment,
        deferralType: 'none',
        deferredPeriod: 0,
        deferredInterest: 0
      };
    }

    // Calculate total investment cost
    const totalCost = 
      Number(updatedInvestment.purchasePrice || 0) +
      Number(updatedInvestment.agencyFees || 0) +
      Number(updatedInvestment.notaryFees || 0) +
      Number(updatedInvestment.bankFees || 0) +
      Number(updatedInvestment.bankGuaranteeFees || 0) +
      Number(updatedInvestment.mandatoryDiagnostics || 0) +
      Number(updatedInvestment.renovationCosts || 0);

    // Auto-calculate loan amount when downPayment changes
    if (field === 'downPayment') {
      const calculatedLoanAmount = totalCost - Number(value);
      updatedInvestment.loanAmount = calculatedLoanAmount;
      setLoanAmountWarning(false);
    }

    // Check loan amount consistency
    if (field === 'loanAmount') {
      const expectedLoanAmount = totalCost - Number(updatedInvestment.downPayment || 0);
      setLoanAmountWarning(Number(value) !== expectedLoanAmount);
    }

    // Recalculate deferredInterest when relevant fields change
    if (['loanAmount', 'interestRate', 'deferredPeriod', 'deferralType'].includes(field)) {
      const { deferredInterest } = generateAmortizationSchedule(
        updatedInvestment.loanAmount,
        updatedInvestment.interestRate,
        updatedInvestment.loanDuration,
        updatedInvestment.deferralType,
        updatedInvestment.deferredPeriod,
        updatedInvestment.startDate
      );
      updatedInvestment.deferredInterest = deferredInterest;
    }

    updatedInvestment.startDate = updatedInvestment.startDate ?? new Date().toISOString().split('T')[0];

    // Si nous avons un tableau d'amortissement modifié manuellement, l'inclure dans l'investissement mis à jour
    if (manualAmortizationSchedule) {
      updatedInvestment.amortizationSchedule = manualAmortizationSchedule;
    }

    onSubmit(updatedInvestment);
  };

  const amortizationResult = useMemo(() => {
    // Si nous avons un tableau d'amortissement modifié manuellement, l'utiliser
    if (manualAmortizationSchedule) {
      return { schedule: manualAmortizationSchedule, deferredInterest: 0 };
    }
    
    if (!initialValues?.loanAmount || !initialValues?.interestRate || !initialValues?.loanDuration) {
      return { schedule: [], deferredInterest: 0 };
    }
    return generateAmortizationSchedule(
      initialValues.loanAmount,
      initialValues.interestRate,
      initialValues.loanDuration,
      initialValues.deferralType,
      initialValues.deferredPeriod,
      initialValues.startDate
    );
  }, [
    initialValues?.loanAmount,
    initialValues?.interestRate,
    initialValues?.loanDuration,
    initialValues?.deferralType,
    initialValues?.deferredPeriod,
    initialValues?.startDate,
    manualAmortizationSchedule
  ]);

  const chartData = {
    labels: amortizationResult.schedule
      .filter((_, index) => index % 12 === 0)
      .map(row => {
        const date = new Date(row.date);
        return `${date.getFullYear()}`;
      }),
    datasets: [
      {
        label: 'Capital',
        data: Object.values(amortizationResult.schedule
          .reduce((acc, row) => {
            const year = new Date(row.date).getFullYear();
            if (!acc[year]) {
              acc[year] = { principal: 0, interest: 0 };
            }
            acc[year].principal += row.principal;
            acc[year].interest += row.interest;
            return acc;
          }, {} as Record<number, { principal: number; interest: number }>))
          .map(({ principal }) => principal),
        backgroundColor: '#87DCC0', // couleur pour Capital
        stack: 'Stack 0',
      },
      {
        label: 'Intérêts',
        data: Object.values(amortizationResult.schedule
          .reduce((acc, row) => {
            const year = new Date(row.date).getFullYear();
            if (!acc[year]) {
              acc[year] = { principal: 0, interest: 0 };
            }
            acc[year].principal += row.principal;
            acc[year].interest += row.interest;
            return acc;
          }, {} as Record<number, { principal: number; interest: number }>))
          .map(({ interest }) => interest),
        backgroundColor: '#F7A1A1', // couleur pour Intérêts
        stack: 'Stack 0',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Répartition capital / intérêts par année'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR' 
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      }
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const totalInvestmentCost = 
    Number(initialValues?.purchasePrice || 0) +
    Number(initialValues?.agencyFees || 0) +
    Number(initialValues?.notaryFees || 0) +
    Number(initialValues?.bankFees || 0) +
    Number(initialValues?.bankGuaranteeFees || 0) +
    Number(initialValues?.mandatoryDiagnostics || 0) +
    Number(initialValues?.renovationCosts || 0);

  const handleSubmitAmortization = async (updatedSchedule: AmortizationRow[]) => {
    console.log('Tableau d\'amortissement correctement ajouté:', updatedSchedule.length, 'lignes');
    
    // Créer une copie profonde pour éviter les problèmes de référence
    const scheduleCopy = JSON.parse(JSON.stringify(updatedSchedule));
    
    // Mettre à jour l'état local
    setManualAmortizationSchedule(scheduleCopy);
    
    // Créer un investissement complet avec toutes les propriétés requises
    const updatedInvestment: Investment = {
      ...defaultInvestment,
      ...initialValues,
      amortizationSchedule: scheduleCopy
    };
    
    // Vérifier explicitement que le tableau d'amortissement a été ajouté
    if (!updatedInvestment.amortizationSchedule || updatedInvestment.amortizationSchedule.length === 0) {
      console.error("❌ ERREUR: Le tableau d'amortissement n'a pas été correctement ajouté à l'investissement");
    } else {
      console.log("✅ Tableau d'amortissement correctement ajouté:", updatedInvestment.amortizationSchedule.length, "lignes");
    }
    
    console.log('AcquisitionForm - Mise à jour de l\'investissement avec le tableau d\'amortissement');
    onSubmit(updatedInvestment);
    
    // Sauvegarde directe du tableau d'amortissement via l'API si un ID est disponible
    if (initialValues?.id) {
      console.log('Sauvegarde directe du tableau via API pour l\'ID:', initialValues.id);
      
      try {
        const success = await saveAmortizationSchedule(initialValues.id, scheduleCopy);
        if (success) {
          console.log('✅ Sauvegarde directe du tableau réussie via API');
        } else {
          console.error('❌ Échec de la sauvegarde directe du tableau via API');
        }
      } catch (error) {
        console.error('❌ Exception lors de la sauvegarde directe:', error);
      }
    } else {
      console.log('ℹ️ Pas d\'ID disponible - Tableau sauvegardé uniquement en mémoire');
      console.log('Le tableau sera sauvegardé en base de données lors de la prochaine sauvegarde complète de l\'investissement');
      
      // Afficher une alerte utilisateur plus explicative
      alert("Le tableau d'amortissement a été enregistré temporairement, mais ne sera persisté en base de données que lorsque le bien sera sauvegardé.\n\nPensez à cliquer sur 'Enregistrer' en haut de la page pour finaliser l'enregistrement du bien et de ses données.");
    }
    
    setShowAmortization(false);
  };

  // Réinitialiser le tableau d'amortissement
  const handleResetAmortization = () => {
    console.log('AcquisitionForm - Réinitialisation du tableau d\'amortissement');
    
    // Effacer le tableau d'amortissement manuel
    setManualAmortizationSchedule(null);
    
    // Mettre à jour l'investissement sans tableau d'amortissement personnalisé
    const updatedInvestment: Investment = {
      ...defaultInvestment,
      ...initialValues,
      amortizationSchedule: undefined
    };
    
    onSubmit(updatedInvestment);
    
    // Réinitialisation directe du tableau d'amortissement via l'API si un ID est disponible
    if (initialValues?.id) {
      console.log('Réinitialisation directe du tableau via API pour l\'ID:', initialValues.id);
      
      // Appel asynchrone sans await pour ne pas bloquer l'interface
      saveAmortizationSchedule(initialValues.id, [])
        .then(success => {
          if (success) {
            console.log('✅ Réinitialisation directe du tableau réussie via API');
          } else {
            console.error('❌ Échec de la réinitialisation directe du tableau via API');
          }
        })
        .catch(error => {
          console.error('❌ Exception lors de la réinitialisation directe:', error);
        });
    }
    
    setShowAmortization(false);
  };

  // Montrer le tableau d'amortissement
  const handleShowAmortization = async () => {
    console.log('AcquisitionForm - Affichage du tableau d\'amortissement');
    
    // Si un ID d'investissement est disponible, essayer de charger les données les plus récentes
    if (initialValues?.id) {
      console.log('Chargement du tableau d\'amortissement à jour depuis la base de données pour ID:', initialValues.id);
      try {
        const latestSchedule = await getAmortizationSchedule(initialValues.id);
        
        if (latestSchedule && latestSchedule.length > 0) {
          console.log('✅ Tableau d\'amortissement récupéré de la base de données:', latestSchedule.length, 'lignes');
          
          // Mettre à jour l'état local avec les données récupérées
          setManualAmortizationSchedule(latestSchedule);
          console.log('✅ État local mis à jour avec les données récentes');
        } else {
          console.log('ℹ️ Pas de tableau personnalisé en base de données, utilisation du tableau calculé');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du tableau:', error);
        console.log('ℹ️ Utilisation du tableau calculé par défaut');
      }
    }
    
    setShowAmortization(true);
  };

  return (
    <div className="space-y-6">
      {/* Informations de crédit et boutons */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h4 className="text-md font-semibold mb-4">Informations de crédit</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <p className="text-sm text-blue-700 font-medium">Mensualité du crédit</p>
            <p className="text-lg font-bold text-blue-900">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                initialValues?.loanAmount && initialValues?.interestRate && initialValues?.loanDuration
                  ? calculateMonthlyPayment(
                      initialValues.loanAmount,
                      initialValues.interestRate,
                      initialValues.loanDuration,
                      initialValues.deferralType || 'none',
                      Number(initialValues.deferredPeriod || 0)
                    )
                  : 0
              )}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <p className="text-sm text-blue-700 font-medium">Intérêts différés</p>
            <p className="text-lg font-bold text-blue-900">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                initialValues?.deferredInterest || 0
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleShowAmortization()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Voir tableau d'amortissement
            </button>
            
            {/* Nouveau bouton pour importer un PDF */}
            <button
              type="button"
              disabled
              onClick={() => setShowPdfImporter(!showPdfImporter)}
              className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed opacity-60 focus:outline-none"
              title="Cette fonctionnalité sera disponible prochainement"
            >
              {showPdfImporter ? 'Cacher' : 'Importer un PDF'}
            </button>
          </div>
        </div>
        
        {/* Affichage du tableau d'amortissement */}
        {showAmortization && (
          <div className="mt-4">
            <AmortizationTable 
              schedule={amortizationResult.schedule}
              onClose={() => setShowAmortization(false)}
              onSave={handleSubmitAmortization}
              onReset={handleResetAmortization}
            />
          </div>
        )}
        
        {/* Affichage de l'importateur PDF */}
        {showPdfImporter && (
          <div className="mt-4">
            <PDFAmortizationImporter
              onAmortizationImported={(amortizationRows, interestRate) => {
                // Fermer l'importateur après avoir importé les données
                setShowPdfImporter(false);
                
                // Récupérer les informations importantes du tableau
                if (amortizationRows.length > 0) {
                  // Capital restant dû initial (montant du prêt)
                  const loanAmount = amortizationRows[0].remainingBalance;
                  
                  // Durée du prêt en années
                  const loanDuration = Math.ceil(amortizationRows.length / 12);
                  
                  // Mettre à jour l'investissement avec les nouvelles valeurs
                  const updatedInvestment = {
                    ...defaultInvestment,
                    ...initialValues,
                    loanAmount,
                    loanDuration,
                    interestRate,
                    startDate: initialValues?.startDate || new Date().toISOString().split('T')[0], // Default to today's date if undefined
                    // Mise à jour automatique de l'apport
                    downPayment: Math.max(0, 
                      (initialValues?.purchasePrice || 0) + 
                      (initialValues?.agencyFees || 0) + 
                      (initialValues?.notaryFees || 0) + 
                      (initialValues?.bankFees || 0) + 
                      (initialValues?.bankGuaranteeFees || 0) +
                      (initialValues?.renovationCosts || 0) - 
                      loanAmount
                    )
                  };
                  
                  // Notifier le parent des changements
                  onSubmit(updatedInvestment);
                  
                  // Afficher le tableau d'amortissement importé
                  setShowAmortization(true);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Graphique d'amortissement */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h4 className="text-md font-semibold mb-4">Visualisation de l'amortissement</h4>
        <div className="h-80">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

export default AcquisitionForm;