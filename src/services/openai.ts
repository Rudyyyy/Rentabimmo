import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface InvestmentSuggestion {
  purchasePrice?: number;
  monthlyRent?: number;
  propertyType?: 'new' | 'old';
  explanation: string;
  name?: string;
  description?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  agencyFees?: number;
  notaryFees?: number;
  bankFees?: number;
  bankGuaranteeFees?: number;
  mandatoryDiagnostics?: number;
  renovationCosts?: number;
  downPayment?: number;
  loanAmount?: number;
  loanDuration?: number;
  interestRate?: number;
  insuranceRate?: number;
  propertyTax?: number;
  condoFees?: number;
  propertyInsurance?: number;
  managementFees?: number;
  unpaidRentInsurance?: number;
  rentalStartDate?: string;
  taxType?: 'direct' | 'lmnp';
  taxationMethod?: 'real' | 'micro';
  taxRate?: number;
}

export async function processUserMessage(
  message: string,
  context: {
    previousMessages: OpenAI.Chat.ChatCompletionMessageParam[];
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
      ...context.previousMessages,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content || '';
    
    // Tente d'extraire des suggestions d'investissement de la réponse
    const suggestion: InvestmentSuggestion = {
      explanation: response
    };

    // Recherche des valeurs numériques dans la réponse
    const priceMatch = response.match(/prix.*?(\d+(?:\s*\d+)*)/i);
    if (priceMatch) {
      suggestion.purchasePrice = parseInt(priceMatch[1].replace(/\s/g, ''));
    }

    const rentMatch = response.match(/loyer.*?(\d+(?:\s*\d+)*)/i);
    if (rentMatch) {
      suggestion.monthlyRent = parseInt(rentMatch[1].replace(/\s/g, ''));
    }

    if (response.toLowerCase().includes('neuf')) {
      suggestion.propertyType = 'new';
    } else if (response.toLowerCase().includes('ancien')) {
      suggestion.propertyType = 'old';
    }

    // Extraction d'autres informations pour le formulaire détaillé
    const nameMatch = response.match(/nom.*?[:"]\s*([^"\n]+)/i);
    if (nameMatch) {
      suggestion.name = nameMatch[1].trim();
    }

    const descriptionMatch = response.match(/description.*?[:"]\s*([^"\n]+)/i);
    if (descriptionMatch) {
      suggestion.description = descriptionMatch[1].trim();
    }

    const startDateMatch = response.match(/date.*?début.*?(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (startDateMatch) {
      suggestion.projectStartDate = startDateMatch[1];
    }

    const endDateMatch = response.match(/date.*?fin.*?(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (endDateMatch) {
      suggestion.projectEndDate = endDateMatch[1];
    }

    const agencyFeesMatch = response.match(/frais.*?agence.*?(\d+(?:[.,]\d+)?%|\d+(?:[.,]\d+)?\s*€)/i);
    if (agencyFeesMatch) {
      const value = agencyFeesMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      if (agencyFeesMatch[1].includes('%')) {
        suggestion.agencyFees = suggestion.purchasePrice ? suggestion.purchasePrice * parseFloat(value) / 100 : 0;
      } else {
        suggestion.agencyFees = parseFloat(value);
      }
    }

    const notaryFeesMatch = response.match(/frais.*?notaire.*?(\d+(?:[.,]\d+)?%|\d+(?:[.,]\d+)?\s*€)/i);
    if (notaryFeesMatch) {
      const value = notaryFeesMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      if (notaryFeesMatch[1].includes('%')) {
        suggestion.notaryFees = suggestion.purchasePrice ? suggestion.purchasePrice * parseFloat(value) / 100 : 0;
      } else {
        suggestion.notaryFees = parseFloat(value);
      }
    }

    const bankFeesMatch = response.match(/frais.*?dossier.*?(\d+(?:[.,]\d+)?\s*€)/i);
    if (bankFeesMatch) {
      const value = bankFeesMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      suggestion.bankFees = parseFloat(value);
    }

    const bankGuaranteeFeesMatch = response.match(/frais.*?garantie.*?(\d+(?:[.,]\d+)?%|\d+(?:[.,]\d+)?\s*€)/i);
    if (bankGuaranteeFeesMatch) {
      const value = bankGuaranteeFeesMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      if (bankGuaranteeFeesMatch[1].includes('%')) {
        suggestion.bankGuaranteeFees = suggestion.purchasePrice ? suggestion.purchasePrice * parseFloat(value) / 100 : 0;
      } else {
        suggestion.bankGuaranteeFees = parseFloat(value);
      }
    }

    const renovationCostsMatch = response.match(/rénovation.*?(\d+(?:[.,]\d+)?\s*€)/i);
    if (renovationCostsMatch) {
      const value = renovationCostsMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      suggestion.renovationCosts = parseFloat(value);
    }

    const downPaymentMatch = response.match(/apport.*?(\d+(?:[.,]\d+)?%|\d+(?:[.,]\d+)?\s*€)/i);
    if (downPaymentMatch) {
      const value = downPaymentMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      if (downPaymentMatch[1].includes('%')) {
        suggestion.downPayment = suggestion.purchasePrice ? suggestion.purchasePrice * parseFloat(value) / 100 : 0;
      } else {
        suggestion.downPayment = parseFloat(value);
      }
    }

    const loanDurationMatch = response.match(/durée.*?prêt.*?(\d+)\s*ans/i);
    if (loanDurationMatch) {
      suggestion.loanDuration = parseInt(loanDurationMatch[1]);
    }

    const interestRateMatch = response.match(/taux.*?intérêt.*?(\d+(?:[.,]\d+)?%)/i);
    if (interestRateMatch) {
      const value = interestRateMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      suggestion.interestRate = parseFloat(value);
    }

    const insuranceRateMatch = response.match(/taux.*?assurance.*?(\d+(?:[.,]\d+)?%)/i);
    if (insuranceRateMatch) {
      const value = insuranceRateMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      suggestion.insuranceRate = parseFloat(value);
    }

    const propertyTaxMatch = response.match(/taxe.*?foncière.*?(\d+(?:[.,]\d+)?\s*€)/i);
    if (propertyTaxMatch) {
      const value = propertyTaxMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      suggestion.propertyTax = parseFloat(value);
    }

    const condoFeesMatch = response.match(/charges.*?copropriété.*?(\d+(?:[.,]\d+)?\s*€)/i);
    if (condoFeesMatch) {
      const value = condoFeesMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      suggestion.condoFees = parseFloat(value);
    }

    const propertyInsuranceMatch = response.match(/assurance.*?propriétaire.*?(\d+(?:[.,]\d+)?\s*€)/i);
    if (propertyInsuranceMatch) {
      const value = propertyInsuranceMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      suggestion.propertyInsurance = parseFloat(value);
    }

    const managementFeesMatch = response.match(/frais.*?gestion.*?(\d+(?:[.,]\d+)?%|\d+(?:[.,]\d+)?\s*€)/i);
    if (managementFeesMatch) {
      const value = managementFeesMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      if (managementFeesMatch[1].includes('%')) {
        suggestion.managementFees = suggestion.monthlyRent ? suggestion.monthlyRent * parseFloat(value) / 100 : 0;
      } else {
        suggestion.managementFees = parseFloat(value);
      }
    }

    const unpaidRentInsuranceMatch = response.match(/assurance.*?impayés.*?(\d+(?:[.,]\d+)?\s*€)/i);
    if (unpaidRentInsuranceMatch) {
      const value = unpaidRentInsuranceMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      suggestion.unpaidRentInsurance = parseFloat(value);
    }

    const rentalStartDateMatch = response.match(/date.*?location.*?(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (rentalStartDateMatch) {
      suggestion.rentalStartDate = rentalStartDateMatch[1];
    }

    if (response.toLowerCase().includes('lmnp')) {
      suggestion.taxType = 'lmnp';
    } else if (response.toLowerCase().includes('direct')) {
      suggestion.taxType = 'direct';
    }

    if (response.toLowerCase().includes('réel')) {
      suggestion.taxationMethod = 'real';
    } else if (response.toLowerCase().includes('micro')) {
      suggestion.taxationMethod = 'micro';
    }

    const taxRateMatch = response.match(/taux.*?imposition.*?(\d+(?:[.,]\d+)?%)/i);
    if (taxRateMatch) {
      const value = taxRateMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      suggestion.taxRate = parseFloat(value);
    }

    // Calcul du montant emprunté si nous avons le prix d'achat et l'apport
    if (suggestion.purchasePrice && suggestion.downPayment) {
      suggestion.loanAmount = suggestion.purchasePrice - suggestion.downPayment;
    }

    return {
      response,
      suggestion: Object.keys(suggestion).length > 1 ? suggestion : undefined
    };
  } catch (error) {
    console.error('Erreur lors de l\'appel à OpenAI:', error);
    throw new Error('Impossible de traiter votre message pour le moment. Veuillez réessayer.');
  }
} 