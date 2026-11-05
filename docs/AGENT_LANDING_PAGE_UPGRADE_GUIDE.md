# 🚀 HƯỚNG DẪN DÀNH CHO AI AGENT: NÂNG CẤP HỆ THỐNG 3 LANDING PAGE DESKAURA TRÊN `duongbirken.deta.vn` (ASTRO v5)

> **Mục tiêu tài liệu:** Tài liệu này là bản thiết kế kỹ thuật & nội dung chi tiết (Blueprint) để AI Agent trên máy tính chứa mã nguồn **Website `duongbirken.deta.vn` (Astro v5.18.2)** thực hiện nâng cấp trang **`/deskaura`** hiện tại và triển khai mô hình **1 Trang Chủ Thương Hiệu (Brand Hub) + 2 Trang Đích Ngách Chạy Quảng Cáo (`/deskaura/van-phong` & `/deskaura/for-devs`)**.
>
> **Kho tài nguyên chuẩn đã có sẵn trong Repo này (`https://github.com/duongbirken2510/deskaura`):**
> - Bộ 3 file HTML mẫu hoàn chỉnh để tham chiếu trực tiếp:
>   1. `docs/index.html` *(Trang Chủ Tổng Quan — Brand Hub)*
>   2. `docs/van-phong/index.html` *(Trang Đích Ngách Dân Văn Phòng)*
>   3. `docs/for-devs/index.html` *(Trang Đích Ngách Lập Trình Viên / Cú Đêm)*
> - Bộ Media & Video TVC Điện Ảnh mới trong `docs/media/`:
>   - `docs/media/deskaura_tvc_eyecare.mp4` (`7.8 MB`, 1080p) & `deskaura_tvc_eyecare.gif` — **TVC #2: Chân dung Nữ Văn Phòng Mỏi Mắt (Quy tắc 20-20-20 & Outro Brand Card)**
>   - `docs/media/deskaura_tvc_intro.mp4` (`5.0 MB`, 1080p) & `deskaura_tvc_preview.gif` — **TVC #1: Chân dung Nam Lập Trình Viên Làm Đêm (Đã sửa chuẩn phụ đề `"DeskAura nhắc"`)**
>   - `docs/media/deskaura_demo_45s.mp4` (`3.1 MB`, 1080p60) — **Video Demo Trải Nghiệm Thực Tế 45 giây**
>   - `docs/media/deskaura_brand_banner.png` (`2048x1143`) & `deskaura_social_hero.jpg` — **Banner chuẩn OpenGraph / MXH**
>   - `docs/media/deskaura_logo_wordmark.svg` & `.png` — **Logo + Chữ DeskAura nền trong suốt**

---

## 📋 CÂU LỆNH MẪU (PROMPT) ĐỂ SẾP DÁN CHO AGENT Ở MÁY BÊN KIA

Sếp chỉ cần mở project web `duongbirken.deta.vn` trên máy kia và nhắn cho Agent câu sau:

```text
Hãy đọc file hướng dẫn tại https://raw.githubusercontent.com/duongbirken2510/deskaura/main/docs/AGENT_LANDING_PAGE_UPGRADE_GUIDE.md (hoặc kéo repo https://github.com/duongbirken2510/deskaura về) và thực hiện đầy đủ 4 bước nâng cấp hệ thống 3 Landing Page cho DeskAura (/deskaura, /deskaura/van-phong, /deskaura/for-devs) trên dự án Astro này. Giữ nguyên toàn bộ tính năng Post-Download Modal + mã QR SePay 15.000đ (AURAxxxxxx) đang hoạt động tốt.
```

---

## 🛠️ BƯỚC 1: ĐỒNG BỘ TƯ LIỆU MEDIA TỪ REPO `deskaura` SANG PROJECT ASTRO

Agent trên máy chạy project Astro `duongbirken.deta.vn` cần copy các file media mới từ `docs/media/` của repo `duongbirken2510/deskaura` vào thư mục `public/images/deskaura/` (hoặc `public/media/deskaura/`):

