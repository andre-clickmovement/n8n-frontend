import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/LandingPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { VoiceProfilesList } from './components/dashboard/VoiceProfilesList';
import { VoiceProfileWizard } from './components/voice-profile/VoiceProfileWizard';
import { GenerationForm } from './components/generation/GenerationForm';
import { GenerationHistory } from './components/generation/GenerationHistory';
import { NewsletterOutput } from './components/generation/NewsletterOutput';
import { getVoiceProfiles, createVoiceProfile, deleteVoiceProfile } from './services/voiceProfileService';
import { getGenerations, startGeneration, deleteGeneration } from './services/generationService';
import type { AppView, VoiceProfile, VoiceProfileFormData, Generation, GenerationRequest } from './types';
import { Loader2 } from 'lucide-react';

// History view with auto-polling for processing generations
interface HistoryViewProps {
  generations: Generation[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onDelete: (generationId: string) => Promise<void>;
  deletedIds: Set<string>;
}

function HistoryView({ generations, isLoading, onRefresh, onDelete, deletedIds }: HistoryViewProps) {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  // Filter out deleted generations
  const filteredGenerations = generations.filter(g => !deletedIds.has(g.id));

  // Keep onRefresh ref updated
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Check if there are processing generations
  const hasProcessing = filteredGenerations.some(g => g.status === 'processing' || g.status === 'pending');

  // Auto-poll when there are processing generations
  useEffect(() => {
    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (hasProcessing) {
      console.log('HistoryView: Starting poll - has processing generations');
      pollIntervalRef.current = setInterval(async () => {
        // Prevent overlapping refreshes
        if (isPollingRef.current) {
          return;
        }
        isPollingRef.current = true;
        try {
          await onRefreshRef.current();
        } finally {
          isPollingRef.current = false;
        }
      }, 5000);
    } else {
      console.log('HistoryView: No processing generations - polling stopped');
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hasProcessing]);

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
        generations={filteredGenerations}
        isLoading={isLoading}
        onViewDetails={(gen) => console.log('View details:', gen)}
        onDelete={onDelete}
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
  const [latestGeneration, setLatestGeneration] = useState<Generation | null>(null);
  const [deletedGenerationIds, setDeletedGenerationIds] = useState<Set<string>>(new Set());

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
      const data = await getGenerations(user.id);
      setGenerations(data);

      // Log the status of the latest generation we're tracking (if any)
      if (latestGeneration) {
        const tracked = data.find(g => g.id === latestGeneration.id);
        if (tracked) {
          console.log('Poll: Generation', tracked.id.slice(0, 8), 'status:', tracked.status, 'newsletters:', tracked.newsletters?.length || 0);
        }
      }

      // Update latestGeneration if it exists in the fresh data
      if (latestGeneration) {
        const updated = data.find(g => g.id === latestGeneration.id);
        if (updated) {
          // Only log and update if something changed
          if (updated.status !== latestGeneration.status ||
              updated.newsletters?.length !== latestGeneration.newsletters?.length) {
            console.log('loadGenerations: Status changed!', {
              oldStatus: latestGeneration.status,
              newStatus: updated.status,
              oldNewsletters: latestGeneration.newsletters?.length,
              newNewsletters: updated.newsletters?.length
            });
          }
          setLatestGeneration(updated);
        }
      }
    } catch (error) {
      console.error('Failed to load generations:', error);
    } finally {
      setIsLoadingGenerations(false);
    }
  };

  // Poll for latest generation status when processing
  useEffect(() => {
    if (!latestGeneration) return;
    if (latestGeneration.status !== 'processing' && latestGeneration.status !== 'pending') return;

    const pollInterval = setInterval(() => {
      loadGenerations();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [latestGeneration?.id, latestGeneration?.status]);

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
    console.log('handleGenerate: Starting...', { userId: user?.id, request });
    if (!user) {
      console.error('handleGenerate: No user!');
      return;
    }
    setIsSubmitting(true);
    console.log('handleGenerate: isSubmitting set to true');
    try {
      console.log('handleGenerate: Calling startGeneration...');
      const { generation } = await startGeneration(user.id, request);
      console.log('handleGenerate: startGeneration returned:', generation);
      setGenerations((prev) => [generation, ...prev]);
      setLatestGeneration(generation);
      console.log('handleGenerate: latestGeneration set');
      // Stay on generate view to show progress/output
    } catch (error) {
      console.error('handleGenerate: Error:', error);
      // Don't re-throw - let the UI reset so user can try again
    } finally {
      console.log('handleGenerate: Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleDeleteGeneration = async (generationId: string) => {
    if (!user) return;

    // Immediately add to deleted set so it disappears from UI
    setDeletedGenerationIds(prev => new Set(prev).add(generationId));

    try {
      await deleteGeneration(generationId, user.id);
      // Also remove from state for cleanup
      setGenerations((prev) => prev.filter((g) => g.id !== generationId));
    } catch (error) {
      console.error('Failed to delete generation:', error);
      // If delete failed, remove from deleted set to show it again
      setDeletedGenerationIds(prev => {
        const next = new Set(prev);
        next.delete(generationId);
        return next;
      });
    }
  };

  const handleViewChange = (view: AppView) => {
    setCurrentView(view);
    setSelectedProfile(null);
    // Clear latest generation when navigating away from generate tab
    if (view !== 'generate') {
      setLatestGeneration(null);
    }
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
        // Check generation status
        const isProcessing = latestGeneration?.status === 'processing' || latestGeneration?.status === 'pending';
        const isCompleted = latestGeneration?.status === 'completed' && latestGeneration?.newsletters?.length > 0;
        // Show form if no generation, or if generation failed, or if neither processing nor completed
        const showForm = !latestGeneration || latestGeneration?.status === 'failed' || (!isProcessing && !isCompleted);

        console.log('Generate view state:', {
          latestGeneration: latestGeneration?.id,
          status: latestGeneration?.status,
          hasNewsletters: latestGeneration?.newsletters?.length,
          isProcessing,
          isCompleted,
          showForm,
          isSubmitting
        });

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

            {/* Show processing state */}
            {isProcessing && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Loader2 className="text-amber-600 animate-spin" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Generating Newsletters...</h3>
                    <p className="text-sm text-slate-600">
                      This may take a few minutes. You can check the History tab for updates.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Show completed output */}
            {isCompleted && latestGeneration && (
              <div className="space-y-4">
                <NewsletterOutput
                  generation={latestGeneration}
                  onClose={() => setLatestGeneration(null)}
                />
                <div className="flex justify-center">
                  <button
                    onClick={() => setLatestGeneration(null)}
                    className="px-6 py-3 rounded-xl font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    Generate New Newsletters
                  </button>
                </div>
              </div>
            )}

            {/* Show form when no active generation or failed */}
            {showForm && (
              <div className="max-w-3xl">
                <GenerationForm
                  profiles={profiles}
                  onSubmit={handleGenerate}
                  onCreateProfile={() => setCurrentView('create-profile')}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}
          </div>
        );

      case 'history':
        return (
          <HistoryView
            generations={generations}
            isLoading={isLoadingGenerations}
            onRefresh={loadGenerations}
            onDelete={handleDeleteGeneration}
            deletedIds={deletedGenerationIds}
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
