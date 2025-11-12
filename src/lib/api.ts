import { supabase } from './supabase';
import { AmortizationRow } from '../types/investment';
import { SCI, defaultSCI } from '../types/sci';

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

/**
 * Enregistre le gain total souhaité dans la base de données
 * @param propertyId L'identifiant de la propriété
 * @param targetGain Le gain total souhaité
 * @returns {Promise<boolean>} True si l'enregistrement a réussi, false sinon
 */
export async function saveTargetGain(
  propertyId: string,
  targetGain: number
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
    updatedInvestmentData.targetGain = targetGain;

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

    console.log(`✅ Gain total souhaité enregistré: ${targetGain}`);
    return true;
  } catch (error) {
    console.error('❌ Exception critique:', error);
    return false;
  }
}

/**
 * Enregistre le cashflow cumulé souhaité dans la base de données
 * @param propertyId L'identifiant de la propriété
 * @param targetCashflow Le cashflow cumulé souhaité
 * @returns {Promise<boolean>} True si l'enregistrement a réussi, false sinon
 */
export async function saveTargetCashflow(
  propertyId: string,
  targetCashflow: number
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
    updatedInvestmentData.targetCashflow = targetCashflow;

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

    console.log(`✅ Cashflow cumulé souhaité enregistré: ${targetCashflow}`);
    return true;
  } catch (error) {
    console.error('❌ Exception critique:', error);
    return false;
  }
}

// ==================== FONCTIONS CRUD POUR LES SCI ====================

/**
 * Récupère toutes les SCI d'un utilisateur
 * @param userId ID de l'utilisateur
 * @returns Liste des SCI de l'utilisateur
 */
export async function getSCIs(userId: string): Promise<SCI[]> {
  try {
    const { data, error } = await supabase
      .from('scis')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur lors de la récupération des SCI:', error);
      return [];
    }

    // Convertir les données de la base de données en type SCI
    const scis: SCI[] = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      user_id: row.user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      siret: row.siret,
      dateCreation: row.date_creation,
      formeJuridique: 'SCI' as const,
      capital: row.capital,
      taxParameters: row.tax_parameters as any,
      propertyIds: row.property_ids || [],
      consolidatedTaxResults: row.consolidated_tax_results as any,
      description: row.description
    }));

    return scis;
  } catch (error) {
    console.error('❌ Exception lors de la récupération des SCI:', error);
    return [];
  }
}

/**
 * Récupère une SCI par son ID
 * @param sciId ID de la SCI
 * @returns La SCI ou null si non trouvée
 */
export async function getSCIById(sciId: string): Promise<SCI | null> {
  try {
    const { data, error } = await supabase
      .from('scis')
      .select('*')
      .eq('id', sciId)
      .single();

    if (error || !data) {
      console.error('❌ Erreur lors de la récupération de la SCI:', error);
      return null;
    }

    const sci: SCI = {
      id: data.id,
      name: data.name,
      user_id: data.user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      siret: data.siret,
      dateCreation: data.date_creation,
      formeJuridique: 'SCI' as const,
      capital: data.capital,
      taxParameters: data.tax_parameters as any,
      propertyIds: data.property_ids || [],
      consolidatedTaxResults: data.consolidated_tax_results as any,
      description: data.description
    };

    return sci;
  } catch (error) {
    console.error('❌ Exception lors de la récupération de la SCI:', error);
    return null;
  }
}

/**
 * Crée une nouvelle SCI
 * @param userId ID de l'utilisateur
 * @param sciData Données de la SCI à créer
 * @returns La SCI créée ou null en cas d'erreur
 */
export async function createSCI(
  userId: string,
  sciData: Omit<SCI, 'id' | 'user_id' | 'created_at'>
): Promise<SCI | null> {
  try {
    const { data, error } = await supabase
      .from('scis')
      .insert([
        {
          user_id: userId,
          name: sciData.name,
          siret: sciData.siret,
          date_creation: sciData.dateCreation,
          forme_juridique: 'SCI',
          capital: sciData.capital,
          tax_parameters: sciData.taxParameters as any,
          property_ids: sciData.propertyIds || [],
          consolidated_tax_results: sciData.consolidatedTaxResults || {},
          description: sciData.description
        }
      ])
      .select()
      .single();

    if (error || !data) {
      console.error('❌ Erreur lors de la création de la SCI:', error);
      return null;
    }

    console.log('✅ SCI créée avec succès:', data.name);

    const sci: SCI = {
      id: data.id,
      name: data.name,
      user_id: data.user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      siret: data.siret,
      dateCreation: data.date_creation,
      formeJuridique: 'SCI' as const,
      capital: data.capital,
      taxParameters: data.tax_parameters as any,
      propertyIds: data.property_ids || [],
      consolidatedTaxResults: data.consolidated_tax_results as any,
      description: data.description
    };

    return sci;
  } catch (error) {
    console.error('❌ Exception lors de la création de la SCI:', error);
    return null;
  }
}

