import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User } from 'lucide-react';
import { Investment, YearlyExpenses } from '../types/investment';
import { processUserMessage } from '../services/openai';
import { processUserMessageWithMistral } from '../services/mistral';
import { generateAmortizationSchedule } from '../utils/calculations';
import { getLoanInfoForYear, getInterestForYear } from '../utils/propertyCalculations';
import OpenAI from 'openai';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ExtractedData {
  purchasePrice?: number;
  projectStartDate?: string;
  charges?: number;
  propertyTax?: number;
  propertyType?: 'new' | 'old';
  rentalType?: 'furnished' | 'unfurnished';
  rent?: number;
  name?: string;
  description?: string;
  [key: string]: any;
}

interface Props {
  onClose: () => void;
  onSave: (investment: Investment) => void;
}

const PropertyCreationChatbot: React.FC<Props> = ({ onClose, onSave }) => {
  const [isOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [isCreating, setIsCreating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounter = useRef<number>(0);

  // Détermine si nous sommes en environnement de développement
  const isDevelopment = import.meta.env.DEV;

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialiser avec le message de bienvenue
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: `msg-${Date.now()}-${messageIdCounter.current++}`,
        type: 'assistant',
        content: `Bonjour ! Je vais vous aider à créer un nouveau bien immobilier.

**Informations requises :**

- **Prix d'achat** en euros

**Informations optionnelles** (des valeurs par défaut seront utilisées si non spécifiées) :

- **Date de début du projet** : date au format JJ/MM/AAAA (par défaut : dans 3 mois)
- **Charges de copropriété** : montant annuel en euros (par défaut : 1% du prix d'achat)
- **Taxe foncière** : montant annuel en euros (par défaut : 0.75% du prix d'achat)
- **Type de bien** : neuf ou ancien (par défaut : ancien)
- **Type de location** : meublé ou non meublé (par défaut : meublé)
- **Loyer mensuel** : montant en euros (par défaut : 0.75% du prix d'achat par mois)

Vous pouvez décrire votre projet librement, je vais extraire les informations nécessaires. Si des détails manquent, je vous poserai des questions.`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  // Fonction pour analyser le message de l'utilisateur et extraire les données
  const analyzeUserInput = async (userMessage: string, conversationHistory: Message[], currentData: ExtractedData): Promise<{
    response: string;
    extractedData: ExtractedData;
    isComplete: boolean;
    missingFields: string[];
    summary: string;
  }> => {
    const systemPrompt = `Tu es un assistant spécialisé dans l'investissement immobilier en France. 
Ton rôle est d'analyser la description d'un projet immobilier fournie par l'utilisateur et d'extraire les informations nécessaires pour créer un bien.

**Données à extraire :**
1. **purchasePrice** (OBLIGATOIRE) : Prix d'achat du bien en euros (nombre)
2. **projectStartDate** (optionnel) : Date de début au format YYYY-MM-DD (par défaut : 3 mois après aujourd'hui)
3. **charges** (optionnel) : Charges de copropriété annuelles en euros (par défaut : 1% du prix d'achat)
4. **propertyTax** (optionnel) : Taxe foncière annuelle en euros (par défaut : 0.75% du prix d'achat)
5. **propertyType** (optionnel) : "new" ou "old" (par défaut : "old")
6. **rentalType** (optionnel) : "furnished" ou "unfurnished" (par défaut : "furnished")
7. **rent** (optionnel) : Loyer mensuel en euros (par défaut : 0.75% du prix d'achat)

**Instructions importantes :**
- Analyse le message de l'utilisateur et extrais toutes les informations disponibles
- Fusionne avec les données déjà collectées (currentData) pour avoir une vue complète
- Crée un récapitulatif clair de ce que tu as compris
- Liste les informations manquantes (seulement le prix d'achat est vraiment obligatoire, les autres auront des valeurs par défaut)
- Demande toujours à l'utilisateur s'il veut créer le bien maintenant ou compléter les informations
- Sois naturel et conversationnel dans tes réponses

**Format de réponse :**
Réponds avec un JSON au format suivant (sans texte avant ou après) :
{
  "response": "Ton message conversationnel à l'utilisateur avec récapitulatif, informations manquantes, et demande de confirmation",
  "extractedData": {
    "purchasePrice": 150000,
    "projectStartDate": "2024-06-01",
    "charges": 1500,
    "propertyTax": 1125,
    "propertyType": "old",
    "rentalType": "furnished",
    "rent": 1125
  },
  "isComplete": true ou false (true si purchasePrice est présent),
  "missingFields": ["liste des champs manquants (seulement ceux vraiment importants)"],
  "summary": "Récapitulatif structuré de ce qui a été compris, formaté pour l'affichage"
}

IMPORTANT : 
- Toujours inclure un récapitulatif clair dans "summary"
- Toujours demander si l'utilisateur veut créer le bien maintenant ou compléter
- Si purchasePrice est présent, isComplete peut être true même si d'autres infos manquent (elles auront des valeurs par défaut)`;

    const conversationContextForMistral = conversationHistory
      .filter(m => m.type === 'assistant' || m.type === 'user')
      .map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

    const conversationContextForOpenAI: OpenAI.Chat.ChatCompletionMessageParam[] = conversationHistory
      .filter(m => m.type === 'assistant' || m.type === 'user')
      .map(m => ({
        role: (m.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content
      }));

    const currentDataStr = JSON.stringify(currentData, null, 2);
    const fullPrompt = `${systemPrompt}

**Données actuellement collectées :**
${currentDataStr}

**Message de l'utilisateur :**
"${userMessage}"

Analyse ce message, fusionne avec les données existantes, et génère ta réponse avec récapitulatif et demande de confirmation.`;

    try {
      const aiResponse = isDevelopment
        ? await processUserMessageWithMistral(fullPrompt, {
            previousMessages: conversationContextForMistral,
            currentInvestment: undefined
          })
        : await processUserMessage(fullPrompt, {
            previousMessages: conversationContextForOpenAI,
            currentInvestment: undefined
          });

      // Extraire le JSON de la réponse
      let jsonMatch = aiResponse.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        jsonMatch = aiResponse.response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch = [jsonMatch[1]];
        }
      }

      if (jsonMatch && jsonMatch[0]) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            response: parsed.response || aiResponse.response,
            extractedData: parsed.extractedData || {},
            isComplete: parsed.isComplete || false,
            missingFields: parsed.missingFields || [],
            summary: parsed.summary || ''
          };
        } catch (parseError) {
          console.warn('Erreur lors du parsing JSON:', parseError);
        }
      }

      // Fallback si pas de JSON valide
      return {
        response: aiResponse.response,
        extractedData: {},
        isComplete: false,
        missingFields: ['purchasePrice'],
        summary: 'Analyse en cours...'
      };
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      throw error;
    }
  };

  // Fonction pour créer le bien à partir des données extraites
  const createPropertyFromData = async (data: ExtractedData): Promise<Investment> => {
    const price = data.purchasePrice || 0;
    
    // Calculer la date de début (3 mois après aujourd'hui par défaut)
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() + 3);
    const projectStartDate = data.projectStartDate || defaultStartDate.toISOString().split('T')[0];
    
    // Valeurs par défaut
    const charges = data.charges || Math.round(price * 0.01);
    const propertyTax = data.propertyTax || Math.round(price * 0.0075);
    const isNewProperty = data.propertyType === 'new';
    const isFurnished = data.rentalType === 'furnished';
    const rent = data.rent || Math.round(price * 0.0075);

    // Calculs des frais
    const agencyFees = price * 0.04;
    const notaryFees = price * (isNewProperty ? 0.025 : 0.075);
    const bankFees = 1000;
    const bankGuaranteeFees = price * 0.01;
    const renovationCosts = price * 0.05;
    
    const totalCost = price + agencyFees + notaryFees + bankFees + bankGuaranteeFees + renovationCosts;
    const downPayment = totalCost * 0.1;
    const loanAmount = totalCost - downPayment;
    
    const endDate = new Date(projectStartDate);
    endDate.setFullYear(endDate.getFullYear() + 20);
    
    const tenantChargesValue = charges / 2;
    const rentValueAnnual = rent * 12;
    const furnishedRentValue = isFurnished ? rentValueAnnual : rentValueAnnual * 1.1;
    const unfurnishedRentValue = isFurnished ? rentValueAnnual / 1.1 : rentValueAnnual;
    
    const propertyInsuranceValue = price * 0.002;
    const repairsValue = price * 0.004;
    const unpaidRentInsuranceValue = unfurnishedRentValue * 0.04;
    
    const currentYear = new Date().getFullYear();
    const startYear = new Date(projectStartDate).getFullYear();
    const endYear = endDate.getFullYear();
    const referenceYear = currentYear >= startYear && currentYear <= endYear ? currentYear : startYear;
    
    const calculateProjectedValue = (baseValue: number, increaseRate: number, yearsAhead: number) => {
      return Number(baseValue) * Math.pow(1 + (Number(increaseRate) || 0) / 100, yearsAhead);
    };
    
    const calculateHistoricalValue = (baseValue: number, increaseRate: number, yearsBack: number) => {
      return Number(baseValue) / Math.pow(1 + (Number(increaseRate) || 0) / 100, yearsBack);
    };
    
    const baseYearValues = {
      propertyTax,
      condoFees: charges,
      propertyInsurance: propertyInsuranceValue,
      managementFees: 0,
      unpaidRentInsurance: unpaidRentInsuranceValue,
      repairs: repairsValue,
      otherDeductible: 0,
      otherNonDeductible: 0,
      rent: unfurnishedRentValue,
      furnishedRent: furnishedRentValue,
      tenantCharges: tenantChargesValue,
      taxBenefit: 0
    };
    
    const projectionRates = {
      propertyTaxIncrease: 2,
      condoFeesIncrease: 2,
      propertyInsuranceIncrease: 1,
      managementFeesIncrease: 1,
      unpaidRentInsuranceIncrease: 1,
      repairsIncrease: 2,
      otherDeductibleIncrease: 1,
      otherNonDeductibleIncrease: 1,
      rentIncrease: 2,
      furnishedRentIncrease: 2,
      tenantChargesIncrease: 2,
      taxBenefitIncrease: 1
    };
    
    const expenses: YearlyExpenses[] = [];
    
    // Créer un objet temporaire pour calculer les valeurs du prêt avec les fonctions utilitaires
    // Ces fonctions calculent déjà les valeurs annualisées correctement
    const tempInvestmentForLoan: Partial<Investment> = {
      loanAmount,
      interestRate: 3,
      loanDuration: 20,
      deferralType: 'none',
      deferredPeriod: 0,
      startDate: projectStartDate,
      projectStartDate,
      projectEndDate: endDate.toISOString().split('T')[0],
      insuranceRate: 0.25
    };
    
    for (let year = startYear; year < referenceYear; year++) {
      const yearsBack = referenceYear - year;
      const loanInfo = getLoanInfoForYear(tempInvestmentForLoan as Investment, year);
      const yearlyInterests = getInterestForYear(tempInvestmentForLoan as Investment, year);
      
      expenses.push({
        year,
        propertyTax: calculateHistoricalValue(baseYearValues.propertyTax, projectionRates.propertyTaxIncrease, yearsBack),
        condoFees: calculateHistoricalValue(baseYearValues.condoFees, projectionRates.condoFeesIncrease, yearsBack),
        propertyInsurance: calculateHistoricalValue(baseYearValues.propertyInsurance, projectionRates.propertyInsuranceIncrease, yearsBack),
        managementFees: calculateHistoricalValue(baseYearValues.managementFees, projectionRates.managementFeesIncrease, yearsBack),
        unpaidRentInsurance: calculateHistoricalValue(baseYearValues.unpaidRentInsurance, projectionRates.unpaidRentInsuranceIncrease, yearsBack),
        repairs: calculateHistoricalValue(baseYearValues.repairs, projectionRates.repairsIncrease, yearsBack),
        otherDeductible: calculateHistoricalValue(baseYearValues.otherDeductible, projectionRates.otherDeductibleIncrease, yearsBack),
        otherNonDeductible: calculateHistoricalValue(baseYearValues.otherNonDeductible, projectionRates.otherNonDeductibleIncrease, yearsBack),
        rent: calculateHistoricalValue(baseYearValues.rent, projectionRates.rentIncrease, yearsBack),
        furnishedRent: calculateHistoricalValue(baseYearValues.furnishedRent, projectionRates.furnishedRentIncrease, yearsBack),
        tenantCharges: calculateHistoricalValue(baseYearValues.tenantCharges, projectionRates.tenantChargesIncrease, yearsBack),
        taxBenefit: calculateHistoricalValue(baseYearValues.taxBenefit, projectionRates.taxBenefitIncrease, yearsBack),
        loanPayment: loanInfo.payment,
        loanInsurance: loanInfo.insurance,
        interest: yearlyInterests,
        tax: 0,
        deficit: 0
      });
    }
    
    // Année de référence
    const loanInfoRef = getLoanInfoForYear(tempInvestmentForLoan as Investment, referenceYear);
    const yearlyInterestsRef = getInterestForYear(tempInvestmentForLoan as Investment, referenceYear);
    expenses.push({
      year: referenceYear,
      ...baseYearValues,
      loanPayment: loanInfoRef.payment,
      loanInsurance: loanInfoRef.insurance,
      interest: yearlyInterestsRef,
      tax: 0,
      deficit: 0
    });
    
    for (let year = referenceYear + 1; year <= endYear; year++) {
      const yearsAhead = year - referenceYear;
      const loanInfo = getLoanInfoForYear(tempInvestmentForLoan as Investment, year);
      const yearlyInterests = getInterestForYear(tempInvestmentForLoan as Investment, year);
      
      expenses.push({
        year,
        propertyTax: calculateProjectedValue(baseYearValues.propertyTax, projectionRates.propertyTaxIncrease, yearsAhead),
        condoFees: calculateProjectedValue(baseYearValues.condoFees, projectionRates.condoFeesIncrease, yearsAhead),
        propertyInsurance: calculateProjectedValue(baseYearValues.propertyInsurance, projectionRates.propertyInsuranceIncrease, yearsAhead),
        managementFees: calculateProjectedValue(baseYearValues.managementFees, projectionRates.managementFeesIncrease, yearsAhead),
        unpaidRentInsurance: calculateProjectedValue(baseYearValues.unpaidRentInsurance, projectionRates.unpaidRentInsuranceIncrease, yearsAhead),
        repairs: calculateProjectedValue(baseYearValues.repairs, projectionRates.repairsIncrease, yearsAhead),
        otherDeductible: calculateProjectedValue(baseYearValues.otherDeductible, projectionRates.otherDeductibleIncrease, yearsAhead),
        otherNonDeductible: calculateProjectedValue(baseYearValues.otherNonDeductible, projectionRates.otherNonDeductibleIncrease, yearsAhead),
        rent: calculateProjectedValue(baseYearValues.rent, projectionRates.rentIncrease, yearsAhead),
        furnishedRent: calculateProjectedValue(baseYearValues.furnishedRent, projectionRates.furnishedRentIncrease, yearsAhead),
        tenantCharges: calculateProjectedValue(baseYearValues.tenantCharges, projectionRates.tenantChargesIncrease, yearsAhead),
        taxBenefit: calculateProjectedValue(baseYearValues.taxBenefit, projectionRates.taxBenefitIncrease, yearsAhead),
        loanPayment: loanInfo.payment,
        loanInsurance: loanInfo.insurance,
        interest: yearlyInterests,
        tax: 0,
        deficit: 0
      });
    }

    // Générer le nom et la description via l'IA
    const nameAndDescription = await generateNameAndDescription(data);
    
    // Générer l'amortizationSchedule pour l'investment
    const amortizationSchedule = generateAmortizationSchedule(
      loanAmount,
      3,
      20,
      'none',
      0,
      projectStartDate
    );
    
    const investment: Investment = {
      id: '',
      name: nameAndDescription.name || `Bien ${Math.round(price / 1000)}k€`,
      description: nameAndDescription.description || 'Bien immobilier locatif',
      propertyType: isNewProperty ? 'new' : 'old',
      monthlyPayment: (loanAmount * (0.03/12) * Math.pow(1 + 0.03/12, 240)) / (Math.pow(1 + 0.03/12, 240) - 1),
      monthlyCashFlow: 0,
      cashFlowYears: [],
      grossYield: 0,
      netYield: 0,
      cashOnCashReturn: 0,
      maintenanceProvision: price * 0.01,
      projectStartDate,
      projectEndDate: endDate.toISOString().split('T')[0],
      purchasePrice: price,
      agencyFees,
      notaryFees,
      bankFees,
      bankGuaranteeFees,
      mandatoryDiagnostics: 0,
      renovationCosts,
      startDate: projectStartDate,
      hasDeferral: false,
      deferralType: 'none',
      deferredPeriod: 0,
      deferredInterest: 0,
      downPayment,
      loanAmount,
      loanDuration: 20,
      interestRate: 3,
      insuranceRate: 0.25,
      propertyTax: 0,
      condoFees: 0,
      propertyInsurance: propertyInsuranceValue,
      managementFees: 0,
      unpaidRentInsurance: unpaidRentInsuranceValue,
      expenses: expenses.sort((a, b) => a.year - b.year),
      expenseProjection: {
        propertyTaxIncrease: projectionRates.propertyTaxIncrease,
        condoFeesIncrease: projectionRates.condoFeesIncrease,
        propertyInsuranceIncrease: projectionRates.propertyInsuranceIncrease,
        managementFeesIncrease: projectionRates.managementFeesIncrease,
        unpaidRentInsuranceIncrease: projectionRates.unpaidRentInsuranceIncrease,
        repairsIncrease: projectionRates.repairsIncrease,
        otherDeductibleIncrease: projectionRates.otherDeductibleIncrease,
        otherNonDeductibleIncrease: projectionRates.otherNonDeductibleIncrease,
        rentIncrease: projectionRates.rentIncrease,
        furnishedRentIncrease: projectionRates.furnishedRentIncrease,
        tenantChargesIncrease: projectionRates.tenantChargesIncrease,
        taxBenefitIncrease: projectionRates.taxBenefitIncrease,
        vacancyRate: 3,
        baseYear: baseYearValues
      },
      saleDate: '',
      appreciationType: 'global',
      appreciationValue: 0,
      saleAgencyFees: 0,
      improvementWorks: 0,
      isLMP: false,
      accumulatedDepreciation: 0,
      monthlyRent: 0,
      annualRentIncrease: 0,
      occupancyRate: 100,
      rentalStartDate: projectStartDate,
      remainingBalance: 0,
      taxType: 'direct',
      taxationMethod: 'real',
      taxRate: 30,
      manualDeficit: 0,
      selectedRegime: 'micro-foncier',
      taxRegime: 'micro-foncier',
      taxResults: {
        'micro-foncier': {
          regime: 'micro-foncier',
          taxableIncome: 0,
          tax: 0,
          socialCharges: 0,
          totalTax: 0,
          netIncome: 0
        },
        'reel-foncier': {
          regime: 'reel-foncier',
          taxableIncome: 0,
          tax: 0,
          socialCharges: 0,
          totalTax: 0,
          netIncome: 0
        },
        'micro-bic': {
          regime: 'micro-bic',
          taxableIncome: 0,
          tax: 0,
          socialCharges: 0,
          totalTax: 0,
          netIncome: 0
        },
        'reel-bic': {
          regime: 'reel-bic',
          taxableIncome: 0,
          tax: 0,
          socialCharges: 0,
          totalTax: 0,
          netIncome: 0
        }
      },
      taxParameters: {
        taxRate: 30,
        socialChargesRate: 17.2,
        buildingValue: price * 0.8,
        buildingAmortizationYears: 25,
        furnitureValue: price * 0.1,
        furnitureAmortizationYears: 5,
        worksValue: renovationCosts,
        worksAmortizationYears: 10,
        otherValue: 0,
        otherAmortizationYears: 5,
        previousDeficit: 0,
        deficitLimit: 10700,
        rent: 0,
        furnishedRent: 0,
        tenantCharges: 0,
        taxBenefit: 0
      },
      amortizationSchedule: amortizationSchedule.schedule
    };

    return investment;
  };

  // Fonction pour générer le nom et la description via l'IA
  const generateNameAndDescription = async (data: ExtractedData): Promise<{ name: string; description: string }> => {
    try {
      const prompt = `Génère un nom et une description pour un bien immobilier avec les caractéristiques suivantes:
- Prix d'achat: ${data.purchasePrice?.toLocaleString('fr-FR') || 'non spécifié'}€
- Type: ${data.propertyType === 'new' ? 'neuf' : 'ancien'}
- Type de location: ${data.rentalType === 'furnished' ? 'meublé' : 'non meublé'}
- Loyer: ${data.rent ? data.rent.toLocaleString('fr-FR') + '€/mois' : 'non spécifié'}
- Taxe foncière: ${data.propertyTax ? data.propertyTax.toLocaleString('fr-FR') + '€/an' : 'non spécifiée'}
- Charges: ${data.charges ? data.charges.toLocaleString('fr-FR') + '€/an' : 'non spécifiées'}

Réponds UNIQUEMENT avec un JSON valide au format suivant, sans texte avant ou après:
{
  "name": "Nom du bien (court et descriptif, maximum 50 caractères)",
  "description": "Description détaillée du bien en 2-3 phrases"
}`;

      const aiResponse = isDevelopment
        ? await processUserMessageWithMistral(prompt, {
            previousMessages: [],
            currentInvestment: undefined
          })
        : await processUserMessage(prompt, {
            previousMessages: [],
            currentInvestment: undefined
          });

      let jsonMatch = aiResponse.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        jsonMatch = aiResponse.response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch = [jsonMatch[1]];
        }
      }

      if (jsonMatch && jsonMatch[0]) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            name: (parsed.name || `Bien ${Math.round((data.purchasePrice || 0) / 1000)}k€`).substring(0, 50),
            description: (parsed.description || 'Bien immobilier locatif').substring(0, 500)
          };
        } catch (parseError) {
          console.warn('Erreur lors du parsing JSON:', parseError);
        }
      }

      return {
        name: `Bien ${Math.round((data.purchasePrice || 0) / 1000)}k€`,
        description: 'Bien immobilier locatif'
      };
    } catch (error) {
      console.error('Erreur lors de la génération du nom et de la description:', error);
      return {
        name: `Bien ${Math.round((data.purchasePrice || 0) / 1000)}k€`,
        description: 'Bien immobilier locatif'
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping || isCreating) return;

    const userMessage = inputValue.trim();
    const lowerMessage = userMessage.toLowerCase();

    // Vérifier si l'utilisateur veut annuler
    if (lowerMessage.includes('annuler') || lowerMessage.includes('cancel')) {
      addMessage('assistant', "Création annulée. À bientôt !");
      setTimeout(() => onClose(), 1000);
      return;
    }

    // Vérifier si l'utilisateur confirme la création
    const wantsToCreate = lowerMessage.includes('créer') || 
                         lowerMessage.includes('cree') ||
                         lowerMessage.includes('valider') ||
                         lowerMessage.includes('confirmer') ||
                         lowerMessage.includes('oui') ||
                         lowerMessage.includes('ok') ||
                         lowerMessage.includes('go');

    // Ajouter le message de l'utilisateur
    addMessage('user', userMessage);
    setInputValue('');
    setIsTyping(true);

    try {
      // Si l'utilisateur confirme la création et qu'on a le prix d'achat
      if (wantsToCreate && extractedData.purchasePrice) {
        setIsCreating(true);
        addMessage('assistant', "Parfait ! Je vais maintenant créer votre bien avec les informations collectées. Les valeurs manquantes seront complétées par défaut. Cela peut prendre quelques secondes...");
        
        const investment = await createPropertyFromData(extractedData);
        
        addMessage('assistant', `Excellent ! Le bien "${investment.name}" a été créé avec succès. Redirection vers la page du bien...`);
        
        setTimeout(() => {
          onSave(investment);
          onClose();
        }, 1500);
        return;
      }

      // Sinon, analyser le message de l'utilisateur
      const analysis = await analyzeUserInput(userMessage, messages, extractedData);
      
      // Mettre à jour les données extraites (fusionner avec les données existantes)
      const updatedData = { ...extractedData, ...analysis.extractedData };
      setExtractedData(updatedData);

      // Construire la réponse avec récapitulatif
      let responseText = analysis.response;
      
      // Ajouter le récapitulatif si disponible
      if (analysis.summary) {
        responseText = `${analysis.summary}\n\n${responseText}`;
      } else {
        // Construire un récapitulatif manuel si l'IA ne l'a pas fourni
        const summaryParts: string[] = [];
        summaryParts.push('**📋 Récapitulatif de ce que j\'ai compris :**\n');
        
        if (updatedData.purchasePrice) {
          summaryParts.push(`✅ Prix d'achat : ${updatedData.purchasePrice.toLocaleString('fr-FR')}€`);
        }
        if (updatedData.projectStartDate) {
          summaryParts.push(`✅ Date de début : ${new Date(updatedData.projectStartDate).toLocaleDateString('fr-FR')}`);
        }
        if (updatedData.charges) {
          summaryParts.push(`✅ Charges : ${updatedData.charges.toLocaleString('fr-FR')}€/an`);
        }
        if (updatedData.propertyTax) {
          summaryParts.push(`✅ Taxe foncière : ${updatedData.propertyTax.toLocaleString('fr-FR')}€/an`);
        }
        if (updatedData.propertyType) {
          summaryParts.push(`✅ Type de bien : ${updatedData.propertyType === 'new' ? 'Neuf' : 'Ancien'}`);
        }
        if (updatedData.rentalType) {
          summaryParts.push(`✅ Type de location : ${updatedData.rentalType === 'furnished' ? 'Meublé' : 'Non meublé'}`);
        }
        if (updatedData.rent) {
          summaryParts.push(`✅ Loyer mensuel : ${updatedData.rent.toLocaleString('fr-FR')}€/mois`);
        }
        
        if (summaryParts.length > 1) {
          responseText = `${summaryParts.join('\n')}\n\n${responseText}`;
        }
      }

      // Ajouter les informations manquantes si nécessaire
      if (analysis.missingFields.length > 0 && !updatedData.purchasePrice) {
        responseText += `\n\n**⚠️ Informations manquantes :**\n`;
        if (!updatedData.purchasePrice) {
          responseText += `- Prix d'achat (obligatoire)\n`;
        }
        analysis.missingFields.forEach(field => {
          if (field !== 'purchasePrice') {
            responseText += `- ${field}\n`;
          }
        });
      }

      // Demander confirmation si on a le prix d'achat
      if (updatedData.purchasePrice && !wantsToCreate) {
        responseText += `\n\n**❓ Que souhaitez-vous faire ?**\n`;
        responseText += `- Répondez "créer" ou "valider" pour créer le bien maintenant (les valeurs manquantes seront complétées par défaut)\n`;
        responseText += `- Ou continuez à me donner des informations pour compléter les détails`;
      }

      // Ajouter la réponse de l'IA
      addMessage('assistant', responseText);

    } catch (error) {
      console.error('Erreur lors du traitement:', error);
      addMessage('assistant', "Une erreur s'est produite lors du traitement de votre message. Veuillez réessayer.");
    } finally {
      setIsTyping(false);
      setIsCreating(false);
    }
  };

  const addMessage = (type: 'user' | 'assistant', content: string) => {
    const message: Message = {
      id: `msg-${Date.now()}-${messageIdCounter.current++}`,
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  // Fonction pour rendre le markdown basique (gras)
  const renderMarkdown = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    const regex = /\*\*(.*?)\*\*/g;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      // Ajouter le texte avant le match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Ajouter le texte en gras
      parts.push(
        <strong key={key++}>{match[1]}</strong>
      );
      lastIndex = regex.lastIndex;
    }

    // Ajouter le reste du texte
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[800px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg">Création de bien via chatbot</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-lg whitespace-pre-wrap ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {renderMarkdown(message.content)}
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          {isCreating && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                Création du bien en cours...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2 items-center">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Décrivez votre projet immobilier..."
              className="flex-1 p-2 border rounded-lg resize-none"
              rows={2}
              disabled={isTyping || isCreating}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping || isCreating}
              className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyCreationChatbot;
