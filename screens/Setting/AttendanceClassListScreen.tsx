import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
  ListRenderItem,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../src/context/ThemeContext";
import DB from "../../src/db/sqlite";

interface ClassItemData {
  id: number;
  time: string;
  date: string;
  className: string;
  facility: string;
  ptName?: string;
  studentCount?: number; 
}

type RootStackParamList = {
  AttendanceScreen: { classId: number; className: string };
};

// ✅ HELPER: Hàm chuẩn hóa ngày về định dạng DD/MM/YYYY
const normalizeDate = (dateString: string) => {
    if (!dateString) return "";
    
    // Nếu là dạng YYYY-MM-DD (VD: 2026-01-04)
    if (dateString.includes('-')) {
        const parts = dateString.split('-'); // [2026, 01, 04]
        if (parts.length === 3) {
            // Trả về 04/01/2026
            return `${parts[2]}/${parts[1]}/${parts[0]}`; 
        }
    }
    
    // Nếu là dạng D/M/YYYY (VD: 4/1/2026) -> Thêm số 0 vào trước nếu cần để đồng bộ
    if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${day}/${month}/${year}`;
        }
    }

    return dateString;
};

export default function AttendanceClassListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [classes, setClasses] = useState<ClassItemData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const isFirstLoad = useRef(true);

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    primary: "#007AFF",
  };

  const loadClasses = async () => {
    if (isFirstLoad.current) {
        setLoading(true);
    }

    try {
      await DB.initDB();
      
      const currentUserId = await AsyncStorage.getItem("currentUserId");
      const users = await DB.getAllUsersLocal();
      const currentUser = users.find((u: any) => String(u.id) === String(currentUserId));

      const isTrainer = currentUser?.role === 'trainer';
      const trainerName = currentUser?.username;

      let rows = (await DB.getClassesLocal()) as ClassItemData[];

      // Lọc theo HLV nếu user hiện tại là Trainer
      if (isTrainer && trainerName) {
          rows = rows.filter(item => item.ptName === trainerName);
      }

      // ✅ FIX LỖI LẶP: Gom nhóm dựa trên ngày đã được chuẩn hóa
      const groupedMap = rows.reduce((acc: any, item) => {
        // 1. Chuẩn hóa ngày trước khi tạo key
        const stdDate = normalizeDate(item.date);
        
        // 2. Tạo khóa duy nhất (Dùng stdDate thay vì item.date gốc)
        const uniqueKey = `${item.className}_${stdDate}_${item.time}`;

        if (!acc[uniqueKey]) {
          acc[uniqueKey] = { 
              ...item, 
              date: stdDate, // Lưu lại ngày chuẩn để hiển thị đẹp
              studentCount: 1 
          };
        } else {
          acc[uniqueKey].studentCount += 1;
        }
        return acc;
      }, {});

      const groupedClasses = Object.values(groupedMap) as ClassItemData[];
      
      // (Tùy chọn) Sắp xếp lại danh sách theo ngày giảm dần hoặc tăng dần
      groupedClasses.sort((a, b) => {
          // Chuyển về timestamp để so sánh
          const dateA = a.date.split('/').reverse().join('-');
          const dateB = b.date.split('/').reverse().join('-');
          return dateA.localeCompare(dateB); // Tăng dần
      });

      setClasses(groupedClasses);
    } catch (error) {
      console.log("Error loading classes:", error);
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [])
  );

  const renderClassItem: ListRenderItem<ClassItemData> = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("AttendanceScreen", {
          classId: item.id,
          className: item.className,
        })
      }
    >
      <View style={styles.cardContent}>
        <View style={styles.dateBox}>
          {/* Ngày hiển thị giờ đã được chuẩn hóa đẹp */}
          <Text style={[styles.dateText, { color: colors.primary }]}>{item.date}</Text>
          <Text style={[styles.timeText, { color: colors.text }]}>{item.time}</Text>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.infoBox}>
          <Text style={[styles.className, { color: colors.text }]}>{item.className}</Text>
          <View style={styles.rowInfo}>
             <Image source={require("../../assets/location.png")} style={{ width: 12, height: 12, tintColor: colors.subtext, marginRight: 4 }} />
             <Text style={[styles.subtext, { color: colors.subtext }]}>{item.facility}</Text>
          </View>
          
          <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
             <Image source={require("../../assets/user.png")} style={{ width: 12, height: 12, tintColor: colors.primary, marginRight: 4 }} />
             <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>
                {item.studentCount} Học viên
             </Text>
          </View>

          {item.ptName ? (
             <Text style={[styles.ptText, { color: colors.subtext }]}>PT: {item.ptName}</Text>
          ) : null}
        </View>

        <Image 
            source={require("../../assets/right-arrow.png")} 
            style={{ width: 16, height: 16, tintColor: colors.subtext }} 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[
                styles.backBtn, 
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }
            ]}
        >
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Danh sách lớp học</Text>
        
        <View style={{ width: 40 }} />
      </View>

      {loading && classes.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item, index) => `${item.id}_${index}`} // Dùng index để đảm bảo key không trùng nếu id trùng
          renderItem={renderClassItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Image source={require("../../assets/folder.png")} style={{ width: 80, height: 80, opacity: 0.5, marginBottom: 10 }} resizeMode="contain" />
               <Text style={{ color: colors.subtext }}>Không tìm thấy lớp học nào.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2 
  },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  card: { borderRadius: 16, marginBottom: 12, padding: 16, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  dateBox: { alignItems: 'center', minWidth: 85 }, // Tăng width để chứa đủ ngày tháng
  dateText: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  timeText: { fontSize: 16, fontWeight: 'bold' },
  divider: { width: 1, height: 40, marginHorizontal: 16 },
  infoBox: { flex: 1 },
  className: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  rowInfo: { flexDirection: 'row', alignItems: 'center' },
  subtext: { fontSize: 13 },
  ptText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
});