import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DB, { RegisteredCourse } from "../../src/db/sqlite";
import { useTheme } from "../../src/context/ThemeContext";

export default function MyRegisteredCourseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Kiểm tra params
  const params = route.params as { course: RegisteredCourse } | undefined;
  const course = params?.course;

  // State đánh giá
  const [courseRating, setCourseRating] = useState(5);
  const [courseComment, setCourseComment] = useState("");
  const [ptRating, setPtRating] = useState(5);
  const [ptComment, setPtComment] = useState("");

  // ✅ Bảng màu đồng bộ với UserManagementScreen & CourseRatingScreen
  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    inputBg: isDark ? "#2C2C2E" : "#F2F2F7",
    primary: "#007AFF",
    starActive: "#FFC107",
    starInactive: isDark ? "#444" : "#ddd",
  };

  // Xử lý khi không có course
  if (!course) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header Lỗi */}
          <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
                    <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Chi tiết đánh giá</Text>
                <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.center}>
             <Text style={{ color: colors.subtext, marginTop: 20 }}>Không tìm thấy thông tin khóa học.</Text>
             <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 10, backgroundColor: colors.card, borderRadius: 8 }}>
                <Text style={{ color: colors.primary }}>Quay lại</Text>
             </TouchableOpacity>
          </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    try {
      const userId = await AsyncStorage.getItem("currentUserId");
      if (!userId) return;

      // 1. Lưu đánh giá khóa học
      await DB.addReview(
        Number(userId),
        course.course_id,
        course.course_title,
        courseRating,
        courseComment
      );

      // 2. Lưu đánh giá PT
      if (course.pt_name) {
        await DB.addPtReview(
          Number(userId),
          course.pt_name,
          ptRating,
          ptComment
        );
      }

      Alert.alert("Thành công", "Cảm ơn bạn đã đánh giá!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi gửi đánh giá.");
    }
  };

  const StarRating = ({ rating, onRate }: { rating: number; onRate: (r: number) => void }) => {
    return (
      <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 10 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onRate(star)} style={{ padding: 5 }}>
            <Text style={{ fontSize: 32, color: star <= rating ? colors.starActive : colors.starInactive }}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ✅ Custom Header giống UserManagementScreen */}
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

        <Text style={[styles.headerTitle, { color: colors.text }]}>Chi tiết đánh giá</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          
          {/* Thông tin khóa học */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.subtext }]}>KHÓA HỌC</Text>
            <Text style={[styles.courseName, { color: colors.text }]}>{course.course_title}</Text>
            <Text style={{ color: colors.subtext, marginTop: 4 }}>
                Ngày đăng ký: {new Date(course.created_at).toLocaleDateString("vi-VN")}
            </Text>
          </View>

          {/* Form đánh giá Khóa học */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Đánh giá Khóa học</Text>
            <Text style={{ textAlign: "center", color: colors.subtext }}>Chất lượng khóa học thế nào?</Text>
            
            <StarRating rating={courseRating} onRate={setCourseRating} />

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder="Viết cảm nhận về khóa học..."
              placeholderTextColor={colors.subtext}
              multiline
              value={courseComment}
              onChangeText={setCourseComment}
            />
          </View>

          {/* Form đánh giá PT */}
          {course.pt_name ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.rowBetween}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Đánh giá Huấn luyện viên</Text>
                </View>
                <Text style={{ textAlign: "center", color: colors.primary, fontWeight: 'bold', fontSize: 16, marginVertical: 5 }}>
                    {course.pt_name}
                </Text>
                
                <StarRating rating={ptRating} onRate={setPtRating} />

                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
                    placeholder={`Nhận xét về PT ${course.pt_name}...`}
                    placeholderTextColor={colors.subtext}
                    multiline
                    value={ptComment}
                    onChangeText={setPtComment}
                />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 20 }]}>
                <Text style={{color: colors.subtext}}>Khóa học này không có PT riêng.</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
            <Text style={styles.submitText}>Gửi đánh giá</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ✅ Header Styles (Đồng bộ)
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 10, paddingBottom: 10,
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

  // ✅ Card Style mới
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    // Shadow nhẹ
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  
  label: { fontSize: 12, fontWeight: "700", opacity: 0.7, marginBottom: 5 },
  courseName: { fontSize: 20, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 5 },
  
  input: {
    height: 100,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    textAlignVertical: "top",
    fontSize: 15,
  },
  
  submitBtn: {
    padding: 16,
    borderRadius: 16, // Bo góc mềm mại hơn
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#007AFF",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  
  rowBetween: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}
});