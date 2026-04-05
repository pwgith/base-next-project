import { APP_NAME, APP_TAGLINE } from "@/constants/app";

export default function HomePage() {
  return (
    <main className="animate-fade-in">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
          {APP_NAME}
        </h1>
        <p className="text-slate-600 text-lg sm:text-xl mt-4 max-w-2xl mx-auto">
          {APP_TAGLINE}
        </p>
      </div>
    </main>
  );
}
