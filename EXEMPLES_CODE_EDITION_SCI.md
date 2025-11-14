# Exemples de code - Édition des SCI

## 📝 Snippets de code utiles

### 1. Création d'une SCI avec frais de fonctionnement

```typescript
import { createSCI } from './lib/api';

// Exemple de création d'une SCI complète
const newSCI = await createSCI(userId, {
  name: 'Ma SCI Familiale',
  siret: '12345678901234',
  dateCreation: '2023-01-01',
  formeJuridique: 'SCI',
  capital: 1000,
  description: 'SCI familiale pour investissement locatif',
  
  taxParameters: {
    // Taux IS
    standardRate: 25,
    reducedRate: 15,
    reducedRateThreshold: 42500,
    
    // Amortissements
    buildingAmortizationYears: 25,
    furnitureAmortizationYears: 10,
    worksAmortizationYears: 10,
    
    // ⭐ Frais de fonctionnement (NOUVEAUTÉ)
    accountingFees: 1200,      // Honoraires comptable
    legalFees: 300,            // Frais juridiques
    bankFees: 120,             // Frais bancaires
    insuranceFees: 250,        // Assurances
    otherExpenses: 200,        // Autres frais
    
    // Total calculé automatiquement
    operatingExpenses: 1200 + 300 + 120 + 250 + 200, // = 2070
    
    // Autres paramètres
    previousDeficits: 0,
    advancePaymentRate: 0,
    rentalType: 'unfurnished'
  },
  
  propertyIds: [],
  consolidatedTaxResults: {}
});
```

### 2. Mise à jour des frais d'une SCI existante

```typescript
import { updateSCI, getSCIById } from './lib/api';

// Récupérer la SCI actuelle
const sci = await getSCIById('sci-uuid-1234');

if (sci) {
  // Mettre à jour uniquement les frais
  const success = await updateSCI(sci.id, {
    taxParameters: {
      ...sci.taxParameters,
      accountingFees: 1500,  // Augmentation de 1200 à 1500
      operatingExpenses: 1500 + 300 + 120 + 250 + 200 // = 2370
    }
  });
  
  console.log(success ? '✅ Frais mis à jour' : '❌ Erreur');
}
```

### 3. Composant React - Bouton d'édition

```tsx
// Dans Dashboard.tsx
import { Settings } from 'lucide-react';

// Bouton d'édition avec animation au survol
<button
  onClick={() => handleEditSCI(sci)}
  className="p-1.5 rounded-full hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
  title="Modifier la SCI"
>
  <Settings className="h-4 w-4 text-blue-600" />
</button>
```

### 4. Formulaire - Section frais de fonctionnement

```tsx
// Dans SCIForm.tsx
const [accountingFees, setAccountingFees] = useState(
  initialData?.taxParameters.accountingFees || 0
);
const [legalFees, setLegalFees] = useState(
  initialData?.taxParameters.legalFees || 0
);
const [bankFees, setBankFees] = useState(
  initialData?.taxParameters.bankFees || 0
);
const [insuranceFees, setInsuranceFees] = useState(
  initialData?.taxParameters.insuranceFees || 0
);
const [otherExpenses, setOtherExpenses] = useState(
  initialData?.taxParameters.otherExpenses || 0
);

// Calcul du total
const totalOperatingExpenses = 
  accountingFees + legalFees + bankFees + insuranceFees + otherExpenses;

// Dans le JSX
<div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
  <div className="flex justify-between items-center">
    <span className="text-sm font-medium text-gray-700">
      Total des frais de fonctionnement annuels :
    </span>
    <span className="text-lg font-semibold text-gray-900">
      {new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        maximumFractionDigits: 0
      }).format(totalOperatingExpenses)}
    </span>
  </div>
</div>
```

### 5. Gestion de l'état - Création vs Édition

```tsx
// Dans Dashboard.tsx
const [editingSCI, setEditingSCI] = useState<SCI | null>(null);

// Handler pour ouvrir en mode édition
const handleEditSCI = (sci: SCI) => {
  setEditingSCI(sci);
  setShowSCIForm(true);
};

// Handler pour fermer la modale
const handleCloseSCIForm = () => {
  setShowSCIForm(false);
  setEditingSCI(null);  // Important : réinitialiser l'état
};

// Handler de sauvegarde (création ou mise à jour)
const handleSCISave = async (sciData: Omit<SCI, 'id' | 'user_id' | 'created_at'>) => {
  if (!user) return;
  
  try {
    if (editingSCI) {
      // Mode ÉDITION
      const success = await updateSCI(editingSCI.id, sciData);
      if (success) {
        console.log('✅ SCI mise à jour');
        await loadProperties(); // Recharger les données
        setShowSCIForm(false);
        setEditingSCI(null);
      }
    } else {
      // Mode CRÉATION
      const newSCI = await createSCI(user.id, sciData);
      if (newSCI) {
        console.log('✅ SCI créée');
        await loadProperties();
        setShowSCIForm(false);
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
    setError('Erreur lors de la sauvegarde');
  }
};
```

