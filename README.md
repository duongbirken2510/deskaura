# 🌱 DeskAura — Smart Office Wellness & Ambient Focus Companion (Windows Desktop)

**DeskAura** là ứng dụng Windows Desktop siêu nhẹ được xây dựng trên nền tảng **Tauri v2 (Rust + React + TypeScript + TailwindCSS)** dành riêng cho dân văn phòng hiện đại, kết hợp 3 trụ cột chăm sóc sức khỏe và sự tập trung:

1. **🧘 Nhắc Đứng Dậy & Bảo Vệ Mắt (Quy tắc 20-20-20):** Tự động phát hiện thời gian rời máy (`Idle Time`) qua Windows API để tự đặt lại bộ đếm, tạm hoãn khi đang họp/trình chiếu toàn màn hình (`Fullscreen`), hướng dẫn bài tập giãn cơ cổ - vai - cổ tay trực quan.
2. **💧 Nhắc Uống Nước Thông Minh:** Ghi nhận lượng nước 1-chạm ngay trên giao diện hoặc từ menu chuột phải ở Khay hệ thống (`System Tray`), đồng bộ với giờ nghỉ đứng dậy và nuôi dưỡng **Chậu cây DeskAura** trên bàn làm việc.
3. **🎵 Bộ Trộn Nhạc Nền Chữa Lành & Tập Trung (Offline + Online + Zing MP3):**
   * **10 lớp âm thanh Offline (Không cần mạng):** Mưa hiên nhà, Suối rừng, Sóng biển, Gió đồi thông, Lửa trại, Chuông xoay Tây Tạng (432Hz/528Hz), Sóng não Alpha (10Hz Focus), Sóng não Theta (6Hz Healing), Brown Noise & Pink Noise.
   * **Trình Phát Nhạc Zing MP3 Tích Hợp Nâng Cao:** Hỗ trợ chạy ngầm khi đóng cửa sổ (`Close-to-Background`), bảng điều khiển từ xa (Chuyển bài, Tạm dừng, Chỉnh âm lượng riêng), lưu Playlist yêu thích và **Bộ lọc Chống Nhạc Quảng Cáo 3 Lớp (`Smart Audio Ad-Guard`)**.
   * **6 Đài Radio Chữa Lành & Lofi Quốc Tế (Không quảng cáo):** SomaFM Groove Salad, SomaFM Drone Zone, I Love Chillhop & Lofi, SomaFM Fluid, Deep Space One, Lush + Hỗ trợ mở file nhạc `.mp3/.wav/.ogg` từ máy tính.
4. **🔊 Nhắc Nhở Giọng Nói Tiếng Việt + Tự Động Giảm Âm Lượng Ứng Dụng Khác (`WASAPI Audio Ducking`):**
   * Tích hợp sẵn bộ giọng đọc AI Neural Tiếng Việt (*Nữ Dịu Dàng* & *Nam Trầm Ấm*) hoạt động 100% Offline.
   * Tự động hạ nhỏ âm lượng của các ứng dụng khác trên Windows (YouTube, Spotify, Chrome, Zing MP3...) xuống 20% khi đang đọc lời nhắc và khôi phục lại mượt mà ngay sau khi đọc xong.

---

## 📥 Tải Bộ Cài Đặt Windows (`.exe`)

Các file thực thi đã được đóng gói sẵn trong thư mục [`Release_Windows/`](./Release_Windows):
* **`DeskAura_1.0.0_x64-setup.exe`** (~2.6 MB): Bộ cài đặt chuẩn cho Windows 10/11.
* **`DeskAura_Portable.exe`** (~9.7 MB): Bản chạy trực tiếp không cần cài đặt.

---

## 🚀 Hướng Dẫn Phát Triển Từ Mã Nguồn

```powershell
# 1. Cài đặt thư viện
npm install

# 2. Chạy thử nghiệm ở chế độ Phát triển (Desktop App)
npm run tauri dev

# 3. Đóng gói bộ cài đặt .exe cho Windows
npm run tauri build -- --bundles nsis
```
