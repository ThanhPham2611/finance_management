import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import type { SharedOwnerOverview, SharesOverview } from "@hu/data";
import SharedOwnerScreen from "@/app/shared/[ownerId]";
import { SharedOwnerView } from "@/features/shared/owner-view";
import { SharedView } from "@/features/shared/shared-view";

const mockPush = jest.fn();
const mockMutate = { send: jest.fn(), respond: jest.fn(), revoke: jest.fn() };
const mockState: { sendError: Error | null; owner: unknown } = { sendError: null, owner: {} };

jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ ownerId: "carol" }),
}));
jest.mock("@/features/finance/hooks", () => {
  const hook = (key: "send" | "respond" | "revoke", extra: () => object = () => ({})) => () => ({ mutate: (...args: unknown[]) => mockMutate[key](...args), isPending: false, error: null, ...extra() });
  return {
    useCreateShareRequest: hook("send", () => ({ error: mockState.sendError })),
    useRespondToShare: hook("respond"),
    useRevokeShare: hook("revoke"),
    useSharedOwner: () => mockState.owner,
  };
});

const empty: SharesOverview = { incoming: [], accepted: [], outgoing: [] };
const full: SharesOverview = {
  incoming: [{ id: "s1", ownerId: "bob", ownerName: "Bob", status: "pending", createdAt: "2026-10-02T00:00:00Z" }],
  accepted: [{ id: "s2", ownerId: "carol", ownerName: "Carol", status: "accepted", createdAt: "2026-10-01T00:00:00Z" }],
  outgoing: [
    { id: "s4", viewerId: "bob", viewerName: "Bob", status: "accepted", createdAt: "2026-09-01T00:00:00Z" },
    { id: "s5", viewerId: "dave", viewerName: "Dave", status: "pending", createdAt: "2026-09-02T00:00:00Z" },
    { id: "s6", viewerId: "erin", viewerName: "Erin", status: "declined", createdAt: "2026-09-03T00:00:00Z" },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockState.sendError = null;
  mockState.owner = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };
});

