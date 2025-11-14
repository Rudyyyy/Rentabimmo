# Ajout du badge SCI dans l'en-tête du bien

## Problème identifié

L'utilisateur ne voyait pas clairement si un bien était en SCI ou non, ce qui rendait difficile de vérifier si la vue de rentabilité SCI était correctement activée.

## Solution implémentée

### 1. Badge visuel dans l'en-tête

Un badge bleu a été ajouté à côté du nom du bien dans l'en-tête de la page, affichant :
- Une icône de bâtiment (Building2)
- Le texte "SCI [Nom de la SCI]"

**Apparence** :
```
┌────────────────────────────────────────────┐
│ 🏠 80m² Épinay neuf  [🏢 SCI Ma Société]  │
│    Du 14/11/2025 au 14/11/2045             │
└────────────────────────────────────────────┘
```

### 2. Chargement automatique des informations SCI

Le système charge automatiquement le nom de la SCI via l'API `getSCIById()` dès que le bien est chargé.

### 3. Logs de debugging

Des logs ont été ajoutés pour faciliter le diagnostic :
- `🏢 sciId trouvé:` lors du chargement du bien
- `🏢 Chargement de la SCI avec ID:` lors du chargement de la SCI
- `✅ SCI chargée:` quand la SCI est trouvée
- `📄 Bien en nom propre (pas de sciId)` pour les biens hors SCI

## Modifications apportées

### Fichier : `src/pages/PropertyForm.tsx`

#### 1. Imports ajoutés

```typescript
import { Building2 } from 'lucide-react';
import { SCI } from '../types/sci';
import { getSCIById } from '../lib/api';
```

#### 2. État ajouté

```typescript
const [sciInfo, setSciInfo] = useState<SCI | null>(null);
```

#### 3. Effect pour charger la SCI

```typescript
useEffect(() => {
  async function loadSCI() {
    if (investmentData.sciId) {
      console.log('🏢 Chargement de la SCI avec ID:', investmentData.sciId);
      const sci = await getSCIById(investmentData.sciId);
      if (sci) {
        console.log('✅ SCI chargée:', sci.name);
        setSciInfo(sci);
      } else {
        console.log('❌ SCI non trouvée');
        setSciInfo(null);
      }
    } else {
      console.log('📄 Bien en nom propre (pas de sciId)');
      setSciInfo(null);
    }
  }
  loadSCI();
}, [investmentData.sciId]);
```

#### 4. Badge dans le JSX

```tsx
{/* Badge SCI */}
{sciInfo && (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
    <Building2 className="h-3.5 w-3.5" />
    SCI {sciInfo.name}
  </span>
)}
```

#### 5. Log ajouté dans loadProperty

```typescript
console.log('🏢 sciId trouvé:', loadedInvestmentData.sciId || 'AUCUN (bien en nom propre)');
```

## Comment utiliser

### Pour vérifier si un bien est en SCI

1. **Visuellement** : Le badge bleu "SCI [Nom]" apparaît à côté du nom du bien
2. **Dans la console** : Les logs indiquent clairement si un sciId est présent

### Pour débuguer un problème

Si la vue de rentabilité SCI ne s'affiche pas :

1. Ouvrir la console du navigateur (F12)
2. Chercher les logs :
   - `🏢 sciId trouvé:` → Devrait afficher l'ID de la SCI
   - `🏢 Chargement de la SCI avec ID:` → Devrait montrer qu'on charge la SCI
   - `✅ SCI chargée:` → Devrait afficher le nom de la SCI
3. Vérifier que le badge s'affiche dans l'en-tête

**Si le badge n'apparaît pas** :
- Le bien n'est peut-être pas rattaché à une SCI dans la base de données
- Le `sciId` n'est pas défini dans les données du bien
- La SCI n'existe plus ou a été supprimée

## Style du badge

Le badge utilise les classes Tailwind suivantes :
- `bg-blue-100` : Fond bleu clair
- `text-blue-800` : Texte bleu foncé
- `border-blue-200` : Bordure bleue
- `rounded-full` : Coins arrondis complets
- `px-3 py-1` : Padding adapté
- `text-xs font-medium` : Texte petit et semi-gras

Le badge s'adapte automatiquement à la taille de l'écran grâce à `flex-wrap` sur le conteneur parent.

## Résultat

Maintenant, l'utilisateur peut **immédiatement voir** :
- ✅ Si le bien est en SCI (badge bleu visible)
- ✅ Le nom de la SCI
- ✅ Quelle vue de rentabilité devrait être affichée

Cela facilite grandement le debugging et améliore l'expérience utilisateur.

## Exemples

### Bien en SCI
```
┌──────────────────────────────────────────────────┐
│ 🏠 Appartement Paris 15  [🏢 SCI Patrimoine]    │
│    Du 01/01/2024 au 31/12/2048                   │
└──────────────────────────────────────────────────┘
```

### Bien en nom propre
```
┌──────────────────────────────────────────────────┐
│ 🏠 Appartement Paris 15                          │
│    Du 01/01/2024 au 31/12/2048                   │
└──────────────────────────────────────────────────┘
```

## Prochaines étapes

Si l'utilisateur ne voit toujours pas la vue SCI :
1. Vérifier dans la console que le badge apparaît
2. Vérifier que `investmentData.sciId` est bien défini
3. Aller dans l'onglet "Acquisition" et vérifier le sélecteur de SCI
4. Si nécessaire, resélectionner la SCI et sauvegarder

