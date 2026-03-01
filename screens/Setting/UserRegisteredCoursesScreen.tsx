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
  Platform, 
  StatusBar,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DB from "../../src/db/sqlite";

export default function UserRegisteredCoursesScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const colors = {
    background: isDark ? "#0d0d0d" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A1A1A",
    subtext: isDark ? "#A0A0A0" : "#8E8E93",
    border: isDark ? "#333" : "#E5E5EA",
    primary: "#007AFF",
    iconBg: isDark ? "#333" : "#E3F2FD",
  };

  // Sử dụng useFocusEffect để load lại dữ liệu mỗi khi màn hình được active
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchCourses = async () => {
        setLoading(true);
        try {
          const userId = await AsyncStorage.getItem("currentUserId");
          if (!userId) {
            setLoading(false);
            return;
          }

          // 1. Lấy thông tin User để biết Role và Username
          const userRes = await DB.executeSql("SELECT role, username FROM users WHERE id = ?", [userId]);
          if (userRes.rows.length === 0) return;
          
          const { role, username } = userRes.rows.item(0);

          let sql = "";
          let params = [];

          // ============================================================
          // 🟢 LOGIC LẤY KHÓA HỌC (ĐÃ CẬP NHẬT ĐỂ LỌC KHÓA ĐÃ XÓA)
          // ============================================================
          
          if (role === 'trainer') {
             // ✅ PT: Lấy các khóa học có lớp mà PT này dạy
             // JOIN với bảng courses: Nếu khóa học bị xóa, dòng này sẽ tự mất
             sql = `
                SELECT DISTINCT c.course_id, co.title as course_title, MAX(c.createdAt) as latest_date
                FROM classes c
                JOIN courses co ON c.course_id = co.id
                WHERE c.ptName = ?
                GROUP BY c.course_id
                ORDER BY latest_date DESC
             `;
             params = [username];

          } else {
             // ✅ HỌC VIÊN: Lấy từ bảng payments NHƯNG phải JOIN với courses
             // Câu lệnh JOIN này lọc bỏ các payment mà khóa học tương ứng không còn tồn tại trong bảng courses
             sql = `
                SELECT DISTINCT p.course_id, c.title as course_title, MAX(p.created_at) as latest_date 
                FROM payments p
                JOIN courses c ON p.course_id = c.id 
                WHERE p.user_id = ? 
                GROUP BY p.course_id 
                ORDER BY latest_date DESC
             `;
             params = [userId];
          }

          const res = await DB.executeSql(sql, params);
          
          const list = [];
          for (let i = 0; i < res.rows.length; i++) {
            list.push(res.rows.item(i));
          }
          
          if (isActive) {
             setCourses(list);
          }
        } catch (e) {
          console.error("Lỗi lấy khóa học:", e);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchCourses();

      return () => { isActive = false; };
    }, [])
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate("UserClassSessionsScreen", { 
          courseId: item.course_id, 
          courseTitle: item.course_title 
      })}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.iconBg }]}>
         <Image source={require("../../assets/banner.png")} style={{width: 24, height: 24, tintColor: colors.primary}} />
      </View>
      <View style={{flex: 1}}>
          <Text style={[styles.courseTitle, { color: colors.text }]}>{item.course_title}</Text>
          <Text style={[styles.subtext, { color: colors.subtext }]}>
            Cập nhật: {item.latest_date ? new Date(item.latest_date).toLocaleDateString('vi-VN') : '---'}
          </Text>
      </View>
      <Image source={require("../../assets/right-arrow.png")} style={{width: 16, height: 16, tintColor: colors.subtext}} />
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
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Lớp học của tôi</Text>
        <View style={{width: 40}} /> 
      </View>
      
      {loading ? (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
            data={courses}
            renderItem={renderItem}
            keyExtractor={(item) => item.course_id.toString()}
            contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Image 
                        source={require("../../assets/folder.png")} 
                        style={{width: 60, height: 60, tintColor: colors.subtext, marginBottom: 10, opacity: 0.5}} 
                        resizeMode="contain"
                    />
                    <Text style={[styles.emptyText, {color: colors.subtext}]}>
                        Bạn chưa có khóa học nào.
                    </Text>
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 10, paddingBottom: 10, borderBottomWidth: 1,
  },
  backBtn: { 
    width: 40, height: 40, justifyContent: "center", alignItems: "center",
    borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 
  },
  backIcon: { width: 20, height: 20, resizeMode: 'contain' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  card: { 
      flexDirection: 'row', alignItems: 'center', padding: 16, 
      borderRadius: 16, marginBottom: 12, borderWidth: 1,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  iconBox: { 
      width: 48, height: 48, borderRadius: 24, 
      justifyContent: 'center', alignItems: 'center', marginRight: 14 
  },
  courseTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  subtext: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', fontSize: 15, marginBottom: 20 },
});