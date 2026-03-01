import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  Modal,
  StatusBar,
  ListRenderItem,
  ScrollView,
  Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
import DB from "../../src/db/sqlite";

type AttendanceStatus = 'present' | 'late' | 'absent';
type FilterStatus = 'all' | AttendanceStatus;

interface Student {
  id: number;
  name: string;
  status: AttendanceStatus | null;
  avatar?: string | null;
  originalClassId: number;
  role: string;
}

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    created_at: string;
    username?: string;
    photoURL?: string;
    email?: string;
}

type ParamList = {
  AttendanceScreen: {
    classId: number;
    className: string;
  };
};

const STATUS_CONFIG: Record<AttendanceStatus, any> = {
  present: { id: 'present', label: "Có mặt", color: "#34C759", bg: "rgba(52, 199, 89, 0.15)", icon: require("../../assets/success.png") }, 
  late: { id: 'late', label: "Đến trễ", color: "#FF9500", bg: "rgba(255, 149, 0, 0.15)", icon: require("../../assets/clock.png") },
  absent: { 
      id: 'absent', 
      label: "Nghỉ",  
      color: "#FF3B30", 
      bg: "rgba(255, 59, 48, 0.15)", 
      icon: require("../../assets/close.png"), 
      useThemeColorForIcon: false, // ⚠️ QUAN TRỌNG: Không dùng màu theme đè lên icon này
      noTint: true // ⚠️ Cờ đánh dấu không dùng tintColor
  },
};

const getRoleLabel = (role: string) => {
    switch (role) {
        case 'admin': return 'Quản trị viên';
        case 'trainer': return 'Huấn luyện viên';
        default: return 'Học viên';
    }
};

