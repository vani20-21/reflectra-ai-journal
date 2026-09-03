import React from 'react';
import { JournalEntry } from '../types';
import {
  Sparkles,
  Shield,
  Database,
  Tag,
  ArrowUpRight,
  Compass,
  Target,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface BentoInsightsPanelProps {
  entry: JournalEntry | null;
  totalEntries: number;
  onOpenSecurity: () => void;
  isGeneratingActionInsights?: boolean;
  onGenerateActionInsights?: () => void;
  actionInsightsError?: string | null;
  onRetryActionInsights?: () => void;
  actionInsightsNotice?: string | null;
}

export const BentoInsightsPanel: React.FC<BentoInsightsPanelProps> = ({
  entry,
  totalEntries,
  onOpenSecurity,
  isGeneratingActionInsights = false,
  onGenerateActionInsights,
  actionInsightsError = null,
  onRetryActionInsights,
  actionInsightsNotice = null,
}) => {
  const turnsCount = entry?.turns?.length || 0;
  const hasActionInsights = Boolean(entry?.actionInsights);
  const actionInsights = entry?.actionInsights;

  // Derive an evocative insight quote from summary, reflection question, or latest turn
  const insightQuote =
    entry?.summary ||
    (entry?.reflectionQuestion
      ? `"${entry.reflectionQuestion}"`
      : entry?.turns && entry.turns.length > 0
      ? `"${entry.turns[entry.turns.length - 1].content.slice(0, 140)}${
          entry.turns[entry.turns.length - 1].content.length > 140 ? '...' : ''
        }"`
      : '“Journaling with AI creates an objective mirror for clarity, emotional balance, and strategic priorities.”');

  const insightSubtext = entry?.reflectionQuestion
    ? 'Reflectra generated this inquiry based on pattern detection in your thoughts.'
    : entry?.summary
    ? 'Synthesized executive takeaway analyzing your recent journaling turns.'
    : 'Begin writing or select a reflection prompt to unlock contextual AI pattern detection.';

  const tags =
    entry?.tags && entry.tags.length > 0
      ? entry.tags
      : ['Reflection', 'Growth', 'Mindfulness', 'Clarity'];

  return (
    <div className="flex flex-col gap-3.5 h-full min-h-0 overflow-y-auto pr-1 select-none scrollbar-thin">
      {/* 1. DEDICATED ACTION INSIGHTS BENTO CARD (Reflection → Action) */}
      <section
        id="action-insights-card"
        className="shrink-0 bg-[#10131F] rounded-2xl border border-[#272C3D] shadow-xs p-4 sm:p-5 flex flex-col transition-all relative overflow-hidden"
      >
        {hasActionInsights && (
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#7C6CF2]/15 rounded-full blur-2xl pointer-events-none" />
        )}

        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#272C3D]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#7C6CF2]/10 border border-[#7C6CF2]/20 flex items-center justify-center text-[#947CFF] shadow-xs">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F5F9] flex items-center gap-1.5">
                  <span>Reflection &rarr; Action</span>
                </h3>
                <p className="text-[10px] text-[#9AA1B5]">Actionable Personal Insights</p>
              </div>
            </div>

            {hasActionInsights && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#7C6CF2]/15 text-[#947CFF] border border-[#7C6CF2]/25">
                Active
              </span>
            )}
          </div>

          {/* Loading State */}
          {isGeneratingActionInsights && (
            <div className="py-6 px-3 text-center">
              <div className="w-7 h-7 border-2 border-[#7C6CF2]/20 border-t-[#7C6CF2] rounded-full animate-spin mx-auto mb-2.5" />
              <p className="text-xs font-semibold text-[#F4F5F9]">Synthesizing Action Insights...</p>
              <p className="text-[11px] text-[#9AA1B5] mt-1 max-w-xs mx-auto leading-relaxed">
                Reflectra is analyzing the complete conversation to distill your Main Theme, Key Insight, Next Action, and Reflection Question.
              </p>
            </div>
          )}

          {/* Guidance Notice State (Empty or Short Conversation) */}
          {!isGeneratingActionInsights && actionInsightsNotice && (
            <div className="p-3 rounded-xl bg-[#FBBF24]/10 border border-[#FBBF24]/20 text-xs text-[#FBBF24] mb-2.5">
              <div className="flex items-center gap-1.5 font-semibold text-[#FBBF24] mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                <span>Reflection Notice</span>
              </div>
              <p className="text-[11px] text-[#FBBF24]/90 leading-relaxed">{actionInsightsNotice}</p>
            </div>
          )}

          {/* Error State */}
          {!isGeneratingActionInsights && actionInsightsError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-xs text-rose-200 mb-2.5">
              <p className="font-semibold mb-1">Could not generate Action Insights</p>
              <p className="text-[11px] text-rose-300 mb-2">{actionInsightsError}</p>
              {onRetryActionInsights && (
                <button
                  onClick={onRetryActionInsights}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Active Content State: Exactly 4 Sections with Low-Opacity Tinted Surfaces */}
          {!isGeneratingActionInsights && hasActionInsights && actionInsights && (
            <div className="space-y-2.5 text-xs">
              {/* 1. MAIN THEME */}
              <div className="p-3 rounded-xl bg-[#7C6CF2]/[0.08] border border-[#7C6CF2]/20">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#947CFF] mb-1">
                  <span className="text-sm">🎯</span>
                  <span>Main Theme</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F5F9] leading-snug">
                  {actionInsights.mainTheme}
                </p>
              </div>

              {/* 2. KEY INSIGHT */}
              <div className="p-3 rounded-xl bg-[#171B29] border border-[#272C3D]">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#947CFF] mb-1">
                  <span className="text-sm">💡</span>
                  <span>Key Insight</span>
                </div>
                <p className="text-xs sm:text-sm text-[#F4F5F9] leading-relaxed">
                  {actionInsights.keyInsight}
                </p>
              </div>

              {/* 3. NEXT ACTION */}
              <div className="p-3 rounded-xl bg-[#67D9B0]/[0.06] border border-[#67D9B0]/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#67D9B0]">
                    <span className="text-sm">✅</span>
                    <span>Next Action</span>
                  </div>
                  <span className="text-[9px] uppercase font-semibold tracking-wider px-2 py-0.2 rounded-full bg-[#67D9B0]/10 text-[#67D9B0] border border-[#67D9B0]/20">
                    Practical Step
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#F4F5F9] leading-relaxed font-medium">
                  {actionInsights.nextAction}
                </p>
                <p className="text-[10px] text-[#67D9B0]/80 mt-1 italic">
                  * A realistic, achievable personal step (supportive personal growth, non-medical).
                </p>
              </div>

              {/* 4. REFLECTION QUESTION */}
              <div className="p-3 rounded-xl bg-[#947CFF]/[0.06] border border-[#947CFF]/20">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#947CFF] mb-1">
                  <span className="text-sm">❓</span>
                  <span>Reflection Question</span>
                </div>
                <p className="text-xs sm:text-sm text-[#F4F5F9] italic leading-relaxed">
                  &ldquo;{actionInsights.reflectionQuestion}&rdquo;
                </p>
              </div>

              {/* Metadata & Regenerate footer */}
              <div className="pt-2 border-t border-[#272C3D] flex items-center justify-between text-[10px] text-[#6B7280]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#6B7280]" />
                  <span>
                    {actionInsights.generatedAt
                      ? new Date(actionInsights.generatedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Distilled'}
                  </span>
                </span>

                {onGenerateActionInsights && (
                  <button
                    onClick={onGenerateActionInsights}
                    disabled={isGeneratingActionInsights}
                    className="flex items-center gap-1 text-[#947CFF] hover:text-[#7C6CF2] font-semibold cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty / Not Generated State */}
          {!isGeneratingActionInsights && !hasActionInsights && (
            <div className="py-4 px-2 text-center">
              <div className="w-9 h-9 rounded-2xl bg-[#7C6CF2]/10 border border-[#7C6CF2]/20 flex items-center justify-center text-[#947CFF] mx-auto mb-2 shadow-xs">
                <Target className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-[#F4F5F9]">Turn Reflection Into Action</p>
              <p className="text-[11px] text-[#9AA1B5] mt-1 leading-relaxed max-w-xs mx-auto">
                Transform this journal entry into 4 clear outcomes: Main Theme, Key Insight, Next Action, and Reflection Question.
              </p>

              {onGenerateActionInsights && (
                <button
                  id="panel-generate-action-insights-button"
                  onClick={onGenerateActionInsights}
                  disabled={isGeneratingActionInsights}
                  className="mt-3 w-full py-2.5 px-4 bg-[#7C6CF2] hover:bg-[#947CFF] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs shadow-[#7C6CF2]/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Generate Action Insights</span>
                </button>
              )}

              {turnsCount === 0 && (
                <p className="mt-2 text-[10px] text-[#6B7280]">
                  Tip: Share your thoughts first to distill personalized action steps.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2. Bento Card: Reflectra Insight Quote */}
      <section className="shrink-0 bg-[#10131F] border border-[#272C3D] rounded-2xl p-4 sm:p-5 text-[#F4F5F9] shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#947CFF] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#7C6CF2]" />
              <span>Reflectra Insight</span>
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#171B29] text-[#9AA1B5] border border-[#272C3D]">
              Flash 3.6
            </span>
          </div>

          <p className="text-xs sm:text-sm font-serif italic mb-2.5 leading-relaxed text-slate-200">
            {insightQuote}
          </p>
        </div>

        <div>
          <div className="h-0.5 w-8 bg-[#7C6CF2]/50 rounded-full mb-2" />
          <p className="text-[11px] text-[#6B7280] leading-relaxed">{insightSubtext}</p>
        </div>
      </section>

      {/* 3. Bento Card: Extracted Topics & Security */}
      <section className="shrink-0 bg-[#10131F] rounded-2xl border border-[#272C3D] shadow-xs p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#9AA1B5] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#9AA1B5]" />
              <span>Extracted Topics</span>
            </h3>
            <span className="text-[10px] text-[#9AA1B5] font-medium bg-[#171B29] border border-[#272C3D] px-2 py-0.5 rounded-full">
              {tags.length} Active
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 bg-[#171B29] hover:bg-[#171B29]/80 border border-[#272C3D] rounded-full text-xs font-medium text-[#9AA1B5] hover:text-[#F4F5F9] transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Security & Infrastructure Status */}
        <div className="mt-4 pt-3 border-t border-[#272C3D] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9AA1B5] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Firestore Sync</span>
            </span>
            <span className="font-mono text-[#67D9B0] font-semibold flex items-center gap-1 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#67D9B0]" />
              Live Isolation
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9AA1B5] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Security Rule</span>
            </span>
            <span className="font-mono text-[#947CFF] font-semibold text-[11px]">
              Owner-Bound UID
            </span>
          </div>

          <button
            onClick={onOpenSecurity}
            className="mt-1 flex items-center justify-between text-[11px] font-semibold text-[#947CFF] hover:text-[#7C6CF2] pt-1 transition-colors cursor-pointer group"
          >
            <span>Inspect Threat Specs & Rules</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
};