describe("SharedView", () => {
  it("explains the empty state of each list", async () => {
    const view = await render(<SharedView overview={empty} />);
    expect(view.getByText("Chưa có ai chia sẻ chi tiêu với bạn.")).toBeTruthy();
    expect(view.getByText("Bạn chưa chia sẻ chi tiêu với ai.")).toBeTruthy();
    expect(view.queryByText("Lời mời đang chờ bạn")).toBeNull();
  });

  it("sends an invite by email, only when an email was typed", async () => {
    const view = await render(<SharedView overview={empty} />);
    expect(view.getByRole("button", { name: "Gửi lời mời" }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(view.getByLabelText("Email người bạn muốn chia sẻ"), "bob@example.com");
    await fireEvent.press(view.getByText("Gửi lời mời"));
    expect(mockMutate.send).toHaveBeenCalledWith("bob@example.com", expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it("shows the server's refusal when the invite fails", async () => {
    mockState.sendError = new Error("Ban khong the tu chia se cho chinh minh.");
    const view = await render(<SharedView overview={empty} />);
    expect(view.getByText("Ban khong the tu chia se cho chinh minh.")).toBeTruthy();
  });

  it("accepts or declines an incoming invite", async () => {
    const view = await render(<SharedView overview={full} />);
    expect(view.getByText("Bob muốn chia sẻ chi tiêu với bạn")).toBeTruthy();
    await fireEvent.press(view.getByText("Chấp nhận"));
    expect(mockMutate.respond).toHaveBeenLastCalledWith({ shareId: "s1", accept: true });
    await fireEvent.press(view.getByText("Từ chối"));
    expect(mockMutate.respond).toHaveBeenLastCalledWith({ shareId: "s1", accept: false });
  });

  it("opens the read-only view of someone who shares with me", async () => {
    const view = await render(<SharedView overview={full} />);
    await fireEvent.press(view.getByText("Xem"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/shared/[ownerId]", params: { ownerId: "carol" } });
  });

  it("lists who I share with by status, and lets me revoke unless they declined", async () => {
    const view = await render(<SharedView overview={full} />);
    expect(view.getByText("Đã chấp nhận")).toBeTruthy();
    expect(view.getByText("Đang chờ")).toBeTruthy();
    expect(view.getByText("Đã từ chối")).toBeTruthy();
    expect(view.getAllByText("Hủy chia sẻ")).toHaveLength(2); // Bob và Dave, không có Erin (đã từ chối)

    await fireEvent.press(view.getAllByText("Hủy chia sẻ")[0]);
    expect(mockMutate.revoke).toHaveBeenCalledWith("s4");
  });
});

describe("SharedOwnerView", () => {
  const data: SharedOwnerOverview = {
    ownerName: "Carol",
    jars: [
      { id: "food", name: "Ăn uống", icon: "utensils", color: "#AB5637", monthlyBudget: 2_000_000, spent: 500_000, isShared: false, isSavings: false, alertAt80: true, rollover: false },
      { id: "go", name: "Đi lại", icon: "bus", color: "#2C7866", monthlyBudget: 1_000_000, spent: 1_200_000, isShared: false, isSavings: false, alertAt80: true, rollover: false },
    ],
    transactions: [
      { id: "t1", jarId: "food", jarName: "Ăn uống", jarIcon: "utensils", jarColor: "#AB5637", amount: 40_000, note: "Phở", transactionDate: "2026-09-09", userId: "carol", type: "expense" },
      { id: "t2", jarId: "food", jarName: "Ăn uống", jarIcon: "utensils", jarColor: "#AB5637", amount: 100_000, note: null, transactionDate: "2026-09-09", userId: "carol", type: "deposit" },
    ],
  };

  it("summarises the month and every jar, read-only", async () => {
    const view = await render(<SharedOwnerView data={data} />);
    expect(view.getByText("Chi tiêu của Carol")).toBeTruthy();
    expect(view.getByText("Đã chi 1.700.000 ₫ / 3.000.000 ₫ tháng này · chỉ xem, không thể chỉnh sửa")).toBeTruthy();
    expect(view.getByText("500.000 ₫ / 2.000.000 ₫")).toBeTruthy();
    expect(view.getByText("1.200.000 ₫ / 1.000.000 ₫")).toBeTruthy();
    expect(view.queryAllByRole("button")).toHaveLength(0); // chỉ xem: không có nút sửa/xóa nào
  });

  it("lists the transactions grouped by day, deposits with a plus sign", async () => {
    const view = await render(<SharedOwnerView data={data} />);
    expect(view.getByText("Phở")).toBeTruthy();
    expect(view.getByText("Không ghi chú")).toBeTruthy();
    expect(view.getByText("40.000 ₫")).toBeTruthy();
    expect(view.getByText("+100.000 ₫")).toBeTruthy();
  });

  it("handles an owner without jars or transactions", async () => {
    const view = await render(<SharedOwnerView data={{ ownerName: "Carol", jars: [], transactions: [] }} />);
    expect(view.getByText("Carol chưa có hũ nào.")).toBeTruthy();
    expect(view.getByText("Chưa có giao dịch nào.")).toBeTruthy();
  });
});

describe("SharedOwnerScreen", () => {
  it("says so when the person is not (or no longer) sharing", async () => {
    mockState.owner = { data: null, isLoading: false, error: null, refetch: jest.fn() };
    const view = await render(<SharedOwnerScreen />);
    expect(view.getByText("Không xem được")).toBeTruthy();
  });

  it("shows the data when shared", async () => {
    mockState.owner = { data: { ownerName: "Carol", jars: [], transactions: [] }, isLoading: false, error: null, refetch: jest.fn() };
    const view = await render(<SharedOwnerScreen />);
    expect(view.getByText("Chi tiêu của Carol")).toBeTruthy();
  });

  it("shows a load error with a retry", async () => {
    mockState.owner = { data: undefined, isLoading: false, error: new Error("Mất kết nối"), refetch: jest.fn() };
    const view = await render(<SharedOwnerScreen />);
    expect(view.getByText("Mất kết nối")).toBeTruthy();
    expect(view.getByText("Thử lại")).toBeTruthy();
  });
});
