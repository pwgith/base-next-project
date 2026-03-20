import { ResetPasswordRequestForm } from "@/components/auth/resetPasswordRequestForm";

export const metadata = {
  title: "Reset Password — Model Helper",
  description: "Reset your Model Helper account password.",
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
