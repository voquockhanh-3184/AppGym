import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
  TouchableWithoutFeedback
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import DB from "../../src/db/sqlite";        
import { useTheme } from "../../src/context/ThemeContext";

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
// 2. CUSTOM CALENDAR MODAL
// ==========================================
const CalendarModal = ({ visible, onClose, onSelectDate, isDark }: any) => {
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); 

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleSelect = (date: Date) => {
        setSelectedDate(date);
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        onSelectDate(`${d}/${m}/${y}`);
        onClose();
    };

    const bg = isDark ? "#2C2C2E" : "#FFFFFF";
    const text = isDark ? "#FFF" : "#000";

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'}}>
                <View style={{width: '90%', backgroundColor: bg, borderRadius: 20, padding: 20, elevation: 5}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                        <TouchableOpacity onPress={handlePrevMonth} style={{padding: 10}}>
                            <Text style={{fontSize: 20, color: text, fontWeight: 'bold'}}>{"<"}</Text>
                        </TouchableOpacity>
                        <Text style={{fontSize: 18, fontWeight: 'bold', color: text}}>
                            Tháng {month + 1} / {year}
                        </Text>
                        <TouchableOpacity onPress={handleNextMonth} style={{padding: 10}}>
                            <Text style={{fontSize: 20, color: text, fontWeight: 'bold'}}>{">"}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{flexDirection: 'row', marginBottom: 10}}>
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                            <Text key={d} style={{flex: 1, textAlign: 'center', fontWeight: 'bold', color: '#888'}}>{d}</Text>
                        ))}
                    </View>

                    <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                        {days.map((date, index) => {
                            if (!date) return <View key={index} style={{width: '14.28%', height: 40}} />;
                            
                            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                            const isToday = new Date().toDateString() === date.toDateString();

                            return (
                                <TouchableOpacity 
                                    key={index} 
                                    style={{
                                        width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center',
                                        backgroundColor: isSelected ? '#FF3B30' : isToday ? 'rgba(255, 59, 48, 0.1)' : 'transparent',
                                        borderRadius: 20
                                    }}
                                    onPress={() => handleSelect(date)}
                                >
                                    <Text style={{
                                        color: isSelected ? '#fff' : isToday ? '#FF3B30' : text,
                                        fontWeight: isSelected || isToday ? 'bold' : 'normal'
                                    }}>
                                        {date.getDate()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity onPress={onClose} style={{marginTop: 20, alignSelf: 'center', padding: 10}}>
                        <Text style={{color: '#888', fontWeight: '600'}}>Đóng</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ==========================================
// 3. MAIN SCREEN
// ==========================================

export default function CouponSettingScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [limit, setLimit] = useState(""); // 🆕 State cho giới hạn lượt dùng
  const [desc, setDesc] = useState("");
  const [expiry, setExpiry] = useState(""); 

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    inputBg: isDark ? "#2C2C2E" : "#F9FAFB",
    primary: "#FF3B30", 
    success: "#34C759",
    inactive: isDark ? "#3A3A3C" : "#E5E5EA",
    modalBg: isDark ? "#2C2C2E" : "#FFFFFF",
  };

  const loadCoupons = async () => {
    setLoading(true);
    try {
      await DB.initDB();
      const list = await DB.getCoupons();
      setCoupons(list);
    } catch (e) {
      console.error("Lỗi load coupon:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCoupons();
    }, [])
  );

  const formatDateForDB = (dateStr: string) => {
      const parts = dateStr.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return "";
  };

  const handleAddCoupon = async () => {
    // 🆕 Validate input gồm cả limit
    if (!code.trim() || !percent.trim() || !expiry.trim() || !limit.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin (bao gồm số lượt dùng)");
      return;
    }

    const discountValue = parseInt(percent);
    const limitValue = parseInt(limit);

    if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
      Alert.alert("Lỗi", "% Giảm giá không hợp lệ (1-100)");
      return;
    }

    if (isNaN(limitValue) || limitValue <= 0) {
        Alert.alert("Lỗi", "Số lượt sử dụng phải là số dương");
        return;
    }

    const dbDate = formatDateForDB(expiry);
    const dateObj = new Date(dbDate);
    if (isNaN(dateObj.getTime())) {
        Alert.alert("Lỗi", "Ngày hết hạn không hợp lệ");
        return;
    }

    try {
      // Gọi hàm DB với tham số limit
      await DB.addCoupon(code.toUpperCase().trim(), discountValue, desc.trim(), dbDate, limitValue);
      
      setModalVisible(false);
      setSuccessModalVisible(true);
      
      resetForm();
      loadCoupons();
    } catch (error) {
      console.log(error);
      Alert.alert("Lỗi", "Có lỗi xảy ra hoặc mã code đã tồn tại.");
    }
  };

  const handleToggleStatus = async (item: any) => {
      try {
          setCoupons(prev => prev.map(c => c.id === item.id ? {...c, is_active: c.is_active === 1 ? 0 : 1} : c));
          await DB.toggleCouponStatus(item.id, item.is_active); 
      } catch (e) {
          console.error(e);
          loadCoupons();
      }
  };

  const handleDelete = (id: number) => {
    setIdToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (idToDelete !== null) {
        try {
            await DB.deleteCoupon(idToDelete);
            loadCoupons();
        } catch (e) {
            console.error(e);
        } finally {
            setDeleteModalVisible(false);
            setIdToDelete(null);
        }
    }
  };

  const resetForm = () => {
      setCode(""); setPercent(""); setDesc(""); setExpiry(""); setLimit("");
  }

  const isExpired = (dateStr: string) => {
      if (!dateStr) return false;
      const today = new Date();
      today.setHours(0,0,0,0);
      return new Date(dateStr) < today;
  };

  const renderItem = ({ item }: { item: any }) => {
    const expired = isExpired(item.expiry_date);
    const isActive = item.is_active === 1;
    
    // Tính toán trạng thái sử dụng
    const used = item.usage_count || 0; 
    const maxLimit = item.usage_limit || item.limit || 9999; 
    const isOutOfLimit = used >= maxLimit;

    let statusColor = colors.success;
    let statusText = "Đang hoạt động";

    if (!isActive) {
        statusColor = colors.subtext;
        statusText = "Đã tắt";
    } else if (expired) {
        statusColor = colors.primary;
        statusText = "Đã hết hạn";
    } else if (isOutOfLimit) {
        statusColor = colors.subtext;
        statusText = "Đã hết lượt";
    }

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: isActive ? 1 : 0.6 }]}>
        <View style={styles.cardContent}>
            
            <View style={[styles.iconContainer, { backgroundColor: statusColor + "15" }]}>
                <Image 
                    source={require("../../assets/ticket.png")} 
                    style={{ width: 24, height: 24, tintColor: statusColor }} 
                    resizeMode="contain" 
                />
            </View>

            <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Text style={[styles.codeText, { color: colors.text, textDecorationLine: !isActive ? 'line-through' : 'none' }]}>
                        {item.code}
                    </Text>
                    {isActive && !expired && !isOutOfLimit && (
                        <View style={[styles.percentBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.percentText}>-{item.percent}%</Text>
                        </View>
                    )}
                </View>
                
                <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }} numberOfLines={1}>
                    {item.description || "Voucher ưu đãi"}
                </Text>

                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 12}}>
                     {/* Ngày hết hạn */}
                     <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Image source={require("../../assets/calendar.png")} style={{width: 12, height: 12, tintColor: colors.subtext, marginRight: 4}} />
                        <Text style={{fontSize: 11, color: colors.subtext}}>
                            {item.expiry_date ? item.expiry_date.split('-').reverse().join('/') : '--'}
                        </Text>
                     </View>

                     {/* Số lượt sử dụng */}
                     <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Image source={require("../../assets/user.png")} style={{width: 12, height: 12, tintColor: colors.subtext, marginRight: 4}} />
                        <Text style={{fontSize: 11, color: colors.subtext}}>
                           {used} / {maxLimit} lượt
                        </Text>
                     </View>
                </View>

                 <Text style={{fontSize: 11, fontWeight: 'bold', color: statusColor, marginTop: 6}}>
                    • {statusText}
                 </Text>
            </View>

            <View style={{alignItems: 'center', justifyContent: 'center', gap: 12}}>
                 <View style={{ transform: [{ scale: 0.9 }] }}>
                    <CustomSwitch 
                        value={isActive} 
                        onValueChange={() => handleToggleStatus(item)}
                        activeColor={colors.success}
                        inActiveColor={colors.inactive}
                    />
                 </View>

                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{padding: 4}}>
                    <Image 
                        source={require("../../assets/delete.png")} 
                        style={{ width: 20, height: 20, tintColor: "#FF3B30", opacity: 0.8 }} 
                    />
                </TouchableOpacity>
            </View>
        </View>
        </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}
        >
            <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quản lý Voucher</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
            data={coupons}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Image source={require("../../assets/ticket.png")} style={{ width: 60, height: 60, tintColor: colors.subtext, opacity: 0.5, marginBottom: 10 }} />
                <Text style={{ color: colors.subtext }}>Chưa có mã giảm giá nào.</Text>
            </View>
            }
        />
      )}

      {/* FAB Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal Thêm Mã */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{width: '100%', alignItems: 'center'}}>
            <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
              <View style={styles.modalIndicator} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tạo Voucher Mới</Text>
              
              <View style={{width: '100%'}}>
                  {/* Mã Code */}
                  <Text style={[styles.label, {color: colors.subtext}]}>Mã Code <Text style={{color: 'red'}}>*</Text></Text>
                  <TextInput
                    placeholder="VD: SALE50"
                    placeholderTextColor={colors.subtext}
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={code}
                    onChangeText={(text) => setCode(text.toUpperCase())}
                    autoCapitalize="characters"
                  />

                  {/* 🆕 Row: Giảm giá & Lượt dùng */}
                  <View style={{flexDirection: 'row', gap: 10}}>
                      <View style={{flex: 1}}>
                          <Text style={[styles.label, {color: colors.subtext}]}>Giảm (%) <Text style={{color: 'red'}}>*</Text></Text>
                          <TextInput
                            placeholder="20"
                            placeholderTextColor={colors.subtext}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                            value={percent}
                            onChangeText={setPercent}
                            keyboardType="numeric" maxLength={3}
                          />
                      </View>
                      <View style={{flex: 1}}>
                          <Text style={[styles.label, {color: colors.subtext}]}>Lượt dùng <Text style={{color: 'red'}}>*</Text></Text>
                          <TextInput
                            placeholder="100"
                            placeholderTextColor={colors.subtext}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                            value={limit}
                            onChangeText={setLimit}
                            keyboardType="numeric" maxLength={5}
                          />
                      </View>
                  </View>

                  {/* Hết hạn */}
                  <Text style={[styles.label, {color: colors.subtext}]}>Hết hạn <Text style={{color: 'red'}}>*</Text></Text>
                  <TouchableOpacity onPress={() => setCalendarVisible(true)}>
                      <View style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, justifyContent: 'center' }]}>
                          <Text style={{ color: expiry ? colors.text : colors.subtext }}>
                              {expiry || "Chọn ngày hết hạn"}
                          </Text>
                      </View>
                  </TouchableOpacity>

                  {/* Mô tả */}
                  <Text style={[styles.label, {color: colors.subtext}]}>Mô tả</Text>
                  <TextInput
                    placeholder="VD: Giảm giá mùa hè"
                    placeholderTextColor={colors.subtext}
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={desc}
                    onChangeText={setDesc}
                  />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.cancelBtn, {backgroundColor: colors.border}]} onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Text style={[styles.cancelText, {color: colors.text}]}>Hủy bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleAddCoupon}>
                  <Text style={styles.submitText}>Lưu Voucher</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal Xóa */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: colors.modalBg }]}>
                <View style={styles.deleteIconContainer}>
                    <Image source={require("../../assets/delete.png")} style={{width: 28, height: 28, tintColor: '#FF3B30'}} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>Xác nhận xóa</Text>
                <Text style={[styles.deleteMessage, { color: colors.subtext }]}>
                    Bạn có chắc chắn muốn xóa mã giảm giá này không? Hành động này không thể hoàn tác.
                </Text>
                <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.border, marginRight: 10 }]} onPress={() => setDeleteModalVisible(false)}>
                        <Text style={[styles.cancelText, { color: colors.text }]}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#FF3B30' }]} onPress={confirmDelete}>
                        <Text style={styles.submitText}>Xóa ngay</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Modal Thành Công */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: colors.modalBg }]}>
                <View style={[styles.deleteIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                    <Image source={require("../../assets/success.png")} style={{width: 32, height: 32, tintColor: '#34C759'}} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>Thành công!</Text>
                <Text style={[styles.deleteMessage, { color: colors.subtext }]}>
                    Mã giảm giá mới đã được tạo thành công.
                </Text>
                <View style={styles.modalButtons}>
                    <TouchableOpacity 
                        style={[styles.submitBtn, { backgroundColor: colors.success, width: '100%' }]} 
                        onPress={() => setSuccessModalVisible(false)}
                    >
                        <Text style={styles.submitText}>Hoàn tất</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Modal Lịch */}
      <CalendarModal 
          visible={calendarVisible} 
          onClose={() => setCalendarVisible(false)} 
          onSelectDate={setExpiry}
          isDark={isDark}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 10, paddingBottom: 10, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  
  card: { borderRadius: 16, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  cardContent: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  iconContainer: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  codeText: { fontSize: 16, fontWeight: '700' },
  percentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  percentText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  fab: { position: "absolute", bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
  fabText: { fontSize: 30, color: "#fff", marginTop: -4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 24, padding: 24, paddingBottom: 30, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalIndicator: { width: 40, height: 5, backgroundColor: '#ccc', borderRadius: 3, marginBottom: 20, opacity: 0.5 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 13, marginBottom: 6, marginLeft: 4, fontWeight: '600' },
  input: { width: '100%', height: 48, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, fontSize: 15, borderWidth: 1 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, marginRight: 10 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { fontSize: 15, color: '#fff', fontWeight: 'bold' },

  deleteModalContent: {
      width: '85%', 
      borderRadius: 24, 
      padding: 24, 
      alignItems: 'center', 
      shadowColor: "#000", 
      shadowOpacity: 0.25, 
      shadowRadius: 10, 
      elevation: 10 
  },
  deleteIconContainer: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: 'rgba(255, 59, 48, 0.1)', 
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 16
  },
  deleteMessage: {
      fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22
  }
});