import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  SafeAreaView,
  Image,
  Share,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  StatusBar,
  Animated,
  TouchableWithoutFeedback
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import DB from "../../src/db/sqlite";
import { useTheme } from "../../src/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export default function SettingScreen() {
  const navigation = useNavigation<any>();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [showBanner, setShowBanner] = useState(true);
  
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false); 
  
  // State cho Modal Đề xuất
  const [featureModalVisible, setFeatureModalVisible] = useState(false);
  const [featureContent, setFeatureContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // State lưu tên người dùng
  const [currentUsername, setCurrentUsername] = useState("Người dùng");

  // State lưu số lượng đề xuất mới (Badge)
  const [pendingCount, setPendingCount] = useState(0);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  const toggleBanner = async (value: boolean) => {
    setShowBanner(value);
    await AsyncStorage.setItem("showBanner", value ? "true" : "false");
  };

  // Load thông tin user (Avatar + Tên)
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // Load Avatar
        const storedPhoto = await AsyncStorage.getItem("currentUserPhoto");
        if (storedPhoto) setUserPhoto(storedPhoto);

        // Load Tên người dùng
        let name = await AsyncStorage.getItem("currentUsername");
        
        // Nếu chưa có trong Storage, thử lấy từ DB
        if (!name) {
            const userId = await AsyncStorage.getItem("currentUserId");
            if (userId) {
                await DB.initDB();
                const users = await DB.getAllUsersLocal();
                const user = users.find((u: any) => String(u.id) === String(userId));
                if (user) name = user.username;
            }
        }
        
        if (name) setCurrentUsername(name);

      } catch (error) {
        console.warn("Lỗi load thông tin user:", error);
      }
    };
    loadUserInfo();
  }, []);

  // Load quyền hạn và badge
  const loadData = async () => {
      await DB.initDB();
      const id = await AsyncStorage.getItem("currentUserId");
      const users = await DB.getAllUsersLocal();
      const user = users.find((u: any) => String(u.id) === String(id));
      
      if (user) {
          setIsAdminUser(user.role === "admin");
          setIsTrainer(user.role === "trainer");

          if (user.role === "admin") {
              const count = await DB.countPendingFeatureRequests();
              setPendingCount(count);
          }
      }
  };

  useFocusEffect(
    useCallback(() => {
        loadData();
    }, [])
  );

  const handleShareApp = async () => {
    try {
      const result = await Share.share({
        message:
          'Hãy tải ngay ứng dụng Gym Master để theo dõi lịch tập và sức khỏe của bạn! \n\nLink tải Android: https://play.google.com/store/apps/details?id=com.gymmaster.app\nLink tải iOS: https://apps.apple.com/app/id123456789', 
        title: 'Chia sẻ ứng dụng Gym Master',
      });
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    }
  };

  const handleSubmitFeature = async () => {
    if (!featureContent.trim()) {
        Alert.alert("Thông báo", "Vui lòng nhập nội dung đề xuất.");
        return;
    }

    try {
        const userId = await AsyncStorage.getItem("currentUserId");
        
        if (userId) {
            // Gửi với tên hiện tại (currentUsername) hoặc ẩn danh
            await DB.addFeatureRequest(Number(userId), currentUsername, featureContent, isAnonymous);
            
            Alert.alert("Cảm ơn!", "Đề xuất của bạn đã được gửi đến Admin.");
            
            // Reset form
            setFeatureContent("");
            setIsAnonymous(false);
            setFeatureModalVisible(false);
            
            if (isAdminUser) {
                const count = await DB.countPendingFeatureRequests();
                setPendingCount(count);
            }
        }
    } catch (error) {
        console.error("Lỗi gửi đề xuất:", error);
        Alert.alert("Lỗi", "Không thể gửi đề xuất lúc này.");
    }
  };
  
  const colors = {
    background: isDark ? "#0d0d0d" : "#f5faf9",
    card: isDark ? "#1a1a1a" : "#ffffff",
    text: isDark ? "#f5f5f5" : "#111111",
    subtitle: isDark ? "#9e9e9e" : "#666666",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
    shadow: isDark ? "transparent" : "#000000",
    primaryBlue: "#4da3ff",
    present: "#34C759",
    inputBg: isDark ? "#2C2C2E" : "#F2F2F7",
    badge: "#FF3B30",
    switchInactive: isDark ? "#3A3A3C" : "#E5E5EA", // Màu switch khi tắt
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Header title="Cài đặt" userPhoto={userPhoto} />

      <ScrollView
        style={{ flex: 1, marginTop: 100 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nhóm 1: Cài đặt cá nhân */}
        <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <SettingItem
            imageSource={require("../../assets/user-check.png")}
            color={colors.present}
            title="Điểm danh cá nhân"
            textColor={colors.text}
            subtitleColor={colors.subtitle}
            onPress={() => navigation.navigate("UserRegisteredCoursesScreen")}
          />

          <SettingItem
            imageSource={require("../../assets/exercise.png")}
            color={colors.primaryBlue}
            title="Cài đặt các bài tập"
            textColor={colors.text}
            subtitleColor={colors.subtitle}
            onPress={() => navigation.navigate("ExerciseSettingScreen")}
          />

          <SettingItem
            imageSource={require("../../assets/warning.png")}
            color={isDark ? "#64B5F6" : "#007AFF"}
            title="Tổng cài đặt"
            textColor={colors.text}
            subtitleColor={colors.subtitle}
            onPress={() => navigation.navigate("GeneralSettingsScreen")}
          />

          {/* Nhóm Admin/Trainer */}
          {(isAdminUser || isTrainer) && (
              <SettingItem
                imageSource={require("../../assets/calendar.png")}
                color={isDark ? "#AB47BC" : "#8E24AA"} 
                title="Quản lý điểm danh"
                subtitle={isTrainer ? "Lớp học của tôi" : "Tất cả lớp học"}
                textColor={colors.text}
                subtitleColor={colors.subtitle}
                onPress={() => navigation.navigate("AttendanceClassListScreen")}
              />
          )}

          {isAdminUser && (
            <>
              <SettingItem
                imageSource={require("../../assets/banner.png")}
                color={isDark ? "#FF9800" : "#FFA726"}
                title="Quản lý khóa học"
                textColor={colors.text}
                subtitleColor={colors.subtitle}
                onPress={() => navigation.navigate("BannerSettingScreen")}
              />

              <SettingItem
                imageSource={require("../../assets/chart.png")}
                color={isDark ? "#FF7043" : "#F4511E"}
                title="Báo cáo doanh thu"
                textColor={colors.text}
                subtitleColor={colors.subtitle}
                onPress={() => navigation.navigate("RevenueScreen")}
              />

              <SettingItem
                imageSource={require("../../assets/location.png")}
                color={isDark ? "#4DB6AC" : "#26A69A"}
                title="Quản lý cơ sở"
                textColor={colors.text}
                subtitleColor={colors.subtitle}
                onPress={() => navigation.navigate("GymBranchSettingScreen")}
              />

              <SettingItem
                imageSource={require("../../assets/coach.png")}
                color={isDark ? "#4CAF50" : "#2E7D32"}
                title="Quản lý huấn luyện viên"
                textColor={colors.text}
                subtitleColor={colors.subtitle}
                onPress={() => navigation.navigate("TrainerSettingScreen")}
              />

              <SettingItem
                imageSource={require("../../assets/group.png")}
                color={isDark ? "#E91E63" : "#D81B60"}
                title="Quản lý tài khoản"
                subtitle="Phân quyền Admin, PT, Học viên"
                textColor={colors.text}
                subtitleColor={colors.subtitle}
                onPress={() => navigation.navigate("UserManagementScreen")}
              />

              <SettingItem
                imageSource={require("../../assets/ticket.png")}
                color={isDark ? "#FF5252" : "#E53935"}
                title="Quản lý mã giảm giá"
                subtitle="Tạo voucher cho khóa học"
                textColor={colors.text}
                subtitleColor={colors.subtitle}
                onPress={() => navigation.navigate("CouponSettingScreen")}
              />

              {/* Nút xem danh sách đề xuất (Admin) */}
              <SettingItem
                imageSource={require("../../assets/signature.png")} 
                color="#607D8B"
                title="Xem danh sách đề xuất"
                subtitle="Ý kiến từ người dùng"
                textColor={colors.text}
                subtitleColor={colors.subtitle}
                onPress={() => navigation.navigate("AdminFeatureRequestsScreen")}
                trailing={
                    pendingCount > 0 ? (
                        <View style={[styles.badgeContainer, { backgroundColor: colors.badge }]}>
                            <Text style={styles.badgeText}>{pendingCount}</Text>
                        </View>
                    ) : undefined
                }
              />
            </>
          )}

          {/* Nút Gửi đề xuất (User/All) */}
          <SettingItem
            imageSource={require("../../assets/signature.png")}
            color={isDark ? "#00BCD4" : "#0097A7"}
            title="Đề xuất tính năng"
            textColor={colors.text}
            subtitleColor={colors.subtitle}
            onPress={() => setFeatureModalVisible(true)} 
          />

          <SettingItem
            imageSource={isDark ? require("../../assets/light-mode.png") : require("../../assets/night-mode.png")}
            color={isDark ? "#FFD54F" : "#FFC107"}
            title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            textColor={colors.text}
            trailing={
                // ✅ THAY THẾ: Dùng CustomSwitch
                <CustomSwitch
                    value={isDark}
                    onValueChange={toggleTheme}
                    activeColor={colors.primaryBlue}
                    inActiveColor={colors.switchInactive}
                />
            }
            isLast
          />
        </View>

        {/* Nhóm 2: Chia sẻ & Đánh giá */}
        <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <SettingItem
            imageSource={require("../../assets/send.png")}
            color={isDark ? "#81D4FA" : "#546E7A"}
            title="Chia sẻ với bạn bè"
            textColor={colors.text}
            subtitleColor={colors.subtitle}
            onPress={handleShareApp} 
          />

          {/* ✅ Nút Đánh giá: Đã điều hướng đúng */}
          <SettingItem
            imageSource={require("../../assets/star.png")}
            color={isDark ? "#FFD54F" : "#FFC107"}
            title="Đánh giá khóa học"
            subtitle="Đánh giá các lớp bạn đã học"
            isLast
            textColor={colors.text}
            subtitleColor={colors.subtitle}
            onPress={() => navigation.navigate("CourseRatingScreen")}
          />
        </View>
      </ScrollView>

      {/* Modal Nhập Đề xuất */}
      <Modal visible={featureModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{width: '100%', alignItems: 'center'}}>
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Đề xuất tính năng</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.subtitle }]}>
                        Góp ý của bạn giúp chúng tôi cải thiện ứng dụng tốt hơn!
                    </Text>
                    
                    <TextInput 
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
                        placeholder="Nhập nội dung đề xuất..."
                        placeholderTextColor={colors.subtitle}
                        multiline
                        value={featureContent}
                        onChangeText={setFeatureContent}
                    />

                    <View style={styles.anonymousRow}>
                        <View>
                            <Text style={[styles.anonymousText, { color: colors.text }]}>Gửi ẩn danh</Text>
                            <Text style={{ fontSize: 12, color: colors.subtitle, marginTop: 2 }}>
                                {isAnonymous ? "(Người gửi: Ẩn danh)" : `(Người gửi: ${currentUsername})`}
                            </Text>
                        </View>
                        
                        {/* ✅ THAY THẾ: Dùng CustomSwitch */}
                        <CustomSwitch
                            value={isAnonymous}
                            onValueChange={() => setIsAnonymous(prev => !prev)}
                            activeColor={colors.primaryBlue}
                            inActiveColor={isDark ? "#555" : "#ccc"} 
                        />
                    </View>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setFeatureModalVisible(false)}>
                            <Text style={styles.cancelText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitFeature}>
                            <Text style={styles.submitText}>Gửi đi</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
      </Modal>

      <Footer active="Cài đặt" darkMode={isDark} />
    </SafeAreaView>
  );
}

