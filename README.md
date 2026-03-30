# 🏋️‍♂️ AppGym - Fitness & Workout Assistant

**AppGym** là ứng dụng di động mạnh mẽ được xây dựng trên nền tảng **React Native**. Dự án tập trung vào việc giúp người dùng quản lý lịch tập, theo dõi bài tập và phân tích tiến độ thay đổi cơ thể một cách khoa học với giao diện hiện đại.

---

<p align="center">
  <table align="center">
    <tr>
      <td align="center"><b>🏠 Trang chủ</b></td>
      <td align="center"><b>📚 Lớp học</b></td>
    </tr>
    <tr>
      <td>
        <img src="https://github.com/user-attachments/assets/8b0470d6-f51d-47aa-a156-bf2ef75e87ac" width="250" alt="Home Screen">
      </td>
      <td>
        <img src="https://github.com/user-attachments/assets/0291b968-2e0f-4b64-9fd1-846e7fca1fa8" width="250" alt="Workout Detail">
      </td>
    </tr>
    <tr>
      <td align="center"><b>📈 Báo cáo</b></td>
      <td align="center"><b>⚙️ Cài đặt</b></td>
    </tr>
    <tr>
      <td>
        <img src="https://github.com/user-attachments/assets/c6953e47-28fe-448c-a75e-35c3ce98e6f7" width="250" alt="Body Metrics">
      </td>
      <td>
        <img src="https://github.com/user-attachments/assets/80395830-e62d-4963-b252-d9ec7f614a6d" width="250" alt="Profile Screen">
      </td>
    </tr>
  </table>
</p>

---

## ✨ Tính năng chính

### 🏃 Quản lý Tập luyện & Sức khỏe
* **Thư viện bài tập:** Hướng dẫn chi tiết kỹ thuật cho các nhóm cơ (Ngực, Lưng, Chân, Vai...).
* **Lịch trình linh hoạt:** Tùy chỉnh và sắp xếp lịch tập cá nhân hàng tuần.
* **Lịch học theo khóa học:** Tự động hiển thị và đồng bộ lịch học dựa trên các khóa học đã đăng ký.
* **Chỉ số cơ thể:** Ghi chép biến động cân nặng và tự động tính toán chỉ số BMI.
* **Hẹn giờ thông minh:** Đồng hồ đếm ngược thời gian nghỉ giữa các hiệp (Sets) tự động.

### 🎓 Hệ thống Khóa học & Đào tạo
* **Cửa hàng khóa học:** Hệ thống hiển thị và đăng ký các gói tập luyện chuyên sâu từ PT.
* **Quản lý lộ trình:** Theo dõi danh sách bài học đã hoàn thành và tiến độ học tập.
* **Phân quyền hệ thống:** Thiết kế logic phân quyền truy cập riêng biệt giữa Người dùng (User) và Huấn luyện viên (PT).
* **Báo cáo tiến độ:** Biểu đồ trực quan hóa quá trình tập luyện theo thời gian thực.

---

## 🛠 Công nghệ sử dụng
* **Framework:** React Native
* **Ngôn ngữ:** JavaScript
* **Database:** SQLite (Lưu trữ dữ liệu cục bộ cho hiệu suất cao)
* **Library:** React Navigation (Quản lý luồng ứng dụng)

---

## 💻 Yêu cầu hệ thống
Trước khi cài đặt, hãy đảm bảo máy tính của bạn đã có:
* **Node.js:** Phiên bản v18 trở lên.
* **JDK:** Java Development Kit 17 (Bắt buộc để build Android).
* **Android Studio:** Đã cài đặt SDK, Build-Tools và cấu hình biến môi trường (`ANDROID_HOME`).

---

## 🚀 Hướng dẫn cài đặt và khởi chạy chi tiết

### Bước 1: Tải mã nguồn dự án
Sử dụng Git để clone dự án về máy cục bộ:
```bash
git clone [https://github.com/voquockhanh-3184/AppGym.git](https://github.com/voquockhanh-3184/AppGym.git)
cd AppGym
