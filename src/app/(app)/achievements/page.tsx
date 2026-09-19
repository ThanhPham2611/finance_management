import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { computeBadges, computeStreak, getRecentMonthsPerformance } from "@/lib/queries/gamification";

const MONTHS_BACK = 12;

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const performances = await getRecentMonthsPerformance(supabase, user.id, MONTHS_BACK);
  const streak = computeStreak(performances);
  const badges = computeBadges(streak, performances);
  const trackedMonths = performances.filter((p) => p.hasData).length;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3 border-b-2 border-divider pb-4">
        <h1 className="mr-auto text-xl md:text-2xl">Thành tích</h1>
      </div>

      <div className="flex items-center gap-4 border-b-2 border-divider pb-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center" style={{ background: streak > 0 ? "var(--color-accent)" : "var(--color-neutral-300)" }}>
          <Icon name="flame" className="h-7 w-7" style={{ color: streak > 0 ? "var(--color-bg)" : "var(--color-neutral-700)" }} />
        </div>
        <div>
          <div className="font-heading text-3xl font-extrabold tabular-nums">{streak}</div>
          <div className="text-[13px] text-neutral-700">
            {streak > 0 ? `tháng liên tiếp không vượt ngân sách` : "chưa có streak — chia lương và giữ đúng ngân sách để bắt đầu"}
          </div>
        </div>
      </div>

      {trackedMonths === 0 && (
        <p className="text-[13px] text-neutral-700">
          Chưa có tháng nào có lịch sử để đánh giá. Bấm &quot;Áp dụng&quot; ở trang{" "}
          <Link href="/allocate" className="text-accent hover:underline">
            Chia lương
          </Link>{" "}
          mỗi tháng để bắt đầu theo dõi thành tích (cần chạy migration_008 trên Supabase trước).
        </p>
      )}

      <div>
        <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Huy hiệu</div>
        <div className="grid grid-cols-2 gap-px border border-divider bg-divider sm:grid-cols-3">
          {badges.map((b) => (
            <div key={b.id} className="flex flex-col gap-1.5 p-3.5" style={{ background: "var(--color-bg)", opacity: b.achieved ? 1 : 0.45 }}>
              <div className="flex items-center gap-2">
                <Icon name={b.icon} className="h-4 w-4" style={{ color: b.achieved ? "var(--color-accent)" : "var(--color-neutral-700)" }} />
                <span className="text-[12px] font-semibold">{b.name}</span>
              </div>
              <p className="text-[11px] text-neutral-700">{b.description}</p>
            </div>
          ))}
        </div>
      </div>

      {trackedMonths > 0 && (
        <div>
          <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">{MONTHS_BACK} tháng gần nhất</div>
          <div className="flex flex-col">
            {performances.map((p) => (
              <div key={p.periodMonth} className="flex items-center gap-2.5 border-b border-divider py-2.5 text-[13px] last:border-b-0">
                <Icon
                  name={!p.hasData ? "minus" : p.withinBudget ? "check" : "triangle-alert"}
                  className="h-4 w-4 shrink-0"
                  style={{
                    color: !p.hasData ? "var(--color-neutral-500)" : p.withinBudget ? "var(--color-green-ink)" : "var(--color-accent-700)",
                  }}
                />
                <span className="flex-1">{p.label}</span>
                <span className="text-[11px] text-neutral-700">
                  {!p.hasData ? "chưa chia lương tháng này" : p.withinBudget ? "trong ngân sách" : `vượt: ${p.overJarNames.join(", ")}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
