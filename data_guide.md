# Newsletter Generation Workflow - Data Structure Guide
## For Full-Stack Application Generators

**Version:** 1.0  
**Date:** December 2025  
**Purpose:** Complete data specification for building the VoiceClone Newsletter Engine

---

## Table of Contents

1. [Overview](#overview)
2. [Input Data Structures](#input-data-structures)
3. [Database Schema](#database-schema)
4. [API Endpoints & Payloads](#api-endpoints--payloads)
5. [n8n Workflow Data Flow](#n8n-workflow-data-flow)
6. [Output Data Structures](#output-data-structures)
7. [Voice Profile Data](#voice-profile-data)
8. [Integration Data](#integration-data)
9. [Error Responses](#error-responses)

---

## Overview

### Data Flow Summary

```
User Input (Frontend Form)
    ↓
API Request (JSON payload)
    ↓
Database (Create generation record)
    ↓
n8n Webhook (Trigger workflow)
    ↓
n8n Processing (Content → Research → Generation)
    ↓
Database (Store results)
    ↓
Completion Webhook (Notify frontend)
    ↓
User Views Results (Dashboard)
```

### Core Data Entities

1. **Users** - Account information
2. **Voice Profiles** - Writing style definitions
3. **Subscriptions** - Payment and usage tracking
4. **Generations** - Newsletter generation requests and results
5. **Voice Examples** - Learning data for voice improvement
6. **Newsletters** - Individual newsletter articles

---

## Input Data Structures

### 1. Newsletter Generation Request

**Frontend Form Submission**

```typescript
interface GenerationRequest {
  // Required fields
  profile_id: string;              // UUID of voice profile to use
  newsletter: string;              // "Newsletter Bytes" | "Uncommon Advice"
  content_source: string;          // "Twitter" | "YouTube" | "Article"
  
  // Conditional fields (based on content_source)
  twitter_username?: string;       // Required if content_source = "Twitter"
  youtube_url?: string;            // Required if content_source = "YouTube"
  article_content?: string;        // Required if content_source = "Article"
  
  // Optional fields
  custom_instructions?: string;    // Additional instructions for AI
  delivery_options?: {
    email: boolean;                // Send via email
    google_drive: boolean;         // Save to Google Drive
    slack?: string;                // Slack webhook URL
  };
}
```

**Example JSON:**

```json
{
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "newsletter": "Newsletter Bytes",
  "content_source": "Twitter",
  "twitter_username": "beehiiv",
  "delivery_options": {
    "email": true,
    "google_drive": true
  }
}
```

**Validation Rules:**

```typescript
const validationSchema = {
  profile_id: {
    type: "uuid",
    required: true,
    description: "Must be valid UUID of existing voice profile"
  },
  newsletter: {
    type: "enum",
    required: true,
    values: ["Newsletter Bytes", "Uncommon Advice"],
    description: "Newsletter brand to generate for"
  },
  content_source: {
    type: "enum",
    required: true,
    values: ["Twitter", "YouTube", "Article"],
    description: "Type of content source"
  },
  twitter_username: {
    type: "string",
    required: "if content_source = 'Twitter'",
    minLength: 1,
    maxLength: 15,
    pattern: "^[a-zA-Z0-9_]+$",
    description: "Twitter username without @"
  },
  youtube_url: {
    type: "url",
    required: "if content_source = 'YouTube'",
    pattern: "^https://(www\\.)?youtube\\.com/watch\\?v=|youtu\\.be/",
    description: "Valid YouTube video URL"
  },
  article_content: {
    type: "string",
    required: "if content_source = 'Article'",
    minLength: 100,
    maxLength: 50000,
    description: "Article text or content brief"
  }
};
```

---

### 2. Voice Profile Creation Request

**Voice Training Questionnaire**

```typescript
interface VoiceProfileRequest {
  // Profile metadata
  profile_name: string;            // User-friendly name
  newsletter_brand?: string;       // Which newsletter this is for
  
  // Tone selection (multi-select)
  tone: string[];                  // ["bold", "direct", "conversational", etc.]
  
  // Style scales (1-5)
  formality: number;               // 1 = casual, 5 = formal
  detail_level: number;            // 1 = brief, 5 = comprehensive
  
  // Sentence preferences
  sentence_style: string;          // "short" | "mixed" | "flowing"
  avg_sentence_length?: number;   // Calculated from samples
  
  // Vocabulary
  vocabulary_level: string;        // "simple" | "professional" | "academic"
  common_phrases: string[];        // Phrases user uses often
  avoid_phrases: string[];         // Phrases to never use
  
  // Signature elements (boolean flags)
  uses_questions: boolean;
  uses_data: boolean;
  uses_anecdotes: boolean;
  uses_metaphors: boolean;
  uses_humor: boolean;
  
  // Paragraph structure
  paragraph_pattern: string;       // "short_mixed" | "long_flowing" | "varied"
  
  // Writing samples for analysis
  samples: Array<{
    text: string;
    source: string;                // "newsletter" | "blog" | "twitter" | "email"
    url?: string;
  }>;
}
```

**Example JSON:**

```json
{
  "profile_name": "My Newsletter Voice",
  "newsletter_brand": "Newsletter Bytes",
  "tone": ["bold", "direct", "contrarian"],
  "formality": 3,
  "detail_level": 4,
  "sentence_style": "mixed",
  "vocabulary_level": "professional",
  "common_phrases": [
    "Here's the thing:",
    "Most people miss this:",
    "The data tells a different story:"
  ],
  "avoid_phrases": [
    "dive deep",
    "synergy",
    "game-changer"
  ],
  "uses_questions": true,
  "uses_data": true,
  "uses_anecdotes": false,
  "uses_metaphors": true,
  "uses_humor": false,
  "paragraph_pattern": "short_mixed",
  "samples": [
    {
      "text": "Here's what most newsletter creators get wrong...",
      "source": "newsletter",
      "url": "https://example.com/newsletter-1"
    }
  ]
}
```

---

## Database Schema

### Complete PostgreSQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced from Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Voice profiles table
CREATE TABLE voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  newsletter_brand TEXT,
  
  -- Questionnaire responses
  tone JSONB DEFAULT '[]'::jsonb,
  formality INTEGER CHECK (formality BETWEEN 1 AND 5),
  detail_level INTEGER CHECK (detail_level BETWEEN 1 AND 5),
  sentence_style TEXT CHECK (sentence_style IN ('short', 'mixed', 'flowing')),
  vocabulary_level TEXT CHECK (vocabulary_level IN ('simple', 'professional', 'academic')),
  
  -- Analysis results
  sample_texts JSONB DEFAULT '[]'::jsonb,
  avg_sentence_length DECIMAL(5,2),
  common_phrases TEXT[] DEFAULT ARRAY[]::TEXT[],
  avoid_phrases TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Signature elements
  uses_questions BOOLEAN DEFAULT false,
  uses_data BOOLEAN DEFAULT false,
  uses_anecdotes BOOLEAN DEFAULT false,
  uses_metaphors BOOLEAN DEFAULT false,
  uses_humor BOOLEAN DEFAULT false,
  
  -- Structure preferences
  paragraph_pattern TEXT,
  
  -- Generated AI prompts (the magic)
  voice_prompt TEXT,
  system_prompt TEXT,
  
  -- Status and metadata
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'analyzing', 'ready', 'approved')),
  total_generations INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  approved_at TIMESTAMP,
  last_used_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_profile_name CHECK (LENGTH(profile_name) BETWEEN 1 AND 100)
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  
  -- Plan details
  plan_name TEXT NOT NULL CHECK (plan_name IN ('starter', 'professional', 'agency')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  
  -- Billing period
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at TIMESTAMP,
  canceled_at TIMESTAMP,
  
  -- Usage limits
  generations_this_period INTEGER DEFAULT 0,
  generations_limit INTEGER NOT NULL,
  
  -- Metadata
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT one_subscription_per_user UNIQUE (user_id)
);

-- Generations table
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES voice_profiles(id) ON DELETE SET NULL,
  
  -- Input data
  content_type TEXT NOT NULL CHECK (content_type IN ('twitter', 'youtube', 'article')),
  content_source TEXT NOT NULL,
  input_data JSONB,
  
  -- Processing
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  n8n_execution_id TEXT,
  error_message TEXT,
  
  -- Output data
  newsletters JSONB,
  google_drive_folder TEXT,
  google_drive_files JSONB,
  
  -- Metrics
  execution_time_seconds INTEGER,
  api_cost DECIMAL(10,4),
  word_count_total INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  CONSTRAINT valid_content_source CHECK (LENGTH(content_source) > 0)
);

-- Individual newsletters (expanded from generation)
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Newsletter details
  newsletter_number INTEGER NOT NULL CHECK (newsletter_number BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  subject_line TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  content_html TEXT,
  
  -- Metadata
  word_count INTEGER,
  source_type TEXT,
  newsletter_type TEXT,
  
  -- User feedback
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  was_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_newsletter_in_generation UNIQUE (generation_id, newsletter_number)
);

-- Voice examples (for learning)
CREATE TABLE voice_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
  newsletter_id UUID REFERENCES newsletters(id) ON DELETE SET NULL,
  
  -- Example data
  content TEXT NOT NULL,
  example_type TEXT CHECK (example_type IN ('good', 'bad', 'neutral')),
  
  -- User feedback
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  learned_from BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_voice_profiles_user ON voice_profiles(user_id);
CREATE INDEX idx_voice_profiles_status ON voice_profiles(status);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_generations_user ON generations(user_id);
CREATE INDEX idx_generations_status ON generations(status);
CREATE INDEX idx_generations_created ON generations(created_at DESC);
CREATE INDEX idx_newsletters_generation ON newsletters(generation_id);
CREATE INDEX idx_newsletters_user ON newsletters(user_id);
CREATE INDEX idx_voice_examples_profile ON voice_examples(profile_id);

-- Row Level Security (RLS)
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_examples ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own voice profiles" ON voice_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice profiles" ON voice_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice profiles" ON voice_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice profiles" ON voice_profiles
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own generations" ON generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own newsletters" ON newsletters
  FOR SELECT USING (auth.uid() = user_id);

-- Database functions
CREATE OR REPLACE FUNCTION increment_generation_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET generations_this_period = generations_this_period + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_generation_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET generations_this_period = 0,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_voice_profile_stats(p_profile_id UUID, p_rating INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE voice_profiles
  SET total_generations = total_generations + 1,
      average_rating = (
        COALESCE(average_rating * total_generations, 0) + p_rating
      ) / (total_generations + 1),
      last_used_at = NOW(),
      updated_at = NOW()
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql;
```

---

## API Endpoints & Payloads

### Authentication Endpoints

**POST /api/auth/callback**

Clerk webhook to sync user data.

Request:
```json
{
  "type": "user.created",
  "data": {
    "id": "user_2abc123",
    "email_addresses": [{ "email_address": "user@example.com" }],
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

Response:
```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### Voice Profile Endpoints

**GET /api/voice**

List user's voice profiles.

Response:
```json
{
  "profiles": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "profile_name": "Newsletter Bytes Voice",
      "newsletter_brand": "Newsletter Bytes",
      "status": "approved",
      "tone": ["bold", "direct", "contrarian"],
      "formality": 3,
      "total_generations": 45,
      "average_rating": 4.2,
      "created_at": "2025-01-15T10:30:00Z",
      "last_used_at": "2025-01-20T14:22:00Z"
    }
  ]
}
```

**POST /api/voice**

Create new voice profile.

Request:
```json
{
  "profile_name": "My Professional Voice",
  "newsletter_brand": "Uncommon Advice",
  "tone": ["personal", "mentor-like", "warm"],
  "formality": 2,
  "detail_level": 3,
  "sentence_style": "mixed",
  "vocabulary_level": "professional",
  "common_phrases": ["Here's what I've learned:", "In my experience:"],
  "avoid_phrases": ["leverage", "synergy"],
  "uses_questions": true,
  "uses_data": false,
  "uses_anecdotes": true,
  "samples": [
    {
      "text": "Sample writing...",
      "source": "newsletter"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "profile": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "analyzing",
    "message": "Voice profile is being analyzed. This takes 2-3 minutes."
  }
}
```

**GET /api/voice/:id**

Get specific voice profile.

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "440e8400-e29b-41d4-a716-446655440000",
  "profile_name": "Newsletter Bytes Voice",
  "newsletter_brand": "Newsletter Bytes",
  "status": "approved",
  "tone": ["bold", "direct", "contrarian"],
  "formality": 3,
  "detail_level": 4,
  "sentence_style": "mixed",
  "vocabulary_level": "professional",
  "common_phrases": [
    "Here's the thing:",
    "Most people miss this:"
  ],
  "avoid_phrases": [
    "dive deep",
    "synergy"
  ],
  "uses_questions": true,
  "uses_data": true,
  "uses_anecdotes": false,
  "paragraph_pattern": "short_mixed",
  "total_generations": 45,
  "average_rating": 4.2,
  "created_at": "2025-01-15T10:30:00Z",
  "approved_at": "2025-01-15T10:45:00Z",
  "last_used_at": "2025-01-20T14:22:00Z"
}
```

**POST /api/voice/:id/test**

Generate test sample with voice profile.

Request:
```json
{
  "test_topic": "Why newsletters beat social media for audience building"
}
```

Response:
```json
{
  "success": true,
  "sample": "Here's what most people miss about newsletters...",
  "word_count": 156,
  "estimated_rating": 4.5
}
```

---

### Generation Endpoints

**POST /api/generate**

Trigger newsletter generation.

Request:
```json
{
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "newsletter": "Newsletter Bytes",
  "content_source": "Twitter",
  "twitter_username": "beehiiv"
}
```

Response:
```json
{
  "success": true,
  "generation_id": "770e8400-e29b-41d4-a716-446655440002",
  "execution_id": "n8n-exec-12345",
  "status": "processing",
  "estimated_time": "3-5 minutes",
  "message": "Newsletter generation started. You'll receive an email when ready."
}
```

**GET /api/generate/:id**

Get generation status.

Response:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "440e8400-e29b-41d4-a716-446655440000",
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "content_type": "twitter",
  "content_source": "beehiiv",
  "created_at": "2025-01-20T15:30:00Z",
  "started_at": "2025-01-20T15:30:05Z",
  "progress": {
    "current_step": "Generating articles",
    "total_steps": 5,
    "percent_complete": 60
  }
}
```

**GET /api/generate/:id/result**

Get completed newsletters.

Response:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "completed",
  "completed_at": "2025-01-20T15:35:22Z",
  "execution_time_seconds": 322,
  "google_drive_folder": "https://drive.google.com/drive/folders/abc123",
  "newsletters": [
    {
      "newsletter_number": 1,
      "title": "The Newsletter Barbell: Why the Middle Ground Is Where Profits Go to Die",
      "subject_line": "Stop trying to be everything to everyone",
      "preview_text": "Nicolas Cole's barbell framework reveals...",
      "content_markdown": "# The Newsletter Barbell...",
      "word_count": 849,
      "google_drive_url": "https://drive.google.com/file/d/xyz789"
    },
    {
      "newsletter_number": 2,
      "title": "...",
      "subject_line": "...",
      "preview_text": "...",
      "content_markdown": "...",
      "word_count": 782,
      "google_drive_url": "..."
    }
    // ... 3 more newsletters
  ]
}
```

**GET /api/generations**

List all generations for user.

Query params:
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset

Response:
```json
{
  "generations": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "content_type": "twitter",
      "content_source": "beehiiv",
      "status": "completed",
      "newsletters_count": 5,
      "created_at": "2025-01-20T15:30:00Z",
      "completed_at": "2025-01-20T15:35:22Z"
    }
  ],
  "total": 23,
  "limit": 20,
  "offset": 0
}
```

---

### Webhook Endpoints

**POST /api/webhooks/n8n**

Receive completion notifications from n8n.

Request:
```json
{
  "execution_id": "n8n-exec-12345",
  "generation_id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "440e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "newsletters": [
    {
      "idea_number": 1,
      "title": "...",
      "subject_line": "...",
      "preview_text": "...",
      "content": "...",
      "word_count": 849
    }
  ],
  "google_drive_folder": "https://drive.google.com/...",
  "google_drive_files": [
    {
      "newsletter_number": 1,
      "file_id": "abc123",
      "file_url": "https://drive.google.com/file/d/abc123"
    }
  ],
  "execution_time_seconds": 322,
  "completed_at": "2025-01-20T15:35:22Z"
}
```

Response:
```json
{
  "success": true,
  "message": "Generation updated successfully"
}
```

**POST /api/webhooks/stripe**

Handle Stripe subscription events.

Request (example - subscription created):
```json
{
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_1234567890",
      "customer": "cus_ABC123",
      "status": "active",
      "current_period_start": 1705766400,
      "current_period_end": 1708444800,
      "items": {
        "data": [
          {
            "price": {
              "id": "price_starter_monthly",
              "product": "prod_newsletter_starter"
            }
          }
        ]
      }
    }
  }
}
```

Response:
```json
{
  "received": true
}
```

---

## n8n Workflow Data Flow

### Input to n8n Workflow

**Webhook Payload Structure:**

```json
{
  "user_id": "440e8400-e29b-41d4-a716-446655440000",
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "generation_id": "770e8400-e29b-41d4-a716-446655440002",
  "newsletter": "Newsletter Bytes",
  "content_source": "Twitter",
  "twitter_username": "beehiiv",
  "youtube_url": null,
  "article_content": null,
  "callback_url": "https://app.yourproduct.com/api/webhooks/n8n"
}
```

### Data Transformation Steps in n8n

**Step 1: Preserve Form Data**

Output:
```json
{
  "Newsletter": "Newsletter Bytes",
  "Content Source": "Twitter",
  "Twitter Username": "beehiiv",
  "YouTube Video URL": "",
  "Article Content": "",
  "user_id": "440e8400-e29b-41d4-a716-446655440000",
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "execution_id": "n8n-exec-12345"
}
```

**Step 2: Get Voice Profile from Supabase**

Query:
```sql
SELECT voice_prompt, system_prompt, tone, common_phrases, avoid_phrases
FROM voice_profiles
WHERE id = $profile_id
```

Output:
```json
{
  "voice_prompt": "Write in a bold, direct style with short punchy sentences...",
  "system_prompt": "You are a newsletter writer...",
  "tone": ["bold", "direct", "contrarian"],
  "common_phrases": ["Here's the thing:", "Most people miss this:"],
  "avoid_phrases": ["dive deep", "synergy"]
}
```

**Step 3: Content Collection (Twitter example)**

Apify Twitter Scraper Output:
```json
[
  {
    "author": {
      "userName": "beehiiv",
      "name": "beehiiv",
      "followers": 50000
    },
    "fullText": "Your newsletter is a business. Treat it like one...",
    "url": "https://twitter.com/beehiiv/status/123...",
    "likeCount": 245,
    "retweetCount": 58,
    "replyCount": 12,
    "isRetweet": false
  }
  // ... more tweets
]
```

**Step 4: Process Twitter Data**

Output:
```json
{
  "content": "Tweet by @beehiiv: Your newsletter is a business...\n\nTweet by @beehiiv: Most creators give up too early...",
  "source": "twitter",
  "newsletter": "Newsletter Bytes",
  "raw_data": [...]
}
```

**Step 5: Perplexity Research**

Request to Perplexity:
```json
{
  "model": "sonar-pro",
  "messages": [
    {
      "role": "user",
      "content": "I have the following content...\n\nCONTENT TO ANALYZE:\nTweet by @beehiiv: Your newsletter is a business..."
    }
  ],
  "max_tokens": 2000
}
```

Response:
```json
{
  "choices": [
    {
      "message": {
        "content": "Based on the newsletter content about treating newsletters as businesses...\n\n1. Key Topics:\n- Newsletter monetization strategies\n- Subscriber retention tactics\n- Email deliverability best practices\n\n2. Supporting Statistics:\n- Average newsletter open rate: 21.5% (Mailchimp 2024)\n- Paid newsletter conversion rate: 2-5% (Substack data)\n\n3. Current Trends:\n- Shift from ad-based to subscription models\n- Increased focus on niche audiences\n\n4. Expert Perspectives:\n- Ann Handley emphasizes consistency over perfection\n- Morning Brew scaled through daily publishing\n\n5. Actionable Insights:\n- Test subject lines with A/B testing\n- Segment audiences based on engagement"
      }
    }
  ]
}
```

**Step 6: Combine Research**

Output:
```json
{
  "original_content": "Tweet by @beehiiv: Your newsletter is a business...",
  "source_type": "twitter",
  "newsletter": "Newsletter Bytes",
  "research_insights": "Based on the newsletter content about treating newsletters as businesses...",
  "combined_context": "ORIGINAL CONTENT:\nTweet by @beehiiv...\n\n---RESEARCH INSIGHTS---\n\nBased on the newsletter content..."
}
```

**Step 7: Content Brainstorm**

AI Prompt (with voice injection):
```
VOICE INSTRUCTIONS:
Write in a bold, direct style with short punchy sentences...
Use phrases like: "Here's the thing:", "Most people miss this:"
Avoid phrases like: "dive deep", "synergy"

---

Generate 5 newsletter article ideas based on the content...
```

Output (Structured):
```json
{
  "content_ideas": [
    {
      "idea_number": 1,
      "title": "The Newsletter Barbell: Why the Middle Ground Is Where Profits Go to Die",
      "subject_line": "Stop trying to be everything to everyone",
      "preview_text": "The barbell framework reveals why successful newsletters pick a lane",
      "target_audience": "Newsletter creators monetizing their audience",
      "core_problem": "Confusion about positioning and monetization strategy",
      "unique_angle": "Two extremes (shallow/timely vs deep/timeless) work, middle doesn't",
      "key_takeaways": [
        "Shallow/timely newsletters scale through volume and ads",
        "Deep/timeless newsletters charge premium for expertise",
        "Middle ground confuses readers and kills monetization"
      ],
      "article_structure": {
        "opening_hook": "Here's what most newsletter creators get wrong: they think being well-rounded will attract more subscribers. The data says the opposite.",
        "main_sections": [
          {
            "heading": "The Death Zone: Why the Middle Kills Monetization",
            "key_point": "Positioning confusion prevents monetization"
          },
          {
            "heading": "The Barbell Winners",
            "key_point": "Examples of successful extremes"
          }
        ],
        "conclusion": "Pick your lane and dominate it. The middle is where profits die."
      },
      "supporting_data": "The Hustle: 1.5M subscribers, The Generalist: $1.3M ARR with 90K subs",
      "writing_notes": "Use bold, contrarian tone. Lead with data. Short paragraphs."
    }
    // ... 4 more ideas
  ]
}
```

**Step 8: Split Ideas**

Splits the 5 ideas into individual items for parallel processing.

Each item becomes:
```json
{
  "idea_number": 1,
  "title": "The Newsletter Barbell...",
  "subject_line": "Stop trying to be everything...",
  // ... rest of idea
}
```

**Step 9: Write Newsletter Article (5x parallel)**

AI Prompt (with voice + idea):
```
VOICE INSTRUCTIONS:
Write in a bold, direct style...

---

Write a complete 600-800 word newsletter article based on the content idea...

ARTICLE IDEA:
{
  "title": "The Newsletter Barbell...",
  "subject_line": "...",
  "article_structure": {...}
}
```

Output:
```json
{
  "text": "# The Newsletter Barbell: Why the Middle Ground Is Where Profits Go to Die\n\nHere's what most newsletter creators get wrong..."
}
```

**Step 10: Format Newsletter Output**

Combines article text with metadata:
```json
{
  "idea_number": 1,
  "title": "The Newsletter Barbell: Why the Middle Ground Is Where Profits Go to Die",
  "subject_line": "Stop trying to be everything to everyone",
  "preview_text": "The barbell framework reveals...",
  "article_content": "# The Newsletter Barbell...",
  "word_count": 849,
  "generated_at": "2025-01-20T15:33:15Z",
  "source_type": "twitter"
}
```

**Step 11: Generate Markdown Files**

Creates .md files with metadata:
```json
{
  "newsletter_number": 1,
  "title": "The Newsletter Barbell...",
  "filename": "2025-01-20_newsletter_1_the-newsletter-barbell.md",
  "markdown_content": "# The Newsletter Barbell...\n\n---\n\n## Email Metadata...",
  "binary": {
    "data": {
      "data": "base64-encoded-markdown",
      "mimeType": "text/markdown",
      "fileName": "2025-01-20_newsletter_1_the-newsletter-barbell.md"
    }
  }
}
```

**Step 12: Upload to Google Drive**

Request to Google Drive API:
```json
{
  "name": "2025-01-20_newsletter_1_the-newsletter-barbell.md",
  "mimeType": "text/markdown",
  "parents": ["folder-id-from-user"],
  "content": "base64-encoded-file"
}
```

Response:
```json
{
  "id": "file-id-abc123",
  "name": "2025-01-20_newsletter_1_the-newsletter-barbell.md",
  "webViewLink": "https://drive.google.com/file/d/file-id-abc123/view",
  "webContentLink": "https://drive.google.com/uc?id=file-id-abc123&export=download"
}
```

**Step 13: Aggregate All Newsletters**

Combines 5 newsletters:
```json
{
  "newsletters": [
    {
      "idea_number": 1,
      "title": "...",
      "subject_line": "...",
      "preview_text": "...",
      "article_content": "...",
      "word_count": 849,
      "source_type": "twitter"
    }
    // ... 4 more
  ]
}
```

**Step 14: Final Output**

```json
{
  "generated_date": "2025-01-20T15:35:22Z",
  "total_newsletters": 5,
  "source_type": "twitter",
  "newsletters": [...]
}
```

**Step 15: Notify Frontend Completion**

POST to callback URL:
```json
{
  "execution_id": "n8n-exec-12345",
  "generation_id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "440e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "newsletters": [...],
  "google_drive_folder": "https://drive.google.com/drive/folders/abc123",
  "google_drive_files": [
    {
      "newsletter_number": 1,
      "file_id": "file-id-abc123",
      "file_url": "https://drive.google.com/file/d/file-id-abc123"
    }
  ],
  "execution_time_seconds": 322,
  "completed_at": "2025-01-20T15:35:22Z"
}
```

---

## Output Data Structures

### Newsletter Article Structure

```typescript
interface NewsletterArticle {
  // Identification
  newsletter_number: number;        // 1-5
  
  // Email metadata
  title: string;                    // Article headline
  subject_line: string;             // Email subject (50-60 chars)
  preview_text: string;             // Email preview (100 chars)
  
  // Content
  content_markdown: string;         // Full article in markdown
  content_html?: string;            // HTML version (optional)
  
  // Metadata
  word_count: number;               // Total words
  source_type: string;              // "twitter" | "youtube" | "article"
  newsletter_type: string;          // "Newsletter Bytes" | "Uncommon Advice"
  
  // Files
  google_drive_url?: string;        // Link to .md file
  google_drive_file_id?: string;    // File ID for API access
  
  // Timestamps
  generated_at: string;             // ISO timestamp
}
```

### Complete Generation Result

```typescript
interface GenerationResult {
  // Generation info
  id: string;                       // UUID
  user_id: string;                  // UUID
  profile_id: string;               // UUID
  
  // Status
  status: "completed";
  
  // Input
  content_type: string;             // "twitter" | "youtube" | "article"
  content_source: string;           // Username, URL, or "article"
  
  // Output
  newsletters: NewsletterArticle[]; // Array of 5 newsletters
  
  // Files
  google_drive_folder: string;      // Folder URL
  google_drive_files: Array<{
    newsletter_number: number;
    file_id: string;
    file_url: string;
  }>;
  
  // Metrics
  execution_time_seconds: number;
  api_cost: number;                 // Decimal
  word_count_total: number;
  
  // Timestamps
  created_at: string;               // ISO timestamp
  started_at: string;               // ISO timestamp
  completed_at: string;             // ISO timestamp
}
```

---

## Voice Profile Data

### Analyzed Voice Profile

```typescript
interface VoiceProfile {
  // Identification
  id: string;
  user_id: string;
  
  // Metadata
  profile_name: string;
  newsletter_brand?: string;
  status: "draft" | "analyzing" | "ready" | "approved";
  
  // Questionnaire responses
  tone: string[];                   // ["bold", "direct", "contrarian"]
  formality: number;                // 1-5
  detail_level: number;             // 1-5
  sentence_style: string;           // "short" | "mixed" | "flowing"
  vocabulary_level: string;         // "simple" | "professional" | "academic"
  
  // Analysis results
  sample_texts: Array<{
    text: string;
    source: string;
    url?: string;
  }>;
  avg_sentence_length: number;      // Decimal (e.g., 15.7)
  common_phrases: string[];
  avoid_phrases: string[];
  
  // Signature elements
  uses_questions: boolean;
  uses_data: boolean;
  uses_anecdotes: boolean;
  uses_metaphors: boolean;
  uses_humor: boolean;
  
  // Structure
  paragraph_pattern: string;        // "short_mixed" | "long_flowing"
  
  // Generated prompts (the magic)
  voice_prompt: string;             // Full voice instructions for AI
  system_prompt?: string;           // Optional system prompt
  
  // Stats
  total_generations: number;
  average_rating: number;           // 1-5, decimal
  
  // Timestamps
  created_at: string;
  approved_at?: string;
  last_used_at?: string;
}
```

### Voice Prompt Example

```typescript
const voicePromptExample = `
You are writing as a bold, direct newsletter creator who challenges conventional wisdom.

TONE & STYLE:
- Write with confidence and authority
- Be direct and get to the point quickly
- Challenge mainstream thinking with contrarian takes
- Use short, punchy sentences mixed with occasional longer explanations
- Professional but conversational - no corporate jargon

SENTENCE STRUCTURE:
- Average sentence length: 15 words
- Mix short statements (5-10 words) with supporting details (20-30 words)
- Start new paragraphs every 2-4 sentences
- Use one-sentence paragraphs for emphasis

COMMON PHRASES TO USE:
- "Here's the thing:"
- "Most people miss this:"
- "The data tells a different story:"
- "Stop trying to [X]"

NEVER USE THESE PHRASES:
- "Dive deep"
- "Synergy"
- "Game-changer"

CONTENT PATTERNS:
- Lead with bold statements or surprising data
- Support claims with specific numbers
- Use questions sparingly (1-2 per article)
- Rarely use personal anecdotes
- Focus on actionable insights

FORMATTING:
- Use subheadings for main sections
- Bold key points sparingly
- No emoji
- Use "---" for section breaks

Remember: Write as if YOU discovered these insights. Never attribute to the source material.
`;
```

---

## Integration Data

### Google Drive Integration

**Folder Structure:**
```
/Newsletters/
  /Newsletter Bytes/
    /2025-01/
      2025-01-20_newsletter_1_title.md
      2025-01-20_newsletter_2_title.md
      2025-01-20_SUMMARY.md
```

**File Metadata:**
```json
{
  "id": "file-id-abc123",
  "name": "2025-01-20_newsletter_1_title.md",
  "mimeType": "text/markdown",
  "size": 5432,
  "webViewLink": "https://drive.google.com/file/d/file-id-abc123/view",
  "webContentLink": "https://drive.google.com/uc?id=file-id-abc123",
  "createdTime": "2025-01-20T15:35:22Z",
  "modifiedTime": "2025-01-20T15:35:22Z",
  "parents": ["folder-id-xyz789"]
}
```

### Email Notification Data

```typescript
interface EmailNotification {
  to: string;                       // User's email
  from: string;                     // "VoiceClone <notifications@yourproduct.com>"
  subject: string;                  // "Your newsletters are ready!"
  html: string;                     // HTML email content
  attachments?: Array<{
    filename: string;
    content: string;                // Base64
    contentType: string;
  }>;
}
```

**Email Template Data:**
```typescript
interface EmailTemplateData {
  user_name: string;
  newsletter_count: number;         // Always 5
  generation_date: string;
  dashboard_url: string;            // Link to dashboard
  google_drive_url: string;         // Link to folder
  newsletters: Array<{
    number: number;
    title: string;
    word_count: number;
  }>;
}
```

---

## Error Responses

### Standard Error Format

```typescript
interface ErrorResponse {
  error: string;                    // Error message
  code: string;                     // Error code
  details?: any;                    // Additional context
  timestamp: string;                // ISO timestamp
}
```

### Common Error Codes

**Authentication Errors:**
```json
{
  "error": "Unauthorized",
  "code": "AUTH_REQUIRED",
  "timestamp": "2025-01-20T15:30:00Z"
}
```

**Validation Errors:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "twitter_username": "Required when content_source is Twitter"
  },
  "timestamp": "2025-01-20T15:30:00Z"
}
```

**Rate Limit Errors:**
```json
{
  "error": "Generation limit reached",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 20,
    "used": 20,
    "reset_at": "2025-02-01T00:00:00Z"
  },
  "timestamp": "2025-01-20T15:30:00Z"
}
```

**n8n Workflow Errors:**
```json
{
  "error": "Workflow execution failed",
  "code": "N8N_ERROR",
  "details": {
    "execution_id": "n8n-exec-12345",
    "error_message": "Twitter API rate limit exceeded"
  },
  "timestamp": "2025-01-20T15:30:00Z"
}
```

---

## Summary: Key Data Points

### Critical IDs to Track

1. **user_id** - Clerk user ID (synced to Supabase)
2. **profile_id** - Voice profile UUID
3. **generation_id** - Generation request UUID
4. **execution_id** - n8n execution ID
5. **subscription_id** - Stripe subscription ID

### Data Flow Checkpoints

1. **Frontend → API:** User submits generation request
2. **API → Database:** Create generation record
3. **API → n8n:** Trigger workflow
4. **n8n → Supabase:** Get voice profile
5. **n8n → External APIs:** Collect content, research
6. **n8n → Google Drive:** Upload files
7. **n8n → API:** Send completion webhook
8. **API → Database:** Update generation status
9. **API → User:** Send email notification
10. **Frontend → Database:** Poll for updates

### Required Environment Variables

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# n8n Integration
N8N_WEBHOOK_URL=
N8N_API_KEY=
N8N_WEBHOOK_SECRET=

# Payment
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

**End of Data Structure Guide**

This document provides complete data specifications for building the VoiceClone Newsletter Engine. Use this as the source of truth for database schema, API contracts, and data transformations.