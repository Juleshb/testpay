import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import {
  getChannels,
  getCommunityFeed,
  postCommunityMessage,
  togglePostReaction,
  getConversations,
  getCommunityMembers,
  startConversation,
  memberLabel,
  memberAvatarProps,
  buildPrivateReplyQuote,
  markChannelRead,
} from '../../communityApi';
import { useCommunityUnread, UnreadBadge } from '../../CommunityUnreadContext';
import MessagingPanel from './MessagingPanel';
import UserAvatar from './UserAvatar';
import MentionComposer from './MentionComposer';
import MentionText from './MentionText';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { PageLoader } from '../ui/Spinner';
import { BrandWordmark } from '../BrandLogo';
import { cn } from '../../lib/cn';
import { serializeMentions } from '../../lib/mentionUtils';
import {
  useCommunityRealtime,
  useTypingEmitter,
  formatTypingLabel,
} from '../../hooks/useCommunityRealtime';
import { channelRoom, normalizeIncomingPost } from '../../lib/communityRealtime';

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function CommunityWorkspace({ initialDmUserId }) {
  const { user } = useAuth();
  const { channels: unreadChannels, conversations: unreadConversations, refresh: refreshUnread } =
    useCommunityUnread();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [channelMeta, setChannelMeta] = useState(null);
  const [posts, setPosts] = useState([]);
  const [quickEmojis, setQuickEmojis] = useState(['👍', '❤️', '😂', '🎉', '🔥', '👀']);
  const [channelTypers, setChannelTypers] = useState([]);

  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberQuery, setMemberQuery] = useState('');

  const [view, setView] = useState(initialDmUserId ? 'dm' : 'channel');
  const [activeDmId, setActiveDmId] = useState(null);
  const [activeDmUserId, setActiveDmUserId] = useState(initialDmUserId || null);
  const [pendingQuote, setPendingQuote] = useState(null);

  const [composer, setComposer] = useState('');
  const [posting, setPosting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [firstUnreadPostId, setFirstUnreadPostId] = useState(null);
  const [scrollToEnd, setScrollToEnd] = useState(true);
  const [mobileShowPanel, setMobileShowPanel] = useState(Boolean(initialDmUserId));

  const feedEndRef = useRef(null);
  const composerRef = useRef(null);
  const initialDmHandledRef = useRef(false);
  const reactionPendingRef = useRef(new Set());
  const postingRef = useRef(false);
  const activeChannelRef = useRef(activeChannel);
  const realtimeHandlersRef = useRef([]);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
    setChannelTypers([]);
  }, [activeChannel]);

  const handleRealtimeEvent = useCallback(
    (msg) => {
      if (msg.type === 'channel:post' && msg.channel === activeChannelRef.current) {
        if (msg.post.authorId === user?.id) return;
        setPosts((prev) => {
          if (prev.some((p) => p.id === msg.post.id)) return prev;
          return [...prev, normalizeIncomingPost(msg.post, user?.id)];
        });
        setScrollToEnd(true);
      }
      if (msg.type === 'channel:reaction' && msg.channel === activeChannelRef.current) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === msg.postId
              ? {
                  ...p,
                  reactions: (msg.reactions || []).map((r) => ({
                    ...r,
                    reacted: p.reactions?.find((x) => x.emoji === r.emoji)?.reacted ?? false,
                  })),
                }
              : p
          )
        );
      }
      if (msg.type === 'typing' && msg.room === channelRoom(activeChannelRef.current)) {
        setChannelTypers((prev) => {
          const next = prev.filter((t) => t.userId !== msg.userId);
          if (msg.isTyping && msg.userId !== user?.id) {
            next.push({ userId: msg.userId, name: msg.name });
          }
          return next;
        });
      }
      if (msg.type === 'conversations:update') {
        getConversations().then(setConversations).catch(() => {});
      }
      realtimeHandlersRef.current.forEach((handler) => handler(msg));
    },
    [user?.id]
  );

  const {
    connected: realtimeConnected,
    subscribeChannel,
    unsubscribeChannel,
    subscribeConversation,
    unsubscribeConversation,
    sendChannelTyping,
    sendDmTyping,
  } = useCommunityRealtime({ onEvent: handleRealtimeEvent });

  const registerRealtimeHandler = useCallback((handler) => {
    realtimeHandlersRef.current.push(handler);
    return () => {
      realtimeHandlersRef.current = realtimeHandlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const { ping: pingChannelTyping, stop: stopChannelTyping } = useTypingEmitter(
    sendChannelTyping,
    'channel',
    activeChannel
  );

  const loadSidebar = useCallback(async () => {
    const results = await Promise.allSettled([
      getChannels(),
      getConversations(),
      getCommunityMembers(),
    ]);

    const [chResult, convResult, memResult] = results;

    if (chResult.status === 'fulfilled') setChannels(chResult.value);
    if (convResult.status === 'fulfilled') setConversations(convResult.value);
    if (memResult.status === 'fulfilled') setMembers(memResult.value);

    const failed = results.find((r) => r.status === 'rejected');
    if (failed) setError(failed.reason?.message || 'Failed to load community data');
  }, []);

  const loadChannel = useCallback((slug) => {
    return getCommunityFeed(slug)
      .then((data) => {
        setChannelMeta(data.channel);
        setPosts(data.posts);
        if (data.quickEmojis) setQuickEmojis(data.quickEmojis);
        if (data.firstUnreadPostId) {
          setFirstUnreadPostId(data.firstUnreadPostId);
          setScrollToEnd(false);
        } else {
          setFirstUnreadPostId(null);
          setScrollToEnd(true);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    Promise.all([loadSidebar(), loadChannel(activeChannel)]).finally(() => setLoading(false));
    const intervalMs = realtimeConnected ? 45000 : 10000;
    const interval = setInterval(() => {
      loadSidebar();
      if (!realtimeConnected && view === 'channel') loadChannel(activeChannel);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [activeChannel, view, loadSidebar, loadChannel, realtimeConnected]);

  useEffect(() => {
    if (!realtimeConnected) return undefined;
    subscribeChannel(activeChannel);
    return () => unsubscribeChannel(activeChannel);
  }, [activeChannel, realtimeConnected, subscribeChannel, unsubscribeChannel]);

  useEffect(() => {
    if (!realtimeConnected || !activeDmId) return undefined;
    subscribeConversation(activeDmId);
    return () => unsubscribeConversation(activeDmId);
  }, [activeDmId, realtimeConnected, subscribeConversation, unsubscribeConversation]);

  useEffect(() => {
    if (view !== 'channel') return;
    if (firstUnreadPostId) {
      const el = document.getElementById(`post-${firstUnreadPostId}`);
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          markChannelRead(activeChannel)
            .then(() => {
              refreshUnread();
              loadSidebar();
            })
            .catch(() => {});
        });
        setFirstUnreadPostId(null);
        setScrollToEnd(true);
        return;
      }
    }
    if (scrollToEnd) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [posts, view, firstUnreadPostId, scrollToEnd, activeChannel, refreshUnread, loadSidebar]);

  const openChannel = (slug) => {
    setView('channel');
    setActiveChannel(slug);
    setActiveDmId(null);
    setActiveDmUserId(null);
    setMobileShowPanel(true);
    loadChannel(slug);
  };

  const openDm = (conversation) => {
    setView('dm');
    setActiveDmId(conversation.id);
    setActiveDmUserId(conversation.peer?.id || null);
    setPendingQuote(null);
    setError('');
    setMobileShowPanel(true);
  };

  const openDmWithMember = useCallback(async (member) => {
    setError('');
    try {
      const conv = await startConversation({ userId: member.id });
      setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
      openDm(conv);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!initialDmUserId || activeDmId || initialDmHandledRef.current) return;

    const existing = conversations.find((c) => c.peer?.id === initialDmUserId);
    if (existing) {
      initialDmHandledRef.current = true;
      openDm(existing);
      return;
    }

    const member = members.find((m) => m.id === initialDmUserId);
    if (!member) return;

    initialDmHandledRef.current = true;
    startConversation({ userId: member.id })
      .then((conv) => {
        setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
        openDm(conv);
      })
      .catch((err) => {
        initialDmHandledRef.current = false;
        setError(err.message);
      });
  }, [initialDmUserId, members, conversations, activeDmId]);

  const replyPrivately = async (post) => {
    if (post.isOwn) return;
    const quote = buildPrivateReplyQuote(post);
    setError('');
    try {
      const conv = await startConversation({
        userId: post.author.id,
        quotedPostId: quote.quotedPostId,
        quotedContent: quote.quotedContent,
      });
      setConversations((prev) => {
        if (prev.some((c) => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
      setView('dm');
      setActiveDmId(conv.id);
      setActiveDmUserId(post.author.id);
      setPendingQuote({
        quotedPostId: quote.quotedPostId,
        quotedContent: quote.quotedContent,
        quotedAuthor: quote.quotedAuthor,
        quotedExcerpt: quote.quotedExcerpt,
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!composer.trim() || postingRef.current) return;
    postingRef.current = true;
    setPosting(true);
    setError('');
    try {
      const content = serializeMentions(composer.trim(), members);
      const post = await postCommunityMessage(content, activeChannel);
      setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [...prev, post]));
      setComposer('');
      setScrollToEnd(true);
      stopChannelTyping();
    } catch (err) {
      setError(err.message);
    } finally {
      postingRef.current = false;
      setPosting(false);
      composerRef.current?.focus();
    }
  };

  const handleReaction = async (postId, emoji) => {
    const key = `${postId}:${emoji}`;
    if (reactionPendingRef.current.has(key)) return;
    reactionPendingRef.current.add(key);
    try {
      const { reactions } = await togglePostReaction(postId, emoji);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reactions } : p)));
      setShowEmojiPicker(null);
    } catch (err) {
      setError(err.message);
    } finally {
      reactionPendingRef.current.delete(key);
    }
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost(e);
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = memberQuery.trim().toLowerCase();
    return !q || memberLabel(m).toLowerCase().includes(q);
  });

  if (loading) return <PageLoader message="loading workspace" />;

  let lastDate = null;

  return (
    <div
      className="glass-panel overflow-hidden flex community-workspace-height border max-lg:rounded-none"
      style={{ borderColor: 'var(--color-glass-border)' }}
    >
      {/* Slack sidebar */}
      <aside
        className={cn(
          'w-full lg:max-w-[260px] shrink-0 flex flex-col border-r bg-[color-mix(in_srgb,var(--color-surface-800)_60%,transparent)]',
          mobileShowPanel ? 'hidden lg:flex' : 'flex'
        )}
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="p-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <BrandWordmark size="sm" />
          <p className="font-mono text-[10px] mt-2 pl-0.5" style={{ color: 'var(--color-text-muted)' }}>
            community workspace
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          <section>
            <p className="section-label text-[10px] px-2 mb-2">channels</p>
            <div className="space-y-0.5">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => openChannel(ch.slug)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg font-mono text-sm transition-colors flex items-center gap-2',
                    view === 'channel' && activeChannel === ch.slug
                      ? 'bg-white/[0.08] text-[var(--color-accent)] font-semibold'
                      : 'hover:bg-white/[0.04]'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span style={{ color: 'var(--color-text-muted)' }}>#</span> {ch.name}
                  </span>
                  <UnreadBadge count={unreadChannels[ch.slug] || 0} />
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="section-label text-[10px] px-2 mb-2">direct messages</p>
            <div className="space-y-0.5">
              {conversations.length === 0 ? (
                <p className="px-2 font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  No DMs yet
                </p>
              ) : (
                conversations.slice(0, 8).map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => openDm(conv)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors',
                      view === 'dm' && activeDmId === conv.id
                        ? 'bg-white/[0.08]'
                        : 'hover:bg-white/[0.04]'
                    )}
                  >
                    <UserAvatar {...memberAvatarProps(conv.peer)} size={28} />
                    <span className="text-sm truncate flex-1">{memberLabel(conv.peer)}</span>
                    <UnreadBadge count={conv.unreadCount || unreadConversations[conv.id] || 0} />
                  </button>
                ))
              )}
            </div>
          </section>

          <section>
            <p className="section-label text-[10px] px-2 mb-2">people · {members.length}</p>
            <input
              className="dev-input w-full text-xs py-1.5 mb-2 mx-auto block"
              placeholder="Find people..."
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
            />
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {filteredMembers.slice(0, 12).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => openDmWithMember(member)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] text-left"
                >
                  <UserAvatar {...memberAvatarProps(member)} size={24} />
                  <span className="text-xs truncate">{memberLabel(member)}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* Main workspace */}
      <div className={cn('flex-1 flex flex-col min-w-0 min-h-0', !mobileShowPanel && 'hidden lg:flex')}>
        {error && (
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <Alert>{error}</Alert>
          </div>
        )}

        {view === 'dm' ? (
          <MessagingPanel
            key={activeDmId || 'no-dm'}
            embedded
            initialConversationId={activeDmId}
            initialPeerId={activeDmUserId}
            pendingQuote={pendingQuote}
            onClearQuote={() => setPendingQuote(null)}
            members={members}
            myUserId={user?.id}
            registerRealtimeHandler={registerRealtimeHandler}
            sendDmTyping={sendDmTyping}
            realtimeConnected={realtimeConnected}
            onConversationRead={refreshUnread}
            onError={setError}
            onBack={() => setMobileShowPanel(false)}
          />
        ) : (
          <>
            <header
              className="px-2 sm:px-5 py-2 sm:py-3 border-b shrink-0 flex items-center gap-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                type="button"
                className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-white/[0.05] shrink-0"
                onClick={() => setMobileShowPanel(false)}
                aria-label="Back to channels"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-mono text-lg font-bold shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                #
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-sm sm:text-base truncate">{channelMeta?.name || activeChannel}</h2>
                {formatTypingLabel(channelTypers) ? (
                  <p className="font-mono text-[9px] sm:text-[10px] truncate animate-pulse" style={{ color: 'var(--color-accent)' }}>
                    {formatTypingLabel(channelTypers)}
                  </p>
                ) : channelMeta?.description ? (
                  <p className="hidden sm:block font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {channelMeta.description}
                    {realtimeConnected && (
                      <span style={{ color: 'var(--color-success)' }}> · live</span>
                    )}
                  </p>
                ) : realtimeConnected ? (
                  <p className="hidden sm:block font-mono text-[10px]" style={{ color: 'var(--color-success)' }}>
                    live
                  </p>
                ) : null}
                {!formatTypingLabel(channelTypers) && channelMeta?.description && (
                  <p className="sm:hidden font-mono text-[9px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {realtimeConnected ? 'live' : channelMeta.description}
                  </p>
                )}
              </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4">
              {posts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <p className="text-3xl mb-3">#</p>
                  <p className="font-semibold">Welcome to #{channelMeta?.name || activeChannel}</p>
                  <p className="font-mono text-xs mt-1 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
                    This is the start of the channel. Say hello to everyone!
                  </p>
                </div>
              ) : (
                posts.map((post) => {
                  const day = new Date(post.createdAt).toDateString();
                  const showDivider = day !== lastDate;
                  if (showDivider) lastDate = day;
                  const showUnreadDivider = firstUnreadPostId === post.id;

                  return (
                    <div key={post.id}>
                      {showUnreadDivider && (
                        <div className="flex items-center gap-3 py-3 my-1">
                          <div className="flex-1 h-px" style={{ background: 'var(--color-accent)' }} />
                          <span
                            className="font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                            style={{
                              color: 'var(--color-accent)',
                              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                            }}
                          >
                            New messages
                          </span>
                          <div className="flex-1 h-px" style={{ background: 'var(--color-accent)' }} />
                        </div>
                      )}
                      {showDivider && (
                        <div className="flex items-center gap-3 py-4">
                          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                            {formatDateDivider(post.createdAt)}
                          </span>
                          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                        </div>
                      )}
                      <SlackPost
                        post={post}
                        members={members}
                        quickEmojis={quickEmojis}
                        showEmojiPicker={showEmojiPicker === post.id}
                        onToggleEmojiPicker={() =>
                          setShowEmojiPicker((id) => (id === post.id ? null : post.id))
                        }
                        onReact={(emoji) => handleReaction(post.id, emoji)}
                        onReplyPrivately={() => replyPrivately(post)}
                        onMentionClick={(user) => openDmWithMember(user)}
                      />
                    </div>
                  );
                })
              )}
              <div ref={feedEndRef} />
            </div>

            <form
              onSubmit={handlePost}
              className="p-2 sm:p-3 border-t shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div
                className="rounded-xl border"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
              >
                <div className="flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2">
                  <MentionComposer
                    inputRef={composerRef}
                    rows={1}
                    compact
                    className="flex-1 min-w-0"
                    placeholder={`#${channelMeta?.name || activeChannel} · @mention`}
                    value={composer}
                    onChange={(v) => {
                      setComposer(v);
                      pingChannelTyping();
                    }}
                    onBlur={stopChannelTyping}
                    members={members}
                    onKeyDown={handleComposerKeyDown}
                    maxLength={2000}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="shrink-0 mb-0.5 min-w-[3.5rem]"
                    loading={posting}
                    disabled={!composer.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
              <p className="hidden sm:block font-mono text-[10px] mt-1.5 px-1" style={{ color: 'var(--color-text-muted)' }}>
                @ mention · Enter to send · Shift+Enter new line
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function SlackPost({
  post,
  members,
  quickEmojis,
  showEmojiPicker,
  onToggleEmojiPicker,
  onReact,
  onReplyPrivately,
  onMentionClick,
}) {
  const { user } = useAuth();
  const [hover, setHover] = useState(false);
  const name = memberLabel(post.author);
  const own = post.isOwn;
  const avatarProps = own
    ? memberAvatarProps(user, 'You')
    : memberAvatarProps(post.author, name);

  return (
    <article
      id={`post-${post.id}`}
      className={cn(
        'group relative flex gap-3 py-2 px-2 -mx-2 rounded-xl transition-colors',
        own
          ? 'flex-row-reverse ml-auto max-w-[min(92%,640px)] hover:bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]'
          : 'hover:bg-white/[0.03]'
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <UserAvatar {...avatarProps} size={36} className="mt-0.5 shrink-0" />

      <div className={cn('min-w-0 flex flex-col', own ? 'items-end flex-1' : 'flex-1 items-start')}>
        <div className={cn('flex items-baseline gap-2 flex-wrap mb-1', own && 'flex-row-reverse')}>
          <span
            className="font-semibold text-sm"
            style={own ? { color: 'var(--color-accent)' } : undefined}
          >
            {own ? 'You' : name}
          </span>
          {!own && post.author.role === 'ADMIN' && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: 'var(--color-warning)', background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)' }}>
              admin
            </span>
          )}
          {own && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}>
              you
            </span>
          )}
          <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {formatTime(post.createdAt)}
          </span>
        </div>

        <div
          className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap break-words px-3.5 py-2.5 rounded-2xl',
            own ? 'rounded-br-md' : 'rounded-bl-md border'
          )}
          style={
            own
              ? {
                  background: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                  boxShadow: 'var(--shadow-accent)',
                }
              : {
                  background: 'var(--color-surface-700)',
                  borderColor: 'var(--color-border)',
                }
          }
        >
          <MentionText
            text={post.content}
            members={members}
            isOwn={own}
            onMentionClick={onMentionClick}
          />
        </div>

        {post.reactions?.length > 0 && (
          <div className={cn('flex flex-wrap gap-1.5 mt-2', own && 'justify-end')}>
            {post.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(r.emoji)}
                className={cn(
                  'font-mono text-xs px-2 py-0.5 rounded-full border transition-colors',
                  r.reacted && 'border-[var(--color-accent)]'
                )}
                style={{
                  background: r.reacted
                    ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                    : 'var(--color-surface-700)',
                  borderColor: r.reacted ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {(hover || showEmojiPicker) && (
        <div
          className={cn(
            'absolute -top-3 flex items-center gap-0.5 rounded-lg border shadow-lg p-0.5',
            own ? 'left-2' : 'right-2'
          )}
          style={{ background: 'var(--color-surface-800)', borderColor: 'var(--color-border)' }}
        >
          <button
            type="button"
            onClick={onToggleEmojiPicker}
            className="p-1.5 rounded hover:bg-white/[0.06] text-sm"
            title="Add reaction"
          >
            😊
          </button>
          {!own && (
            <button
              type="button"
              onClick={onReplyPrivately}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/[0.06] font-mono text-[10px] whitespace-nowrap"
              title="Reply privately"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply privately
            </button>
          )}
        </div>
      )}

      {showEmojiPicker && (
        <div
          className={cn(
            'absolute top-8 z-10 flex gap-1 rounded-lg border p-2 shadow-xl',
            own ? 'left-2' : 'right-2'
          )}
          style={{ background: 'var(--color-surface-800)', borderColor: 'var(--color-border)' }}
        >
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="text-lg p-1 rounded hover:bg-white/[0.08]"
              onClick={() => onReact(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
