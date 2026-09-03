import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signOut as firebaseSignOut,
  subscribeToUserEntries,
  saveJournalEntry,
  deleteJournalEntry,
} from './lib/firebase';
import { JournalEntry, UserProfile } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { HistorySidebar } from './components/HistorySidebar';
import { JournalWorkspace } from './components/JournalWorkspace';
import { BentoInsightsPanel } from './components/BentoInsightsPanel';
import { SecurityModal } from './components/SecurityModal';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // 1. Listen for Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
        setEntries([]);
        setActiveEntry(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper to generate a clean new draft entry
  const createNewDraftEntry = useCallback((userId: string): JournalEntry => {
    const id = 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const now = new Date().toISOString();
    return {
      id,
      userId,
      title: 'Untitled Reflection',
      turns: [],
      tags: ['Daily'],
      createdAt: now,
      updatedAt: now,
    };
  }, []);

  // 2. Subscribe to Firestore entries isolated to the authenticated user
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setActiveEntry(null);
      return;
    }

    setEntriesLoading(true);
    const unsubscribe = subscribeToUserEntries(
      user.uid,
      (userEntries) => {
        setEntries(userEntries);
        setEntriesLoading(false);

        // If no active entry is selected or currently selected is not in userEntries
        setActiveEntry((current) => {
          if (current) {
            const found = userEntries.find((e) => e.id === current.id);
            if (found) return found;
          }
          if (userEntries.length > 0) {
            return userEntries[0];
          }
          return createNewDraftEntry(user.uid);
        });
      },
      (error) => {
        console.error('Failed to subscribe to entries:', error);
        setEntriesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, createNewDraftEntry]);

  // Create a new entry action
  const handleNewEntry = () => {
    if (!user) return;
    const newEntry = createNewDraftEntry(user.uid);
    setActiveEntry(newEntry);
  };

  // Select an existing entry
  const handleSelectEntry = (entry: JournalEntry) => {
    setActiveEntry(entry);
  };

  // Action Insights state
  const [isGeneratingActionInsights, setIsGeneratingActionInsights] = useState(false);
  const [actionInsightsError, setActionInsightsError] = useState<string | null>(null);
  const [actionInsightsNotice, setActionInsightsNotice] = useState<string | null>(null);

  // Update & persist an entry to Cloud Firestore (Guaranteed Transaction Verification)
  const handleUpdateEntry = async (updated: JournalEntry) => {
    if (!user) return;

    setActiveEntry(updated);
    setSaveStatus('saving');

    try {
      await saveJournalEntry(user.uid, updated);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save to Firestore:', err);
      setSaveStatus('error');
    }
  };

  // Generate Reflection → Action Insights
  const handleGenerateActionInsights = async () => {
    if (!activeEntry || !user) return;

    setActionInsightsError(null);
    setActionInsightsNotice(null);

    const turns = activeEntry.turns || [];
    if (turns.length === 0) {
      setActionInsightsNotice(
        'Your reflection conversation is currently empty. Please share your thoughts first before generating Action Insights.'
      );
      return;
    }

    const totalChars = turns.reduce((acc, t) => acc + (t.content?.length || 0), 0);
    if (totalChars < 25) {
      setActionInsightsNotice(
        'Please add a bit more reflection to your conversation (at least 1-2 thoughtful turns) before generating Action Insights.'
      );
      return;
    }

    setIsGeneratingActionInsights(true);

    try {
      const fullText = turns
        .map((t) => `${t.role === 'user' ? 'User' : 'Gemini'}: ${t.content}`)
        .join('\n\n');

      const res = await fetch('/api/gemini/action-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullText,
          turnsCount: turns.length,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate Action Insights from server.');
      }

      const data = await res.json();

      // Non-destructive update: keeps all turns, title, summary, tags, and appends actionInsights
      const updatedEntry: JournalEntry = {
        ...activeEntry,
        actionInsights: {
          mainTheme: data.mainTheme || 'Personal Clarification',
          keyInsight: data.keyInsight || 'Reflecting deeply clarifies focus and alignment.',
          nextAction: data.nextAction || 'Write down one priority goal and complete it today.',
          reflectionQuestion:
            data.reflectionQuestion || 'What is one step you can take today that aligns with this reflection?',
          generatedAt: data.generatedAt || new Date().toISOString(),
          modelUsed: data.modelUsed || 'gemini-3.6-flash',
        },
        updatedAt: new Date().toISOString(),
      };

      await handleUpdateEntry(updatedEntry);
    } catch (err: any) {
      console.error('Action Insights generation error:', err);
      setActionInsightsError(
        err?.message || 'Could not generate Action Insights. Please check your network and retry.'
      );
    } finally {
      setIsGeneratingActionInsights(false);
    }
  };

  // Retry save
  const handleRetrySave = () => {
    if (activeEntry && user) {
      handleUpdateEntry(activeEntry);
    }
  };

  // Delete an entry from Cloud Firestore
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteJournalEntry(user.uid, entryId);
      if (activeEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        if (remaining.length > 0) {
          setActiveEntry(remaining[0]);
        } else {
          setActiveEntry(createNewDraftEntry(user.uid));
        }
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
      alert('Could not delete entry from Firestore. Please check your connection.');
    }
  };

  // Handle user Sign Out
  const handleSignOut = async () => {
    try {
      await firebaseSignOut();
      setUser(null);
      setActiveEntry(null);
      setEntries([]);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  // Initial loading state while verifying Firebase Auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#080A12] flex flex-col items-center justify-center text-[#9AA1B5] font-sans">
        <div className="w-8 h-8 border-2 border-[#7C6CF2]/20 border-t-[#7C6CF2] rounded-full animate-spin mb-3" />
        <p className="text-xs text-[#9AA1B5] font-medium">Verifying authentication...</p>
      </div>
    );
  }

  // If user is not authenticated, show landing page with Google login
  if (!user) {
    return (
      <>
        <LandingPage onOpenSecurity={() => setIsSecurityModalOpen(true)} />
        <SecurityModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
        />
      </>
    );
  }

  // Active Bento Grid Dashboard in Reflectra Theme
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#080A12] text-[#F4F5F9] flex flex-col font-sans selection:bg-[#7C6CF2]/30 selection:text-[#947CFF] relative">
      {/* Aurora Atmospheric Background Lighting & Dot Grid */}
      <div className="aurora-bg">
        <div className="aurora-glow-1" />
        <div className="aurora-glow-2" />
        <div className="aurora-glow-3" />
        <div className="dot-grid-pattern" />
      </div>

      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
      />

      {/* Main Bento Grid Layout: 3 Columns fitting viewport height on desktop without clipping */}
      <main className="flex-1 min-h-0 min-w-0 p-3 sm:p-4 lg:p-4.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4 max-w-[1600px] w-full mx-auto relative z-10 overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Journal History (3 cols) */}
        <div className="col-span-12 lg:col-span-3 h-[520px] lg:h-full min-h-0 min-w-0 flex flex-col">
          <HistorySidebar
            entries={entries}
            activeEntryId={activeEntry?.id || null}
            onSelectEntry={(entry) => {
              setActionInsightsError(null);
              setActionInsightsNotice(null);
              handleSelectEntry(entry);
            }}
            onNewEntry={() => {
              setActionInsightsError(null);
              setActionInsightsNotice(null);
              handleNewEntry();
            }}
            onDeleteEntry={handleDeleteEntry}
            loading={entriesLoading}
          />
        </div>

        {/* Center Column: Reflection Conversation + Bottom Metrics Bar (6 cols) */}
        <div className="col-span-12 lg:col-span-6 h-[660px] lg:h-full min-h-0 min-w-0 flex flex-col gap-2.5 sm:gap-3">
          <div className="flex-1 min-h-0 min-w-0">
            {activeEntry ? (
              <JournalWorkspace
                userId={user.uid}
                entry={activeEntry}
                onUpdateEntry={handleUpdateEntry}
                saveStatus={saveStatus}
                onRetrySave={handleRetrySave}
                isGeneratingActionInsights={isGeneratingActionInsights}
                onGenerateActionInsights={handleGenerateActionInsights}
                actionInsightsNotice={actionInsightsNotice}
                onClearActionInsightsNotice={() => setActionInsightsNotice(null)}
              />
            ) : (
              <div className="bg-[#10131F] rounded-2xl border border-[#272C3D] shadow-xs h-full flex items-center justify-center text-[#9AA1B5] text-sm">
                Select or create a reflection to begin.
              </div>
            )}
          </div>

          {/* Bento Bottom Metrics Bar - Compact and refined */}
          <section className="bg-[#10131F] rounded-2xl border border-[#272C3D] shadow-xs px-4 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#9AA1B5]">Total Entries</span>
                <span className="text-base sm:text-lg font-bold text-[#F4F5F9]">{entries.length}</span>
              </div>
              <div className="w-[1px] h-6 bg-[#272C3D]"></div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#9AA1B5]">Multi-Turn Streak</span>
                <span className="text-base sm:text-lg font-bold text-[#F4F5F9]">
                  {activeEntry?.turns?.length || 0} {activeEntry?.turns?.length === 1 ? 'Turn' : 'Turns'}
                </span>
              </div>
              {activeEntry?.actionInsights && (
                <>
                  <div className="w-[1px] h-6 bg-[#272C3D] hidden sm:block"></div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#947CFF]">Action Insights</span>
                    <span className="text-xs font-semibold text-[#67D9B0] flex items-center gap-1">
                      <span>✓ Ready</span>
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-[#9AA1B5]">
              <div className="w-2 h-2 rounded-full bg-[#67D9B0] animate-pulse"></div>
              <span className="hidden sm:inline">AI Engine Active</span>
              <span className="sm:hidden">AI Engine</span>
            </div>
          </section>
        </div>

        {/* Right Column: Bento Insights Cards (3 cols) */}
        <div className="col-span-12 lg:col-span-3 h-[560px] lg:h-full min-h-0 min-w-0 flex flex-col">
          <BentoInsightsPanel
            entry={activeEntry}
            totalEntries={entries.length}
            onOpenSecurity={() => setIsSecurityModalOpen(true)}
            isGeneratingActionInsights={isGeneratingActionInsights}
            onGenerateActionInsights={handleGenerateActionInsights}
            actionInsightsError={actionInsightsError}
            onRetryActionInsights={handleGenerateActionInsights}
            actionInsightsNotice={actionInsightsNotice}
          />
        </div>
      </main>

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </div>
  );
}

