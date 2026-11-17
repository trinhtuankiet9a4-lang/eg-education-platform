# 🚀 KẾ HOẠCH TRIỂN KHAI & TIẾN ĐỘ DEPLOY PRODUCTION (EG EDUCATION PLATFORM)

> **Mục tiêu:** Đưa **EG Education Platform** lên môi trường **Production hợp nhất 1 cổng (`http://localhost:5000` / HTTPS)** với đầy đủ hạ tầng đóng gói Docker, Cloud PaaS (Render / Railway), VPS Nginx + SSL và công cụ sao lưu SQLite.  
> **Cập nhật lần cuối:** `17/11/2026` • **Phiên bản:** `v2.4.0` (`eg-education-platform@1.0.0`)

---

## 1. 📊 Tổng quan Tiến độ Toàn Dự án (`100% — Sẵn sàng Deploy Production`)

```text
Tiến độ tổng thể: [█████████████████████████] 100% — Sẵn sàng Deploy Production
```

| STT | Hạng mục công việc | Tiến độ | Trạng thái | Ghi chú kỹ thuật đã hoàn tất |
| :-: | :--- | :---: | :---: | :--- |
| **1** | **Unified Production Server (`server/index.js`)** | **100%** | ✅ Hoàn thành | Express 5 (`v2.4.0`) phục vụ đồng thời API `/api/*`, static `dist/` + SPA fallback `index.html`, cấu hình `ALLOWED_ORIGINS` CORS, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, `/api/health` và `vite.config.js` manualChunks. |
| **2** | **Game Ném Phấn 2D Giảng Đường (`100` chỗ / `88` SV)** | **100%** | ✅ Hoàn thành | `ClassroomChalkThrowGame.jsx` & `AttendanceExitAndPickerAddon.jsx` dựng sơ đồ giảng đường 2D top-down 10×10 (`100` bàn), xếp động đúng `88` sinh viên (`STUDENTS_K26_A.length = 88`) + bàn trống, radar aim + quỹ đạo phấn parabol + nổ bụi phấn trúng đích. |
| **3** | **Tách riêng AI Tạo Sơ đồ Tư duy & Bài cũ Ôn tập theo môn** | **100%** | ✅ Hoàn thành | `AiLectureMindmapHub.jsx`, `TeacherDashboard.jsx` & `StudentDashboard.jsx` tách 2 phân hệ độc lập: `✨ AI Tạo Sơ đồ Tư duy` (`mindmap`) và `📖 Bài cũ & Sơ đồ Ôn tập` (`lecture_recap`) theo từng môn (`RECAP_SUBJECTS`). |
| **4** | **Export PowerPoint `.pptx` chuẩn OpenXML** | **100%** | ✅ Hoàn thành | `src/utils/pptxExport.js` xuất file `.pptx` chuẩn ECMA-376 (Store ZIP + CRC-32, zero dependency) cho Giáo án Bloom và Sơ đồ tư duy. |
| **5** | **Open-IT AI Tutor (Hybrid External + SQLite RAG)** | **100%** | ✅ Hoàn thành | `server/services/aiService.js` & `StudentDashboard.jsx` hỗ trợ giải đáp mọi chủ đề CNTT từ tri thức mở (Wikipedia / Docs chuẩn) kết hợp học liệu SQLite RAG; failover miễn phí Groq / Gemini / OpenRouter `:free` & fallback offline. |
| **6** | **GPS Location Enforcement (Điểm danh & Mở phiên)** | **100%** | ✅ Hoàn thành | `server/routes/attendance.js` & `MobileCheckInScreen.jsx` bắt buộc tọa độ GPS thực tế từ trình duyệt (`navigator.geolocation`) và kiểm tra khoảng cách Haversine so với phòng học. |
| **7** | **Dữ liệu Lớp Sạch `88` Sinh viên** | **100%** | ✅ Hoàn thành | `server/students_data.js` & `server/db.js` chuẩn hóa danh sách `88` sinh viên lớp `K26 CNTT - Lớp A` ở trạng thái sạch, không dữ liệu rác/vắng ảo. |
| **8** | **Script Sao lưu SQLite Tự động (`server/backup_db.js`)** | **100%** | ✅ Hoàn thành | Script ESM (`node:sqlite` / `fs`) sao lưu nhất quán `server/eg_education.db` (bao gồm WAL) sang `backups/eg_education_YYYY-MM-DD_HHMMSS.db`, chạy nhanh qua `npm run backup:db`. |
| **9** | **Hạ tầng Đóng gói & Deploy (Docker / Render / Railway / Tunnel)** | **100%** | ✅ Hoàn thành | Đầy đủ `.env.example`, `.gitignore`, `.dockerignore`, `Dockerfile` (`node:22-alpine`), `render.yaml`, `railway.json` và `start_production.bat` 1-click trên Windows. |

