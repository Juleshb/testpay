import { cn } from '../../lib/cn';

export default function PageHeader({ title, description, actions, label, className }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8', className)}>
      <div className="min-w-0">
        {label && <p className="eyebrow mb-2 sm:mb-3">{label}</p>}
        <h1 className="display-title text-2xl sm:text-3xl lg:text-4xl text-[var(--color-text-primary)]">
          {title}
        </h1>
        {description && (
          <p className="text-[var(--color-text-secondary)] text-sm mt-2 sm:mt-3 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:shrink-0 [&_.dev-btn]:flex-1 sm:[&_.dev-btn]:flex-none [&_a]:flex-1 sm:[&_a]:flex-none [&_button]:min-h-[2.75rem]">
          {actions}
        </div>
      )}
    </div>
  );
}