```bash
# Chạy tại thư mục gốc của project Astro (duongbirken.deta.vn)
git clone --depth 1 https://github.com/duongbirken2510/deskaura.git /tmp/deskaura-assets

mkdir -p public/images/deskaura public/videos/deskaura

# Copy bộ nhận diện thương hiệu & OpenGraph Banner
cp /tmp/deskaura-assets/docs/media/deskaura_brand_banner.png public/images/deskaura/
cp /tmp/deskaura-assets/docs/media/deskaura_social_hero.jpg public/images/deskaura/
cp /tmp/deskaura-assets/docs/media/deskaura_logo_wordmark.svg public/images/deskaura/
cp /tmp/deskaura-assets/docs/media/deskaura_logo_wordmark.png public/images/deskaura/

# Copy bộ 3 Video (TVC #1 Nam Coder, TVC #2 Nữ Văn Phòng, Demo 45s) + GIF Preview
cp /tmp/deskaura-assets/docs/media/deskaura_tvc_intro.mp4 public/videos/deskaura/
cp /tmp/deskaura-assets/docs/media/deskaura_tvc_eyecare.mp4 public/videos/deskaura/
cp /tmp/deskaura-assets/docs/media/deskaura_demo_45s.mp4 public/videos/deskaura/
cp /tmp/deskaura-assets/docs/media/deskaura_tvc_preview.gif public/images/deskaura/
cp /tmp/deskaura-assets/docs/media/deskaura_tvc_eyecare.gif public/images/deskaura/

rm -rf /tmp/deskaura-assets
```

---

## 🌟 BƯỚC 2: 5 NÂNG CẤP TRÊN TRANG CHỦ HIỆN TẠI (`/deskaura` — MAIN BRAND HUB)

> ⚠️ **QUY TẮC BẤT DI BẤT DỊCH:** Giữ nguyên 100% các thành phần đang hoạt động rất hiệu quả trên `https://duongbirken.deta.vn/deskaura`:
> 1. Hộp thoại Cảm ơn Hậu Tải Về (`#post-download-modal`) hướng dẫn mở khóa Windows SmartScreen / macOS Gatekeeper (`xattr -cr /Applications/DeskAura.app`) + **QR SePay 15.000đ (`AURAxxxxxx`)** kết nối `/api/sepay/webhook`.
> 2. Khu vực Demo 3 Tab (*Hoạt ảnh giãn cơ SVG*, *Nghe thử giọng nhắc giảm nhạc nền 20%*, *Uống nước nuôi cây*).
> 3. Phần giới thiệu Người xây dựng (*Lê Thái Bình Dương · Dương Birken · Stepwell Vietnam*).

### 2.1. Bổ sung thẻ SEO & OpenGraph vào `<head>` của trang `/deskaura`
Hiện tại trang `/deskaura` đang thiếu `og:title`, `og:image`, `twitter:card` và `canonical` (khiến chia sẻ link qua Zalo/Facebook bị trống ảnh bìa). Hãy thêm vào `<head>`:

```html
<link rel="canonical" href="https://duongbirken.deta.vn/deskaura" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://duongbirken.deta.vn/deskaura" />
<meta property="og:title" content="DeskAura · Bạn Cứ Tập Trung Chạy Deadline. Sức Khỏe Hãy Để DeskAura Lo." />
<meta property="og:description" content="Trợ lý sức khỏe bàn làm việc & nhạc nền chữa lành: Nhắc nghỉ mắt 20-20-20, giãn cơ cổ vai gáy, uống nước nuôi cây & âm thanh tập trung miễn phí 100%." />
<meta property="og:image" content="https://duongbirken.deta.vn/images/deskaura/deskaura_brand_banner.png" />
<meta property="og:image:width" content="2048" />
<meta property="og:image:height" content="1143" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="DeskAura · Trợ lý sức khỏe bàn làm việc & nhạc nền chữa lành" />
<meta name="twitter:image" content="https://duongbirken.deta.vn/images/deskaura/deskaura_brand_banner.png" />
```

