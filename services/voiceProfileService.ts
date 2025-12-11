import { supabase, TABLES } from '../lib/supabase';
import type { VoiceProfile, VoiceProfileFormData, VoiceProfileStatus } from '../types';

// Check if we're in demo mode (no Supabase configured)
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL ||
                   import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co';

// In-memory storage for demo mode
let demoProfiles: VoiceProfile[] = [];

// Generate a simple UUID for demo mode
function generateId(): string {
  return 'demo-' + Math.random().toString(36).substring(2, 15);
}

export async function getVoiceProfiles(userId: string): Promise<VoiceProfile[]> {
  console.log('getVoiceProfiles called for user:', userId);

  if (isDemoMode) {
    console.log('Demo mode - returning demo profiles');
    return demoProfiles.filter(p => p.user_id === userId);
  }

  try {
    console.log('Fetching profiles from Supabase...');
    const { data, error } = await supabase
      .from(TABLES.VOICE_PROFILES)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('Supabase getVoiceProfiles response - data:', data);
    console.log('Supabase getVoiceProfiles response - error:', error);

    if (error) {
      console.error('Error fetching voice profiles:', error);
      throw error;
    }

    return data as VoiceProfile[];
  } catch (err) {
    console.error('Exception in getVoiceProfiles:', err);
    throw err;
  }
}

export async function getVoiceProfile(profileId: string): Promise<VoiceProfile | null> {
  if (isDemoMode) {
    return demoProfiles.find(p => p.id === profileId) || null;
  }

  const { data, error } = await supabase
    .from(TABLES.VOICE_PROFILES)
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching voice profile:', error);
    throw error;
  }

  return data as VoiceProfile;
}

export async function createVoiceProfile(
  userId: string,
  formData: VoiceProfileFormData
): Promise<VoiceProfile> {
  if (isDemoMode) {
    const now = new Date().toISOString();
    const newProfile: VoiceProfile = {
      id: generateId(),
      user_id: userId,
      ...formData,
      status: 'ready' as VoiceProfileStatus, // Auto-approve in demo mode
      total_generations: 0,
      avg_sentence_length: null,
      voice_prompt: null,
      system_prompt: null,
      average_rating: null,
      approved_at: now,
      last_used_at: null,
      created_at: now,
      updated_at: now,
    };
    demoProfiles = [newProfile, ...demoProfiles];
    return newProfile;
  }

  console.log('Creating voice profile for user:', userId);
  console.log('Form data:', JSON.stringify(formData, null, 2));

  const insertData = {
    user_id: userId,
    profile_name: formData.profile_name,
    newsletter_name: formData.newsletter_name,
    tone: formData.tone,
    formality: formData.formality,
    detail_level: formData.detail_level,
    sentence_style: formData.sentence_style,
    vocabulary_level: formData.vocabulary_level,
    common_phrases: formData.common_phrases,
    avoid_phrases: formData.avoid_phrases,
    uses_questions: formData.uses_questions,
    uses_data: formData.uses_data,
    uses_anecdotes: formData.uses_anecdotes,
    uses_metaphors: formData.uses_metaphors,
    uses_humor: formData.uses_humor,
    samples: formData.samples,
    status: 'draft' as VoiceProfileStatus,
    total_generations: 0,
  };

  console.log('Insert data:', JSON.stringify(insertData, null, 2));

  const { data, error } = await supabase
    .from(TABLES.VOICE_PROFILES)
    .insert(insertData)
    .select()
    .single();

  console.log('Supabase response - data:', data);
  console.log('Supabase response - error:', error);

  if (error) {
    console.error('Error creating voice profile:', error);
    throw error;
  }

  return data as VoiceProfile;
}

export async function updateVoiceProfile(
  profileId: string,
  updates: Partial<VoiceProfileFormData>
): Promise<VoiceProfile> {
  if (isDemoMode) {
    const index = demoProfiles.findIndex(p => p.id === profileId);
    if (index === -1) throw new Error('Profile not found');

    demoProfiles[index] = {
      ...demoProfiles[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return demoProfiles[index];
  }

  const { data, error } = await supabase
    .from(TABLES.VOICE_PROFILES)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error('Error updating voice profile:', error);
    throw error;
  }

  return data as VoiceProfile;
}

export async function deleteVoiceProfile(profileId: string): Promise<void> {
  if (isDemoMode) {
    demoProfiles = demoProfiles.filter(p => p.id !== profileId);
    return;
  }

  const { error } = await supabase
    .from(TABLES.VOICE_PROFILES)
    .delete()
    .eq('id', profileId);

  if (error) {
    console.error('Error deleting voice profile:', error);
    throw error;
  }
}

export async function updateVoiceProfileStatus(
  profileId: string,
  status: VoiceProfileStatus
): Promise<VoiceProfile> {
  if (isDemoMode) {
    const index = demoProfiles.findIndex(p => p.id === profileId);
    if (index === -1) throw new Error('Profile not found');

    demoProfiles[index] = {
      ...demoProfiles[index],
      status,
      updated_at: new Date().toISOString(),
      approved_at: status === 'approved' ? new Date().toISOString() : demoProfiles[index].approved_at,
    };
    return demoProfiles[index];
  }

  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'approved') {
    updates.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(TABLES.VOICE_PROFILES)
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error('Error updating voice profile status:', error);
    throw error;
  }

  return data as VoiceProfile;
}

// Get profiles that are ready for generation
export async function getReadyProfiles(userId: string): Promise<VoiceProfile[]> {
  if (isDemoMode) {
    return demoProfiles.filter(p =>
      p.user_id === userId &&
      (p.status === 'ready' || p.status === 'approved')
    );
  }

  const { data, error } = await supabase
    .from(TABLES.VOICE_PROFILES)
    .select('*')
    .eq('user_id', userId)
    .in('status', ['ready', 'approved'])
    .order('last_used_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching ready profiles:', error);
    throw error;
  }

  return data as VoiceProfile[];
}
