export default function PageHeader({
  title, subtitle, action,
}: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
