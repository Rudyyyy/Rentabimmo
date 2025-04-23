import { AmortizationRow } from '../types/investment';
import * as pdfjsLib from 'pdfjs-dist';

// Assurez-vous que le worker de pdf.js est correctement configuré
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFTextItem {
  x: number;
  y: number;
  str: string;
  dir: string;
  width: number;
  height: number;
  fontName: string;
}

/**
 * Service d'extraction de tableaux d'amortissement depuis des PDF
 */
export class PDFAmortizationExtractor {
  /**
   * Extrait un tableau d'amortissement depuis un PDF
   * @param file Le fichier PDF à analyser
   * @returns Une promesse contenant le tableau d'amortissement
   */
  public async extractAmortizationTable(file: File): Promise<AmortizationRow[]> {
    try {
      // Convertir le File en ArrayBuffer pour l'extraction
      const arrayBuffer = await file.arrayBuffer();
      
      // Charger le PDF avec pdf.js
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const amortizationRows: AmortizationRow[] = [];
      
      // Traiter chaque page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extraire les éléments textuels
        const items = textContent.items.map(item => {
          // Vérifier si l'élément est un TextItem (qui contient transform)
          if ('transform' in item) {
            const transform = item.transform;
            const x = transform[4];
            const y = transform[5];
            
            return {
              x,
              y,
              str: item.str,
              dir: '',
              width: 0,
              height: 0,
              fontName: ''
            } as PDFTextItem;
          }
          
          // Pour les autres types d'éléments, retourner un objet par défaut
          return {
            x: 0,
            y: 0,
            str: '',
            dir: '',
            width: 0,
            height: 0,
            fontName: ''
          } as PDFTextItem;
        }).filter(item => item.str.trim() !== ''); // Filtrer les éléments vides
        
        // Traiter les éléments textuels pour cette page
        const pageRows = this.detectTableInPage({ content: items });
        if (pageRows.length > 0) {
          amortizationRows.push(...pageRows);
        }
      }
      
      // Post-traiter le tableau d'amortissement
      return this.postProcessAmortizationTable(amortizationRows);
    } catch (error) {
      console.error('Erreur lors de l\'extraction du PDF:', error);
      throw new Error('Impossible d\'extraire le tableau d\'amortissement du PDF');
    }
  }

  /**
   * Traite les pages extraites pour identifier et extraire le tableau d'amortissement
   * @param pages Les pages extraites du PDF
   * @returns Le tableau d'amortissement extrait
   */
  private processPages(pages: any[]): AmortizationRow[] {
    const amortizationRows: AmortizationRow[] = [];
    
    // Parcourir toutes les pages
    for (const page of pages) {
      // Essayer de détecter un tableau d'amortissement sur cette page
      const pageRows = this.detectTableInPage(page);
      if (pageRows.length > 0) {
        amortizationRows.push(...pageRows);
      }
    }
    
    return amortizationRows;
  }

  /**
   * Détecte un tableau d'amortissement sur une page
   * @param page La page à analyser
   * @returns Les lignes du tableau d'amortissement détectées
   */
  private detectTableInPage(page: any): AmortizationRow[] {
    const rows: AmortizationRow[] = [];
    
    // Récupérer tous les éléments textuels de la page
    const textItems: PDFTextItem[] = page.content;
    
    // Regrouper les éléments par ligne (par coordonnée Y)
    const lineGroups = this.groupItemsByLines(textItems);
    
    // Identifier les lignes qui pourraient être des lignes du tableau d'amortissement
    for (const lineItems of lineGroups) {
      // Essayer de convertir cette ligne en une ligne d'amortissement
      const amortizationRow = this.parseAmortizationRow(lineItems);
      if (amortizationRow) {
        rows.push(amortizationRow);
      }
    }
    
    return rows;
  }

  /**
   * Regroupe les éléments textuels par ligne
   * @param items Les éléments textuels à regrouper
   * @returns Les éléments regroupés par ligne
   */
  private groupItemsByLines(items: PDFTextItem[]): PDFTextItem[][] {
    const lineGroups: { [key: number]: PDFTextItem[] } = {};
    
    // Tolérance pour considérer des éléments sur la même ligne
    const yTolerance = 2;
    
    // Regrouper les éléments par coordonnée Y (avec tolérance)
    for (const item of items) {
      let foundGroup = false;
      
      // Chercher un groupe existant pour cette coordonnée Y
      for (const y in lineGroups) {
        if (Math.abs(parseFloat(y) - item.y) <= yTolerance) {
          lineGroups[y].push(item);
          foundGroup = true;
          break;
        }
      }
      
      // Si aucun groupe n'a été trouvé, en créer un nouveau
      if (!foundGroup) {
        lineGroups[item.y] = [item];
      }
    }
    
    // Convertir l'objet en tableau et trier les lignes par coordonnée Y
    return Object.values(lineGroups)
      .map(group => group.sort((a, b) => a.x - b.x));
  }

  /**
   * Tente de parser une ligne comme une ligne d'amortissement
   * @param lineItems Les éléments textuels d'une ligne
   * @returns Une ligne d'amortissement si la ligne correspond, null sinon
   */
  private parseAmortizationRow(lineItems: PDFTextItem[]): AmortizationRow | null {
    // Un tableau d'amortissement a généralement au moins 5-7 colonnes
    if (lineItems.length < 5) {
      return null;
    }
    
    // Récupérer le texte de chaque élément
    const texts = lineItems.map(item => item.str.trim());
    
    // Vérifier si nous avons des nombres dans la plupart des colonnes
    // C'est une heuristique simple pour détecter un tableau d'amortissement
    const hasNumbers = texts.filter(text => !isNaN(Number(text.replace(/\s/g, '').replace(',', '.')))).length > 2;
    if (!hasNumbers) {
      return null;
    }
    
    // Essayons de détecter les colonnes par leur contenu
    let monthIndex = -1;
    let dateIndex = -1;
    let paymentIndex = -1;
    let principalIndex = -1;
    let interestIndex = -1;
    let remainingBalanceIndex = -1;
    
    // Chercher les colonnes par leur position relative
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i].toLowerCase();
      const nextText = i + 1 < texts.length ? texts[i + 1].toLowerCase() : '';
      
      // Détecter des mots-clés ou des motifs spécifiques
      if (monthIndex === -1 && /n°|num[eé]ro|ech[eé]ance|mois/.test(text)) {
        monthIndex = i;
      } else if (dateIndex === -1 && /date/.test(text)) {
        dateIndex = i;
      } else if (paymentIndex === -1 && /mensualit[eé]|paiement|montant/.test(text)) {
        paymentIndex = i;
      } else if (principalIndex === -1 && /principal|capital/.test(text)) {
        principalIndex = i;
      } else if (interestIndex === -1 && /int[eé]r[eê]ts?/.test(text)) {
        interestIndex = i;
      } else if (remainingBalanceIndex === -1 && /capital.*restant|restant.*d[uû]|solde/.test(text)) {
        remainingBalanceIndex = i;
      }
    }
    
    // Si nous n'avons pas trouvé au moins la colonne du mois/numéro et une autre colonne,
    // ce n'est probablement pas une ligne d'un tableau d'amortissement
    if (monthIndex === -1 || (dateIndex === -1 && paymentIndex === -1 && principalIndex === -1 && interestIndex === -1 && remainingBalanceIndex === -1)) {
      return null;
    }
    
    // Maintenant, essayons de parser les valeurs
    let month: number = 0;
    let date: string = '';
    let monthlyPayment: number = 0;
    let principal: number = 0;
    let interest: number = 0;
    let remainingBalance: number = 0;
    let totalPaid: number = 0;
    
    try {
      // Essayer de parser le mois/numéro
      if (monthIndex !== -1 && !isNaN(Number(texts[monthIndex].replace(/\s/g, '')))) {
        month = parseInt(texts[monthIndex].replace(/\s/g, ''), 10);
      }
      
      // Essayer de parser la date
      if (dateIndex !== -1) {
        date = texts[dateIndex];
      }
      
      // Essayer de parser le paiement mensuel
      if (paymentIndex !== -1) {
        monthlyPayment = this.parseAmount(texts[paymentIndex]);
      }
      
      // Essayer de parser le principal
      if (principalIndex !== -1) {
        principal = this.parseAmount(texts[principalIndex]);
      }
      
      // Essayer de parser les intérêts
      if (interestIndex !== -1) {
        interest = this.parseAmount(texts[interestIndex]);
      }
      
      // Essayer de parser le capital restant dû
      if (remainingBalanceIndex !== -1) {
        remainingBalance = this.parseAmount(texts[remainingBalanceIndex]);
      }
      
      // Calculer le total payé jusqu'à maintenant (si possible)
      if (principal !== 0 && interest !== 0) {
        monthlyPayment = principal + interest;
      }
      
      // Si le mois et au moins une autre valeur ont été trouvés,
      // on considère que c'est une ligne valide
      if (month !== 0 && (monthlyPayment !== 0 || principal !== 0 || interest !== 0 || remainingBalance !== 0)) {
        // Retourner la ligne d'amortissement
        return {
          month,
          date,
          monthlyPayment,
          principal,
          interest,
          remainingBalance,
          totalPaid: 0, // Ce sera calculé plus tard
          isDeferred: false // Par défaut, on considère que ce n'est pas une échéance différée
        };
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse d\'une ligne:', error);
    }
    
    return null;
  }

  /**
   * Parse un montant à partir d'une chaîne de caractères
   * @param text La chaîne à parser
   * @returns Le montant parsé
   */
  private parseAmount(text: string): number {
    // Nettoyer la chaîne
    const cleaned = text
      .replace(/\s/g, '') // Supprimer les espaces
      .replace(/,/g, '.') // Remplacer les virgules par des points
      .replace(/[^0-9.-]/g, ''); // Garder uniquement les chiffres, points et signes moins
    
    // Convertir en nombre
    return parseFloat(cleaned) || 0;
  }

  /**
   * Post-traite le tableau d'amortissement pour calculer les totaux et détecter les échéances différées
   * @param rows Les lignes du tableau d'amortissement
   * @returns Les lignes post-traitées
   */
  public postProcessAmortizationTable(rows: AmortizationRow[]): AmortizationRow[] {
    // Trier les lignes par numéro de mois
    rows.sort((a, b) => a.month - b.month);
    
    let cumulativePrincipal = 0;
    let cumulativeInterest = 0;
    
    // Parcourir les lignes pour calculer les totaux et détecter les échéances différées
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Calculer les cumulatifs
      cumulativePrincipal += row.principal;
      cumulativeInterest += row.interest;
      row.totalPaid = cumulativePrincipal + cumulativeInterest;
      
      // Détecter les échéances différées (paiement du principal à 0 ou très faible)
      row.isDeferred = row.principal === 0 || row.principal < row.interest * 0.1;
    }
    
    return rows;
  }
}

export default new PDFAmortizationExtractor(); 