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
 */

import { AmortizationRow } from '../types/investment';

interface Props {
  schedule: AmortizationRow[]; // Tableau contenant les données d'amortissement pour chaque mois
  onClose: () => void;        // Fonction appelée pour fermer la modale
}

export default function AmortizationTable({ schedule, onClose }: Props) {
  // Formate un nombre en devise EUR selon le format français
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capital restant dû</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensualité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capital</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intérêts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total payé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            {/* Corps du tableau avec les données d'amortissement */}
            <tbody className="bg-white divide-y divide-gray-200">
              {schedule.map((row) => (
                <tr key={row.month} className={row.isDeferred ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.remainingBalance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.monthlyPayment)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.principal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.interest)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.totalPaid)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
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
      </div>
    </div>
  );
}