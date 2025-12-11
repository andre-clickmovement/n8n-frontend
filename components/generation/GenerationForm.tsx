import React, { useState } from 'react';
import {
  Zap,
  Twitter,
  Youtube,
  FileText,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Mic2,
} from 'lucide-react';
import type {
  VoiceProfile,
  GenerationRequest,
  ContentSource,
} from '../../types';
import { validateGenerationRequest } from '../../services/n8nService';

interface GenerationFormProps {
  profiles: VoiceProfile[];
  onSubmit: (request: GenerationRequest) => Promise<void>;
  onCreateProfile: () => void;
  isSubmitting: boolean;
}

export const GenerationForm: React.FC<GenerationFormProps> = ({
  profiles,
  onSubmit,
  onCreateProfile,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<GenerationRequest>({
    profile_id: '',
    newsletter_name: '',
    content_source: 'Twitter' as ContentSource,
    twitter_username: '',
    youtube_url: '',
    article_content: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const readyProfiles = profiles.filter((p) => p.status === 'ready' || p.status === 'approved');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors = validateGenerationRequest(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    await onSubmit(formData);
  };

  const updateFormData = <K extends keyof GenerationRequest>(
    field: K,
    value: GenerationRequest[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const inputClass =
    'w-full px-5 py-4 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400';
  const labelClass =
    'text-sm font-bold text-slate-700 ml-1 mb-2 block uppercase tracking-wide text-xs';

  const contentSourceConfig = {
    Twitter: {
      icon: Twitter,
      label: 'Twitter Account',
      placeholder: 'beehiiv',
      description: 'Enter a Twitter username (without @)',
    },
    YouTube: {
      icon: Youtube,
      label: 'YouTube Video',
      placeholder: 'https://youtube.com/watch?v=...',
      description: 'Paste a YouTube video URL',
    },
    Article: {
      icon: FileText,
      label: 'Article Content',
      placeholder: 'Paste your article content here...',
      description: 'Paste article text (100-50,000 characters)',
    },
  };

  if (readyProfiles.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center shadow-xl shadow-slate-200/60">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mic2 className="text-amber-600" size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Ready Voice Profiles</h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          You need at least one approved voice profile before you can generate newsletters.
        </p>
        <button
          onClick={onCreateProfile}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all duration-200"
        >
          Create Voice Profile
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-indigo-900 opacity-20 rounded-full blur-2xl"></div>

        <div className="flex items-start gap-5 relative z-10">
          <div className="bg-white/20 p-3.5 rounded-xl backdrop-blur-md shadow-inner">
            <Zap className="text-white" size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Generate Newsletters</h3>
            <p className="text-indigo-100 text-sm mt-2 leading-relaxed max-w-md">
              Select a voice profile, choose your content source, and generate 5 newsletter articles
              in your unique writing style.
            </p>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Please fix the following errors:</p>
              <ul className="list-disc list-inside mt-1 text-sm">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-6 md:p-10 border border-slate-100 space-y-8">
        {/* Voice Profile Selection */}
        <div>
          <label className={labelClass}>Voice Profile</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {readyProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => updateFormData('profile_id', profile.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  formData.profile_id === profile.id
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      formData.profile_id === profile.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Mic2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{profile.profile_name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {profile.tone.slice(0, 2).join(', ')}
                    </p>
                  </div>
                  {formData.profile_id === profile.id && (
                    <CheckCircle2 size={20} className="text-indigo-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Newsletter Name */}
        <div>
          <label className={labelClass}>Newsletter Name</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. The Weekly Digest"
            value={formData.newsletter_name}
            onChange={(e) => updateFormData('newsletter_name', e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-2 ml-1">
            The name of the newsletter you're generating content for
          </p>
        </div>

        {/* Content Source */}
        <div>
          <label className={labelClass}>Content Source</label>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {(['Twitter', 'YouTube', 'Article'] as ContentSource[]).map((source) => {
              const config = contentSourceConfig[source];
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => updateFormData('content_source', source)}
                  className={`p-4 rounded-xl border text-center transition-all duration-200 ${
                    formData.content_source === source
                      ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20'
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <config.icon
                    size={24}
                    className={`mx-auto mb-2 ${
                      formData.content_source === source ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      formData.content_source === source ? 'text-indigo-600' : 'text-slate-600'
                    }`}
                  >
                    {source}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content Source Input */}
          <div>
            <label className={labelClass}>{contentSourceConfig[formData.content_source].label}</label>
            {formData.content_source === 'Article' ? (
              <textarea
                className={`${inputClass} min-h-[200px] resize-none`}
                placeholder={contentSourceConfig[formData.content_source].placeholder}
                value={formData.article_content}
                onChange={(e) => updateFormData('article_content', e.target.value)}
              />
            ) : (
              <input
                type={formData.content_source === 'YouTube' ? 'url' : 'text'}
                className={inputClass}
                placeholder={contentSourceConfig[formData.content_source].placeholder}
                value={
                  formData.content_source === 'Twitter'
                    ? formData.twitter_username
                    : formData.youtube_url
                }
                onChange={(e) =>
                  updateFormData(
                    formData.content_source === 'Twitter' ? 'twitter_username' : 'youtube_url',
                    e.target.value
                  )
                }
              />
            )}
            <p className="text-xs text-slate-400 mt-2 ml-1">
              {contentSourceConfig[formData.content_source].description}
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-5 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all duration-300 ${
            isSubmitting
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/40 active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              Starting Generation...
            </>
          ) : (
            <>
              <Zap size={22} fill="currentColor" />
              Generate 5 Newsletters
            </>
          )}
        </button>
      </div>
    </form>
  );
};