### 2.2. Thêm Thanh Chuyển Hướng Ngách (Niche Funnel Switcher) ở đầu trang
Thêm thanh điều hướng gọn gàng để người dùng tự chọn đúng giao diện chuyên biệt của họ:
- `☀️ Trang Chủ Tổng Quan (/deskaura)` *(Active)*
- `🏥 Chuyên Trang Dân Văn Phòng (/deskaura/van-phong)`
- `🌙 Chuyên Trang Dev & Cú Đêm (/deskaura/for-devs)`

### 2.3. Tự động nhận diện Hệ điều hành (Auto-OS Detection) cho cụm nút Tải ở Hero
Hiện tại nút Windows đang cố định nằm trên nút Mac. Thêm đoạn script nhỏ tự động kiểm tra `navigator.userAgent`:
- Nếu người dùng vào bằng **macOS**: Đưa nút `a[data-dl-os="mac"]` lên vị trí đầu tiên (hoặc áp style nút chính nổi bật nhất) để người dùng Mac bấm tải `.dmg` ngay lập tức.
- Nếu người dùng vào bằng **Windows**: Giữ nút `a[data-dl-os="win"]` ở vị trí đầu tiên.
- **Lưu ý**: Giữ nguyên thuộc tính `data-dl-os="win"` và `data-dl-os="mac"` để sự kiện mở `#post-download-modal` hoạt động bình thường.

### 2.4. Nhúng Khu Vực "Rạp Chiếu Đôi TVC Điện Ảnh & Trải Nghiệm Thực Tế" (Ngay dưới Hero)
Thêm section trình chiếu video với 3 nút bấm chuyển tab mượt mà (hỗ trợ song ngữ `VI`/`EN` theo `data-lang` của `#deskaura-root`):
1. **Tab 1 (Mặc định):** `👁️ TVC Dân Văn Phòng: Đôi Mắt & Cột Sống (20s)` $\rightarrow$ phát `/videos/deskaura/deskaura_tvc_eyecare.mp4`
2. **Tab 2:** `🎬 TVC Lập Trình Viên: Xoa Dịu Đêm OT (18s)` $\rightarrow$ phát `/videos/deskaura/deskaura_tvc_intro.mp4`
3. **Tab 3:** `💻 Trải Nghiệm Giao Diện Thực Tế (45s)` $\rightarrow$ phát `/videos/deskaura/deskaura_demo_45s.mp4`
- Có thuộc tính `poster="/images/deskaura/deskaura_social_hero.jpg"`, `autoplay muted playsinline loop controls`, kèm nút bấm **`🔊 Bật âm thanh TVC`** ngay bên dưới.

### 2.5. Sửa lỗi `.reveal-item` ở Footer `#ket-noi` bị ẩn (`opacity: 0`)
Trong script `IntersectionObserver` của trang, đổi `rootMargin: '0px 0px -40px 0px'` thành `rootMargin: '0px 0px 80px 0px'` để phần Footer liên hệ luôn hiển thị mượt mà ngay khi cuộn gần tới đáy trang.

---

## 🏥 BƯỚC 3: TẠO TRANG ĐÍCH NGÁCH #1 — DÀNH CHO DÂN VĂN PHÒNG (`/deskaura/van-phong`)

- **Đường dẫn route trong Astro:** `src/pages/deskaura/van-phong.astro` (URL: `https://duongbirken.deta.vn/deskaura/van-phong`)
- **File HTML mẫu tham chiếu trực tiếp:** Xem toàn bộ mã nguồn và nội dung trong `docs/van-phong/index.html` của repo `deskaura`.
- **Mục tiêu & Tông màu:**
  - Dùng để hứng traffic từ quảng cáo **TVC #2 (`deskaura_tvc_eyecare.mp4` — Nữ văn phòng mỏi mắt)**.
  - Tông màu sáng, chuyên nghiệp, thanh khiết như một **"Phòng khám Sức khỏe Công sở Tĩnh lặng" (`Clinical Calm Teal #0d9488 & Pure White`)**.