---

## 2. ✅ Checklist Nghiệm thu Đóng gói & Hạ tầng

- [x] **Unified Server & Build tối ưu**: `server/index.js` serve `dist/` + API `/api/*`, `src/services/api.js` hỗ trợ `VITE_API_BASE_URL || '/api'`, `package.json` có `start`, `deploy:local`, `backup:db`.
- [x] **Game Ném Phấn 2D & Tương tác lớp học**: `ClassroomChalkThrowGame.jsx` (`100` seats / `88` active students) tích hợp mượt với `AttendanceExitAndPickerAddon.jsx`.
- [x] **AI Studio tách biệt + Open-IT AI Tutor + Xuất `.pptx`**: Tách hẳn `AI Tạo Sơ đồ Tư duy` và `Bài cũ & Sơ đồ Ôn tập` theo môn học; hỗ trợ Open-IT AI Tutor và xuất PowerPoint `.pptx`.
- [x] **Bảo mật & Chống gian lận điểm danh**: Cấu hình `JWT_SECRET`, `ALLOWED_ORIGINS` qua `.env`, bắt buộc GPS thực tế khi tạo phiên và quét QR điểm danh.
- [x] **Dữ liệu lớp sạch & Sao lưu**: Trạng thái sạch `88` sinh viên `K26 CNTT - Lớp A`; `server/backup_db.js` tạo bản sao lưu định dạng `eg_education_YYYY-MM-DD_HHMMSS.db` trong `backups/`.
- [x] **Bộ tệp Deploy chuẩn**: `.env.example`, `.gitignore`, `.dockerignore`, `Dockerfile`, `render.yaml`, `railway.json`, `start_production.bat`.

---

## 3. 🛠️ Hướng dẫn Triển khai Chi tiết Từng Phương án

> **Lưu ý chung trước khi Deploy:**
> 1. Sao chép `.env.example` thành `.env` (không commit `.env` lên Git), đổi `JWT_SECRET` sang chuỗi bí mật mạnh và cấu hình `ALLOWED_ORIGINS` (hoặc giữ `*` khi thử nghiệm).
> 2. Tính năng Camera quét QR và GPS trên điện thoại **bắt buộc truy cập qua `https://`** (hoặc `localhost`).

### Phương án A — Chạy Local Production + Cloudflare Tunnel (Nhanh nhất tại giảng đường)

1. **Khởi chạy 1-click trên Windows:**
   - Nhấp đúp **`start_production.bat`** (tự kiểm tra Node 22+, build `dist/`, backup `eg_education.db` vào `backups/`, nạp `.env` và chạy `node server/index.js` tại `http://localhost:5000`).
   - Hoặc chạy bằng dòng lệnh:
     ```bash
     npm run build
     npm run backup:db
     npm start
     ```
2. **Mở HTTPS Tunnel công khai cho sinh viên quét QR bằng 4G/WiFi:**
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
3. **Kiểm tra nhanh:** Mở `http://localhost:5000/api/health` (trả `status: "online"`) và chia sẻ URL `https://*.trycloudflare.com` cho lớp học.

---

