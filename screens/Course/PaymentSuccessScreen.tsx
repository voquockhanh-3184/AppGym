import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
// ✅ Bỏ import Image vì không dùng nữa
import { useNavigation, useRoute } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
// ✅ Import LottieView
import LottieView from 'lottie-react-native';

import { useTheme } from "../../src/context/ThemeContext";

const { width } = Dimensions.get("window");

const PaymentSuccessScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { courseTitle, price, facility } = route.params || {};

  const now = useMemo(() => new Date(), []);
  
  const registrationDate = now.toLocaleDateString("vi-VN", {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  
  const registrationTime = now.toLocaleTimeString("vi-VN", {
    hour: '2-digit', minute: '2-digit'
  });

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A1A1A",
    subtext: isDark ? "#A0A0A0" : "#8E8E93",
    // success color vẫn giữ để dùng cho background circle
    success: "#34C759",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        
        {/* ✅ ANIMATION LOTTIE THÀNH CÔNG */}
        <View style={styles.iconContainer}>
            {/* Giữ lại vòng tròn nền mờ */}
            <View style={[styles.successCircle, { backgroundColor: "rgba(52, 199, 89, 0.1)" }]}>
                {/* Thay thế Image bằng LottieView */}
                {/* HÃY ĐẢM BẢO ĐƯỜNG DẪN FILE JSON ĐÚNG */}
                <LottieView
                    source={require("../../assets/Success Check.json")}
                    autoPlay={true}     // Tự động chạy khi load
                    loop={false}        // Chỉ chạy 1 lần rồi dừng (phù hợp với icon success)
                    speed={1.0}         // Tốc độ bình thường
                    style={styles.lottieAnimation} // Style mới cho Lottie
                    resizeMode="cover"  // Giúp animation lấp đầy không gian
                />
            </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Thanh toán thành công!</Text>
        <Text style={[styles.message, { color: colors.subtext }]}>
            Bạn đã đăng ký thành công khóa học.{'\n'}Chúng tôi đã gửi email xác nhận cho bạn.
        </Text>

        {/* BILL INFO - Không thay đổi */}
        <View style={[styles.billContainer, { backgroundColor: isDark ? "#2C2C2E" : "#F7F9FC" }]}>
            <View style={styles.row}>
                <Text style={[styles.label, { color: colors.subtext }]}>Khóa học</Text>
                <Text style={[styles.value, { color: colors.text }]}>{courseTitle}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
                <Text style={[styles.label, { color: colors.subtext }]}>Ngày đăng ký</Text>
                <Text style={[styles.value, { color: colors.text }]}>{registrationDate}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
                <Text style={[styles.label, { color: colors.subtext }]}>Giờ đăng ký</Text>
                <Text style={[styles.value, { color: colors.text }]}>{registrationTime}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
                <Text style={[styles.label, { color: colors.subtext }]}>Cơ sở</Text>
                <Text style={[styles.value, { color: colors.text }]}>{facility || "Cơ sở chính"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
                <Text style={[styles.label, { color: colors.subtext }]}>Tổng thanh toán</Text>
                <Text style={[styles.totalPrice, { color: "#007AFF" }]}>
                    {price ? price.toLocaleString() : "0"} đ
                </Text>
            </View>
        </View>

        {/* BUTTON VỀ TRANG CHỦ - Không thay đổi */}
        <TouchableOpacity 
            style={{ width: "100%", marginTop: 30 }}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("HomeScreen")}
        >
            <LinearGradient colors={["#007AFF", "#0056b3"]} style={styles.button}>
                <Text style={styles.buttonText}>VỀ TRANG CHỦ</Text>
            </LinearGradient>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    // overflow: 'hidden' // Đôi khi cần để animation không bị tràn ra ngoài hình tròn
  },
  // ✅ Style mới cho Lottie animation
  lottieAnimation: {
    width: 90,  // Để animation to hơn một chút so với container 80x80
    height: 90, // sẽ tạo hiệu ứng đẹp hơn, lấp đầy hình tròn.
  },
  // ❌ Đã xóa style successIcon cũ
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  billContainer: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    width: "100%",
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: '55%',
    textAlign: 'right'
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "bold",
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

export default PaymentSuccessScreen;