- **Cấu trúc 6 phần bắt buộc:**
  1. **Hero Section ("Kê đơn"):**
     - Headline: **“Cứu lấy cột sống và đôi mắt của bạn trước khi quá muộn.”**
     - Nút CTA chính: **“✨ Trải nghiệm trợ lý sức khỏe miễn phí”** (Gắn `data-dl-os="win"` / `data-dl-os="mac"` để kích hoạt chung **Post-Download Modal + QR SePay 15.000đ**).
     - Khung Video bên phải phát mặc định `/videos/deskaura/deskaura_tvc_eyecare.mp4`.
  2. **Pain-Point Agitation (Kích thích nỗi đau lâm sàng sau 8 tiếng ngồi bàn giấy):**
     - **`-66%` tần suất chớp mắt** (từ 15 lần/phút xuống 5 lần/phút khi nhìn bảng tính Excel gây khô rát nhãn cầu, nhức hốc mắt).
     - **`27 kg` áp lực đè lên đốt sống cổ C4–C7** khi cúi nhìn màn hình góc 45°, gây thoái hóa đốt sống cổ, tê bì vai gáy.
     - **`1,200 ml` nước thiếu hụt mỗi ngày** trong phòng điều hòa lạnh gây đau đầu uể oải lúc 3 giờ chiều.
  3. **Core Solutions ("Đơn Kê 3 Liệu Pháp Tĩnh Lặng"):**
     - Chỉ tập trung sâu vào 3 tính năng vật lý (lướt qua phần âm nhạc):
       - *Liệu pháp 01:* Đếm ngược nghỉ mắt 20 giây chuẩn quy tắc 20-20-20.
       - *Liệu pháp 02:* Nhắc đổi tư thế êm ái & Giãn cơ kín đáo ngay tại ghế văn phòng.
       - *Liệu pháp 03:* Nuôi cây cấp nước đều đặn theo giờ.
  4. **Before / After Comparison:**
     - So sánh sự phiền toái, réo chuông giật mình của *Báo thức điện thoại / App kiểu cũ* với *Sự tĩnh lặng, tinh tế của DeskAura ở góc màn hình*.
  5. **Monetization Hook — "Góc Ergonomic & Chăm Sóc Sức Khỏe Công Sở":**
     - Gợi ý khéo léo các sản phẩm công thái học giúp ngồi làm việc 8 tiếng êm ái:
       - **Dép Văn Phòng Đế Trấu Công Thái Học Thoáng Khí (Stepwell Vietnam / DetaUnisex — `https://deta.vn`)**: Nâng đỡ vòm bàn chân, thoáng khí chống hầm bí, kích thích lưu thông máu chân dưới gầm bàn văn phòng.
       - **Giá Đỡ Nâng Màn Hình & Laptop Ngang Tầm Mắt**: Giảm 60% áp lực cúi gập cổ C4–C7.
       - **Đệm Kê Cổ Tay Memory Foam & Gối Tựa Thắt Lưng**: Ngăn ngừa hội chứng ống cổ tay khi gõ bảng tính.
  6. **Final CTA + Hộp thoại Post-Download Modal & QR SePay 15K.**

---

## 🌙 BƯỚC 4: TẠO TRANG ĐÍCH NGÁCH #2 — DÀNH CHO LẬP TRÌNH VIÊN & CÚ ĐÊM (`/deskaura/for-devs`)

- **Đường dẫn route trong Astro:** `src/pages/deskaura/for-devs.astro` (URL: `https://duongbirken.deta.vn/deskaura/for-devs`)
- **File HTML mẫu tham chiếu trực tiếp:** Xem toàn bộ mã nguồn và nội dung trong `docs/for-devs/index.html` của repo `deskaura`.
- **Mục tiêu & Tông màu:**
  - Hứng traffic từ các group IT, diễn đàn công nghệ và **TVC #1 (`deskaura_tvc_intro.mp4` — Nam lập trình viên làm đêm)**.
  - Mặc định **Dark Mode (`#070b12` / `#0f172a`)** với ánh sáng **Emerald & Cyan Neon nhẹ**, kết hợp font `JetBrains Mono`.
