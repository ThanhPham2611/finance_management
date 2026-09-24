@AGENTS.md

# Kiểm thử khi đổi tính năng/giao diện

Sau khi thêm tính năng mới hoặc thay đổi giao diện, phải xác minh bằng Playwright
trên trình duyệt thật trước khi coi là xong — không chỉ dựa vào code review hay
type-check. Test nằm ở `e2e/`, chạy bằng `npm run test:e2e`. Nếu phần vừa đổi
chưa có test phủ, viết thêm test mới nhắm đúng vào thay đổi đó (không cần phủ
toàn bộ app, chỉ phần vừa động tới).
