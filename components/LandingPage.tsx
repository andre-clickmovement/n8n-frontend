import React, { useState } from 'react';
import { Zap, LayoutTemplate, CheckCircle2, BarChart3, Mic2, FileText } from 'lucide-react';
import { AuthForm } from './auth/AuthForm';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, isLoading } = useAuth();

  const handleAuthSubmit = async (data: { email: string; password: string; fullName?: string }) => {
    setError(null);

    if (authMode === 'signup') {
      const { error } = await signUp(data.email, data.password, data.fullName || '');
      if (error) {
        setError(error.message);
      }
    } else {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        setError(error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-6 md:px-12 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-100">
        <div className="flex items-center gap-3 text-slate-900">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <LayoutTemplate className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">
            LevReg<span className="text-indigo-600">AI</span>
          </span>
        </div>
        <button
          onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
          className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors hidden md:block"
        >
          {authMode === 'signup' ? 'Already have access? Sign in' : 'Need an account? Sign up'}
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-6 md:px-12 py-12 lg:py-20 gap-16 items-center">
        {/* Left Content */}
        <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wide">
            <Zap size={14} fill="currentColor" />
            <span>AI-Powered Newsletter Engine</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
            Your voice,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              amplified by AI.
            </span>
          </h1>

          <p className="text-xl text-slate-500 leading-relaxed max-w-xl">
            Train AI to write in your unique voice. Generate 5 newsletter articles from any Twitter
            account, YouTube video, or article in minutes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
              <Mic2 className="text-indigo-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold text-slate-900">Voice Profiles</h4>
                <p className="text-sm text-slate-500">Train AI on your writing style and tone.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
              <FileText className="text-indigo-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold text-slate-900">Multiple Sources</h4>
                <p className="text-sm text-slate-500">Twitter, YouTube, or paste any article.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
              <CheckCircle2 className="text-indigo-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold text-slate-900">5 Articles Per Run</h4>
                <p className="text-sm text-slate-500">Get a week's worth of content instantly.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
              <BarChart3 className="text-indigo-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold text-slate-900">Google Drive Export</h4>
                <p className="text-sm text-slate-500">Articles saved automatically to your Drive.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
          <AuthForm
            mode={authMode}
            onSubmit={handleAuthSubmit}
            onToggleMode={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
            isLoading={isLoading}
            error={error}
          />

        </div>
      </div>
    </div>
  );
};
