import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import { Plus, Search, Calendar, MessageSquare, Trash2, Tag, BookOpen, Clock, Compass } from 'lucide-react';

interface HistorySidebarProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
  loading: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (Array.isArray(e.tags)) {
        e.tags.forEach((t) => set.add(t));
      }
    });
    return Array.from(set);
  }, [entries]);

  // Filter entries based on search and tag
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        searchQuery === '' ||
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.actionInsights?.mainTheme?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.actionInsights?.keyInsight?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.turns?.some((t) => t.content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag =
        selectedTag === 'all' || (Array.isArray(e.tags) && e.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });
  }, [entries, searchQuery, selectedTag]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this journal entry from Firestore?')) {
      onDeleteEntry(id);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <aside className="bg-[#10131F] rounded-2xl border border-[#272C3D] shadow-xs p-4 sm:p-5 flex flex-col h-full select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#9AA1B5]">
          Journal History
        </h2>
        <span className="text-xs text-[#9AA1B5] font-medium bg-[#171B29] border border-[#272C3D] px-2 py-0.5 rounded-full">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3 shrink-0">
        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA1B5]" />
        <input
          id="search-entries-input"
          type="text"
          placeholder="Search reflections & insights..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-[#171B29] border border-[#272C3D] rounded-xl text-[#F4F5F9] placeholder:text-[#6B7280] focus:outline-none focus:border-[#7C6CF2] focus:ring-1 focus:ring-[#7C6CF2]/30 transition-all"
        />
      </div>

      {/* Tag Filters - Horizontal Scrolling with shrink-0 on each tag to prevent clipping */}
      {allTags.length > 0 && (
        <div className="w-full min-w-0 flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2.5 text-[11px] scrollbar-thin shrink-0">
          <button
            onClick={() => setSelectedTag('all')}
            className={`shrink-0 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
              selectedTag === 'all'
                ? 'bg-[#7C6CF2] text-white font-medium shadow-xs shadow-[#7C6CF2]/20'
                : 'bg-[#171B29] hover:bg-[#171B29]/80 text-[#9AA1B5] hover:text-[#F4F5F9] border border-[#272C3D]'
            }`}
          >
            All ({entries.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`shrink-0 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                selectedTag === tag
                  ? 'bg-[#7C6CF2] text-white font-medium shadow-xs shadow-[#7C6CF2]/20'
                  : 'bg-[#171B29] hover:bg-[#171B29]/80 text-[#9AA1B5] hover:text-[#F4F5F9] border border-[#272C3D]'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Entries List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#9AA1B5]">
            <div className="w-5 h-5 border-2 border-[#7C6CF2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading reflections...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-12 px-3 text-center text-xs text-[#6B7280]">
            <BookOpen className="w-8 h-8 text-[#6B7280]/40 mx-auto mb-2" />
            <p className="font-semibold text-[#F4F5F9]">No reflections found</p>
            <p className="mt-1 text-[#6B7280] text-[11px]">
              {searchQuery ? 'Try a different search keyword.' : 'Click below to start a new reflection.'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isActive = entry.id === activeEntryId;
            const turnCount = entry.turns?.length || 0;
            const lastTurn = turnCount > 0 ? entry.turns[turnCount - 1] : null;
            const hasAction = Boolean(entry.actionInsights);

            return (
              <div
                key={entry.id}
                id={`journal-entry-card-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className={`group relative p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#171B29] border-[#7C6CF2]/40 shadow-xs ring-1 ring-[#7C6CF2]/25'
                    : 'bg-[#10131F] hover:bg-[#171B29]/50 border-[#272C3D] hover:border-[#3A4259]'
                }`}
              >
                {/* Date tag & action status */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-semibold ${isActive ? 'text-[#947CFF]' : 'text-[#6B7280]'}`}>
                      {formatDate(entry.updatedAt || entry.createdAt)}
                    </p>
                    {hasAction && (
                      <span
                        className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.2 rounded-full bg-[#7C6CF2]/10 text-[#947CFF] border border-[#7C6CF2]/20"
                        title="Action Insights generated"
                      >
                        <Compass className="w-2.5 h-2.5 text-[#947CFF]" />
                        <span>Action</span>
                      </span>
                    )}
                  </div>
                  <button
                    id={`delete-entry-${entry.id}`}
                    onClick={(e) => handleDelete(e, entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#6B7280] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Title */}
                <p className={`text-sm font-semibold line-clamp-1 ${isActive ? 'text-[#F4F5F9]' : 'text-slate-200'}`}>
                  {entry.title || 'Untitled Reflection'}
                </p>

                {/* Summary or Snippet */}
                <p className="mt-1 text-xs text-[#9AA1B5] line-clamp-2 leading-relaxed">
                  {entry.summary || lastTurn?.content || 'No interactions yet.'}
                </p>

                {/* Metadata row */}
                <div className="mt-2 pt-2 border-t border-[#272C3D] flex items-center justify-between text-[10px] text-[#6B7280]">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{turnCount} {turnCount === 1 ? 'turn' : 'turns'}</span>
                  </span>

                  {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#171B29] text-[#9AA1B5] font-medium text-[9px] border border-[#272C3D]">
                      #{entry.tags[0]}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Button with exactly ONE Plus icon */}
      <button
        id="new-journal-entry-button"
        onClick={onNewEntry}
        className="mt-3.5 w-full py-2.5 px-4 bg-[#7C6CF2] hover:bg-[#947CFF] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xs shadow-[#7C6CF2]/20 transition-all cursor-pointer shrink-0"
      >
        <Plus className="w-4 h-4" />
        <span>New Reflection</span>
      </button>
    </aside>
  );
};
