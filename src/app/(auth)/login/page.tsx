import { LoginForm } from "@/components/auth/loginForm";
import { APP_NAME, getPageTitle } from "@/constants/app";
import Link from "next/link";

export const metadata = {
  title: getPageTitle("Sign in"),
  description: `Sign in to your ${APP_NAME} account.`,
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? "/plans";
  const verified = params.verified === "true";
  const signedOut = params.signedOut === "true";
  const emailChanged = params.emailChanged === "true";
  const errorMessage = params.error ?? null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              Sign in to {APP_NAME}
            </h1>
            <p className="text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-blue-600 hover:underline font-medium"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* Signed-out confirmation banner */}
          {signedOut && (
            <div
              role="status"
              className="mb-6 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-3"
            >
              You have been signed out successfully.
            </div>
          )}

          {/* Email change success banner */}
          {emailChanged && (
            <div
              role="status"
              className="mb-6 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3"
            >
              Your email address has been updated. Please sign in with your new email.
            </div>
          )}

          {/* Verification success banner */}
          {verified && (
            <div
              role="status"
              className="mb-6 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3"
            >
              Your email address has been verified. You can now sign in.
            </div>
          )}

          {/* Error banner (e.g. bad verification link) */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
            >
              {errorMessage}
            </div>
          )}

          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </main>
  );
}
