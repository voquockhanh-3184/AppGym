import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Animated,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DB from "../../src/db/sqlite";
import { useTheme } from "../../src/context/ThemeContext";
import { scheduleClassNotification } from "../../src/utils/NotificationService";

const { width } = Dimensions.get("window");

const EMAIL_CONFIG = {
  SERVICE_ID: "service_j2xo7vo",
  TEMPLATE_ID: "template_rnxrhtj",
  PUBLIC_KEY: "TV_wkkXsahaPz5bfQ",
};

// ==============================================================
// 1. KHAI BÁO COMPONENT CARD
// ==============================================================
// ... (Giữ nguyên CardBack và CardFront như cũ)
const CardBack = ({ cvv }: any) => (
  <LinearGradient
    colors={["#2C3E50", "#000000"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.virtualCard, styles.cardBack]}
  >
    <View style={styles.magneticStrip} />
    <View style={styles.signatureRow}>
        <View style={styles.signaturePanelContainer}>
            <View style={styles.signaturePattern} />
            <View style={[styles.signaturePattern, { marginTop: 4 }]} />
            <View style={[styles.signaturePattern, { marginTop: 4 }]} />
        </View>
        <View style={styles.cvvBox}>
            <Text style={styles.cvvText}>{cvv || "***"}</Text>
        </View>
    </View>
    <Text style={styles.cvvLabel}>CVV/CVC</Text>
    <Image
      source={require("../../assets/visa_white.png")}
      style={styles.cardLogoBack}
      resizeMode="contain"
    />
  </LinearGradient>
);

