# E-commerce Monolithic API

Bài tập PROMPT 2 — Lâm Gia Bảo.

## Công nghệ

Node.js, Express, Prisma, PostgreSQL, JWT và Docker Compose.

## Chức năng

- Đăng ký, đăng nhập và xem thông tin tài khoản.
- CRUD sản phẩm, phân quyền admin và khách hàng.
- Tạo và xem đơn hàng cùng chi tiết đơn hàng.
- Kiểm tra tồn kho và trừ kho khi đặt hàng.
- Admin tạo và cập nhật trạng thái giao hàng.
- Health check kết nối database.

## Chạy bằng Docker Compose

1. Cài và mở Docker Desktop.
2. Sao chép `.env.example` thành `.env`.
3. Điền thông tin cấu hình trong `.env`:
   - Đặt mật khẩu PostgreSQL và cập nhật DATABASE_URL tương ứng.
   - Đặt mật khẩu admin ít nhất 12 ký tự.
   - Tạo JWT_SECRET ngẫu nhiên ít nhất 32 ký tự.
4. Chạy:

```bash
docker compose up -d --build
docker compose ps
```

Ứng dụng tự áp dụng migration và seed dữ liệu nền khi khởi động.

API: http://localhost:3001

Health check: http://localhost:3001/health

## API chính

| Phương thức | Đường dẫn | Chức năng |
|---|---|---|
| POST | /api/auth/register | Đăng ký |
| POST | /api/auth/login | Đăng nhập |
| GET | /api/auth/me | Thông tin tài khoản |
| GET | /api/products | Danh sách sản phẩm |
| GET | /api/products/:pid | Chi tiết sản phẩm |
| POST | /api/products | Tạo sản phẩm — admin |
| PUT | /api/products/:pid | Sửa sản phẩm — admin |
| DELETE | /api/products/:pid | Xóa sản phẩm — admin |
| POST | /api/orders | Đặt hàng |
| GET | /api/orders | Xem danh sách đơn |
| GET | /api/orders/:oid | Xem chi tiết đơn |
| POST | /api/shipments | Tạo giao hàng — admin |
| PATCH | /api/shipments/:shipid | Cập nhật giao hàng — admin |
| GET | /health | Health check |

API cần đăng nhập sử dụng header:
Authorization: Bearer <token>

Khách hàng chỉ xem được đơn hàng của mình; admin xem được tất cả.

## Chạy lại và dừng ứng dụng

Chạy lại:

```bash
docker compose up -d
```

Dừng:

```bash
docker compose stop
```

Không dùng `docker compose down -v` nếu muốn giữ dữ liệu.

## Cấu hình riêng

Không đưa `.env` chứa mật khẩu và JWT_SECRET lên GitHub.
Thay ADMIN_PASSWORD trong `.env` không tự đổi mật khẩu admin đã có trong database.