- **Cấu trúc 5 phần bắt buộc:**
  1. **Hero Section ("Cảm xúc & Công nghệ"):**
     - Badge monospace: `RUST_TAURI_V2 • 3.2MB_INSTALLER • ~15MB_RAM • 0%_GPU_IDLE`
     - Headline: **“Giữ trọn dòng code. Xoa dịu những đêm OT.”**
     - Khung Video bên phải phát mặc định `/videos/deskaura/deskaura_tvc_intro.mp4`.
  2. **The Problem (Nỗi đau Geeks — Vì sao Dev cài app nhắc nghỉ ngơi rồi xóa sau 24h?):**
     - `23 mins` Context-Switching Penalty: Đang debug căng não bị popup khóa cứng màn hình làm bốc hơi toàn bộ biến trạng thái trong đầu.
     - `300+ MB` Electron Bloatware: Một chiếc đồng hồ đếm ngược nhưng ngốn RAM ngang container Docker.
     - `02:00 AM` OT Burnout: Code xuyên đêm khô mắt, cứng gáy, quên uống nước suốt 5 tiếng.
  3. **Core Solutions (Giải pháp Hacker):**
     - `01 // FLOW_STATE_PROTECTION`: Tự hoãn khi đang mở IDE/họp toàn màn hình, có chế độ chỉ nháy nhẹ icon dưới Taskbar và tự đặt lại chu kỳ khi rời máy quá 5 phút qua Native C FFI (`0` tiến trình con).
     - `02 // SMART_SOUND_HUB`: 10 lớp âm thanh tĩnh chạy 100% Offline không sợ VPN chặn IP + Global Lofi/SoundCloud + Zing MP3 chạy ngầm tự động bỏ qua quảng cáo + Giọng nhắc tự dịu nhạc nền xuống 20%.
     - `03 // MULTI_DEVICE_SYNC`: Đồng bộ bộ đếm sức khỏe thời gian thực giữa PC ở công ty và MacBook ở nhà.
  4. **Geeky Specs (Bảng Terminal Benchmark so sánh trực diện DeskAura `Tauri v2 + Rust` với `Electron`):**
     - Bộ cài siêu nhẹ (`3.2 MB` Windows `.exe` / `4.8 MB` macOS `.dmg` + Bản `DeskAura_Portable.exe` chạy ngay không cần cài).
     - Bộ nhớ RAM `~15 MB`, `0% GPU` khi thu xuống khay hệ thống.
     - Mã nguồn mở `MIT License` minh bạch 100% trên GitHub.
  5. **Final CTA + Hộp thoại Post-Download Modal (`xattr -cr` 1-click Copy) & QR SePay 15K.**

---

## ✅ BƯỚC 5: CHECKLIST KIỂM TRA SAU KHI TRIỂN KHAI TRÊN MÁY KIA

1. [ ] Chạy `npm run build` (hoặc `astro build`) đảm bảo không có lỗi biên dịch ở cả 3 route: `/deskaura`, `/deskaura/van-phong`, `/deskaura/for-devs`.
2. [ ] Kiểm tra thẻ `<meta property="og:image" content="https://duongbirken.deta.vn/images/deskaura/deskaura_brand_banner.png" />` đã có mặt trong `<head>` của cả 3 trang.
3. [ ] Kiểm tra cả 3 video (`deskaura_tvc_eyecare.mp4`, `deskaura_tvc_intro.mp4`, `deskaura_demo_45s.mp4`) phát mượt và nút bật/tắt tiếng hoạt động tốt.
4. [ ] Kiểm tra bấm nút tải `.exe` / `.dmg` trên cả 3 trang đều bật hộp thoại `#post-download-modal` và sinh mã QR SePay `AURAxxxxxx` thành công.
