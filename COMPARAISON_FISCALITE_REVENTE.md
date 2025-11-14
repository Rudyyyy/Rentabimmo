# Comparaison : Fiscalité de la revente (SCI vs Particuliers)

## Vue d'ensemble

Ce document compare la fiscalité de la plus-value immobilière entre :
- **Biens détenus en nom propre** (particuliers)
- **Biens détenus en SCI à l'IS**

## Règles fiscales

### Particuliers (nom propre)

#### Taux d'imposition de base
- **Impôt sur le revenu (IR)** : 19%
- **Prélèvements sociaux (PS)** : 17,2%
- **Total** : 36,2%

#### Abattements pour durée de détention

**Sur l'IR (19%)** :
- 0% : moins de 6 ans
- 6% par an : de la 6e à la 21e année
- 4% : la 22e année
- **Exonération totale** : après 22 ans

**Sur les PS (17,2%)** :
- 0% : moins de 6 ans
- 1,65% par an : de la 6e à la 21e année
- 1,6% : la 22e année
- 9% par an : de la 23e à la 30e année
- **Exonération totale** : après 30 ans

#### Calcul

```
PV imposable IR = PV brute × (1 - abattement IR)
PV imposable PS = PV brute × (1 - abattement PS)

Impôt IR = PV imposable IR × 19%
Impôt PS = PV imposable PS × 17,2%

Impôt total = Impôt IR + Impôt PS
PV nette = PV brute - Impôt total
```

### SCI à l'IS

#### Taux d'imposition
- **Impôt sur les sociétés (IS)** : 25%
- **Pas de prélèvements sociaux** au niveau de la SCI

#### Abattements
- **Aucun** : Pas d'abattement pour durée de détention

#### Calcul

```
Impôt IS = PV brute × 25%
PV nette = PV brute - Impôt IS
```

**Note** : L'IS de 25% s'applique quelle que soit la durée de détention.

## Comparaison chiffrée

### Exemple : PV brute de 50 000 €

| Durée détention | Particulier | SCI IS | Différence |
|----------------|-------------|--------|------------|
| **5 ans** | -18 100 € | -12 500 € | **+5 600 €** ✅ SCI |
| **10 ans** | -13 035 € | -12 500 € | **+535 €** ✅ SCI |
| **15 ans** | -7 970 € | -12 500 € | **-4 530 €** ❌ SCI |
| **20 ans** | -2 905 € | -12 500 € | **-9 595 €** ❌ SCI |
| **22 ans** | 0 € | -12 500 € | **-12 500 €** ❌ SCI |
| **30 ans** | 0 € | -12 500 € | **-12 500 €** ❌ SCI |

### Détail des calculs

#### Année 5 (particulier)

```
Abattement IR : 0% (moins de 6 ans)
Abattement PS : 0%

PV imposable IR : 50 000 € × 100% = 50 000 €
PV imposable PS : 50 000 € × 100% = 50 000 €

Impôt IR : 50 000 × 19% = 9 500 €
Impôt PS : 50 000 × 17,2% = 8 600 €
Impôt total : 18 100 €

PV nette : 50 000 - 18 100 = 31 900 €
```

#### Année 5 (SCI)

```
Impôt IS : 50 000 × 25% = 12 500 €
PV nette : 50 000 - 12 500 = 37 500 €

Avantage SCI : 37 500 - 31 900 = +5 600 €
```

#### Année 15 (particulier)

```
Abattement IR : 6% × (15 - 5) = 60%
Abattement PS : 1,65% × (15 - 5) = 16,5%

PV imposable IR : 50 000 × 40% = 20 000 €
PV imposable PS : 50 000 × 83,5% = 41 750 €

Impôt IR : 20 000 × 19% = 3 800 €
Impôt PS : 41 750 × 17,2% = 7 181 €
Impôt total : 10 981 € (arrondi 11 000 €)

PV nette : 50 000 - 11 000 = 39 000 €
```

#### Année 15 (SCI)

```
Impôt IS : 50 000 × 25% = 12 500 €
PV nette : 50 000 - 12 500 = 37 500 €

Désavantage SCI : 37 500 - 39 000 = -1 500 €
```

#### Année 22 (particulier)

```
Abattement IR : (6% × 16) + 4% = 100% → Exonération IR
Abattement PS : 1,65% × 16 + 1,6% = 28%

PV imposable IR : 0 €
PV imposable PS : 50 000 × 72% = 36 000 €

Impôt IR : 0 €
Impôt PS : 36 000 × 17,2% = 6 192 €
Impôt total : 6 192 €

PV nette : 50 000 - 6 192 = 43 808 €
```

#### Année 22 (SCI)

```
Impôt IS : 50 000 × 25% = 12 500 €
PV nette : 50 000 - 12 500 = 37 500 €

Désavantage SCI : 37 500 - 43 808 = -6 308 €
```

#### Année 30 (particulier)

```
Exonération totale IR et PS

Impôt total : 0 €
PV nette : 50 000 €
```

#### Année 30 (SCI)

```
Impôt IS : 50 000 × 25% = 12 500 €
PV nette : 50 000 - 12 500 = 37 500 €

Désavantage SCI : 37 500 - 50 000 = -12 500 €
```

## Graphique comparatif

```
Impôt sur PV de 50 000 €

20 000 € ┤
         │ ●────────┐ Particulier
18 000 € ┤          │
         │          │
16 000 € ┤          │
         │          │
14 000 € ┤          │
         │          ╲
12 500 € ┤═══════════●═══════════ SCI (taux fixe)
         │            ╲
10 000 € ┤             ╲
         │              ╲
 8 000 € ┤               ╲
         │                ╲
 6 000 € ┤                 ●───┐
         │                     ╲
 4 000 € ┤                      ●──┐
         │                          ╲
 2 000 € ┤                           ●───●
         │                                 
     0 € ┼─────┬─────┬─────┬─────┬─────┬─────┬──
         0     5    10    15    20    25    30  (années)
```

