import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  FileText,
  Twitter,
  Youtube,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import type { Generation, GenerationStatus, NewsletterArticle } from '../../types';

interface GenerationHistoryProps {
  generations: Generation[];
  isLoading: boolean;
  onViewDetails: (generation: Generation) => void;
  onDelete?: (generationId: string) => Promise<void>;
}

const StatusBadge: React.FC<{ status: GenerationStatus }> = ({ status }) => {
  const config = {
    pending: {
      icon: Clock,
      label: 'Pending',
      className: 'bg-slate-100 text-slate-600',
    },
    processing: {
      icon: Loader2,
      label: 'Processing',
      className: 'bg-amber-100 text-amber-700',
      animate: true,
    },
    completed: {
      icon: CheckCircle2,
      label: 'Completed',
      className: 'bg-green-100 text-green-700',
    },
    failed: {
      icon: AlertCircle,
      label: 'Failed',
      className: 'bg-red-100 text-red-700',
    },
  };

  const statusConfig = config[status] || config.pending;
  const Icon = statusConfig.icon;
  const { label, className } = statusConfig;
  const animate = 'animate' in statusConfig ? statusConfig.animate : false;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
    >
      <Icon size={14} className={animate ? 'animate-spin' : ''} />
      {label}
    </span>
  );
};

const ContentSourceIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type?.toLowerCase()) {
    case 'twitter':
      return <Twitter size={16} className="text-blue-400" />;
    case 'youtube':
      return <Youtube size={16} className="text-red-500" />;
    default:
      return <FileText size={16} className="text-slate-400" />;
  }
};

interface NewsletterCardProps {
  newsletter: NewsletterArticle;
  index: number;
}

const NewsletterCard: React.FC<NewsletterCardProps> = ({ newsletter, index }) => {
  const [isContentExpanded, setIsContentExpanded] = React.useState(false);

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              #{newsletter.idea_number || index + 1}
            </span>
            <span className="text-xs text-slate-400">
              {newsletter.word_count} words
            </span>
          </div>
          <h4 className="font-medium text-slate-900 mb-1">{newsletter.title}</h4>
          <p className="text-sm text-slate-500 mb-2">
            <span className="font-medium">Subject:</span> {newsletter.subject_line}
          </p>
          <p className="text-sm text-slate-400 italic">
            {newsletter.preview_text}
          </p>
        </div>
        <button
          onClick={() => setIsContentExpanded(!isContentExpanded)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          {isContentExpanded ? 'Hide Content' : 'View Content'}
        </button>
      </div>

      {isContentExpanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="prose prose-sm max-w-none prose-slate">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans overflow-x-auto">
              {newsletter.markdown_content || newsletter.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

interface GenerationCardProps {
  generation: Generation;
  onViewDetails: (generation: Generation) => void;
  onDelete?: (generationId: string) => Promise<void>;
}

const GenerationCard: React.FC<GenerationCardProps> = ({ generation, onViewDetails, onDelete }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this generation?')) return;

    setIsDeleting(true);
    try {
      await onDelete(generation.id);
    } catch (error) {
      console.error('Failed to delete generation:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <ContentSourceIcon type={generation.content_type} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-bold text-slate-900">{generation.content_source || 'Generation'}</h3>
                <StatusBadge status={generation.status} />
              </div>
              <p className="text-sm text-slate-500">{formatDate(generation.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {generation.status === 'completed' && generation.google_drive_folder && (
              <a
                href={generation.google_drive_folder}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-sm font-medium"
              >
                <FolderOpen size={16} />
                Google Drive
                <ExternalLink size={14} />
              </a>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                title="Delete generation"
              >
                {isDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        {generation.status === 'completed' && (
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div>
              <span className="text-slate-500">Articles:</span>{' '}
              <span className="font-medium text-slate-700">
                {generation.newsletters?.length || 0}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Words:</span>{' '}
              <span className="font-medium text-slate-700">
                {generation.word_count_total?.toLocaleString() || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Duration:</span>{' '}
              <span className="font-medium text-slate-700">
                {formatDuration(generation.execution_time_seconds)}
              </span>
            </div>
          </div>
        )}

        {generation.status === 'failed' && generation.error_message && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-600">
            {generation.error_message}
          </div>
        )}
      </div>

      {/* Expandable Newsletter List */}
      {generation.status === 'completed' && generation.newsletters && generation.newsletters.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span>View {generation.newsletters.length} Generated Newsletters</span>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {isExpanded && (
            <div className="border-t border-slate-100 divide-y divide-slate-100">
              {generation.newsletters.map((newsletter, index) => (
                <NewsletterCard key={index} newsletter={newsletter} index={index} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  generations,
  isLoading,
  onViewDetails,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Clock className="text-slate-400" size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Generations Yet</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Your newsletter generation history will appear here once you start generating content.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {generations.map((generation) => (
        <GenerationCard
          key={generation.id}
          generation={generation}
          onViewDetails={onViewDetails}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
