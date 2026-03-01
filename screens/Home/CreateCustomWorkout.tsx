import React, { useState, useEffect, useCallback, useRef } from "react"; 
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  ViewToken 
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Video from "react-native-video";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ✅ Thêm
import { useTheme } from "../../src/context/ThemeContext";
import { getAllSubExercisesLocal, executeSql } from "../../src/db/sqlite";
import ExerciseDetailModal from "../Exercise/ExerciseDetailModal";

const { width } = Dimensions.get("window");

const CreateCustomWorkout = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // --- STATE QUẢN LÝ ---
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // ✅ State lưu User ID

  // State theo dõi item nào đang hiển thị để auto play
  const [viewableItems, setViewableItems] = useState<number[]>([]);

  // Danh sách các bài tập Custom ĐÃ LƯU
  const [savedWorkouts, setSavedWorkouts] = useState<any[]>([]);

  const colors = {
    background: isDark ? "#0d0d0d" : "#ffffff",
    text: isDark ? "#ffffff" : "#000000",
    subText: isDark ? "#aaaaaa" : "#666666",
    primary: "#0055FF",
    cardBg: isDark ? "#1c1c1e" : "#f5f5f5",
    border: isDark ? "#333" : "#e0e0e0",
    white: "#ffffff",
  };

  // --- CẤU HÌNH AUTO PLAY ---
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visibleIds = viewableItems.map(item => item.item.id);
    setViewableItems(visibleIds);
  }, []);

  // --- ✅ LẤY USER ID KHI LOAD ---
  useEffect(() => {
      const getUserId = async () => {
          try {
              const id = await AsyncStorage.getItem("currentUserId");
              setCurrentUserId(id);
          } catch (e) {
              console.error(e);
          }
      };
      getUserId();
  }, []);

  // --- ✅ HÀM TẢI DỮ LIỆU BÀI TẬP ĐÃ LƯU (ĐÃ LỌC THEO USER) ---
  const fetchSavedWorkouts = async () => {
    // Chỉ tải nếu đã có userId
    if (!currentUserId) return;

    try {
      // Thêm điều kiện: category = 'Tự chọn' AND user_id = ?
      const result = await executeSql(
        "SELECT * FROM exercises WHERE category = ? AND user_id = ? ORDER BY id DESC",
        ["Tự chọn", currentUserId]
      );

      const temp: any[] = [];
      const len = result.rows.length;
      for (let i = 0; i < len; i++) {
        temp.push(result.rows.item(i));
      }

      setSavedWorkouts(temp);
    } catch (e) {
      console.error("Lỗi tải bài tập custom:", e);
    }
  };

  // Load lại mỗi khi màn hình focus hoặc userId thay đổi
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchSavedWorkouts();
      }
    }, [currentUserId])
  );

  // --- HÀM TẢI DỮ LIỆU BÀI TẬP CON (Cho Modal chọn) ---
  const fetchSubExercises = async () => {
    setLoading(true);
    try {
      const list = await getAllSubExercisesLocal();
      const uniqueList = list.reduce((acc: any[], current: any) => {
        const x = acc.find((item: any) => item.name === current.name);
        return !x ? acc.concat([current]) : acc;
      }, []);
      setExercises(uniqueList);
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể tải danh sách bài tập");
    } finally {
      setLoading(false);
    }
  };

  const handlePressWorkout = async (item: any) => {
    try {
      const result = await executeSql(
        "SELECT * FROM sub_exercises WHERE parent_id = ? ORDER BY order_index ASC",
        [item.id]
      );

      const subExercises: any[] = [];
      const len = result.rows.length;
      for (let i = 0; i < len; i++) {
        subExercises.push(result.rows.item(i));
      }

      navigation.navigate("PreWorkoutScreen", {
        workout: item,
        exercises: subExercises
      });

    } catch (e) {
      console.error("Lỗi khi mở bài tập:", e);
      Alert.alert("Lỗi", "Không thể mở chi tiết bài tập này.");
    }
  };

  const handleCreateNewWorkout = () => {
    setSelectedIds([]); 
    setModalVisible(true); 
    fetchSubExercises(); 
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmSelection = () => {
    if (selectedIds.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một bài tập");
      return;
    }
    setModalVisible(false);
    const selectedExercisesData = exercises.filter(ex => selectedIds.includes(ex.id));

    navigation.navigate("EditCustomWorkoutScreen", {
      isCreatingCustom: true,
      initialSelected: selectedExercisesData,
      existingName: "Chương trình mới",
      // Truyền userId sang màn hình edit để khi lưu sẽ gán vào
      userId: currentUserId 
    });
    setSelectedIds([]);
  };

  const formatTimeDisplay = (totalSeconds: string | number) => {
    const sec = parseInt(String(totalSeconds));
    if (isNaN(sec)) return "0 phút";
    const min = Math.floor(sec / 60);
    return min > 0 ? `${min} phút` : `${sec} giây`;
  };

  const renderSavedItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={[styles.savedItemCard, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => handlePressWorkout(item)}
      >
        <View style={styles.iconContainer}>
          <Image source={require("../../assets/edit.png")} style={{ width: 24, height: 24, tintColor: '#fff' }} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={[styles.savedTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.savedSubtitle, { color: colors.subText }]}>
            {formatTimeDisplay(item.time)} · {item.exerciseCount} bài tập
          </Text>
        </View>

        <Image source={require("../../assets/right-arrow.png")} style={{ width: 16, height: 16, tintColor: colors.subText }} />
      </TouchableOpacity>
    );
  };

  const renderModalItem = ({ item }: { item: any }) => {
    const isSelected = selectedIds.includes(item.id);
    const isPlaying = viewableItems.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1
          },
        ]}
        onPress={() => {
          setSelectedExerciseDetail(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.videoContainer}>
          {item.video_path ? (
            <Video
              source={{ uri: item.video_path }}
              style={styles.video}
              muted={true}        
              resizeMode="cover"
              repeat={true}       
              paused={!isPlaying} 
            />
          ) : (
            <View style={[styles.video, styles.noVideo]}><Text style={{ color: "#aaa", fontSize: 10 }}>No Video</Text></View>
          )}
        </View>
        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={{ color: colors.subText }}>{item.type === "time" ? item.time : `x${item.reps}`}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkbox, {
            borderColor: isSelected ? colors.primary : colors.subText,
            backgroundColor: isSelected ? colors.primary : 'transparent'
          }]}
          onPress={() => toggleSelection(item.id)}
        >
          {isSelected && <Image source={require("../../assets/check-mark.png")} style={{ width: 12, height: 12, tintColor: '#fff' }} />}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>TÙY CHỈNH BÀI TẬP</Text>
      </View>

      {/* Logic hiển thị: Có bài tập -> List, Không -> Empty State */}
      {savedWorkouts.length > 0 ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={savedWorkouts}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderSavedItem}
            contentContainerStyle={{ padding: 20 }}
          />

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={handleCreateNewWorkout}
          >
            <Text style={{ fontSize: 30, color: '#fff' }}>+</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyContent}>
          <View style={styles.imageContainer}>
            <Image source={require("../../assets/trainer.png")} style={styles.centerImage} resizeMode="cover" />
          </View>
          <Text style={[styles.description, { color: colors.subText }]}>
            Bạn có thể thiết kế kế hoạch cá nhân phù hợp với mục tiêu của mình.
          </Text>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateNewWorkout} 
            >
              <Text style={styles.createButtonText}>+ Tạo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* --- MODAL CHỌN BÀI TẬP --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: colors.subText }}>Hủy</Text></TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn bài tập</Text>
              <View style={{ width: 30 }} />
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={exercises}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderModalItem}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
              />
            )}

            <View style={[styles.modalFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: selectedIds.length > 0 ? colors.primary : '#555', height: 50 }]}
                onPress={handleConfirmSelection}
                disabled={selectedIds.length === 0}
              >
                <Text style={styles.createButtonText}>Thêm vào kế hoạch {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ExerciseDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        exercise={selectedExerciseDetail}
        onAddToSelection={(id: number) => {
          if (!selectedIds.includes(id)) setSelectedIds([...selectedIds, id]);
          setDetailModalVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 10, height: 50 },
  backButton: { padding: 5, marginRight: 15 },
  backIcon: { width: 24, height: 24, resizeMode: "contain" },
  headerTitle: { fontSize: 20, fontWeight: "bold", textTransform: "uppercase" },

  emptyContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30, marginTop: -50 },
  imageContainer: { width: 180, height: 180, borderRadius: 90, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", marginBottom: 30, overflow: "hidden", borderWidth: 1, borderColor: "#eee" },
  centerImage: { width: "100%", height: "100%" },
  description: { fontSize: 16, textAlign: "center", lineHeight: 24, marginBottom: 40 },
  footer: { width: '100%' },

  createButton: { width: "100%", height: 55, borderRadius: 30, justifyContent: "center", alignItems: "center", shadowColor: "#0055FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  createButtonText: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },

  savedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  savedTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  savedSubtitle: { fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { height: "85%", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalFooter: { padding: 16, borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0 },

  card: { flexDirection: "row", padding: 10, borderRadius: 12, marginBottom: 12, alignItems: "center" },
  videoContainer: { position: 'relative', marginRight: 10 },
  video: { width: 70, height: 70, borderRadius: 8, backgroundColor: "#000" },
  noVideo: { justifyContent: "center", alignItems: "center", backgroundColor: '#333' },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  checkbox: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 'auto', marginRight: 5 }
});

export default CreateCustomWorkout;