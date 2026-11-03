<div align="center">

<img src="./public/app-icon.svg" alt="DeskAura Logo" width="88" height="88" />

# 🌱 DeskAura

### **Smart Office Wellness & Ambient Focus Companion (Windows • macOS • iOS)**
*Trợ Lý Sức Khỏe Văn Phòng & Không Gian Nhạc Nền Chữa Lành (Tiếng Việt & English)*

[![Platform Windows](https://img.shields.io/badge/Platform-Windows%2010%2F11%20(x64)-0078D6?style=for-the-badge&logo=windows)](./Release_Windows)
[![Platform macOS](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon%20.dmg)-000000?style=for-the-badge&logo=apple)](./Release_macOS)
[![Built with Tauri v2](https://img.shields.io/badge/Tauri%20v2-Rust%20%2B%20React-24C8DB?style=for-the-badge&logo=tauri)](https://tauri.app/)
[![Languages](https://img.shields.io/badge/Language-Ti%E1%BA%BFng%20Vi%E1%BB%87t%20%7C%20English-10B981?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](./LICENSE)

[**📥 Tải Bản Windows (`.exe`)**](#-1-tải--cài-đặt-trên-windows-1011) • [**🍎 Tải Bản macOS (`.dmg`)**](#-2-tải--cài-đặt-trên-macos-macbook--imac) • [**📱 Hướng Dẫn Bản iOS / iPadOS**](#-3-cài-đặt--triển-khai-trên-ios--ipados-iphone--ipad) • [**✨ Tính Năng Nổi Bật**](#-tính-năng-nổi-bật--key-features)

</div>

---

## 📸 Ảnh Chụp Giao Diện / Screenshots

### 1. Tổng Quan Sức Khỏe & Chậu Cây Bàn Làm Việc (`Wellness Dashboard`)
Theo dõi trực quan bộ đếm **Đứng dậy vận động**, **Nghỉ mắt 20-20-20**, **Lượng nước uống trong ngày** và chăm sóc **Chậu cây DeskAura** lớn lên theo thói quen tốt của bạn.

![DeskAura Wellness Dashboard](./docs/screenshots/01-dashboard-vi.png)

---

### 2. Phòng Thu Âm Thanh Chữa Lành & Zing MP3 Chống Quảng Cáo (`Ambient Sound Studio & Zing MP3 Ad-Guard`)
Hòa trộn **10 lớp âm thanh thiên nhiên & sóng não Offline** cùng trình phát **Zing MP3 chạy ngầm** tích hợp **Bộ lọc Chống Nhạc Quảng Cáo 3 Lớp (`Smart Audio Ad-Guard`)** và **6 đài Radio Lofi quốc tế**.

![DeskAura Sound Studio & Zing MP3](./docs/screenshots/02-sound-studio.png)

---

### 3. Màn Hình Nhắc Đứng Dậy & Hướng Dẫn Giãn Cơ Tại Bàn (`Guided Stretch & Hydration Break`)
Màn hình nhắc nghỉ ngơi dịu mắt với hình minh họa bài tập cổ - vai - gáy - cổ tay trực quan, kết hợp nút ghi nhận uống nước nhanh `+200ml` và nút hoãn thông minh khi đang họp.

![DeskAura Guided Break Overlay](./docs/screenshots/03-break-overlay.png)

---

### 4. Song Ngữ Việt - Anh & Tự Động Giảm Âm Lượng Ứng Dụng Khác (`Bilingual UI & Windows WASAPI Audio Ducking`)
Chuyển đổi tức thì giữa **Tiếng Việt (`🇻🇳 VI`)** và **Tiếng Anh (`🇬🇧 EN`)** cho toàn bộ giao diện, menu Khay hệ thống (`System Tray`) và giọng đọc AI nhắc nhở. Tích hợp công nghệ **Windows WASAPI Audio Ducking** tự động hạ nhỏ âm lượng YouTube/Spotify/Trình duyệt xuống 20% khi phát lời nhắc.

![DeskAura English UI & WASAPI Audio Ducking Settings](./docs/screenshots/04-settings-en.png)

---

## ✨ Tính Năng Nổi Bật / Key Features

| Trụ cột | Chi tiết tính năng |
| :--- | :--- |
| 🧘 **Nhắc Đứng Dậy & Nghỉ Mắt 20-20-20** | • Tự động nhận diện thời gian rời máy (`Idle Detection` trên Windows & macOS `IOHIDSystem`) để tự đặt lại đồng hồ.<br>• Tự động hoãn lời nhắc khi bạn đang họp hoặc thuyết trình toàn màn hình (`Fullscreen Detection`).<br>• **Hoạt ảnh hướng dẫn giãn cơ đa khớp 60fps** (cổ, vai gáy, cổ tay chống RSI, cột sống và thư giãn mắt 20s) kèm huy hiệu nhịp tập trực tiếp. |
| 📊 **Hệ Thống Biểu Đồ Mebius Analytics** | • **Vòng Đếm Đồng Tâm Kép (`Dual Activity Rings`):** Theo dõi song song chu kỳ Đứng dậy và Nghỉ mắt 20-20-20.<br>• **Biểu Đồ Nước Theo Giờ & Lịch Sử 7 Ngày:** Phân tích lượng nước theo khung giờ (`08h` $\rightarrow$ `18h+`) và so sánh Nước uống + Vận động suốt 7 ngày.<br>• **Nhịp Tập Trung Sâu (`Deep Focus Sparkline`) & Điểm `Aura Score (0-100)`:** Quy đổi số chu kỳ Pomodoro 🍅, chấm điểm cân bằng sức khỏe và theo dõi chuỗi ngày liên tiếp (`Habit Streak`). |
| 💧 **Nhắc Uống Nước Thông Minh** | • Ghi nhận lượng nước 1-chạm (`+100ml`, `+200ml`, `+300ml`) trên giao diện hoặc ngay từ menu chuột phải dưới **System Tray**.<br>• Tự động gộp lời nhắc uống nước vào giờ nghỉ đứng dậy (`Combo Reminder`) để không làm gián đoạn sự tập trung.<br>• Nuôi dưỡng **Chậu cây DeskAura** nảy mầm và nở hoa khi bạn uống đủ nước. |
| 🎵 **Phòng Thu Nhạc Nền & Zing MP3 Ad-Guard** | • **10 lớp âm thanh Offline:** Mưa hiên nhà, Suối rừng, Sóng biển, Gió đồi thông, Lửa trại, Chuông xoay Tây Tạng (432Hz/528Hz), Sóng não Alpha (10Hz), Sóng não Theta (6Hz), Brown Noise & Pink Noise.<br>• **Zing MP3 Chạy Ngầm & Chống Quảng Cáo 3 Lớp:** Đóng cửa sổ (`X`) nhạc vẫn phát ngầm, điều khiển qua bài/tạm dừng/tắt hẳn ngay từ giao diện chính hoặc từ **Khay hệ thống (System Tray)**, tự động bỏ qua quảng cáo âm thanh.<br>• **6 Đài Radio Lofi & Ambient Quốc Tế:** SomaFM Groove Salad, Drone Zone, I Love Chillhop, Fluid, Deep Space One, Lush + Mở nhạc `.mp3/.wav` từ máy tính. |
| 🔊 **Giọng Nhắc AI (VI/EN) & WASAPI Audio Ducking** | • Bộ giọng đọc AI Offline MP3 tự nhiên bằng cả **Tiếng Việt** (*Nữ Dịu Dàng*, *Nam Trầm Ấm*) và **Tiếng Anh** (*English Neural Voice*).<br>• Can thiệp trực tiếp vào **Windows Core Audio API (WASAPI)** để hạ nhỏ âm lượng các ứng dụng khác (YouTube, Spotify, Chrome...) xuống `20%` trong vài giây đọc lời nhắc, sau đó khôi phục lại 100% mượt mà. |
| 🖥️ **Tích Hợp Sâu Hệ Điều Hành (Windows & macOS)** | • Thu gọn xuống **System Tray / Menu Bar** khi bấm nút `X` để chạy ngầm siêu nhẹ (~15 MB RAM).<br>• Menu chuột phải tại System Tray hỗ trợ cả **Tiếng Việt & Tiếng Anh**, cho phép bật/tắt nhạc Zing MP3, qua bài, ghi nhận uống nước nhanh 1-click.<br>• Hỗ trợ **Tự khởi động cùng máy (`Auto-start on Boot`)** qua Windows Registry và macOS `LaunchAgents`. |

---

## 📥 Hướng Dẫn Tải & Cài Đặt (Windows • macOS • iOS)

### 🪟 1. Tải & Cài Đặt Trên Windows 10/11
Bạn có thể tải trực tiếp trong thư mục [`Release_Windows/`](./Release_Windows) hoặc tại mục [**Releases**](https://github.com/duongbirken2510/deskaura/releases):

1. **[`DeskAura_1.0.0_x64-setup.exe`](./Release_Windows/DeskAura_1.0.0_x64-setup.exe)** *(~2.9 MB)* — Bộ cài đặt chuẩn cho Windows 10/11 (Tự động tạo biểu tượng Desktop & Start Menu).
2. **[`DeskAura_Portable.exe`](./Release_Windows/DeskAura_Portable.exe)** *(~10.8 MB)* — Bản chạy ngay lập tức (Portable), không cần cài đặt.

> 💡 **Lưu ý khi mở lần đầu trên Windows (Windows SmartScreen):**
> Do ứng dụng là dự án mã nguồn mở phát hành độc lập (chưa đăng ký chứng chỉ thương mại EV Code Signing của Microsoft), trong lần chạy đầu tiên Windows Defender có thể hiển thị hộp thoại màu xanh **"Windows protected your PC"**.
> 👉 Bạn chỉ cần bấm vào **`More info`** *(Thông tin thêm)* $\rightarrow$ chọn **`Run anyway`** *(Vẫn chạy)* để mở ứng dụng bình thường.

---

### 🍎 2. Tải & Cài Đặt Trên macOS (MacBook / iMac)
Bộ cài đặt dành cho máy Mac (Apple Silicon M1/M2/M3/M4) nằm sẵn trong thư mục [`Release_macOS/`](./Release_macOS):

1. Tải và mở file **[`DeskAura_1.0.0_aarch64.dmg`](./Release_macOS/DeskAura_1.0.0_aarch64.dmg)** *(~4.3 MB)*.
2. Kéo biểu tượng **`DeskAura`** thả vào thư mục **`Applications`**.

> 💡 **Lưu ý khi mở lần đầu trên máy MacBook khác (macOS Gatekeeper):**
> Vì ứng dụng là bản phân phối mã nguồn mở độc lập (chưa qua cổng công chứng trả phí Apple Notarization), khi tải qua mạng về máy Mac mới, macOS có thể hiển thị cảnh báo chưa xác minh nhà phát triển hoặc báo *"DeskAura is damaged and can't be opened"*. Bạn chỉ cần thực hiện **1 trong 2 cách sau (chỉ làm 1 lần duy nhất khi mới cài)**:
> - **Cách 1 (Nhanh nhất bằng Terminal):** Mở **Terminal** và chạy lệnh gỡ cờ cách ly cho ứng dụng:
>   ```bash
>   xattr -cr /Applications/DeskAura.app
>   ```
> - **Cách 2 (Trong Cài đặt hệ thống):** Mở **System Settings (Cài đặt hệ thống)** $\rightarrow$ **Privacy & Security (Quyền riêng tư & Bảo mật)** $\rightarrow$ kéo xuống dưới cùng bấm **`Open Anyway` (Vẫn mở)**.

---

### 📱 3. Cài Đặt & Triển Khai Trên iOS / iPadOS (iPhone & iPad)
**DeskAura** được xây dựng trên nền tảng **Tauri v2 + React Responsive Bento UI**, hỗ trợ triển khai lên iPhone / iPad theo **2 phương thức**:

#### Phương thức A: Dùng ngay dạng Ứng dụng Web Độc Lập (PWA — Không cần cáp hay Xcode)
1. Trên máy tính cùng mạng Wi-Fi, chạy máy chủ giao diện:
   ```bash
   npm run dev -- --host
   ```
2. Mở trình duyệt **Safari** trên iPhone hoặc iPad, truy cập địa chỉ IP hiển thị trên màn hình (ví dụ: `http://192.168.1.x:1420`).
3. Bấm nút **Chia sẻ (Share)** ở thanh dưới cùng Safari $\rightarrow$ chọn **`Thêm vào Màn hình chính` (`Add to Home Screen`)** $\rightarrow$ bấm **Thêm (`Add`)**.
4. Biểu tượng **DeskAura** sẽ xuất hiện ngay trên màn hình chính iOS như một ứng dụng độc lập, đầy đủ bộ đếm nhắc nhở, biểu đồ Mebius, hoạt ảnh bài tập và bộ trộn âm thanh chữa lành Offline.

#### Phương thức B: Biên dịch gói cài đặt iOS Native (`.ipa`) qua Xcode & Tauri v2 Mobile
Nếu bạn có máy Mac cài sẵn **Xcode** và tài khoản Apple ID cá nhân (Free Provisioning):
```bash
# 1. Khởi tạo dự án Xcode cho iOS (chỉ chạy lần đầu)
npm run tauri ios init

# 2. Chạy thử trực tiếp lên iPhone thật hoặc iOS Simulator
npm run tauri ios dev

# 3. Xuất gói cài đặt .ipa qua Xcode Archive
npm run tauri ios build
```
> 📌 *Lưu ý trên iOS khi cài qua Apple ID cá nhân:* Trên iPhone, vào **Cài đặt (`Settings`)** $\rightarrow$ **Cài đặt chung (`General`)** $\rightarrow$ **Quản lý VPN & Thiết bị (`VPN & Device Management`)** $\rightarrow$ chọn email Apple ID của bạn và bấm **Tin cậy (`Trust`)** để mở ứng dụng.

---

## 🛠️ Phát Triển Từ Mã Nguồn / Build From Source

```bash
# 1. Cài đặt thư viện phụ thuộc
npm install

# 2. Chạy ứng dụng ở chế độ phát triển (Desktop App)
npm run tauri dev

# 3. Đóng gói bộ cài đặt cho macOS (.app & .dmg)
npm run tauri build

# 4. Đóng gói bộ cài đặt .exe chuẩn cho Windows
npm run tauri build -- --bundles nsis
```

---

## 📄 Giấy Phép / License

Dự án được phân phối dưới giấy phép mã nguồn mở [**MIT License**](./LICENSE).

