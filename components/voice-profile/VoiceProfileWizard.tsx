import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Mic2,
  PenTool,
  MessageSquare,
  FileText,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import type {
  VoiceProfileFormData,
  ToneOption,
  SentenceStyle,
  VocabularyLevel,
  ParagraphPattern,
  WritingSample,
} from '../../types';
import { TONE_OPTIONS } from '../../types';

interface VoiceProfileWizardProps {
  initialData?: Partial<VoiceProfileFormData>;
  onSubmit: (data: VoiceProfileFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const STEPS = [
  { id: 1, title: 'Profile Info', icon: Mic2 },
  { id: 2, title: 'Tone & Style', icon: PenTool },
  { id: 3, title: 'Phrases', icon: MessageSquare },
  { id: 4, title: 'Writing Samples', icon: FileText },
];

const DEFAULT_FORM_DATA: VoiceProfileFormData = {
  profile_name: '',
  newsletter_name: '',
  tone: [],
  formality: 3,
  detail_level: 3,
  sentence_style: 'mixed' as SentenceStyle,
  vocabulary_level: 'professional' as VocabularyLevel,
  common_phrases: [],
  avoid_phrases: [],
  uses_questions: false,
  uses_data: false,
  uses_anecdotes: false,
  uses_metaphors: false,
  uses_humor: false,
  paragraph_pattern: 'short_mixed' as ParagraphPattern,
  samples: [],
};

export const VoiceProfileWizard: React.FC<VoiceProfileWizardProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<VoiceProfileFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  });
  const [newPhrase, setNewPhrase] = useState('');
  const [newAvoidPhrase, setNewAvoidPhrase] = useState('');
  const [newSample, setNewSample] = useState<WritingSample>({ text: '', source: 'newsletter' });

  const handleNext = () => setStep((prev) => Math.min(prev + 1, STEPS.length));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const updateFormData = <K extends keyof VoiceProfileFormData>(
    field: K,
    value: VoiceProfileFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTone = (tone: ToneOption) => {
    const current = formData.tone;
    if (current.includes(tone)) {
      updateFormData('tone', current.filter((t) => t !== tone));
    } else if (current.length < 5) {
      updateFormData('tone', [...current, tone]);
    }
  };

  const addPhrase = (type: 'common' | 'avoid') => {
    const phrase = type === 'common' ? newPhrase : newAvoidPhrase;
    if (!phrase.trim()) return;

    if (type === 'common') {
      updateFormData('common_phrases', [...formData.common_phrases, phrase.trim()]);
      setNewPhrase('');
    } else {
      updateFormData('avoid_phrases', [...formData.avoid_phrases, phrase.trim()]);
      setNewAvoidPhrase('');
    }
  };

  const removePhrase = (type: 'common' | 'avoid', index: number) => {
    if (type === 'common') {
      updateFormData('common_phrases', formData.common_phrases.filter((_, i) => i !== index));
    } else {
      updateFormData('avoid_phrases', formData.avoid_phrases.filter((_, i) => i !== index));
    }
  };

  const addSample = () => {
    if (!newSample.text.trim()) return;
    updateFormData('samples', [...formData.samples, { ...newSample }]);
    setNewSample({ text: '', source: 'newsletter' });
  };

  const removeSample = (index: number) => {
    updateFormData('samples', formData.samples.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.profile_name.length > 0;
      case 2:
        return formData.tone.length >= 1;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const inputClass =
    'w-full px-5 py-4 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400';
  const labelClass = 'text-sm font-bold text-slate-700 ml-1 mb-2 block uppercase tracking-wide text-xs';

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div>
              <label className={labelClass}>Profile Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. My Newsletter Voice"
                value={formData.profile_name}
                onChange={(e) => updateFormData('profile_name', e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2 ml-1">
                A memorable name for this voice profile
              </p>
            </div>

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
                The name of the newsletter you're creating content for
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div>
              <label className={labelClass}>Tone (Select up to 5)</label>
              <div className="grid grid-cols-3 gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone}
                    onClick={() => toggleTone(tone)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      formData.tone.includes(tone)
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-600'
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Formality (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.formality}
                  onChange={(e) => updateFormData('formality', parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Casual</span>
                  <span>Formal</span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Detail Level (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detail_level}
                  onChange={(e) => updateFormData('detail_level', parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Brief</span>
                  <span>Comprehensive</span>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Sentence Style</label>
              <div className="grid grid-cols-3 gap-3">
                {(['short', 'mixed', 'flowing'] as SentenceStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => updateFormData('sentence_style', style)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 capitalize ${
                      formData.sentence_style === style
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-600'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Signature Elements</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'uses_questions', label: 'Uses Questions' },
                  { key: 'uses_data', label: 'Uses Data/Stats' },
                  { key: 'uses_anecdotes', label: 'Uses Anecdotes' },
                  { key: 'uses_metaphors', label: 'Uses Metaphors' },
                  { key: 'uses_humor', label: 'Uses Humor' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() =>
                      updateFormData(
                        key as keyof VoiceProfileFormData,
                        !formData[key as keyof VoiceProfileFormData]
                      )
                    }
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      formData[key as keyof VoiceProfileFormData]
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-600'
                    }`}
                  >
                    {formData[key as keyof VoiceProfileFormData] && <CheckCircle2 size={16} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div>
              <label className={labelClass}>Phrases You Use Often</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Here's the thing:"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPhrase('common')}
                />
                <button
                  onClick={() => addPhrase('common')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.common_phrases.map((phrase, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm"
                  >
                    "{phrase}"
                    <button
                      onClick={() => removePhrase('common', index)}
                      className="hover:text-indigo-900"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Phrases to Avoid</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  className={inputClass}
                  placeholder='e.g. "dive deep"'
                  value={newAvoidPhrase}
                  onChange={(e) => setNewAvoidPhrase(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPhrase('avoid')}
                />
                <button
                  onClick={() => addPhrase('avoid')}
                  className="px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-500 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.avoid_phrases.map((phrase, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm"
                  >
                    "{phrase}"
                    <button
                      onClick={() => removePhrase('avoid', index)}
                      className="hover:text-red-900"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div>
              <label className={labelClass}>Writing Samples (Optional but Recommended)</label>
              <p className="text-sm text-slate-500 mb-4">
                Paste examples of <strong>your own writing</strong> to help AI learn your unique voice and style.
                These samples teach the AI how you write, not what topics to cover.
              </p>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Where is this sample from?</label>
                  <select
                    className={inputClass}
                    value={newSample.source}
                    onChange={(e) =>
                      setNewSample({
                        ...newSample,
                        source: e.target.value as WritingSample['source'],
                      })
                    }
                  >
                    <option value="newsletter">Previous Newsletter</option>
                    <option value="blog">Blog Post I Wrote</option>
                    <option value="twitter">My Twitter/X Posts</option>
                    <option value="email">Email I Wrote</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Sample Text</label>
                  <textarea
                    className={`${inputClass} min-h-[150px] resize-none`}
                    placeholder="Paste a sample of YOUR writing here. This helps the AI capture your voice, tone, and unique writing style..."
                    value={newSample.text}
                    onChange={(e) => setNewSample({ ...newSample, text: e.target.value })}
                  />
                </div>

                <input
                  type="url"
                  className={inputClass}
                  placeholder="Source URL (optional)"
                  value={newSample.url || ''}
                  onChange={(e) => setNewSample({ ...newSample, url: e.target.value })}
                />

                <button
                  onClick={addSample}
                  disabled={!newSample.text.trim()}
                  className="w-full py-3 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Writing Sample
                </button>
              </div>

              {formData.samples.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-700">
                    Added Samples ({formData.samples.length})
                  </h4>
                  {formData.samples.map((sample, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-indigo-600 uppercase">
                            {sample.source}
                          </span>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{sample.text}</p>
                        </div>
                        <button
                          onClick={() => removeSample(index)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
      {/* Progress Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Voice Profile' : 'Create Voice Profile'}
          </h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, index) => (
            <React.Fragment key={s.id}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  step === s.id
                    ? 'bg-indigo-600 text-white'
                    : step > s.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <s.icon size={16} />
                <span className="text-sm font-medium hidden sm:inline">{s.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${step > s.id ? 'bg-indigo-300' : 'bg-slate-200'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 md:p-10">{renderStep()}</div>

      {/* Navigation Footer */}
      <div className="p-6 border-t border-slate-100 flex items-center justify-between">
        {step > 1 ? (
          <button
            onClick={handleBack}
            className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} /> Back
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-800 font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}

        {step < STEPS.length ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300 ${
              canProceed()
                ? 'bg-slate-900 hover:bg-indigo-600 hover:shadow-indigo-500/30'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            Continue <ArrowRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Create Profile
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
