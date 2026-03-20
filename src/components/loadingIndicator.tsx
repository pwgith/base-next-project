export function LoadingIndicator() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-10 sm:p-16 border border-white/50 max-w-2xl text-center">
      <div className="h-12 w-12 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="mt-6 text-slate-700 font-medium">
        Analysing floor plan…
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Extracting rooms and calculating measurements.
      </p>
    </div>
  );
}
