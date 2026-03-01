import notifee, { 
  TriggerType, 
  AndroidImportance, 
  TimestampTrigger,
  AuthorizationStatus 
} from '@notifee/react-native';
import { Alert, Platform } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "USER_NOTIFICATIONS";

/**
 * 1. Helper: Lưu thông báo vào AsyncStorage để hiển thị ở màn hình NotificationScreen
 */
export const addLocalNotification = async (
    title: string, 
    message: string, 
    triggerAt: number, // Thời gian sẽ báo
    type: "system" | "promo" | "alert" = "system"
) => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    const currentNotifications = jsonValue != null ? JSON.parse(jsonValue) : [];

    const newNotification = {
      id: Date.now().toString() + Math.random().toString(), // ID duy nhất
      title,
      message,
      // Hiển thị giờ kích hoạt trong danh sách
      time: new Date(triggerAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), 
      type,
      isRead: false,
      createdAt: Date.now(),
      triggerAt: triggerAt, // Lưu thời điểm sẽ báo để lọc hiển thị
    };

    const updatedNotifications = [newNotification, ...currentNotifications];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications));
    console.log("💾 Đã lưu thông báo vào bộ nhớ:", title);
  } catch (e) {
    console.error("Lỗi lưu thông báo:", e);
  }
};

/**
 * 2. Cấu hình & Xin quyền thông báo
 */
export async function setupNotifications() {
  try {
    const settings = await notifee.requestPermission();

    if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
      console.log('⚠️ Người dùng từ chối quyền thông báo.');
      return;
    }

    if (Platform.OS === 'android') {
      const alarmPermission = await notifee.getNotificationSettings();
      if (!alarmPermission.android.alarm) {
        Alert.alert(
          "Cấp quyền nhắc nhở",
          "Để nhận thông báo đúng giờ, vui lòng cho phép ứng dụng đặt báo thức.",
          [
            { text: "Hủy", style: "cancel" },
            { text: "Mở Cài Đặt", onPress: () => notifee.openAlarmPermissionSettings() }
          ]
        );
      }
    }

    await notifee.createChannel({
      id: 'class-reminder',
      name: 'Nhắc nhở lớp học',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    console.log('✅ Đã cấu hình kênh thông báo xong.');
    
  } catch (error) {
    console.error("Lỗi cấu hình thông báo:", error);
  }
}

// Helper parse ngày giờ linh hoạt (DD/MM/YYYY hoặc YYYY-MM-DD)
const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
    try {
        let day, month, year;
        const cleanDate = dateStr.trim();
        
        if (cleanDate.includes('/')) {
            // Định dạng VN: DD/MM/YYYY
            [day, month, year] = cleanDate.split('/').map(Number);
        } else if (cleanDate.includes('-')) {
            // Định dạng ISO: YYYY-MM-DD
            [year, month, day] = cleanDate.split('-').map(Number);
        } else {
            return null;
        }

        const [hour, minute] = timeStr.trim().split(':').map(Number);
        
        // Lưu ý: Month trong JS bắt đầu từ 0 (0 = Tháng 1)
        const dateObj = new Date(year, month - 1, day, hour, minute, 0);
        
        if (isNaN(dateObj.getTime())) return null;
        
        return dateObj;
    } catch (e) {
        return null;
    }
};

/**
 * 3. Đặt lịch thông báo Lớp học
 */
export async function scheduleClassNotification(
  classId: number | string,
  className: string,
  dateStr: string, 
  timeStr: string 
) {
  try {
    const classDate = parseDateTime(dateStr, timeStr);
    if (!classDate) {
        console.warn("Ngày giờ không hợp lệ:", dateStr, timeStr);
        return;
    }

    // Báo trước 10 phút
    const triggerTimestamp = classDate.getTime() - 10 * 60 * 1000; 

    console.log(`🔍 CHECK LỊCH: ${className} | Giờ học: ${timeStr} ${dateStr}`);
    
    // Nếu thời gian báo đã qua, không đặt notifee nhưng vẫn có thể lưu vào list (tuỳ logic)
    if (triggerTimestamp <= Date.now()) {
       console.log(`⚠️ BỎ QUA PUSH: Giờ báo đã qua.`);
       return; 
    }

    // 1. Tạo Trigger cho Notifee (Push Notification)
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTimestamp, 
      alarmManager: true, 
    };

    await notifee.createTriggerNotification(
      {
        id: String(classId),
        title: '⏰ Sắp đến giờ học!',
        body: `Lớp "${className}" bắt đầu lúc ${timeStr}. Chuẩn bị nhé!`,
        data: { screen: 'ClassDetailScreen', classId: String(classId) },
        android: {
          channelId: 'class-reminder',
          pressAction: { id: 'default' },
          color: '#007AFF',
          importance: AndroidImportance.HIGH,
          // smallIcon: 'ic_launcher', // Bỏ comment nếu đã có icon
        },
        ios: { sound: 'default' },
      },
      trigger,
    );

    // 2. ✅ QUAN TRỌNG: Lưu vào AsyncStorage để hiện bên trang Thông Báo
    await addLocalNotification(
        'Sắp đến giờ học!',
        `Lớp "${className}" sẽ bắt đầu lúc ${timeStr} ngày ${dateStr}.`,
        triggerTimestamp, // Lưu thời gian sẽ kích hoạt
        'alert'
    );

    console.log(`✅ ĐÃ ĐẶT LỊCH Notifee & Storage thành công!`);

  } catch (error) {
    console.error("❌ Lỗi đặt lịch:", error);
  }
}

/**
 * 4. HÀM TEST NHANH
 */
export async function testInstantNotification() {
    try {
        console.log("🚀 Đang bắn thông báo test (3 giây nữa)...");
        const triggerTime = Date.now() + 3000;

        await notifee.createTriggerNotification(
            {
                title: '🔔 Test Thông Báo',
                body: 'Hệ thống hoạt động tốt!',
                android: {
                    channelId: 'class-reminder',
                    importance: AndroidImportance.HIGH,
                },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: triggerTime,
                alarmManager: true,
            }
        );

        // Lưu test vào storage luôn để kiểm tra list
        await addLocalNotification(
            'Test Thông Báo',
            'Đây là tin nhắn kiểm tra hệ thống.',
            triggerTime,
            'system'
        );

    } catch (error) {
        console.error("Lỗi test thông báo:", error);
    }
}

export async function cancelAllNotifications() {
  await notifee.cancelAllNotifications();
  // Tùy chọn: Xóa sạch cả storage nếu muốn reset hoàn toàn
  // await AsyncStorage.removeItem(STORAGE_KEY);
  console.log("🗑️ Đã hủy tất cả lịch nhắc nhở Notifee.");
}