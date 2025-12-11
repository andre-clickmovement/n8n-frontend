// ============================================
// LevRegAI Newsletter Engine - Type Definitions
// ============================================

// -------------------- Enums --------------------

export enum ContentSource {
  Twitter = 'Twitter',
  YouTube = 'YouTube',
  Article = 'Article'
}

// Newsletter name is now a custom string input, not an enum

export enum VoiceProfileStatus {
  Draft = 'draft',
  Analyzing = 'analyzing',
  Ready = 'ready',
  Approved = 'approved'
}

export enum GenerationStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed'
}

export enum SentenceStyle {
  Short = 'short',
  Mixed = 'mixed',
  Flowing = 'flowing'
}

export enum VocabularyLevel {
  Simple = 'simple',
  Professional = 'professional',
  Academic = 'academic'
}

export enum ParagraphPattern {
  ShortMixed = 'short_mixed',
  LongFlowing = 'long_flowing',
  Varied = 'varied'
}

export enum SubscriptionPlan {
  Starter = 'starter',
  Professional = 'professional',
  Agency = 'agency'
}

export enum SubscriptionStatus {
  Active = 'active',
  Canceled = 'canceled',
  PastDue = 'past_due',
  Trialing = 'trialing'
}

// -------------------- Tone Options --------------------

export const TONE_OPTIONS = [
  'bold',
  'direct',
  'conversational',
  'contrarian',
  'personal',
  'mentor-like',
  'warm',
  'analytical',
  'inspiring',
  'witty',
  'professional',
  'casual'
] as const;

export type ToneOption = typeof TONE_OPTIONS[number];

// -------------------- User & Auth --------------------

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// -------------------- Voice Profiles --------------------

export interface WritingSample {
  text: string;
  source: 'newsletter' | 'blog' | 'twitter' | 'email';
  url?: string;
}

export interface VoiceProfileFormData {
  // Profile metadata
  profile_name: string;
  newsletter_name: string;

  // Tone selection (multi-select)
  tone: ToneOption[];

  // Style scales (1-5)
  formality: number;
  detail_level: number;

  // Sentence preferences
  sentence_style: SentenceStyle;

  // Vocabulary
  vocabulary_level: VocabularyLevel;
  common_phrases: string[];
  avoid_phrases: string[];

  // Signature elements
  uses_questions: boolean;
  uses_data: boolean;
  uses_anecdotes: boolean;
  uses_metaphors: boolean;
  uses_humor: boolean;

  // Paragraph structure
  paragraph_pattern: ParagraphPattern;

  // Writing samples
  samples: WritingSample[];
}

export interface VoiceProfile extends VoiceProfileFormData {
  id: string;
  user_id: string;

  // Analysis results (filled after AI analysis)
  avg_sentence_length: number | null;
  voice_prompt: string | null;
  system_prompt: string | null;

  // Status and metadata
  status: VoiceProfileStatus;
  total_generations: number;
  average_rating: number | null;
  approved_at: string | null;
  last_used_at: string | null;

  created_at: string;
  updated_at: string;
}

// -------------------- Generation Request --------------------

export interface GenerationRequest {
  // Required fields
  profile_id: string;
  newsletter_name: string;
  content_source: ContentSource;

  // Conditional fields (based on content_source)
  twitter_username?: string;
  youtube_url?: string;
  article_content?: string;

  // Optional fields
  custom_instructions?: string;
  delivery_options?: {
    email: boolean;
    google_drive: boolean;
    slack?: string;
  };
}

// -------------------- Newsletter Output --------------------

export interface NewsletterArticle {
  newsletter_number: number;
  title: string;
  subject_line: string;
  preview_text: string;
  content_markdown: string;
  content_html?: string;
  word_count: number;
  source_type: string;
  newsletter_type: string;
  google_drive_url?: string;
  google_drive_file_id?: string;
  generated_at: string;
}

