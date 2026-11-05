# 🌱 DeskAura v1.2.4 — Official Bilingual Release (Tiếng Việt & English)

> **What's New from v1.2.0 $\rightarrow$ v1.2.4** | **Tổng hợp các nâng cấp mới từ bản v1.2.0 $\rightarrow$ v1.2.4**

[![Watch 45s Official Demo Video](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/media/deskaura_demo_preview.gif)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_demo_45s.mp4)

🎬 **[▶️ Nhấn vào đây để xem / tải Video Demo 45s Full HD 60fps (`deskaura_demo_45s.mp4`)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_demo_45s.mp4)**

---

## 🇻🇳 PHẦN 1: CÁC TÍNH NĂNG MỚI NỔI BẬT (SO VỚI BẢN v1.2.0)

### 1. 🤫 Cơ Chế Cập Nhật Ngầm Không Làm Phiền (`Silent Background OTA Update` & `Two-Phase Garbage Collection`)
- **Tải ngầm trong bóng tối (`stage_silent_update`):** Khi khởi động hoặc định kỳ 30 phút, DeskAura tự động kiểm tra và tải trước gói cập nhật mới về thư mục tạm (`%TEMP%\DeskAura_Updates` trên Windows / `/tmp/DeskAura_Updates` trên macOS) mà **tuyệt đối không bật hộp thoại popup chặn màn hình**.
- **Điểm neo thị giác tinh tế (`Subtle Visual Nudge`):** Khi bản cập nhật đã tải xong, chỉ xuất hiện một chấm tròn xanh ngọc nhỏ trên biểu tượng `⚙️ Cài Đặt` kèm nút thu gọn `Khởi động lại (v1.2.4)` trên thanh tiêu đề để người dùng chủ động áp dụng bất cứ lúc nào.
- **Tự động dọn rác 2 pha (`cleanup_old_update_files`):** Tự động xóa sạch các gói cài đặt `.exe` / `.dmg` cũ trong thư mục tạm ngay khi khởi chạy phiên bản mới, tiết kiệm 100% dung lượng ổ cứng.

### 2. 🔐 Mã Hóa Lịch Sử Sức Khỏe Gắn Phần Cứng (`Hardware-Bound Local Storage Encryption enc:v1:`)
- Toàn bộ dữ liệu nhạy cảm lưu trên máy tính (`mamxanh_daily_stats_v1`, `deskaura_weekly_history_v1`, `mamxanh_standup_v1`, `mamxanh_hydration_v1`, `mamxanh_voice_v1`) được mã hóa tự động theo chuẩn **`enc:v1:<base64>`** dẫn xuất từ khóa định danh phần cứng (`Hardware ID`).
- Hỗ trợ **di trú tự động không mất dữ liệu (`Zero-Data-Loss Migration`)** từ định dạng JSON cũ sang định dạng mã hóa mới.

### 3. ⚡ Đồng Bộ Đa Thiết Bị Lai 4 Tầng (`4-Tier Hybrid Sync` & `Zero-Config LAN UDP <5ms`)
- **Tầng 1 (LAN UDP Broadcast `<5ms`):** Các máy Windows và MacBook cùng mạng Wi-Fi/LAN tự động đồng bộ tức thì lượng nước vừa uống và bộ đếm đứng dậy qua cổng UDP `45888` mà không cần cấu hình IP.
- **Tầng 2 & 3 (Firebase Firestore Cloud Sync & 6-Digit Aura Code):** Đồng bộ xuyên mạng Internet giữa PC, Mac và iPhone/iPad với thuật toán hợp nhất chống trùng lặp (`Deduplicated Log Union`).
- **Tầng 4 (Encrypted Offline Queue):** Lưu trữ an toàn khi mất mạng và tự động đồng bộ bù khi có kết nối trở lại.

### 4. 💧 Biểu Tượng Khay Hệ Thống Hình Giọt Nước Dâng Theo % (`Liquid-Fill Water Droplet Tray Icon`)
- Thay thế chấm tròn đơn điệu trên System Tray / Menu Bar bằng **biểu tượng Giọt Nước nghệ thuật** có mực nước bên trong tự động dâng cao (`0% -> 100%`) và đổi màu thông minh theo trạng thái cơ thể (*Xanh lam mát mẻ* khi đang nạp nước, *Xanh ngọc lục bảo* khi đạt 100%, *Vàng hổ phách* khi ngồi lâu quá 45 phút).

