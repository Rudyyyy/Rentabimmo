-- Migration pour créer la table des SCI (Sociétés Civiles Immobilières)
-- Cette table stocke les informations des SCI à l'IS et leurs paramètres fiscaux

-- Créer la table scis
CREATE TABLE IF NOT EXISTS scis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  siret TEXT,
  date_creation DATE NOT NULL,
  forme_juridique TEXT DEFAULT 'SCI',
  capital NUMERIC NOT NULL DEFAULT 1000,
  tax_parameters JSONB NOT NULL DEFAULT '{
    "standardRate": 25,
    "reducedRate": 15,
    "reducedRateThreshold": 42500,
    "previousDeficits": 0,
    "buildingAmortizationYears": 25,
    "furnitureAmortizationYears": 10,
    "worksAmortizationYears": 10
  }'::jsonb,
  property_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  consolidated_tax_results JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour optimiser les requêtes par user_id
CREATE INDEX IF NOT EXISTS idx_scis_user_id ON scis(user_id);

-- Index pour recherche par nom
CREATE INDEX IF NOT EXISTS idx_scis_name ON scis(name);

-- Activer Row Level Security (RLS)
ALTER TABLE scis ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Les utilisateurs peuvent voir leurs propres SCI
CREATE POLICY "Users can view their own SCIs"
  ON scis FOR SELECT
  USING (auth.uid() = user_id);

-- Politique RLS : Les utilisateurs peuvent créer leurs propres SCI
CREATE POLICY "Users can insert their own SCIs"
  ON scis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique RLS : Les utilisateurs peuvent mettre à jour leurs propres SCI
CREATE POLICY "Users can update their own SCIs"
  ON scis FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique RLS : Les utilisateurs peuvent supprimer leurs propres SCI
CREATE POLICY "Users can delete their own SCIs"
  ON scis FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_scis_updated_at
  BEFORE UPDATE ON scis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE scis IS 'Table stockant les informations des SCI (Sociétés Civiles Immobilières) à l''IS';
COMMENT ON COLUMN scis.id IS 'Identifiant unique de la SCI';
COMMENT ON COLUMN scis.user_id IS 'Référence vers l''utilisateur propriétaire de la SCI';
COMMENT ON COLUMN scis.name IS 'Nom de la SCI';
COMMENT ON COLUMN scis.siret IS 'Numéro SIRET de la SCI (optionnel)';
COMMENT ON COLUMN scis.date_creation IS 'Date de création de la SCI';
COMMENT ON COLUMN scis.capital IS 'Capital social de la SCI';
COMMENT ON COLUMN scis.tax_parameters IS 'Paramètres fiscaux de la SCI (taux IS, durées d''amortissement, etc.)';
COMMENT ON COLUMN scis.property_ids IS 'Liste des IDs des biens appartenant à cette SCI';
COMMENT ON COLUMN scis.consolidated_tax_results IS 'Résultats fiscaux consolidés par année';
COMMENT ON COLUMN scis.description IS 'Description optionnelle de la SCI';

