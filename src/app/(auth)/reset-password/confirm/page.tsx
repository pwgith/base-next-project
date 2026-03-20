import { ResetPasswordConfirmForm } from "@/components/auth/resetPasswordConfirmForm";

export const metadata = {
  title: "Set New Password — Model Helper",
  description: "Set a new password for your Model Helper account.",
};

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ResetPasswordConfirmPage({ searchParams }: Props): Promise<React.ReactElement> {
  const params = await searchParams;
  const tokenHash = params.token_hash ?? null;
  const type = params.type ?? null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-16">
      <div className="w-full max-w-md">
        <ResetPasswordConfirmForm tokenHash={tokenHash} type={type} />
      </div>
    </main>
  );
}
