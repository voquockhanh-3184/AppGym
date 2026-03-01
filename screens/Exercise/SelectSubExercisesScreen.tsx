import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
  Alert,
  Platform,
  TouchableWithoutFeedback // Import thêm cái này
} from "react-native";
import Video from "react-native-video";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
import DB from "../../src/db/sqlite"; 
// IMPORT MODAL VỪA TẠO
import ExerciseDetailModal from "./ExerciseDetailModal"; 

const { width } = Dimensions.get("window");

export default function SelectSubExercisesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const exerciseId = route.params?.exerciseId;
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    bg: isDark ? "#0d0d0d" : "#F5F7FA",
    card: isDark ? "#1c1c1e" : "#fff",
    text: isDark ? "#fff" : "#1F2937",
    subtitle: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#ddd",
    blue: "#007AFF",
  };

  const [subs, setSubs] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // --- STATE CHO MODAL CHI TIẾT ---
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<any>(null);

  useEffect(() => {
    loadSubs();
  }, []);

  const loadSubs = async () => {
    setLoading(true);
    try {
      const list = await DB.getAllSubExercisesLocal();
      const uniqueList = [];
      const seenNames = new Set();
      for (const item of list) {
        if (!seenNames.has(item.name)) {
          seenNames.add(item.name);
          uniqueList.push(item);
        }
      }
      setSubs(uniqueList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: any) => {
    if (!time) return "00:00";
    const str = String(time);
    if (str.includes(":")) return str;
    const total = parseInt(str, 10);
    if (isNaN(total)) return "00:00";
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // HÀM MỞ MODAL
  const openDetail = (item: any) => {
      setSelectedExerciseForDetail(item);
      setDetailModalVisible(true);
  };

  // HÀM XỬ LÝ KHI BẤM NÚT "THÊM" TRONG MODAL
  const handleAddFromModal = (id: number) => {
      // Nếu chưa chọn thì thêm vào selected, nếu chọn rồi thì thôi (hoặc toggle tùy ý bạn)
      if (!selected.includes(id)) {
          setSelected(prev => [...prev, id]);
      }
      setDetailModalVisible(false);
  };

  const addSelected = async () => {
    if (selected.length === 0) return;
    if (!exerciseId) {
        Alert.alert("Lỗi", "Không tìm thấy ID bài tập cha.");
        return;
    }
    setProcessing(true);
    try {
      const promises = selected.map(subId => DB.cloneSubExercise(subId, exerciseId));
      await Promise.all(promises);
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("Lỗi:", error);
      Alert.alert("Lỗi", "Đã có lỗi xảy ra.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseSuccess = () => {
      setSuccessModalVisible(false);
      navigation.navigate("ExerciseDetailScreen", { exercise: { id: exerciseId } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
           onPress={() => navigation.goBack()} 
           style={[styles.backBtn, { backgroundColor: isDark ? '#333' : '#fff' }]}
        >
          <Image 
            source={require("../../assets/back.png")} 
            style={[styles.backIcon, { tintColor: isDark ? '#fff' : '#333' }]} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chọn bài tập từ thư viện</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.blue} style={{marginTop: 50}} />
        ) : subs.length === 0 ? (
            <View style={{alignItems: 'center', marginTop: 50}}>
                <Text style={{color: colors.subtitle}}>Chưa có bài tập nào.</Text>
            </View>
        ) : (
          subs.map(item => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => openDetail(item)} // SỬA Ở ĐÂY: Bấm vào card thì mở chi tiết
              style={[
                styles.card,
                {
                  backgroundColor: selected.includes(item.id) ? colors.blue + "15" : colors.card,
                  borderColor: selected.includes(item.id) ? colors.blue : colors.border,
                },
              ]}
            >
              {/* CHECKBOX RIÊNG BIỆT: Cần bọc trong TouchableOpacity để bấm riêng */}
              <TouchableOpacity 
                activeOpacity={0.6}
                onPress={() => toggleSelect(item.id)} // Bấm vào checkbox thì chọn/bỏ chọn
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: selected.includes(item.id) ? colors.blue : "transparent",
                    borderColor: selected.includes(item.id) ? colors.blue : colors.border,
                  },
                ]}
              >
                {selected.includes(item.id) && <Text style={styles.checkText}>✓</Text>}
              </TouchableOpacity>

              {/* PHẦN CÒN LẠI CỦA CARD (Hình + Chữ) sẽ kích hoạt onPress của cha (openDetail) */}
              <View style={{flexDirection: 'row', flex: 1, alignItems: 'center'}}>
                  {item.video_path ? (
                    <Video
                      source={{ uri: item.video_path }}
                      style={styles.video}
                      muted repeat resizeMode="cover" paused={true} // Pause video ở list cho nhẹ
                    />
                  ) : (
                    <View style={[styles.video, styles.noVideo]}>
                      <Text style={{ color: colors.subtitle, fontSize: 10 }}>No Video</Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.detail, { color: colors.subtitle }]}>
                      {item.type === "time" ? formatTime(item.time) : `x${item.reps}`}
                    </Text>
                  </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FOOTER BUTTON */}
      <View style={[styles.footerContainer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity
            style={[
            styles.addBtn,
            { backgroundColor: selected.length ? colors.blue : "#9CA3AF" },
            ]}
            disabled={selected.length === 0 || processing}
            onPress={addSelected}
        >
            {processing ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                + Thêm {selected.length} bài tập
                </Text>
            )}
        </TouchableOpacity>
      </View>

      {/* MODAL THÀNH CÔNG */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        {/* ... (giữ nguyên code modal success cũ của bạn) ... */}
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                {/* ... content ... */}
                 <Text style={[styles.modalTitle, { color: colors.text }]}>Thành công!</Text>
                 <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: colors.blue }]} 
                    onPress={handleCloseSuccess}
                >
                    <Text style={styles.modalButtonText}>Hoàn tất</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* --- NHÚNG MODAL CHI TIẾT VÀO ĐÂY --- */}
      <ExerciseDetailModal 
        visible={detailModalVisible}
        exercise={selectedExerciseForDetail}
        onClose={() => setDetailModalVisible(false)}
        onAddToSelection={handleAddFromModal}
      />

    </View>
  );
}

// ... styles giữ nguyên, chỉ đảm bảo import styles ...
const styles = StyleSheet.create({
    // ... Giữ nguyên style cũ của bạn
    container: { flex: 1 },
    header: { paddingTop: Platform.OS === 'android' ? 50 : 60, paddingBottom: 15, paddingHorizontal: 20, alignItems: "center", justifyContent: "space-between", flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', zIndex: 100 },
    headerTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    backIcon: { width: 20, height: 20, resizeMode: "contain" },
    
    card: { flexDirection: "row", borderWidth: 1.5, padding: 12, marginHorizontal: 20, marginTop: 14, borderRadius: 16, alignItems: "center" },
    checkbox: { width: 24, height: 24, borderWidth: 2, borderRadius: 6, marginRight: 14, justifyContent: "center", alignItems: "center", zIndex: 10 }, // zIndex quan trọng để bấm được
    checkText: { color: "#fff", fontSize: 14, fontWeight: "900" },
    video: { width: 70, height: 70, borderRadius: 10, marginRight: 14, backgroundColor: '#000' },
    noVideo: { justifyContent: "center", alignItems: "center", backgroundColor: "#e0e0e0" },
    title: { fontSize: 16, fontWeight: "700" },
    detail: { fontSize: 13, marginTop: 4 },
    footerContainer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1 },
    addBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '85%', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
    modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
    modalButton: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});