// Simplified version for preview (matches current UI)
export interface GeneratedContent {
  subject: string;
  preheader: string;
  body: string;
}

// -------------------- Generation Record --------------------

export interface GoogleDriveFile {
  newsletter_number: number;
  file_id: string;
  file_url: string;
}

export interface Generation {
  id: string;
  user_id: string;
  profile_id: string | null;

  // Input data
  content_type: ContentSource;
  content_source: string;
  input_data: GenerationRequest | null;

  // Processing
  status: GenerationStatus;
  n8n_execution_id: string | null;
  error_message: string | null;

  // Output data
  newsletters: NewsletterArticle[] | null;
  google_drive_folder: string | null;
  google_drive_files: GoogleDriveFile[] | null;

  // Metrics
  execution_time_seconds: number | null;
  api_cost: number | null;
  word_count_total: number | null;

  // Timestamps
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// -------------------- n8n Webhook Types --------------------

export interface N8nWebhookPayload {
  // Identifiers
  user_id: string;
  profile_id: string;
  generation_id: string;

  // Content source
  newsletter_name: string;
  content_source: ContentSource;
  twitter_username: string | null;
  youtube_url: string | null;
  article_content: string | null;

  // Voice profile data for AI generation
  voice_profile: {
    profile_name: string;
    tone: ToneOption[];
    formality: number;
    detail_level: number;
    sentence_style: SentenceStyle;
    vocabulary_level: VocabularyLevel;
    common_phrases: string[];
    avoid_phrases: string[];
    uses_questions: boolean;
    uses_data: boolean;
    uses_anecdotes: boolean;
    uses_metaphors: boolean;
    uses_humor: boolean;
    samples: WritingSample[];
  };

  callback_url: string;
}

export interface N8nWebhookResponse {
  execution_id: string;
  user_id: string;
  status: 'completed' | 'failed' | 'pending';
  newsletters: NewsletterArticle[];
  google_drive_folder: string;
  completed_at: string;
}

export interface N8nCompletionWebhook {
  execution_id: string;
  generation_id: string;
  user_id: string;
  status: 'completed' | 'failed';
  newsletters?: NewsletterArticle[];
  google_drive_folder?: string;
  google_drive_files?: GoogleDriveFile[];
  execution_time_seconds?: number;
  completed_at?: string;
  error_message?: string;
}

// -------------------- Subscription --------------------

export interface Subscription {
  id: string;
  user_id: string;

  // Stripe integration
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;

  // Plan details
  plan_name: SubscriptionPlan;
  status: SubscriptionStatus;

  // Billing period
  current_period_start: string;
  current_period_end: string;
  cancel_at: string | null;
  canceled_at: string | null;

  // Usage limits
  generations_this_period: number;
  generations_limit: number;

  // Metadata
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------- API Response Types --------------------

export interface ApiError {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// -------------------- UI State Types --------------------

export type AppView = 'dashboard' | 'create-profile' | 'generate' | 'history' | 'settings';

export interface AppState {
  currentView: AppView;
  selectedProfileId: string | null;
  isGenerating: boolean;
}

// -------------------- Form Validation --------------------

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// -------------------- Legacy types (for backwards compatibility during migration) --------------------

export enum ToneOfVoice {
  Professional = 'Professional',
  Witty = 'Witty',
  Casual = 'Casual',
  Inspirational = 'Inspirational',
  Authoritative = 'Authoritative'
}

export enum ContentLength {
  Short = 'Short (300-500 words)',
  Medium = 'Medium (600-1000 words)',
  Long = 'Long (1200+ words)'
}

export enum Frequency {
  Daily = 'Daily',
  Weekly = 'Weekly',
  BiWeekly = 'Bi-Weekly',
  Monthly = 'Monthly'
}

export interface NewsletterConfig {
  companyName: string;
  targetAudience: string;
  primaryTopic: string;
  tone: ToneOfVoice;
  length: ContentLength;
  frequency: Frequency;
  keyValues: string;
  exampleTopic: string;
}
