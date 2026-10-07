import React from "react";
import { Alert, Share } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import type { HouseholdOverview } from "@hu/data";
import { HouseholdView } from "@/features/household/household-view";

const mockPush = jest.fn();
const mockMutations = {
  nickname: jest.fn(), invite: jest.fn(), join: jest.fn(), createJar: jest.fn(), contribution: jest.fn(), deactivate: jest.fn(),
};
const mockState: { invite: { code: string; expiresAt: string } | undefined; contributionError: Error | null } = { invite: undefined, contributionError: null };

jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock("@/features/finance/hooks", () => {
  const hook = (key: keyof typeof mockMutations, extra: () => object = () => ({})) => () => ({ mutate: (...args: unknown[]) => mockMutations[key](...args), isPending: false, error: null, reset: jest.fn(), ...extra() });
  return {
    useSetNickname: hook("nickname"),
    useCreateInvite: hook("invite", () => ({ data: mockState.invite })),
    useJoinHousehold: hook("join"),
    useCreateFamilyJar: hook("createJar"),
    useSetContribution: hook("contribution", () => ({ error: mockState.contributionError })),
    useDeactivateJar: hook("deactivate"),
  };
});

const me = { userId: "me", name: "Bạn", nickname: null, isMe: true };
const wife = { userId: "wife", name: "Bình", nickname: "vợ", isMe: false };
const rent = { id: "rent", name: "Nhà ở", icon: "home", color: "#9A5B13", monthlyBudget: 5_000_000, spent: 0, isShared: true, isSavings: false, alertAt80: true, rollover: false };
const overview = (over: Partial<HouseholdOverview> = {}): HouseholdOverview => ({
  household: { id: "h1", members: [me, wife] },
  familyJars: [{ jar: rent, contributions: [{ userId: "me", name: "Bạn", amount: 3_000_000 }, { userId: "wife", name: "vợ", amount: 2_000_000 }] }],
  lastSpendByUser: { wife: "2026-10-03T10:05:00Z" },
  ...over,
});
const alone = overview({ household: null, familyJars: [], lastSpendByUser: {} });

beforeEach(() => {
  jest.clearAllMocks();
  mockState.invite = undefined;
  mockState.contributionError = null;
});

describe("HouseholdView members", () => {
  it("invites someone to start a household when there is none yet", async () => {
    const view = await render(<HouseholdView overview={alone} myUserId="me" />);
    expect(view.getByText("Bạn")).toBeTruthy();
    expect(view.getByText("Bạn chưa có gia đình nào, tạo mã mời để bắt đầu (tối đa 5 người).")).toBeTruthy();
    expect(view.queryByText("Hũ gia đình")).toBeNull();
    expect(view.queryByText("Đặt biệt danh")).toBeNull();
  });

  it("lists members by nickname with their last spend in Vietnam time and the free slots", async () => {
    const view = await render(<HouseholdView overview={overview()} myUserId="me" />);
    expect(view.getAllByText("vợ")).toHaveLength(2); // dòng thành viên + dòng đóng góp của hũ gia đình
    expect(view.getByText("Chi gần nhất: 17:05 03/10")).toBeTruthy();
    expect(view.getByText("Còn 3 chỗ trống (tối đa 5 người).")).toBeTruthy();
  });

  it("hides the invite section once the household is full", async () => {
    const full = overview({ household: { id: "h1", members: [me, wife, ...[1, 2, 3].map((n) => ({ userId: `m${n}`, name: `M${n}`, nickname: null, isMe: false }))] } });
    const view = await render(<HouseholdView overview={full} myUserId="me" />);
    expect(view.getByText("Gia đình đã đủ 5 thành viên.")).toBeTruthy();
    expect(view.queryByText("Mời hoặc tham gia gia đình")).toBeNull();
  });

  it("saves a nickname and closes the editor on success", async () => {
    const view = await render(<HouseholdView overview={overview()} myUserId="me" />);
    await fireEvent.press(view.getByText("Sửa biệt danh"));
    await fireEvent.changeText(view.getByLabelText("Biệt danh"), "bà xã");
    await fireEvent.press(view.getByText("Lưu"));
    expect(mockMutations.nickname).toHaveBeenCalledWith({ memberId: "wife", nickname: "bà xã" }, expect.objectContaining({ onSuccess: expect.any(Function) }));

    await React.act(async () => mockMutations.nickname.mock.calls[0][1].onSuccess());
    expect(view.queryByLabelText("Biệt danh")).toBeNull();
  });
});

