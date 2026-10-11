import type { AiHistoryRecord, AiHistoryKind } from '../lib/aiHistory'

type AIHistoryPanelProps = {
  kind: AiHistoryKind
  records: AiHistoryRecord[]
  isLoading: boolean
  error: string
  onSelect: (record: AiHistoryRecord) => void
  onDelete: (record: AiHistoryRecord) => void
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function AIHistoryPanel({
  kind,
  records,
  isLoading,
  error,
  onSelect,
  onDelete,
}: AIHistoryPanelProps) {
  const title = kind === 'resume-match' ? 'Resume match history' : 'Cover letter history'
  const description =
    kind === 'resume-match'
      ? 'Your saved match results, private to your account.'
      : 'Your generated letters, private to your account.'

  return (
    <aside className="ai-history-panel surface-card animate-page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow-label">YOUR LIBRARY</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <span className="history-count" aria-label={`${records.length} saved results`}>
          {records.length}
        </span>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="mt-5 space-y-3" aria-label="Loading history">
          {[0, 1, 2].map((item) => (
            <div key={item} className="history-skeleton" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="history-empty mt-5">
          <span className="history-empty-icon" aria-hidden="true">
            {kind === 'resume-match' ? '✦' : '✉'}
          </span>
          <p className="mt-3 font-medium text-slate-800">Nothing saved yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Completed results will appear here automatically.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {records.map((record) => (
            <li key={record.id} className="history-item">
              <button
                type="button"
                onClick={() => onSelect(record)}
                className="min-w-0 flex-1 text-left"
                aria-label={`Open ${record.title}, saved ${formatDate(record.createdAt)}`}
              >
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {record.title}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {formatDate(record.createdAt)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(record)}
                className="history-delete"
                aria-label={`Delete ${record.title} from history`}
                title="Delete from history"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