## Point d'équilibre

### Calcul du seuil

Pour une PV de 50 000 €, le **point d'équilibre** se situe aux alentours de **10-11 ans** de détention.

**Avant 10-11 ans** : SCI plus avantageuse (impôt fixe 25% < impôt particulier avec peu d'abattement)

**Après 10-11 ans** : Particulier plus avantageux (abattements progressifs réduisent l'impôt sous les 25%)

### Formule du point d'équilibre

Le point d'équilibre dépend de :
- La plus-value brute
- Les taux d'imposition
- Les barèmes d'abattement

Pour un investissement typique, il se situe entre **8 et 12 ans**.

## Cas particuliers

### 1. Résidence principale

**Particuliers** : Exonération totale dès la 1ère année

**SCI** : Pas d'exonération (même si c'est une résidence principale)

**Conclusion** : Résidence principale = **toujours en nom propre**

### 2. Investissement locatif court terme (< 10 ans)

**Exemple** : Achat-revente sous 5 ans

- Particulier : 36,2% d'impôt
- SCI IS : 25% d'impôt

**Conclusion** : SCI légèrement avantageuse sur le court terme

### 3. Investissement locatif long terme (> 15 ans)

**Exemple** : Conservation 20-30 ans

- Particulier : Exonération progressive jusqu'à 0%
- SCI IS : 25% constant

**Conclusion** : Nom propre beaucoup plus avantageux sur le long terme

### 4. LMNP avec amortissements

**Particuliers (réel-BIC)** : 
- Réintégration des amortissements
- Mais abattements pour durée de détention

**SCI IS** :
- Réintégration des amortissements
- Pas d'abattement

**Impact** : La réintégration augmente la PV imposable dans les deux cas, mais les abattements particuliers réduisent quand même l'impôt sur le long terme.

## Double imposition SCI

### ⚠️ Attention : Ce n'est pas fini !

L'impôt IS de 25% n'est que la **première couche d'imposition**. 

Lorsque la SCI distribue le produit de la vente aux associés, il y a une **seconde imposition** :

#### Imposition des dividendes

**Associé personne physique** :
- **PFU (Flat Tax)** : 30% (12,8% IR + 17,2% PS)
- Ou **barème progressif de l'IR** + 17,2% PS (sur option)

#### Exemple complet

```
Plus-value brute : 50 000 €

1. Impôt IS (SCI) : 50 000 × 25% = 12 500 €
   Plus-value nette SCI : 37 500 €

2. Distribution aux associés : 37 500 €

3. Impôt sur dividendes (PFU) : 37 500 × 30% = 11 250 €
   Net perçu par l'associé : 26 250 €

TOTAL impôts : 12 500 + 11 250 = 23 750 €
Taux effectif : 23 750 / 50 000 = 47,5% (!!)
```

**Comparaison finale** :
- Particulier (après 15 ans) : ~22% d'impôt
- SCI avec distribution : ~47,5% d'impôt

**Conclusion** : La SCI est **fiscalement désavantageuse** pour la revente, surtout avec distribution immédiate.

## Stratégies d'optimisation SCI

### 1. Report de la distribution

Ne pas distribuer immédiatement le produit de la vente :
- L'argent reste dans la SCI
- Pas de 2e imposition immédiate
- Réinvestissement possible

**Mais** : L'impôt sur dividendes sera dû au moment de la distribution.

### 2. Apport en compte courant

Les associés peuvent laisser l'argent en compte courant d'associé :
- Récupération progressive sans imposition
- Intérêts possibles
- Transmission facilitée

### 3. Cession de parts (au lieu du bien)

Vendre les parts de la SCI au lieu du bien :
- L'acheteur acquiert la SCI avec son bien
- Pas de PV immobilière (PV sur titres)
- Fiscalité différente

**Mais** : L'acheteur hérite de l'historique comptable de la SCI (amortissements, etc.)

## Conclusion

### Quand choisir la SCI ?

✅ **SCI avantageuse** si :
- Investissement court terme (< 10 ans)
- Patrimoine important à transmettre
- Gestion collective souhaitée
- Protection du patrimoine personnel

❌ **SCI désavantageuse** si :
- Investissement long terme (> 15 ans)
- Revente avec distribution immédiate
- Résidence principale
- Simplicité prioritaire

### Quand choisir le nom propre ?

✅ **Nom propre avantageux** si :
- Investissement long terme (> 15 ans)
- Résidence principale
- Simplicité de gestion souhaitée
- Patrimoine personnel limité

### Conseil général

> La SCI est avant tout un **outil de gestion patrimoniale et de transmission**, 
> pas un outil d'optimisation fiscale sur la plus-value de revente.
> 
> Pour la revente, le nom propre est généralement plus avantageux fiscalement, 
> surtout sur le long terme grâce aux abattements progressifs.

## Récapitulatif

| Critère | Particulier | SCI IS |
|---------|-------------|--------|
| **Taux de base** | 36,2% | 25% |
| **Abattements** | Oui (progressifs) | Non |
| **Court terme** | Désavantageux | Avantageux |
| **Long terme** | Très avantageux | Désavantageux |
| **Après 22 ans IR** | 17,2% (PS seuls) | 25% |
| **Après 30 ans** | 0% (exonération) | 25% |
| **Double imposition** | Non | Oui (si distribution) |
| **Taux effectif final** | 0-36,2% | 25-47,5% |

---

**📌 Important** : Ce document présente les principes généraux. Chaque situation est unique et nécessite une analyse personnalisée avec un expert-comptable ou un conseiller en gestion de patrimoine.

