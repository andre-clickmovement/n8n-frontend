import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  Mail,
  Eye,
  Hash,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import type { Generation, NewsletterArticle } from '../../types';

interface NewsletterOutputProps {
  generation: Generation;
  onClose?: () => void;
}

export const NewsletterOutput: React.FC<NewsletterOutputProps> = ({
  generation,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const newsletters = generation.newsletters || [];
  const currentNewsletter = newsletters[currentIndex];

  if (!currentNewsletter) {
    return null;
  }

  const handleCopy = async () => {
    const content = currentNewsletter.markdown_content || currentNewsletter.content;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(newsletters.length - 1, prev + 1));
  };

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Generation Complete</h3>
            <p className="text-sm text-slate-500">
              {newsletters.length} newsletters generated • {generation.word_count_total?.toLocaleString()} total words
            </p>
          </div>
        </div>

        {generation.google_drive_folder && (
          <a
            href={generation.google_drive_folder}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors text-sm font-medium"
          >
            <FolderOpen size={18} />
            Open in Google Drive
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Newsletter selector tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {newsletters.map((newsletter, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              index === currentIndex
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Newsletter #{newsletter.idea_number || index + 1}
          </button>
        ))}
      </div>

      {/* Current newsletter display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        {/* Newsletter header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            {currentNewsletter.title}
          </h2>

          {/* Metadata table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Subject Line</p>
                <p className="text-sm text-slate-900 font-medium">{currentNewsletter.subject_line}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Eye size={18} className="text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Preview Text</p>
                <p className="text-sm text-slate-900">{currentNewsletter.preview_text}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Word Count</p>
                <p className="text-sm text-slate-900">{currentNewsletter.word_count} words</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hash size={18} className="text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Newsletter #</p>
                <p className="text-sm text-slate-900">{currentNewsletter.idea_number || currentIndex + 1}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Copy button */}
        <div className="flex justify-end p-4 border-b border-slate-100">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle2 size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy Markdown
              </>
            )}
          </button>
        </div>

        {/* Markdown content */}
        <div className="p-6 md:p-8">
          <article className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-p:leading-relaxed prose-ul:my-4 prose-li:my-1 prose-hr:my-8">
            <ReactMarkdown>
              {currentNewsletter.markdown_content || currentNewsletter.content}
            </ReactMarkdown>
          </article>
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <span className="text-sm text-slate-500">
            {currentIndex + 1} of {newsletters.length}
          </span>

          <button
            onClick={goToNext}
            disabled={currentIndex === newsletters.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
