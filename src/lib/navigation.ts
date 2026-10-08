export type NavigationItem = {
  href: string;
  label: string;
  icon: string;
};

export const desktopNavigation: readonly NavigationItem[] = [
  { href: "/", label: "Tổng quan", icon: "layout-dashboard" },
  { href: "/jars", label: "Hũ ngân sách", icon: "wallet" },
  { href: "/transactions", label: "Giao dịch", icon: "receipt" },
  { href: "/allocate", label: "Chia lương", icon: "calculator" },
  { href: "/debts", label: "Trả nợ", icon: "hand-coins" },
  { href: "/reports", label: "Báo cáo", icon: "chart-no-axes-column" },
  { href: "/household", label: "Gia đình", icon: "users" },
  { href: "/shared", label: "Chia sẻ", icon: "share-2" },
];

export const mobileNavigation: readonly NavigationItem[] = [
  { href: "/", label: "Tổng quan", icon: "layout-dashboard" },
  { href: "/jars", label: "Hũ", icon: "wallet" },
  { href: "/transactions", label: "Giao dịch", icon: "receipt" },
  { href: "/reports", label: "Báo cáo", icon: "chart-no-axes-column" },
  { href: "/more", label: "Thêm", icon: "menu" },
];

export const moreNavigation: readonly NavigationItem[] = [
  { href: "/allocate", label: "Chia lương", icon: "calculator" },
  { href: "/debts", label: "Trả nợ", icon: "hand-coins" },
  { href: "/household", label: "Gia đình", icon: "users" },
  { href: "/shared", label: "Chia sẻ", icon: "share-2" },
  { href: "/more#account", label: "Tài khoản", icon: "circle-user-round" },
];
