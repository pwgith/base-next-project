export default function PlansLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-96 bg-slate-100 rounded mt-2 animate-pulse" />
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-10 sm:p-16 border border-white/50 max-w-2xl text-center">
        <div className="h-12 w-12 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-6 text-slate-700 font-medium">Loading…</p>
      </div>
    </main>
  );
  
}
