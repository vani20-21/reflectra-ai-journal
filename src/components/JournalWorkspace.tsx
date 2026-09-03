import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { JournalEntry, JournalTurn, ReflectionMode } from '../types';
import { SummaryModal } from './SummaryModal';
import {
  Send,
  Sparkles,
  RefreshCw,
  Lightbulb,
  FileText,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Tag as TagIcon,
  Bot,
  User,
  Wand2,
  Save,
  Flame,
  Compass,
} from 'lucide-react';

interface JournalWorkspaceProps {
  userId: string;
  entry: JournalEntry;
  onUpdateEntry: (updated: JournalEntry) => Promise<void>;
  saveStatus: 'saved' | 'saving' | 'error';
  onRetrySave: () => void;
  isGeneratingActionInsights?: boolean;
  onGenerateActionInsights?: () => void;
  actionInsightsNotice?: string | null;
  onClearActionInsightsNotice?: () => void;
}

const STARTER_PROMPTS = [
  'What was a meaningful highlight or win from today, and what made it special?',
  'What felt draining or challenging, and what can I learn from it?',
  'What is a persistent thought on my mind that I need to unpack?',
  'How do I want to approach tomorrow with clarity and focus?',
];

export const JournalWorkspace: React.FC<JournalWorkspaceProps> = ({
  userId,
  entry,
  onUpdateEntry,
  saveStatus,
  onRetrySave,
  isGeneratingActionInsights = false,
  onGenerateActionInsights,
  actionInsightsNotice = null,
  onClearActionInsightsNotice,
}) => {
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<ReflectionMode>('reflect');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(entry.title || 'Untitled Reflection');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const turnsEndRef = useRef<HTMLDivElement>(null);

  // Synchronize title when entry changes
  useEffect(() => {
    setTitleInput(entry.title || 'Untitled Reflection');
  }, [entry.id, entry.title]);

  // Scroll to bottom when turns change
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.turns, isGenerating]);

  // Handle saving title change
  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== entry.title) {
      await onUpdateEntry({
        ...entry,
        title: titleInput.trim(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Submit a new reflection turn to Gemini and Firestore
  const handleSubmitTurn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputText.trim();
    if (!prompt || isGenerating) return;

    setApiError(null);
    setIsGenerating(true);

    const userTurnId = 'turn_' + Date.now() + '_user';
    const newUserTurn: JournalTurn = {
      id: userTurnId,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
      mode,
    };

    // Optimistically update entry with user prompt
    const updatedTurns = [...(entry.turns || []), newUserTurn];
    const intermediateEntry: JournalEntry = {
      ...entry,
      turns: updatedTurns,
      updatedAt: new Date().toISOString(),
    };

    // Temporary keep input text in case of complete write failure
    const submittedText = prompt;
    setInputText('');

    try {
      // 1. Send to server-side Gemini endpoint with resilient fallback
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: submittedText,
          history: entry.turns || [],
          mode,
          title: entry.title,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate reflection.`);
      }

      const data = await response.json();
      const assistantText = data.text || 'Reflecting on your entry...';
      const modelUsed = data.modelUsed || 'gemini-3.6-flash';

      const assistantTurnId = 'turn_' + Date.now() + '_assistant';
      const newAssistantTurn: JournalTurn = {
        id: assistantTurnId,
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
        mode,
        modelUsed,
      };

      const finalTurns = [...updatedTurns, newAssistantTurn];

      // Auto-title if this is the first turn and title is default
      let newTitle = entry.title;
      if ((!newTitle || newTitle === 'Untitled Reflection') && finalTurns.length >= 2) {
        newTitle = submittedText.slice(0, 36) + (submittedText.length > 36 ? '...' : '');
        setTitleInput(newTitle);
      }

      const finalEntry: JournalEntry = {
        ...entry,
        title: newTitle,
        turns: finalTurns,
        updatedAt: new Date().toISOString(),
      };

      // 2. Guaranteed Transaction Verification: Save full state to Cloud Firestore
      await onUpdateEntry(finalEntry);
    } catch (err: any) {
      console.error('Error during reflection generation or save:', err);
      setApiError(err?.message || 'Failed to generate reflection response.');
      // Restore input text if operation failed early
      setInputText(submittedText);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate an automated summary, evocative title, and tags
  const handleAutoSummarize = async () => {
    if (isSummarizing || !entry.turns || entry.turns.length === 0) return;

    setIsSummarizing(true);
    setApiError(null);

    try {
      const fullText = entry.turns
        .map((t) => `${t.role === 'user' ? 'User' : 'Gemini'}: ${t.content}`)
        .join('\n\n');

      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: fullText }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary.');
      }

      const data = await response.json();

      const updated: JournalEntry = {
        ...entry,
        title: data.suggestedTitle || entry.title,
        summary: data.summary || entry.summary,
        tags: Array.isArray(data.tags) ? data.tags : entry.tags,
        reflectionQuestion: data.reflectionQuestion || entry.reflectionQuestion,
        updatedAt: new Date().toISOString(),
      };

      setTitleInput(updated.title);
      await onUpdateEntry(updated);
      setIsSummaryModalOpen(true);
    } catch (err: any) {
      console.error('Summarize error:', err);
      setApiError(err?.message || 'Failed to synthesize summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="bg-[#10131F] rounded-2xl border border-[#272C3D] shadow-xs flex flex-col h-full relative overflow-hidden select-none">
      {/* Top Header / Meta Controls */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#272C3D] bg-[#0D101A]/90 flex flex-col gap-2.5 shrink-0">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* Editable Title */}
          {isEditingTitle ? (
            <div className="flex items-center space-x-2 w-full max-w-md">
              <input
                id="edit-title-input"
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                className="text-base sm:text-lg font-semibold bg-[#171B29] border border-[#7C6CF2] rounded-xl px-2.5 py-0.5 text-[#F4F5F9] focus:outline-none focus:ring-2 focus:ring-[#7C6CF2]/30 w-full shadow-xs"
              />
              <button
                onClick={handleSaveTitle}
                className="text-xs px-3 py-1 bg-[#7C6CF2] hover:bg-[#947CFF] text-white rounded-lg font-medium cursor-pointer transition-colors shadow-xs shrink-0"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2.5 group min-w-0">
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="text-base sm:text-lg font-semibold text-[#F4F5F9] truncate cursor-pointer hover:text-[#947CFF] transition-colors"
                title="Click to rename reflection"
              >
                {entry.title || 'Untitled Reflection'}
              </h2>
              <span
                onClick={() => setIsEditingTitle(true)}
                className="text-xs text-[#9AA1B5] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-[#947CFF] underline shrink-0"
              >
                Rename
              </span>
            </div>
          )}
        </div>

        {/* Metadata & Actions Bar: Clean responsive flexbox with wrapping */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          {/* Left Metadata: Date and All Topic Tags */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
            {/* Date and time */}
            <span className="inline-flex items-center gap-1.5 text-xs text-[#9AA1B5] shrink-0">
              <Clock className="w-3.5 h-3.5 text-[#9AA1B5]" />
              <span>
                {new Date(entry.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>

            {/* All Topic Tags with flex-wrap - never clipped, cut off, or overlapping */}
            {Array.isArray(entry.tags) && entry.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <TagIcon className="w-3 h-3 text-[#9AA1B5] shrink-0" />
                {entry.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-[#171B29] text-[#9AA1B5] font-medium border border-[#272C3D] whitespace-nowrap"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Controls: Firestore Status + Synthesize + View Summary + Action Insights */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Firestore Status Badge */}
            <div className="text-xs flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-[#171B29] border border-[#272C3D] shrink-0">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-3 h-3 border-2 border-[#7C6CF2] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#947CFF] text-[11px] font-medium">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#67D9B0]" />
                  <span className="text-[#9AA1B5] text-[11px] font-medium">Firestore Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <button
                  onClick={onRetrySave}
                  className="flex items-center space-x-1 text-rose-400 text-[11px] font-medium hover:underline cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Retry Save</span>
                </button>
              )}
            </div>

            {/* Synthesize / Summarize Button */}
            <button
              id="auto-summarize-button"
              onClick={handleAutoSummarize}
              disabled={isSummarizing || !entry.turns || entry.turns.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#171B29] hover:bg-[#171B29]/80 text-[#9AA1B5] hover:text-[#F4F5F9] border border-[#272C3D] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              title="Generate title, summary, and key takeaways using Gemini 3.6 Flash"
            >
              {isSummarizing ? (
                <>
                  <div className="w-3 h-3 border-2 border-[#9AA1B5] border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-[#7C6CF2]" />
                  <span>Synthesize Summary</span>
                </>
              )}
            </button>

            {/* Compact View Summary Button (available whenever entry has a summary) */}
            {entry.summary && (
              <button
                id="view-summary-button"
                onClick={() => setIsSummaryModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#7C6CF2]/15 hover:bg-[#7C6CF2]/25 text-[#947CFF] hover:text-[#B8A6FF] border border-[#7C6CF2]/30 hover:border-[#7C6CF2]/50 transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                title="Open Executive Summary, tags, and reflection inquiry modal"
              >
                <FileText className="w-3.5 h-3.5 text-[#947CFF]" />
                <span>View Summary</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#67D9B0]" />
              </button>
            )}

            {/* Generate / Regenerate Action Insights Button */}
            <button
              id="generate-action-insights-button"
              onClick={onGenerateActionInsights}
              disabled={isGeneratingActionInsights}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs whitespace-nowrap shrink-0 ${
                entry.actionInsights
                  ? 'bg-[#171B29] hover:bg-[#171B29]/80 text-[#F4F5F9] border border-[#7C6CF2]/30 hover:border-[#7C6CF2]/50'
                  : 'bg-[#7C6CF2] hover:bg-[#947CFF] text-white shadow-xs shadow-[#7C6CF2]/20'
              }`}
              title="Distill this conversation into 4 clear action items: Main Theme, Key Insight, Next Action, and Reflection Question"
            >
              {isGeneratingActionInsights ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Extracting Actions...</span>
                </>
              ) : (
                <>
                  <Compass className={`w-3.5 h-3.5 ${entry.actionInsights ? 'text-[#947CFF]' : 'text-white'}`} />
                  <span>{entry.actionInsights ? 'Regenerate Action Insights' : 'Generate Action Insights'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Action Insights Guidance Notice */}
      {actionInsightsNotice && (
        <div className="bg-[#FBBF24]/10 border-b border-[#FBBF24]/20 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-[#FBBF24] shrink-0">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#FBBF24] shrink-0" />
            <span>{actionInsightsNotice}</span>
          </div>
          {onClearActionInsightsNotice && (
            <button
              onClick={onClearActionInsightsNotice}
              className="text-[#FBBF24] hover:text-amber-200 text-xs font-medium underline ml-3 cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Conversation / Turns Stream - Flexible Height Internal Scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
        {(!entry.turns || entry.turns.length === 0) && (
          <div className="max-w-xl mx-auto py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#6366F1] mx-auto mb-3 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[#F5F5F7]">Start Your Reflection</h3>
            <p className="text-xs sm:text-sm text-[#71717A] mt-1 max-w-sm mx-auto leading-relaxed">
              Write whatever is on your mind. Recount your day, work through an emotion, or brainstorm an idea.
            </p>

            {/* Prompt Starters */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
              {STARTER_PROMPTS.map((starter, index) => (
                <button
                  key={index}
                  onClick={() => setInputText(starter)}
                  className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] text-xs text-[#A1A1AA] hover:text-[#F5F5F7] transition-all cursor-pointer text-left leading-relaxed"
                >
                  &ldquo;{starter}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render Multi-Turn History */}
        {entry.turns?.map((turn) => {
          const isUser = turn.role === 'user';

          if (isUser) {
            return (
              <div key={turn.id} className="flex gap-3.5 max-w-2xl ml-auto justify-end">
                <div className="space-y-1 max-w-[85%]">
                  <div className="flex items-center justify-end gap-1.5 text-[11px] text-[#71717A]">
                    <span className="font-bold uppercase text-[10px] text-[#A78BFA]">You</span>
                    <span>&bull;</span>
                    <span>
                      {new Date(turn.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {turn.mode && (
                      <span className="px-2 py-0.2 rounded-full bg-white/[0.04] text-[#A1A1AA] font-medium text-[9px] border border-white/[0.06]">
                        {turn.mode}
                      </span>
                    )}
                  </div>
                  <div className="bg-[rgba(24,24,36,0.85)] border border-white/[0.08] p-4 rounded-2xl rounded-tr-none text-sm text-[#F5F5F7] leading-relaxed shadow-xs">
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#A1A1AA] font-bold text-xs shrink-0 mt-4">
                  U
                </div>
              </div>
            );
          }

          return (
            <div key={turn.id} className="flex gap-3.5 max-w-2xl mr-auto">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C6CF2] to-[#947CFF] flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-4 shadow-xs shadow-[#7C6CF2]/20">
                R
              </div>
              <div className="space-y-1 max-w-[85%]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#9AA1B5]">
                  <span className="text-[#947CFF] font-bold text-[11px]">
                    Reflectra
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#171B29] text-[#9AA1B5] border border-[#272C3D]">
                    Flash 3.6
                  </span>
                  <span>&bull;</span>
                  <span>
                    {new Date(turn.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="bg-[#171B29]/60 p-4 sm:p-5 rounded-2xl rounded-tl-none border border-[#272C3D] text-sm text-[#F4F5F9] leading-relaxed shadow-xs">
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed prose-p:my-1.5 prose-headings:my-2 prose-headings:text-[#F4F5F9] prose-ul:my-1.5 prose-li:my-0.5 text-[#F4F5F9]">
                    <Markdown>{turn.content}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator when Reflectra is thinking */}
        {isGenerating && (
          <div className="flex gap-3.5 max-w-2xl mr-auto">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C6CF2] to-[#947CFF] flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-xs shadow-[#7C6CF2]/20">
              R
            </div>
            <div className="p-4 rounded-2xl bg-[#171B29]/60 border border-[#272C3D] rounded-tl-none text-xs text-[#9AA1B5] flex items-center gap-2.5 shadow-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-[#7C6CF2] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-[#7C6CF2] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-[#7C6CF2] rounded-full animate-bounce" />
              </div>
              <span className="font-medium text-[#F4F5F9]">Reflectra is thinking...</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {apiError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/50 text-xs text-rose-200 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Reflection Error: </span>
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="text-rose-300 hover:text-rose-100 text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={turnsEndRef} />
      </div>

      {/* Mode Selector & Input Area (Premium Segmented Controls) */}
      <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-[#0D101A]/80 shrink-0 space-y-2">
        {/* Reflection Mode Switcher Pills */}
        <div className="flex items-center space-x-1.5 text-xs overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-[11px] text-[#747B8D] font-bold uppercase tracking-wider mr-1 shrink-0">
            Mode:
          </span>
          <button
            type="button"
            onClick={() => setMode('reflect')}
            className={`px-3 py-1 rounded-full flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              mode === 'reflect'
                ? 'bg-[#6366F1] text-white font-medium shadow-xs shadow-[#6366F1]/20'
                : 'bg-white/[0.04] text-[#A8AFBF] hover:text-[#F5F5F7] hover:bg-white/[0.08] border border-white/[0.08]'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${mode === 'reflect' ? 'text-white' : 'text-[#6366F1]'}`} />
            <span>Reflect & Inquire</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('summarize')}
            className={`px-3 py-1 rounded-full flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              mode === 'summarize'
                ? 'bg-[#6366F1] text-white font-medium shadow-xs shadow-[#6366F1]/20'
                : 'bg-white/[0.04] text-[#A8AFBF] hover:text-[#F5F5F7] hover:bg-white/[0.08] border border-white/[0.08]'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${mode === 'summarize' ? 'text-white' : 'text-[#6366F1]'}`} />
            <span>Summarize</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('brainstorm')}
            className={`px-3 py-1 rounded-full flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              mode === 'brainstorm'
                ? 'bg-[#6366F1] text-white font-medium shadow-xs shadow-[#6366F1]/20'
                : 'bg-white/[0.04] text-[#A8AFBF] hover:text-[#F5F5F7] hover:bg-white/[0.08] border border-white/[0.08]'
            }`}
          >
            <Lightbulb className={`w-3.5 h-3.5 ${mode === 'brainstorm' ? 'text-white' : 'text-[#6366F1]'}`} />
            <span>Brainstorm Ideas</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('chat')}
            className={`px-3 py-1 rounded-full flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              mode === 'chat'
                ? 'bg-[#6366F1] text-white font-medium shadow-xs shadow-[#6366F1]/20'
                : 'bg-white/[0.04] text-[#A8AFBF] hover:text-[#F5F5F7] hover:bg-white/[0.08] border border-white/[0.08]'
            }`}
          >
            <MessageCircle className={`w-3.5 h-3.5 ${mode === 'chat' ? 'text-white' : 'text-[#6366F1]'}`} />
            <span>Dialogue</span>
          </button>
        </div>

        {/* Input Form on Dark Input Surface */}
        <form
          onSubmit={handleSubmitTurn}
          className="bg-[rgba(11,14,23,0.90)] border border-white/[0.08] rounded-2xl p-2 flex items-center gap-2 focus-within:border-[#6366F1] focus-within:ring-2 focus-within:ring-[#6366F1]/20 shadow-xs transition-all"
        >
          <textarea
            id="journal-input-textarea"
            rows={2}
            placeholder={
              mode === 'summarize'
                ? 'Add points you want prioritized in your summary...'
                : mode === 'brainstorm'
                ? 'What idea or decision would you like to brainstorm options for?'
                : 'Reflect on your day... (Press Shift+Enter for new line)'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitTurn();
              }
            }}
            disabled={isGenerating}
            className="flex-1 bg-transparent px-3 py-1 outline-none text-sm text-[#F5F5F7] placeholder:text-[#747B8D] resize-none font-sans"
          />

          <button
            id="submit-turn-button"
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className="w-9 h-9 bg-gradient-to-r from-[#6366F1] to-[#7C5CFC] hover:from-[#5558E6] hover:to-[#6D4CE8] text-white rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs shadow-[#6366F1]/20"
            title="Submit reflection turn"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-[#747B8D] px-1">
          <span>Multi-turn context preserved in session</span>
          <span>Shift + Enter for new line</span>
        </div>
      </div>

      {/* Executive Summary On-Demand Modal */}
      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        title={entry.title}
        summary={entry.summary}
        tags={entry.tags}
        reflectionQuestion={entry.reflectionQuestion}
        onReSummarize={handleAutoSummarize}
        isSummarizing={isSummarizing}
      />
    </div>
  );
};
