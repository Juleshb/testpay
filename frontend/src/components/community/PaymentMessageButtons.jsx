import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { extractPaymentIds, stripPaymentUrls } from '../../lib/paymentMessageLinks';
import { cn } from '../../lib/cn';

export function usePaymentMessageParts(content) {
  const paymentIds = extractPaymentIds(content);
  const displayText =
    paymentIds.length > 0 ? stripPaymentUrls(content) : content;
  return { paymentIds, displayText };
}

export default function PaymentMessageButtons({ content, isOwn = false, className }) {
  const { t } = useTranslation();
  const paymentIds = extractPaymentIds(content);
  if (!paymentIds.length) return null;

  return (
    <div className={cn('flex flex-col gap-1.5 w-full mt-1', className)}>
      {paymentIds.map((id, index) => (
        <Link
          key={id}
          to={`/pay/${id}`}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl',
            'font-mono text-xs font-semibold transition-opacity hover:opacity-90'
          )}
          style={
            isOwn
              ? {
                  background: 'rgba(255,255,255,0.22)',
                  color: 'inherit',
                  border: '1px solid rgba(255,255,255,0.28)',
                }
              : {
                  background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)',
                  color: 'var(--color-accent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
                }
          }
        >
          {paymentIds.length === 1
            ? t('community.openPayment')
            : t('community.openPaymentN', { n: index + 1 })}
          <span aria-hidden>→</span>
        </Link>
      ))}
    </div>
  );
}
