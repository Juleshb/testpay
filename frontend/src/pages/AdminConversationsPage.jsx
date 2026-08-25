import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listAdminConversations, getAdminConversationMessages } from '../adminApi';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import UserAvatar from '../components/community/UserAvatar';
import MentionText from '../components/community/MentionText';
import PaymentMessageButtons, { usePaymentMessageParts } from '../components/community/PaymentMessageButtons';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../lib/cn';

function AdminMessageBody({ content, members }) {
  const { paymentIds, displayText } = usePaymentMessageParts(content);
  return (
    <>
      {displayText ? (
        <p className="font-mono text-sm whitespace-pre-wrap break-words leading-relaxed">
          <MentionText text={displayText} members={members} />
        </p>
      ) : null}
      {paymentIds.length > 0 && (
        <PaymentMessageButtons content={content} className={displayText ? 'mt-2.5' : ''} />
      )}
    </>
  );
}

function participantLabel(user) {
  return user?.displayName || user?.email || user?.phone || user?.name || 'User';
}

function formatWhen(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

function formatRelative(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(date).toLocaleDateString();
}

export default function AdminConversationsPage() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [thread, setThread] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = (search = query) =>
    listAdminConversations(search)
      .then((data) => {
        setConversations(data.conversations || []);
        setError('');
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      return undefined;
    }

    setThreadLoading(true);
    getAdminConversationMessages(selectedId)
      .then(setThread)
      .catch((err) => setError(err.message))
      .finally(() => setThreadLoading(false));
  }, [selectedId]);

  const members = useMemo(() => {
    if (!thread) return [];
    return [thread.participantA, thread.participantB].filter(Boolean);
  }, [thread]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    loadConversations(query).finally(() => setLoading(false));
  };

  if (loading && conversations.length === 0) {
    return <PageLoader message={t('admin.conversationsPage.loadingMessages')} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.conversationsPage.title')}
        label={t('admin.conversationsPage.label')}
        description={t('admin.conversationsPage.description')}
        actions={
          <Link to="/admin">
            <Button variant="ghost" size="md">
              {t('admin.systemDashboard')}
            </Button>
          </Link>
        }
      />

      {error && <Alert>{error}</Alert>}

      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin.conversationsPage.searchPlaceholder')}
          className="input-field flex-1 font-mono text-sm"
        />
        <Button type="submit" size="md">
          {t('admin.conversationsPage.search')}
        </Button>
      </form>

      <div className="grid lg:grid-cols-[minmax(280px,360px)_1fr] gap-4 min-h-[520px]">
        <section className="glass-panel overflow-hidden flex flex-col min-h-[420px] lg:min-h-[560px]">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="section-label">
              {t('admin.conversationsPage.conversationsCount', { count: conversations.length })}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y" style={{ divideColor: 'var(--color-border)' }}>
            {conversations.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title={t('admin.conversationsPage.emptyTitle')}
                  description={t('admin.conversationsPage.emptyDescription')}
                />
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.03]',
                    selectedId === conv.id && 'bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex -space-x-2 shrink-0">
                      <UserAvatar
                        name={participantLabel(conv.participantA)}
                        avatarUrl={conv.participantA?.avatarUrl}
                        userId={conv.participantA?.id}
                        size={32}
                      />
                      <UserAvatar
                        name={participantLabel(conv.participantB)}
                        avatarUrl={conv.participantB?.avatarUrl}
                        userId={conv.participantB?.id}
                        size={32}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold truncate">
                        {participantLabel(conv.participantA)} · {participantLabel(conv.participantB)}
                      </p>
                      <p className="font-mono text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                        {conv.lastMessage?.content || t('admin.conversationsPage.noMessages')}
                      </p>
                      <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {t('admin.conversationsPage.messageCount', { count: conv.messageCount })}
                        {' · '}
                        {formatRelative(conv.updatedAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="glass-panel flex flex-col min-h-[420px] lg:min-h-[560px]">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="font-mono text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                {t('admin.conversationsPage.selectConversation')}
              </p>
            </div>
          ) : threadLoading && !thread ? (
            <div className="flex-1 flex items-center justify-center">
              <PageLoader message={t('admin.conversationsPage.loadingMessages')} />
            </div>
          ) : thread ? (
            <>
              <div className="px-4 py-4 border-b space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                <p className="section-label">{t('admin.conversationsPage.participants')}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[thread.participantA, thread.participantB].map((user) => (
                    <Link
                      key={user.id}
                      to={`/admin/users/${user.id}`}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-white/[0.03]"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)' }}
                    >
                      <UserAvatar
                        name={participantLabel(user)}
                        avatarUrl={user.avatarUrl}
                        userId={user.id}
                        size={36}
                      />
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold truncate">{participantLabel(user)}</p>
                        <p className="font-mono text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {user.email || user.phone || user.id.slice(0, 8)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('admin.conversationsPage.messageCount', { count: thread.messageCount })}
                  {' · '}
                  {t('admin.conversationsPage.updated', { time: formatWhen(thread.updatedAt) })}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {thread.messages.length === 0 ? (
                  <p className="font-mono text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                    {t('admin.conversationsPage.noMessages')}
                  </p>
                ) : (
                  thread.messages.map((msg) => {
                    const isA = msg.senderId === thread.participantA?.id;
                    return (
                      <article
                        key={msg.id}
                        className="rounded-lg border px-3 py-2.5"
                        style={{
                          borderColor: isA
                            ? 'color-mix(in srgb, var(--color-accent) 25%, transparent)'
                            : 'color-mix(in srgb, var(--color-success) 25%, transparent)',
                          background: isA
                            ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                            : 'color-mix(in srgb, var(--color-success) 5%, transparent)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <Link
                            to={`/admin/users/${msg.senderId}`}
                            className="font-mono text-xs font-semibold hover:underline"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {participantLabel(msg.sender)}
                          </Link>
                          <time className="font-mono text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                            {formatWhen(msg.createdAt)}
                          </time>
                        </div>
                        {msg.quotedContent && (
                          <p
                            className="font-mono text-[11px] mb-2 px-2 py-1 rounded border-l-2"
                            style={{
                              color: 'var(--color-text-muted)',
                              borderColor: 'var(--color-accent)',
                              background: 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
                            }}
                          >
                            {msg.quotedContent}
                          </p>
                        )}
                        <AdminMessageBody content={msg.content} members={members} />
                        {msg.readAt && (
                          <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            {t('admin.conversationsPage.readAt', { time: formatWhen(msg.readAt) })}
                          </p>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