### Phương án B — Deploy bằng Docker hoặc Cloud PaaS (Render / Railway)

#### 1. Chạy Docker cục bộ / Máy chủ Container
```bash
docker build -t eg-education-platform .
docker run -d -p 5000:5000 --env-file .env --name eg-edu eg-education-platform
```
- Ảnh Docker dùng `node:22-alpine` (tương thích `node:sqlite`), chạy `npm ci` -> `npm run build`, thiết lập `NODE_ENV=production PORT=5000` và kiểm tra sức khỏe qua `/api/health`.
- Lưu ý sao lưu định kỳ `server/eg_education.db` hoặc gắn volume cho dữ liệu bền vững khi cập nhật container.

#### 2. Deploy lên Render (`render.yaml`)
1. Đẩy mã nguồn lên GitHub/GitLab (`.gitignore` đã loại trừ `node_modules/`, `dist/`, `.env`, `server/*.db*`, `backups/`).
2. Trên Render Dashboard chọn **New + -> Blueprint** và chọn repository chứa `render.yaml`.
3. Render tự động cấu hình `NODE_VERSION=22`, build `npm ci && npm run build`, start `node server/index.js`, health check `/api/health`.
4. Nhập thêm các biến AI tùy chọn (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`) nếu muốn bật LLM cloud; với gói trả phí có thể gắn Persistent Disk để giữ `server/eg_education.db`.

#### 3. Deploy lên Railway (`railway.json` + `Dockerfile`)
1. Tạo New Project trên Railway -> **Deploy from GitHub repo**.
2. Railway tự nhận `railway.json` (dùng `Dockerfile`, start `node server/index.js`, `healthcheckPath: /api/health`).
3. Trong tab **Variables**, thiết lập `PORT=5000`, `NODE_ENV=production`, `JWT_SECRET`, `ALLOWED_ORIGINS` (và API keys AI nếu có).
4. Kiểm tra URL HTTPS do Railway cấp và gắn Railway Volume nếu cần lưu DB bền vững qua các lần redeploy.

---

### Phương án C — Deploy lên VPS Ubuntu (Node 22 + PM2 + Nginx + SSL)

1. **Cài đặt Node.js 22+ & build ứng dụng:**
   ```bash
   git clone <repo-url> eg-education && cd eg-education
   cp .env.example .env
   nano .env   # Cập nhật JWT_SECRET, ALLOWED_ORIGINS, AI keys
   npm ci && npm run build
   ```
2. **Chạy nền bền vững với PM2 & đặt lịch Backup SQLite:**
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name eg-edu
   pm2 save
   pm2 startup
   ```
   Thêm cron sao lưu hằng ngày lúc `02:00`:
   ```bash
   (crontab -l 2>/dev/null; echo "0 2 * * * cd /path/to/eg-education && npm run backup:db >> /var/log/eg-backup.log 2>&1") | crontab -
   ```
3. **Cấu hình Nginx Reverse Proxy & HTTPS Certbot (`/etc/nginx/sites-available/eg-edu`):**
   ```nginx
   server {
       listen 80;
       server_name edu.tenmien.vn;
       client_max_body_size 20M;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Kích hoạt site và cấp SSL miễn phí:
   ```bash
   sudo ln -s /etc/nginx/sites-available/eg-edu /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d edu.tenmien.vn
   ```

---

## 4. 🔍 Kiểm tra Nhanh Sau Khi Lên Production

1. **Health Check API:** `GET /api/health` trả HTTP `200` với `status: "online"` và `database: "SQLite (node:sqlite native)"`.
2. **Unified SPA Routing:** Truy cập `/` (và F5 ở đường dẫn bất kỳ) trả HTTP `200` HTML của ứng dụng React đã build trong `dist/`.
3. **Sĩ số lớp sạch:** `GET /api/attendance/class-roster` trả đúng `88` sinh viên.
4. **Sao lưu dữ liệu:** Chạy `node server/backup_db.js` tạo tệp `.db` mới trong `backups/`.
