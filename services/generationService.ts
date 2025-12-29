import { supabase, TABLES } from '../lib/supabase';
import { triggerNewsletterGeneration } from './n8nService';
import { getVoiceProfile } from './voiceProfileService';
import type {
  Generation,
  GenerationRequest,
  GenerationStatus,
  NewsletterArticle,
  GoogleDriveFile,
  ContentSource,
} from '../types';

// Check if we're in demo mode (no Supabase configured)
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL ||
                   import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co';

// In-memory storage for demo mode
let demoGenerations: Generation[] = [];

// Generate a simple UUID for demo mode
function generateId(): string {
  return 'demo-' + Math.random().toString(36).substring(2, 15);
}

// Create demo newsletters for testing
function createDemoNewsletters(contentSource: string): NewsletterArticle[] {
  const now = new Date().toISOString();
  return [
    {
      idea_number: 1,
      title: "The Hidden Strategy Behind Viral Content",
      subject_line: "Why your content isn't going viral (and how to fix it)",
      preview_text: "Most creators miss this one crucial element...",
      content: "Here's what most content creators get wrong about viral content...",
      markdown_content: "# The Hidden Strategy Behind Viral Content\n\nHere's what most content creators get wrong...\n\n## The Pattern Recognition Problem\n\nWhen analyzing hundreds of viral posts, one thing becomes clear: it's not about luck.\n\n## The Framework\n\n1. Hook within 3 seconds\n2. Deliver value immediately\n3. End with a call to action\n\n---\n\n*This is a demo newsletter generated for testing purposes.*",
      word_count: 450,
      source_type: contentSource,
      newsletter_name: "Newsletter Bytes",
      filename: "demo-newsletter-1.md",
      created_at: now,
    },
    {
      idea_number: 2,
      title: "The Compound Effect of Daily Publishing",
      subject_line: "One simple habit that 10x'd my audience",
      preview_text: "It's not about writing more, it's about writing consistently",
      content: "Let me share a story about consistency and daily publishing...",
      markdown_content: "# The Compound Effect of Daily Publishing\n\nLet me share a story about consistency...\n\n## Why Most Creators Fail\n\nThey optimize for perfection over consistency.\n\n## The Data\n\n- Daily publishers grow 3x faster\n- Consistency beats quality in the short term\n- Quality catches up over time\n\n---\n\n*This is a demo newsletter generated for testing purposes.*",
      word_count: 380,
      source_type: contentSource,
      newsletter_name: "Newsletter Bytes",
      filename: "demo-newsletter-2.md",
      created_at: now,
    },
    {
      idea_number: 3,
      title: "Why Your Newsletter Isn't Growing",
      subject_line: "The growth plateau nobody talks about",
      preview_text: "And the counterintuitive solution that works",
      content: "You've hit the wall. Here's why your newsletter isn't growing...",
      markdown_content: "# Why Your Newsletter Isn't Growing\n\nYou've hit the wall. Here's why...\n\n## The Plateau Problem\n\nEvery creator hits this point around 1,000 subscribers.\n\n## Breaking Through\n\n1. Collaborate with others at your level\n2. Focus on retention, not just acquisition\n3. Double down on what's working\n\n---\n\n*This is a demo newsletter generated for testing purposes.*",
      word_count: 520,
      source_type: contentSource,
      newsletter_name: "Newsletter Bytes",
      filename: "demo-newsletter-3.md",
      created_at: now,
    },
    {
      idea_number: 4,
      title: "The Email Subject Line Formula",
      subject_line: "Steal this subject line template",
      preview_text: "47% open rates using this simple framework",
      content: "Subject lines make or break your newsletter...",
      markdown_content: "# The Email Subject Line Formula\n\nSubject lines make or break your newsletter...\n\n## The Formula\n\n[Number] + [Benefit] + [Curiosity Gap]\n\n## Examples That Work\n\n- \"5 ways to double your open rates\"\n- \"The mistake killing your engagement\"\n- \"Why top creators use this trick\"\n\n---\n\n*This is a demo newsletter generated for testing purposes.*",
      word_count: 410,
      source_type: contentSource,
      newsletter_name: "Newsletter Bytes",
      filename: "demo-newsletter-4.md",
      created_at: now,
    },
    {
      idea_number: 5,
      title: "Monetization Myths Debunked",
      subject_line: "Stop leaving money on the table",
      preview_text: "The truth about newsletter monetization",
      content: "Let's talk about money and newsletter monetization...",
      markdown_content: "# Monetization Myths Debunked\n\nLet's talk about money...\n\n## Myth #1: You Need 10k Subscribers\n\nFalse. Quality beats quantity.\n\n## Myth #2: Ads Are the Only Way\n\nSponsored content, courses, consulting, paid tiers...\n\n## The Reality\n\nStart monetizing at 500 engaged subscribers.\n\n---\n\n*This is a demo newsletter generated for testing purposes.*",
      word_count: 490,
      source_type: contentSource,
      newsletter_name: "Newsletter Bytes",
      filename: "demo-newsletter-5.md",
      created_at: now,
    },
  ];
}

