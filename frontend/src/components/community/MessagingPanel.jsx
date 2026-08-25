import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getConversations,
  getCommunityMembers,
  startConversation,
  getConversationMessages,
  sendDirectMessage,
  memberLabel,
  memberAvatarProps,
  sortMembersOnlineFirst,
} from '../../communityApi';
import Button from '../ui/Button';
import UserAvatar from './UserAvatar';
import OnlineMemberAvatar from './OnlineMemberAvatar';
import OnlineMembersSection from './OnlineMembersSection';
import ReplyQuote from './ReplyQuote';
import MentionComposer from './MentionComposer';
import MentionText from './MentionText';
import { cn } from '../../lib/cn';
import { serializeMentions } from '../../lib/mentionUtils';
import { useTypingEmitter, formatTypingLabel } from '../../hooks/useCommunityRealtime';
import { dmRoom, normalizeIncomingDm } from '../../lib/communityRealtime';

function relativeTime(date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupMessagesByDay(messages) {
  const groups = [];
  let currentDay = null;

  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== currentDay) {
      currentDay = day;
      groups.push({ type: 'day', id: day, label: formatDayLabel(msg.createdAt) });
    }
    groups.push({ type: 'msg', id: msg.id, data: msg });
  }
  return groups;
}

export default function MessagingPanel({
  onError,
  initialPeerId,
  embedded = false,
  initialConversationId = null,
  initialDraft = '',
  pendingQuote = null,
  onClearQuote,
  members: mentionMembersProp = null,
  myUserId = null,
  registerRealtimeHandler = null,
  sendDmTyping = null,
  realtimeConnected = false,
  onConversationRead = null,
  onBack = null,
}) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeId, setActiveId] = useState(initialConversationId);
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState(initialDraft);
  const [replyQuote, setReplyQuote] = useState(pendingQuote);
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [listQuery, setListQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(embedded);
  const [dmTypers, setDmTypers] = useState([]);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState(null);
  const [scrollToEnd, setScrollToEnd] = useState(true);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const openedInitialRef = useRef(false);
  const sendingRef = useRef(false);

  const mentionMembers = mentionMembersProp ?? members;

  const { ping: pingDmTyping, stop: stopDmTyping } = useTypingEmitter(
    sendDmTyping,
    'dm',
    activeId
  );

  useEffect(() => {
    setDmTypers([]);
  }, [activeId]);

  useEffect(() => {
    if (!registerRealtimeHandler || !activeId) return undefined;
    return registerRealtimeHandler((msg) => {
      if (msg.type === 'dm:message' && msg.conversationId === activeId) {
        if (msg.message.senderId === myUserId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.message.id)) return prev;
          return [...prev, normalizeIncomingDm(msg.message, myUserId)];
        });
        setScrollToEnd(true);
      }
      if (
        msg.type === 'typing' &&
        (msg.room === dmRoom(activeId) || msg.conversationId === activeId)
      ) {
        setDmTypers((prev) => {
          const next = prev.filter((t) => t.userId !== msg.userId);
          if (msg.isTyping && msg.userId !== myUserId) {
            next.push({ userId: msg.userId, name: msg.name });
          }
          return next;
        });
      }
    });
  }, [activeId, myUserId, registerRealtimeHandler]);

  const loadList = () =>
    Promise.all([getConversations(), getCommunityMembers()])
      .then(([convs, users]) => {
        const onlineById = new Map(users.map((m) => [m.id, m]));
        setConversations(
          convs.map((conv) => {
            const member = onlineById.get(conv.peer?.id);
            if (!member) return conv;
            return {
              ...conv,
              peer: {
                ...conv.peer,
                isOnline: member.isOnline,
                wsConnected: member.wsConnected,
              },
            };
          })
        );
        setMembers(users);
      })
      .catch((err) => onError?.(err.message));

  const applyMessages = (data) => {
    setMessages(data.messages);
    setActivePeer(data.peer);
    if (data.firstUnreadMessageId) {
      setFirstUnreadMessageId(data.firstUnreadMessageId);
      setScrollToEnd(false);
    } else {
      setFirstUnreadMessageId(null);
      setScrollToEnd(true);
    }
  };

  const openChat = async (conversation, peer) => {
    setActiveId(conversation.id);
    setActivePeer(peer || conversation.peer);
    setMobileShowChat(true);
    setShowNewChat(false);
    setLoadingChat(true);
    try {
      const data = await getConversationMessages(conversation.id);
      applyMessages(data);
      onConversationRead?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoadingChat(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  useEffect(() => {
    if (!embedded) loadList();
    if (realtimeConnected) return undefined;
    const interval = setInterval(() => {
      if (!embedded) loadList();
      if (activeId) {
        getConversationMessages(activeId)
          .then((data) => {
            applyMessages(data);
          })
          .catch(() => {});
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [activeId, embedded, realtimeConnected]);

  useEffect(() => {
    if (!initialConversationId) return;
    setActiveId(initialConversationId);
    setActivePeer(null);
    setMessages([]);
    setLoadingChat(true);
    getConversationMessages(initialConversationId)
      .then((data) => {
        applyMessages(data);
        onConversationRead?.();
      })
      .catch((err) => onError?.(err.message))
      .finally(() => {
        setLoadingChat(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      });
  }, [initialConversationId]);

  useEffect(() => {
    if (initialDraft) setText(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    if (pendingQuote) setReplyQuote(pendingQuote);
  }, [pendingQuote]);

  useEffect(() => {
    if (loadingChat) return;
    if (firstUnreadMessageId) {
      const el = document.getElementById(`msg-${firstUnreadMessageId}`);
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        setFirstUnreadMessageId(null);
        setScrollToEnd(true);
        return;
      }
    }
    if (scrollToEnd) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingChat, firstUnreadMessageId, scrollToEnd]);

  const filteredConversations = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => memberLabel(c.peer).toLowerCase().includes(q));
  }, [conversations, listQuery]);

  const filteredMembers = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    const list = !q ? members : members.filter((m) => memberLabel(m).toLowerCase().includes(q));
    return sortMembersOnlineFirst(list);
  }, [members, listQuery]);

  const startChatWith = async (member) => {
    onError?.('');
    try {
      const conversation = await startConversation({ userId: member.id });
      setConversations((prev) => {
        if (prev.some((c) => c.id === conversation.id)) return prev;
        return [{ ...conversation, peer: member }, ...prev];
      });
      await openChat(conversation, member);
    } catch (err) {
      onError?.(err.message);
    }
  };

  useEffect(() => {
    if (embedded || !initialPeerId || members.length === 0 || openedInitialRef.current) return;
    const member = members.find((m) => m.id === initialPeerId);
    if (member) {
      openedInitialRef.current = true;
      startChatWith(member);
    }
  }, [initialPeerId, members.length, embedded]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!activeId || !text.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    onError?.('');
    try {
      const quotePayload = replyQuote
        ? {
            quotedPostId: replyQuote.quotedPostId,
            quotedContent: replyQuote.quotedContent,
          }
        : {};
      const content = serializeMentions(text.trim(), mentionMembers);
      const msg = await sendDirectMessage(activeId, content, quotePayload);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setScrollToEnd(true);
      setText('');
      setReplyQuote(null);
      onClearQuote?.();
      stopDmTyping();
      if (!embedded) loadList();
    } catch (err) {
      onError?.(err.message);
    } finally {
      sendingRef.current = false;
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const dismissQuote = () => {
    setReplyQuote(null);
    onClearQuote?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const grouped = groupMessagesByDay(messages);
  const peerName = memberLabel(activePeer);

  const chatContent = !activeId ? (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
      >
        <svg className="w-8 h-8" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <p className="font-semibold mb-1">Your messages</p>
      <p className="font-mono text-xs max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
        Pick someone from the sidebar to start a private conversation
      </p>
    </div>
  ) : (
    <>
      <header
        className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {(onBack || !embedded) && (
          <button
            type="button"
            className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-white/[0.05] shrink-0"
            onClick={onBack || (() => setMobileShowChat(false))}
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <OnlineMemberAvatar {...memberAvatarProps(activePeer, peerName)} size={32} className="sm:hidden shrink-0" />
        <OnlineMemberAvatar {...memberAvatarProps(activePeer, peerName)} size={40} className="hidden sm:block shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm sm:text-base truncate">{activePeer ? peerName : 'Loading…'}</p>
          <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {activePeer?.isOnline ? (
              <span style={{ color: 'var(--color-success)' }}>
                {activePeer.wsConnected ? t('community.activeNow') : t('community.online')}
              </span>
            ) : (
              'Direct message'
            )}
            {realtimeConnected && (
              <span style={{ color: 'var(--color-success)' }}> · live</span>
            )}
          </p>
          {formatTypingLabel(dmTypers) && (
            <p className="font-mono text-[9px] sm:text-[10px] truncate animate-pulse" style={{ color: 'var(--color-accent)' }}>
              {formatTypingLabel(dmTypers)}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4 space-y-1">
        {loadingChat ? (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
              Loading messages...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <UserAvatar {...memberAvatarProps(activePeer, peerName)} size={56} />
            <p className="mt-4 font-semibold">{peerName}</p>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          grouped.map((item) =>
            item.type === 'day' ? (
              <div key={item.id} className="flex justify-center py-3">
                <span
                  className="font-mono text-[10px] px-3 py-1 rounded-full"
                  style={{
                    color: 'var(--color-text-muted)',
                    background: 'var(--color-surface-700)',
                  }}
                >
                  {item.label}
                </span>
              </div>
            ) : (
              <MessageBubble
                key={item.id}
                msg={item.data}
                peer={activePeer}
                peerName={peerName}
                members={mentionMembers}
                showUnreadDivider={firstUnreadMessageId === item.data.id}
              />
            )
          )
        )}
        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="p-2 sm:p-3 border-t shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="rounded-xl border"
          style={{
            background: 'var(--color-surface-700)',
            borderColor: 'var(--color-border)',
          }}
        >
          {replyQuote && (
            <div className="px-1.5 pt-1.5 sm:px-2 sm:pt-2">
              <ReplyQuote
                variant="composer"
                author={replyQuote.quotedAuthor}
                excerpt={replyQuote.quotedExcerpt}
                text={replyQuote.quotedContent}
                onDismiss={dismissQuote}
              />
            </div>
          )}
          <div className={cn('flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2', replyQuote ? 'pt-0' : '')}>
            <MentionComposer
              inputRef={inputRef}
              rows={1}
              compact
              className="flex-1 min-w-0"
              placeholder={
                replyQuote
                  ? 'Private reply… · @mention'
                  : 'Message… · @mention'
              }
              value={text}
              onChange={(v) => {
                setText(v);
                pingDmTyping();
              }}
              onBlur={stopDmTyping}
              members={mentionMembers}
              onKeyDown={handleKeyDown}
              maxLength={2000}
            />
            <Button
              type="submit"
              size="sm"
              className="shrink-0 mb-0.5 h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3"
              loading={sending}
              disabled={!text.trim()}
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
        </div>
        <p className="hidden sm:block font-mono text-[10px] mt-1.5 px-1" style={{ color: 'var(--color-text-muted)' }}>
          @ mention · Enter to send · Shift+Enter for new line
        </p>
      </form>
    </>
  );

  if (embedded) {
    return (
      <section className="flex-1 flex flex-col min-w-0 min-h-0">
        {chatContent}
      </section>
    );
  }

  return (
    <div
      className="glass-panel overflow-hidden flex min-h-[calc(100dvh-12rem)] max-h-[calc(100dvh-12rem)] sm:min-h-[calc(100vh-11rem)] sm:max-h-[calc(100vh-11rem)] border"
      style={{ borderColor: 'var(--color-glass-border)' }}
    >
      <aside
        className={cn(
          'w-full lg:w-[320px] shrink-0 flex flex-col border-r',
          mobileShowChat && 'hidden lg:flex'
        )}
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="p-4 border-b space-y-3 shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between gap-2">
            <p className="section-label text-[10px]">messages</p>
            <Button
              variant={showNewChat ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowNewChat((v) => !v)}
            >
              {showNewChat ? 'Close' : '+ New'}
            </Button>
          </div>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="dev-input w-full pl-9 py-2 text-sm"
              placeholder={showNewChat ? 'Search members...' : 'Search chats...'}
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!showNewChat && (
            <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <OnlineMembersSection
                members={members}
                onSelect={startChatWith}
                max={10}
                compact
              />
            </div>
          )}
          {showNewChat ? (
            <div className="p-2 space-y-1">
              <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Start a conversation
              </p>
              {filteredMembers.length === 0 ? (
                <p className="p-4 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  No members found
                </p>
              ) : (
                filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => startChatWith(member)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-white/[0.04] transition-colors"
                  >
                    <OnlineMemberAvatar {...memberAvatarProps(member)} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{memberLabel(member)}</p>
                      <p className="font-mono text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {member.email || member.phone || 'Member'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-mono text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                {listQuery ? 'No chats match your search' : 'No conversations yet'}
              </p>
              <Button size="sm" onClick={() => setShowNewChat(true)}>
                Start new chat
              </Button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const active = conv.id === activeId;
              const name = memberLabel(conv.peer);
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => openChat(conv)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 text-left transition-all border-l-2',
                    active
                      ? 'bg-white/[0.06] border-[var(--color-accent)]'
                      : 'border-transparent hover:bg-white/[0.03]'
                  )}
                >
                  <OnlineMemberAvatar {...memberAvatarProps(conv.peer, name)} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{name}</p>
                      {conv.lastMessage && (
                        <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                          {relativeTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {conv.lastMessage
                        ? `${conv.lastMessage.isOwn ? 'You: ' : ''}${conv.lastMessage.content}`
                        : 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section
        className={cn(
          'flex-1 flex flex-col min-w-0 bg-[color-mix(in_srgb,var(--color-surface-800)_50%,transparent)]',
          !mobileShowChat && 'hidden lg:flex'
        )}
      >
        {chatContent}
      </section>
    </div>
  );
}

function MessageBubble({ msg, peer, peerName, members, showUnreadDivider = false }) {
  return (
    <>
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
      <div
        id={`msg-${msg.id}`}
        className={cn('flex gap-2 mb-3', msg.isOwn ? 'flex-row-reverse' : 'flex-row')}
      >
      {!msg.isOwn && <UserAvatar {...memberAvatarProps(msg.sender || peer, peerName)} size={28} className="mt-1 shrink-0" />}
      <div className={cn('max-w-[min(85%,420px)] flex flex-col gap-1', msg.isOwn ? 'items-end' : 'items-start')}>
        {msg.quotedContent && (
          <ReplyQuote
            text={msg.quotedContent}
            isOwn={msg.isOwn}
            variant="bubble"
            className="w-full"
          />
        )}
        <div
          className={cn(
            'px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words w-full',
            msg.isOwn ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'
          )}
          style={
            msg.isOwn
              ? {
                  background: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                  boxShadow: 'var(--shadow-accent)',
                }
              : {
                  background: 'var(--color-surface-700)',
                  border: '1px solid var(--color-border)',
                }
          }
        >
          <MentionText text={msg.content} members={members} isOwn={msg.isOwn} />
        </div>
        <p
          className={cn(
            'font-mono text-[10px] px-1',
            msg.isOwn ? 'text-right' : 'text-left'
          )}
          style={{ color: 'var(--color-text-muted)' }}
        >
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
    </>
  );
}
