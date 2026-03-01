import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "../../src/context/ThemeContext";
import DB from "../../src/db/sqlite";
import { launchImageLibrary } from "react-native-image-picker";

const { width } = Dimensions.get("window");

// Map thứ để xử lý logic tính ngày
const dayMap: { [key: string]: number } = { "CN": 0, "T2": 1, "T3": 2, "T4": 3, "T5": 4, "T6": 5, "T7": 6 };

// ==========================================
// 1. CUSTOM CALENDAR MODAL
// ==========================================
const CalendarModal = ({ visible, onClose, onSelectDate, isDark, title }: any) => {
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); 

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const bg = isDark ? "#2C2C2E" : "#FFFFFF";
    const text = isDark ? "#FFF" : "#000";

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={{width: '90%', backgroundColor: bg, borderRadius: 20, padding: 20, elevation: 5}}>
                    <Text style={{textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: text, marginBottom: 15}}>{title || "Chọn ngày"}</Text>
                    
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                        <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month - 1, 1))} style={{padding: 10}}>
                            <Text style={{fontSize: 20, color: text, fontWeight: 'bold'}}>{"<"}</Text>
                        </TouchableOpacity>
                        <Text style={{fontSize: 18, fontWeight: 'bold', color: text}}>Tháng {month + 1} / {year}</Text>
                        <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month + 1, 1))} style={{padding: 10}}>
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
                            return (
                                <TouchableOpacity 
                                    key={index} 
                                    style={{
                                        width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center',
                                        backgroundColor: isSelected ? '#4da3ff' : 'transparent', borderRadius: 20
                                    }}
                                    onPress={() => { setSelectedDate(date); onSelectDate(date); onClose(); }}
                                >
                                    <Text style={{color: isSelected ? '#fff' : text}}>{date.getDate()}</Text>
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
// 2. CUSTOM TIME PICKER MODAL
// ==========================================
const TimePickerModal = ({ visible, onClose, onSelectTime, isDark, initialTime }: any) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const [selectedHour, setSelectedHour] = useState(initialTime ? initialTime.getHours() : 9);
    const [selectedMinute, setSelectedMinute] = useState(initialTime ? initialTime.getMinutes() : 0);

    const bg = isDark ? "#2C2C2E" : "#FFFFFF";
    const text = isDark ? "#FFF" : "#000";
    const itemBg = isDark ? "#3A3A3C" : "#F2F2F7";

    const handleConfirm = () => {
        const newTime = new Date();
        newTime.setHours(selectedHour);
        newTime.setMinutes(selectedMinute);
        newTime.setSeconds(0);
        onSelectTime(newTime);
        onClose();
    };

    const renderItem = (item: number, isSelected: boolean, onSelect: any) => (
        <TouchableOpacity 
            onPress={() => onSelect(item)}
            style={{
                paddingVertical: 12, paddingHorizontal: 20, margin: 4, borderRadius: 10,
                backgroundColor: isSelected ? '#4da3ff' : itemBg,
                alignItems: 'center', justifyContent: 'center', width: 60
            }}
        >
            <Text style={{ color: isSelected ? '#fff' : text, fontSize: 16, fontWeight: isSelected ? 'bold' : 'normal' }}>
                {item.toString().padStart(2, '0')}
            </Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={{width: '85%', backgroundColor: bg, borderRadius: 24, padding: 24, elevation: 10, maxHeight: '70%'}}>
                    <Text style={{textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: text, marginBottom: 20}}>Chọn giờ học</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-around', height: 250}}>
                        <View style={{alignItems: 'center', flex: 1}}>
                            <Text style={{color: '#888', marginBottom: 10}}>Giờ</Text>
                            <FlatList 
                                data={hours} keyExtractor={i => `h-${i}`} showsVerticalScrollIndicator={false}
                                initialScrollIndex={selectedHour > 2 ? selectedHour - 2 : 0}
                                getItemLayout={(data, index) => ({ length: 50, offset: 50 * index, index })}
                                renderItem={({item}) => renderItem(item, item === selectedHour, setSelectedHour)}
                            />
                        </View>
                        <View style={{justifyContent: 'center', paddingBottom: 20}}><Text style={{fontSize: 30, fontWeight: 'bold', color: text}}>:</Text></View>
                        <View style={{alignItems: 'center', flex: 1}}>
                            <Text style={{color: '#888', marginBottom: 10}}>Phút</Text>
                            <FlatList 
                                data={minutes} keyExtractor={i => `m-${i}`} showsVerticalScrollIndicator={false}
                                initialScrollIndex={selectedMinute > 2 ? selectedMinute - 2 : 0}
                                getItemLayout={(data, index) => ({ length: 50, offset: 50 * index, index })}
                                renderItem={({item}) => renderItem(item, item === selectedMinute, setSelectedMinute)}
                            />
                        </View>
                    </View>
                    <View style={{flexDirection: 'row', marginTop: 25, justifyContent: 'space-between'}}>
                        <TouchableOpacity onPress={onClose} style={[styles.modalBtn, {borderWidth: 1, borderColor: '#ccc'}]}><Text style={{color: text}}>Hủy</Text></TouchableOpacity>
                        <TouchableOpacity onPress={handleConfirm} style={[styles.modalBtn, {backgroundColor: '#4da3ff'}]}><Text style={{color: '#fff', fontWeight: 'bold'}}>Xác nhận</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ==========================================
// 3. MAIN EDIT SCREEN
// ==========================================

export default function EditCourseScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { course } = route.params || {};
  
  // -- STATES --
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [ptName, setPtName] = useState("");
  const [price, setPrice] = useState("");
  const [sessions, setSessions] = useState("");
  
  // Date & Time Logic States
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [classTime, setClassTime] = useState<Date | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Modals Visibility
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [targetDateType, setTargetDateType] = useState<'start' | 'end'>('start');

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const colors = {
    bg: isDark ? "#121212" : "#f8f9fb",
    card: isDark ? "#1c1c1e" : "#fff",
    text: isDark ? "#fff" : "#000",
    textSecondary: isDark ? "#aaa" : "#555",
    border: isDark ? "#333" : "#ddd",
    accent: "#4da3ff",
    selectedDayBg: "#4da3ff",
    unselectedDayBg: isDark ? "#333" : "#eee",
  };

  useEffect(() => {
    if (course) {
      setTitle(course.title || "");
      setDescription(course.description || "");
      setImage(course.image || "");
      setPtName(course.ptName || "");
      setPrice(String(course.price ?? ""));
      setSessions(String(course.sessions ?? ""));

      // Parse dates
      if (course.startDate) setStartDate(new Date(course.startDate));
      if (course.endDate) setEndDate(new Date(course.endDate));

      // Parse schedule JSON (days & time)
      if (course.schedule) {
        try {
            const parsedSchedule = JSON.parse(course.schedule);
            if (parsedSchedule.days) setSelectedDays(parsedSchedule.days);
            if (parsedSchedule.time) {
                // "HH:mm" -> Date object
                const [h, m] = parsedSchedule.time.split(':');
                const t = new Date();
                t.setHours(parseInt(h), parseInt(m), 0);
                setClassTime(t);
            }
        } catch (e) {
            console.log("Error parsing schedule:", e);
        }
      }
    }
  }, [course]);

  // Logic: Tính ngày kết thúc
  const calculateEndDateFromSessions = (start: Date, days: string[], totalSessions: number) => {
    if (totalSessions <= 0 || !start || days.length === 0) return start;
    let count = 0;
    let current = new Date(start);
    let resultDate = new Date(start);
    let safetyLoop = 0; 
    while (count < totalSessions && safetyLoop < 3650) { 
      const dayIndex = current.getDay();
      const isClassDay = days.some(d => dayMap[d] === dayIndex);
      if (isClassDay) {
        count++;
        if (count === totalSessions) { resultDate = new Date(current); break; }
      }
      current.setDate(current.getDate() + 1);
      safetyLoop++;
    }
    return resultDate;
  };

  // Logic: Toggle thứ
  const toggleDay = (day: string) => {
      let newDays;
      if (selectedDays.includes(day)) newDays = selectedDays.filter(d => d !== day);
      else newDays = [...selectedDays, day];
      
      setSelectedDays(newDays);

      // Recalculate End Date if sessions exist
      if (startDate && sessions && parseInt(sessions) > 0) {
          const newEnd = calculateEndDateFromSessions(startDate, newDays, parseInt(sessions));
          setEndDate(newEnd);
      }
  };

  // Logic: Chọn ngày từ Modal
  const handleDateConfirm = (date: Date) => {
      if (targetDateType === 'start') {
          setStartDate(date);
          // Recalculate End Date
          if (sessions && parseInt(sessions) > 0) {
              const newEnd = calculateEndDateFromSessions(date, selectedDays, parseInt(sessions));
              setEndDate(newEnd);
          } else {
              // Nếu không có sessions, reset endDate hoặc giữ nguyên logic tùy ý (ở đây chọn start thì reset end nếu end < start)
              if (endDate && endDate < date) setEndDate(null);
          }
      } else {
          setEndDate(date);
          setSessions(""); // Nếu chọn ngày kết thúc thủ công, xóa số buổi tự động
      }
  };

  // Logic: Thay đổi số buổi
  const handleSessionsChange = (text: string) => {
      setSessions(text);
      const sessNum = parseInt(text);
      if (startDate && sessNum > 0 && selectedDays.length > 0) {
          const newEnd = calculateEndDateFromSessions(startDate, selectedDays, sessNum);
          setEndDate(newEnd);
      }
  };

  const handleChooseImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 1 });
      if (result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri || "");
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) { Alert.alert("Lỗi", "Vui lòng nhập tên khóa học!"); return; }
    if (!startDate) { Alert.alert("Lỗi", "Vui lòng chọn ngày bắt đầu!"); return; }
    if (!classTime) { Alert.alert("Lỗi", "Vui lòng chọn giờ học!"); return; }
    if (selectedDays.length === 0) { Alert.alert("Lỗi", "Vui lòng chọn lịch học trong tuần!"); return; }

    try {
      setLoading(true);

      // Prepare Schedule JSON
      const timeString = classTime.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
      const scheduleObj = { days: selectedDays, time: timeString };

      const sql = `
        UPDATE courses
        SET title=?, description=?, image=?, ptName=?, price=?, sessions=?, startDate=?, endDate=?, schedule=?
        WHERE id=?;
      `;
      
      await DB.executeSql(sql, [
        title,
        description,
        image,
        ptName,
        parseFloat(price) || 0,
        parseInt(sessions) || 0,
        startDate.toISOString(),
        endDate ? endDate.toISOString() : "",
        JSON.stringify(scheduleObj),
        course.id,
      ]);

      setSuccessVisible(true);
      setTimeout(() => {
        setSuccessVisible(false);
        navigation.goBack();
      }, 1600);
    } catch (e) {
      console.error("Lỗi cập nhật khóa học:", e);
      Alert.alert("❌ Lỗi", "Không thể cập nhật. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.fixedHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require("../../assets/back.png")} style={{ width: 26, height: 26, tintColor: colors.text }} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chỉnh sửa khóa học</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 110, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Ảnh */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleChooseImage}>
          {image ? (
            <View>
              <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity style={styles.changeImageBtn} onPress={handleChooseImage}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Thay ảnh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.imagePreview, { justifyContent: "center", alignItems: "center", backgroundColor: colors.border }]}>
              <Text style={{ color: "#888" }}>📷 Chọn ảnh từ thư viện</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Thông tin cơ bản */}
        <Text style={styles.label}>Tên khóa học</Text>
        <TextInput 
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={title} onChangeText={setTitle} placeholder="Nhập tên khóa học" placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Huấn luyện viên (PT)</Text>
        <TextInput 
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={ptName} onChangeText={setPtName} placeholder="Nhập tên PT" placeholderTextColor={colors.textSecondary}
        />

        {/* ================================================= */}
        {/* PHẦN GIỜ VÀ LỊCH HỌC (Updated like AddCourse) */}
        {/* ================================================= */}
        
        <Text style={styles.label}>Giờ học (Time)</Text>
        <TouchableOpacity 
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }]} 
            onPress={() => setTimePickerVisible(true)}
        >
            <Text style={{ color: classTime ? colors.accent : colors.textSecondary }}>
                {classTime 
                    ? `🕒 ${classTime.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}` 
                    : "Chọn giờ học bắt đầu"}
            </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Lịch học trong tuần</Text>
        <View style={styles.weekDaysContainer}>
            {weekDays.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                    <TouchableOpacity key={day} 
                        style={[styles.dayButton, { backgroundColor: isSelected ? colors.selectedDayBg : colors.unselectedDayBg }]} 
                        onPress={() => toggleDay(day)}
                    >
                        <Text style={{ color: isSelected ? '#fff' : colors.textSecondary, fontWeight: 'bold' }}>{day}</Text>
                    </TouchableOpacity>
                )
            })}
        </View>

        <Text style={styles.label}>Giá & Số buổi</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="Giá (VNĐ)" placeholderTextColor={colors.textSecondary} keyboardType="numeric"
            value={price} onChangeText={setPrice}
          />
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="Số buổi" placeholderTextColor={colors.textSecondary} keyboardType="numeric"
            value={sessions} onChangeText={handleSessionsChange}
          />
        </View>

        <Text style={styles.label}>Thời gian (Bắt đầu - Kết thúc)</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            style={[styles.input, { flex: 1, justifyContent: "center", backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { setTargetDateType('start'); setCalendarVisible(true); }}
          >
            <Text style={{ color: startDate ? colors.accent : colors.textSecondary }}>
              {startDate ? `BĐ: ${startDate.toLocaleDateString("vi-VN")}` : "Ngày bắt đầu"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.input, { flex: 1, justifyContent: "center", backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { 
                if (!sessions) { setTargetDateType('end'); setCalendarVisible(true); } 
            }}
            disabled={!!sessions && parseInt(sessions) > 0}
          >
            <Text style={{ color: endDate ? colors.accent : colors.textSecondary }}>
              {sessions && parseInt(sessions) > 0 ? "(Tự động tính)" : (endDate ? `KT: ${endDate.toLocaleDateString("vi-VN")}` : "Ngày kết thúc")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================= */}

        <Text style={styles.label}>Mô tả chi tiết</Text>
        <TextInput
          style={[styles.input, { height: 90, textAlignVertical: "top", backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          multiline placeholder="Mô tả khóa học..." placeholderTextColor={colors.textSecondary}
          value={description} onChangeText={setDescription}
        />

        <TouchableOpacity activeOpacity={0.85} onPress={handleUpdate} disabled={loading}>
          <LinearGradient colors={["#4da3ff", "#1e88e5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveBtn}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* MODALS */}
      <CalendarModal 
          visible={calendarVisible} 
          onClose={() => setCalendarVisible(false)} 
          onSelectDate={handleDateConfirm}
          isDark={isDark}
          title={targetDateType === 'start' ? "Chọn ngày bắt đầu" : "Chọn ngày kết thúc"}
      />
      
      <TimePickerModal
          visible={timePickerVisible}
          onClose={() => setTimePickerVisible(false)}
          onSelectTime={setClassTime}
          isDark={isDark}
          initialTime={classTime || new Date()}
      />

      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={[styles.successBox, { backgroundColor: colors.card }]}>
            <Image source={require("../../assets/success.png")} style={styles.successIcon} />
            <Text style={[styles.successText, { color: colors.text }]}>Cập nhật thành công!</Text>
          </View>
        </View>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fixedHeader: { position: "absolute", top: 0, left: 0, right: 0, height: 100, zIndex: 50, justifyContent: "flex-end", alignItems: "center", paddingBottom: 10, borderBottomWidth: 1 },
  backBtn: { position: "absolute", left: 16, bottom: 10, padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  imagePreview: { width: "100%", height: 200, borderRadius: 16, marginBottom: 16, backgroundColor: "#ccc" },
  changeImageBtn: { position: "absolute", bottom: 12, right: 12, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  
  label: { fontWeight: "600", color: "#4da3ff", marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 15 },
  
  weekDaysContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  dayButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  saveBtn: { marginTop: 15, borderRadius: 25, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 100 },

  successOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  successBox: { width: 230, height: 230, borderRadius: 28, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  successIcon: { width: 80, height: 80, marginBottom: 15 },
  successText: { fontSize: 18, fontWeight: "700", textAlign: "center" },
});