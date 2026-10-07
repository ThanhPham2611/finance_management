export type TourStep = { title: string; body: string };

const DONE: TourStep = { title: "Xong rồi!", body: "Xem lại hướng dẫn này bất cứ lúc nào ở tab Thêm." };

// Nội dung theo hướng dẫn của web; không có vùng sáng nên bước nào cũng là một thẻ giữa màn hình.
const FULL: TourStep[] = [
  { title: "Chào mừng đến với Hũ", body: "Xem nhanh vài điểm chính trên Tổng quan trước khi bắt đầu." },
  { title: "Ghi giao dịch nhanh", body: "Ghi lại một khoản chi chỉ mất vài giây, bất cứ lúc nào: vào tab Giao dịch rồi chạm “Ghi giao dịch”." },
  { title: "Số tiền còn lại", body: "Đây là số bạn còn có thể chi tháng này, chia theo từng hũ ngân sách." },
  { title: "Các hũ ngân sách", body: "Mỗi hũ là một khoản riêng. Chạm vào một hũ để xem chi tiết." },
  { title: "Giao dịch gần nhất", body: "Chạm vào một giao dịch để sửa nhanh." },
  DONE,
];

const EMPTY: TourStep[] = [
  { title: "Chào mừng đến với Hũ", body: "Bắt đầu bằng cách tạo hũ ngân sách đầu tiên." },
  { title: "Tạo hũ đầu tiên", body: "Chạm “Tạo hũ”. Ví dụ: Ăn uống, Di chuyển, Giải trí…" },
  DONE,
];

/** Chưa có hũ nào thì chỉ hướng dẫn tạo hũ đầu tiên. */
export const tourSteps = (hasJars: boolean): TourStep[] => (hasJars ? FULL : EMPTY);
