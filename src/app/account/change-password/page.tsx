import Link from "next/link";
import { ChangePasswordForm } from "@/components/auth/changePasswordForm";
import { APP_NAME, getPageTitle } from "@/constants/app";

export const metadata = {
  title: getPageTitle("Change Password"),
  description: `Update your ${APP_NAME} account password.`,
};

export default function ChangePasswordPage(): React.ReactElement {
  return (
    <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-700 font-medium">Account Settings</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-blue-600 font-medium">Change Password</span>
        </nav>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Change password</h1>
            <p className="text-slate-500 text-sm mt-1">
              Enter your current password, then choose a new one.
            </p>
          </div>

          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
