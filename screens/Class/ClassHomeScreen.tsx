import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Animated,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
    SafeAreaView,
    Platform,
    StatusBar,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker"; 
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import DB from "../../src/db/sqlite"; 
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useTheme } from "../../src/context/ThemeContext";

/* ==========================
   HELPER: Xử lý Ngày tháng
=========================== */
const parseDate = (dateString: string) => {
    if (!dateString) return null;
    try {
        if (dateString.includes('-')) return new Date(dateString);
        const parts = dateString.split('/');
        if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return null;
    } catch (e) { return null; }
};

const formatDateDisplay = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getMondayOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(date.setDate(diff));
};

const getDayOfWeek = (dateString: string) => {
    const dateObj = parseDate(dateString);
    if (!dateObj) return "";
    const days = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[dateObj.getDay()];
};

/* ==========================
   COMPONENT: Class Item 
=========================== */
const ClassItem = ({
    id, time, date, className, ptName, facility,
    colors, isDark, navigation, isAdmin, onEdit, onDelete,
}: any) => {
    const dateObj = parseDate(date);
    const dateDisplay = dateObj ? formatDateDisplay(dateObj) : date;
    const dayName = getDayOfWeek(date);

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("ClassDetailScreen", { classId: id })}
            style={[
                componentStyles.cardContainer, 
                { 
                    backgroundColor: colors.card,
                    borderColor: isDark ? '#333' : '#e0e0e0', 
                    borderWidth: 1,
                }
            ]}
        >
            {/* Header: Ngày tháng & Actions */}
            <View style={componentStyles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[componentStyles.calendarIconBox, { backgroundColor: colors.red }]}>
                        <Image source={require("../../assets/calendar.png")} style={{ width: 14, height: 14, tintColor: '#fff' }} />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginLeft: 8 }}>
                        {dayName}, {dateDisplay}
                    </Text>
                </View>

                {isAdmin && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => onEdit({ id, time, date, className, ptName, facility })}>
                            <Image source={require("../../assets/edit.png")} style={{ width: 18, height: 18, tintColor: colors.blue }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onDelete(id)}>
                            <Image source={require("../../assets/delete.png")} style={{ width: 18, height: 18, tintColor: colors.red }} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? '#333' : '#f0f0f0', marginVertical: 14 }} />

            {/* Body: Giờ & Thông tin chi tiết */}
            <View style={{ flexDirection: "row", alignItems: 'center' }}> 
                <View style={[ componentStyles.timeBox, { backgroundColor: colors.blue + '10', borderColor: colors.blue, borderWidth: 1 } ]}>
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.blue, textAlign: 'center' }}>{time}</Text>
                </View>

                <View style={{ flex: 1, paddingLeft: 14 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 4 }}>{className}</Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Image source={require("../../assets/location.png")} style={{ width: 14, height: 14, tintColor: colors.subtext, marginRight: 6 }} />
                        <Text style={{ fontSize: 14, color: colors.subtext, fontWeight: '500' }}>
                            {facility || 'Chưa xác định'}
                        </Text>
                    </View>
                    
                    {ptName ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Image source={require("../../assets/coach.png")} style={{ width: 14, height: 14, tintColor: colors.subtext, marginRight: 6 }} />
                            <Text style={{ fontSize: 14, color: colors.subtext, fontWeight: '500' }}>PT: {ptName}</Text>
                        </View>
                    ) : null}
                </View>
                <Image source={require("../../assets/right-arrow.png")} style={{ width: 18, height: 18, tintColor: '#ccc', alignSelf: 'center' }} />
            </View>
        </TouchableOpacity>
    );
};

