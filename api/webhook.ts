import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface N8nCompletionPayload {
  execution_id: string;
  generation_id: string;
  user_id: string;
  status: 'completed' | 'failed';
  newsletters?: Array<{
    idea_number: number;
    title: string;
    subject_line: string;
    preview_text: string;
    content: string;
    markdown_content: string;
    word_count: number;
    source_type: string;
    newsletter_name: string;
    filename: string;
    created_at: string;
  }>;
  google_drive_folder?: string;
  google_drive_files?: Array<{
    newsletter_number: number;
    file_id: string;
    file_url: string;
  }>;
  execution_time_seconds?: number;
  total_words?: number;
  error_message?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body as N8nCompletionPayload;

    console.log('Received n8n callback:', JSON.stringify(payload, null, 2));

    if (!payload.generation_id) {
      return res.status(400).json({ error: 'Missing generation_id' });
    }

    // Calculate total word count if not provided
    const wordCountTotal = payload.total_words ||
      payload.newsletters?.reduce((sum, n) => sum + (n.word_count || 0), 0) || 0;

    // Update the generation record in Supabase
    const updateData: Record<string, unknown> = {
      status: payload.status,
      n8n_execution_id: payload.execution_id,
    };

    if (payload.status === 'completed') {
      updateData.newsletters = payload.newsletters;
      updateData.google_drive_folder = payload.google_drive_folder || null;
      updateData.google_drive_files = payload.google_drive_files || null;
      updateData.execution_time_seconds = payload.execution_time_seconds || null;
      updateData.word_count_total = wordCountTotal;
      updateData.completed_at = new Date().toISOString();
    } else if (payload.status === 'failed') {
      updateData.error_message = payload.error_message || 'Unknown error';
    }

    console.log('Updating generation with data:', JSON.stringify(updateData, null, 2));
    console.log('Using Supabase URL:', supabaseUrl ? 'Set' : 'NOT SET');
    console.log('Using Service Key:', supabaseServiceKey ? 'Set (length: ' + supabaseServiceKey.length + ')' : 'NOT SET');

    const { data: updateResult, error: updateError } = await supabase
      .from('generations')
      .update(updateData)
      .eq('id', payload.generation_id)
      .select();

    if (updateError) {
      console.error('Error updating generation:', updateError);
      return res.status(500).json({ error: 'Failed to update generation', details: updateError });
    }

    console.log('Update result:', JSON.stringify(updateResult, null, 2));
    console.log('Generation updated successfully:', payload.generation_id);

    return res.status(200).json({
      success: true,
      message: 'Generation updated successfully',
      generation_id: payload.generation_id,
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
