import OpenAI from 'openai';
import { InvestmentSuggestion } from './openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function processUserMessageWithMistral(
  message: string,
  context: {
    previousMessages: { role: string; content: string }[];
    currentInvestment?: any;
  }
): Promise<{
  response: string;
  suggestion?: InvestmentSuggestion;
}> {
  try {
    const systemPrompt = `Tu es un assistant spécialisé dans l'investissement immobilier en France. 
    Tu aides les utilisateurs à remplir leur formulaire d'investissement et à analyser les résultats.
    
    Ta mission principale est d'aider l'utilisateur à remplir le formulaire détaillé de création d'un bien immobilier.
    Quand l'utilisateur te décrit un bien immobilier, tu dois extraire toutes les informations pertinentes pour remplir le formulaire.
    
    Voici les informations importantes à extraire :
    - Nom et description du bien
    - Prix d'achat
    - Type de bien (neuf ou ancien)
    - Frais d'agence (généralement 4% du prix d'achat)
    - Frais de notaire (2.5% pour le neuf, 7.5% pour l'ancien)
    - Frais de dossier bancaire (environ 1000€)
    - Frais de garantie bancaire (environ 1% du prix d'achat)
    - Coûts de rénovation
    - Apport personnel (généralement 10% du coût total)
    - Durée du prêt (généralement 20 ans)
    - Taux d'intérêt (actuellement autour de 3%)
    - Taux d'assurance (actuellement autour de 0.25%)
    - Taxe foncière
    - Charges de copropriété
    - Assurance propriétaire
    - Frais de gestion
    - Assurance impayés
    - Loyer mensuel
    - Date de début de location
    - Régime fiscal (direct ou LMNP)
    - Méthode de taxation (réel ou micro)
    - Taux d'imposition (généralement 30%)
    
    Réponds de manière concise et précise. Si tu identifies des valeurs numériques pertinentes pour l'investissement,
    inclus-les dans ta réponse sous forme structurée.
    
    Si l'utilisateur te demande de remplir le formulaire détaillé, propose-lui de cliquer sur le bouton "Formulaire détaillé" 
    et indique-lui que tu peux l'aider à remplir ce formulaire avec les informations qu'il te fournit.`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...context.previousMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content || '';

    // Tenter d'extraire une suggestion structurée si elle existe dans la réponse
    let suggestion: InvestmentSuggestion | undefined;
    try {
      const suggestionMatch = responseText.match(/\{[\s\S]*\}/);
      if (suggestionMatch) {
        suggestion = JSON.parse(suggestionMatch[0]);
      }
    } catch (e) {
      console.warn('Could not parse suggestion from response:', e);
    }

    return {
      response: responseText,
      suggestion,
    };
  } catch (error: any) {
    console.error('Error in processUserMessageWithMistral:', error);
    throw new Error('Impossible de traiter votre message pour le moment. Veuillez réessayer.');
  }
} 