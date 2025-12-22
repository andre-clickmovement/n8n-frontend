import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { generation_id, user_id } = req.body;

    if (!generation_id) {
      return res.status(400).json({ error: 'Missing generation_id' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    console.log('Deleting generation:', generation_id, 'for user:', user_id);

    // Delete the generation (verify it belongs to the user)
    const { error: deleteError } = await supabase
      .from('generations')
      .delete()
      .eq('id', generation_id)
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('Error deleting generation:', deleteError);
      return res.status(500).json({ error: 'Failed to delete generation', details: deleteError });
    }

    console.log('Generation deleted successfully:', generation_id);

    return res.status(200).json({
      success: true,
      message: 'Generation deleted successfully',
      generation_id,
    });
  } catch (error) {
    console.error('Delete handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
