export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/8 bg-paper/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="/" className="flex items-center gap-2" aria-label="Dormscape home">
          <span className="grid h-7 w-7 grid-cols-2 grid-rows-2 gap-[3px] rounded-[6px] border border-ink/15 bg-white p-[4px]" aria-hidden="true">
            <span className="rounded-[2px] bg-cobalt" />
            <span className="rounded-[2px] bg-highlight" />
            <span className="rounded-[2px] bg-ink/15" />
            <span className="rounded-[2px] bg-ink" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            dormscape
          </span>
        </a>
        <div className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
          <a href="/#how-it-works" className="transition-colors hover:text-ink">
            How it works
          </a>
          <a href="/#vibes" className="transition-colors hover:text-ink">
            Vibes
          </a>
          <a href="/colleges" className="transition-colors hover:text-ink">
            Colleges
          </a>
        </div>
        <a
          href="/plan"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
        >
          Plan my room
        </a>
      </nav>
    </header>
  );
}
