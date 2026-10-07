import React from "react";
import { AccessibilityInfo, View } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import type { ReportBucket, ReportJarRow } from "@/features/reports/model";
import { JarShareChart, SpendingBarChart } from "@/features/reports/report-charts";

// Only the props the mocks read or the tests assert on.
type MockChartProps = { accessibilityLabel?: string; width?: number; selectionAnimation?: boolean };
type BarProps = MockChartProps & {
  data: { key: string }[];
  selectedBar?: { dataIndex: number; seriesKey: string };
  interaction: { onSelect: (event: { dataIndex: number; seriesKey: string }) => void };
};
type DonutProps = MockChartProps & {
  data: { jarId: string }[];
  selectedIndex?: number;
  interaction: { onSelect: (event: { index: number }) => void };
};

const mockBarProps: { current: BarProps | null } = { current: null };
const mockDonutProps: { current: DonutProps | null } = { current: null };

jest.mock("react-native-chart-kit/v2", () => {
  const { Pressable, View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    BarChart: (props: BarProps) => {
      mockBarProps.current = props;
      return (
        <View accessibilityLabel={props.accessibilityLabel}>
          {props.data.map((d, i) => (
            <Pressable key={d.key} testID={`mock-bar-${i}`} onPress={() => props.interaction.onSelect({ dataIndex: i, seriesKey: "value" })} />
          ))}
        </View>
      );
    },
    DonutChart: (props: DonutProps) => {
      mockDonutProps.current = props;
      return (
        <View accessibilityLabel={props.accessibilityLabel}>
          {props.data.map((d, i) => (
            <Pressable key={d.jarId} testID={`mock-donut-${i}`} onPress={() => props.interaction.onSelect({ index: i })} />
          ))}
        </View>
      );
    },
  };
});

const buckets: ReportBucket[] = [
  { key: "2026-01-01", label: "T1", from: "2026-01-01", toExclusive: "2026-02-01", value: 100000 },
  { key: "2026-02-01", label: "T2", from: "2026-02-01", toExclusive: "2026-03-01", value: 250000 },
];

const rows: ReportJarRow[] = [
  { jarId: "a", name: "Ăn uống", color: "#174C3C", total: 300000, percentage: 60, count: 3, isActive: true },
  { jarId: "b", name: "Cũ", color: "#9A5B13", total: 200000, percentage: 40, count: 1, isActive: false },
];

const layout = (view: ReturnType<typeof render> extends Promise<infer R> ? R : never, testID: string, width: number) =>
  fireEvent(view.getByTestId(testID), "layout", { nativeEvent: { layout: { width, height: 200 } } });

