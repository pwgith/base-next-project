import { ResetPasswordRequestForm } from "@/components/auth/resetPasswordRequestForm";
import { APP_NAME, getPageTitle } from "@/constants/app";

export const metadata = {
  title: getPageTitle("Reset Password"),
  description: `Reset your ${APP_NAME} account password.`,
};

export default function ResetPasswordPage(): React.ReactElement {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-16">
      <div className="w-full max-w-md">
        <ResetPasswordRequestForm />
      </div>
    </main>
  );
}
