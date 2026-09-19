"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/signup?error=" + encodeURIComponent("Nhập đầy đủ email và mật khẩu."));
  }
  if (password.length < 6) {
    redirect("/signup?error=" + encodeURIComponent("Mật khẩu cần ít nhất 6 ký tự."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  // Luu full_name vao profiles (bang duoc tao san boi trigger handle_new_user)
  if (fullName && data.user) {
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", data.user.id);
  }

  // Neu project bat "Confirm email", session se null tai day.
  if (!data.session) {
    redirect(
      "/login?error=" +
        encodeURIComponent(
          "Đăng ký thành công! Vui lòng kiểm tra email và bấm vào link xác nhận để kích hoạt tài khoản trước khi đăng nhập."
        )
    );
  }

  redirect("/");
}