describe("report charts", () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  });
  afterEach(() => jest.restoreAllMocks());

  it("shows the selected bar as formatted VND text", async () => {
    const view = await render(<SpendingBarChart buckets={buckets} initialBucketIndex={0} />);
    await layout(view, "report-bar-chart", 360);
    expect(view.getByLabelText("Biểu đồ chi tiêu theo thời gian")).toBeTruthy();
    expect(view.getByText("T1 · 100.000 ₫")).toBeTruthy();
    await fireEvent.press(view.getByTestId("mock-bar-1"));
    expect(view.getByText("T2 · 250.000 ₫")).toBeTruthy();
  });

  it("selects a donut slice and only opens active jars", async () => {
    const onOpenJar = jest.fn();
    const view = await render(<JarShareChart rows={rows} onOpenJar={onOpenJar} />);
    await layout(view, "report-donut-chart", 360);
    await fireEvent.press(view.getByTestId("mock-donut-1"));
    expect(view.getByText("Cũ · 40% · 200.000 ₫", { exact: true })).toBeTruthy();
    await fireEvent.press(view.getByTestId("mock-donut-0"));
    expect(view.getByText("Ăn uống · 60% · 300.000 ₫")).toBeTruthy();

    expect(view.getAllByRole("button")).toHaveLength(1);
    await fireEvent.press(view.getByRole("button"));
    expect(onOpenJar).toHaveBeenCalledWith("a");
    expect(onOpenJar).toHaveBeenCalledTimes(1);
  });

  it("fits a 320pt container and disables selection animation for reduced motion", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const view = await render(
      <View>
        <SpendingBarChart buckets={buckets} initialBucketIndex={1} />
        <JarShareChart rows={rows} onOpenJar={jest.fn()} />
      </View>,
    );
    await layout(view, "report-bar-chart", 320);
    await layout(view, "report-donut-chart", 320);
    await act(async () => {});
    for (const props of [mockBarProps.current, mockDonutProps.current]) {
      expect(Number.isFinite(props?.width)).toBe(true);
      expect(props?.width).toBeLessThanOrEqual(320);
      expect(props?.selectionAnimation).toBe(false);
    }
  });

  it("keeps the bar selection valid when buckets change", async () => {
    const view = await render(<SpendingBarChart buckets={buckets} initialBucketIndex={0} />);
    await layout(view, "report-bar-chart", 360);
    await fireEvent.press(view.getByTestId("mock-bar-1"));

    await view.rerender(<SpendingBarChart buckets={[{ ...buckets[1]!, value: 275000 }, buckets[0]!]} initialBucketIndex={0} />);
    expect(view.getByText("T2 · 275.000 ₫")).toBeTruthy();
    expect(mockBarProps.current?.selectedBar).toEqual({ dataIndex: 0, seriesKey: "value" });

    await view.rerender(<SpendingBarChart buckets={[buckets[0]!]} initialBucketIndex={0} />);
    expect(view.getByText("T1 · 100.000 ₫")).toBeTruthy();
    expect(mockBarProps.current?.selectedBar).toEqual({ dataIndex: 0, seriesKey: "value" });

    const other: ReportBucket[] = [
      { key: "2026-03-01", label: "T3", from: "2026-03-01", toExclusive: "2026-04-01", value: 1000 },
      { key: "2026-04-01", label: "T4", from: "2026-04-01", toExclusive: "2026-05-01", value: 2000 },
    ];
    await view.rerender(<SpendingBarChart buckets={other} initialBucketIndex={1} />);
    expect(view.getByText("T4 · 2.000 ₫")).toBeTruthy();

    await view.rerender(<SpendingBarChart buckets={[]} initialBucketIndex={0} />);
    await view.rerender(<SpendingBarChart buckets={buckets} initialBucketIndex={1} />);
    expect(view.getByText("T2 · 250.000 ₫")).toBeTruthy();
  });

  it("keeps the donut selection valid when rows change", async () => {
    const view = await render(<JarShareChart rows={rows} onOpenJar={jest.fn()} />);
    await layout(view, "report-donut-chart", 360);
    await fireEvent.press(view.getByTestId("mock-donut-1"));

    await view.rerender(<JarShareChart rows={[rows[1]!, rows[0]!]} onOpenJar={jest.fn()} />);
    expect(view.getByText("Cũ · 40% · 200.000 ₫")).toBeTruthy();
    expect(mockDonutProps.current?.selectedIndex).toBe(0);

    await view.rerender(<JarShareChart rows={[rows[0]!]} onOpenJar={jest.fn()} />);
    expect(view.getByText("Ăn uống · 60% · 300.000 ₫")).toBeTruthy();
    expect(mockDonutProps.current?.selectedIndex).toBe(0);
    expect(view.getByTestId("mock-donut-0")).toBeTruthy();

    await view.rerender(<JarShareChart rows={[]} onOpenJar={jest.fn()} />);
    expect(view.queryByTestId("report-donut-chart")).toBeNull();
    // The user's chosen jar ("Cũ") is remembered by id and reselected once it is back.
    await view.rerender(<JarShareChart rows={rows} onOpenJar={jest.fn()} />);
    expect(view.getByText("Cũ · 40% · 200.000 ₫")).toBeTruthy();
  });
});
