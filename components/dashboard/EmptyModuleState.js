import { Inbox } from 'lucide-react'

export function EmptyModuleState({ title = 'No records yet', description, action }) {
  return (
    <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-8 text-center">
      <Inbox className="h-10 w-10 mx-auto text-royalPurple-text3 mb-3" />
      <p className="font-medium text-royalPurple-text1">{title}</p>
      {description && (
        <p className="text-sm text-royalPurple-text2 mt-2 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
