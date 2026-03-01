import React, { useState, useEffect, useCallback, useRef } from "react"; 
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
  ViewToken 
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler"; 
import Video from "react-native-video";

// Import DB Functions
import { getAllSubExercisesLocal, executeSql, addExerciseLocal } from "../../src/db/sqlite";
// Import Modal Chi Tiết
import ExerciseDetailModal from "../Exercise/ExerciseDetailModal";

const { width } = Dimensions.get("window");

export default function EditCustomWorkoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Nhận userId từ params để lưu vào DB
  const { initialSelected, existingName, parentId, userId } = route.params || {};

  const [workoutName, setWorkoutName] = useState(existingName || "Chương trình mới");
  const [isEditingName, setIsEditingName] = useState(false);
  const [exercises, setExercises] = useState<any[]>(initialSelected || []);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);
  
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<any>(null);

  // --- ✅ STATE CHO AUTO PLAY ---
  const [viewableItems, setViewableItems] = useState<number[]>([]); // Cho list chính
  const [viewableModalItems, setViewableModalItems] = useState<number[]>([]); // Cho list trong modal

  const colors = {
    bg: isDark ? "#0d0d0d" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtext: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#eee",
    primary: "#0055FF",
    inputBg: isDark ? "#2C2C2E" : "#F5F5F5",
    activeItem: isDark ? "#1C1C1E" : "#f9f9f9",
    deleteBg: "#FF3B30",
  };

  // --- ✅ CẤU HÌNH AUTO PLAY ---
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Hiển thị 50% thì chạy
  }).current;

  // Xử lý cho danh sách chính (DraggableFlatList)
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visibleIds = viewableItems.map(item => item.item.id);
    setViewableItems(visibleIds);
  }, []);

  // Xử lý cho danh sách chọn bài tập (Modal FlatList)
  const onViewableItemsChangedModal = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visibleIds = viewableItems.map(item => item.item.id);
    setViewableModalItems(visibleIds);
  }, []);

  const parseTimeToSeconds = (time: string | number) => {
    if (!time) return 0;
    const strTime = String(time);
    if (strTime.includes(":")) {
      const [m, s] = strTime.split(":");
      return (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
    }
    return parseInt(strTime) || 0;
  };

  const formatTime = (time: string | number) => {
    let totalSec = parseTimeToSeconds(time);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const openAddModal = async () => {
    setModalVisible(true);
    setLoadingExercises(true);
    try {
      const list = await getAllSubExercisesLocal();
      const uniqueList = list.reduce((acc: any[], current: any) => {
        const x = acc.find((item: any) => item.name === current.name);
        if (!x) return acc.concat([current]);
        return acc;
      }, []);
      setAllExercises(uniqueList);
      const currentIds = exercises.map(e => e.id);
      setTempSelectedIds(currentIds);
    } catch (e) { console.error(e); } finally { setLoadingExercises(false); }
  };

  const toggleTempSelection = (id: number) => {
    setTempSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmAddExercises = () => {
    const newSelectedExercises = allExercises.filter(ex => tempSelectedIds.includes(ex.id));
    const mergedList = newSelectedExercises.map(newEx => {
      const existing = exercises.find(e => e.id === newEx.id);
      return existing ? existing : newEx;
    });
    setExercises(mergedList);
    setModalVisible(false);
  };

  const removeExercise = (index: number) => {
      const newList = [...exercises];
      newList.splice(index, 1);
      setExercises(newList);
  };

  const openDetail = (item: any) => {
      setSelectedExerciseDetail(item);
      setDetailModalVisible(true);
  };

  // --- ✅ HÀM LƯU BÀI TẬP ---
  const handleSaveWorkout = async () => {
    if (exercises.length === 0) return Alert.alert("Lỗi", "Cần ít nhất 1 bài tập.");
    if (!workoutName.trim()) return Alert.alert("Lỗi", "Vui lòng đặt tên.");

    setSaving(true);
    try {
      let totalSeconds = 0;
      exercises.forEach(ex => {
        if (ex.type === "time") totalSeconds += parseTimeToSeconds(ex.time);
        else totalSeconds += (ex.reps || 10) * 5; 
      });
      const newImage = exercises[0].image || "";
      let targetParentId = parentId;

      if (parentId) {
         // Cập nhật bài cũ
         await executeSql(`UPDATE exercises SET title = ?, time = ?, exerciseCount = ?, image = ? WHERE id = ?`, [workoutName, String(totalSeconds), exercises.length, newImage, parentId]);
         // Xóa bài con cũ để thêm lại từ đầu (đơn giản hóa logic sort)
         await executeSql(`DELETE FROM sub_exercises WHERE parent_id = ?`, [parentId]);
      } else {
        // Tạo bài mới
        targetParentId = await addExerciseLocal({ 
            category: "Tự chọn", 
            title: workoutName, 
            time: String(totalSeconds), 
            difficulty: "Tùy chỉnh", 
            exerciseCount: exercises.length, 
            image: newImage,
            user_id: userId // ✅ Lưu ID người tạo
        });
        if (!targetParentId) throw new Error("Lỗi tạo bài cha");
      }

      // Lưu danh sách bài con
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        const timeVal = ex.type === 'time' ? formatTime(ex.time) : "00:00";
        const repsVal = ex.type === 'rep' ? (ex.reps || 10) : 0;
        await executeSql(`INSERT INTO sub_exercises (parent_id, name, detail, video_path, type, reps, time, order_index, instruction, focus_area, muscle_image, instruction_video, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [targetParentId, ex.name, "", ex.video_path, ex.type || "rep", repsVal, timeVal, i, ex.instruction || "", ex.focus_area || "", ex.muscle_image || "", ex.instruction_video || "", Date.now()]
        );
      }
      
      Alert.alert("Thành công", "Đã lưu bài tập!", [{ text: "OK", onPress: () => navigation.navigate("CreateCustomWorkout") }]);
    } catch (error) { 
        console.error(error); 
        Alert.alert("Lỗi", "Không thể lưu bài tập."); 
    } finally { 
        setSaving(false); 
    }
  };

  const renderRightActions = (progress: any, dragX: any, index: number) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity onPress={() => removeExercise(index)} style={styles.deleteBox}>
        <Animated.View style={{ transform: [{ scale }] }}>
            <Image source={require("../../assets/delete.png")} style={{width: 24, height: 24, tintColor: '#fff'}} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // ✅ RENDER ITEM CHÍNH (Đã cập nhật Video Auto Play)
  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<any>) => {
    const index = getIndex();
    const isPlaying = viewableItems.includes(item.id); // Kiểm tra item có đang hiển thị không

    return (
      <ScaleDecorator>
        <Swipeable renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, index || 0)}>
            <TouchableOpacity
              onLongPress={drag}
              onPress={() => openDetail(item)}
              disabled={isActive}
              activeOpacity={1}
              style={[
                styles.listItem,
                { 
                    backgroundColor: isActive ? colors.activeItem : colors.bg, 
                    borderBottomColor: colors.border 
                }
              ]}
            >
              <View style={styles.thumbnailContainer}>
                 {item.video_path ? (
                    <Video 
                        source={{uri: item.video_path}} 
                        style={styles.thumbnail} 
                        muted={true} 
                        resizeMode="cover" 
                        paused={!isPlaying || isActive} // Dừng nếu không hiển thị hoặc đang bị kéo (drag)
                        repeat={true} 
                    />
                 ) : (
                    <Image source={item.image ? {uri: item.image} : require("../../assets/workout_placeholder.png")} style={styles.thumbnail} resizeMode="cover" />
                 )}
              </View>

              <View style={{ flex: 1, paddingHorizontal: 15 }}>
                 <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                 <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 4 }}>
                    {item.type === 'time' ? item.time : `x${item.reps || 10}`}
                 </Text>
              </View>

              <TouchableOpacity onLongPress={drag} delayLongPress={100} style={styles.dragHandle}>
                 <Image source={require("../../assets/menu.png")} style={{width: 20, height: 20, tintColor: colors.subtext}} />
              </TouchableOpacity>

            </TouchableOpacity>
        </Swipeable>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Image source={require("../../assets/back.png")} style={[styles.backIcon, {tintColor: colors.text}]} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
                {parentId ? "CHỈNH SỬA" : "TẠO MỚI"}
            </Text>
            <View style={{width: 30}} />
        </View>

        <View style={styles.infoSection}>
            <View style={styles.workoutIconContainer}>
                 <Image source={require("../../assets/edit.png")} style={{width: 30, height: 30, tintColor: '#fff'}} />
            </View>
            <View style={{flex: 1, marginLeft: 15}}>
                {isEditingName ? (
                    <TextInput 
                        style={[styles.nameInput, { color: colors.text }]}
                        value={workoutName}
                        onChangeText={setWorkoutName}
                        autoFocus
                        onBlur={() => setIsEditingName(false)}
                    />
                ) : (
                    <TouchableOpacity onPress={() => setIsEditingName(true)}>
                        <Text style={[styles.workoutName, { color: colors.text }]} numberOfLines={1}>{workoutName}</Text>
                    </TouchableOpacity>
                )}
                <Text style={{color: colors.subtext, fontSize: 13}}>
                    {exercises.length} bài tập • Ước tính {Math.ceil(exercises.length * 1.5)} phút
                </Text>
            </View>
        </View>

        {/* ✅ LIST CHÍNH */}
        <DraggableFlatList
          data={exercises}
          onDragEnd={({ data }) => setExercises(data)}
          keyExtractor={(item, index) => `item-${item.id}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          // --- Cấu hình auto play ---
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
            <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>

        <View style={[styles.bottomSaveContainer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
             <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveWorkout} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
             </TouchableOpacity>
        </View>

        {/* --- MODAL THÊM BÀI TẬP --- */}
        <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
             <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
                    <View style={[styles.modalHeader, {borderBottomColor: colors.border}]}>
                         <TouchableOpacity onPress={() => setModalVisible(false)}>
                             <Text style={{color: colors.subtext, fontSize: 16}}>Hủy</Text>
                         </TouchableOpacity>
                         <Text style={{color: colors.text, fontSize: 18, fontWeight: 'bold'}}>Thêm bài tập</Text>
                         <TouchableOpacity onPress={confirmAddExercises}>
                             <Text style={{color: colors.primary, fontSize: 16, fontWeight: 'bold'}}>Xong</Text>
                         </TouchableOpacity>
                    </View>
                    {loadingExercises ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 20}} />
                    ) : (
                        <FlatList 
                            data={allExercises}
                            keyExtractor={(item) => item.id.toString()}
                            // --- Cấu hình auto play cho Modal ---
                            onViewableItemsChanged={onViewableItemsChangedModal}
                            viewabilityConfig={viewabilityConfig}
                            renderItem={({item}) => {
                                const isSelected = tempSelectedIds.includes(item.id);
                                const isPlaying = viewableModalItems.includes(item.id);

                                return (
                                    <TouchableOpacity 
                                        style={[styles.modalItem, {borderBottomColor: colors.border}]}
                                        onPress={() => toggleTempSelection(item.id)}
                                    >
                                        <View style={styles.modalThumbContainer}>
                                            {item.video_path ? (
                                                <Video 
                                                    source={{uri: item.video_path}} 
                                                    style={styles.modalThumb} 
                                                    muted={true} 
                                                    resizeMode="cover" 
                                                    paused={!isPlaying} // Auto play trong modal
                                                    repeat={true} 
                                                />
                                            ) : (
                                                <Image source={item.image ? {uri: item.image} : require("../../assets/workout_placeholder.png")} style={styles.modalThumb} />
                                            )}
                                        </View>
                                        <View style={{flex: 1, marginLeft: 10}}>
                                            <Text style={{color: colors.text, fontWeight: '600'}}>{item.name}</Text>
                                        </View>
                                        <View style={[styles.checkbox, {borderColor: isSelected ? colors.primary : colors.subtext, backgroundColor: isSelected ? colors.primary : 'transparent'}]}>
                                             {isSelected && <Image source={require("../../assets/check-mark.png")} style={{width: 10, height: 10, tintColor: '#fff'}} />}
                                        </View>
                                    </TouchableOpacity>
                                )
                            }}
                        />
                    )}
                </View>
             </View>
        </Modal>

        <ExerciseDetailModal
          visible={detailModalVisible}
          onClose={() => setDetailModalVisible(false)}
          exercise={selectedExerciseDetail}
          onAddToSelection={() => setDetailModalVisible(false)} 
        />

      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  backBtn: { padding: 5, marginRight: 15 },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase' },
  
  infoSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  workoutIconContainer: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#4DA3FF', justifyContent: 'center', alignItems: 'center' },
  workoutName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  nameInput: { fontSize: 18, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 2 },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1, 
  },
  thumbnailContainer: {
      width: 60, height: 60, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee'
  },
  thumbnail: { width: '100%', height: '100%' },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  dragHandle: { padding: 10 },

  deleteBox: {
      backgroundColor: '#FF3B30',
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: '100%'
  },

  fab: {
      position: 'absolute', right: 20, bottom: 90, 
      width: 56, height: 56, borderRadius: 28, 
      backgroundColor: '#0055FF', justifyContent: 'center', alignItems: 'center',
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6
  },
  fabIcon: { fontSize: 32, color: '#fff', marginTop: -2 },

  bottomSaveContainer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20,
      borderTopWidth: 1
  },
  saveBtn: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  modalThumbContainer: { width: 50, height: 50, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee' },
  modalThumb: { width: '100%', height: '100%' },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' }
});