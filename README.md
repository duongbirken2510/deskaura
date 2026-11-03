<div align="center">

<img src="./public/app-icon.svg" alt="DeskAura Logo" width="88" height="88" />

# 🌱 DeskAura

### **Smart Office Wellness & Ambient Focus Companion for Windows**
*Trợ Lý Sức Khỏe Văn Phòng & Không Gian Nhạc Nền Chữa Lành (Tiếng Việt & English)*

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11%20(x64)-0078D6?style=for-the-badge&logo=windows)](https://github.com/duongbirken2510/deskaura/releases/tag/v1.0.0)
[![Built with Tauri v2](https://img.shields.io/badge/Tauri%20v2-Rust%20%2B%20React-24C8DB?style=for-the-badge&logo=tauri)](https://tauri.app/)
[![Languages](https://img.shields.io/badge/Language-Ti%E1%BA%BFng%20Vi%E1%BB%87t%20%7C%20English-10B981?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](./LICENSE)
[![Download Release](https://img.shields.io/badge/Download-v1.0.0%20(.exe)-059669?style=for-the-badge&logo=github)](https://github.com/duongbirken2510/deskaura/releases/tag/v1.0.0)

[**📥 Tải Bộ Cài Đặt Windows (`v1.0.0`)**](https://github.com/duongbirken2510/deskaura/releases/tag/v1.0.0) • [**✨ Tính Năng Nổi Bật**](#-tính-năng-nổi-bật--key-features) • [**📸 Ảnh Chụp Giao Diện**](#-ảnh-chụp-giao-diện--screenshots) • [**🚀 Hướng Dẫn Cài Đặt**](#-tải--cài-đặt-nhanh-trên-windows)

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
| 🧘 **Nhắc Đứng Dậy & Nghỉ Mắt 20-20-20** | • Tự động nhận diện thời gian rời máy (`Windows Idle Detection`) để tự đặt lại đồng hồ.<br>• Tự động hoãn lời nhắc khi bạn đang họp hoặc thuyết trình toàn màn hình (`Fullscreen Detection`).<br>• Hướng dẫn các bài tập giãn cơ cổ, vai gáy, lưng và thư giãn mắt 20 giây ngay tại bàn. |
| 💧 **Nhắc Uống Nước Thông Minh** | • Ghi nhận lượng nước 1-chạm (`+100ml`, `+200ml`, `+300ml`) trên giao diện hoặc ngay từ menu chuột phải dưới **System Tray**.<br>• Tự động gộp lời nhắc uống nước vào giờ nghỉ đứng dậy (`Combo Reminder`) để không làm gián đoạn sự tập trung.<br>• Nuôi dưỡng **Chậu cây DeskAura** nảy mầm và nở hoa khi bạn uống đủ nước. |
| 🎵 **Phòng Thu Nhạc Nền & Zing MP3 Ad-Guard** | • **10 lớp âm thanh Offline:** Mưa hiên nhà, Suối rừng, Sóng biển, Gió đồi thông, Lửa trại, Chuông xoay Tây Tạng (432Hz/528Hz), Sóng não Alpha (10Hz), Sóng não Theta (6Hz), Brown Noise & Pink Noise.<br>• **Zing MP3 Chạy Ngầm & Chống Quảng Cáo 3 Lớp:** Đóng cửa sổ (`X`) nhạc vẫn phát ngầm, điều khiển qua bài/tạm dừng/tắt hẳn ngay từ giao diện chính hoặc từ **Khay hệ thống (System Tray)**, tự động bỏ qua quảng cáo âm thanh.<br>• **6 Đài Radio Lofi & Ambient Quốc Tế:** SomaFM Groove Salad, Drone Zone, I Love Chillhop, Fluid, Deep Space One, Lush + Mở nhạc `.mp3/.wav` từ máy tính. |
| 🔊 **Giọng Nhắc AI (VI/EN) & WASAPI Audio Ducking** | • Bộ giọng đọc AI Offline MP3 tự nhiên bằng cả **Tiếng Việt** (*Nữ Dịu Dàng*, *Nam Trầm Ấm*) và **Tiếng Anh** (*English Neural Voice*).<br>• Can thiệp trực tiếp vào **Windows Core Audio API (WASAPI)** để hạ nhỏ âm lượng các ứng dụng khác (YouTube, Spotify, Chrome...) xuống `20%` trong vài giây đọc lời nhắc, sau đó khôi phục lại 100% mượt mà. |
| 🖥️ **Tích Hợp Sâu Hệ Điều Hành Windows** | • Thu gọn xuống **System Tray** khi bấm nút `X` để chạy ngầm siêu nhẹ (~15 MB RAM).<br>• Menu chuột phải tại System Tray hỗ trợ cả **Tiếng Việt & Tiếng Anh**, cho phép bật/tắt nhạc Zing MP3, qua bài, ghi nhận uống nước nhanh 1-click.<br>• Hỗ trợ **Tự khởi động cùng Windows (`Auto-start on Boot`)** qua Windows Registry. |

---

## 📥 Tải & Cài Đặt Nhanh Trên Windows

Bạn có thể tải trực tiếp tại mục [**Releases v1.0.0**](https://github.com/duongbirken2510/deskaura/releases/tag/v1.0.0) hoặc trong thư mục [`Release_Windows/`](./Release_Windows):

1. **[`DeskAura_1.0.0_x64-setup.exe`](https://github.com/duongbirken2510/deskaura/releases/download/v1.0.0/DeskAura_1.0.0_x64-setup.exe)** *(~2.9 MB)* — Bộ cài đặt chuẩn cho Windows 10/11 (Tự động tạo biểu tượng Desktop & Start Menu).
2. **[`DeskAura_Portable.exe`](https://github.com/duongbirken2510/deskaura/releases/download/v1.0.0/DeskAura_Portable.exe)** *(~10.8 MB)* — Bản chạy ngay lập tức (Portable), không cần cài đặt.

> 💡 **Lưu ý khi mở lần đầu trên Windows (Windows SmartScreen):**
> Do ứng dụng là dự án mã nguồn mở phát hành độc lập (chưa đăng ký chứng chỉ thương mại EV Code Signing của Microsoft), trong lần chạy đầu tiên Windows Defender có thể hiển thị hộp thoại màu xanh **"Windows protected your PC"**.
> 👉 Bạn chỉ cần bấm vào **`More info`** *(Thông tin thêm)* $\rightarrow$ chọn **`Run anyway`** *(Vẫn chạy)* để mở ứng dụng bình thường. Toàn bộ mã nguồn đều công khai và minh bạch 100% tại repository này.

---

## 🛠️ Phát Triển Từ Mã Nguồn / Build From Source

```powershell
# 1. Cài đặt thư viện phụ thuộc
npm install

# 2. Chạy ứng dụng ở chế độ phát triển (Desktop App)
npm run tauri dev

# 3. Đóng gói bộ cài đặt .exe chuẩn cho Windows
npm run tauri build -- --bundles nsis
```

---

## 📄 Giấy Phép / License

Dự án được phân phối dưới giấy phép mã nguồn mở [**MIT License**](./LICENSE).

