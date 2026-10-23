import React, { useState } from 'react';
import { Pin, Edit2, Trash2, Lock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatRelativeDate } from '../../data/reviews';

export interface PrivateNoteCardProps {
  note: string;
  updatedAt?: string | number | null;
  onEdit?: () => void;
  onDelete?: () => void;
  isPinnedInReviews?: boolean;
}

export const PrivateNoteCard: React.FC<PrivateNoteCardProps> = ({
  note,
  updatedAt,
  onEdit,
  onDelete,
  isPinnedInReviews = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = React.useMemo(() => {
    if (!updatedAt) return 'Gerade eben';
    const timestamp = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt;
    if (isNaN(timestamp)) return 'Vor kurzem';
    return formatRelativeDate(timestamp);
  }, [updatedAt]);

  const textLength = note.length;
  const isLongText = textLength > 240;

  const handleConfirmDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      setShowConfirmDelete(false);
      onDelete?.();
    }, 220);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: isDeleting ? 0 : 1,
        scale: isDeleting ? 0.94 : 1,
        y: isDeleting ? -8 : 0,
      }}
      exit={{ opacity: 0, scale: 0.94, y: -8 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-2xl bg-card border shadow-2xs flex flex-col gap-2 relative transition-colors ${
        isPinnedInReviews
          ? 'border-accent/40 bg-linear-to-b from-accent-tint/30 to-card ring-1 ring-accent/20'
          : 'border-border'
      }`}
      aria-label="Private Notiz"
    >
      {/* Header: Pin links, daneben Titel-Spalte. Zeitangabe sitzt exakt unter dem "M" von "Meine Notiz" */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Pin className="w-4.5 h-4.5 text-accent fill-accent mt-0.5 shrink-0" aria-hidden="true" />
          
          <div className="flex flex-col items-start min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-text-main text-sm sm:text-base leading-tight">
                Meine Notiz
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-tint text-accent border border-accent/25">
                <Lock className="w-3 h-3" />
                <span>Nur für dich</span>
              </span>

              {isPinnedInReviews && (
                <span className="text-xs font-medium text-text-muted hidden xs:inline">
                  • Oben angeheftet
                </span>
              )}
            </div>

            {/* Zeitangabe exakt unter dem 'M' von 'Meine Notiz' */}
            <time className="text-xs text-text-muted mt-1 block">
              {formattedDate}
            </time>
          </div>
        </div>

        {/* Aktionen: Stift & Löschen mit dynamischer Animation */}
        <div className="flex items-center gap-1 shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            {showConfirmDelete ? (
              <motion.div
                key="confirm-delete-box"
                initial={{ opacity: 0, scale: 0.92, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.92, x: 8 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1 shadow-xs"
              >
                <span className="text-xs text-text-muted px-1.5 font-medium">Löschen?</span>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="h-8 px-2.5 rounded-lg bg-favorite text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                  aria-label="Notiz endgültig löschen"
                >
                  <Check className="w-3.5 h-3.5" /> Ja
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="h-8 px-2 rounded-lg bg-card text-text-main text-xs font-medium hover:bg-surface active:scale-95 transition-all cursor-pointer"
                  aria-label="Löschen abbrechen"
                >
                  Nein
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="default-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1"
              >
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    aria-label="Notiz bearbeiten"
                    title="Notiz bearbeiten"
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-text-muted hover:text-accent hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4.5 h-4.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    aria-label="Notiz löschen"
                    title="Notiz löschen"
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-text-muted hover:text-favorite hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fließtext der Notiz: 16px (text-base) gemäß Designvorgaben */}
      <div className="text-base text-text-main leading-relaxed font-normal">
        <p className={!isExpanded && isLongText ? 'line-clamp-4 whitespace-pre-wrap' : 'whitespace-pre-wrap'}>
          {note}
        </p>
        {isLongText && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="mt-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer block"
          >
            {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          </button>
        )}
      </div>
    </motion.article>
  );
};
