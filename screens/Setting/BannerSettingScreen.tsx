import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
  Platform,
  SafeAreaView, 
  StatusBar,
  Alert,
  TouchableWithoutFeedback
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage"; 
import DB from "../../src/db/sqlite";
import { useTheme } from "../../src/context/ThemeContext";

interface Course {
  id?: number;
  title: string;
  image: string;
  description?: string;
  isVisible?: boolean;
  startDate?: string;
}

// ==========================================
// 1. CUSTOM SWITCH COMPONENT (Copy từ CouponSetting)
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

export default function BannerSettingScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    primary: "#4da3ff",
    success: "#34C759", // Màu xanh cho nút toggle bật
    inactive: isDark ? "#3A3A3C" : "#E5E5EA", // Màu xám cho nút toggle tắt
  };

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  const [currentUserRole, setCurrentUserRole] = useState<string>('user');

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [expiredModalVisible, setExpiredModalVisible] = useState(false);
  const [pendingCourseId, setPendingCourseId] = useState<number | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadCoursesAndRole = async () => {
    try {
      setLoading(true);
      await DB.initDB();

      const userId = await AsyncStorage.getItem("currentUserId");
      if (userId) {
          const userRes = await DB.executeSql("SELECT role FROM users WHERE id = ?", [userId]);
          if (userRes.rows.length > 0) {
              setCurrentUserRole(userRes.rows.item(0).role);
          }
      }

      await DB.autoCloseExpiredCourses(); 

      const rows = await DB.getCoursesLocal();
      setCourses(rows);
    } catch (e) {
      console.error("Lỗi load data:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadCoursesAndRole();
    }, [])
  );

  const updateVisibilityInDB = async (id: number, newValue: boolean, isForce: boolean = false) => {
    try {
      setUpdatingId(id);
      // Optimistic Update: Cập nhật state trước cho mượt
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isVisible: newValue } : c))
      );
      
      await DB.updateCourseVisibility(id, newValue, isForce);
    } catch (e) {
      console.error("Lỗi update isVisible:", e);
      // Revert nếu lỗi (Optional)
      loadCoursesAndRole();
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleVisibility = async (course: Course) => {
    const newValue = !course.isVisible;

    // Nếu đang tắt -> muốn BẬT lên
    if (newValue) {
        if (course.startDate) {
            const start = new Date(course.startDate);
            const now = new Date();
            
            if (start <= now) {
                if (currentUserRole !== 'admin') {
                    Alert.alert("Quyền hạn chế", "Khóa học đã quá hạn. Chỉ Admin mới có quyền mở lại.");
                    return;
                }
                setPendingCourseId(course.id!); 
                setExpiredModalVisible(true);   
                return; 
            }
        }
    }

    updateVisibilityInDB(course.id!, newValue, false);
  };

  const confirmForceOpen = () => {
      if (pendingCourseId) {
          updateVisibilityInDB(pendingCourseId, true, true); 
          setExpiredModalVisible(false);
          setPendingCourseId(null);
      }
  };

  const handleLongPress = (course: Course) => {
    setSelectedCourse(course);
    setModalVisible(true);
  };

  const onAskDelete = () => {
    setModalVisible(false); 
    setTimeout(() => {
        setDeleteModalVisible(true); 
    }, 300);
  };

  const confirmDelete = async () => {
    if (!selectedCourse) return;
    try {
      await DB.deleteCourseLocal(selectedCourse.id!);
      setDeleteModalVisible(false); 
      loadCoursesAndRole(); 
    } catch (e) {
      console.error("Lỗi xóa khóa học:", e);
    }
  };

  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 6 }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    }
  }, [modalVisible]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Danh sách khóa học</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : courses.length === 0 ? (
        <View style={styles.center}><Text style={{ color: colors.subtext }}>Chưa có khóa học nào.</Text></View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: 100, alignItems: "center" }}
          data={courses}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate("CourseDetailScreen", { course: item })}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={300}
              style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Image source={{ uri: item.image }} style={styles.courseImg} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>{item.title}</Text>
                {item.startDate && (
                    <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>
                        Bắt đầu: {new Date(item.startDate).toLocaleDateString('vi-VN')}
                    </Text>
                )}
                {/* Trạng thái hiển thị */}
                <Text style={{ fontSize: 11, marginTop: 4, fontWeight: 'bold', color: item.isVisible ? colors.success : colors.subtext }}>
                    {item.isVisible ? "• Đang hiển thị" : "• Đã ẩn"}
                </Text>
              </View>
              
              <View style={{ alignItems: "center", justifyContent: 'center' }}>
                {updatingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  // ✅ THAY THẾ: Dùng CustomSwitch thay vì Switch mặc định
                  <View style={{ transform: [{ scale: 0.9 }] }}>
                      <CustomSwitch
                        value={!!item.isVisible}
                        onValueChange={() => toggleVisibility(item)}
                        activeColor={colors.success} // Màu xanh khi bật
                        inActiveColor={colors.inactive} // Màu xám khi tắt
                      />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity onPress={() => navigation.navigate("AddCourseScreen")} activeOpacity={0.9} style={[styles.floatingAddBtn, { backgroundColor: colors.primary }]}>
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>+ Thêm Khóa Học</Text>
      </TouchableOpacity>

      {/* MODAL OPTIONS */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, { backgroundColor: colors.card, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Tùy chọn khóa học</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>{selectedCourse?.title || ""}</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={() => { setModalVisible(false); navigation.navigate("EditCourseScreen", { course: selectedCourse }); }}>
              <Text style={styles.modalBtnText}>Chỉnh sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ff4d4d" }]} onPress={onAskDelete}>
              <Text style={styles.modalBtnText}>Xóa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: isDark ? "#333" : "#e0e0e0" }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalBtnText, { color: colors.text }]}>Hủy</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL DELETE */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.alertContainer, { backgroundColor: colors.card }]}>
            <View style={{ marginBottom: 15, width: 50, height: 50, borderRadius: 25, backgroundColor: '#ffecec', justifyContent: 'center', alignItems: 'center' }}>
                 <Image source={require("../../assets/delete.png")} style={{width: 24, height: 24, tintColor: '#ff4d4d'}}/>
            </View>
            <Text style={[styles.alertTitle, { color: colors.text }]}>Xác nhận xóa</Text>
            <Text style={[styles.alertMessage, { color: colors.subtext }]}>Bạn có chắc chắn muốn xóa khóa học này?{"\n"}Tất cả các lịch học đã đăng ký của khóa học này cũng sẽ bị xóa khỏi lịch.</Text>
            <View style={styles.alertBtnContainer}>
              <TouchableOpacity style={[styles.alertBtn, { backgroundColor: isDark ? "#333" : "#f0f0f0" }]} onPress={() => setDeleteModalVisible(false)}>
                <Text style={[styles.alertBtnText, { color: colors.text }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertBtn, { backgroundColor: "#ff4d4d" }]} onPress={confirmDelete}>
                <Text style={[styles.alertBtnText, { color: "#fff" }]}>Xóa ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EXPIRED WARNING */}
      <Modal visible={expiredModalVisible} transparent animationType="fade" onRequestClose={() => setExpiredModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.alertContainer, { backgroundColor: colors.card }]}>
            <View style={{ marginBottom: 15, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255, 149, 0, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                 <Image source={require("../../assets/information.png")} style={{width: 24, height: 24, tintColor: '#FF9500'}}/>
            </View>
            <Text style={[styles.alertTitle, { color: colors.text }]}>Khóa học đã quá hạn</Text>
            <Text style={[styles.alertMessage, { color: colors.subtext }]}>
              Thời gian bắt đầu của khóa học này đã trôi qua.{"\n"}Bạn có chắc chắn muốn mở lại cho học viên đăng ký không?
            </Text>
            <View style={styles.alertBtnContainer}>
              <TouchableOpacity style={[styles.alertBtn, { backgroundColor: isDark ? "#333" : "#f0f0f0" }]} onPress={() => { setExpiredModalVisible(false); setPendingCourseId(null); }}>
                <Text style={[styles.alertBtnText, { color: colors.text }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertBtn, { backgroundColor: "#FF9500" }]} onPress={confirmForceOpen}>
                <Text style={[styles.alertBtnText, { color: "#fff" }]}>Mở lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 10, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  courseCard: { width: "100%", flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  courseImg: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: "#ddd" },
  floatingAddBtn: { position: "absolute", bottom: 30, alignSelf: 'center', width: 200, borderRadius: 30, paddingVertical: 12, alignItems: "center", justifyContent: "center", shadowColor: "#4da3ff", shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  modalContainer: { width: "90%", borderRadius: 24, paddingVertical: 25, paddingHorizontal: 20, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 5, textAlign: "center" },
  modalSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  modalBtn: { width: "100%", paddingVertical: 12, borderRadius: 12, marginTop: 10, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  modalBtnText: { fontWeight: "600", fontSize: 16, color: "#fff" },
  alertContainer: { width: "85%", borderRadius: 24, padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  alertTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: 'center' },
  alertMessage: { fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  alertBtnContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
  alertBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alertBtnText: { fontWeight: '700', fontSize: 15 }
});