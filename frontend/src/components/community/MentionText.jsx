import { useMemo } from 'react';
import { memberLabel } from '../../communityApi';
import { parseMentionContent } from '../../lib/mentionUtils';
import { cn } from '../../lib/cn';

export default function MentionText({ text, members = [], isOwn = false, onMentionClick }) {
  const byId = useMemo(
    () => Object.fromEntries((members || []).map((m) => [m.id, m])),
    [members]
  );

  const parts = useMemo(() => parseMentionContent(text), [text]);

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'mention') {
          const user = byId[part.userId];
          const label = part.label || (user ? memberLabel(user) : 'user');
          const clickable = Boolean(onMentionClick && user);

          return (
            <span
              key={`m-${i}`}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onMentionClick(user) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onMentionClick(user);
                      }
                    }
                  : undefined
              }
              className={cn(
                'font-semibold rounded px-0.5 -mx-0.5',
                clickable && 'cursor-pointer hover:underline',
                isOwn
                  ? 'bg-white/20 text-inherit'
                  : 'bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[var(--color-accent)]'
              )}
            >
              @{label}
            </span>
          );
        }
        return <span key={`t-${i}`}>{part.text}</span>;
      })}
    </>
  );
}
