import { SignUpForm } from "@/components/auth/signUpForm";
import Link from "next/link";

export const metadata = {
  title: "Create account — Model Helper",
  description: "Sign up for a free Model Helper account.",
};

export default function SignUpPage(): React.ReactElement {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-16">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              Create your account
            </h1>
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-blue-600 hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>

          <SignUpForm />
        </div>
      </div>
    </main>
  );
}
