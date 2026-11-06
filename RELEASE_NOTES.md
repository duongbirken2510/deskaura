# 🌱 DeskAura v1.2.5 — Official Bilingual Release (Tiếng Việt & English)

> **What's New in v1.2.5** | **Tổng hợp các nâng cấp mới trong phiên bản v1.2.5**

[![Watch Official Cinematic TVC](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/media/deskaura_tvc_preview.gif)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_tvc_intro.mp4)

🌟 **[▶️ Xem Video TVC Văn Phòng Mỏi Mắt (`deskaura_tvc_eyecare.mp4`)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_tvc_eyecare.mp4)** • **[🎬 Xem Video TVC Cú Đêm IT (`deskaura_tvc_intro.mp4`)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_tvc_intro.mp4)** • **[💻 Xem Video Demo Giao Diện 45s (`deskaura_demo_45s.mp4`)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_demo_45s.mp4)**

---

## 🇻🇳 PHẦN 1: CÁC TÍNH NĂNG MỚI NỔI BẬT TRÊN BẢN v1.2.5

### 1. 🛡️ Bảo Vệ Mắt & Lọc Ánh Sáng Xanh Phần Cứng (`Aura Eye-Shield` — macOS / Windows / Linux)
- **Can thiệp trực tiếp bảng màu phần cứng (`Hardware Display Gamma LUT`):** Điều chỉnh độ dịu sáng và lọc tia sáng xanh trực tiếp ở tầng card đồ họa (`CoreGraphics CGSetDisplayTransferByFormula` trên mọi màn hình macOS kể cả màn hình rời HDMI/Type-C, `SetDeviceGammaRamp` trên Windows và `xrandr` trên Linux) — **tiêu thụ `0% GPU/RAM`**, không tạo lớp phủ cửa sổ ảo gây lag chuột.
- **3 Chế độ thông minh tích hợp gọn trong `⚙️ Cài Đặt` (0 làm rối Trang Tổng Quan):**
  1. **☀️ Tự động theo giờ mặt trời:** Ban ngày chuẩn màu `100%` $\rightarrow$ Sau `18h00` tự chuyển sang *Dịu nhẹ văn phòng* $\rightarrow$ Sau `22h00` tự chuyển sang *Đêm khuya OT*.
  2. **🌿 Dịu nhẹ văn phòng (`5000K`):** Lọc nhẹ `15%` ánh sáng xanh gắt khi nhìn bảng tính Excel/Word dưới đèn huỳnh quang.
  3. **🌙 Đêm khuya OT (`3800K`):** Lọc `35%` ánh sáng xanh và hạ dịu độ chói màn hình để bảo vệ võng mạc và hormone giấc ngủ Melatonin.
- **Tự động trả chuẩn màu `100%` khi họp / xem phim Fullscreen & Bật/Tắt 1 chạm ở Khay Hệ Thống (`System Tray`):** Dân thiết kế/chỉnh ảnh có thể bật/tắt nhanh chế độ Chuẩn màu ngay từ icon giọt nước ở Taskbar / Menu Bar.

### 2. 😌 Màn Hình "Thở" Dịu Sáng 20 Giây Nghỉ Mắt (`20-20-20 Breathing Dimmer` — Fade In-Out `1.5s`)
- Khi đến chu kỳ nghỉ mắt 20-20-20, màn hình tự động **dịu độ sáng xuống từ từ trong `1.5 giây` (`Fade-in Cosine Curve`)** để dẫn nhịp cho mắt bạn tự nhiên rời khỏi màn hình và nhìn ra xa 6 mét mà không gây giật mình.
- Ngay khi hết 20 giây (hoặc khi bấm `Bỏ qua`), độ sáng màn hình **tự động nâng mượt mà trở lại `100%` trong `1.5 giây` (`Fade-out`)**.

### 3. 🧘 Tự Động Ghi Nhận `+1 Lần Đứng Dậy` Bằng Cảm Biến Rời Máy Ở Chế Độ Nhắc Nhẹ (`Smart 180s Idle Break Credit`)
- Khi đang ở **Chế độ Nhắc nhẹ dưới Taskbar (`Gentle Mode`)** hoặc khi hiện thông báo nhắc nghỉ mà người dùng đứng dậy đi lấy nước / vận động luôn không bấm nút xác nhận:
- Nếu cảm biến phần cứng (`Native C FFI`) phát hiện không có thao tác chuột và bàn phím đủ **3 phút (`180 giây`)**, DeskAura **tự động cộng `+1 lần đứng dậy`** vào thống kê trong ngày, tự động ẩn thanh nhắc nghỉ và đặt lại đồng hồ chu kỳ 60 phút mới.

### 4. 🐧 Hỗ Trợ Chính Thức Phiên Bản Linux (`.deb` & `.AppImage`)
- Bên cạnh **Windows (`.exe`)** và **macOS Apple Silicon (`.dmg`)**, DeskAura v1.2.5 chính thức phát hành gói cài đặt tự động cho **Linux Ubuntu/Debian (`.deb`)** và **Linux Portable (`.AppImage`)** tích hợp đầy đủ cảm biến X11 (`libXss`), bộ lọc màn hình `xrandr` và tự khởi động chuẩn XDG (`~/.config/autostart/deskaura.desktop`).

