import { ApiClient } from '@slate/api-client';
import { supabase } from './supabase';

const API_BASE_URL = process.env.API_URL || 'https://slate.opsapp.co';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  timeout: 30000,
  getToken: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  },
  onError: (error) => {
    console.error('API Error:', error.status, error.message);
  },
});
