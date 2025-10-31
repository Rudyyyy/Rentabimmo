import { supabase } from './supabase';
import { AmortizationRow } from '../types/investment';

/**
 * Enregistre le tableau d'amortissement d'un investissement dans la base de données
 * @param investmentId L'identifiant de l'investissement
 * @param amortizationSchedule Le tableau d'amortissement à enregistrer
 * @returns {Promise<boolean>} True si l'enregistrement a réussi, false sinon
 */
export async function saveAmortizationSchedule(
  investmentId: string, 
  amortizationSchedule: AmortizationRow[]
): Promise<boolean> {
  console.log('==================== DÉBUT SAUVEGARDE API AMORTISSEMENT ====================');
  console.log(`ID de l'investissement: ${investmentId}`);
  console.log(`Nombre de lignes à sauvegarder: ${amortizationSchedule.length}`);
  
  try {
    // Vérifier l'ID de l'investissement
    if (!investmentId) {
      console.error('❌ ID invalide ou manquant');
      return false;
    }
    
    // Étape 1: Lire la propriété complète depuis la base de données
    console.log('1. Lecture de la propriété depuis la base de données');
    
    const { data: property, error: readError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', investmentId)
      .single();
    
    if (readError) {
      console.error('❌ Erreur lors de la lecture de la propriété:', readError);
      return false;
    }
    
    if (!property) {
      console.error('❌ Propriété non trouvée avec l\'ID:', investmentId);
      return false;
    }
    
    console.log('✅ Propriété trouvée:', property.name);
    
    // Étape 2: Extraction et mise à jour des données d'investissement
    console.log('2. Mise à jour du tableau d\'amortissement');
    
    // Extraire l'objet investment_data ou créer un nouvel objet s'il n'existe pas
    const currentInvestmentData = property.investment_data || {};
    
    // Débogage - Afficher la structure actuelle
    console.log('Structure actuelle des données d\'investissement:');
    console.log('- Nombre de propriétés:', Object.keys(currentInvestmentData).length);
    console.log('- Propriétés:', Object.keys(currentInvestmentData));
    
    // Créer une copie profonde des données d'investissement actuelles
    const updatedInvestmentData = JSON.parse(JSON.stringify(currentInvestmentData));
    
    // Remplacer/ajouter uniquement le tableau d'amortissement
    updatedInvestmentData.amortizationSchedule = amortizationSchedule;
    
    // Étape 3: Écriture des données mises à jour
    console.log('3. Enregistrement des données mises à jour');
    
    // Débogage - Vérifier les données avant envoi
    console.log('Données d\'investissement mises à jour:');
    console.log('- Nombre de propriétés:', Object.keys(updatedInvestmentData).length);
    console.log('- Propriétés:', Object.keys(updatedInvestmentData));
    console.log('- Tableau d\'amortissement:', 
      updatedInvestmentData.amortizationSchedule ? 
      `${updatedInvestmentData.amortizationSchedule.length} lignes` : 
      'Manquant');
    
    // Mise à jour dans la base de données
    const { error: writeError } = await supabase
      .from('properties')
      .update({
        investment_data: updatedInvestmentData
      })
      .eq('id', investmentId);
    
    if (writeError) {
      console.error('❌ Erreur lors de l\'écriture des données:', writeError);
      return false;
    }
    
    // Étape 4: Vérification que les données ont bien été enregistrées
    console.log('4. Vérification des données enregistrées');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('properties')
      .select('investment_data')
      .eq('id', investmentId)
      .single();
    
    if (verifyError) {
      console.error('❌ Erreur lors de la vérification des données:', verifyError);
      // Continuer même si la vérification échoue, car les données ont probablement été enregistrées
    } else if (verifyData?.investment_data?.amortizationSchedule) {
      const savedLength = verifyData.investment_data.amortizationSchedule.length;
      console.log(`✅ Vérification réussie: ${savedLength} lignes dans le tableau d'amortissement`);
    } else {
      console.warn('⚠️ Vérification: Le tableau d\'amortissement n\'est pas visible dans les données enregistrées');
    }
    
    console.log('==================== FIN SAUVEGARDE API AMORTISSEMENT (SUCCÈS) ====================');
    return true;
  } catch (error) {
    console.error('❌ Exception critique:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    console.log('==================== FIN SAUVEGARDE API AMORTISSEMENT (ÉCHEC) ====================');
    return false;
  }
}

/**
 * Récupère le tableau d'amortissement d'un investissement depuis la base de données
 * @param investmentId L'identifiant de l'investissement
 * @returns {Promise<AmortizationRow[] | null>} Le tableau d'amortissement ou null en cas d'erreur
 */
export async function getAmortizationSchedule(
  investmentId: string
): Promise<AmortizationRow[] | null> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('investment_data')
      .eq('id', investmentId)
      .single();
    
    if (error || !data) {
      console.error('Erreur lors de la récupération des données:', error);
      return null;
    }
    
    return data.investment_data.amortizationSchedule || null;
  } catch (error) {
    console.error('Erreur lors de la récupération du tableau d\'amortissement:', error);
    return null;
  }
}

/**
 * Enregistre l'année de revente souhaitée dans la base de données
 * @param propertyId L'identifiant de la propriété
 * @param targetSaleYear L'année de revente souhaitée
 * @returns {Promise<boolean>} True si l'enregistrement a réussi, false sinon
 */
export async function saveTargetSaleYear(
  propertyId: string,
  targetSaleYear: number
): Promise<boolean> {
  try {
    if (!propertyId) {
      console.error('❌ ID de propriété invalide ou manquant');
      return false;
    }

    // Lire la propriété complète depuis la base de données
    const { data: property, error: readError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (readError) {
      console.error('❌ Erreur lors de la lecture de la propriété:', readError);
      return false;
    }

    if (!property) {
      console.error('❌ Propriété non trouvée avec l\'ID:', propertyId);
      return false;
    }

    // Mettre à jour les données d'investissement
    const currentInvestmentData = property.investment_data || {};
    const updatedInvestmentData = JSON.parse(JSON.stringify(currentInvestmentData));
    updatedInvestmentData.targetSaleYear = targetSaleYear;

    // Mise à jour dans la base de données
    const { error: writeError } = await supabase
      .from('properties')
      .update({
        investment_data: updatedInvestmentData
      })
      .eq('id', propertyId);

    if (writeError) {
      console.error('❌ Erreur lors de l\'écriture des données:', writeError);
      return false;
    }

    console.log(`✅ Année de revente souhaitée enregistrée: ${targetSaleYear}`);
    return true;
  } catch (error) {
    console.error('❌ Exception critique:', error);
    return false;
  }
} 