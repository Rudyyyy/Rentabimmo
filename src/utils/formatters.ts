export const formatCurrency = (value: number) => 
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0); 