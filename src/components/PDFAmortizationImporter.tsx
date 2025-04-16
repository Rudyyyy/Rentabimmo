import React, { useState } from 'react';
import pdfExtractor from '../utils/pdfExtractor';
import { AmortizationRow } from '../types/investment';

interface Props {
  onAmortizationImported: (amortization: AmortizationRow[], interestRate: number) => void;
}

const PDFAmortizationImporter: React.FC<Props> = ({ onAmortizationImported }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [extractedRows, setExtractedRows] = useState<AmortizationRow[]>([]);

  /**
   * Calcule approximativement le taux d'intérêt à partir du tableau d'amortissement
   * @param amortizationRows Les lignes du tableau d'amortissement
   * @returns Le taux d'intérêt annuel approximatif en pourcentage
   */
  const calculateApproximateInterestRate = (amortizationRows: AmortizationRow[]): number => {
    // Vérifier qu'il y a suffisamment de données
    if (amortizationRows.length < 3) {
      return 0;
    }
    
    // Récupérer les données nécessaires au calcul
    const initialBalance = amortizationRows[0].remainingBalance;
    const monthlyPayment = amortizationRows[0].monthlyPayment;
    const totalMonths = amortizationRows.length;
    
    // Si des valeurs essentielles manquent, on ne peut pas calculer
    if (!initialBalance || !monthlyPayment || totalMonths <= 0) {
      return 0;
    }
    
    try {
      // Méthode de Newton pour trouver le taux (i) qui satisfait l'équation:
      // P = (i * M) / (1 - (1 + i)^-n), où P est le paiement mensuel, M le capital initial, n le nombre de mois
      let rate = 0.005; // Commencer avec une estimation de 0.5% mensuel
      const precision = 0.0000001;
      const maxIterations = 100;
      
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const f = monthlyPayment - (rate * initialBalance) / (1 - Math.pow(1 + rate, -totalMonths));
        const fPrime = -initialBalance / (1 - Math.pow(1 + rate, -totalMonths)) - 
                      (rate * initialBalance * totalMonths * Math.pow(1 + rate, -totalMonths - 1)) / 
                      Math.pow(1 - Math.pow(1 + rate, -totalMonths), 2);
        
        // Éviter la division par zéro
        if (Math.abs(fPrime) < 1e-10) break;
        
        const delta = f / fPrime;
        rate = rate - delta;
        
        // Éviter les taux négatifs ou trop élevés
        if (rate <= 0 || rate > 0.1) {
          rate = Math.max(0.001, Math.min(0.1, rate));
        }
        
        if (Math.abs(delta) < precision) break;
      }
      
      // Convertir le taux mensuel en taux annuel en pourcentage
      return parseFloat((rate * 12 * 100).toFixed(2));
    } catch (error) {
      console.error("Erreur lors du calcul du taux d'intérêt:", error);
      return 0;
    }
  };

  /**
   * Gère la sélection d'un fichier PDF
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Vérifier si c'est un PDF
    if (file.type !== 'application/pdf') {
      setError('Le fichier doit être au format PDF');
      return;
    }
    
    setFilename(file.name);
    setError(null);
    setIsLoading(true);
    
    try {
      // Extraire le tableau d'amortissement du PDF
      const rows = await pdfExtractor.extractAmortizationTable(file);
      
      // Post-traiter les données
      const processedRows = pdfExtractor.postProcessAmortizationTable(rows);
      
      setExtractedRows(processedRows);
      
      // Si des lignes ont été extraites, appeler le callback
      if (processedRows.length > 0) {
        // Calculer approximativement le taux d'intérêt
        const interestRate = calculateApproximateInterestRate(processedRows);
        
        // Inclure le taux d'intérêt calculé dans le callback
        onAmortizationImported(processedRows, interestRate);
      } else {
        setError('Aucun tableau d\'amortissement détecté dans ce document');
      }
    } catch (err) {
      console.error('Erreur d\'extraction:', err);
      setError('Erreur lors de l\'extraction des données: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Aperçu des lignes extraites
   */
  const renderPreview = () => {
    if (extractedRows.length === 0) return null;
    
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Aperçu des données extraites</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensualité</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capital</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intérêts</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capital restant</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Limiter à 10 lignes pour l'aperçu */}
              {extractedRows.slice(0, 10).map((row, index) => (
                <tr key={index} className={row.isDeferred ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.month}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.date}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(row.monthlyPayment)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(row.principal)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(row.interest)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(row.remainingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {extractedRows.length > 10 && (
          <p className="mt-2 text-sm text-gray-500">
            + {extractedRows.length - 10} autres lignes
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Importer un tableau d'amortissement</h2>
      
      <div className="mt-4">
        <label 
          className="flex justify-center items-center px-4 py-6 bg-white text-blue-500 rounded-lg shadow-lg tracking-wide uppercase border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white transition duration-300 ease-in-out"
        >
          <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
          </svg>
          <span className="ml-2 text-base leading-normal">
            {isLoading ? 'Analyse en cours...' : 'Sélectionner un PDF'}
          </span>
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </label>
        
        {filename && (
          <p className="mt-2 text-sm text-gray-600">
            Fichier sélectionné: {filename}
          </p>
        )}
        
        {error && (
          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {isLoading && (
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {renderPreview()}
        
        {extractedRows.length > 0 && (
          <div className="mt-4">
            <p className="text-green-600 font-semibold">
              {extractedRows.length} lignes ont été extraites avec succès et importées dans votre tableau d'amortissement!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFAmortizationImporter; 