import {
  ContentSource,
  type GenerationRequest,
  type N8nWebhookPayload,
  type N8nWebhookResponse,
  type VoiceProfile,
} from '../types';

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://levreg.app.n8n.cloud/webhook/generate-newsletter';
const CALLBACK_URL = import.meta.env.VITE_CALLBACK_URL || window.location.origin + '/api/webhooks/n8n';

export interface TriggerGenerationParams {
  userId: string;
  profileId: string;
  generationId: string;
  request: GenerationRequest;
  voiceProfile: VoiceProfile;
}

export async function triggerNewsletterGeneration({
  userId,
  profileId,
  generationId,
  request,
  voiceProfile,
}: TriggerGenerationParams): Promise<N8nWebhookResponse> {
  const payload: N8nWebhookPayload = {
    user_id: userId,
    profile_id: profileId,
    generation_id: generationId,
    newsletter_name: request.newsletter_name,
    content_source: request.content_source,
    twitter_username: request.content_source === ContentSource.Twitter ? request.twitter_username || null : null,
    youtube_url: request.content_source === ContentSource.YouTube ? request.youtube_url || null : null,
    article_content: request.content_source === ContentSource.Article ? request.article_content || null : null,
    voice_profile: {
      profile_name: voiceProfile.profile_name,
      tone: voiceProfile.tone,
      formality: voiceProfile.formality,
      detail_level: voiceProfile.detail_level,
      sentence_style: voiceProfile.sentence_style,
      vocabulary_level: voiceProfile.vocabulary_level,
      common_phrases: voiceProfile.common_phrases,
      avoid_phrases: voiceProfile.avoid_phrases,
      uses_questions: voiceProfile.uses_questions,
      uses_data: voiceProfile.uses_data,
      uses_anecdotes: voiceProfile.uses_anecdotes,
      uses_metaphors: voiceProfile.uses_metaphors,
      uses_humor: voiceProfile.uses_humor,
      samples: voiceProfile.samples,
    },
    callback_url: CALLBACK_URL,
  };

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n webhook failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data as N8nWebhookResponse;
}

// Validate generation request
export function validateGenerationRequest(request: GenerationRequest): string[] {
  const errors: string[] = [];

  if (!request.profile_id) {
    errors.push('Voice profile is required');
  }

  if (!request.newsletter_name) {
    errors.push('Newsletter name is required');
  }

  if (!request.content_source) {
    errors.push('Content source is required');
  }

  // Validate conditional fields
  switch (request.content_source) {
    case ContentSource.Twitter:
      if (!request.twitter_username) {
        errors.push('Twitter username is required');
      } else if (!/^[a-zA-Z0-9_]{1,15}$/.test(request.twitter_username)) {
        errors.push('Invalid Twitter username format');
      }
      break;

    case ContentSource.YouTube:
      if (!request.youtube_url) {
        errors.push('YouTube URL is required');
      } else if (!/^https:\/\/(www\.)?youtube\.com\/watch\?v=|youtu\.be\//.test(request.youtube_url)) {
        errors.push('Invalid YouTube URL format');
      }
      break;

    case ContentSource.Article:
      if (!request.article_content) {
        errors.push('Article content is required');
      } else if (request.article_content.length < 100) {
        errors.push('Article content must be at least 100 characters');
      } else if (request.article_content.length > 50000) {
        errors.push('Article content must be less than 50,000 characters');
      }
      break;
  }

  return errors;
}
