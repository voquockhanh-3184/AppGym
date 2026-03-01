import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import DB from "../../src/db/sqlite";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";

const { width } = Dimensions.get("window");

// Map thứ để xử lý logic tạo lịch
const dayMap: { [key: string]: number } = { "CN": 0, "T2": 1, "T3": 2, "T4": 3, "T5": 4, "T6": 5, "T7": 6 };

// ==========================================
// 1. CUSTOM CALENDAR MODAL (Giữ nguyên)
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

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleSelect = (date: Date) => {
        setSelectedDate(date);
        onSelectDate(date);
        onClose();
    };

    const bg = isDark ? "#2C2C2E" : "#FFFFFF";
    const text = isDark ? "#FFF" : "#000";

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={{width: '90%', backgroundColor: bg, borderRadius: 20, padding: 20, elevation: 5}}>
                    <Text style={{textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: text, marginBottom: 15}}>
                        {title || "Chọn ngày"}
                    </Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                        <TouchableOpacity onPress={handlePrevMonth} style={{padding: 10}}>
                            <Text style={{fontSize: 20, color: text, fontWeight: 'bold'}}>{"<"}</Text>
                        </TouchableOpacity>
                        <Text style={{fontSize: 18, fontWeight: 'bold', color: text}}>Tháng {month + 1} / {year}</Text>
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
                                        backgroundColor: isSelected ? '#4da3ff' : isToday ? 'rgba(77, 163, 255, 0.2)' : 'transparent',
                                        borderRadius: 20
                                    }}
                                    onPress={() => handleSelect(date)}
                                >
                                    <Text style={{color: isSelected ? '#fff' : isToday ? '#4da3ff' : text, fontWeight: isSelected || isToday ? 'bold' : 'normal'}}>
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
// 2. CUSTOM TIME PICKER MODAL (MỚI)
// ==========================================
const TimePickerModal = ({ visible, onClose, onSelectTime, isDark, initialTime }: any) => {
    // Tạo mảng Giờ (0-23) và Phút (0-59)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    const [selectedHour, setSelectedHour] = useState(initialTime ? initialTime.getHours() : 9);
    const [selectedMinute, setSelectedMinute] = useState(initialTime ? initialTime.getMinutes() : 0);

    const handleConfirm = () => {
        const newTime = new Date();
        newTime.setHours(selectedHour);
        newTime.setMinutes(selectedMinute);
        newTime.setSeconds(0);
        onSelectTime(newTime);
        onClose();
    };

    const bg = isDark ? "#2C2C2E" : "#FFFFFF";
    const text = isDark ? "#FFF" : "#000";
    const itemBg = isDark ? "#3A3A3C" : "#F2F2F7";
    const selectedBg = "#4da3ff";

    const renderItem = (item: number, isSelected: boolean, onSelect: any) => (
        <TouchableOpacity 
            onPress={() => onSelect(item)}
            style={{
                paddingVertical: 12, paddingHorizontal: 20, margin: 4, borderRadius: 10,
                backgroundColor: isSelected ? selectedBg : itemBg,
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
                    <Text style={{textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: text, marginBottom: 20}}>
                        Chọn giờ học
                    </Text>

                    <View style={{flexDirection: 'row', justifyContent: 'space-around', height: 250}}>
                        {/* Cột Giờ */}
                        <View style={{alignItems: 'center', flex: 1}}>
                            <Text style={{color: '#888', marginBottom: 10, fontWeight: '600'}}>Giờ</Text>
                            <FlatList 
                                data={hours}
                                keyExtractor={item => `h-${item}`}
                                showsVerticalScrollIndicator={false}
                                initialScrollIndex={selectedHour > 2 ? selectedHour - 2 : 0}
                                getItemLayout={(data, index) => ({ length: 50, offset: 50 * index, index })}
                                renderItem={({item}) => renderItem(item, item === selectedHour, setSelectedHour)}
                            />
                        </View>

                        {/* Dấu hai chấm */}
                        <View style={{justifyContent: 'center', paddingBottom: 20}}>
                            <Text style={{fontSize: 30, fontWeight: 'bold', color: text}}>:</Text>
                        </View>

                        {/* Cột Phút */}
                        <View style={{alignItems: 'center', flex: 1}}>
                            <Text style={{color: '#888', marginBottom: 10, fontWeight: '600'}}>Phút</Text>
                            <FlatList 
                                data={minutes}
                                keyExtractor={item => `m-${item}`}
                                showsVerticalScrollIndicator={false}
                                initialScrollIndex={selectedMinute > 2 ? selectedMinute - 2 : 0}
                                getItemLayout={(data, index) => ({ length: 50, offset: 50 * index, index })}
                                renderItem={({item}) => renderItem(item, item === selectedMinute, setSelectedMinute)}
                            />
                        </View>
                    </View>

                    <View style={{flexDirection: 'row', marginTop: 25, justifyContent: 'space-between'}}>
                        <TouchableOpacity onPress={onClose} style={[styles.modalBtn, {backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc'}]}>
                            <Text style={{color: text}}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleConfirm} style={[styles.modalBtn, {backgroundColor: '#4da3ff'}]}>
                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Xác nhận</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ==========================================
// 3. MAIN SCREEN
// ==========================================

export default function AddCourseScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    bg: isDark ? "#0d0d0d" : "#F9FAFB",
    card: isDark ? "#1c1c1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#000000",
    textSecondary: isDark ? "#bbbbbb" : "#555555",
    border: isDark ? "#333333" : "#cccccc",
    accent: "#4da3ff",
    modalBg: isDark ? "#1c1c1e" : "#ffffff",
    selectedDayBg: "#4da3ff",
    unselectedDayBg: isDark ? "#333" : "#eee",
  };

  // --- STATES ---
  const [title, setTitle] = useState("");
  const [ptName, setPtName] = useState("");
  const [facility, setFacility] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sessions, setSessions] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const [branches, setBranches] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  const [facilityModal, setFacilityModal] = useState(false);
  const [trainerModal, setTrainerModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Date & Time Data
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [classTime, setClassTime] = useState<Date | null>(null);
  
  // Modal Control States
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false); // ✅ State cho TimePickerModal
  const [targetDateType, setTargetDateType] = useState<'start' | 'end'>('start');

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const dataBranches = await DB.getAllGymBranches();
      const dataTrainers = await DB.getAllTrainers();
      setBranches(dataBranches);
      setTrainers(dataTrainers);
    })();
  }, []);

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: "photo" });
    if (result?.assets?.length) setImage(result.assets[0].uri || null);
  };

  const toggleDay = (day: string) => {
      if (selectedDays.includes(day)) setSelectedDays(selectedDays.filter(d => d !== day));
      else setSelectedDays([...selectedDays, day]);
  };

  const calculateEndDateFromSessions = (start: Date, days: string[], totalSessions: number) => {
    if (totalSessions <= 0) return start;
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

  const handleDateConfirm = (date: Date) => {
      if (targetDateType === 'start') setStartDate(date);
      else setEndDate(date);
  };

  const openCalendar = (type: 'start' | 'end') => {
      setTargetDateType(type);
      setCalendarVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Lỗi", "Vui lòng nhập tên khóa học!");
    if (!ptName.trim()) return Alert.alert("Lỗi", "Vui lòng chọn HLV!");
    if (!facility.trim()) return Alert.alert("Lỗi", "Vui lòng chọn cơ sở!");
    if (!price.trim()) return Alert.alert("Lỗi", "Vui lòng nhập giá!");
    if (!startDate) return Alert.alert("Lỗi", "Vui lòng chọn ngày bắt đầu!");
    if (!classTime) return Alert.alert("Lỗi", "Vui lòng chọn giờ học!");
    if (selectedDays.length === 0) return Alert.alert("Lỗi", "Vui lòng chọn ít nhất 1 ngày học trong tuần!");

    setSaving(true);

    try {
      const sessionCount = parseInt(sessions) || 0;
      let finalEndDate = endDate;

      if (sessionCount > 0) finalEndDate = calculateEndDateFromSessions(startDate, selectedDays, sessionCount);
      
      if (!finalEndDate) {
          setSaving(false);
          return Alert.alert("Thiếu thông tin", "Vui lòng nhập 'Tổng số buổi' HOẶC chọn 'Ngày kết thúc'!");
      }

      const timeString = classTime.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
      const scheduleObj = { days: selectedDays, time: timeString };

      const newCourseId = await DB.addCourseLocal({
        title: title.trim(),
        ptName: ptName.trim(),
        description: description.trim(),
        facility: facility.trim(),
        price: parseFloat(price),
        sessions: sessionCount, 
        startDate: startDate.toISOString(),
        endDate: finalEndDate.toISOString(),
        image: image || "",
        schedule: JSON.stringify(scheduleObj)
      });

      let loopDate = new Date(startDate);
      loopDate.setHours(0,0,0,0);
      const targetEndDate = new Date(finalEndDate);
      targetEndDate.setHours(23,59,59,999);
      const timeOnly = classTime.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' });

      while (loopDate <= targetEndDate) {
          const currentDayOfWeek = loopDate.getDay(); 
          const isClassDay = selectedDays.some(d => dayMap[d] === currentDayOfWeek);
          if (isClassDay) {
              const year = loopDate.getFullYear();
              const month = String(loopDate.getMonth() + 1).padStart(2, '0');
              const day = String(loopDate.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              await DB.addClassLocal({
                  course_id: newCourseId,
                  className: title.trim(),
                  ptName: ptName.trim(),
                  date: dateStr,
                  time: timeOnly,
                  facility: facility.trim()
              });
          }
          loopDate.setDate(loopDate.getDate() + 1);
      }
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Lỗi lưu khóa học:", err);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessNavigation = () => {
      setShowSuccessModal(false);
      navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
        
        {/* TOP BAR */}
        <View style={[styles.topBar, { backgroundColor: colors.bg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image source={require("../../assets/back.png")} resizeMode="contain" style={[styles.backIconImg, { tintColor: colors.accent }]} />
          </TouchableOpacity>
          <View style={styles.titleWrapper}>
            <Text style={[styles.headerTitle, { color: colors.accent }]}>Thêm khóa học</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Form Inputs */}
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Tên khóa học..." placeholderTextColor={colors.textSecondary}
          value={title} onChangeText={setTitle}
        />

        <TouchableOpacity style={[styles.selectButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setTrainerModal(true)}>
          <Text style={{ color: ptName ? colors.accent : colors.textSecondary }}>{ptName ? `HLV: ${ptName}` : "Chọn huấn luyện viên"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.selectButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setFacilityModal(true)}>
          <Text style={{ color: facility ? colors.accent : colors.textSecondary }}>{facility ? `Cơ sở: ${facility}` : "Chọn cơ sở gym"}</Text>
        </TouchableOpacity>

        {/* ✅ CHỌN GIỜ HỌC - SỬ DỤNG CUSTOM MODAL */}
        <TouchableOpacity style={[styles.selectButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setTimePickerVisible(true)}>
          <Text style={{ color: classTime ? colors.accent : colors.textSecondary }}>
            {classTime 
                ? `Giờ học: ${classTime.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}` 
                : "Chọn giờ học bắt đầu"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Lịch học trong tuần:</Text>
        <View style={styles.weekDaysContainer}>
            {weekDays.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                    <TouchableOpacity key={day} style={[styles.dayButton, { backgroundColor: isSelected ? colors.selectedDayBg : colors.unselectedDayBg }]} onPress={() => toggleDay(day)}>
                        <Text style={{ color: isSelected ? '#fff' : colors.textSecondary, fontWeight: 'bold' }}>{day}</Text>
                    </TouchableOpacity>
                )
            })}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Giá (VNĐ)..." placeholderTextColor={colors.textSecondary} keyboardType="numeric"
              value={price} onChangeText={setPrice}
            />
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Số buổi (tùy chọn)" placeholderTextColor={colors.textSecondary} keyboardType="numeric"
              value={sessions} onChangeText={setSessions}
            />
        </View>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 15, fontStyle: 'italic' }}>* Nếu nhập số buổi, ngày kết thúc sẽ được tự động tính toán.</Text>

        <TextInput
          style={[styles.input, { height: 100, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          multiline placeholder="Mô tả chi tiết khóa học..." placeholderTextColor={colors.textSecondary}
          value={description} onChangeText={setDescription}
        />

        {/* ✅ CHỌN NGÀY - SỬ DỤNG CUSTOM MODAL */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity style={[styles.selectButton, { flex: 1, marginRight: 8, backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openCalendar('start')}>
              <Text style={{ color: startDate ? colors.accent : colors.textSecondary, fontSize: 13 }}>
                {startDate ? `BĐ: ${startDate.toLocaleDateString("vi-VN")}` : "Ngày bắt đầu"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.selectButton, { flex: 1, marginLeft: 8, backgroundColor: colors.card, borderColor: colors.border, opacity: sessions ? 0.5 : 1 }]} onPress={() => !sessions && openCalendar('end')} disabled={!!sessions}>
              <Text style={{ color: endDate ? colors.accent : colors.textSecondary, fontSize: 13 }}>
                {sessions ? "(Tự động tính)" : (endDate ? `KT: ${endDate.toLocaleDateString("vi-VN")}` : "Ngày kết thúc")}
              </Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={pickImage} style={[styles.imagePicker, { borderColor: colors.border }]}>
          {image ? <Image source={{ uri: image }} style={styles.image} /> : <Text style={{ color: colors.textSecondary }}>+ Chọn ảnh bìa</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: colors.accent, opacity: saving ? 0.5 : 1 }]} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Lưu khóa học</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* --- MODAL CƠ SỞ & HLV (Giữ nguyên) --- */}
      <Modal visible={facilityModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.modalBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn cơ sở</Text>
            <FlatList
              data={branches} keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.branchItem, { borderBottomColor: colors.border }]} onPress={() => { setFacility(item.name); setFacilityModal(false); }}>
                  <Text style={{ color: colors.text }}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setFacilityModal(false)} style={styles.closeBtn}><Text style={{ color: "#ff4444" }}>Đóng</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={trainerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.modalBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn huấn luyện viên</Text>
            <FlatList
              data={trainers} keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.trainerItem, { borderBottomColor: colors.border }]} onPress={() => { setPtName(item.name); setTrainerModal(false); }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>Chuyên môn: {item.specialty}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setTrainerModal(false)} style={styles.closeBtn}><Text style={{ color: "#ff4444", fontWeight: "600" }}>Đóng</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ CALENDAR MODAL */}
      <CalendarModal 
          visible={calendarVisible} 
          onClose={() => setCalendarVisible(false)} 
          onSelectDate={handleDateConfirm}
          isDark={isDark}
          title={targetDateType === 'start' ? "Chọn ngày bắt đầu" : "Chọn ngày kết thúc"}
      />

      {/* ✅ TIME PICKER MODAL */}
      <TimePickerModal
          visible={timePickerVisible}
          onClose={() => setTimePickerVisible(false)}
          onSelectTime={setClassTime}
          isDark={isDark}
          initialTime={classTime}
      />

      {/* ✅ MODAL THÀNH CÔNG */}
      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.successIconContainer}>
               <Image source={require("../../assets/success.png")} style={styles.successIconImage} resizeMode="contain"/>
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Thành công!</Text>
            <Text style={[styles.successMessage, { color: colors.textSecondary }]}>Khóa học mới đã được tạo thành công.</Text>
            <TouchableOpacity style={[styles.successButton, { backgroundColor: colors.accent }]} onPress={handleSuccessNavigation} activeOpacity={0.8}>
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 15, fontSize: 15 },
  selectButton: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 15, justifyContent: 'center' },
  weekDaysContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  dayButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  imagePicker: { height: 180, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, overflow: "hidden", marginTop: 10 },
  image: { width: "100%", height: "100%" },
  saveButton: { paddingVertical: 14, borderRadius: 25, alignItems: "center", marginTop: 5, marginBottom: 20 },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  modalBox: { width: "85%", maxHeight: "70%", borderRadius: 24, padding: 24, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  branchItem: { paddingVertical: 12, borderBottomWidth: 1 },
  closeBtn: { marginTop: 20, alignItems: "center", padding: 10 },
  trainerItem: { paddingVertical: 12, borderBottomWidth: 1 },
  
  modalBtn: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 100 },

  topBar: { width: "100%", paddingHorizontal: 16, paddingTop: 26, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  backIconImg: { width: 22, height: 22, resizeMode: "contain" },
  titleWrapper: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", marginTop: 5, textAlign: "center" },

  successModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  successModalContainer: { width: width * 0.85, borderRadius: 24, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  successIconContainer: { width: 80, height: 80, backgroundColor: 'rgba(52, 199, 89, 0.2)', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successIconImage: { width: 40, height: 40, tintColor: '#34C759' },
  successTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  successMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  successButton: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  successButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});