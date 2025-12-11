import React from 'react';
import {
  Mic2,
  Plus,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Trash2,
  Edit3,
} from 'lucide-react';
import type { VoiceProfile, VoiceProfileStatus } from '../../types';

interface VoiceProfilesListProps {
  profiles: VoiceProfile[];
  isLoading: boolean;
  onCreateNew: () => void;
  onSelect: (profile: VoiceProfile) => void;
  onDelete: (profileId: string) => void;
  onGenerate: (profileId: string) => void;
}

const StatusBadge: React.FC<{ status: VoiceProfileStatus }> = ({ status }) => {
  const config = {
    draft: { icon: Edit3, label: 'Draft', className: 'bg-slate-100 text-slate-600' },
    analyzing: { icon: Clock, label: 'Analyzing', className: 'bg-amber-100 text-amber-700' },
    ready: { icon: CheckCircle2, label: 'Ready', className: 'bg-green-100 text-green-700' },
    approved: { icon: CheckCircle2, label: 'Approved', className: 'bg-indigo-100 text-indigo-700' },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

export const VoiceProfilesList: React.FC<VoiceProfilesListProps> = ({
  profiles,
  isLoading,
  onCreateNew,
  onSelect,
  onDelete,
  onGenerate,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mic2 className="text-indigo-600" size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Voice Profiles Yet</h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Create your first voice profile to train AI on your unique writing style and start
          generating newsletters.
        </p>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all duration-200"
        >
          <Plus size={18} />
          Create Voice Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create New Card */}
      <button
        onClick={onCreateNew}
        className="w-full bg-white rounded-2xl p-6 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200 group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center transition-colors">
            <Plus className="text-slate-400 group-hover:text-indigo-600" size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Create New Voice Profile
            </h3>
            <p className="text-sm text-slate-500">Train AI on a new writing style</p>
          </div>
        </div>
      </button>

      {/* Profile Cards */}
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mic2 className="text-white" size={24} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{profile.profile_name}</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={profile.status} />
                    {profile.newsletter_name && (
                      <span className="text-xs text-slate-500">{profile.newsletter_name}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(profile.status === 'ready' || profile.status === 'approved') && (
                    <button
                      onClick={() => onGenerate(profile.id)}
                      className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Generate with this profile"
                    >
                      <Zap size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => onSelect(profile)}
                    className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Edit profile"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(profile.id)}
                    className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete profile"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-slate-500">Tone:</span>{' '}
                  <span className="font-medium text-slate-700">
                    {profile.tone.slice(0, 3).join(', ')}
                    {profile.tone.length > 3 && ` +${profile.tone.length - 3}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Generations:</span>{' '}
                  <span className="font-medium text-slate-700">{profile.total_generations}</span>
                </div>
                {profile.average_rating && (
                  <div>
                    <span className="text-slate-500">Avg Rating:</span>{' '}
                    <span className="font-medium text-slate-700">
                      {profile.average_rating.toFixed(1)}/5
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
