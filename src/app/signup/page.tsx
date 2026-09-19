import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-heading text-2xl font-extrabold">
            Hũ<span className="text-accent">.</span>
          </div>
          <p className="mt-1 text-sm text-neutral-700">Tạo tài khoản để bắt đầu chia hũ ngân sách</p>
        </div>

        {error && (
          <div className="mb-4 border-2 px-3.5 py-2.5 text-[13px]" style={{ borderColor: "var(--color-accent)", background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}>
            {error}
          </div>
        )}

        <form action={signup} className="flex flex-col gap-3.5">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-[10px] tracking-[0.12em] text-neutral-700 uppercase">
              Họ tên
            </label>
            <input id="fullName" name="fullName" type="text" autoComplete="name" className="input" placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-[10px] tracking-[0.12em] text-neutral-700 uppercase">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="ban@email.com" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-[10px] tracking-[0.12em] text-neutral-700 uppercase">
              Mật khẩu
            </label>
            <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className="input" placeholder="Tối thiểu 6 ký tự" />
          </div>
          <button type="submit" className="btn btn-primary mt-1.5 justify-center">
            Đăng ký
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-neutral-700">
          Đã có tài khoản?{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