### 6. Types TypeScript

```typescript
// Dans src/types/sci.ts
export interface SCITaxParameters {
  // ... autres champs
  
  // Frais de fonctionnement de la SCI (annuels)
  operatingExpenses: number;     // TOTAL (calculé)
  accountingFees: number;        // Honoraires comptable
  legalFees: number;             // Frais juridiques
  bankFees: number;              // Frais bancaires
  insuranceFees: number;         // Assurances
  otherExpenses: number;         // Autres frais
  
  // ... autres champs
}

// Valeurs par défaut
export const defaultSCITaxParameters: SCITaxParameters = {
  standardRate: 25,
  reducedRate: 15,
  reducedRateThreshold: 42500,
  previousDeficits: 0,
  buildingAmortizationYears: 25,
  furnitureAmortizationYears: 10,
  worksAmortizationYears: 10,
  
  // Frais initialisés à 0
  operatingExpenses: 0,
  accountingFees: 0,
  legalFees: 0,
  bankFees: 0,
  insuranceFees: 0,
  otherExpenses: 0,
  
  advancePaymentRate: 0,
  rentalType: 'unfurnished'
};
```

### 7. Requête API - Mise à jour dans Supabase

```typescript
// Dans src/lib/api.ts
export async function updateSCI(
  sciId: string,
  sciData: Partial<Omit<SCI, 'id' | 'user_id' | 'created_at'>>
): Promise<boolean> {
  try {
    const updateData: any = {};

    // Conversion des noms de champs (camelCase → snake_case)
    if (sciData.name !== undefined) updateData.name = sciData.name;
    if (sciData.siret !== undefined) updateData.siret = sciData.siret;
    if (sciData.dateCreation !== undefined) 
      updateData.date_creation = sciData.dateCreation;
    if (sciData.capital !== undefined) updateData.capital = sciData.capital;
    
    // ⭐ Mise à jour des paramètres fiscaux (incluant les frais)
    if (sciData.taxParameters !== undefined) 
      updateData.tax_parameters = sciData.taxParameters;
    
    if (sciData.description !== undefined) 
      updateData.description = sciData.description;

    // Requête Supabase
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
```

### 8. Test unitaire - Calcul du total

```typescript
import { describe, it, expect } from 'vitest';

describe('Frais de fonctionnement SCI', () => {
  it('devrait calculer le total des frais correctement', () => {
    const accountingFees = 1200;
    const legalFees = 300;
    const bankFees = 120;
    const insuranceFees = 250;
    const otherExpenses = 200;
    
    const total = accountingFees + legalFees + bankFees + insuranceFees + otherExpenses;
    
    expect(total).toBe(2070);
  });
  
  it('devrait gérer les valeurs nulles', () => {
    const accountingFees = 1200;
    const legalFees = 0;
    const bankFees = 0;
    const insuranceFees = 0;
    const otherExpenses = 0;
    
    const total = accountingFees + legalFees + bankFees + insuranceFees + otherExpenses;
    
    expect(total).toBe(1200);
  });
});
```

### 9. Hook personnalisé - Gestion des frais

```typescript
// hooks/useSCIOperatingExpenses.ts
import { useState, useEffect } from 'react';

interface OperatingExpenses {
  accountingFees: number;
  legalFees: number;
  bankFees: number;
  insuranceFees: number;
  otherExpenses: number;
  total: number;
}

export function useSCIOperatingExpenses(initialValues?: Partial<OperatingExpenses>) {
  const [expenses, setExpenses] = useState<OperatingExpenses>({
    accountingFees: initialValues?.accountingFees || 0,
    legalFees: initialValues?.legalFees || 0,
    bankFees: initialValues?.bankFees || 0,
    insuranceFees: initialValues?.insuranceFees || 0,
    otherExpenses: initialValues?.otherExpenses || 0,
    total: 0
  });

  // Calculer le total automatiquement
  useEffect(() => {
    const total = 
      expenses.accountingFees + 
      expenses.legalFees + 
      expenses.bankFees + 
      expenses.insuranceFees + 
      expenses.otherExpenses;
    
    setExpenses(prev => ({ ...prev, total }));
  }, [
    expenses.accountingFees, 
    expenses.legalFees, 
    expenses.bankFees, 
    expenses.insuranceFees, 
    expenses.otherExpenses
  ]);

  const updateExpense = (field: keyof Omit<OperatingExpenses, 'total'>, value: number) => {
    setExpenses(prev => ({ ...prev, [field]: value }));
  };

  return { expenses, updateExpense };
}

// Utilisation dans le composant
const { expenses, updateExpense } = useSCIOperatingExpenses({
  accountingFees: initialData?.taxParameters.accountingFees,
  legalFees: initialData?.taxParameters.legalFees,
  // ... etc
});

// Dans un input
<input
  value={expenses.accountingFees}
  onChange={(e) => updateExpense('accountingFees', Number(e.target.value))}
/>

// Affichage du total
<span>{expenses.total} €</span>
```

