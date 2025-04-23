/*
  # Create properties table and setup security

  1. New Tables
    - `properties`
      - `id` (uuid, primary key)
      - `name` (text, property name)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `investment_data` (jsonb, stores all investment parameters)

  2. Security
    - Enable RLS on `properties` table
    - Add policies for authenticated users to:
      - Read their own properties
      - Create new properties
      - Update their own properties
      - Delete their own properties
*/

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  investment_data jsonb NOT NULL,
  CONSTRAINT valid_investment_data CHECK (jsonb_typeof(investment_data) = 'object')
);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own properties"
  ON properties
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create properties"
  ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
  ON properties
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
  ON properties
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);