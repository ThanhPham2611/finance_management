import { login } from "./actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Đăng nhập" subtitle="Tiếp tục chăm sóc kế hoạch tài chính của bạn." error={error} alternate={{ prompt: "Chưa có tài khoản?", href: "/signup", label: "Đăng ký" }}>
      <form action={login} className="flex flex-col gap-5">
        <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" className="input" placeholder="ban@email.com" /></label>
        <label className="field"><span>Mật khẩu</span><input name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" /></label>
        <SubmitButton pendingLabel="Đang đăng nhập..." className="btn btn-primary mt-1 justify-center">Đăng nhập</SubmitButton>
      </form>
    </AuthShell>
  );
}
