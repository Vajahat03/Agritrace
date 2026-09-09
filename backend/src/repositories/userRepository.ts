import { supabaseAdmin, getAuthenticatedClient } from '../config/supabase';
import { UserProfile, UserRole } from '../types';

export class UserRepository {
  static async findById(id: string, token?: string): Promise<UserProfile | null> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  static async upsert(profile: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateLanguage(id: string, languagePreference: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ language_preference: languagePreference, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }
}