### 5. 🧠 Nhận Biết Ngữ Cảnh Thông Minh & Ma Trận Âm Lượng Theo Giờ (`Smart Context & Volume Matrix`)
- **Tự động đặt lại sau 3 phút rời máy (`3-Minute Natural Idle Reset`):** Rời bàn làm việc $\ge 3$ phút tự động tính là 1 lần đứng dậy và đặt lại bộ đếm 60 phút.
- **Bảo vệ giấc ngủ máy & Họp toàn màn hình (`OS Sleep/Hibernate & Fullscreen Guard`):** Tự động nhận biết khi gập màn hình laptop (`Sleep`) hoặc khi đang thuyết trình / họp toàn màn hình để hoãn lời nhắc lịch sự.
- **Ma trận âm lượng theo khung giờ & Giảm chấn âm thanh:** Tự động điều chỉnh âm lượng lời nhắc dịu nhẹ vào sáng sớm / đêm khuya (`22h – 06h`) và tích hợp chế độ cây ngủ **Night-Owl (`💤 23h – 04h`)**.
- **Tự động ẩn nút Hoàn tác nước sau 5 giây (`Auto-Hiding 5s Undo`):** Giao diện sạch sẽ tuyệt đối, nút `Hoàn tác +XXml (5s)` chỉ xuất hiện trong 5 giây sau khi bấm cộng nước rồi tự ẩn hoàn toàn.

### 6. 🌐 Song Ngữ Toàn Diện (Tiếng Việt & English) — Tự Động Chuyển Đổi Nền Tảng Nhạc
- **Giao diện Tiếng Việt (`🇻🇳`):** Tích hợp **Trung Tâm Điều Khiển Zing MP3 Nâng Cao** (chạy ngầm + lọc quảng cáo 3 lớp `Smart Audio Ad-Guard`) + Bộ trộn 10 lớp âm thanh thiên nhiên & sóng não Offline.
- **Giao diện Tiếng Anh (`🇬🇧`):** Tự động chuyển đổi sang **Global Lofi & SoundCloud Chill Hub** (*Lofi Girl, Chillhop Music, SoundCloud Ambient, Poolsuite FM, SomaFM Groove Salad*) cùng thanh điều hướng tối ưu chống tràn chữ.

---

## 🇬🇧 PART 2: WHAT'S NEW IN DESKAURA v1.2.4 (ENGLISH RELEASE NOTES)

### 1. 🤫 Silent Background OTA Updates & Two-Phase Garbage Collection
- **Zero-Popup Background Staging (`stage_silent_update`):** Automatically checks and pre-downloads updates in the background without interrupting your deep work flow with modal popups.
- **Subtle Visual Nudge:** Displays a gentle emerald indicator dot on the Settings icon and a compact `Restart to update` pill in the top header when ready.
- **Automatic Cleanup (`cleanup_old_update_files`):** Automatically removes outdated installer binaries from the OS temporary folder after upgrading.

### 2. 🔐 Hardware-Bound Local Storage Encryption (`enc:v1:`)
- Encrypts local wellness history and settings on disk using a key derived from your machine's unique Hardware ID, with seamless zero-data-loss migration.

### 3. ⚡ 4-Tier Hybrid Multi-Device Sync (Zero-Config LAN UDP `<5ms` + Cloud Firestore)
- Instant `<5ms` peer-to-peer hydration and timer synchronization across Windows & macOS devices on the same Wi-Fi/LAN via UDP port `45888`, paired with Firebase Cloud Sync and 6-character Aura Codes.

### 4. 💧 Dynamic Liquid-Fill Water Droplet System Tray Icon
- Renders a live anti-aliased water droplet in the macOS Menu Bar / Windows System Tray whose internal liquid level rises from `0%` to `100%` and shifts colors based on your hydration and posture status.

### 5. 🌐 100% Bilingual Experience (Vietnamese & English) with Smart Music Hub Switching
- Switching to **English (`🇬🇧`)** transforms the music studio into the **Global Lofi & SoundCloud Chill Hub** alongside the 10-layer offline nature & binaural soundscape mixer.
- Smart Virtual Desk Plant with **100% Hydrated Guard** (never shows thirsty quotes once your daily water goal reaches 100%) and **Night-Owl Sleeping Mode (`💤 23:00 – 04:00`)**.

---

## 📸 Giao Diện Thực Tế v1.2.4 (Tiếng Việt & English) / v1.2.4 Screenshots

### 🇻🇳 Tổng Quan Sức Khỏe & Phòng Thu Zing MP3 (Vietnamese Edition)
![DeskAura v1.2.4 Dashboard VI](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/01-dashboard-vi.png)
![DeskAura v1.2.4 Sound Studio VI](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/02-sound-studio.png)

### 🇬🇧 Wellness Dashboard & Global Lofi / SoundCloud Hub (English Edition)
![DeskAura v1.2.4 Dashboard EN](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/01-dashboard-en.png)
![DeskAura v1.2.4 Sound Studio EN](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/02-sound-studio-en.png)