// Component Item nhỏ gọn
const SettingItem = ({ imageSource, color, title, subtitle, trailing, isLast, textColor, subtitleColor, onPress }: any) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.item, !isLast && styles.itemBorder, { borderBottomColor: (subtitleColor || "#ccc") + "33" }]}>
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: color + "22" }]}>
        {imageSource && <Image source={imageSource} style={[styles.iconImage, { tintColor: color }]} resizeMode="contain" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemTitle, { color: textColor, flexShrink: 1 }]}>{title}</Text>
        {subtitle && <Text style={[styles.itemSubtitle, { color: subtitleColor }]}>{subtitle}</Text>}
      </View>
      {trailing ? trailing : (
        <Image source={require("../../assets/right-arrow.png")} style={{ width: 16, height: 16, tintColor: subtitleColor }} />
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  settingGroup: { borderRadius: 18, marginHorizontal: 18, marginBottom: 18, marginTop: 18, paddingVertical: 4, borderWidth: 1, ...Platform.select({ android: { elevation: 3 }, ios: { shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } } }) },
  item: { paddingHorizontal: 18, paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 0.6 },
  row: { flexDirection: "row", alignItems: "center" },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  iconImage: { width: 24, height: 24, resizeMode: "contain", borderRadius: 6 },
  itemTitle: { fontSize: 15, fontWeight: "500" },
  itemSubtitle: { fontSize: 13 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '90%', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  input: { width: '100%', height: 100, borderRadius: 12, padding: 12, textAlignVertical: 'top', fontSize: 15, marginBottom: 15 },
  
  anonymousRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 20,
      paddingHorizontal: 5
  },
  anonymousText: {
      fontSize: 15,
      fontWeight: '600'
  },

  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', marginRight: 10 },
  cancelText: { fontSize: 16, color: '#888', fontWeight: '600' },
  submitBtn: { flex: 1, backgroundColor: '#4da3ff', padding: 12, borderRadius: 12, alignItems: 'center' },
  submitText: { fontSize: 16, color: '#fff', fontWeight: '600' },

  badgeContainer: {
      backgroundColor: '#FF3B30',
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
  },
  badgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
  }
});