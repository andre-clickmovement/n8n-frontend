import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/LandingPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { VoiceProfilesList } from './components/dashboard/VoiceProfilesList';
import { VoiceProfileWizard } from './components/voice-profile/VoiceProfileWizard';
import { GenerationForm } from './components/generation/GenerationForm';
import { GenerationHistory } from './components/generation/GenerationHistory';
import { getVoiceProfiles, createVoiceProfile, deleteVoiceProfile } from './services/voiceProfileService';
import { getGenerations, startGeneration } from './services/generationService';
import type { AppView, VoiceProfile, VoiceProfileFormData, Generation, GenerationRequest } from './types';
import { Loader2 } from 'lucide-react';

// History view with auto-polling for processing generations
interface HistoryViewProps {
  generations: Generation[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

function HistoryView({ generations, isLoading, onRefresh }: HistoryViewProps) {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Auto-poll when there are processing generations
  useEffect(() => {
    const hasProcessing = generations.some(g => g.status === 'processing' || g.status === 'pending');

    // Clear existing interval first
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (hasProcessing) {
      console.log('HistoryView: Starting poll - has processing generations');
      pollIntervalRef.current = setInterval(async () => {
        // Prevent overlapping refreshes
        if (isPollingRef.current) {
          console.log('HistoryView: Skipping refresh - already in progress');
          return;
        }
        isPollingRef.current = true;
        try {
          await onRefresh();
        } finally {
          isPollingRef.current = false;
        }
      }, 5000); // Increased to 5 seconds
    } else {
      console.log('HistoryView: No processing generations - polling stopped');
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generations.map(g => `${g.id}:${g.status}`).join(',')]);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Generation History
          </h1>
          <p className="text-lg text-slate-500">
            View your past newsletter generations.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </header>

      <GenerationHistory
        generations={generations}
        isLoading={isLoading}
        onViewDetails={(gen) => console.log('View details:', gen)}
      />
    </div>
  );
}

// Main App Content (uses auth context)
function AppContent() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // UI State
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedProfile, setSelectedProfile] = useState<VoiceProfile | null>(null);

  // Data State
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);

  // Loading States
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfiles();
      loadGenerations();
    }
  }, [isAuthenticated, user]);

  const loadProfiles = async () => {
    if (!user) return;
    setIsLoadingProfiles(true);
    try {
      const data = await getVoiceProfiles(user.id);
      setProfiles(data);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const loadGenerations = async () => {
    if (!user) return;
    setIsLoadingGenerations(true);
    try {
      console.log('Loading generations for user:', user.id);
      const data = await getGenerations(user.id);
      console.log('Generations loaded:', data?.length || 0, 'items');
      setGenerations(data);
    } catch (error) {
      console.error('Failed to load generations:', error);
    } finally {
      setIsLoadingGenerations(false);
    }
  };

  const handleCreateProfile = async (formData: VoiceProfileFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const newProfile = await createVoiceProfile(user.id, formData);
      setProfiles((prev) => [newProfile, ...prev]);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Failed to create profile:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this voice profile?')) return;
    try {
      await deleteVoiceProfile(profileId);
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  const handleGenerate = async (request: GenerationRequest) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { generation } = await startGeneration(user.id, request);
      setGenerations((prev) => [generation, ...prev]);
      setCurrentView('history');
      // HistoryView will auto-poll for status updates when there are processing generations
    } catch (error) {
      console.error('Failed to start generation:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewChange = (view: AppView) => {
    setCurrentView(view);
    setSelectedProfile(null);
  };

  const handleSelectProfileForGeneration = (profileId: string) => {
    setCurrentView('generate');
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show landing page
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <header>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Voice Profiles
              </h1>
              <p className="text-lg text-slate-500">
                Create and manage AI voice profiles for your newsletters.
              </p>
            </header>

            <VoiceProfilesList
              profiles={profiles}
              isLoading={isLoadingProfiles}
              onCreateNew={() => setCurrentView('create-profile')}
              onSelect={(profile) => {
                setSelectedProfile(profile);
                setCurrentView('create-profile');
              }}
              onDelete={handleDeleteProfile}
              onGenerate={handleSelectProfileForGeneration}
            />
          </div>
        );

      case 'create-profile':
        return (
          <div className="max-w-3xl mx-auto">
            <VoiceProfileWizard
              initialData={selectedProfile || undefined}
              onSubmit={handleCreateProfile}
              onCancel={() => {
                setSelectedProfile(null);
                setCurrentView('dashboard');
              }}
              isSubmitting={isSubmitting}
            />
          </div>
        );

      case 'generate':
        return (
          <div className="space-y-8">
            <header>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Generate Newsletters
              </h1>
              <p className="text-lg text-slate-500">
                Create 5 newsletter articles from any content source.
              </p>
            </header>

            <div className="max-w-3xl">
              <GenerationForm
                profiles={profiles}
                onSubmit={handleGenerate}
                onCreateProfile={() => setCurrentView('create-profile')}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        );

      case 'history':
        return (
          <HistoryView
            generations={generations}
            isLoading={isLoadingGenerations}
            onRefresh={loadGenerations}
          />
        );

      case 'settings':
        return (
          <div className="space-y-8">
            <header>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Settings
              </h1>
              <p className="text-lg text-slate-500">
                Manage your account and preferences.
              </p>
            </header>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Name</label>
                  <p className="text-lg text-slate-900">{user?.full_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Email</label>
                  <p className="text-lg text-slate-900">{user?.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Member Since</label>
                  <p className="text-lg text-slate-900">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout currentView={currentView} onViewChange={handleViewChange}>
      {renderView()}
    </DashboardLayout>
  );
}

// Root App with Auth Provider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