### 10. Validation Zod

```typescript
import { z } from 'zod';

// Schema de validation pour les frais de fonctionnement
export const operatingExpensesSchema = z.object({
  accountingFees: z.number().min(0, 'Les frais comptables ne peuvent pas être négatifs'),
  legalFees: z.number().min(0, 'Les frais juridiques ne peuvent pas être négatifs'),
  bankFees: z.number().min(0, 'Les frais bancaires ne peuvent pas être négatifs'),
  insuranceFees: z.number().min(0, 'Les frais d\'assurance ne peuvent pas être négatifs'),
  otherExpenses: z.number().min(0, 'Les autres frais ne peuvent pas être négatifs')
}).refine(
  (data) => {
    const total = data.accountingFees + data.legalFees + data.bankFees + 
                  data.insuranceFees + data.otherExpenses;
    return total >= 0 && total <= 100000; // Limite raisonnable
  },
  {
    message: 'Le total des frais doit être entre 0 et 100 000 €'
  }
);

// Utilisation
try {
  const validated = operatingExpensesSchema.parse({
    accountingFees: 1200,
    legalFees: 300,
    bankFees: 120,
    insuranceFees: 250,
    otherExpenses: 200
  });
  console.log('✅ Données valides:', validated);
} catch (error) {
  console.error('❌ Erreur de validation:', error);
}
```

---

## 🎯 Patterns de code

### Pattern 1 : Séparation des responsabilités

```
Dashboard.tsx
  ├─ État et logique métier
  │  ├─ editingSCI (état)
  │  ├─ handleEditSCI (ouverture modale)
  │  ├─ handleCloseSCIForm (fermeture modale)
  │  └─ handleSCISave (sauvegarde)
  │
  └─ Interface utilisateur
     ├─ Bouton Settings (déclencheur)
     └─ Modale SCIForm (formulaire)

SCIForm.tsx
  ├─ État des champs (useState)
  ├─ Validation (handleSubmit)
  ├─ Calcul du total (expression)
  └─ Interface utilisateur (sections)

lib/api.ts
  ├─ updateSCI (API Supabase)
  ├─ createSCI (API Supabase)
  └─ Conversion des données (camelCase ↔ snake_case)
```

### Pattern 2 : Props drilling vs Context

```typescript
// ❌ Props drilling (actuel)
<Dashboard>
  <SCIForm onSave={handleSCISave} />
</Dashboard>

// ✅ Context API (si nombreux composants)
// contexts/SCIContext.tsx
const SCIContext = createContext<{
  scis: SCI[];
  editSCI: (sci: SCI) => void;
  saveSCI: (data: Omit<SCI, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
}>({} as any);

export function SCIProvider({ children }: { children: ReactNode }) {
  const [scis, setSCIs] = useState<SCI[]>([]);
  const [editingSCI, setEditingSCI] = useState<SCI | null>(null);
  
  // ... logique
  
  return (
    <SCIContext.Provider value={{ scis, editSCI, saveSCI }}>
      {children}
    </SCIContext.Provider>
  );
}

export const useSCI = () => useContext(SCIContext);
```

### Pattern 3 : Optimistic updates

```typescript
// Mise à jour optimiste (affichage immédiat)
const handleSCISave = async (sciData) => {
  if (!user || !editingSCI) return;
  
  // Sauvegarder l'état précédent
  const previousSCIs = [...scis];
  
  try {
    // Mettre à jour l'UI immédiatement (optimiste)
    setSCIs(scis.map(s => 
      s.id === editingSCI.id 
        ? { ...s, ...sciData } 
        : s
    ));
    
    // Fermer la modale
    setShowSCIForm(false);
    setEditingSCI(null);
    
    // Envoyer la requête au serveur
    const success = await updateSCI(editingSCI.id, sciData);
    
    if (!success) {
      // Rollback en cas d'erreur
      setSCIs(previousSCIs);
      setError('Erreur lors de la mise à jour');
    }
  } catch (error) {
    // Rollback en cas d'erreur
    setSCIs(previousSCIs);
    setError('Erreur lors de la mise à jour');
  }
};
```

---

## 🔧 Commandes utiles

### Compilation
```bash
npm run build
```

### Développement
```bash
npm run dev
```

### Tests
```bash
npm run test
npm run test:watch  # Mode watch
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Types
```bash
npx tsc --noEmit  # Vérifier les types sans compiler
```

---

## 📚 Ressources

- [React useState Hook](https://react.dev/reference/react/useState)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Lucide Icons](https://lucide.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

