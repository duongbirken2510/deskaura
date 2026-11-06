# 🌱 DeskAura v1.2.7 — Smart Multi-Device Routing & 20-20-20 Eye Care Update (Tiếng Việt & English)

> **What's New in v1.2.7** | **Tổng hợp các nâng cấp mới trong phiên bản v1.2.7**

[![Watch Official Cinematic TVC](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/media/deskaura_tvc_preview.gif)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_tvc_intro.mp4)

🌟 **[▶️ Xem Video TVC Văn Phòng Mỏi Mắt (`deskaura_tvc_eyecare.mp4`)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_tvc_eyecare.mp4)** • **[🎬 Xem Video TVC Cú Đêm IT (`deskaura_tvc_intro.mp4`)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_tvc_intro.mp4)** • **[💻 Xem Video Demo Giao Diện 45s (`deskaura_demo_45s.mp4`)](https://github.com/duongbirken2510/deskaura/raw/main/docs/media/deskaura_demo_45s.mp4)**

---

## 🇻🇳 PHẦN 1: CÁC NÂNG CẤP & SỬA LỖI TRONG BẢN v1.2.7

### 1. 🎯 Định Tuyến Thông Báo Duy Nhất Trên Máy Đang Sử Dụng (`Single-Leader Active Device Routing`)
- Khi đồng bộ nhiều máy tính (ví dụ: **Máy 1** đang làm việc, **Máy 2** để không hoặc cả 2 máy cùng bật), DeskAura tự động xác định **duy nhất 1 máy có thao tác chuột/bàn phím gần nhất (`<= 4 giây`)** làm **Máy Chính (`Primary Active Leader`)**.
- Chỉ **Máy Chính** mới hiển thị bảng thông báo, phát giọng nhắc và cộng thống kê (`focusMinutes`, `+1 lần nghỉ`); các máy phụ tự động xoay vòng đồng hồ trong im lặng và tự tắt mọi thông báo cũ (tránh kêu đồng thời trên 2 máy hoặc cộng gấp đôi thống kê).

### 2. 👀 Hoàn Thiện Chu Kỳ Thông Báo Nghỉ Mắt 20-20-20 & Hoãn Độc Lập (`Independent Eye Care Snooze`)
- **Tự động phát thông báo 20-20-20 chuẩn xác:** Khi đồng hồ Nghỉ mắt 20 phút đếm về `00:00`, DeskAura kích hoạt đồng thời hiệu ứng dịu sáng màn hình 20 giây (`Breathing Dimmer`), đổi màu biểu tượng khay hệ thống sang vàng hổ phách và hiển thị hướng dẫn nghỉ mắt 20 giây.
- **Độc lập bộ đếm Đứng dậy & Nghỉ mắt:** Trong lúc bảng **Nghỉ mắt 20-20-20** đang mở hoặc khi bấm **Hoãn 5 phút / Đang họp (Hoãn 15p)** ở màn hình Nghỉ mắt, chỉ bộ đếm **Nghỉ mắt** được đặt lại, còn bộ đếm **Đứng dậy** và **Uống nước** vẫn tiếp tục đếm ngược bình thường mà không bị đóng băng hay quay lùi.
- **Chống tự đóng bảng sớm do xung đồng bộ dội lại:** Bổ sung khóa thời gian `lastLocalBreakStartedAtRef` để gói phản hồi Cloud/LAN không bao giờ tự đóng bảng thông báo vừa mới mở trên máy đang dùng.

### 3. 🔇 Ngắt Âm Thanh Tức Thì Khi Bấm Tạm Hoãn / Bỏ Qua & Kiểm Tra Thao Tác Thực
- **Ngắt giọng đọc tức thì (`0ms`):** Ngay khi bấm **Hoãn 5 phút**, **Đang họp (Hoãn 15p)** hoặc **Bỏ qua**, DeskAura lập tức ngắt giọng đọc nhắc nhở (`stopVoiceReminder`) và khôi phục âm lượng nhạc nền.
- **Chống cộng ảo khi lờ thông báo:** Nếu bảng nhắc Đứng dậy tự đếm hết 3 phút mà người dùng vẫn đang tiếp tục gõ phím/di chuột làm việc (lờ thông báo đi), ứng dụng tự đóng bảng và đặt lại chu kỳ mới mà **không** cộng ảo `+1 lần đứng dậy`.

---

## 🇬🇧 PART 1: NEW IMPROVEMENTS & FIXES IN v1.2.7

### 1. 🎯 Single-Leader Active Device Notification Routing
- Across multiple synced computers, DeskAura automatically elects **only the single machine with the most recent mouse/keyboard input (`<= 4s`)** as the **Primary Active Leader**.
- Only the active machine displays break reminders, plays voice prompts, and increments daily stats (`focusMinutes`, `+1 break credit`), while idle secondary machines roll over silently and auto-dismiss stale banners.

### 2. 👀 Complete 20-20-20 Eye Break Notification & Independent Snooze
- **Full 20-20-20 Notification Flow:** At every 20-minute mark, DeskAura activates the 20s Breathing Screen Dimmer, turns the tray droplet gold, and triggers the 20-second guided eye rest prompt.
- **Independent Standup & Eye Timers:** Snoozing, skipping, or completing an **Eye Break** now updates **only** the Eye Break timer while the **Standup** and **Hydration** timers continue counting down uninterrupted in the background.
- **Echo-Safe Popup Guard:** Added `lastLocalBreakStartedAtRef` protection so echoed Cloud/LAN packets never prematurely close a newly opened break modal.

### 3. 🔇 Instant Voice Cut-Off on Snooze/Skip & Active-Input Verification
- **Instant Audio Stop (`0ms`):** Clicking **Snooze 5m**, **In Meeting (15m)**, or **Skip** immediately stops any active voice prompt (`stopVoiceReminder`) and restores background audio volume.
- **Honest Break Credit:** If a 3-minute Standup modal counts down to `00:00` while the user ignored it and kept typing/moving the mouse, DeskAura resets the cycle without falsely crediting `+1 standup`.

---

## 🇻🇳 PHẦN 2: CÁC TÍNH NĂNG NỀN TẢNG TỪ v1.2.5 – v1.2.6

1. 🛡️ **Bảo Vệ Mắt & Lọc Ánh Sáng Xanh Phần Cứng (`Aura Eye-Shield`):** 3 chế độ **☀️ Tự động theo giờ / 🌿 Văn phòng / 🌙 Đêm OT** can thiệp trực tiếp `Hardware Gamma LUT`, `0% GPU/RAM`.
2. 😌 **Màn Hình "Thở" Dịu Sáng 20 Giây (`Breathing Dimmer`):** Fade in-out 1.5 giây mượt mà mỗi chu kỳ nghỉ mắt 20-20-20.
3. 🧘 **Tự Động Ghi Nhận `+1 Lần Đứng Dậy` (`Smart 180s Idle Break Credit`):** Cảm biến tự cộng thống kê khi rời máy đủ 3 phút.
4. 🐧 **Hỗ Trợ Đa Nền Tảng:** **Windows (`.exe`)**, **macOS Apple Silicon (`.dmg`)** và **Linux (`.deb` & `.AppImage`)**.

---

## 📸 Giao Diện Thực Tế / Screenshots

### 🇻🇳 Tổng Quan Sức Khỏe & Phòng Thu Zing MP3 (Vietnamese Edition)
![DeskAura v1.2.7 Dashboard VI](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/01-dashboard-vi.png)
![DeskAura v1.2.7 Sound Studio VI](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/02-sound-studio.png)

### 🇬🇧 Wellness Dashboard & Global Lofi / SoundCloud Hub (English Edition)
![DeskAura v1.2.7 Dashboard EN](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/01-dashboard-en.png)
![DeskAura v1.2.7 Sound Studio EN](https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/screenshots/02-sound-studio-en.png)

---

## 👨‍💻 Tác Giả & Liên Hệ / Author & Contact

| 🇻🇳 Lời nhắn từ Tác giả | 🇬🇧 Note from the Author |
| :--- | :--- |
| **DeskAura** là dự án tâm huyết được mình phát triển và chia sẻ **hoàn toàn miễn phí** cho cộng đồng, với mong muốn giúp anh chị em văn phòng & lập trình viên bảo vệ cột sống, đôi mắt và giữ trọn sự tĩnh lặng khi làm việc sâu (*Deep Work*).<br><br>Nếu ứng dụng hữu ích với bạn, hãy tặng dự án một ngôi sao (**⭐ Star**) trên GitHub hoặc ghé thăm website của mình để kết nối và góp ý thêm nhé! | **DeskAura** is a passion project built and shared **100% free and open-source**, designed to help office workers, creators, and developers protect their spine, eyesight, and deep-work focus without intrusive interruptions.<br><br>If you find DeskAura helpful, please consider giving this repo a **⭐ Star** on GitHub or visiting my website to connect and share your feedback! |

<div align="center">

**🌐 Website & Liên hệ / Official Website:** [**https://duongbirken.deta.vn**](https://duongbirken.deta.vn)  
**🐞 Báo lỗi & Góp ý / Issues & Feedback:** [**GitHub Issues**](https://github.com/duongbirken2510/deskaura/issues)

</div>