// Helper to get access token from localStorage
function getAccessTokenFromStorage(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  const storedSession = localStorage.getItem(storageKey);

  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession);
      return parsed.access_token || null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getGenerations(userId: string, limit = 20): Promise<Generation[]> {
  if (isDemoMode) {
    return demoGenerations
      .filter(g => g.user_id === userId)
      .slice(0, limit);
  }

  // Use direct fetch API to avoid Supabase client hanging
  console.log('getGenerations: Fetching for user:', userId);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  const accessToken = getAccessTokenFromStorage();
  if (!accessToken) {
    throw new Error('No valid session - please sign in again');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${TABLES.GENERATIONS}?user_id=eq.${userId}&select=*&order=created_at.desc&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('getGenerations: Error response:', errorText);
      throw new Error(`Supabase fetch failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('getGenerations: Got', data.length, 'generations');
    return data as Generation[];
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('getGenerations: Request timed out after 30s');
      throw new Error('Request timed out - please try again');
    }
    throw err;
  }
}

export async function getGeneration(generationId: string): Promise<Generation | null> {
  if (isDemoMode) {
    return demoGenerations.find(g => g.id === generationId) || null;
  }

  const { data, error } = await supabase
    .from(TABLES.GENERATIONS)
    .select('*')
    .eq('id', generationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching generation:', error);
    throw error;
  }

  return data as Generation;
}

export async function createGeneration(
  userId: string,
  request: GenerationRequest
): Promise<Generation> {
  console.log('createGeneration: Starting...', { userId, isDemoMode });
  const now = new Date().toISOString();

  if (isDemoMode) {
    console.log('createGeneration: Running in demo mode');
    const generation: Generation = {
      id: generateId(),
      user_id: userId,
      profile_id: request.profile_id,
      content_type: request.content_source as ContentSource,
      content_source: getContentSourceValue(request),
      input_data: request,
      status: 'pending' as GenerationStatus,
      n8n_execution_id: null,
      error_message: null,
      newsletters: null,
      google_drive_folder: null,
      google_drive_files: null,
      execution_time_seconds: null,
      api_cost: null,
      word_count_total: null,
      created_at: now,
      started_at: null,
      completed_at: null,
    };
    demoGenerations = [generation, ...demoGenerations];
    return generation;
  }

  // Create the generation record using fetch API directly to bypass any Supabase client issues
  console.log('createGeneration: Using direct fetch API...');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  try {
    // Get the access token directly from localStorage to avoid Supabase client issues
    console.log('createGeneration: Getting token from localStorage...');
    const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
    const storedSession = localStorage.getItem(storageKey);
    let accessToken: string | null = null;

    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
        console.log('createGeneration: Found token in localStorage');
      } catch {
        console.error('createGeneration: Failed to parse stored session');
      }
    }

    if (!accessToken) {
      console.log('createGeneration: Falling back to supabase.auth.getSession()...');
      const { data: sessionData } = await supabase.auth.getSession();
      accessToken = sessionData.session?.access_token || null;
    }

    if (!accessToken) {
      throw new Error('No valid session - please sign in again');
    }

    console.log('createGeneration: Got access token, making request...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${supabaseUrl}/rest/v1/${TABLES.GENERATIONS}?select=*`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: userId,
        profile_id: request.profile_id,
        content_type: request.content_source,
        content_source: getContentSourceValue(request),
        input_data: request,
        status: 'pending',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('createGeneration: Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('createGeneration: Error response:', errorText);
      throw new Error(`Supabase insert failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('createGeneration: Success, id:', data[0]?.id);

    return data[0] as Generation;
  } catch (err) {
    console.error('createGeneration: Caught exception:', err);
    throw err;
  }
}

export async function startGeneration(
  userId: string,
  request: GenerationRequest
): Promise<{ generation: Generation; executionId: string }> {
  console.log('startGeneration: Starting...', { userId, profileId: request.profile_id });

  // Create the generation record
  console.log('startGeneration: Creating generation record...');
  const generation = await createGeneration(userId, request);
  console.log('startGeneration: Generation record created:', generation.id);

  if (isDemoMode) {
    // In demo mode, simulate the generation process
    const executionId = 'demo-exec-' + Date.now();

    // Update to processing
    const index = demoGenerations.findIndex(g => g.id === generation.id);
    if (index !== -1) {
      demoGenerations[index] = {
        ...demoGenerations[index],
        status: 'processing' as GenerationStatus,
        n8n_execution_id: executionId,
        started_at: new Date().toISOString(),
      };
    }

    // Simulate async completion after 3 seconds
    setTimeout(() => {
      const idx = demoGenerations.findIndex(g => g.id === generation.id);
      if (idx !== -1) {
        const newsletters = createDemoNewsletters(request.content_source);
        const wordCount = newsletters.reduce((sum, n) => sum + n.word_count, 0);

        demoGenerations[idx] = {
          ...demoGenerations[idx],
          status: 'completed' as GenerationStatus,
          newsletters,
          google_drive_folder: 'https://drive.google.com/drive/folders/demo-folder',
          execution_time_seconds: 185,
          word_count_total: wordCount,
          completed_at: new Date().toISOString(),
        };
      }
    }, 3000);

    return {
      generation: demoGenerations[index],
      executionId,
    };
  }

  // Helper to get token from localStorage
  const getAccessToken = async (): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
    const storedSession = localStorage.getItem(storageKey);

    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        if (parsed.access_token) {
          return parsed.access_token;
        }
      } catch {
        console.error('Failed to parse stored session');
      }
    }

    // Fallback to supabase client (may hang but at least try)
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.access_token) {
      return sessionData.session.access_token;
    }

    throw new Error('No valid session - please sign in again');
  };

  // Helper to make direct Supabase REST API calls
  const directSupabaseUpdate = async (table: string, id: string, updates: Record<string, unknown>): Promise<unknown[]> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const accessToken = await getAccessToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${table}?id=eq.${id}&select=*`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updates),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase update failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  };

  try {
    // Fetch the voice profile data
    console.log('Fetching voice profile:', request.profile_id);
    const voiceProfile = await getVoiceProfile(request.profile_id);
    console.log('Voice profile fetched:', voiceProfile ? 'found' : 'not found');

    if (!voiceProfile) {
      throw new Error('Voice profile not found');
    }

    console.log('Triggering n8n workflow...');
    // Trigger the n8n workflow with voice profile data
    const response = await triggerNewsletterGeneration({
      userId,
      profileId: request.profile_id,
      generationId: generation.id,
      request,
      voiceProfile,
    });

    console.log('n8n response received:', response);

    // Check if the response indicates success and contains newsletters
    const isCompleted = response.success && response.status === 'completed' && response.newsletters?.length > 0;

    // Update generation with results using direct fetch
    console.log('Updating generation record...');
    const updatedData = await directSupabaseUpdate(TABLES.GENERATIONS, generation.id, {
      status: isCompleted ? 'completed' : 'processing',
      n8n_execution_id: response.execution_id,
      started_at: new Date().toISOString(),
      completed_at: isCompleted ? new Date().toISOString() : null,
      newsletters: isCompleted ? response.newsletters : null,
      word_count_total: isCompleted ? response.total_words : null,
    });

    console.log('Generation updated successfully');

    // Update voice profile last_used_at and increment total_generations
    console.log('Updating voice profile...');
    await directSupabaseUpdate(TABLES.VOICE_PROFILES, request.profile_id, {
      last_used_at: new Date().toISOString(),
      total_generations: voiceProfile.total_generations + 1,
    });
    console.log('Voice profile updated');

    return {
      generation: (updatedData as Generation[])[0],
      executionId: response.execution_id,
    };
  } catch (error) {
    console.error('startGeneration error:', error);
    // Mark generation as failed if n8n trigger fails - use direct fetch
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
      const storedSession = localStorage.getItem(storageKey);
      let accessToken: string | null = null;

      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token;
        } catch {}
      }

      if (accessToken) {
        await fetch(
          `${supabaseUrl}/rest/v1/${TABLES.GENERATIONS}?id=eq.${generation.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
            }),
          }
        );
      }
    } catch (updateErr) {
      console.error('Failed to mark generation as failed:', updateErr);
    }

    throw error;
  }
}

export async function updateGenerationStatus(
  generationId: string,
  status: GenerationStatus,
  errorMessage?: string
): Promise<Generation> {
  if (isDemoMode) {
    const index = demoGenerations.findIndex(g => g.id === generationId);
    if (index === -1) throw new Error('Generation not found');

    demoGenerations[index] = {
      ...demoGenerations[index],
      status,
      error_message: status === 'failed' ? errorMessage || null : null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    };
    return demoGenerations[index];
  }

  const updates: Record<string, any> = {
    status,
  };

  if (status === 'failed' && errorMessage) {
    updates.error_message = errorMessage;
  }

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(TABLES.GENERATIONS)
    .update(updates)
    .eq('id', generationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating generation status:', error);
    throw error;
  }

  return data as Generation;
}

export async function completeGeneration(
  generationId: string,
  newsletters: NewsletterArticle[],
  googleDriveFolder?: string,
  googleDriveFiles?: GoogleDriveFile[],
  executionTimeSeconds?: number
): Promise<Generation> {
  const wordCountTotal = newsletters.reduce((sum, n) => sum + (n.word_count || 0), 0);

  if (isDemoMode) {
    const index = demoGenerations.findIndex(g => g.id === generationId);
    if (index === -1) throw new Error('Generation not found');

    demoGenerations[index] = {
      ...demoGenerations[index],
      status: 'completed' as GenerationStatus,
      newsletters,
      google_drive_folder: googleDriveFolder || null,
      google_drive_files: googleDriveFiles || null,
      execution_time_seconds: executionTimeSeconds || null,
      word_count_total: wordCountTotal,
      completed_at: new Date().toISOString(),
    };
    return demoGenerations[index];
  }

  const { data, error } = await supabase
    .from(TABLES.GENERATIONS)
    .update({
      status: 'completed' as GenerationStatus,
      newsletters,
      google_drive_folder: googleDriveFolder,
      google_drive_files: googleDriveFiles,
      execution_time_seconds: executionTimeSeconds,
      word_count_total: wordCountTotal,
      completed_at: new Date().toISOString(),
    })
    .eq('id', generationId)
    .select()
    .single();

  if (error) {
    console.error('Error completing generation:', error);
    throw error;
  }

  return data as Generation;
}

// Poll for generation status
export async function pollGenerationStatus(
  generationId: string,
  onUpdate: (generation: Generation) => void,
  intervalMs = 5000,
  maxAttempts = 60
): Promise<Generation> {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      attempts++;

      try {
        const generation = await getGeneration(generationId);

        if (!generation) {
          reject(new Error('Generation not found'));
          return;
        }

        onUpdate(generation);

        if (generation.status === 'completed' || generation.status === 'failed') {
          resolve(generation);
          return;
        }

        if (attempts >= maxAttempts) {
          reject(new Error('Polling timeout - generation took too long'));
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

// Delete a generation via API (uses service role key to bypass RLS)
export async function deleteGeneration(generationId: string, userId: string): Promise<void> {
  if (isDemoMode) {
    demoGenerations = demoGenerations.filter(g => g.id !== generationId);
    return;
  }

  const response = await fetch('/api/delete-generation', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generation_id: generationId,
      user_id: userId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Error deleting generation:', error);
    throw new Error(error.message || 'Failed to delete generation');
  }
}

// Helper function to extract content source value for display
function getContentSourceValue(request: GenerationRequest): string {
  switch (request.content_source) {
    case 'Twitter':
      return request.twitter_username || '';
    case 'YouTube':
      return request.youtube_url || '';
    case 'Article':
      return 'article';
    default:
      return '';
  }
}
