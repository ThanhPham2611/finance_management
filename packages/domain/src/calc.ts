/**
 * Ô nhập số tiền kiểu máy tính: người dùng gõ `1+2+3`, `50000*2-1000` hay viết tắt kiểu Việt `50k`, `2tr`, `2tr5` (2,5 triệu), `1,5tr` và nhận kết quả.
 * Không dùng `eval`. Quy ước như trên màn hình: dấu `.` là phân cách hàng nghìn (bỏ qua), dấu `,` là dấu thập phân.
 */

const MAX_AMOUNT = 999_999_999_999;

/**
 * Giữ lại chữ số, `+ - * / ( )`, dấu phẩy thập phân và chữ viết tắt `k` (nghìn), `tr` (triệu).
 * `x × *` quy về `*`, `÷ : /` quy về `/`, chữ hoa về chữ thường; "5 triệu" thành `5tr` vì các chữ khác bị bỏ.
 * Dấu `.` là phân cách hàng nghìn nên bị bỏ: gõ `1.600.000` hay `1600000` như nhau.
 */
export function sanitizeExpression(text: string): string {
  return text
    .toLowerCase()
    .replace(/[x×*]/g, "*")
    .replace(/[÷:/]/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/[^0-9+\-*/(),ktr]/g, "");
}

/** Ô đang chứa phép tính hoặc viết tắt (khác một con số thuần) — lúc đó cần hiện dòng kết quả. */
export function isCalculation(text: string): boolean {
  return !/^\d*$/.test(sanitizeExpression(text));
}

/** Chuỗi hiển thị: dấu chấm nghìn cho phần nguyên của từng số, `×` `÷` thay cho `*` `/`. Đưa chuỗi này qua `sanitizeExpression` là về lại dạng gốc. */
export function formatExpression(text: string): string {
  return sanitizeExpression(text)
    .replace(/(\d+)(,\d*)?/g, (_match, whole: string, decimals = "") => whole.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + decimals)
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");
}

/** Một số: `50`, `1,5`, và viết tắt `50k`, `2tr`, `1,5tr`, `2tr5` (chữ số sau đơn vị là phần lẻ: 2,5 triệu), `1k500` (1.500). */
const NUMBER = /^(\d+)(?:,(\d+))?(?:(tr|k)(\d+)?)?/;

/**
 * Tính biểu thức, làm tròn về số nguyên. Trả `null` nếu chưa hoàn chỉnh (`1+`), sai cú pháp, chia cho 0 hoặc kết quả quá lớn.
 * Kết quả có thể âm hoặc 0 — người gọi tự quyết định có hợp lệ làm số tiền không.
 */
export function evaluateExpression(text: string): number | null {
  const source = sanitizeExpression(text);
  if (!source) return null;
  let position = 0;

  function factor(): number | null {
    const char = source[position];
    if (char === "-" || char === "+") {
      position++;
      const value = factor();
      return value === null ? null : char === "-" ? -value : value;
    }
    if (char === "(") {
      position++;
      const value = sum();
      if (value === null || source[position] !== ")") return null;
      position++;
      return value;
    }
    const match = NUMBER.exec(source.slice(position));
    if (!match) return null;
    const [text, whole, decimals, unit, tail] = match;
    // `1,5tr5` vừa có phẩy vừa có chữ số sau đơn vị: mơ hồ nên từ chối.
    if (decimals !== undefined && tail !== undefined) return null;
    position += text.length;
    const scale = unit === "tr" ? 1_000_000 : unit === "k" ? 1_000 : 1;
    return Number(decimals ? `${whole}.${decimals}` : whole) * scale + (tail ? Math.round(Number(`0.${tail}`) * scale) : 0);
  }

  function product(): number | null {
    let value = factor();
    while (value !== null && (source[position] === "*" || source[position] === "/")) {
      const operator = source[position++];
      const next = factor();
      if (next === null || (operator === "/" && next === 0)) return null;
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  }

  function sum(): number | null {
    let value = product();
    while (value !== null && (source[position] === "+" || source[position] === "-")) {
      const operator = source[position++];
      const next = product();
      if (next === null) return null;
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  }

  const value = sum();
  if (value === null || position !== source.length) return null;
  const rounded = Math.round(value);
  return Number.isFinite(rounded) && Math.abs(rounded) <= MAX_AMOUNT ? rounded : null;
}

/** Số tiền hợp lệ từ ô nhập: kết quả phải > 0, ngược lại 0 (nút Lưu bị khoá). */
export function amountFromExpression(text: string): number {
  const value = evaluateExpression(text);
  return value !== null && value > 0 ? value : 0;
}