const CardFront = ({ cardNumber, cardName, expiry }: any) => (
  <LinearGradient
    colors={["#1a2a6c", "#b21f1f", "#fdbb2d"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.virtualCard}
  >
    <View style={styles.cardRow}>
      <Image
        source={require("../../assets/chip.png")}
        style={styles.cardChip}
      />
      <Image
        source={require("../../assets/visa.png")}
        style={styles.cardLogo}
        resizeMode="contain"
      />
    </View>
    <Text style={styles.cardNumDisplay}>
      {cardNumber || "**** **** **** ****"}
    </Text>
    <View style={styles.cardRow}>
      <View>
        <Text style={styles.cardLabel}>CARD HOLDER</Text>
        <Text style={styles.cardVal}>
          {cardName.toUpperCase() || "YOUR NAME"}
        </Text>
      </View>
      <View>
        <Text style={styles.cardLabel}>EXPIRES</Text>
        <Text style={styles.cardVal}>{expiry || "MM/YY"}</Text>
      </View>
    </View>
  </LinearGradient>
);

// ==============================================================
// 2. MAIN SCREEN
// ==============================================================

export default function PaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { course } = route.params || {};

  // ANIMATION SETUP
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false); 

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card" | null>(null);

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const [processing, setProcessing] = useState(false);
  const [branchAddress, setBranchAddress] = useState("");

  // --- VOUCHER STATES ---
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    title: "",
    message: "",
    type: "error",
  });

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    inputBg: isDark ? "#2C2C2E" : "#F7F9FC",
    text: isDark ? "#FFFFFF" : "#1A1A1A",
    subtext: isDark ? "#A0A0A0" : "#8E8E93",
    primary: "#007AFF",
    border: isDark ? "#333" : "#E5E5EA",
    success: "#34C759",
    error: "#FF3B30",
    warning: "#FF9500",
    selectedBorder: "#007AFF",
    selectedBg: isDark ? "rgba(0, 122, 255, 0.15)" : "#F0F8FF",
  };

  // --- TÍNH TOÁN GIÁ ---
  const originalPrice = course?.price || 0;
  const discountAmount = appliedVoucher ? (originalPrice * appliedVoucher.percent) / 100 : 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  // 🔄 ANIMATION LOGIC
  const flipCard = (toValue: number) => {
    Animated.spring(flipAnim, {
      toValue: toValue,
      friction: 6,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (showCardModal) {
        setIsFlipped(false);
        flipAnim.setValue(0); 
    }
  }, [showCardModal]);

  useEffect(() => {
    flipCard(isFlipped ? 180 : 0);
  }, [isFlipped]);

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1] });

  const frontAnimatedStyle = { transform: [{ perspective: 1000 }, { rotateY: frontRotate }], opacity: frontOpacity };
  const backAnimatedStyle = { transform: [{ perspective: 1000 }, { rotateY: backRotate }], opacity: backOpacity };

  // DATA LOAD
  useEffect(() => {
    const loadData = async () => {
      try {
        await DB.initDB();
        const id = await AsyncStorage.getItem("currentUserId");
        if (id) {
          const allUsers = await DB.getAllUsersLocal();
          const found = allUsers.find((u: any) => String(u.id) === String(id));
          if (found) {
            setName(found.username || "");
            setEmail(found.email || "");
            setPhone(found.phone || "");
          }
        }
        if (course?.facility) {
          const branches = await DB.getAllGymBranches();
          const foundBranch = branches.find((b: any) => b.name === course.facility);
          if (foundBranch) setBranchAddress(foundBranch.address);
        }
      } catch (err) {
        console.error("Lỗi PaymentScreen:", err);
      }
    };
    loadData();
  }, []);

  const showAlert = (title: string, message: string, type: "error" | "warning" | "success" = "error") => {
    setAlertData({ title, message, type });
    setAlertVisible(true);
  };

  // --- LOGIC KIỂM TRA VOUCHER ---
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      showAlert("Lỗi", "Vui lòng nhập mã giảm giá.", "warning");
      return;
    }

    setIsCheckingVoucher(true);
    try {
      await DB.initDB();
      // Sử dụng hàm checkCouponValidity mới từ DB
      const result = await DB.checkCouponValidity(voucherCode);
      
      if (!result.valid) {
      setAppliedVoucher(null);
          // 👇 Thêm || "Lỗi không xác định" để xử lý trường hợp undefined
          showAlert("Không thể áp dụng", result.message || "Mã không hợp lệ", "error");
      } else {
          setAppliedVoucher(result.coupon);
          showAlert("Thành công", `Đã áp dụng mã giảm ${result.coupon.percent}%`, "success");
      }
    } catch (error) {
      console.log(error);
      showAlert("Lỗi", "Không thể kiểm tra mã lúc này.");
    } finally {
      setIsCheckingVoucher(false);
    }
  };

  const removeVoucher = () => {
      setAppliedVoucher(null);
      setVoucherCode("");
  };

  const sendEmailConfirmation = async (methodLabel: string) => {
    if (!email || !email.includes("@")) return;
    const emailParams = {
      to_name: name || "Khách hàng",
      to_email: email.trim(),
      course_title: course?.title || "Khóa học Gym",
      amount: finalPrice.toLocaleString() + " đ",
      payment_method: methodLabel,
      date: new Date().toLocaleDateString("vi-VN"),
      facility: course?.facility || "Cơ sở chính",
      pt_name: course?.ptName || "HLV",
    };
    const data = {
      service_id: EMAIL_CONFIG.SERVICE_ID,
      template_id: EMAIL_CONFIG.TEMPLATE_ID,
      user_id: EMAIL_CONFIG.PUBLIC_KEY,
      template_params: emailParams,
    };
    try {
      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const saveTransactionToDB = async (methodKey: string) => {
    try {
      const currentUserId = await AsyncStorage.getItem("currentUserId");
      let methodLabel = methodKey === "momo" ? "Ví MoMo" : "Thẻ ngân hàng";

      // 1. Lưu thanh toán
      await DB.addPayment({
        course_id: course?.id || 0,
        course_title: course?.title || "Khóa học",
        user_id: currentUserId || 0,
        user_name: name,
        amount: finalPrice, 
        payment_method: methodLabel,
        created_at: new Date().toISOString(),
      });

      // 2. 🟢 QUAN TRỌNG: Cập nhật số lượt dùng Voucher (nếu có áp dụng)
      if (appliedVoucher) {
          try {
              await DB.useCoupon(appliedVoucher.code);
              console.log(`✅ Voucher ${appliedVoucher.code} usage updated`);
          } catch (e) {
              console.error("❌ Failed to update voucher usage:", e);
          }
      }

      // 3. Tạo lịch học và thông báo (Giữ nguyên logic cũ)
      const isNotiEnabled = await AsyncStorage.getItem("classNotificationEnabled");
      const shouldScheduleNoti = isNotiEnabled === "true";

      if (course?.startDate && course?.endDate && course?.schedule) {
        try {
          const scheduleObj = JSON.parse(course.schedule);
          const targetDays = scheduleObj.days || [];
          const classTime = scheduleObj.time || "00:00";
          const dayMap: { [key: string]: number } = { CN: 0, T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6 };
          const start = new Date(course.startDate);
          const end = new Date(course.endDate);

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayIndex = d.getDay();
            if (targetDays.some((dayStr: string) => dayMap[dayStr] === dayIndex)) {
              const formattedDate = d.toLocaleDateString("vi-VN");
              const newClassId = await DB.addClassLocal({
                time: classTime,
                date: formattedDate,
                className: course.title,
                ptName: course.ptName,
                facility: course.facility || branchAddress,
                user_id: currentUserId,
                course_id: course.id,
              });
              if (currentUserId && newClassId) await DB.updateAttendanceStatus(newClassId, parseInt(currentUserId), "pending");
              if (shouldScheduleNoti && newClassId) {
                await scheduleClassNotification(newClassId, course.title, formattedDate, classTime);
              }
            }
          }
        } catch (e) { console.log("Lỗi tạo lịch:", e); }
      } else {
        const formattedDate = new Date().toLocaleDateString("vi-VN");
        const classTime = "09:00";
        const newClassId = await DB.addClassLocal({
          time: classTime,
          date: formattedDate,
          className: course?.title,
          ptName: course?.ptName,
          facility: branchAddress,
          user_id: currentUserId,
          course_id: course?.id,
        });
        if (currentUserId && newClassId) await DB.updateAttendanceStatus(newClassId, parseInt(currentUserId), "pending");
        if (shouldScheduleNoti && newClassId) {
          await scheduleClassNotification(newClassId, course?.title || "Lớp học", formattedDate, classTime);
        }
      }
      await sendEmailConfirmation(methodLabel);
    } catch (error) {
      console.error("System Error:", error);
      throw error; // Ném lỗi để hàm gọi biết là thất bại
    }
  };

  const processPayment = async (method: string) => {
    setProcessing(true);
    try {
      await saveTransactionToDB(method);
      // Giả lập độ trễ mạng một chút cho trải nghiệm thật hơn
      setTimeout(() => {
        setProcessing(false);
        navigation.replace("PaymentSuccessScreen", { 
            courseTitle: course?.title || "Khóa học",
            price: finalPrice, 
            facility: course?.facility || branchAddress
        });
      }, 1500);
    } catch (error) {
      setProcessing(false);
      showAlert("Lỗi thanh toán", "Quá trình thanh toán thất bại.");
    }
  };

  const handleConfirm = () => {
    if (!email || !email.includes("@")) return showAlert("Thiếu Email", "Tài khoản chưa có Email.", "warning");
    if (!phone || phone.length < 9) return showAlert("Thiếu thông tin", "Vui lòng nhập số điện thoại hợp lệ.");
    if (!paymentMethod) return showAlert("Chưa chọn phương thức", "Vui lòng chọn phương thức thanh toán.", "warning");

    if (paymentMethod === "card") {
      setShowCardModal(true);
      return;
    }
    processPayment(paymentMethod);
  };

  const handleCardPayment = () => {
    if (!cardNumber || cardNumber.length < 16) return showAlert("Thẻ không hợp lệ", "Số thẻ phải đủ 16 số.");
    if (!expiry || !cardName || !cvv) return showAlert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin thẻ.");
    setShowCardModal(false);
    processPayment("card");
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    const limited = cleaned.slice(0, 16);
    const parts = [];
    for (let i = 0; i < limited.length; i += 4) {
      parts.push(limited.slice(i, i + 4));
    }
    setCardNumber(parts.join(" "));
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    setExpiry(formatted);
  };

  const PaymentOption = ({ id, icon, label }: any) => {
    const isSelected = paymentMethod === id;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setPaymentMethod(id as any)}
        style={[
          styles.methodCard,
          {
            backgroundColor: isSelected ? colors.selectedBg : colors.card,
            borderColor: isSelected ? colors.selectedBorder : colors.border,
            borderWidth: isSelected ? 1.5 : 1,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image source={icon} style={styles.methodIcon} />
          <Text style={[styles.methodLabel, { color: colors.text, fontWeight: isSelected ? "700" : "500" }]}>
            {label}
          </Text>
        </View>
        <View style={[styles.radioCircle, { borderColor: isSelected ? colors.primary : colors.subtext }, isSelected && { backgroundColor: colors.primary }]}>
          {isSelected && <View style={styles.radioDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "---";
    try { return new Date(dateString).toLocaleDateString("vi-VN"); } catch (e) { return dateString; }
  };

  const renderVirtualCard = () => {
    return (
      <View style={styles.cardFlipContainer}>
        <Animated.View style={[styles.virtualCardFront, frontAnimatedStyle]}>
          <CardFront cardNumber={cardNumber} cardName={cardName} expiry={expiry} />
        </Animated.View>
        <Animated.View style={[styles.virtualCardBack, backAnimatedStyle]}>
          <CardBack cvv={cvv} />
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Thanh Toán</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 180, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* THÔNG TIN KHÓA HỌC */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Thông tin khóa học</Text>
        <View style={[styles.courseCard, { backgroundColor: colors.card, shadowColor: isDark ? "#000" : "#ccc" }]}>
          <View style={styles.courseHeader}>
            <Image source={require("../../assets/banner.png")} style={{ width: 40, height: 40, tintColor: colors.primary }} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.courseTitle, { color: colors.text }]}>{course?.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13 }}>{course?.facility || "Cơ sở chính"}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.subtext }}>Thời gian</Text>
            <Text style={{ color: colors.text, fontWeight: "600" }}>{formatDate(course?.startDate)} - {formatDate(course?.endDate)}</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Text style={{ color: colors.subtext }}>Huấn luyện viên</Text>
            <Text style={{ color: colors.text, fontWeight: "600" }}>{course?.ptName || "Chưa cập nhật"}</Text>
          </View>

          {/* VOUCHER SECTION */}
          <View style={{ marginTop: 15 }}>
            <Text style={{ color: colors.subtext, marginBottom: 8, fontSize: 13 }}>Mã ưu đãi</Text>
            <View style={{ flexDirection: 'row' }}>
                <TextInput
                    style={[styles.voucherInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    placeholder="Nhập mã voucher"
                    placeholderTextColor={colors.subtext}
                    value={voucherCode}
                    onChangeText={setVoucherCode}
                    editable={!appliedVoucher}
                    autoCapitalize="characters"
                />
                {appliedVoucher ? (
                    <TouchableOpacity style={styles.removeBtn} onPress={removeVoucher}>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: "600" }}>Hủy</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={[styles.applyBtn, { backgroundColor: colors.primary }]} 
                        onPress={handleApplyVoucher}
                        disabled={isCheckingVoucher}
                    >
                        {isCheckingVoucher ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: "600" }}>Áp dụng</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
            {appliedVoucher && (
                <Text style={{ color: colors.success, fontSize: 12, marginTop: 4 }}>
                    Đã áp dụng mã {appliedVoucher.code}: Giảm {appliedVoucher.percent}%
                </Text>
            )}
          </View>

          <View style={[styles.rowBetween, { marginTop: 15, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
            <Text style={{ color: colors.subtext }}>Tạm tính</Text>
            <Text style={{ color: colors.subtext, textDecorationLine: appliedVoucher ? "line-through" : "none" }}>
                {originalPrice.toLocaleString()} đ
            </Text>
          </View>
          
          {appliedVoucher && (
             <View style={[styles.rowBetween, { marginTop: 4 }]}>
                <Text style={{ color: colors.success }}>Giảm giá ({appliedVoucher.percent}%)</Text>
                <Text style={{ color: colors.success }}>- {discountAmount.toLocaleString()} đ</Text>
             </View>
          )}

          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>Tổng thanh toán</Text>
            <Text style={{ color: colors.primary, fontWeight: "bold", fontSize: 18 }}>
                {finalPrice.toLocaleString()} đ
            </Text>
          </View>
        </View>

        {/* THÔNG TIN LIÊN HỆ */}
        <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 0 }]}>Thông tin liên hệ</Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Image source={require("../../assets/user.png")} style={[styles.inputIcon, { tintColor: colors.subtext }]} />
            <TextInput style={[styles.input, { color: colors.text }]} value={name} editable={false} />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border, opacity: 0.7 }]}>
            <Image source={require("../../assets/email.png")} style={[styles.inputIcon, { tintColor: colors.subtext }]} />
            <TextInput 
                style={[styles.input, { color: colors.text }]} 
                value={email} 
                editable={false} 
                placeholder="Email (Cập nhật trong hồ sơ)" 
                placeholderTextColor={colors.subtext}
            />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Image source={require("../../assets/phone.png")} style={[styles.inputIcon, { tintColor: colors.subtext }]} />
            <TextInput 
                style={[styles.input, { color: colors.text }]} 
                value={phone} 
                onChangeText={setPhone} 
                placeholder="Số điện thoại" 
                placeholderTextColor={colors.subtext} 
                keyboardType="phone-pad"
            />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border, height: 80, alignItems: 'flex-start', paddingVertical: 12 }]}>
            <Image source={require("../../assets/edit.png")} style={[styles.inputIcon, { tintColor: colors.subtext, marginTop: 2 }]} />
            <TextInput 
                style={[styles.input, { color: colors.text, height: '100%', textAlignVertical: 'top' }]} 
                value={note} 
                onChangeText={setNote} 
                placeholder="Ghi chú thêm (tùy chọn)" 
                placeholderTextColor={colors.subtext}
                multiline
            />
        </View>

        {/* PHƯƠNG THỨC THANH TOÁN */}
        <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 0 }]}>Phương thức thanh toán</Text>
        <View style={{ gap: 12 }}>
          <PaymentOption id="momo" icon={require("../../assets/momo.png")} label="Ví điện tử MoMo" />
          <PaymentOption id="card" icon={require("../../assets/visa.png")} label="Thẻ ngân hàng / Visa" />
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: colors.subtext }}>Tổng thanh toán</Text>
          <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 16 }}>{finalPrice.toLocaleString()} đ</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={handleConfirm}>
          <LinearGradient colors={["#007AFF", "#0056b3"]} style={styles.payButton}>
            <Text style={styles.payButtonText}>THANH TOÁN NGAY</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* CUSTOM ALERT MODAL */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.alertBox, { backgroundColor: colors.card }]}>
            <View style={[styles.alertIconBox, {
                // Giữ nguyên màu nền nhạt
                backgroundColor: alertData.type === "success" ? "rgba(52, 199, 89, 0.1)" :
                                 alertData.type === "error" ? "rgba(255, 59, 48, 0.1)" :   
                                 "rgba(255,149,0,0.1)"
            }]}>
              <Image
                source={alertData.type === "success" ? require("../../assets/success.png") :
                        alertData.type === "error" ? require("../../assets/close.png") :
                        require("../../assets/information.png")}
                style={{
                    width: 32,  // Tăng kích thước nhẹ cho rõ
                    height: 32,
                    // ⚠️ SỬA ĐỔI QUAN TRỌNG TẠI ĐÂY:
                    // Nếu là lỗi (error/close.png), ta KHÔNG dùng tintColor để hiện ảnh gốc (dấu X trắng nền đỏ).
                    // Các icon khác nếu là dạng đen trắng thì vẫn tô màu bình thường.
                    tintColor: alertData.type === "error" ? undefined : 
                               (alertData.type === "success" ? colors.success : colors.warning)
                }}
                resizeMode="contain"
              />
            </View>
            
            <Text style={[styles.alertTitle, { color: colors.text }]}>{alertData.title}</Text>
            <Text style={[styles.alertMessage, { color: colors.subtext }]}>{alertData.message}</Text>
            
            <TouchableOpacity
                style={[styles.alertButton, {
                    backgroundColor: alertData.type === "success" ? colors.success :
                                     alertData.type === "error" ? colors.error :
                                     colors.primary 
                }]}
                onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODERN CARD MODAL */}
      <Modal visible={showCardModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={[styles.cardModalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nhập thông tin thẻ</Text>
              <TouchableOpacity onPress={() => setShowCardModal(false)}>
                <Image source={require("../../assets/close.png")} style={{ width: 24, height: 24, tintColor: colors.subtext }} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}} keyboardShouldPersistTaps="handled">
              {/* 🔄 FLIP CARD */}
              {renderVirtualCard()}

              <View style={{ marginTop: 20 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Số thẻ</Text>
                <TextInput 
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text }]} 
                    placeholder="0000 0000 0000 0000" 
                    placeholderTextColor={colors.subtext} 
                    keyboardType="number-pad" maxLength={19} 
                    value={cardNumber} 
                    onChangeText={formatCardNumber} 
                    onFocus={() => setIsFlipped(false)} 
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Tên chủ thẻ</Text>
                <TextInput 
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text }]} 
                    placeholder="NGUYEN VAN A" 
                    placeholderTextColor={colors.subtext} 
                    value={cardName} 
                    onChangeText={setCardName} 
                    autoCapitalize="characters" 
                    onFocus={() => setIsFlipped(false)} 
                />

                <View style={{ flexDirection: "row", gap: 15 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Ngày hết hạn</Text>
                    <TextInput 
                        style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text }]} 
                        placeholder="MM/YY" 
                        placeholderTextColor={colors.subtext} 
                        value={expiry} 
                        onChangeText={formatExpiry} 
                        maxLength={5} 
                        keyboardType="number-pad" 
                        onFocus={() => setIsFlipped(false)} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>CVV</Text>
                    <TextInput 
                        style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text }]} 
                        placeholder="123" 
                        placeholderTextColor={colors.subtext} 
                        value={cvv} 
                        onChangeText={setCvv} 
                        maxLength={3} 
                        keyboardType="number-pad"
                        secureTextEntry 
                        onFocus={() => setIsFlipped(true)} 
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity style={[styles.modalBtnMain, { backgroundColor: colors.primary, marginTop: 25 }]} onPress={handleCardPayment}>
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Xác nhận thanh toán</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Loading Modal */}
      <Modal visible={processing} transparent>
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingBox, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 15, color: colors.text, fontWeight: "600" }}>Đang xử lý giao dịch...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 50, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  sectionHeader: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  courseCard: { padding: 20, borderRadius: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 10 },
  courseHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  courseTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  divider: { height: 1, width: "100%", marginBottom: 15, opacity: 0.5 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginBottom: 12, height: 52 },
  inputIcon: { width: 20, height: 20, marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontWeight: "500" },
  methodCard: { flexDirection: "row", alignItems: "center", justifyContent: 'space-between', padding: 16, borderRadius: 16 },
  methodIcon: { width: 32, height: 32, resizeMode: "contain", marginRight: 12 },
  methodLabel: { fontSize: 15 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  payButton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  payButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 0.5 },
  
  // Styles mới cho voucher
  voucherInput: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, marginRight: 8 },
  applyBtn: { paddingHorizontal: 16, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  removeBtn: { paddingHorizontal: 16, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF3B30' },

  // Alert Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  alertBox: { width: "85%", borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
  alertIconBox: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  alertTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  alertMessage: { fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  alertButton: { width: "100%", paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  alertButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Card Modal Styles
  cardModalContainer: { width: "100%", borderRadius: 24, padding: 20, elevation: 10, position: "absolute", bottom: 0, maxHeight: '85%' },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  cardFlipContainer: { width: "100%", aspectRatio: 1.586, marginBottom: 10, position: "relative" },
  virtualCard: { width: "100%", height: "100%", borderRadius: 16, padding: 20, justifyContent: "space-between", backfaceVisibility: "hidden" },
  virtualCardFront: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backfaceVisibility: "hidden" },
  virtualCardBack: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backfaceVisibility: "hidden" },
  cardChip: { width: 40, height: 30, resizeMode: "contain" },
  cardLogo: { width: 60, height: 40 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardNumDisplay: { fontSize: 22, color: "#fff", letterSpacing: 2, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontWeight: "bold" },
  cardLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginBottom: 2 },
  cardVal: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  cardBack: { justifyContent: "flex-start", paddingTop: 25 },
  magneticStrip: { width: "100%", height: 45, backgroundColor: "#000", marginBottom: 20 },
  signatureRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  signaturePanelContainer: { flex: 1, height: 40, backgroundColor: '#fff', marginRight: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  signaturePattern: { width: '100%', height: 2, backgroundColor: '#ccc', marginVertical: 4 },
  cvvBox: { width: 60, height: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  cvvText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  cvvLabel: { color: '#fff', fontSize: 10, position: 'absolute', right: 20, top: 100 },
  cardLogoBack: { width: 60, height: 40, position: 'absolute', bottom: 15, right: 20, opacity: 0.8 },

  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 10 },
  modalInput: { borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  modalBtnMain: { width: "100%", padding: 16, borderRadius: 16, alignItems: "center", marginTop: 24, marginBottom: 10 },

  // Loading & Success
  loadingOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  loadingBox: { padding: 30, borderRadius: 20, alignItems: "center" },
});