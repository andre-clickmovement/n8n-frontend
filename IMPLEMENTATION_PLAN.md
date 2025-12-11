# LevRegAI Newsletter Engine - Implementation Complete

## Overview

This frontend has been rebuilt to connect with your n8n workflow for automated newsletter generation. It now supports:

- **Voice Profiles** - Train AI on your unique writing style
- **Multiple Content Sources** - Twitter, YouTube, or Article input
- **5 Newsletters per Generation** - Batch content creation
- **Supabase Authentication** - Real user accounts
- **Generation History** - Track all your past generations
- **Google Drive Integration** - Access generated content

---

## Quick Start

### 1. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema in `supabase/schema.sql`
3. Go to Settings > API and copy your project URL and anon key

### 2. Configure Environment

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Then fill in your values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_N8N_WEBHOOK_URL=https://levreg.app.n8n.cloud/webhook/generate-newsletter
```

### 3. Run Development Server

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

---

## Project Structure

```
├── App.tsx                    # Main app with routing
├── index.tsx                  # React entry point
├── index.html                 # HTML template
├── types.ts                   # TypeScript definitions
├── vite.config.ts             # Vite configuration
├── vercel.json                # Vercel deployment config
│
├── components/
│   ├── LandingPage.tsx        # Auth landing page
│   ├── auth/
│   │   └── AuthForm.tsx       # Sign in/up form
│   ├── dashboard/
│   │   ├── DashboardLayout.tsx    # Main layout with sidebar
│   │   └── VoiceProfilesList.tsx  # Profile cards list
│   ├── voice-profile/
│   │   └── VoiceProfileWizard.tsx # 4-step profile creation
│   └── generation/
│       ├── GenerationForm.tsx     # New generation form
│       └── GenerationHistory.tsx  # Past generations list
│
├── contexts/
│   └── AuthContext.tsx        # Supabase auth state
│
├── services/
│   ├── n8nService.ts          # n8n webhook integration
│   ├── voiceProfileService.ts # Voice profile CRUD
│   └── generationService.ts   # Generation management
│
├── lib/
│   └── supabase.ts            # Supabase client
│
└── supabase/
    └── schema.sql             # Database schema
```

---

## n8n Webhook Integration

The frontend sends the following payload to your n8n webhook:

```json
{
  "user_id": "uuid",
  "profile_id": "uuid",
  "generation_id": "uuid",
  "newsletter": "Newsletter Bytes",
  "content_source": "Twitter",
  "twitter_username": "beehiiv",
  "youtube_url": null,
  "article_content": null,
  "callback_url": "https://your-app.vercel.app/api/webhooks/n8n"
}
```

Your n8n workflow should return:

```json
{
  "execution_id": "n8n-exec-123",
  "user_id": "uuid",
  "status": "completed",
  "newsletters": [...],
  "google_drive_folder": "https://drive.google.com/...",
  "completed_at": "2025-01-20T15:35:22Z"
}
```

---

## User Flow

1. **Landing Page** → User signs up or signs in
2. **Dashboard** → View voice profiles or create new one
3. **Voice Profile Wizard** → 4 steps: Profile Info, Tone & Style, Phrases, Writing Samples
4. **Generate** → Select profile, choose content source (Twitter/YouTube/Article), submit
5. **History** → View past generations, expand to see individual newsletters

---

## Database Tables

- `users` - User accounts (auto-created on signup)
- `voice_profiles` - Voice profile configurations
- `generations` - Generation requests and results
- `subscriptions` - Usage tracking (future billing)

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_N8N_WEBHOOK_URL` | Your n8n webhook endpoint |
| `VITE_CALLBACK_URL` | (Optional) Webhook callback URL |

---

## Next Steps

### To Complete the Integration:

1. **Supabase Setup**
   - Create project and run `supabase/schema.sql`
   - Configure email templates for auth
   - Set up RLS policies are already in schema

2. **n8n Workflow**
   - Ensure your workflow reads `profile_id` and fetches voice profile from Supabase
   - Return the expected response format
   - Optionally POST to callback URL when complete

3. **Vercel Deployment**
   - Connect GitHub repo to Vercel
   - Add environment variables
   - Deploy

### Future Enhancements:

- [ ] Real-time generation status (WebSockets/SSE)
- [ ] Newsletter preview modal
- [ ] Edit voice profile
- [ ] Subscription/billing with Stripe
- [ ] Email delivery integration
- [ ] Analytics dashboard
