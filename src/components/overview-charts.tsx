"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Sector, Tooltip, XAxis } from "recharts";
import type { PieSectorDataItem } from "recharts";
import { Icon } from "@/components/icon";
import { formatVND } from "@/lib/format";
import type { RealJar } from "@/lib/queries/jars";

type ChartToggleProps = {
  view: string;
  options: { id: string; icon: string; label: string }[];
  onChange: (id: string) => void;
};

function ChartToggle({ view, options, onChange }: ChartToggleProps) {
  return (
    <div className="flex gap-px border border-divider bg-divider">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.id)}
          className="flex items-center justify-center p-1.5"
          style={{ background: view === o.id ? "var(--color-primary)" : "var(--color-bg)", color: view === o.id ? "var(--color-on-primary)" : "var(--color-neutral-700)" }}
        >
          <Icon name={o.icon} className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

/**
 * Chi ve vanh ngoai to hon khi hover 1 mieng — kieu recharts.github.io/examples/CustomActiveShapePieChart,
 * nhung KHONG ve chu o giua nua (chu de trong SVG nho de bi mieng/vanh de sau
 * cua no che mat) — ten + so tien khi hover hien o o rieng ben canh chart,
 * xem <Donut>.
 */
function renderActiveShape(props: PieSectorDataItem) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 5} outerRadius={outerRadius + 9} fill={fill} />
    </g>
  );
}

function Donut({ jars, budgetSum }: { jars: RealJar[]; budgetSum: number }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (budgetSum === 0) {
    return <div className="flex h-[220px] items-center justify-center text-[12px] text-neutral-700">Chưa có ngân sách</div>;
  }

  const data = jars.map((j) => ({ name: j.name, value: j.monthlyBudget, fill: j.color }));
  const active = activeIndex !== null ? jars[activeIndex] : null;
  const activePct = active && budgetSum ? Math.round((active.monthlyBudget / budgetSum) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="mx-auto h-[220px] w-[220px] shrink-0 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={98}
              activeShape={renderActiveShape}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} stroke="var(--color-bg)" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-h-[36px] items-center gap-2 border-b border-divider pb-2">
          {active ? (
            <>
              <span className="h-2.5 w-2.5 shrink-0" style={{ background: active.color }} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{active.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-neutral-700">
                {formatVND(active.monthlyBudget)}đ · {activePct}%
              </span>
            </>
          ) : (
            <span className="text-xs text-neutral-700">Di chuột vào biểu đồ để xem chi tiết từng hũ</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {jars.map((j, i) => (
            <div
              key={j.id}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              className="flex items-center gap-2 text-[11px]"
            >
              <span className="h-2 w-2 shrink-0" style={{ background: j.color }} />
              <span className="min-w-0 flex-1 truncate">{j.name}</span>
              <span className="tabular-nums text-neutral-700">{budgetSum ? Math.round((j.monthlyBudget / budgetSum) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BudgetSplitChart({ jars, budgetSum }: { jars: RealJar[]; budgetSum: number }) {
  const [view, setView] = useState<"bar" | "donut">("bar");
  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <ChartToggle
          view={view}
          onChange={(v) => setView(v as typeof view)}
          options={[
            { id: "bar", icon: "bar-chart-3", label: "Dạng thanh" },
            { id: "donut", icon: "pie-chart", label: "Dạng donut" },
          ]}
        />
      </div>
      {view === "bar" ? (
        <div className="flex gap-px bg-neutral-300" style={{ height: 14 }}>
          {jars.map((j) => (
            <div key={j.id} style={{ width: `${budgetSum ? (j.monthlyBudget / budgetSum) * 100 : 0}%`, background: j.color }} />
          ))}
        </div>
      ) : (
        <Donut jars={jars} budgetSum={budgetSum} />
      )}
    </div>
  );
}

const axisTick = { fontSize: 10, fill: "var(--color-neutral-700)" };
const tooltipStyle = { fontSize: 12, border: "1px solid var(--color-divider)", borderRadius: 0, boxShadow: "none" };

export function WeekTrendChart({ week }: { week: { date: string; label: string; value: number }[] }) {
  const [view, setView] = useState<"bar" | "line">("bar");

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <ChartToggle
          view={view}
          onChange={(v) => setView(v as typeof view)}
          options={[
            { id: "bar", icon: "bar-chart-3", label: "Dạng cột" },
            { id: "line", icon: "line-chart", label: "Dạng đường" },
          ]}
        />
      </div>
      <div className="h-[110px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {view === "bar" ? (
            <BarChart data={week} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
              <Tooltip formatter={(v) => [`${formatVND(Number(v))}đ`, ""]} labelFormatter={() => ""} contentStyle={tooltipStyle} cursor={{ fill: "var(--color-neutral-300)" }} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {week.map((d, i) => (
                  <Cell key={d.date} fill={i === week.length - 1 ? "var(--color-accent)" : "var(--color-neutral-400)"} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={week} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
              <Tooltip formatter={(v) => [`${formatVND(Number(v))}đ`, ""]} labelFormatter={() => ""} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-accent)" }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
