# Hướng dẫn Quản lý Database Migrations

Tài liệu này cung cấp hướng dẫn về cách tạo và quản lý các thay đổi schema cho cơ sở dữ liệu bằng cách sử dụng `sequelize-cli` trong dự án này.

## 1. Tổng quan

Database migration là một cách để quản lý các thay đổi đối với schema cơ sở dữ liệu một cách có hệ thống và theo phiên bản. Mỗi thay đổi (thêm bảng, sửa cột,...) được chứa trong một tệp migration. Điều này cho phép chúng ta:

- Dễ dàng áp dụng các thay đổi lên các môi trường khác nhau (development, staging, production).
- Theo dõi lịch sử thay đổi của cơ sở dữ liệu.
- Hợp tác làm việc trên cùng một cơ sở dữ liệu mà không gây xung đột.

## 2. Tạo một Migration Mới

Để tạo một tệp migration mới, hãy sử dụng script `migration:create` của `pnpm` hoặc `npm`. Luôn sử dụng cờ `--name` để đặt tên cho migration của bạn. Tên nên mô tả ngắn gọn nhưng rõ ràng về thay đổi mà nó thực hiện.

**Câu lệnh:**

```bash
pnpm migration:create -- --name <ten-migration-cua-ban>
```

_hoặc_

```bash
npm run migration:create -- --name <ten-migration-cua-ban>
```

**Ví dụ:**

```bash
# Tốt
pnpm migration:create -- --name add-is-premium-to-users
pnpm migration:create -- --name create-products-table

# Không tốt (quá chung chung)
pnpm migration:create -- --name new-migration
pnpm migration:create -- --name update-db
```

Lệnh này sẽ tạo một tệp mới trong thư mục `migrations/` với định dạng `YYYYMMDDHHMMSS-ten-migration-cua-ban.js`.

## 3. Chạy Migrations

Để áp dụng tất cả các migration chưa được chạy lên cơ sở dữ liệu, sử dụng lệnh sau:

```bash
pnpm db:migrate
```

Sequelize sẽ theo dõi các migration đã được chạy trong một bảng đặc biệt có tên là `SequelizeMeta` trong cơ sở dữ liệu của bạn.

## 4. Rollback (Undo) Migrations

Việc rollback rất quan trọng khi bạn cần hoàn tác một thay đổi.

### 4.1. Undo Migration Gần Nhất

Để hoàn tác migration được áp dụng gần đây nhất:

```bash
pnpm db:migrate:undo
```

### 4.2. Undo Tất Cả Migrations

Để hoàn tác tất cả các migration đã chạy:

```bash
pnpm db:migrate:undo:all
```

### 4.3. Undo một Migration Cụ Thể (Theo Tên)

Trong trường hợp bạn cần hoàn tác một migration không phải là migration gần nhất, bạn phải chỉ định tên tệp của nó.

```bash
pnpm sequelize-cli db:migrate:undo --name <ten-file-migration>.js
```

**Ví dụ:**

```bash
pnpm sequelize-cli db:migrate:undo --name 20240702123456-add-is-premium-to-users.js
```

**Cảnh báo:** Việc undo một migration ở giữa có thể gây ra các vấn đề phụ thuộc nếu các migration sau đó phụ thuộc vào nó. Hãy thực hiện một cách cẩn thận.

## 5. Thực hành tốt nhất

1.  **Tên Rõ Ràng:** Luôn đặt tên migration có ý nghĩa.
2.  **Tính Thuận Nghịch (Reversible):** Mọi hàm `up` phải có một hàm `down` tương ứng để có thể hoàn tác an toàn. Hàm `down` nên thực hiện hành động ngược lại chính xác với hàm `up`.
3.  **Không Sửa Đổi Migration Cũ:** Một khi migration đã được chạy trên môi trường production hoặc được merge vào nhánh chính, **không bao giờ** được sửa đổi nó. Thay vào đó, hãy tạo một migration mới để thực hiện các thay đổi bổ sung. Việc sửa đổi các migration cũ có thể gây ra sự không nhất quán nghiêm trọng giữa các môi trường.
4.  **Kiểm Tra Kỹ Lưỡng:** Luôn kiểm tra các migration của bạn trên môi trường local trước khi commit. Chạy cả `db:migrate` và `db:migrate:undo` để đảm bảo cả hai chiều đều hoạt động như mong đợi.
