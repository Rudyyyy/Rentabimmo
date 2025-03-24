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
    }
  }
}