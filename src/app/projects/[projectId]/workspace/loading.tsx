export default function WorkspaceLoading() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <nav className="bg-slate-900/95 border-b border-slate-700/60 h-[52px] flex items-center px-4 sm:px-6 gap-3">
        <div className="w-4 h-4 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-px bg-slate-700" />
        <div className="w-7 h-7 bg-slate-700 rounded-lg animate-pulse" />
        <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
      </nav>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading workspace…</p>
        </div>
      </div>
    </div>
  );
}