describe("HouseholdView invite and join", () => {
  it("is collapsed until opened, then creates and shares a code", async () => {
    const view = await render(<HouseholdView overview={overview()} myUserId="me" />);
    expect(view.queryByText("Tạo mã mời")).toBeNull();
    await fireEvent.press(view.getByText("Mời hoặc tham gia gia đình"));
    await fireEvent.press(view.getByText("Tạo mã mời"));
    expect(mockMutations.invite).toHaveBeenCalled();

    mockState.invite = { code: "A1B2C3D4", expiresAt: "2026-10-12T00:00:00Z" };
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    await view.rerender(<HouseholdView overview={overview()} myUserId="me" />);
    expect(view.getByText("A1B2C3D4")).toBeTruthy();
    await fireEvent.press(view.getByText("Chia sẻ mã"));
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining("A1B2C3D4") });
  });

  it("joins with the typed code and only enables the button once something is typed", async () => {
    const view = await render(<HouseholdView overview={alone} myUserId="me" />);
    await fireEvent.press(view.getByText("Mời hoặc tham gia gia đình"));
    expect(view.getByRole("button", { name: "Tham gia" }).props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(view.getByLabelText("Mã mời"), "A1B2C3D4");
    await fireEvent.press(view.getByText("Tham gia"));
    expect(mockMutations.join).toHaveBeenCalledWith("A1B2C3D4", expect.objectContaining({ onSuccess: expect.any(Function) }));
  });
});

describe("HouseholdView family jars", () => {
  it("shows each member's pledge and share, and opens the jar", async () => {
    const view = await render(<HouseholdView overview={overview()} myUserId="me" />);
    expect(view.getByText("5.000.000 ₫/tháng")).toBeTruthy();
    expect(view.getByText("3.000.000 ₫ · 60%")).toBeTruthy();
    expect(view.getByText("2.000.000 ₫ · 40%")).toBeTruthy();
    await fireEvent.press(view.getByText("Nhà ở"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/jars/[id]", params: { id: "rent" } });
  });

  it("updates the shares live while typing my pledge, then saves it", async () => {
    const view = await render(<HouseholdView overview={overview()} myUserId="me" />);
    await fireEvent.press(view.getByText("Sửa phần góp của bạn"));
    await fireEvent.changeText(view.getByLabelText("Số tiền bạn góp mỗi tháng (VNĐ)"), "8000000");
    expect(view.getByText("8.000.000 ₫ · 80%")).toBeTruthy();
    expect(view.getByText("2.000.000 ₫ · 20%")).toBeTruthy();

    await fireEvent.press(view.getByText("Lưu"));
    expect(mockMutations.contribution).toHaveBeenCalledWith({ jarId: "rent", amount: 8_000_000 }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    await React.act(async () => mockMutations.contribution.mock.calls[0][1].onSuccess());
    expect(view.getByText("Đã lưu phần đóng góp của bạn.")).toBeTruthy();
  });

  it("shows a failure to save the pledge", async () => {
    mockState.contributionError = new Error("permission denied");
    const view = await render(<HouseholdView overview={overview()} myUserId="me" />);
    expect(view.getByText("permission denied")).toBeTruthy();
  });

  it("creates a family jar from a name and can be cancelled", async () => {
    const view = await render(<HouseholdView overview={overview()} myUserId="me" />);
    await fireEvent.press(view.getByText("Tạo hũ gia đình"));
    expect(view.getByRole("button", { name: "Tạo hũ" }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(view.getByLabelText("Tên hũ gia đình"), "Ăn chung");
    await fireEvent.press(view.getByText("Tạo hũ"));
    expect(mockMutations.createJar).toHaveBeenCalledWith("Ăn chung", expect.objectContaining({ onSuccess: expect.any(Function) }));

    await fireEvent.press(view.getByText("Hủy"));
    expect(view.queryByLabelText("Tên hũ gia đình")).toBeNull();
  });

  it("asks before deleting a family jar", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const view = await render(<HouseholdView overview={overview()} myUserId="me" />);
    await fireEvent.press(view.getByLabelText("Xóa hũ Nhà ở"));
    expect(alert).toHaveBeenCalledWith("Xóa hũ gia đình “Nhà ở”?", "Giao dịch cũ vẫn được giữ lại.", expect.any(Array));
    expect(mockMutations.deactivate).not.toHaveBeenCalled();

    const destructive = (alert.mock.calls[0][2] as { text: string; onPress?: () => void }[]).find((button) => button.text === "Xóa");
    destructive?.onPress?.();
    expect(mockMutations.deactivate).toHaveBeenCalledWith("rent");
  });

  it("explains how to start when there are no family jars yet", async () => {
    const view = await render(<HouseholdView overview={overview({ familyJars: [] })} myUserId="me" />);
    expect(view.getByText(/Chưa có hũ gia đình nào/)).toBeTruthy();
  });
});
