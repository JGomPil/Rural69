export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <rect width="64" height="64" rx="16" fill="currentColor" />
      <path d="M32 13 L51 30 H46 V49 H18 V30 H13 Z" fill="#f7f2e7" />
      <rect x="27" y="36" width="10" height="13" rx="1.5" fill="#c87941" />
      <circle cx="22" cy="33" r="2.6" fill="#8a9a5b" />
      <circle cx="42" cy="33" r="2.6" fill="#8a9a5b" />
    </svg>
  )
}

export function Marca({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="text-bosque-600">
        <Logo size={34} />
      </span>
      <span className="font-display text-xl leading-none font-extrabold tracking-tight text-bosque-800">
        Rural<span className="text-tierra-500">69</span>
      </span>
    </span>
  )
}
