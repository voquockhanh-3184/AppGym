import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  StatusBar
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../src/context/ThemeContext";
import DB from "../../src/db/sqlite";

const { width } = Dimensions.get("window");

// ✅ Helper: Normalize Date for sorting
const parseDate = (dateStr: string, timeStr: string) => {
    try {
        if (!dateStr) return new Date(0);
        let d = new Date();
        // Handle DD/MM/YYYY
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            d.setFullYear(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } 
        // Handle YYYY-MM-DD
        else if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            d.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }

        // Handle Time (HH:mm)
        if (timeStr) {
            const timeParts = timeStr.split(':');
            d.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
        }
        return d;
    } catch (e) {
        return new Date(0);
    }
};

// ✅ Helper: Format display date
const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";
    if (dateString.includes('-') && dateString.split('-').length === 3) {
        const parts = dateString.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
};

export default function UserClassSessionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { courseId, courseTitle } = route.params || {};

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Modal
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    primary: "#007AFF",
    modalBg: isDark ? "#2C2C2E" : "#FFFFFF",
    successBg: isDark ? "rgba(52, 199, 89, 0.2)" : "#E8F5E9",
    successText: "#34C759",
    warningBg: isDark ? "rgba(255, 149, 0, 0.2)" : "#FFF3E0",
    warningText: "#FF9500",
    errorBg: isDark ? "rgba(255, 59, 48, 0.2)" : "#FFEBEE",
    errorText: "#FF3B30",
    pendingBg: isDark ? "rgba(142, 142, 147, 0.2)" : "#F2F2F7",
    pendingText: isDark ? "#A0A0A0" : "#8E8E93",
  };

  // ✅ FETCH DATA FUNCTION (FIX DUPLICATION BY CONTENT)
  const fetchClasses = useCallback(async () => {
    if (!courseId) {
        setLoading(false);
        return;
    }

    try {
      const currentUserId = await AsyncStorage.getItem("currentUserId");

      // 1. SQL Query
      const sql = `
        SELECT c.*, a.status, a.date as check_in_at
        FROM classes c
        LEFT JOIN attendance a ON c.id = a.class_id AND a.user_id = ? 
        WHERE c.course_id = ? 
      `;
      
      const res = await DB.executeSql(sql, [currentUserId, courseId]);

      // 🔥 2. DÙNG MAP ĐỂ LỌC TRÙNG
      const uniqueMap = new Map();

      for (let i = 0; i < res.rows.length; i++) {
        const item = res.rows.item(i);
        
        // Chuẩn hóa hiển thị ngày
        item.displayDate = formatDisplayDate(item.date); 
        
        // 🔑 SỬA LẠI: Tạo khóa duy nhất chuẩn xác hơn
        // Dùng displayDate thay vì item.date để tránh lệch định dạng (YYYY-MM-DD vs DD/MM/YYYY)
        // Dùng trim() để xóa khoảng trắng thừa ở tên và giờ
        const dateKey = item.displayDate; 
        const timeKey = item.time ? item.time.trim() : "";
        const nameKey = item.className ? item.className.trim() : "";

        // Tạo key chuẩn hóa
        const uniqueKey = `${dateKey}_${timeKey}_${nameKey}`;

        if (uniqueMap.has(uniqueKey)) {
            const existingItem = uniqueMap.get(uniqueKey);
            
            // Logic ưu tiên: Giữ lại item có status (đã điểm danh)
            // Nếu item cũ chưa có status, mà item mới có status -> Ghi đè
            if (!existingItem.status && item.status) {
                uniqueMap.set(uniqueKey, item);
            }
            // Ngược lại: Nếu item cũ đã có status rồi thì giữ nguyên, bỏ qua item mới (trùng nhưng ko có status)
        } else {
            // Chưa có khóa này trong Map -> Thêm mới
            uniqueMap.set(uniqueKey, item);
        }
      }

      // ... phần code sort và setClasses giữ nguyên ...
      const rawList = Array.from(uniqueMap.values());
      
      rawList.sort((a, b) => {
          const t1 = parseDate(a.date, a.time).getTime();
          const t2 = parseDate(b.date, b.time).getTime();
          return t1 - t2;
      });

      setClasses(rawList);

    } catch (e) {
      console.error("❌ Lỗi load danh sách lớp:", e);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useFocusEffect(
    useCallback(() => {
      fetchClasses();
    }, [fetchClasses])
  );

  const handleOpenDetail = (item: any) => {
      navigation.navigate('ClassDetailScreen', { classId: item.id });
  };

  const handleOpenInfo = (item: any) => {
      setSelectedItem(item);
      setModalVisible(true);
  }

  const formatCheckInTime = (dateString: string | null) => {
      if (!dateString) return "---";
      try {
          const timePart = dateString.split(' ')[1]; 
          return timePart || dateString;
      } catch (e) { return dateString; }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    let label = "Chưa điểm danh";
    let bg = colors.pendingBg;
    let txt = colors.pendingText;

    switch (status) {
        case 'present': label = "Đã có mặt"; bg = colors.successBg; txt = colors.successText; break;
        case 'late': label = "Đến trễ"; bg = colors.warningBg; txt = colors.warningText; break;
        case 'absent': label = "Vắng mặt"; bg = colors.errorBg; txt = colors.errorText; break;
    }

    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color: txt }]}>{label}</Text>
        </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => handleOpenDetail(item)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.cardHeader}>
         <View style={styles.rowInfo}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                <Image source={require("../../assets/calendar.png")} style={[styles.smallIcon, {tintColor: colors.subtext}]} />
            </View>
            <Text style={[styles.dateText, { color: colors.text }]}>
                {item.displayDate}
            </Text>
         </View>
         <StatusBadge status={item.status} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <View style={[styles.timeBox, { backgroundColor: isDark ? '#2C2C2E' : '#E3F2FD' }]}>
              <Text style={[styles.timeText, { color: colors.primary }]}>
                {item.time}
              </Text>
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.className, { color: colors.text }]} numberOfLines={1}>
                {item.className || "Buổi học"}
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Image source={require("../../assets/coach.png")} style={{width: 12, height: 12, tintColor: colors.subtext, marginRight: 4}} />
                <Text style={{fontSize: 12, color: colors.subtext}}>
                    {item.ptName || "HLV chưa cập nhật"}
                </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => handleOpenInfo(item)} style={{padding: 5}}>
             <Image source={require("../../assets/information.png")} style={{width: 20, height: 20, tintColor: colors.primary}} />
          </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.card} />

      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}
        >
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>

        <View style={{flex: 1, alignItems: 'center'}}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {courseTitle || "Lịch học chi tiết"}
            </Text>
        </View>

        <View style={{width: 40}} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={classes}
          extraData={classes} 
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()} 
          contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
          ListEmptyComponent={
            <View style={styles.center}>
                <Image source={require("../../assets/folder.png")} style={{width: 60, height: 60, tintColor: colors.subtext, opacity: 0.5, marginBottom: 10}} />
                <Text style={[styles.emptyText, { color: colors.subtext }]}>Chưa có lịch học nào.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)}
        >
            <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
                <View style={styles.modalIndicator} />
                
                {selectedItem && (
                    <View>
                        <View style={{alignItems: 'center', marginBottom: 20}}>
                            <StatusBadge status={selectedItem.status} />
                            <Text style={{color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 12, textAlign: 'center'}}>
                                {selectedItem.className}
                            </Text>
                        </View>

                        <View style={styles.infoContainer}>
                            <InfoRow label="Ngày học" value={selectedItem.displayDate} colors={colors} />
                            <InfoRow label="Giờ học" value={selectedItem.time} colors={colors} />
                            <InfoRow label="Huấn luyện viên" value={selectedItem.ptName} colors={colors} />
                            <InfoRow label="Phòng tập" value={selectedItem.facility} colors={colors} />
                            
                            {(selectedItem.status === 'present' || selectedItem.status === 'late') && (
                                <View style={[styles.checkInBox, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.1)' : '#E8F5E9' }]}>
                                    <Image source={require("../../assets/success.png")} style={{width: 16, height: 16, tintColor: '#34C759', marginRight: 8}} />
                                    <Text style={{color: '#34C759', fontWeight: '600'}}>
                                           Check-in lúc: {formatCheckInTime(selectedItem.check_in_at)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity 
                            style={[styles.closeButton, { backgroundColor: colors.primary }]}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, colors }: any) => (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
        <Text style={{color: colors.subtext, fontSize: 15}}>{label}</Text>
        <Text style={{color: colors.text, fontWeight: '600', fontSize: 15}}>{value || "---"}</Text>
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  header: { 
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", 
      paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 10, paddingBottom: 10, 
      borderBottomWidth: 1, elevation: 2, shadowOpacity: 0.1
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  card: { padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowInfo: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  smallIcon: { width: 16, height: 16, resizeMode: 'contain' },
  divider: { height: 1, width: '100%', marginVertical: 12, opacity: 0.5 },
  timeBox: { width: 60, height: 60, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  timeText: { fontWeight: 'bold', fontSize: 16 },
  dateText: { fontWeight: '700', fontSize: 15 },
  className: { fontSize: 16, fontWeight: "bold" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: "center", marginTop: 10, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 24, paddingBottom: 24, width: '100%' },
  modalIndicator: { width: 40, height: 5, backgroundColor: '#ccc', borderRadius: 3, alignSelf: 'center', marginBottom: 20, opacity: 0.5 },
  infoContainer: { marginTop: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  checkInBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginTop: 20 },
  closeButton: { marginTop: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }
});