export default function AttendanceScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, 'AttendanceScreen'>>();
  const { classId, className } = route.params || { classId: 0, className: "Lớp học" };

  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('user');
  
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [warningVisible, setWarningVisible] = useState<boolean>(false); // ✅ State hiển thị cảnh báo
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<{date: string, time: string, ptName: string} | null>(null);

  const [notiModalVisible, setNotiModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    modalBg: isDark ? "#2C2C2E" : "#FFFFFF",
    shadow: isDark ? "transparent" : "#000",
    danger: "#FF3B30",
  };

  const loadData = async () => {
    try {
      await DB.initDB();
      const allUsers = await DB.getAllUsersLocal();
      const userMap = new Map(allUsers.map((u: any) => [String(u.id), u]));

      const idStr = await AsyncStorage.getItem("currentUserId");
      const myId = idStr ? parseInt(idStr) : null;
      setCurrentUserId(myId);

      let role = 'user';
      if (myId) {
          const currentUser = userMap.get(String(myId));
          role = currentUser?.role || 'user';
          setCurrentUserRole(role);
      }

      if (role === 'admin' || role === 'trainer') {
          const unreadNotis = await DB.getUnreadNotifications();
          if (unreadNotis.length > 0) {
              setNotifications(unreadNotis);
              setNotiModalVisible(true);
          }
      }

      const allClasses = await DB.getClassesLocal();
      const currentClass = allClasses.find((c: any) => c.id === classId);

      if (!currentClass) {
        setStudents([]); 
        return;
      }

      setClassInfo({ 
          date: currentClass.date, 
          time: currentClass.time,
          ptName: currentClass.ptName || "Chưa có PT" 
      });

      const relatedClassIds = allClasses
        .filter((c: any) => c.className === currentClass.className && c.date === currentClass.date && c.time === currentClass.time)
        .map((c: any) => c.id);

      let mergedStudents: Student[] = [];

      for (const id of relatedClassIds) {
          const studentsInClass = await DB.getClassAttendance(id);
          const formatted = studentsInClass.map((item: any) => {
             const userDetail = userMap.get(String(item.id));
             return {
                 id: item.id, 
                 name: item.name, 
                 avatar: item.photoURL,
                 status: (item.status === 'pending' ? null : item.status) as AttendanceStatus | null,
                 originalClassId: id,
                 role: userDetail ? userDetail.role : 'user'
             };
          });
          mergedStudents = [...mergedStudents, ...formatted];
      }

      mergedStudents.sort((a, b) => {
          const roleOrder: Record<string, number> = { 'admin': 1, 'trainer': 2, 'user': 3 };
          const roleA = roleOrder[a.role] || 3;
          const roleB = roleOrder[b.role] || 3;
          if (roleA !== roleB) return roleA - roleB;
          return a.name.localeCompare(b.name);
      });
      
      setStudents(mergedStudents);

    } catch (err) {
      console.log("Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [classId])
  );

  const handleCloseNotification = async () => {
      setNotiModalVisible(false);
      await DB.markNotificationsAsRead();
  };

  const stats = useMemo(() => {
    return {
      present: students.filter(s => s.status === 'present').length,
      late: students.filter(s => s.status === 'late').length,
      absent: students.filter(s => s.status === 'absent').length,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
      if (filterStatus === 'all') return students;
      return students.filter(s => s.status === filterStatus);
  }, [students, filterStatus]);

  const handleStatusUpdate = async (newStatus: AttendanceStatus) => {
    if (!selectedStudent) return;
    const updatedList = students.map(s => 
        (s.id === selectedStudent.id && s.originalClassId === selectedStudent.originalClassId) 
        ? { ...s, status: newStatus } 
        : s
    );
    setStudents(updatedList);
    setModalVisible(false);
    await DB.updateAttendanceStatus(selectedStudent.originalClassId, selectedStudent.id, newStatus);
  };

  const openEditModal = (student: Student) => {
    if (currentUserRole === 'admin') {
        setSelectedStudent(student); setModalVisible(true); return;
    }
    if (currentUserRole === 'trainer') {
        // ✅ Logic chặn Trainer sửa chính mình
        if (student.id === currentUserId) { 
            setSelectedStudent(student); 
            setWarningVisible(true); // Hiển thị popup cảnh báo
            return; 
        }
        setSelectedStudent(student); setModalVisible(true); return;
    }
  };

  const canEdit = (studentId: number) => {
      if (currentUserRole === 'admin') return true;
      if (currentUserRole === 'trainer') return studentId !== currentUserId;
      return false;
  };

  const toggleFilter = (status: FilterStatus) => {
      if (filterStatus === status) {
          setFilterStatus('all'); 
      } else {
          setFilterStatus(status);
      }
  };

  const renderStudentItem: ListRenderItem<Student> = ({ item }) => {
    const statusKey = item.status; 
    const config = statusKey ? STATUS_CONFIG[statusKey] : null;
    const roleColor = item.role === 'admin' ? '#FF3B30' : (item.role === 'trainer' ? '#FF9500' : colors.subtext);
    const isEditable = canEdit(item.id);
    
    return (
      <TouchableOpacity activeOpacity={isEditable ? 0.7 : 1} onPress={() => openEditModal(item)} style={[styles.studentCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[styles.avatarContainer, { borderColor: config ? config.color : colors.border }]}>
                {item.avatar ? ( <Image source={{ uri: item.avatar }} style={styles.avatarImage} /> ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.subtext }}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
            </View>
            <View style={{ marginLeft: 14, justifyContent: 'center' }}>
                <Text style={[styles.studentName, { color: colors.text }]}>{item.name}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                    <Image source={item.role === 'user' ? require("../../assets/user.png") : require("../../assets/id-card.png")} style={{width: 12, height: 12, tintColor: roleColor, marginRight: 4}} />
                    <Text style={{ fontSize: 13, color: roleColor, fontWeight: item.role !== 'user' ? '600' : '400' }}>{getRoleLabel(item.role)}</Text>
                </View>
            </View>
        </View>
        {config ? (
            <View style={[styles.modernBadge, { backgroundColor: config.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                <Text style={[styles.modernBadgeText, { color: config.color }]}>{config.label}</Text>
            </View>
        ) : (
            <View style={[styles.modernBadge, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                <Text style={[styles.modernBadgeText, { color: colors.subtext, fontWeight: '500' }]}>Chưa điểm danh</Text>
            </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.background }]}>
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Điểm danh</Text>
            <View style={{alignItems: 'center'}}>
                <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 2, fontWeight: '600' }}>{className} • {classInfo ? classInfo.time : ''}</Text>
                {classInfo && <Text style={{ color: "#007AFF", fontSize: 12, marginTop: 1, fontWeight: '500' }}>PT: {classInfo.ptName}</Text>}
            </View>
        </View>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tổng quan</Text>
              <View style={styles.statsGrid}>
                <StatCard 
                    label="Có mặt" 
                    number={stats.present} 
                    config={STATUS_CONFIG.present} 
                    colors={colors} 
                    isActive={filterStatus === 'present'} 
                    onPress={() => toggleFilter('present')} 
                />
                <StatCard 
                    label="Đến trễ" 
                    number={stats.late} 
                    config={STATUS_CONFIG.late} 
                    colors={colors} 
                    isActive={filterStatus === 'late'} 
                    onPress={() => toggleFilter('late')} 
                />
                <StatCard 
                    label="Nghỉ" 
                    number={stats.absent} 
                    config={STATUS_CONFIG.absent} 
                    colors={colors} 
                    isActive={filterStatus === 'absent'} 
                    onPress={() => toggleFilter('absent')} 
                />
              </View>
          </View>

          <View style={{ flex: 1, marginTop: 10 }}>
              <View style={{ paddingHorizontal: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Danh sách ({filteredStudents.length})</Text>
                  
                  {filterStatus !== 'all' && (
                      <TouchableOpacity onPress={() => setFilterStatus('all')}>
                          <Text style={{ color: '#007AFF', fontSize: 13, fontWeight: '600' }}>Xem tất cả</Text>
                      </TouchableOpacity>
                  )}
              </View>
              <FlatList
                data={filteredStudents} 
                keyExtractor={(item) => `${item.originalClassId}_${item.id}`} 
                renderItem={renderStudentItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Image source={require("../../assets/user.png")} style={{ width: 60, height: 60, tintColor: colors.subtext, opacity: 0.5, marginBottom: 10 }} />
                        <Text style={{ textAlign: 'center', color: colors.subtext }}>
                            {filterStatus === 'all' ? "Lớp chưa có học viên." : "Không tìm thấy học viên."}
                        </Text>
                    </View>
                }
              />
          </View>
      </View>

      {/* --- 🔔 MODAL THÔNG BÁO --- */}
      <Modal visible={notiModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
                <View style={{ alignItems: 'center', marginBottom: 15 }}>
                      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 149, 0, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                         <Image source={require("../../assets/information.png")} style={{ width: 30, height: 30, tintColor: '#FF9500' }} />
                      </View>
                </View>

                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 }]}>Thông báo quan trọng</Text>
                
                <ScrollView style={{ maxHeight: 250, marginTop: 10, width: '100%' }}>
                    {notifications.map((item, index) => (
                        <View key={index} style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start', backgroundColor: isDark ? '#333' : '#f9f9f9', padding: 10, borderRadius: 12 }}>
                            <View style={{ marginRight: 12 }}>
                                {item.photoURL ? (
                                    <Image source={{ uri: item.photoURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                                ) : (
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontWeight: 'bold', color: '#555' }}>{(item.username || "?").charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{item.username || "Học viên ẩn danh"}</Text>
                                <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600', marginTop: 2 }}>{item.title}</Text>
                                <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 2 }}>{item.message}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.danger, marginTop: 15, borderWidth: 0 }]} onPress={handleCloseNotification}>
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Đã hiểu</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* Modal Cập nhật trạng thái */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Cập nhật trạng thái</Text>
                <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>{selectedStudent?.name}</Text>
                <View style={styles.statusOptions}>
                    {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((key) => {
                        const conf = STATUS_CONFIG[key];
                        const isSelected = selectedStudent?.status === key;
                        // ✅ SỬA LOGIC MÀU ICON
                        const optionIconColor = conf.noTint ? undefined : (conf.useThemeColorForIcon ? colors.text : conf.color);
                        
                        return (
                            <TouchableOpacity key={key} activeOpacity={0.8} style={[styles.optionButton, { backgroundColor: isDark ? '#3a3a3c' : '#f9f9f9', borderColor: isDark ? '#444' : '#eee' }, isSelected && { borderColor: conf.color, backgroundColor: conf.bg, borderWidth: 1.5 }]} onPress={() => handleStatusUpdate(key)}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.iconBox, { backgroundColor: conf.bg }]}>
                                        <Image source={conf.icon} style={{ width: 20, height: 20, tintColor: optionIconColor }} />
                                    </View>
                                    <Text style={[styles.optionText, { color: colors.text, fontWeight: isSelected ? '700' : '500' }]}>{conf.label}</Text>
                                </View>
                                {isSelected && <Image source={require("../../assets/success.png")} style={{ width: 20, height: 20, tintColor: conf.color }} />}
                            </TouchableOpacity>
                        )
                    })}
                </View>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.border }]} onPress={() => setModalVisible(false)}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>Hủy bỏ</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

      {/* ✅ MODAL CẢNH BÁO: HLV KHÔNG THỂ SỬA CHÍNH MÌNH */}
      <Modal visible={warningVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setWarningVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: colors.modalBg, alignItems: 'center', paddingVertical: 30 }]}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 59, 48, 0.15)', marginBottom: 16, marginRight: 0 }]}>
                    {/* ⚠️ ĐÃ SỬA: Bỏ tintColor để hiện icon gốc */}
                    <Image source={require("../../assets/close.png")} style={{ width: 24, height: 24, tintColor: undefined }} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>Hạn chế quyền</Text>
                <Text style={[styles.modalSubtitle, { color: colors.subtext, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 }]}>
                    Bạn không thể tự điểm danh cho chính mình:{"\n"}<Text style={{ fontWeight: '700', color: colors.text }}>{selectedStudent?.name}</Text>
                </Text>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: '#FF3B30', width: '100%', marginTop: 10, borderWidth: 0 }]} onPress={() => setWarningVisible(false)}>
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Đã hiểu</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const StatCard = ({ label, number, config, colors, isActive, onPress }: any) => {
    // Logic màu icon
    const cardIconColor = config.noTint ? undefined : (config.useThemeColorForIcon ? colors.text : config.color);
    
    // Logic màu nền thẻ
    const backgroundColor = isActive ? config.bg : colors.card;
    const borderColor = isActive ? config.color : 'transparent';

    return (
        <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={onPress}
            style={[
                styles.statCard, 
                { 
                    backgroundColor: backgroundColor, 
                    shadowColor: colors.shadow, 
                    flex: 1,
                    borderColor: borderColor,
                    borderWidth: isActive ? 1.5 : 0
                }
            ]}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <Text style={[styles.statNumber, { color: config.color }]}>{number}</Text>
                
                {/* ⚠️ ĐÃ SỬA: Loại bỏ logic đổi màu nền thành trắng khi active */}
                <View style={[
                    styles.miniIcon, 
                    { 
                        // Luôn dùng config.bg để đồng bộ màu nền, tránh ô vuông trắng
                        backgroundColor: config.bg 
                    }
                ]}>
                    <Image source={config.icon} style={{ width: 12, height: 12, tintColor: cardIconColor }} />
                </View>
            </View>
            <Text style={[styles.statLabel, { color: isActive ? config.color : colors.subtext, fontWeight: isActive ? '700' : '500' }]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 12, borderBottomWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 3 },
  backBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statCard: { padding: 14, borderRadius: 16, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, marginBottom: 0 },
  statNumber: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 13 },
  miniIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  studentCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 18, marginBottom: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, padding: 2, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 25 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  studentName: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  
  modernBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  modernBadgeText: { fontSize: 12, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { width: '100%', borderRadius: 24, padding: 24, paddingBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalSubtitle: { fontSize: 15, textAlign: 'center', marginBottom: 24, marginTop: 4 },
  statusOptions: { gap: 12 },
  optionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  optionText: { fontSize: 16 },
  closeButton: { marginTop: 24, padding: 16, borderRadius: 16, alignItems: 'center' }
});