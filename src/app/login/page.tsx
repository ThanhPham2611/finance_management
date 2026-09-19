import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
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
          <p className="mt-1 text-sm text-neutral-700">Đăng nhập để quản lý chi tiêu gia đình</p>
        </div>

        {error && (
          <div className="mb-4 border-2 px-3.5 py-2.5 text-[13px]" style={{ borderColor: "var(--color-accent)", background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}>
            {error}
          </div>
        )}

        <form action={login} className="flex flex-col gap-3.5">
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
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary mt-1.5 justify-center">
            Đăng nhập
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-neutral-700">
          Chưa có tài khoản?{" "}
          <Link href="/signup" className="btn-ghost">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