/* ==========================
   MODAL: Add / Edit Class
=========================== */
const AddEditClassModal = ({ 
    isVisible, onClose, handleSave, editId, loading, 
    className, setClassName, date, setDate, time, setTime, 
    ptName, setPtName, facility, setFacility, 
    ptList, facilityList, colors, isDark 
}: any) => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    return (
        <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={modalStyles.modalOverlay}>
                <View style={[modalStyles.modalContainer, { backgroundColor: colors.card }]}>
                    <Text style={[modalStyles.modalTitle, { color: colors.text }]}>{editId ? "Sửa lớp" : "Thêm lớp"}</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={[modalStyles.label, { color: colors.text }]}>Tên lớp</Text>
                        <TextInput 
                            style={[modalStyles.input, { color: colors.text, borderColor: colors.border }]} 
                            value={className} 
                            onChangeText={setClassName} 
                            placeholder="VD: Yoga Sáng, Gym Cơ bản..." 
                            placeholderTextColor={colors.subtext} 
                        />
                        
                        <Text style={[modalStyles.label, { color: colors.text }]}>Ngày</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[modalStyles.input, { borderColor: colors.border, justifyContent: 'center' }]}>
                            <Text style={{ color: date ? colors.text : colors.subtext }}>{date || "Chọn ngày"}</Text>
                        </TouchableOpacity>
                        
                        <Text style={[modalStyles.label, { color: colors.text }]}>Giờ</Text>
                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[modalStyles.input, { borderColor: colors.border, justifyContent: 'center' }]}>
                            <Text style={{ color: time ? colors.text : colors.subtext }}>{time || "Chọn giờ"}</Text>
                        </TouchableOpacity>

                        <Text style={[modalStyles.label, { color: colors.text }]}>Huấn luyện viên (PT)</Text>
                        <View style={[modalStyles.input, { borderColor: colors.border, padding: 0, justifyContent: 'center' }]}>
                             <Picker
                                selectedValue={ptName}
                                onValueChange={(itemValue) => setPtName(itemValue)}
                                style={{ color: colors.text, width: '100%' }}
                                dropdownIconColor={colors.text}
                                mode="dropdown"
                            >
                                <Picker.Item label="-- Chọn PT --" value="" color={colors.subtext}/>
                                {ptList.map((pt:any, i:number) => (
                                    <Picker.Item key={`pt-${i}`} label={pt.name} value={pt.name} color={colors.text} />
                                ))}
                             </Picker>
                        </View>

                        <Text style={[modalStyles.label, { color: colors.text }]}>Cơ sở (Gym Branch)</Text>
                        <View style={[modalStyles.input, { borderColor: colors.border, padding: 0, justifyContent: 'center' }]}>
                             <Picker
                                selectedValue={facility}
                                onValueChange={(itemValue) => setFacility(itemValue)}
                                style={{ color: colors.text, width: '100%' }}
                                dropdownIconColor={colors.text}
                                mode="dropdown"
                            >
                                <Picker.Item label="-- Chọn cơ sở --" value="" color={colors.subtext} />
                                {facilityList.map((fac:any, i:number) => (
                                    <Picker.Item key={`fac-${i}`} label={fac.name} value={fac.name} color={colors.text} />
                                ))}
                             </Picker>
                        </View>

                        <TouchableOpacity onPress={handleSave} style={[modalStyles.saveBtn, { backgroundColor: colors.blue, marginTop: 25 }]}>
                            {loading ? <ActivityIndicator color="#fff"/> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu thông tin</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                    
                    <TouchableOpacity onPress={onClose} style={{marginTop: 15, alignItems: 'center', padding: 10}}>
                        <Text style={{color: colors.red, fontWeight: '600'}}>Đóng</Text>
                    </TouchableOpacity>
                    
                    {showDatePicker && (
                        <DateTimePicker 
                            value={new Date()} 
                            mode="date" 
                            onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(formatDateDisplay(d)); }} 
                        />
                    )}
                    {showTimePicker && (
                        <DateTimePicker 
                            value={new Date()} 
                            mode="time" 
                            is24Hour={true} 
                            onChange={(e, d) => { setShowTimePicker(false); if(d) setTime(d.toLocaleTimeString("vi-VN", {hour:'2-digit', minute:'2-digit'})); }} 
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

/* ==========================
   OTHER MODALS
=========================== */
const DeleteConfirmModal = ({ isVisible, onClose, onConfirm, colors }: any) => (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.modalOverlay}>
            <View style={[modalStyles.deleteContainer, { backgroundColor: colors.card }]}>
                <View style={modalStyles.deleteIconCircle}>
                      <Image source={require("../../assets/delete.png")} style={{width: 24, height: 24, tintColor: colors.red}} />
                </View>
                <Text style={{color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8}}>Xác nhận xóa?</Text>
                <Text style={{color: colors.subtext, textAlign: 'center', marginBottom: 20}}>Bạn có chắc chắn muốn xóa lớp học này không?</Text>
                <View style={{flexDirection: 'row', marginTop: 10, gap: 10, width: '100%'}}>
                    <TouchableOpacity onPress={onClose} style={[modalStyles.actionBtn, {backgroundColor: colors.background}]}>
                        <Text style={{color: colors.text, fontWeight: '600'}}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onConfirm} style={[modalStyles.actionBtn, {backgroundColor: colors.red}]}>
                        <Text style={{color: '#fff', fontWeight: '600'}}>Xóa</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

const SuccessModal = ({ isVisible, onClose, colors }: any) => (
    <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.modalOverlay}>
            <View style={[modalStyles.successContainer, { backgroundColor: colors.card }]}>
                <Image source={require("../../assets/success.png")} style={modalStyles.successIcon} />
                <Text style={{color: colors.blue, fontSize: 18, fontWeight: 'bold', marginBottom: 5}}>Thành công!</Text>
                <Text style={{color: colors.subtext, textAlign: 'center'}}>Dữ liệu đã được lưu.</Text>
                <TouchableOpacity onPress={onClose} style={{marginTop: 20, paddingVertical: 10, paddingHorizontal: 30, backgroundColor: colors.blue, borderRadius: 20}}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>OK</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

/* ==========================
   MAIN SCREEN
=========================== */
const ClassHomeScreen = () => {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const colors = {
        background: isDark ? "#0d0d0d" : "#F9FAFB",
        card: isDark ? "#1f1f1f" : "#ffffff", 
        text: isDark ? "#ffffff" : "#1f2937",
        subtext: isDark ? "#aaaaaa" : "#6b7280",
        blue: isDark ? "#5CB3FF" : "#007AFF", 
        red: "#FF3B30",
        border: isDark ? "#333" : "#E5E7EB",
    };

    const [classes, setClasses] = useState<any[]>([]);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [isTrainer, setIsTrainer] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [currentUserName, setCurrentUserName] = useState("");
    
    // State Modal & Input
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [time, setTime] = useState("");
    const [date, setDate] = useState("");
    const [className, setClassName] = useState("");
    const [ptName, setPtName] = useState("");
    const [facility, setFacility] = useState("");

    const [ptList, setPtList] = useState<any[]>([]);
    const [facilityList, setFacilityList] = useState<any[]>([]);
    
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [successVisible, setSuccessVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [idToDelete, setIdToDelete] = useState<number | null>(null);

    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMondayOfWeek(new Date()));

    useFocusEffect(
        useCallback(() => {
            loadAllData();
        }, [])
    );

    const loadAllData = async () => {
        await DB.initDB();
        setLoading(true);

        try {
            const idStr = await AsyncStorage.getItem("currentUserId");
            const userId = idStr ? parseInt(idStr, 10) : null;
            setCurrentUserId(userId);

            let role = 'user';
            let userName = '';

            if (userId) {
                const res = await DB.executeSql("SELECT role, username, photoURL FROM users WHERE id = ? LIMIT 1", [userId]);
                if (res.rows.length > 0) {
                    const user = res.rows.item(0);
                    role = user.role || 'user';
                    userName = user.username;
                    setCurrentUserName(userName);
                    setUserPhoto(user.photoURL || null);
                }
            }

            setIsAdminUser(role === "admin");
            setIsTrainer(role === "trainer");

            const trainers = await DB.getAllTrainers(); 
            setPtList(trainers || []);

            const branches = await DB.getAllGymBranches(); 
            setFacilityList(branches || []);

            let rows = [];
            
            if (role === 'trainer') {
                rows = await DB.getTrainerSchedule(userName); 
            } else {
                rows = await DB.getClassesLocal(userId, role, userName);
            }
            
            const sortedClasses = rows.sort((a: any, b: any) => {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                if (!dateA || !dateB) return 0;
                // Sắp xếp ngày tăng dần (hoặc giảm dần tùy bạn)
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime(); 
                }
                return a.time.localeCompare(b.time); 
            });
            
            setClasses(sortedClasses);

        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (item: any = null) => {
        if (!isAdminUser) return Alert.alert("Quyền hạn", "Chỉ quản trị viên mới có quyền này!");
        if (item) {
            setEditId(item.id); 
            setTime(item.time); 
            setDate(item.date); 
            setClassName(item.className); 
            setPtName(item.ptName || ""); 
            setFacility(item.facility || "");
        } else {
            setEditId(null); setTime(""); setDate(""); setClassName(""); setPtName(""); setFacility("");
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!time || !date || !className) return Alert.alert("Thiếu thông tin", "Vui lòng nhập tên lớp, ngày và giờ!");
        setLoading(true);
        try {
            if (editId) {
                await DB.executeSql(
                    `UPDATE classes SET time=?, date=?, className=?, ptName=?, facility=? WHERE id=?`, 
                    [time, date, className, ptName, facility, editId]
                );
            } else {
                await DB.executeSql(
                    `INSERT INTO classes (time, date, className, ptName, facility, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [time, date, className, ptName, facility, null]
                );
            }
            await loadAllData();
            setModalVisible(false);
            setSuccessVisible(true);
        } catch (err) { 
            console.error(err); 
            Alert.alert("Lỗi", "Không thể lưu dữ liệu."); 
        } finally { 
            setLoading(false); 
        }
    };

    const onRequestDelete = (id: number) => { 
        setIdToDelete(id); 
        setDeleteModalVisible(true); 
    };
    
    const onConfirmDelete = async () => {
        if (idToDelete) {
            await DB.executeSql("DELETE FROM classes WHERE id = ?", [idToDelete]);
            await loadAllData();
            setDeleteModalVisible(false);
        }
    };

    const changeWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
        setCurrentWeekStart(newDate);
    };

    const getClassesForCurrentWeek = () => {
        const startOfWeek = new Date(currentWeekStart);
        const endOfWeek = new Date(currentWeekStart);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        startOfWeek.setHours(0, 0, 0, 0);
        endOfWeek.setHours(23, 59, 59, 999);

        return classes.filter(cls => {
            const classDate = parseDate(cls.date);
            if (!classDate) return false;
            return classDate >= startOfWeek && classDate <= endOfWeek;
        });
    };

    const currentWeekClasses = getClassesForCurrentWeek();
    const endOfWeekDate = new Date(currentWeekStart);
    endOfWeekDate.setDate(currentWeekStart.getDate() + 6);

    return (
        <SafeAreaView style={[componentStyles.safeArea, { backgroundColor: colors.background }]}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.background, borderBottomWidth: isDark?1:0, borderBottomColor: isDark?'#333':'#e0e0e0', paddingBottom: 10 }}>
                <Header title={isTrainer ? "Lịch Dạy Của Tôi" : "Lịch Lớp Học"} userPhoto={userPhoto} titleStyle={{ color: colors.blue }} />
            </View>

            <View style={[componentStyles.container, { paddingTop: Platform.OS === "android" ? 70 : 60 }]}> 
                <ScrollView contentContainerStyle={componentStyles.scrollViewContent} style={componentStyles.scrollView} showsVerticalScrollIndicator={false}>
                    
                    <View style={componentStyles.weekNavigator}>
                        <TouchableOpacity onPress={() => changeWeek('prev')} style={componentStyles.navButton}>
                            <Image source={require("../../assets/left-arrow.png")} style={{ width: 16, height: 16, tintColor: colors.text }} />
                        </TouchableOpacity>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: colors.subtext, fontWeight: '600' }}>TUẦN</Text>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                                {`${formatDateDisplay(currentWeekStart).slice(0, 5)} - ${formatDateDisplay(endOfWeekDate).slice(0, 5)}`}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => changeWeek('next')} style={componentStyles.navButton}>
                            <Image source={require("../../assets/right-arrow.png")} style={{ width: 16, height: 16, tintColor: colors.text }} />
                        </TouchableOpacity>
                    </View>

                    {isAdminUser && (
                        <View style={componentStyles.adminHeaderContainer}>
                            <TouchableOpacity onPress={() => openModal(null)} style={[componentStyles.addButtonHeader, { backgroundColor: colors.blue }]}>
                                <Image source={require("../../assets/plus.png")} style={{ width: 14, height: 14, tintColor: '#fff', marginRight: 6 }} />
                                <Text style={{ color: "#fff", fontWeight: "600" }}>Thêm lớp</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {loading && classes.length === 0 ? (
                        <View style={{ marginTop: 50, alignItems: 'center' }}><ActivityIndicator size="large" color={colors.blue} /><Text style={{ marginTop: 10, color: colors.subtext }}>Đang tải...</Text></View>
                    ) : !loading && currentWeekClasses.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 40 }}>
                            <Image source={require("../../assets/folder.png")} style={{ width: 200, height: 200, marginBottom: 16 }} resizeMode="contain" />
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Trống lịch</Text>
                            <Text style={{ textAlign: "center", color: colors.subtext, lineHeight: 22 }}>
                                {isTrainer ? "Bạn chưa có lịch dạy nào trong tuần này." : isAdminUser ? "Chưa có lớp nào." : "Bạn chưa đăng ký lớp nào."}
                            </Text>
                        </View>
                    ) : (
                        <View style={{ marginTop: 10 }}>
                            {currentWeekClasses.map((item: any, index: number) => (
                                <ClassItem 
                                    key={`${item.id}_${index}`} 
                                    {...item} 
                                    colors={colors} 
                                    isDark={isDark} 
                                    navigation={navigation} 
                                    isAdmin={isAdminUser} 
                                    onEdit={openModal} 
                                    onDelete={onRequestDelete} 
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>

            <Footer active="Lớp học" darkMode={isDark} />

            <AddEditClassModal 
                isVisible={modalVisible} 
                onClose={() => setModalVisible(false)} 
                handleSave={handleSave} 
                editId={editId} 
                loading={loading} 
                className={className} setClassName={setClassName} 
                date={date} setDate={setDate} 
                time={time} setTime={setTime} 
                ptName={ptName} setPtName={setPtName} 
                facility={facility} setFacility={setFacility} 
                ptList={ptList} 
                facilityList={facilityList} 
                colors={colors} 
                isDark={isDark} 
            />
            <DeleteConfirmModal isVisible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)} onConfirm={onConfirmDelete} colors={colors} />
            <SuccessModal isVisible={successVisible} onClose={() => setSuccessVisible(false)} colors={colors} />
        </SafeAreaView>
    );
};

export default ClassHomeScreen;

const componentStyles = StyleSheet.create({
    safeArea: { flex: 1, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0 },
    container: { flex: 1 }, 
    scrollView: { flex: 1, paddingHorizontal: 16 },
    scrollViewContent: { paddingVertical: 10, paddingBottom: 100, paddingTop: 10 }, 
    weekNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 15 },
    navButton: { padding: 10, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
    adminHeaderContainer: { paddingBottom: 15, flexDirection: 'row', justifyContent: 'flex-end', width: '100%' },
    addButtonHeader: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 18, paddingVertical: 9, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4}, elevation: 5 },
    cardContainer: { borderRadius: 12, marginBottom: 15, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    calendarIconBox: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    // ✅ CẬP NHẬT TIME BOX: width cố định 80, căn giữa mọi chiều
    timeBox: { width: 80, height: 45, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

const modalStyles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
    modalContainer: { width: '100%', borderRadius: 24, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, maxHeight: '90%' },
    modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
    label: { fontSize: 14, marginBottom: 6, fontWeight: "600", marginTop: 12 },
    input: { borderWidth: 1, borderRadius: 12, height: 50, justifyContent: 'center', paddingHorizontal: 10 },
    saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
    successContainer: { width: 280, borderRadius: 24, alignItems: "center", paddingVertical: 30, paddingHorizontal: 20, shadowOpacity: 0.25, elevation: 10 },
    successIcon: { width: 50, height: 50, resizeMode: "contain", marginBottom: 16 },
    deleteContainer: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 10 },
    deleteIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255, 59, 48, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    actionBtn: { paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flex: 1 },
});