import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import {
  findHelpBotAnswer,
  getHelpBotGreeting,
  getHelpBotSuggestions,
  onHelpBotLanguageChange,
} from '../lib/helpBotEngine.js';
import { getHelpBotQuickQuestions } from '../lib/helpBotI18n.js';

function createMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

export default function HelpBot({ context = 'default' }) {
  const { t } = useTranslation();
  const isDeveloper = context === 'developer';
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([createMessage('bot', getHelpBotGreeting(context))]);

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

  const sendQuestion = (question) => {
    const trimmed = String(question || '').trim();
    if (!trimmed || typing) return;

    setMessages((prev) => [...prev, createMessage('user', trimmed)]);
    setInput('');
    setTyping(true);

    window.setTimeout(() => {
      const result = findHelpBotAnswer(trimmed, context);
      setMessages((prev) => [...prev, createMessage('bot', result.answer)]);
      setTyping(false);
    }, 450);
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
                {isDeveloper ? t('help.devSubtitle') : t('help.subtitle')}
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
              </div>
            ))}
            {typing && (
              <div className="help-bot-message">
                <p className="help-bot-message-label">{t('common.helpBot')}</p>
                <p className="help-bot-message-text help-bot-typing">{t('common.typing')}</p>
              </div>
            )}
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
              maxLength={240}
            />
            <Button type="submit" size="sm" disabled={!input.trim() || typing}>
              {t('common.send')}
            </Button>
          </form>

          <p className="help-bot-footer">
            {isDeveloper ? (
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
      >
        <span className="help-bot-toggle-text">{open ? t('common.closeHelp') : t('common.needHelp')}</span>
      </button>
    </div>
  );
}
