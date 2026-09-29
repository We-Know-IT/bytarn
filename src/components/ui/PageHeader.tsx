import { cn } from '@/lib/utils'

/**
 * Consistent intro block for content pages: eyebrow, display title and lead.
 * `accent` renders as a second, brand-green line of the title.
 */
export default function PageHeader({
  eyebrow,
  title,
  accent,
  lead,
  children,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  accent?: React.ReactNode
  lead?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('max-w-2xl', className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="display-lg">
        {title}
        {accent && (
          <>
            <br />
            <span className="text-emerald-600">{accent}</span>
          </>
        )}
      </h1>
      {lead && <p className="lead mt-5 max-w-[540px]">{lead}</p>}
      {children}
    </header>
  )
}
