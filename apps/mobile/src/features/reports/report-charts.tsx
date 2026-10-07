import { useEffect, useState } from "react";
import { AccessibilityInfo, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { BarChart, DonutChart } from "react-native-chart-kit/v2";
import { formatMoney } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import type { ReportBucket, ReportJarRow } from "./model";

const BAR_HEIGHT = 220;
const DONUT_MAX = 240;

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
    <View style={styles.block}>
      {selected ? <Text style={styles.selected}>{`${selected.label} · ${money(selected.value)}`}</Text> : null}
      <View testID="report-bar-chart" onLayout={onLayout}>
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
    </View>
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
    <View style={styles.block}>
      <Text style={styles.selected}>{`${selected.name} · ${Math.round(selected.percentage)}% · ${money(selected.total)}`}</Text>
      <View testID="report-donut-chart" onLayout={onLayout}>
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
      {rows.map((row) => {
        const delta = row.total - row.previousTotal;
        const change = delta === 0 ? "không đổi" : `${delta > 0 ? "+" : "−"}${money(Math.abs(delta))}`;
        const body = (
          <>
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <View style={styles.rowCopy}>
              <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
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
            style={styles.row}
            onPress={() => onOpenJar(row.jarId)}
          >
            {body}
          </Pressable>
        ) : (
          <View key={row.jarId} style={styles.row}>{body}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing[2] },
  selected: { color: lightColors.text, fontFamily: typography.family.heading, fontSize: typography.size.bodyLarge },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: 48, paddingHorizontal: spacing[3], borderRadius: radii.control, backgroundColor: lightColors.surfaceSubtle },
  dot: { width: 12, height: 12, borderRadius: radii.pill },
  rowCopy: { flex: 1, gap: 2 },
  rowValue: { alignItems: "flex-end", gap: 2 },
  count: { color: lightColors.textMuted, fontFamily: typography.family.body, fontSize: 12 },
  change: { color: lightColors.textMuted, fontFamily: typography.family.body, fontSize: 12 },
  up: { color: lightColors.warning },
  down: { color: lightColors.success },
  name: { color: lightColors.text, fontFamily: typography.family.body, fontSize: typography.size.body },
  value: { color: lightColors.textMuted, fontFamily: typography.family.body, fontSize: typography.size.caption },
});
