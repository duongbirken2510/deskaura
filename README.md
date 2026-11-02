# 🌱 Mầm Xanh — Ứng Dụng Chăm Sóc Sức Khỏe & Nhạc Nền Văn Phòng (Windows Desktop)

Ứng dụng Windows Desktop siêu nhẹ được xây dựng trên nền tảng **Tauri v2 (Rust + React + TypeScript + TailwindCSS)** dành riêng cho dân văn phòng, kết hợp 3 trụ cột:
1. **🧘 Nhắc Đứng Dậy & Bảo Vệ Mắt (Quy tắc 20-20-20):** Tự động phát hiện thời gian rời máy (`Idle Time`) qua Windows API để tự đặt lại bộ đếm, tạm hoãn khi đang họp/trình chiếu toàn màn hình (`Fullscreen`), hướng dẫn bài tập giãn cơ cổ - vai - cổ tay trực quan.
2. **💧 Nhắc Uống Nước Thông Minh:** Ghi nhận lượng nước 1-chạm ngay trên giao diện hoặc từ menu chuột phải ở Khay hệ thống (`System Tray`), đồng bộ với giờ nghỉ đứng dậy và nuôi dưỡng **Chậu cây Mầm Xanh** trên bàn làm việc.
3. **🎵 Bộ Trộn Nhạc Nền Chữa Lành & Tập Trung (Offline + Online):**
   * **10 lớp âm thanh Offline (Không cần mạng):** Mưa hiên nhà, Suối rừng, Sóng biển, Gió đồi thông, Lửa trại, Chuông xoay Tây Tạng (432Hz/528Hz), Sóng não Alpha (10Hz Focus), Sóng não Theta (6Hz Healing), Brown Noise & Pink Noise.
   * **6 Đài Radio Chữa Lành & Lofi Trực Tuyến (Không quảng cáo):** SomaFM Groove Salad, SomaFM Drone Zone, I Love Chillhop & Lofi, SomaFM Fluid, Deep Space One, Lush + Hỗ trợ mở file nhạc `.mp3/.wav/.ogg` từ máy tính.
4. **🔊 Nhắc Nhở Giọng Nói Tiếng Việt + Tự Động Giảm Âm Lượng Ứng Dụng Khác (`WASAPI Audio Ducking`):**
   * Tích hợp sẵn bộ giọng đọc AI Neural Tiếng Việt (*Nữ Dịu Dàng* & *Nam Trầm Ấm*) hoạt động 100% Offline.
   * Tự động hạ nhỏ âm lượng của các ứng dụng khác trên Windows (YouTube, Spotify, Chrome...) xuống 20% khi đang đọc lời nhắc và khôi phục lại mượt mà ngay sau khi đọc xong.

---

## 🚀 Hướng Dẫn Chạy & Đóng Gói Ứng Dụng

### 1. Chạy thử nghiệm ở chế độ Phát triển (Desktop App)
```powershell
npm run tauri dev
```

### 2. Chạy nhanh giao diện trên trình duyệt (Web Preview)
```powershell
npm run dev
```

### 3. Đóng gói bộ cài đặt `.exe` / `.msi` cho Windows
```powershell
npm run tauri build
```
File cài đặt hoàn chỉnh sẽ nằm tại: `src-tauri/target/release/bundle/`.

