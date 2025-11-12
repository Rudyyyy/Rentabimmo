# Documentation du TRI (Taux de Rentabilité Interne)

## Vue d'ensemble

Le **Taux de Rentabilité Interne (TRI)** est un indicateur financier clé qui mesure la performance annualisée d'un investissement immobilier. Il a été intégré dans l'application Rentab'immo pour permettre aux utilisateurs d'évaluer la rentabilité globale de leurs projets d'investissement.

## Accès à la fonctionnalité

Le TRI est accessible dans la page **Bilan**, sous-onglet **TRI** :

1. Naviguez vers un bien immobilier
2. Cliquez sur l'onglet "Bilan"
3. Sélectionnez le sous-onglet "TRI"

## Qu'est-ce que le TRI ?

Le TRI représente le taux d'actualisation qui annule la **Valeur Actuelle Nette (VAN)** de tous les flux financiers de l'investissement. En d'autres termes, c'est le taux de rendement annuel moyen qui égalise la valeur présente des recettes futures à la valeur présente des dépenses.

### Formule mathématique

Le TRI est la valeur de `r` qui satisfait l'équation :

```
VAN = Σ [CFt / (1 + r)^t] = 0
```

Où :
- `CFt` = Cash flow de l'année t
- `r` = Taux de rentabilité interne (TRI)
- `t` = Année

## Calcul du TRI dans l'application

### Flux financiers pris en compte

Le calcul du TRI intègre l'ensemble des flux financiers de l'investissement :

1. **Investissement initial (t=0)** :
   - Prix d'achat du bien
   - Frais d'agence
   - Frais de notaire
   - Frais bancaires (dossier, garantie)
   - Diagnostics obligatoires
   - Travaux de rénovation
   - **Moins** le montant du prêt (flux positif)

2. **Flux annuels (années intermédiaires)** :
   - Revenus locatifs nets après impôts (calculés selon le régime fiscal)
   - **Moins** les remboursements de prêt (capital + intérêts + assurance)
   - **Moins** les charges annuelles (taxe foncière, copropriété, etc.)

3. **Flux final (année de revente)** :
   - Solde après vente :
     - Prix de vente
     - **Moins** frais d'agence
     - **Moins** capital restant dû
     - **Moins** indemnités de remboursement anticipé
     - **Moins** impôt sur la plus-value (selon le régime fiscal)

### Méthode de calcul

L'application utilise la **méthode de Newton-Raphson** pour calculer le TRI :

```typescript
// Algorithme simplifié
function calculateIRRFromCashFlows(cashFlows: number[]): number {
  let rate = 0.1; // Estimation initiale à 10%
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, rate);
    const derivative = calculateNPVDerivative(cashFlows, rate);
    
    // Méthode de Newton-Raphson
    const newRate = rate - npv / derivative;
    
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate; // Convergence atteinte
    }
    
    rate = newRate;
  }
  
  return rate;
}
```

### Régimes fiscaux

Le TRI est calculé pour chaque régime fiscal disponible :

- **Location nue - Micro-foncier** : Abattement forfaitaire de 30%
- **Location nue - Frais réels** : Déduction des charges réelles
- **LMNP - Micro-BIC** : Abattement forfaitaire de 50%
- **LMNP - Frais réels** : Déduction des charges + amortissement

Cela permet de comparer l'impact du régime fiscal sur la rentabilité globale du projet.

## Interprétation du TRI

### Signification des valeurs

- **TRI > Taux d'emprunt** : L'investissement est généralement rentable
- **TRI = Taux d'emprunt** : L'investissement est à l'équilibre
- **TRI < Taux d'emprunt** : L'investissement peut ne pas être rentable

### Exemples

| TRI | Interprétation |
|-----|----------------|
| 8% | Excellent rendement pour un investissement immobilier |
| 5% | Bon rendement, supérieur à la plupart des placements sans risque |
| 3% | Rendement moyen, à comparer avec d'autres options d'investissement |
| 0-1% | Rendement faible, peut ne pas justifier les risques |
| < 0% | L'investissement perd de l'argent |

