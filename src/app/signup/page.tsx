import { signup } from "./actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Tạo tài khoản" subtitle="Bắt đầu chia tiền theo điều quan trọng với bạn." error={error} alternate={{ prompt: "Đã có tài khoản?", href: "/login", label: "Đăng nhập" }}>
      <form action={signup} className="flex flex-col gap-5">
        <label className="field"><span>Họ tên</span><input name="fullName" type="text" autoComplete="name" className="input" placeholder="Nguyễn Văn A" /></label>
        <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" className="input" placeholder="ban@email.com" /></label>
        <label className="field"><span>Mật khẩu</span><input name="password" type="password" required minLength={6} autoComplete="new-password" className="input" placeholder="Tối thiểu 6 ký tự" /><span className="mt-1 block text-sm text-neutral-700">Dùng ít nhất 6 ký tự.</span></label>
        <SubmitButton pendingLabel="Đang đăng ký..." className="btn btn-primary mt-1 justify-center">Tạo tài khoản</SubmitButton>
      </form>
    </AuthShell>
  );
}
