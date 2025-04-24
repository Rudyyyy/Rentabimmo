/**
 * Composant AmortizationTable
 * 
 * Ce composant affiche un tableau d'amortissement détaillé pour un prêt immobilier.
 * Il présente les informations suivantes pour chaque mois :
 * - La date de paiement
 * - Le capital restant dû
 * - Le montant de la mensualité
 * - La part de capital dans la mensualité
 * - La part d'intérêts dans la mensualité
 * - Le total payé depuis le début
 * - Le type de période (normal ou différé)
 * 
 * Le tableau est affiché dans une modale avec un fond semi-transparent et peut être fermé.
 * Les lignes en période de différé sont mises en évidence avec un fond bleu clair.
 * 
 * Toutes les colonnes sont éditables et peuvent être sauvegardées.
 * Un bouton permet de supprimer les modifications utilisateur et de revenir au calcul automatique.
 */

import React, { useState, useEffect } from 'react';
import { AmortizationRow } from '../types/investment';

interface Props {
  schedule: AmortizationRow[];
  onClose: () => void;
  onSave: (updatedSchedule: AmortizationRow[]) => void;
  onReset: () => void;
}

const AmortizationTable: React.FC<Props> = ({ schedule, onClose, onSave, onReset }) => {
  
  const [editableSchedule, setEditableSchedule] = useState(schedule);
  const [hasUserModifications, setHasUserModifications] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  // Vérifie si le tableau a été modifié par rapport à l'original
  useEffect(() => {
    const hasModifications = editableSchedule.some((row, index) => {
      const originalRow = schedule[index];
      return row.monthlyPayment !== originalRow.monthlyPayment ||
             row.principal !== originalRow.principal ||
             row.interest !== originalRow.interest ||
             row.remainingPrincipal !== originalRow.remainingPrincipal ||
             row.remainingBalance !== originalRow.remainingBalance ||
             row.totalPaid !== originalRow.totalPaid;
    });
    setHasUserModifications(hasModifications);
  }, [editableSchedule, schedule]);

  const handleInputChange = (index: number, field: keyof AmortizationRow, value: number) => {
    const updatedSchedule = [...editableSchedule];
    updatedSchedule[index] = {
      ...updatedSchedule[index],
      [field]: value
    };
    setEditableSchedule(updatedSchedule);
    setHasUserModifications(true);
  };

  const handleSave = () => {
    console.log("----- DÉBUT handleSave dans AmortizationTable -----");
    console.log("Sauvegarde du tableau:", editableSchedule);
    console.log("Modifications détectées:", hasUserModifications);
    
    try {
      // Vérifier que le tableau n'est pas vide
      if (!editableSchedule || editableSchedule.length === 0) {
        console.error("Erreur: Tableau d'amortissement vide");
        alert("Erreur: Impossible de sauvegarder un tableau d'amortissement vide");
        return;
      }
      
      // Vérifier que onSave est bien une fonction
      if (typeof onSave !== 'function') {
        console.error("Erreur: onSave n'est pas une fonction valide", onSave);
        alert("Erreur technique: La fonction de sauvegarde n'est pas disponible");
        return;
      }
      
      // Formater les valeurs à 2 décimales avant de sauvegarder
      const formattedSchedule = editableSchedule.map(row => ({
        ...row,
        remainingPrincipal: Number(row.remainingPrincipal.toFixed(2)),
        remainingBalance: Number(row.remainingBalance.toFixed(2)),
        interest: Number(row.interest.toFixed(2)),
        monthlyPayment: Number(row.monthlyPayment.toFixed(2)),
        principal: Number(row.principal.toFixed(2)),
        totalPaid: Number(row.totalPaid.toFixed(2))
      }));
      
      // Appeler la fonction de sauvegarde du composant parent
      console.log("Appel de la fonction onSave avec", formattedSchedule.length, "lignes");
      console.log("Type de onSave:", typeof onSave);
      
      // Créer une copie profonde pour éviter les références partagées
      const scheduleToSave = JSON.parse(JSON.stringify(formattedSchedule));
      onSave(scheduleToSave);
      
      // Réinitialiser l'état des modifications
      setHasUserModifications(false);
      
      // Afficher une notification de succès
      console.log("Fonction onSave appelée avec succès");
      console.log("----- FIN handleSave dans AmortizationTable -----");
      // alert("Tableau d'amortissement sauvegardé avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du tableau:", error);
      alert("Erreur lors de la sauvegarde du tableau d'amortissement: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleReset = () => {
    console.log("Demande de réinitialisation du tableau");
    setShowResetConfirmation(true);
  };

  const confirmReset = () => {
    console.log("Confirmation de réinitialisation");
    onReset();
    setEditableSchedule(schedule);
    setHasUserModifications(false);
    setShowResetConfirmation(false);
    console.log("Tableau réinitialisé avec:", schedule);
  };

  // Formate une date en format "mois année" en français
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', { 
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  return (
    // Conteneur principal avec fond semi-transparent
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      {/* Conteneur de la modale */}
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* En-tête de la modale avec titre et bouton de fermeture */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Tableau d'amortissement</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Fermer</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Conteneur du tableau avec défilement */}
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            {/* En-tête du tableau avec les colonnes */}
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mois</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capital restant dû</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant total dû</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intérêts mensuels</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensualité</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capital</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intérêts</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total payé</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            {/* Corps du tableau avec les données d'amortissement */}
            <tbody className="bg-white divide-y divide-gray-200">
              {editableSchedule.map((row, index) => (
                <tr key={row.month} className={row.isDeferred ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{row.month}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatDate(row.date)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    <input
                      type="number"
                      value={row.remainingPrincipal}
                      onChange={(e) => handleInputChange(index, 'remainingPrincipal', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    <input
                      type="number"
                      value={row.remainingBalance}
                      onChange={(e) => handleInputChange(index, 'remainingBalance', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    <input
                      type="number"
                      value={row.interest}
                      onChange={(e) => handleInputChange(index, 'interest', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    <input
                      type="number"
                      value={row.monthlyPayment}
                      onChange={(e) => handleInputChange(index, 'monthlyPayment', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    <input
                      type="number"
                      value={row.principal}
                      onChange={(e) => handleInputChange(index, 'principal', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    <input
                      type="number"
                      value={row.isDeferred ? 0 : row.interest}
                      onChange={(e) => handleInputChange(index, 'interest', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    <input
                      type="number"
                      value={row.totalPaid}
                      onChange={(e) => handleInputChange(index, 'totalPaid', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {/* Badge indiquant si la période est différée ou normale */}
                    {row.isDeferred ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Différé
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-between p-4 border-t border-gray-200">
          <div>
            {hasUserModifications && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Supprimer données utilisateur
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-4 py-2 ${hasUserModifications ? 'bg-blue-600' : 'bg-blue-400'} text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={!hasUserModifications}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      {/* Pop-up de confirmation */}
      {showResetConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Êtes-vous sûr de vouloir supprimer toutes les modifications manuelles ? Le tableau d'amortissement sera recalculé automatiquement.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowResetConfirmation(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmortizationTable;