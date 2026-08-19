import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';

const TICK_MS = 250;
const HISTORY_LEN = 36;

function estimateLive(pos, now) {
  const daily = parseFloat(pos.dailyIncome) || 0;
  const confirmed = parseFloat(pos.totalEarned) || 0;
  const hourSession = (pos.sessionHours ?? pos.option?.sessionHours) > 0;

  if (hourSession) {
    const started = new Date(pos.startedAt).getTime();
    const ends = new Date(pos.endsAt).getTime();
    const sessionMs = Math.max(1, ends - started);
    const sinceMs = Math.max(0, now - started);
    const sessionProgress = Math.min(1, sinceMs / sessionMs);
    const pending = daily * sessionProgress;
    return {
      confirmed,
      pending,
      liveTotal: confirmed + pending,
      dayProgress: sessionProgress,
      hourSession: true,
      hashPulse: 0.55 + Math.sin(now / 320) * 0.2 + Math.sin(now / 170) * 0.15,
    };
  }

  const anchor = pos.lastAccruedAt || pos.startedAt;
  const sinceMs = Math.max(0, now - new Date(anchor).getTime());
  const dayProgress = Math.min(1, sinceMs / (24 * 60 * 60 * 1000));
  const pending = daily * dayProgress;
  return {
    confirmed,
    pending,
    liveTotal: confirmed + pending,
    dayProgress,
    hourSession: false,
    hashPulse: 0.55 + Math.sin(now / 320) * 0.2 + Math.sin(now / 170) * 0.15,
  };
}

function HashWave({ progress, color }) {
  const bars = 16;
  return (
    <div className="mining-hash-wave" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const phase = (progress * 8 + i * 0.45) % (Math.PI * 2);
        const height = 28 + Math.abs(Math.sin(phase)) * 72;
        return (
          <span
            key={i}
            className="mining-hash-bar"
            style={{
              height: `${height}%`,
              background: color,
              opacity: 0.35 + Math.abs(Math.sin(phase)) * 0.65,
            }}
          />
        );
      })}
    </div>
  );
}

function EarningsSparkline({ points }) {
  if (!points || points.length < 2) {
    return <div className="mining-sparkline mining-sparkline-empty" />;
  }
  const width = 160;
  const height = 40;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || Math.abs(max) * 0.0001 || 0.0001;
  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 6) - 3;
    return `${x},${y}`;
  });
  const last = coords[coords.length - 1].split(',');

  return (
    <svg className="mining-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <polyline
        fill="none"
        stroke="var(--color-success)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--color-success)" className="mining-live-dot" />
    </svg>
  );
}

export function LiveMiningCard({ position, compact = false }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const historyRef = useRef([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const live = useMemo(() => estimateLive(position, now), [position, now]);

  useEffect(() => {
    const next = [...historyRef.current, live.liveTotal].slice(-HISTORY_LEN);
    historyRef.current = next;
    setHistory(next);
  }, [live.liveTotal]);

  const badgeColor = position.option?.badgeColor || 'var(--color-success)';

  return (
    <article
      className="glass-panel p-5 border mining-live-card"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-success) 40%, transparent)',
        background: 'color-mix(in srgb, var(--color-success) 6%, transparent)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: badgeColor }} />
            <h3 className="font-semibold text-sm truncate">{position.option?.name}</h3>
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-full uppercase shrink-0"
              style={{
                color: 'var(--color-success)',
                background: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
              }}
            >
              <span className="mining-live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
              {t('mining.liveMining')}
            </span>
          </div>
          <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {position.option?.hashRate} · {position.option?.coin} · {position.dailyRate}% {t('mining.daily')}
          </p>
          {position.startedIsFree && !position.option?.isFree && (
            <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-warning)' }}>
              {t('mining.renewalRequiresPayment', { min: position.option?.minAmount || '0' })}
            </p>
          )}
        </div>
        <p className="font-mono text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--color-accent)' }}>
          ${position.amount}
        </p>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            {t('mining.liveEarnings')}
          </p>
          <p className="font-mono text-lg font-bold tabular-nums" style={{ color: 'var(--color-success)' }}>
            ${live.liveTotal.toFixed(6)}
          </p>
        </div>
        <p className="font-mono text-[11px] tabular-nums mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('mining.confirmedPending', {
            confirmed: live.confirmed.toFixed(4),
            pending: live.pending.toFixed(6),
          })}
        </p>
        <p className="font-mono text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {t('mining.earningsNotWithdrawable')}
        </p>
        <EarningsSparkline points={history} />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            {t('mining.hashActivity')}
          </p>
          <p className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--color-accent)' }}>
            {(live.hashPulse * 100).toFixed(0)}% {t('mining.load')}
          </p>
        </div>
        <HashWave progress={now / 1000} color="var(--color-accent)" />
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${Math.max(4, live.dayProgress * 100)}%`,
              background: 'var(--color-success)',
            }}
          />
        </div>
        <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('mining.nextPayoutProgress', { percent: (live.dayProgress * 100).toFixed(1) })}
        </p>
      </div>

      {!compact && (
        <dl className="grid grid-cols-3 gap-2 font-mono text-[11px] mb-3">
          <div>
            <dt style={{ color: 'var(--color-text-muted)' }}>
              {live.hourSession ? t('mining.hoursLeft') : t('mining.daysLeft')}
            </dt>
            <dd className="font-semibold">{live.hourSession ? position.hoursLeft : position.daysLeft}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--color-text-muted)' }}>{t('mining.dailyIncome')}</dt>
            <dd className="font-semibold" style={{ color: 'var(--color-success)' }}>
              ${position.dailyIncome}
            </dd>
          </div>
          <div>
            <dt style={{ color: 'var(--color-text-muted)' }}>{t('mining.totalEarned')}</dt>
            <dd className="font-semibold" style={{ color: 'var(--color-success)' }}>
              ${live.confirmed.toFixed(4)}
            </dd>
          </div>
        </dl>
      )}

      <Link to="/mining/portfolio" className="block">
        <Button className="w-full" variant="ghost" size="sm">
          {t('mining.viewRunning')}
        </Button>
      </Link>
    </article>
  );
}

export default function LiveMiningPanel({ positions }) {
  const { t } = useTranslation();
  const active = (positions || []).filter((p) => p.status === 'ACTIVE');
  if (active.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="section-label inline-flex items-center gap-2">
          <span className="mining-live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
          {t('mining.liveMovement')}
        </p>
        <Link
          to="/mining/portfolio"
          className="font-mono text-xs hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          {t('mining.viewPortfolio')}
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {active.map((pos) => (
          <LiveMiningCard key={pos.id} position={pos} />
        ))}
      </div>
    </section>
  );
}
