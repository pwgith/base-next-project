export default function ProjectsLoading() {
  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-xl animate-pulse" />
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white/80 rounded-2xl shadow-sm border border-white/60 p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
              <div className="flex gap-1">
                <div className="w-7 h-7 rounded-lg bg-slate-100 animate-pulse" />
                <div className="w-7 h-7 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            </div>
            <div className="h-5 w-3/4 bg-slate-200 rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-full bg-slate-100 rounded-lg animate-pulse mb-4" />
            <div className="flex justify-between mb-4">
              <div className="h-3 w-24 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-5 w-10 bg-indigo-50 rounded-full animate-pulse" />
            </div>
            <div className="h-10 w-full bg-slate-200 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
