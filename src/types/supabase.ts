export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          name: string
          user_id: string
          created_at: string
          investment_data: Json
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string
          investment_data: Json
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string
          investment_data?: Json
        }
      }
      scis: {
        Row: {
          id: string
          name: string
          user_id: string
          created_at: string
          updated_at?: string
          siret?: string
          date_creation: string
          forme_juridique: string
          capital: number
          tax_parameters: Json
          property_ids: string[]
          consolidated_tax_results: Json
          description?: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string
          updated_at?: string
          siret?: string
          date_creation: string
          forme_juridique?: string
          capital?: number
          tax_parameters?: Json
          property_ids?: string[]
          consolidated_tax_results?: Json
          description?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          siret?: string
          date_creation?: string
          forme_juridique?: string
          capital?: number
          tax_parameters?: Json
          property_ids?: string[]
          consolidated_tax_results?: Json
          description?: string
        }
      }
    }
  }
}