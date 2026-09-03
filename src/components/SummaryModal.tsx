import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Tag, HelpCircle, FileText, Bookmark } from 'lucide-react';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  summary?: string;
  tags?: string[];
  reflectionQuestion?: string;
  onReSummarize?: () => void;
  isSummarizing?: boolean;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  title,
  summary,
  tags,
  reflectionQuestion,
  onReSummarize,
  isSummarizing = false,
}) => {
  // Listen for Escape key press to cleanly close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      id="summary-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#080A12]/80 backdrop-blur-sm font-sans animate-in fade-in duration-150"
    >
      <div
        id="summary-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(760px, calc(100vw - 48px))',
          maxHeight: '82vh',
        }}
        className="bg-[#10131F] border border-[#272C3D] rounded-2xl flex flex-col shadow-2xl overflow-hidden text-[#F4F5F9] relative animate-in zoom-in-95 duration-150"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 px-5 sm:px-6 py-4 bg-[#10131F] border-b border-[#272C3D] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#7C6CF2]/15 border border-[#7C6CF2]/30 flex items-center justify-center text-[#947CFF] shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 text-[#947CFF]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#F4F5F9] truncate">
                  Executive Summary
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#7C6CF2]/15 text-[#947CFF] border border-[#7C6CF2]/30 shrink-0">
                  Reflectra
                </span>
              </div>
              <p className="text-xs text-[#9AA1B5] truncate">
                Synthesized takeaway, topics, and inquiry prompt
              </p>
            </div>
          </div>
          <button
            id="close-summary-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#9AA1B5] hover:text-[#F4F5F9] hover:bg-[#171B29] cursor-pointer transition-colors shrink-0 ml-2"
            title="Close summary modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content (Internal scroll when content exceeds viewport max-height) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 text-sm text-[#9AA1B5] scrollbar-thin">
          {/* Reflection Title */}
          {title && title !== 'Untitled Reflection' && (
            <div className="p-3.5 rounded-xl bg-[#171B29] border border-[#272C3D] flex items-start space-x-3">
              <Bookmark className="w-4 h-4 text-[#947CFF] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#947CFF] block mb-0.5">
                  Reflection Title
                </span>
                <span className="text-sm sm:text-base font-semibold text-[#F4F5F9] break-words">
                  {title}
                </span>
              </div>
            </div>
          )}

          {/* Synthesized Takeaway */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#171B29]/60 border border-[#272C3D]">
            <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-[#947CFF] mb-2.5">
              <FileText className="w-3.5 h-3.5 text-[#947CFF]" />
              <span>Synthesized Takeaway</span>
            </div>
            <p className="text-sm leading-relaxed text-[#F4F5F9] whitespace-pre-wrap font-sans break-words">
              {summary || 'No summary content synthesized yet.'}
            </p>
          </div>

          {/* Extracted Topics */}
          {Array.isArray(tags) && tags.length > 0 && (
            <div>
              <div className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-[#9AA1B5] mb-2">
                <Tag className="w-3.5 h-3.5 text-[#9AA1B5]" />
                <span>Extracted Topics ({tags.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-[#171B29] border border-[#272C3D] rounded-full text-xs font-medium text-[#9AA1B5]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reflection Inquiry Prompt */}
          {reflectionQuestion && (
            <div className="p-4 sm:p-5 rounded-xl bg-[#7C6CF2]/[0.08] border border-[#7C6CF2]/25">
              <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-[#947CFF] mb-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#947CFF]" />
                <span>Reflection Inquiry Prompt</span>
              </div>
              <p className="text-sm font-serif italic text-[#F4F5F9] leading-relaxed break-words">
                &ldquo;{reflectionQuestion}&rdquo;
              </p>
              <p className="text-[10px] text-[#9AA1B5] mt-2">
                Use this prompt to guide your next reflection turn or journaling inquiry.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#272C3D] bg-[#10131F] flex items-center justify-between shrink-0">
          <div>
            {onReSummarize && (
              <button
                id="modal-resummarize-button"
                onClick={onReSummarize}
                disabled={isSummarizing}
                className="flex items-center space-x-1.5 text-xs text-[#9AA1B5] hover:text-[#F4F5F9] transition-colors cursor-pointer disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7C6CF2]" />
                <span>{isSummarizing ? 'Synthesizing...' : 'Re-synthesize Summary'}</span>
              </button>
            )}
          </div>
          <button
            id="close-summary-modal-footer"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-[#7C6CF2] hover:bg-[#947CFF] text-white rounded-xl shadow-xs shadow-[#7C6CF2]/20 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