### Comparaison avec d'autres indicateurs

| Indicateur | Description | Complémentarité avec le TRI |
|------------|-------------|----------------------------|
| **Rentabilité brute** | (Loyer annuel / Prix d'achat) × 100 | Simple mais ne tient pas compte des charges et de la fiscalité |
| **Rentabilité nette** | (Loyer - Charges - Impôts) / Investissement | Plus précise mais ne considère pas la durée |
| **Cash-flow** | Revenus - Dépenses annuels | Mesure la trésorerie mais pas la performance globale |
| **TRI** | Taux de rendement annualisé sur toute la durée | Vue globale incluant tous les flux et la revente |

## Utilisation dans l'interface

### Graphique d'évolution

Le graphique affiche l'évolution du TRI en fonction de l'année de revente :

- **Axe X** : Année de revente potentielle
- **Axe Y** : TRI en pourcentage
- **Courbes** : Une courbe par régime fiscal sélectionné

Cela permet d'identifier l'année optimale de revente pour maximiser le TRI.

### Tableau détaillé

Le tableau présente le TRI année par année pour chaque régime fiscal :

- **Colonne Année** : Année de revente envisagée
- **Colonnes régimes** : TRI pour chaque régime fiscal
- **Codes couleur** : 
  - 🟢 Vert : TRI positif
  - 🔴 Rouge : TRI négatif

### Sélection des régimes

Utilisez les cases à cocher pour comparer uniquement les régimes qui vous intéressent :

```
☑ Location nue - Micro-foncier
☑ Location nue - Frais réels
☐ LMNP - Micro-BIC
☐ LMNP - Frais réels
```

## Limites et considérations

### Hypothèses du calcul

1. **Revalorisation linéaire** : Le prix de vente est calculé avec une revalorisation annuelle constante (paramétrable)
2. **Remboursement du prêt** : Utilise un calcul d'amortissement standard
3. **Fiscalité** : Basée sur les règles en vigueur au moment du calcul
4. **Taux de vacance locative** : Pris en compte dans les revenus locatifs

### Ce que le TRI ne mesure pas

- **Risque de l'investissement** : Un TRI élevé peut cacher des risques importants
- **Liquidité** : La facilité à revendre le bien
- **Évolution du marché** : Le TRI est calculé avec les données actuelles
- **Fiscalité personnelle** : L'impact de votre tranche marginale d'imposition globale

### Recommandations d'utilisation

1. **Comparez avec des benchmarks** : Comparez le TRI avec d'autres investissements (SCPI, assurance-vie, bourse)
2. **Analysez la sensibilité** : Testez différentes années de revente pour voir l'impact sur le TRI
3. **Considérez le contexte** : Un TRI de 5% peut être excellent dans un marché stable, mais insuffisant dans un marché volatil
4. **Combinez avec d'autres indicateurs** : Utilisez le TRI en complément du cash-flow, de la rentabilité nette, etc.

## Cas d'usage

### Exemple 1 : Comparaison de deux projets

**Projet A** :
- TRI = 7% (LMNP Réel)
- Cash-flow annuel = +2 000€
- Durée optimale = 15 ans

**Projet B** :
- TRI = 5% (Location nue Réel)
- Cash-flow annuel = +3 500€
- Durée optimale = 20 ans

**Analyse** : Le projet A a un meilleur TRI (7% vs 5%), mais le projet B génère plus de trésorerie (+3 500€ vs +2 000€). Le choix dépend de vos objectifs : performance globale (TRI) vs revenus réguliers (cash-flow).

### Exemple 2 : Choix du régime fiscal

Pour un même bien, les TRI selon les régimes :

- Micro-foncier : 4,2%
- Réel foncier : 5,8%
- Micro-BIC : 5,1%
- Réel BIC : 6,5% ✅ **Optimal**

**Conclusion** : Le régime LMNP Réel offre le meilleur TRI pour ce projet, grâce aux amortissements déductibles.

### Exemple 3 : Détermination de l'année optimale de revente

Évolution du TRI pour un bien en LMNP Réel :

| Année | TRI |
|-------|-----|
| 2025  | -5% |
| 2030  | 2%  |
| 2035  | 5%  |
| 2040  | 6,5% ✅ **Maximum** |
| 2045  | 6,2% |

**Analyse** : Le TRI est maximal en 2040 (après 16 ans de détention). Revendre avant ou après cette date diminue la rentabilité globale.

## Implémentation technique

### Fichiers concernés

```
src/
├── components/
│   ├── IRRDisplay.tsx           # Composant d'affichage du TRI
│   └── __tests__/
│       └── IRRDisplay.test.tsx  # Tests du composant
├── utils/
│   ├── irrCalculations.ts       # Fonctions de calcul du TRI
│   └── __tests__/
│       └── irrCalculations.test.ts  # Tests des calculs
└── components/
    └── PropertyForm.tsx         # Intégration dans la page Bilan
```

### Fonctions principales

```typescript
// Calcul du TRI pour un investissement et une année de revente
export function calculateIRR(
  investment: Investment,
  sellingYear: number,
  saleBalance: number,
  regime: TaxRegime
): number

// Calcul du TRI pour tous les régimes et toutes les années
export function calculateAllIRRs(
  investment: Investment,
  calculateBalanceFunction: (index: number, regime: TaxRegime) => number
): {
  years: number[];
  irrs: Record<TaxRegime, number[]>;
}

// Calcul du TRI à partir de flux de trésorerie
export function calculateIRRFromCashFlows(
  cashFlows: number[],
  guess?: number,
  tolerance?: number,
  maxIterations?: number
): number
```

### Tests

L'implémentation est couverte par des tests unitaires :

- **24 tests** pour `irrCalculations.ts` (100% de couverture)
- **18 tests** pour `IRRDisplay.tsx` (test du composant React)

Exécution des tests :

```bash
npm test -- irrCalculations.test.ts
npm test -- IRRDisplay.test.tsx
```

## Mises à jour futures

### Améliorations prévues

1. **Export des données** : Permettre l'export du TRI en CSV ou PDF
2. **Analyse de sensibilité** : Afficher l'impact de variations des paramètres sur le TRI
3. **Comparaison multi-biens** : Comparer le TRI de plusieurs biens simultanément
4. **Optimisation automatique** : Suggérer automatiquement l'année de revente optimale

### Contribution

Pour contribuer à l'amélioration du calcul du TRI :

1. Consultez les tests existants
2. Proposez des cas d'usage supplémentaires
3. Signalez les bugs via les issues GitHub

## Références

### Ressources financières

- [Définition du TRI - Investopedia](https://www.investopedia.com/terms/i/irr.asp)
- [Calcul du TRI - CFI](https://corporatefinanceinstitute.com/resources/knowledge/finance/internal-rate-return-irr/)
- [Fiscalité de l'immobilier en France - impots.gouv.fr](https://www.impots.gouv.fr/)

### Documentation technique

- [Méthode de Newton-Raphson - Wikipedia](https://en.wikipedia.org/wiki/Newton%27s_method)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest](https://vitest.dev/)

## Support

Pour toute question ou problème :

- **Email** : support@rentabimmo.fr
- **Issues GitHub** : [https://github.com/votre-repo/rentabimmo/issues](https://github.com/votre-repo/rentabimmo/issues)
- **Documentation** : Consultez le fichier `GUIDE_NOUVELLES_FONCTIONNALITES.md`

---

*Dernière mise à jour : 12 novembre 2024*
*Version de l'application : 1.0.0*

