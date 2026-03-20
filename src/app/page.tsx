import Link from "next/link";

export default function HomePage() {
  return (
    <main className="animate-fade-in">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
          Model Helper
        </h1>
        <p className="text-slate-600 text-lg sm:text-xl mt-4 max-w-2xl mx-auto">
          Modeling for the rest of us.
        </p>
      </div>

      {/* Action cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Analyse Floor Plan */}
          <Link
            href="/plans"
            className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50 hover:shadow-xl transition-shadow duration-200 block"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              Analyse Floor Plan
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Upload a floor plan image and get a detailed room-by-room
              measurement breakdown.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
