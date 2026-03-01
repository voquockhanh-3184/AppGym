import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
  Alert, // Vẫn giữ Alert cho các lỗi hệ thống nghiêm trọng nếu cần
  StatusBar,
  Animated,
  TouchableWithoutFeedback,
  Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";

import DB from "../../src/db/sqlite";
import { 
  setupNotifications, 
  cancelAllNotifications, 
  scheduleClassNotification,
  addLocalNotification 
} from "../../src/utils/NotificationService"; 

// ==========================================
// 1. CUSTOM SWITCH COMPONENT
// ==========================================
interface CustomSwitchProps {
  value: boolean;
  onValueChange: () => void;
  activeColor: string;
  inActiveColor: string;
}

const CustomSwitch = ({ value, onValueChange, activeColor, inActiveColor }: CustomSwitchProps) => {
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: value ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22] 
  });

  const backgroundColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [inActiveColor, activeColor]
  });

  return (
    <TouchableWithoutFeedback onPress={onValueChange}>
      <Animated.View style={[switchStyles.container, { backgroundColor }]}>
        <Animated.View 
          style={[
            switchStyles.circle, 
            { transform: [{ translateX }] }
          ]} 
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const switchStyles = StyleSheet.create({
  container: {
    width: 50,
    height: 30,
    borderRadius: 20,
    padding: 2,
    justifyContent: 'center',
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 2,
  },
});

// ==========================================
// 2. MAIN SCREEN
// ==========================================

export default function GeneralSettingsScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  
  // ✅ State cho Modal Popup
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState({
      title: "",
      message: "",
      type: "success" // 'success' | 'error' | 'info'
  });

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    primary: "#007AFF",
    success: "#34C759", // Màu xanh khi bật
    inactive: isDark ? "#3A3A3C" : "#E5E5EA", // Màu xám khi tắt
    modalOverlay: "rgba(0,0,0,0.6)",
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSetting = await AsyncStorage.getItem("classNotificationEnabled");
        if (savedSetting !== null) {
          setIsNotificationEnabled(JSON.parse(savedSetting));
        }
      } catch (e) {
        console.error("Lỗi load cài đặt:", e);
      }
    };
    loadSettings();
  }, []);

  const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
    try {
        let day, month, year;
        if (dateStr.includes('/')) {
            [day, month, year] = dateStr.split('/').map(Number);
        } else if (dateStr.includes('-')) {
            [year, month, day] = dateStr.split('-').map(Number);
        } else {
            return null;
        }
        const [hour, minute] = timeStr.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute, 0);
    } catch (e) {
        return null;
    }
  };

  // ✅ Hàm hiển thị Popup thay cho Alert
  const showPopup = (title: string, message: string, type: "success" | "error" | "info" = "success") => {
      setPopupData({ title, message, type });
      setPopupVisible(true);
  };

  const toggleSwitch = async () => {
    const newValue = !isNotificationEnabled;
    setIsNotificationEnabled(newValue); 

    try {
      await AsyncStorage.setItem("classNotificationEnabled", JSON.stringify(newValue));
      console.log("Đã lưu cài đặt thông báo:", newValue);
      
      if (newValue) {
          await setupNotifications();
          
          const userId = await AsyncStorage.getItem("currentUserId");
          if (userId) {
             const myClasses = await DB.getClassesLocal(parseInt(userId), 'user', '');
             
             if (myClasses.length > 0) {
                 let count = 0;

                 const STORAGE_KEY = "USER_NOTIFICATIONS";
                 const existingJson = await AsyncStorage.getItem(STORAGE_KEY);
                 let currentNotifications = existingJson ? JSON.parse(existingJson) : [];

                 for (const item of myClasses) {
                     // A. Đặt lịch hệ thống
                     await scheduleClassNotification(
                         item.id, 
                         item.className, 
                         item.date, 
                         item.time
                     );
                     
                     // B. Tạo thông báo trong app
                     const classDate = parseDateTime(item.date, item.time);
                     let triggerAt = Date.now(); 

                     if (classDate) {
                         triggerAt = classDate.getTime() - 600000; // Trừ 10 phút
                     }

                     // Chỉ thêm nếu chưa qua giờ báo
                     if (triggerAt > Date.now()) {
                         const newInAppNotif = {
                            id: `class-${item.id}-${Date.now()}`,
                            title: "📅 Nhắc nhở lớp học",
                            message: `Lớp ${item.className} sắp bắt đầu lúc ${item.time}. Chuẩn bị nhé!`,
                            time: item.time, 
                            type: "alert",
                            isRead: false,
                            createdAt: Date.now(),
                            triggerAt: triggerAt
                         };
                         currentNotifications.unshift(newInAppNotif);
                         count++;
                     }
                 }
                 
                 await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentNotifications));

                 // ✅ Dùng Popup thay Alert
                 showPopup("Đã bật thông báo", `Hệ thống sẽ nhắc nhở trước 10 phút cho ${count} lớp học sắp tới.`, "success");
             } else {
                 showPopup("Đã bật thông báo", "Hiện tại bạn chưa đăng ký lớp học nào.", "info");
             }
          }

      } else {
          await cancelAllNotifications();
          // ✅ Dùng Popup thay Alert
          showPopup("Đã tắt thông báo", "Bạn sẽ không nhận được nhắc nhở vào lớp nữa.", "info");
      }

    } catch (e) {
      console.error("Lỗi xử lý thông báo:", e);
      showPopup("Lỗi", "Không thể cập nhật cài đặt thông báo.", "error");
      setIsNotificationEnabled(!newValue); // Revert nếu lỗi
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[
                styles.backBtn, 
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }
            ]}
        >
          <Image 
            source={require("../../assets/back.png")} 
            style={[styles.backIcon, { tintColor: colors.text }]} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tổng cài đặt</Text>
        
        <View style={{ width: 40 }} /> 
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        
        <Text style={[styles.sectionHeader, { color: colors.subtext }]}>THÔNG BÁO</Text>
        
        <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Nhắc nhở vào lớp</Text>
                    <Text style={[styles.settingSubtitle, { color: colors.subtext }]}>
                        Thông báo trước 10 phút khi lớp học bắt đầu
                    </Text>
                </View>
                
                <CustomSwitch
                    value={isNotificationEnabled}
                    onValueChange={toggleSwitch}
                    activeColor={colors.success} 
                    inActiveColor={colors.inactive} 
                />
            </View>
        </View>

      </View>

      {/* ✅ MODAL POPUP BO TRÒN */}
      <Modal visible={popupVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                
                {/* Icon tròn */}
                <View style={[styles.iconContainer, { 
                    backgroundColor: popupData.type === 'success' ? 'rgba(52, 199, 89, 0.1)' : 
                                     popupData.type === 'error' ? 'rgba(255, 59, 48, 0.1)' : 
                                     'rgba(0, 122, 255, 0.1)' 
                }]}>
                    <Image 
                        source={popupData.type === 'success' ? require("../../assets/success.png") : 
                                popupData.type === 'error' ? require("../../assets/close.png") : 
                                require("../../assets/information.png")} 
                        style={{
                            width: 32, height: 32, 
                            tintColor: popupData.type === 'success' ? '#34C759' : 
                                       popupData.type === 'error' ? '#FF3B30' : 
                                       '#007AFF'
                        }} 
                    />
                </View>

                <Text style={[styles.modalTitle, { color: colors.text }]}>{popupData.title}</Text>
                <Text style={[styles.modalMessage, { color: colors.subtext }]}>
                    {popupData.message}
                </Text>

                <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={() => setPopupVisible(false)}
                >
                    <Text style={styles.modalButtonText}>Đóng</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1, 
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  sectionHeader: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 10,
      marginLeft: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5
  },
  
  settingCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
  },
  
  settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  
  settingTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
  },
  
  settingSubtitle: {
      fontSize: 13,
      lineHeight: 18,
  },

  // ✅ Styles cho Popup Bo Tròn
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: '85%',
    borderRadius: 24, // Bo tròn mạnh
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});