import { useTranslation } from 'react-i18next';
import OnlineMemberAvatar from './OnlineMemberAvatar';
import { memberLabel, memberAvatarProps } from '../../communityApi';

export default function OnlineMembersSection({ members, onSelect, max = 12, compact = false }) {
  const { t } = useTranslation();
  const onlineMembers = members.filter((m) => m.isOnline);

  return (
    <section>
      <p className="section-label text-[10px] px-2 mb-2 inline-flex items-center gap-2">
        <span
          className="mining-live-dot inline-block h-2 w-2 rounded-full shrink-0"
          style={{ background: 'var(--color-success)' }}
        />
        {t('community.onlineNow', { count: onlineMembers.length })}
      </p>
      {onlineMembers.length === 0 ? (
        <p className="px-2 font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('community.noOneOnline')}
        </p>
      ) : (
        <div className={compact ? 'space-y-0.5 max-h-36 overflow-y-auto' : 'space-y-0.5'}>
          {onlineMembers.slice(0, max).map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect?.(member)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] text-left"
            >
              <OnlineMemberAvatar {...memberAvatarProps(member)} size={compact ? 24 : 28} />
              <div className="min-w-0 flex-1">
                <span className="text-xs truncate block">{memberLabel(member)}</span>
                {member.wsConnected && (
                  <span className="font-mono text-[9px]" style={{ color: 'var(--color-success)' }}>
                    {t('community.activeNow')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
