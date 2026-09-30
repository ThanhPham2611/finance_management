import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client dung trong Server Components / Route Handlers.
 * Doc va ghi cookie de giu phien dang nhap dong bo voi trinh duyet.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Duoc goi tu Server Component - co the bo qua neu da co
            // middleware refresh session.
          }
        },
      },
      global: {
        // Next.js patch global fetch va mac dinh cache theo URL — bo qua
        // Authorization header. Du lieu qua Supabase la du lieu rieng theo
        // tung user (loc boi RLS dua tren cookie phien), cache theo URL la
        // sai (co the tra du lieu cu, hoac lech dang gan sang response cua
        // request khac). Tat cache cho moi request toi Supabase.
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
