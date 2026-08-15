import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLiveQuotes } from '../api';
import { TokenIcon } from './CryptoIcon';
import { Card, CardContent, CardTitle } from './ui/Card';

const POLL_FALLBACK_MS = 3_000;
const HISTORY_LEN = 28;

function formatChange(change24h) {
  if (change24h == null || Number.isNaN(Number(change24h))) return null;
  const value = Number(change24h);
  const sign = value > 0 ? '+' : value < 0 ? '' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function trendFromChange(change24h) {
  const value = Number(change24h);
  if (!Number.isFinite(value) || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function formatDelta(delta) {
  const abs = Math.abs(delta);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return `${delta > 0 ? '+' : '-'}${abs.toFixed(digits)}`;
}

function TrendArrow({ direction, className = '' }) {
  if (direction === 'flat') {
    return (
      <span className={`quote-arrow quote-arrow-flat ${className}`} aria-hidden>
        ●
      </span>
    );
  }
  return (
    <span className={`quote-arrow quote-arrow-${direction} ${className}`} aria-hidden>
      {direction === 'up' ? '▲' : '▼'}
    </span>
  );
}

function Sparkline({ points, direction }) {
  if (!points || points.length < 2) {
    return <div className="quote-sparkline quote-sparkline-empty" />;
  }

  const width = 120;
  const height = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || Math.abs(max) * 0.001 || 1;
  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const stroke =
    direction === 'up'
      ? 'var(--color-success)'
      : direction === 'down'
        ? 'var(--color-danger)'
        : 'var(--color-text-muted)';

  return (
    <svg className="quote-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
      <circle
        cx={coords[coords.length - 1].split(',')[0]}
        cy={coords[coords.length - 1].split(',')[1]}
        r="2.4"
        fill={stroke}
        className="quote-sparkline-dot"
      />
    </svg>
  );
}

function buildHistory(prevHistory, quotes) {
  const next = { ...prevHistory };
  for (const quote of quotes || []) {
    const series = next[quote.symbol] ? [...next[quote.symbol]] : [];
    const last = series[series.length - 1];
    if (last !== quote.priceUsd) {
      series.push(quote.priceUsd);
    } else if (series.length < 2) {
      // seed a second point so sparkline can render immediately from 24h direction
      const drift = (quote.change24h || 0) >= 0 ? 0.9997 : 1.0003;
      series.unshift(quote.priceUsd * drift);
      series.push(quote.priceUsd);
    } else {
      series.push(quote.priceUsd);
    }
    next[quote.symbol] = series.slice(-HISTORY_LEN);
  }
  return next;
}

export default function LiveQuotes() {
  const { t } = useTranslation();
  const [quotes, setQuotes] = useState([]);
  const [history, setHistory] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [tickMeta, setTickMeta] = useState({});
  const quotesRef = useRef([]);
  const flashTimers = useRef({});

  const applyQuotes = (data) => {
    const nextQuotes = data.quotes || [];
    const prevMap = new Map((quotesRef.current || []).map((q) => [q.symbol, q.priceUsd]));

    setTickMeta((current) => {
      const nextTickMeta = { ...current };
      for (const quote of nextQuotes) {
        const prev = prevMap.get(quote.symbol);
        if (prev != null && quote.priceUsd != null && prev !== quote.priceUsd) {
          const direction = quote.priceUsd > prev ? 'up' : 'down';
          nextTickMeta[quote.symbol] = {
            direction,
            delta: quote.priceUsd - prev,
            flash: direction,
          };
          if (flashTimers.current[quote.symbol]) clearTimeout(flashTimers.current[quote.symbol]);
          flashTimers.current[quote.symbol] = setTimeout(() => {
            setTickMeta((latest) => {
              const row = latest[quote.symbol];
              if (!row) return latest;
              return {
                ...latest,
                [quote.symbol]: { ...row, flash: null },
              };
            });
          }, 1200);
        } else if (!nextTickMeta[quote.symbol]) {
          nextTickMeta[quote.symbol] = {
            direction: trendFromChange(quote.change24h),
            delta: null,
            flash: null,
          };
        } else if (nextTickMeta[quote.symbol] && nextTickMeta[quote.symbol].direction === 'flat') {
          nextTickMeta[quote.symbol] = {
            ...nextTickMeta[quote.symbol],
            direction: trendFromChange(quote.change24h),
          };
        }
      }
      return nextTickMeta;
    });

    quotesRef.current = nextQuotes;
    setQuotes(nextQuotes);
    setHistory((prev) => buildHistory(prev, nextQuotes));
    setUpdatedAt(data.updatedAt || new Date().toISOString());
    setError('');
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    let source = null;
    let pollTimer = null;
    let reconnectTimer = null;

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      if (pollTimer || cancelled) return;
      const poll = () => {
        getLiveQuotes()
          .then((data) => {
            if (!cancelled) applyQuotes(data);
          })
          .catch((err) => {
            if (!cancelled) {
              setError(err.message);
              setLoading(false);
            }
          });
      };
      poll();
      pollTimer = setInterval(poll, POLL_FALLBACK_MS);
    };

    const connectStream = () => {
      if (cancelled || typeof EventSource === 'undefined') {
        startPolling();
        return;
      }

      source = new EventSource('/api/public/quotes/stream');

      source.onopen = () => {
        if (cancelled) return;
        setLive(true);
        stopPolling();
      };

      source.onmessage = (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);
          if (data.error && (!data.quotes || data.quotes.length === 0)) {
            setError(data.error);
            setLoading(false);
            return;
          }
          applyQuotes(data);
          setLive(true);
        } catch {
          // ignore malformed frames
        }
      };

      source.onerror = () => {
        if (cancelled) return;
        setLive(false);
        source?.close();
        source = null;
        startPolling();
        reconnectTimer = setTimeout(() => {
          if (!cancelled) connectStream();
        }, 4000);
      };
    };

    connectStream();

    return () => {
      cancelled = true;
      setLive(false);
      stopPolling();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
      Object.values(flashTimers.current).forEach(clearTimeout);
      flashTimers.current = {};
    };
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="section-label">{t('dashboard.liveQuotes')}</p>
        <span className="inline-flex items-center gap-2 font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${live ? 'quote-live-dot' : ''}`}
            style={{ background: live ? 'var(--color-success)' : 'var(--color-text-muted)' }}
            aria-hidden
          />
          {live
            ? t('dashboard.quotesStreaming')
            : updatedAt
              ? t('dashboard.quotesUpdated', { time: new Date(updatedAt).toLocaleTimeString() })
              : t('dashboard.quotesLive')}
        </span>
      </div>

      {error && quotes.length === 0 ? (
        <div className="glass-panel p-4 font-mono text-xs" style={{ color: 'var(--color-danger)' }}>
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {(loading && quotes.length === 0 ? Array.from({ length: 7 }) : quotes).map((quote, index) => {
            if (!quote) {
              return (
                <Card key={`skeleton-${index}`} className="animate-pulse">
                  <CardContent className="pt-4 pb-4">
                    <div className="h-16 rounded bg-white/5" />
                  </CardContent>
                </Card>
              );
            }

            const dayTrend = trendFromChange(quote.change24h);
            const meta = tickMeta[quote.symbol] || {};
            const tickTrend = meta.direction || dayTrend;
            const flash = meta.flash;
            const points = history[quote.symbol] || [];
            const sparkTrend =
              points.length >= 2
                ? points[points.length - 1] > points[0]
                  ? 'up'
                  : points[points.length - 1] < points[0]
                    ? 'down'
                    : dayTrend
                : dayTrend;
            const changeLabel = formatChange(quote.change24h);
            const dayColor =
              dayTrend === 'up'
                ? 'var(--color-success)'
                : dayTrend === 'down'
                  ? 'var(--color-danger)'
                  : 'var(--color-text-muted)';
            const tickColor =
              tickTrend === 'up'
                ? 'var(--color-success)'
                : tickTrend === 'down'
                  ? 'var(--color-danger)'
                  : 'var(--color-text-muted)';

            return (
              <Card key={quote.symbol} className={flash ? `quote-flash-${flash}` : undefined}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <TokenIcon symbol={quote.symbol} size={24} />
                      <CardTitle className="text-sm font-mono truncate mb-0">{quote.symbol}</CardTitle>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                        flash ? `quote-arrow-bounce-${flash}` : ''
                      }`}
                      style={{
                        color: dayColor,
                        background:
                          dayTrend === 'flat'
                            ? 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)'
                            : `color-mix(in srgb, ${dayColor} 16%, transparent)`,
                      }}
                    >
                      <TrendArrow direction={dayTrend} className="quote-arrow-inline" />
                      {changeLabel || '0.00%'}
                    </span>
                  </div>

                  <p
                    className={`font-mono text-base sm:text-lg font-semibold tabular-nums ${
                      flash ? `quote-price-${flash}` : ''
                    }`}
                    style={!flash ? { color: tickColor } : undefined}
                  >
                    ${quote.priceUsdFormatted ?? quote.priceUsd}
                  </p>

                  {meta.delta != null && (
                    <p className="font-mono text-[11px] mt-0.5 tabular-nums" style={{ color: tickColor }}>
                      <TrendArrow direction={tickTrend} className="quote-arrow-inline" /> {formatDelta(meta.delta)}{' '}
                      <span style={{ color: 'var(--color-text-muted)' }}>{t('dashboard.quotesTick')}</span>
                    </p>
                  )}

                  <div className="mt-2">
                    <Sparkline points={points} direction={sparkTrend} />
                  </div>

                  <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {t('dashboard.quotes24hMove')}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
