import { APP_NAME } from "@/constants/app";

export function AppFooter(): React.ReactElement {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

  return (
    <footer className="border-t border-slate-200 bg-white/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-slate-500">
        <span>&copy; {new Date().getFullYear()} {APP_NAME}</span>
        <span data-testid="app-version">v{version}</span>
      </div>
    </footer>
  );
}
