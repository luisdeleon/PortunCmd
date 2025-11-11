import { supabase } from '@/lib/supabase'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/supabase'

export const useSupabase = () => {
  return {
    client: supabase,
    // Helper type exports
    types: {
      Database,
      Tables,
      TablesInsert,
      TablesUpdate,
    },
  }
}

