import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Video from "react-native-video";
import { useTheme } from "../../src/context/ThemeContext";
import DB, { getAllSubExercisesLocal, deleteSubExerciseLocal, deleteSubExercisesByName } from "../../src/db/sqlite";
import ExerciseDetailModal from "../Exercise/ExerciseDetailModal";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Thêm AsyncStorage

const { width } = Dimensions.get("window");

export default function ExerciseSettingScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtitle: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    blue: "#4da3ff",
    red: "#FF3B30",
    modalBg: isDark ? "#2C2C2E" : "#FFFFFF",
  };

  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  // State kiểm tra quyền Admin
  const [isAdmin, setIsAdmin] = useState(false);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
        checkUserRole(); // Kiểm tra quyền trước
        loadSubs();
    });
    return unsubscribe;
  }, [navigation]);

  // ✅ Hàm kiểm tra quyền Admin
  const checkUserRole = async () => {
      try {
          await DB.initDB();
          const userId = await AsyncStorage.getItem("currentUserId");
          if (userId) {
              const users = await DB.getAllUsersLocal();
              const user = users.find((u: any) => String(u.id) === String(userId));
              if (user && user.role === 'admin') {
                  setIsAdmin(true);
              } else {
                  setIsAdmin(false);
              }
          }
      } catch (e) {
          console.error("Lỗi kiểm tra quyền:", e);
          setIsAdmin(false);
      }
  };

  const loadSubs = async () => {
    setLoading(true);
    try {
      const list = await getAllSubExercisesLocal();
      
      const uniqueList = list.reduce((acc: any[], current: any) => {
        const x = acc.find((item: any) => item.name === current.name);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      setSubs(uniqueList);
    } catch (error) {
      console.error("Lỗi load subs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: any) => {
    if (!time) return "00:00";
    const timeStr = String(time);
    if (timeStr.includes(":")) return timeStr;
    const total = parseInt(timeStr, 10);
    if (isNaN(total)) return "00:00";
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const confirmDelete = (id: number) => {
    setIdToDelete(id);
    setDeleteModalVisible(true);
  };

  const onConfirmDelete = async () => {
    if (idToDelete !== null) {
      try {
        const itemToDelete = subs.find(item => item.id === idToDelete);
        
        if (itemToDelete && itemToDelete.name) {
            await deleteSubExercisesByName(itemToDelete.name);
        } else {
            await deleteSubExerciseLocal(idToDelete);
        }

        await loadSubs(); 
      } catch (error) {
        console.error("Lỗi khi xóa bài tập:", error);
        Alert.alert("Lỗi", "Không thể xóa bài tập này.");
      } finally {
        setDeleteModalVisible(false); 
        setIdToDelete(null);
      }
    }
  };

  const handleEditPress = (item: any) => {
    const parentId = item.exercise_id || item.parent_id; 
    if (parentId) {
      navigation.navigate("EditSubExercisesScreen", { exerciseId: parentId });
    } else {
       navigation.navigate("EditSubExercisesScreen", { exerciseId: item.id }); 
    }
  };

  const openDetail = (item: any) => {
    setSelectedExercise(item);
    setDetailModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

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
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quản Lý Bài Tập</Text>
        
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>
        ) : subs.length === 0 ? (
          <View style={styles.center}>
             <Image source={require("../../assets/folder.png")} style={{ width: 80, height: 80, opacity: 0.5, marginBottom: 10 }} resizeMode="contain" />
             <Text style={{ color: colors.subtitle }}>Chưa có bài tập con nào.</Text>
          </View>
        ) : (
          subs.map((item) => (
            <TouchableOpacity 
                key={item.id} 
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => openDetail(item)}
            >
              <View style={styles.videoContainer}>
                  {item.video_path ? (
                    <Video source={{ uri: item.video_path }} style={styles.video} muted repeat paused={false} resizeMode="cover" />
                  ) : (
                    <View style={[styles.video, styles.noVideo]}><Text style={{ color: colors.subtitle, fontSize: 10 }}>No Video</Text></View>
                  )}
              </View>

              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                
                <Text style={[styles.subtitle, { color: colors.subtitle }]}>
                  {item.type === "time" ? formatTime(item.time) : `x${item.reps}`}
                </Text>

                {/* ✅ Chỉ hiện nút Sửa/Xóa nếu là Admin */}
                {isAdmin && (
                    <View style={{ flexDirection: "row", marginTop: 10 }}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.blue + '20' }]} 
                        onPress={() => handleEditPress(item)}
                    >
                        <Text style={[styles.actionText, { color: colors.blue }]}>Sửa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.red + '20', marginLeft: 10 }]} 
                        onPress={() => confirmDelete(item.id)}
                    >
                        <Text style={[styles.actionText, { color: colors.red }]}>Xóa</Text>
                    </TouchableOpacity>
                    </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ✅ Chỉ hiện nút Thêm nếu là Admin */}
      {isAdmin && (
          <View style={styles.fabContainer}>
            <TouchableOpacity style={[styles.fabButton, { backgroundColor: colors.blue }]} activeOpacity={0.8} onPress={() => navigation.navigate("AddSubExercisesScreen")}>
                <Text style={styles.fabIcon}>+</Text> 
                <Text style={styles.fabText}>Thêm Bài Tập</Text>
            </TouchableOpacity>
          </View>
      )}

      {/* Modal Xóa (Chỉ admin mới kích hoạt được nên ko cần check trong render) */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={modalStyles.modalOverlay}>
            <View style={[modalStyles.deleteContainer, { backgroundColor: colors.card }]}>
                <View style={[modalStyles.deleteIconCircle, { backgroundColor: '#FFECEB' }]}>
                    <Image source={require("../../assets/delete.png")} style={{ width: 28, height: 28, tintColor: colors.red }} />
                </View>
                <Text style={[modalStyles.modalTitle, { color: colors.text, marginTop: 16 }]}>Xác nhận xóa?</Text>
                <Text style={[modalStyles.modalMessage, { color: colors.subtitle, marginBottom: 24 }]}>
                    Hành động này sẽ xóa bài tập này và TẤT CẢ các bản sao của nó. Bạn có chắc chắn không?
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                    <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={[modalStyles.actionBtn, { backgroundColor: isDark ? '#333' : '#F3F4F6', flex: 1 }]}>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onConfirmDelete} style={[modalStyles.actionBtn, { backgroundColor: colors.red, flex: 1 }]}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Xóa tất cả</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      <ExerciseDetailModal 
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        exercise={selectedExercise}
        onAddToSelection={() => setDetailModalVisible(false)} 
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  
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

  fabContainer: { position: 'absolute', bottom: 30, alignSelf: 'center', zIndex: 10 },
  fabButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 50, shadowColor: "#4da3ff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabIcon: { fontSize: 24, color: '#fff', fontWeight: 'bold', marginRight: 8, marginTop: -2 },
  fabText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  
  card: { flexDirection: "row", marginHorizontal: 16, padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  videoContainer: { position: 'relative', marginRight: 12 },
  video: { width: 80, height: 80, borderRadius: 12, backgroundColor: "#000" },
  noVideo: { justifyContent: "center", alignItems: "center", backgroundColor: '#333' },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { marginTop: 4, fontSize: 14, fontWeight: "500" },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  actionText: { fontWeight: "700", fontSize: 12 },
});

const modalStyles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  deleteContainer: { width: '80%', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 10 },
  deleteIconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  modalMessage: { fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  actionBtn: { paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});