/**
 * Met à jour une SCI existante
 * @param sciId ID de la SCI
 * @param sciData Données de la SCI à mettre à jour
 * @returns True si la mise à jour a réussi, false sinon
 */
export async function updateSCI(
  sciId: string,
  sciData: Partial<Omit<SCI, 'id' | 'user_id' | 'created_at'>>
): Promise<boolean> {
  try {
    const updateData: any = {};

    if (sciData.name !== undefined) updateData.name = sciData.name;
    if (sciData.siret !== undefined) updateData.siret = sciData.siret;
    if (sciData.dateCreation !== undefined) updateData.date_creation = sciData.dateCreation;
    if (sciData.capital !== undefined) updateData.capital = sciData.capital;
    if (sciData.taxParameters !== undefined) updateData.tax_parameters = sciData.taxParameters;
    if (sciData.propertyIds !== undefined) updateData.property_ids = sciData.propertyIds;
    if (sciData.consolidatedTaxResults !== undefined) updateData.consolidated_tax_results = sciData.consolidatedTaxResults;
    if (sciData.description !== undefined) updateData.description = sciData.description;

    const { error } = await supabase
      .from('scis')
      .update(updateData)
      .eq('id', sciId);

    if (error) {
      console.error('❌ Erreur lors de la mise à jour de la SCI:', error);
      return false;
    }

    console.log('✅ SCI mise à jour avec succès');
    return true;
  } catch (error) {
    console.error('❌ Exception lors de la mise à jour de la SCI:', error);
    return false;
  }
}

/**
 * Supprime une SCI
 * @param sciId ID de la SCI à supprimer
 * @returns True si la suppression a réussi, false sinon
 */
export async function deleteSCI(sciId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scis')
      .delete()
      .eq('id', sciId);

    if (error) {
      console.error('❌ Erreur lors de la suppression de la SCI:', error);
      return false;
    }

    console.log('✅ SCI supprimée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Exception lors de la suppression de la SCI:', error);
    return false;
  }
}

/**
 * Ajoute un bien à une SCI
 * @param sciId ID de la SCI
 * @param propertyId ID du bien à ajouter
 * @returns True si l'ajout a réussi, false sinon
 */
export async function addPropertyToSCI(
  sciId: string,
  propertyId: string
): Promise<boolean> {
  try {
    // Récupérer la SCI actuelle
    const sci = await getSCIById(sciId);
    if (!sci) {
      console.error('❌ SCI non trouvée');
      return false;
    }

    // Vérifier que le bien n'est pas déjà dans la SCI
    if (sci.propertyIds.includes(propertyId)) {
      console.log('⚠️ Le bien est déjà dans cette SCI');
      return true;
    }

    // Ajouter le bien à la liste
    const updatedPropertyIds = [...sci.propertyIds, propertyId];

    // Mettre à jour la SCI
    const success = await updateSCI(sciId, { propertyIds: updatedPropertyIds });

    if (success) {
      console.log('✅ Bien ajouté à la SCI avec succès');
    }

    return success;
  } catch (error) {
    console.error('❌ Exception lors de l\'ajout du bien à la SCI:', error);
    return false;
  }
}

/**
 * Retire un bien d'une SCI
 * @param sciId ID de la SCI
 * @param propertyId ID du bien à retirer
 * @returns True si le retrait a réussi, false sinon
 */
export async function removePropertyFromSCI(
  sciId: string,
  propertyId: string
): Promise<boolean> {
  try {
    // Récupérer la SCI actuelle
    const sci = await getSCIById(sciId);
    if (!sci) {
      console.error('❌ SCI non trouvée');
      return false;
    }

    // Retirer le bien de la liste
    const updatedPropertyIds = sci.propertyIds.filter(id => id !== propertyId);

    // Mettre à jour la SCI
    const success = await updateSCI(sciId, { propertyIds: updatedPropertyIds });

    if (success) {
      console.log('✅ Bien retiré de la SCI avec succès');
    }

    return success;
  } catch (error) {
    console.error('❌ Exception lors du retrait du bien de la SCI:', error);
    return false;
  }
} 