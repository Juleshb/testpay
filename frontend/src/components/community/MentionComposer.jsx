import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { memberLabel, memberAvatarProps, getCommunityMembers } from '../../communityApi';
import {
  filterMembersForMention,
  getMentionQuery,
  insertMention,
} from '../../lib/mentionUtils';
import UserAvatar from './UserAvatar';
import { cn } from '../../lib/cn';

export default function MentionComposer({
  value,
  onChange,
  members = [],
  onKeyDown,
  onBlur,
  placeholder,
  rows = 2,
  maxLength = 2000,
  inputRef,
  className,
  compact = false,
}) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionState, setMentionState] = useState(null);
  const [allMembers, setAllMembers] = useState(members);
  const [dropdownRect, setDropdownRect] = useState(null);

  const localRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const ref = inputRef || localRef;

  useEffect(() => {
    if (members.length > 0) setAllMembers(members);
  }, [members]);

  const pool = allMembers.length > 0 ? allMembers : members;

  const suggestions = useMemo(
    () => (mentionState ? filterMembersForMention(pool, mentionState.query) : []),
    [pool, mentionState]
  );

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionState?.query, suggestions.length]);

  useEffect(() => {
    itemRefs.current[mentionIndex]?.scrollIntoView({ block: 'nearest' });
  }, [mentionIndex, suggestions.length]);

  const updateDropdownPosition = () => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({
      left: rect.left,
      top: rect.top - 8,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!mentionOpen) {
      setDropdownRect(null);
      return;
    }
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [mentionOpen, mentionState?.query, value]);

  const openMentionPicker = (text, cursorPos) => {
    const state = getMentionQuery(text, cursorPos);
    if (!state) {
      setMentionState(null);
      setMentionOpen(false);
      return;
    }

    setMentionState(state);
    setMentionOpen(true);

    const source = allMembers.length > 0 ? allMembers : members;
    if (source.length === 0) {
      getCommunityMembers()
        .then((users) => {
          if (users.length > 0) setAllMembers(users);
        })
        .catch(() => {});
    }
  };

  const pickMember = (member) => {
    if (!mentionState) return;
    const { text, cursor } = insertMention(value, mentionState, member);
    onChange(text);
    setMentionOpen(false);
    setMentionState(null);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleKeyDown = (e) => {
    if (mentionOpen && mentionState && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pickMember(suggestions[mentionIndex]);
        return;
      }
    }
    if (mentionOpen && e.key === 'Escape') {
      e.preventDefault();
      setMentionOpen(false);
      setMentionState(null);
      return;
    }
    onKeyDown?.(e);
  };

  const queryLabel = mentionState?.query?.trim() || '';

  const dropdown =
    mentionOpen && mentionState && dropdownRect
      ? createPortal(
          <div
            className="rounded-xl border shadow-2xl overflow-hidden"
            style={{
              position: 'fixed',
              left: dropdownRect.left,
              top: dropdownRect.top,
              width: dropdownRect.width,
              transform: 'translateY(-100%)',
              zIndex: 9999,
              background: 'var(--color-surface-800)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div
              className="px-3 py-2 border-b flex items-center justify-between gap-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {queryLabel ? `Search · @${queryLabel}` : 'Mention someone'}
              </p>
              <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {suggestions.length} user{suggestions.length === 1 ? '' : 's'}
              </span>
            </div>

            {suggestions.length === 0 ? (
              <p className="px-3 py-4 font-mono text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                {pool.length === 0
                  ? 'No other members yet'
                  : `No match for "@${queryLabel}"`}
              </p>
            ) : (
              <ul ref={listRef} className="max-h-56 overflow-y-auto py-1">
                {suggestions.map((member, i) => (
                  <li key={member.id}>
                    <button
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setMentionIndex(i)}
                      onClick={() => pickMember(member)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                        i === mentionIndex ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                      )}
                    >
                      <UserAvatar {...memberAvatarProps(member)} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{memberLabel(member)}</p>
                        {(member.email || member.phone) && (
                          <p className="font-mono text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {member.email || member.phone}
                          </p>
                        )}
                      </div>
                      {i === mentionIndex && (
                        <span className="font-mono text-[9px] shrink-0" style={{ color: 'var(--color-accent)' }}>
                          ↵
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cn('relative', className)}>
      {dropdown}

      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full bg-transparent text-sm outline-none resize-none leading-snug',
          compact
            ? 'px-2 py-1.5 max-h-28 min-h-[2.25rem] sm:min-h-[2.5rem]'
            : 'px-3 py-2 sm:px-4 sm:py-3 min-h-[2.75rem] sm:min-h-[3.5rem]'
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          openMentionPicker(next, e.target.selectionStart);
        }}
        onSelect={(e) => openMentionPicker(e.target.value, e.target.selectionStart)}
        onBlur={(e) => onBlur?.(e)}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
      />
    </div>
  );
}
