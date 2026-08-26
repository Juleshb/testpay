import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import { askHelpBot } from '../api.js';
import {
  findHelpBotAnswer,
  getHelpBotGreeting,
  getHelpBotSuggestions,
  getHelpBotSubtitle,
  onHelpBotLanguageChange,
} from '../lib/helpBotEngine.js';
import { getHelpBotQuickQuestions } from '../lib/helpBotI18n.js';

function createMessage(role, content, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    ...extra,
  };
}

function historyPayload(messages) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'bot')
    .slice(-8)
    .map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.content,
      topicId: m.topicId || null,
    }));
}

export default function HelpBot({ context = 'default' }) {
  const { t, i18n } = useTranslation();
  const isDeveloper = context === 'developer';
  const isApp = context === 'app';
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([createMessage('bot', getHelpBotGreeting(context))]);
  const messagesEndRef = useRef(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return onHelpBotLanguageChange(() => {
      setMessages([createMessage('bot', getHelpBotGreeting(context))]);
    });
  }, [context]);

  useEffect(() => {
    if (open) {
      document.getElementById('help-bot-input')?.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendQuestion = async (question) => {
    const trimmed = String(question || '').trim();
    if (!trimmed || typing) return;

    const prior = messagesRef.current;
    setMessages((prev) => [...prev, createMessage('user', trimmed)]);
    setInput('');
    setTyping(true);

    try {
      const data = await askHelpBot({
        question: trimmed,
        history: historyPayload(prior),
        language: (i18n.language || 'en').slice(0, 2),
        context,
      });

      // Small delay so it feels like a person is typing
      await new Promise((r) => window.setTimeout(r, 350 + Math.min(900, trimmed.length * 12)));

      if (data?.answer) {
        setMessages((prev) => [
          ...prev,
          createMessage('bot', data.answer, {
            link: data.link || null,
            source: data.source || 'knowledge',
            topicId: data.topicId || null,
          }),
        ]);
        return;
      }

      // Last resort — local FAQ
      const result = findHelpBotAnswer(trimmed, context);
      setMessages((prev) => [
        ...prev,
        createMessage('bot', result.answer, {
          link: data?.link || result.link || null,
          source: 'local',
        }),
      ]);
    } catch {
      const result = findHelpBotAnswer(trimmed, context);
      setMessages((prev) => [
        ...prev,
        createMessage('bot', result.answer, { link: result.link || null, source: 'local' }),
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const suggestions = input.trim()
    ? getHelpBotSuggestions(input, context)
    : getHelpBotQuickQuestions(context);

  return (
    <div className="help-bot" aria-live="polite">
      {open && (
        <section
          className="help-bot-panel glass-panel border"
          style={{ borderColor: 'var(--color-glass-border)' }}
          role="dialog"
          aria-label={t('help.title')}
        >
          <header className="help-bot-header">
            <div className="min-w-0">
              <p className="font-semibold text-sm">{t('help.title')}</p>
              <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                {getHelpBotSubtitle(context)}
              </p>
            </div>
            <button
              type="button"
              className="help-bot-close"
              onClick={() => setOpen(false)}
              aria-label={t('common.closeHelp')}
            >
              ×
            </button>
          </header>

          <div className="help-bot-messages max-h-64 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`help-bot-message ${message.role === 'user' ? 'help-bot-message-user' : ''}`}
              >
                <p className="help-bot-message-label">
                  {message.role === 'user' ? t('common.you') : t('common.helpBot')}
                </p>
                <p className="help-bot-message-text">{message.content}</p>
                {message.role === 'bot' && message.link && (
                  <Link
                    to={message.link}
                    className="help-bot-link"
                    onClick={() => setOpen(false)}
                  >
                    {t('help.openPage')} →
                  </Link>
                )}
              </div>
            ))}
            {typing && (
              <div className="help-bot-message">
                <p className="help-bot-message-label">{t('common.helpBot')}</p>
                <p className="help-bot-message-text help-bot-typing">{t('common.typing')}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {suggestions.length > 0 && (
            <div className="help-bot-suggestions">
              {suggestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="help-bot-suggestion"
                  onClick={() => sendQuestion(question)}
                  disabled={typing}
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="help-bot-form">
            <input
              id="help-bot-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('common.askQuestion')}
              className="help-bot-input"
              disabled={typing}
              maxLength={500}
            />
            <Button type="submit" size="sm" disabled={!input.trim() || typing}>
              {t('common.send')}
            </Button>
          </form>

          <p className="help-bot-footer">
            {isDeveloper || isApp ? (
              <>
                {t('help.publicGuideLink')}{' '}
                <Link to="/guide" className="text-[var(--color-accent)] hover:underline">
                  {t('help.userGuideLink')}
                </Link>
              </>
            ) : (
              <>
                {t('common.readyToStart')}{' '}
                <Link to="/register" className="text-[var(--color-accent)] hover:underline">
                  {t('common.createAccount')}
                </Link>
              </>
            )}
          </p>
        </section>
      )}

      <button
        type="button"
        className={`help-bot-toggle ${open ? 'help-bot-toggle-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? t('common.closeHelp') : t('common.openHelp')}
        title={open ? t('common.closeHelp') : t('common.needHelp')}
      >
        {open ? <HelpBotCloseIcon /> : <HelpBotFaceIcon />}
      </button>
    </div>
  );
}

function HelpBotFaceIcon() {
  return (
    <svg className="help-bot-toggle-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="7" width="16" height="12" rx="4" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="9.5" cy="12.5" r="1.25" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="1.25" fill="currentColor" />
      <path d="M9.5 16h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 7V4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="3.5" r="1" fill="currentColor" />
      <path d="M4.5 11H3a1 1 0 00-1 1v1a1 1 0 001 1h1.5M19.5 11H21a1 1 0 011 1v1a1 1 0 01-1 1h-1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function HelpBotCloseIcon() {
  return (
    <svg className="help-bot-toggle-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
