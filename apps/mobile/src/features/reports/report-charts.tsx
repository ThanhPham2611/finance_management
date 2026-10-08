import { useEffect, useState } from "react";
import { AccessibilityInfo, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { BarChart, DonutChart } from "react-native-chart-kit/v2";
import { formatMoney } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import type { ReportBucket, ReportJarRow } from "./model";
import { ReportCard } from "./report-sections";

const BAR_HEIGHT = 180;
const DONUT_MAX = 200;

/** Chart width follows the measured container so nothing overflows narrow screens. */
export function useChartLayout() {
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => live && setReduceMotion(on));
    return () => {
      live = false;
    };
  }, []);
  return {
    width,
    selectionAnimation: !reduceMotion,
    onLayout: (e: LayoutChangeEvent) => setWidth(Math.max(0, Math.floor(e.nativeEvent.layout.width))),
  };
}

const money = (amount: number) => `${formatMoney(amount)} ₫`;

export function SpendingBarChart({ buckets, initialBucketIndex }: { buckets: ReportBucket[]; initialBucketIndex: number }) {
  // Track the bucket by key so refreshed/changed data can't leave a stale index; fall back to the initial bucket.
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const { width, selectionAnimation, onLayout } = useChartLayout();
  const found = buckets.findIndex((b) => b.key === selectedKey);
  const index = found >= 0 ? found : Math.min(Math.max(initialBucketIndex, 0), buckets.length - 1);
  const selected = buckets[index];

  return (
    <ReportCard title="Chi tiêu theo thời gian" value={selected ? `${selected.label} · ${money(selected.value)}` : undefined}>
      {/* minHeight giữ chỗ trước khi đo được bề rộng, để thẻ không giật lớn lên lúc vừa mở. */}
      <View testID="report-bar-chart" onLayout={onLayout} style={{ minHeight: BAR_HEIGHT }}>
        {width > 0 ? (
          <BarChart
            data={buckets}
            xKey="label"
            yKey="value"
            width={width}
            height={BAR_HEIGHT}
            theme="light"
            series={[{ yKey: "value", key: "value", label: "Chi tiêu", color: lightColors.primary }]}
            interaction={{ mode: "tap", onSelect: (e) => setSelectedKey(buckets[e.dataIndex]?.key) }}
            selectedBar={selected ? { dataIndex: index, seriesKey: "value" } : undefined}
            selectionAnimation={selectionAnimation}
            tooltip={false}
            formatYLabel={(v) => formatMoney(v)}
            accessibilityLabel="Biểu đồ chi tiêu theo thời gian"
          />
        ) : null}
      </View>
    </ReportCard>
  );
}

export function JarShareChart({ rows, onOpenJar }: { rows: ReportJarRow[]; onOpenJar(jarId: string): void }) {
  // Track the jar by id; if it disappears, fall back to the top-ranked row.
  const [selectedJarId, setSelectedJarId] = useState<string | undefined>();
  const { width, selectionAnimation, onLayout } = useChartLayout();
  const index = Math.max(0, rows.findIndex((r) => r.jarId === selectedJarId));
  const selected = rows[index];
  if (!selected) return null;

  return (
    <ReportCard title="Tỷ trọng theo hũ" value={`${selected.name} · ${Math.round(selected.percentage)}% · ${money(selected.total)}`}>
      <View testID="report-donut-chart" onLayout={onLayout} style={{ minHeight: DONUT_MAX }}>
        {width > 0 ? (
          <DonutChart
            data={rows}
            valueKey="total"
            labelKey="name"
            colorKey="color"
            width={width}
            height={Math.min(width, DONUT_MAX)}
            theme="light"
            legend={false}
            selectedIndex={index}
            interaction={{ mode: "tap", onSelect: (e) => setSelectedJarId(rows[e.index]?.jarId) }}
            selectionAnimation={selectionAnimation}
            centerLabel={selected.name}
            accessibilityLabel="Biểu đồ tỷ trọng chi tiêu theo hũ"
          />
        ) : null}
      </View>
      <View>
        {rows.map((row, i) => {
          const delta = row.total - row.previousTotal;
          const change = delta === 0 ? "không đổi" : `${delta > 0 ? "+" : "−"}${money(Math.abs(delta))}`;
          const body = (
            <>
              <View style={styles.rowCopy}>
                <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, Math.max(2, row.percentage))}%`, backgroundColor: row.color }]} />
                </View>
                <Text style={styles.count}>{`${row.count} giao dịch`}</Text>
              </View>
              <View style={styles.rowValue}>
                <Text style={styles.value}>{`${Math.round(row.percentage)}% · ${money(row.total)}`}</Text>
                <Text style={[styles.change, delta > 0 && styles.up, delta < 0 && styles.down]}>{change}</Text>
              </View>
            </>
          );
          return row.isActive ? (
            <Pressable
              key={row.jarId}
              accessibilityRole="button"
              accessibilityLabel={`${row.name}, ${Math.round(row.percentage)}%, ${money(row.total)}, ${row.count} giao dịch, ${change} so với kỳ trước. Mở hũ`}
              style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}
              onPress={() => onOpenJar(row.jarId)}
            >
              {body}
            </Pressable>
          ) : (
            <View key={row.jarId} style={[styles.row, i > 0 && styles.divider]}>{body}</View>
          );
        })}
      </View>
    </ReportCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: 64, paddingVertical: spacing[2] },
  divider: { borderTopWidth: 1, borderTopColor: lightColors.border },
  pressed: { opacity: 0.6 },
  rowCopy: { flex: 1, gap: spacing[1] },
  rowValue: { alignItems: "flex-end", gap: 2 },
  track: { height: 6, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle },
  fill: { height: "100%", borderRadius: radii.pill },
  count: { color: lightColors.textMuted, fontFamily: typography.family.body, fontSize: 12 },
  change: { color: lightColors.textMuted, fontFamily: typography.family.body, fontSize: 12, fontVariant: ["tabular-nums"] },
  up: { color: lightColors.warning },
  down: { color: lightColors.success },
  name: { color: lightColors.text, fontFamily: typography.family.body, fontSize: typography.size.body, fontWeight: "600" },
  value: { color: lightColors.text, fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
