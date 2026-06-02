/**
 * Shown when a dashboard feature is not yet production-ready.
 */
export function ComingSoon({ featureName, expectedTerm }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-royalPurple-border bg-royalPurple-card shadow-sm p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-amber-500 mb-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" strokeLinecap="round" />
        </svg>
        <h1 className="text-xl font-semibold text-royalPurple-text1 mb-2">{featureName}</h1>
        <p className="text-sm text-royalPurple-text2 mb-4">
          This feature is being finalised for the next term. Contact Blue Peak Technologies if you
          need this urgently.
        </p>
        {expectedTerm ? (
          <p className="text-xs text-royalPurple-text3 mb-4">Expected: {expectedTerm}</p>
        ) : null}
        <a
          href="mailto:support@bluepeacktechnologies.com"
          className="inline-flex items-center justify-center rounded-lg bg-royalPurple-pill px-4 py-2 text-sm font-medium text-royalPurple-text1 hover:opacity-90"
        >
          Contact Support
        </a>
      </div>
    </div>
  )
}
