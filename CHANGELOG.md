# Changelog — DeskAura

All notable changes to **DeskAura** are documented in this file.

---

## [v1.1.0] — 2026-11-04

### ✨ Tính Năng Mới (Added)
- **Tab `Thống Kê` (`Analytics`) Độc Lập:** Tách riêng bộ 3 biểu đồ **Mebius 7 Ngày** (*Thống kê Nước uống & Vận động 7 ngày*, *Nhịp Tập Trung Sâu Deep Focus Flow*, *Điểm Sức Khỏe Aura Index 0–100*) sang tab riêng biệt để giữ trang **Tổng Quan Sức Khỏe** tinh gọn trên 1 khung nhìn.
- **Tùy Chọn Kiểu Nhắc Nhở (`Màn Hình Nhắc` vs. `Icon Taskbar`):**
  - **🖥️ Hiển thị Màn hình Nhắc nhở (Bung cửa sổ - `overlay`):** Tự động bung cửa sổ hướng dẫn bài tập giãn cơ kết hợp giọng đọc AI khi đến giờ nghỉ.
  - **🔔 Chỉ nhắc ở Icon Taskbar / Khay hệ thống (`gentle`):** Không bung cửa sổ làm gián đoạn việc đang gõ; nháy sáng biểu tượng Taskbar/Dock (`request_user_attention`), cập nhật trạng thái System Tray, hiện thanh thông báo nhẹ nhàng trong ứng dụng kèm giọng đọc nhắc nhở.

### 🔄 Cải Tiến & Tối Ưu Hóa (Changed & Removed)
- **Tối Ưu Trang `Nhạc Nền Thư Giãn` (`Sound Studio`):**
  - Đưa **🎶 Trung Tâm Điều Khiển Zing MP3 Nâng Cao** (phát ngầm + bộ lọc chống quảng cáo 3 lớp `Smart Audio Ad-Guard`) lên vị trí đầu trang.
  - Loại bỏ khu vực kênh đài FM trực tuyến (`ONLINE_STATIONS`) và danh sách kho nhạc ngoài (`FREE_MUSIC_RESOURCES`) để giao diện gọn gàng, tập trung.
  - Tích hợp nút **Mở file nhạc từ máy (`.mp3/.wav/.flac`)** trực tiếp vào thanh công cụ của **Bộ Trộn Âm Thanh Thiên Nhiên & Sóng Não Offline**.

---

## [v1.0.0] — 2026-11-03

### 🎉 Phiên Bản Đầu Tiên (Initial Release)
- Bộ đếm kép **Đứng dậy vận động** & **Nghỉ mắt 20-20-20** với tính năng tự nhận diện rời máy (`Idle Detection`) và toàn màn hình (`Fullscreen Detection`).
- Hoạt ảnh hướng dẫn giãn cơ đa khớp 60fps & Trạm theo dõi uống nước cùng **Chậu cây DeskAura**.
- Bộ trộn 10 lớp âm thanh thiên nhiên & sóng não Offline + Trình phát Zing MP3 chạy ngầm chống quảng cáo.
- Giọng đọc AI Song ngữ Việt - Anh & công nghệ tự động giảm âm lượng ứng dụng khác (**Windows WASAPI Audio Ducking**).
