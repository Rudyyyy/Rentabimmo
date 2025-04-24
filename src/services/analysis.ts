import { processUserMessageWithMistral } from './mistral';
import { processUserMessage } from './openai';

interface AnalysisResult {
  overview: string;
  financial: string;
  risks: string;
  recommendations: string;
}

export async function processInvestmentAnalysis(investmentData: any): Promise<AnalysisResult> {
  const isDevelopment = import.meta.env.DEV;
  
  const systemPrompt = `Tu es un expert en analyse d'investissements immobiliers. 
  Je vais te fournir des données détaillées sur un investissement immobilier.
  Ton rôle est d'analyser ces données et de fournir une analyse approfondie structurée en plusieurs parties :

  1. Synthèse Globale :
     - Vue d'ensemble de l'investissement
     - Points forts et points faibles majeurs
     - Évaluation générale de la pertinence de l'investissement

  2. Analyse Financière :
     - Analyse détaillée des coûts d'acquisition
     - Évaluation de la structure de financement
     - Analyse des flux de trésorerie
     - Étude des différents indicateurs de rentabilité
     - Analyse de l'effet de levier

  3. Analyse des Risques :
     - Risques liés au marché immobilier
     - Risques locatifs
     - Risques financiers
     - Risques fiscaux
     - Propositions de mitigation des risques

  4. Recommandations :
     - Suggestions d'optimisation
     - Points d'attention particuliers
     - Recommandations d'actions concrètes
     - Perspectives à long terme

  Fournis une analyse détaillée et professionnelle, en utilisant ton expertise pour identifier les points clés 
  et donner des conseils pertinents. Base tes analyses sur les données fournies et les meilleures pratiques 
  du secteur immobilier.`;

  const message = JSON.stringify(investmentData, null, 2);

  try {
    // Utiliser Mistral en développement, OpenAI en production
    const response = isDevelopment
      ? await processUserMessageWithMistral(message, {
          previousMessages: [{ role: 'system', content: systemPrompt }],
        })
      : await processUserMessage(message, {
          previousMessages: [{ role: 'system', content: systemPrompt }],
        });

    // Analyser la réponse pour extraire les différentes sections
    const sections = response.response.split('\n\n');
    
    return {
      overview: extractSection(sections, "Synthèse Globale"),
      financial: extractSection(sections, "Analyse Financière"),
      risks: extractSection(sections, "Analyse des Risques"),
      recommendations: extractSection(sections, "Recommandations")
    };
  } catch (error) {
    console.error('Error in processInvestmentAnalysis:', error);
    throw error;
  }
}

function extractSection(sections: string[], title: string): string {
  const sectionStart = sections.findIndex(s => s.includes(title));
  if (sectionStart === -1) return "Analyse non disponible.";
  
  let content = sections[sectionStart];
  let currentIndex = sectionStart + 1;
  
  while (
    currentIndex < sections.length && 
    !sections[currentIndex].includes("Synthèse Globale") &&
    !sections[currentIndex].includes("Analyse Financière") &&
    !sections[currentIndex].includes("Analyse des Risques") &&
    !sections[currentIndex].includes("Recommandations")
  ) {
    content += "\n\n" + sections[currentIndex];
    currentIndex++;
  }
  
  return content.replace(title + ":", "").trim();
} 