### 5. ⚡ Nền Tảng Cốt Lõi Từ Các Bản v1.2.x
- **Cập nhật ngầm không popup (`Silent Background OTA` & `Two-Phase GC`):** Tự tải bản mới trong nền và tự dọn rác gói cài đặt cũ.
- **Đồng bộ đa thiết bị lai 4 tầng (`4-Tier Hybrid Sync`):** Đồng bộ tức thì `<5ms` qua mạng nội bộ Wi-Fi/LAN UDP `45888` kết hợp Google Cloud Firestore & mã 6 ký tự `Aura Code`.
- **Biểu tượng Giọt Nước dâng theo % trên System Tray / Menu Bar** & **Mã hóa lịch sử sức khỏe gắn phần cứng (`enc:v2:`)**.

---

## 🇬🇧 PART 2: WHAT'S NEW IN DESKAURA v1.2.5 (ENGLISH RELEASE NOTES)

### 1. 🛡️ Hardware-Level Eye Protection & Blue-Light Filter (`Aura Eye-Shield`)
- **Zero-Overhead Native Gamma LUT Control:** Adjusts screen warmth and brightness directly via OS display hardware APIs (`CGSetDisplayTransferByFormula` across all connected displays on macOS, `SetDeviceGammaRamp` on Windows, and `xrandr` on Linux) with **0% GPU/RAM overhead** and no click-blocking overlay windows.
- **Minimalist Settings Integration & 3 Smart Presets:**
  - **☀️ Auto Sunset Schedule:** `100%` color accuracy during daylight $\rightarrow$ *Office Comfort* after `18:00` $\rightarrow$ *Night-Owl OT* after `22:00`.
  - **🌿 Office Comfort (`5000K`):** Softens harsh glare for long spreadsheet and coding sessions.
  - **🌙 Night-Owl OT (`3800K`):** Cuts `35%` blue light and dims luminance for late-night deep work.
- **Fullscreen True-Color Bypass & 1-Click System Tray Toggle:** Automatically restores `100%` original color calibration during fullscreen meetings/videos, or toggle anytime from the System Tray / Menu Bar.

### 2. 😌 20-Second Breathing Screen Dimmer (`Fade In-Out 1.5s`)
- During each 20-20-20 eye break, your display gently dims over **`1.5 seconds` (`Cosine Ease-In-Out`)**, naturally guiding your eyes to look away and relax, then smoothly restores full brightness over **`1.5 seconds`** when the break finishes or is skipped.

### 3. 🧘 Smart 180-Second Idle Break Credit in Gentle Mode
- When using **Gentle Taskbar Mode** (or when stepping away right after a break prompt without clicking confirm), if the native OS input sensor detects **$\ge 180$ seconds (3 minutes)** of zero mouse/keyboard activity, DeskAura automatically credits **`+1 Standup Break`**, dismisses the break banner, and resets your 60-minute cycle.

### 4. 🐧 Official Linux Support (`.deb` & `.AppImage`)
- Full native support for Linux desktops alongside Windows and macOS, including `.deb` and `.AppImage` bundles, X11 Screen Saver idle detection, `xrandr` gamma dimmer, and XDG autostart integration.

---

## 📸 Giao Diện Thực Tế v1.2.5 (Tiếng Việt & English) / v1.2.5 Screenshots

### 🇻🇳 Tổng Quan Sức Khỏe & Phòng Thu Zing MP3 (Vietnamese Edition)
![DeskAura v1.2.5 Dashboard VI](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/01-dashboard-vi.png)
![DeskAura v1.2.5 Sound Studio VI](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/02-sound-studio.png)

### 🇬🇧 Wellness Dashboard & Global Lofi / SoundCloud Hub (English Edition)
![DeskAura v1.2.5 Dashboard EN](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/01-dashboard-en.png)
![DeskAura v1.2.5 Sound Studio EN](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/02-sound-studio-en.png)

---

## 👨‍💻 Tác Giả & Liên Hệ / Author & Contact

| 🇻🇳 Lời nhắn từ Tác giả | 🇬🇧 Note from the Author |
| :--- | :--- |
| **DeskAura** là dự án tâm huyết được mình phát triển và chia sẻ **hoàn toàn miễn phí** cho cộng đồng, với mong muốn giúp anh chị em văn phòng & lập trình viên bảo vệ cột sống, đôi mắt và giữ trọn sự tĩnh lặng khi làm việc sâu (*Deep Work*).<br><br>Nếu ứng dụng hữu ích với bạn, hãy tặng dự án một ngôi sao (**⭐ Star**) trên GitHub hoặc ghé thăm website của mình để kết nối và góp ý thêm nhé! | **DeskAura** is a passion project built and shared **100% free and open-source**, designed to help office workers, creators, and developers protect their spine, eyesight, and deep-work focus without intrusive interruptions.<br><br>If you find DeskAura helpful, please consider giving this repo a **⭐ Star** on GitHub or visiting my website to connect and share your feedback! |

<div align="center">

**🌐 Website & Liên hệ / Official Website:** [**https://duongbirken.deta.vn**](https://duongbirken.deta.vn)  
**🐞 Báo lỗi & Góp ý / Issues & Feedback:** [**GitHub Issues**](https://github.com/duongbirken2510/deskaura/issues)

</div>
