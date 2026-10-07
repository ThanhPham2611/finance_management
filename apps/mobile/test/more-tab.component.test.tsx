import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import MoreScreen from "@/app/(tabs)/more";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockSignOut = jest.fn();
const state: { profile: unknown; email: string } = { profile: {}, email: "an.nguyen@example.com" };

jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args), navigate: (...args: unknown[]) => mockNavigate(...args) } }));
jest.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ session: { user: { email: state.email } }, signOut: mockSignOut }) }));
jest.mock("@/features/finance/hooks", () => ({ useProfile: () => state.profile }));

beforeEach(() => {
  jest.clearAllMocks();
  state.email = "an.nguyen@example.com";
  state.profile = { data: { fullName: "An Nguyễn", hasSeenTour: true } };
});

describe("MoreScreen", () => {
  it("shows who is signed in", async () => {
    const view = await render(<MoreScreen />);
    expect(view.getByText("Tài khoản")).toBeTruthy();
    expect(view.getByText("An Nguyễn")).toBeTruthy();
    expect(view.getByText("an.nguyen@example.com")).toBeTruthy();
    expect(view.getByText("A")).toBeTruthy(); // chữ cái đại diện
  });

  it("falls back to the email's local part while the profile has no name or is still loading", async () => {
    state.profile = { data: undefined };
    const view = await render(<MoreScreen />);
    expect(view.getByText("an.nguyen")).toBeTruthy();
    expect(view.getByText("A")).toBeTruthy();
  });

  it("opens allocate, household and sharing", async () => {
    const view = await render(<MoreScreen />);
    await fireEvent.press(view.getByText("Chia lương"));
    expect(mockPush).toHaveBeenLastCalledWith("/allocate");
    await fireEvent.press(view.getByText("Gia đình"));
    expect(mockPush).toHaveBeenLastCalledWith("/household");
    await fireEvent.press(view.getByText("Chia sẻ chi tiêu"));
    expect(mockPush).toHaveBeenLastCalledWith("/shared");
  });

  it("replays the tour with a fresh code every time", async () => {
    const view = await render(<MoreScreen />);
    await fireEvent.press(view.getByText("Xem lại hướng dẫn"));
    const first = mockNavigate.mock.calls[0][0];
    expect(first).toMatchObject({ pathname: "/overview", params: { tour: expect.stringMatching(/^\d+$/) } });

    jest.spyOn(Date, "now").mockReturnValue(Number(first.params.tour) + 5);
    await fireEvent.press(view.getByText("Xem lại hướng dẫn"));
    expect(mockNavigate.mock.calls[1][0].params.tour).not.toBe(first.params.tour);
  });

  it("signs out", async () => {
    const view = await render(<MoreScreen />);
    await fireEvent.press(view.getByText("Đăng xuất"));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
