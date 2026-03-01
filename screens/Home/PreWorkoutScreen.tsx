import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Alert,
  Modal,
  TouchableWithoutFeedback
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
import Video from "react-native-video";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Import hàm SQL
import { executeSql } from "../../src/db/sqlite";

// Import Modal Chi Tiết Bài Tập
import ExerciseDetailModal from "../Exercise/ExerciseDetailModal";

const { width } = Dimensions.get("window");

const PreWorkoutScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { workout, exercises: initialExercises } = route.params || {};
  const [exercises, setExercises] = useState<any[]>(initialExercises || []);
  
  // State điều khiển Popup Menu
  const [menuVisible, setMenuVisible] = useState(false);

  // State điều khiển Modal Chi Tiết
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<any>(null);

  const colors = {
    bg: isDark ? "#0d0d0d" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtext: isDark ? "#aaa" : "#666",
    cardBg: isDark ? "#1c1c1e" : "#F5F7FA", 
    primary: "#0055FF",
    border: isDark ? "#333" : "#eee",
    activeItem: isDark ? "#333" : "#e6f0ff",
    menuBg: isDark ? "#2C2C2E" : "#fff",
    danger: "#FF3B30",
  };

  const formatTimeDisplay = (seconds: any) => {
    const sec = parseInt(seconds);
    if (isNaN(sec)) return "0 phút";
    if (sec < 60) return `${sec} giây`;
    const min = Math.floor(sec / 60);
    return `${min} phút`;
  };

  // --- ✅ HÀM XỬ LÝ KHI KÉO THẢ XONG (LƯU DB NGAY) ---
  const handleDragEnd = async ({ data }: { data: any[] }) => {
    // 1. Cập nhật UI ngay lập tức
    setExercises(data);

    try {
        // 2. Cập nhật thứ tự (order_index) trong Database
        // Duyệt qua mảng mới, index trong mảng chính là thứ tự mới
        const promises = data.map((item, index) => {
            return executeSql(
                "UPDATE sub_exercises SET order_index = ? WHERE id = ?",
                [index, item.id]
            );
        });

        // Chạy tất cả lệnh update song song
        await Promise.all(promises);
        console.log("✅ Đã lưu thứ tự mới vào DB");
        
    } catch (error) {
        console.error("❌ Lỗi khi lưu thứ tự:", error);
    }
  };

  // --- LOGIC: CHUYỂN SANG TRANG SỬA ---
  const handleEdit = () => {
    setMenuVisible(false);
    navigation.navigate("EditCustomWorkoutScreen", {
        isCreatingCustom: false,
        initialSelected: exercises,
        existingName: workout.title,
        parentId: workout.id
    });
  };

  // --- LOGIC: XÓA BÀI TẬP ---
  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
        "Xóa bài tập",
        "Bạn có chắc chắn muốn xóa bài tập này không? Hành động này không thể hoàn tác.",
        [
            { text: "Hủy", style: "cancel" },
            { 
                text: "Xóa", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await executeSql("DELETE FROM sub_exercises WHERE parent_id = ?", [workout.id]);
                        await executeSql("DELETE FROM exercises WHERE id = ?", [workout.id]);
                        navigation.goBack();
                    } catch (e) {
                        console.error("Lỗi xóa bài tập:", e);
                        Alert.alert("Lỗi", "Không thể xóa bài tập này.");
                    }
                }
            }
        ]
    );
  };

  // --- LOGIC: BẮT ĐẦU TẬP ---
  const handleStartWorkout = () => {
      if (exercises.length === 0) {
          Alert.alert("Thông báo", "Bài tập này chưa có động tác nào.");
          return;
      }

      navigation.navigate("StartExerciseScreen", {
          exercise: workout,       
          subExercises: exercises, 
          title: workout.title,
          image: workout.image
      });
  };

  const openDetail = (item: any) => {
      setSelectedExerciseDetail(item);
      setDetailModalVisible(true);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag} // Giữ để kéo
          onPress={() => openDetail(item)}
          disabled={isActive}
          style={[
            styles.itemContainer, 
            { borderBottomColor: colors.border, backgroundColor: isActive ? colors.activeItem : colors.bg }
          ]}
        >
          <View style={styles.mediaContainer}>
              {item.video_path ? (
                  <Video source={{ uri: item.video_path }} style={styles.itemVideo} resizeMode="cover" muted={true} repeat={true} paused={false} />
              ) : (
                  <Image source={item.image ? {uri: item.image} : (item.muscle_image ? {uri: item.muscle_image} : require("../../assets/workout_placeholder.png"))} style={styles.itemImage} resizeMode="cover" />
              )}
          </View>
          
          <View style={{flex: 1, paddingHorizontal: 15}}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>{item.name}</Text>
            <Text style={{ color: colors.subtext, fontSize: 14 }}>
              {item.type === 'time' ? item.time : `x${item.reps}`}
            </Text>
          </View>
    
          <View style={{ padding: 10 }}>
            <Image source={require("../../assets/menu.png")} style={{width: 20, height: 20, tintColor: colors.subtext, opacity: 0.8}} />
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* HEADER */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Image source={require("../../assets/back.png")} style={[styles.icon, {tintColor: colors.text}]} />
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.iconBtn}
                onPress={() => setMenuVisible(true)}
            >
                <Image source={require("../../assets/dots.png")} style={[styles.icon, {tintColor: colors.text}]} />
            </TouchableOpacity>
        </View>

        {/* TITLE */}
        <Text style={[styles.title, { color: colors.text }]}>{workout?.title || "Bài tập tùy chỉnh"}</Text>

        {/* STATS */}
        <View style={styles.statsContainer}>
            <View style={[styles.statBox, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatTimeDisplay(workout?.time)}</Text>
                <Text style={[styles.statLabel, { color: colors.subtext }]}>Thời lượng</Text>
            </View>
            <View style={{width: 15}} />
            <View style={[styles.statBox, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{exercises?.length || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.subtext }]}>Bài tập</Text>
            </View>
        </View>

        {/* LIST - Sử dụng handleDragEnd để lưu DB */}
        <DraggableFlatList
            data={exercises}
            onDragEnd={handleDragEnd} // ✅ Gọi hàm lưu DB khi thả tay
            keyExtractor={(item) => `draggable-item-${item.id}`}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
        />

        {/* FOOTER BUTTON */}
        <View style={[styles.footer, { backgroundColor: colors.bg }]}>
            <TouchableOpacity 
                style={[styles.startBtn, { backgroundColor: colors.primary }]}
                onPress={handleStartWorkout}
            >
                <Text style={styles.startBtnText}>Khởi đầu</Text>
            </TouchableOpacity>
        </View>

        {/* POPUP MENU MODAL */}
        <Modal
            visible={menuVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setMenuVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.menuContainer, { backgroundColor: colors.menuBg, shadowColor: isDark ? "#000" : "#888" }]}>
                        <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
                            <Image source={require("../../assets/edit.png")} style={{width: 18, height: 18, tintColor: colors.text, marginRight: 10}} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Chỉnh sửa</Text>
                        </TouchableOpacity>
                        <View style={{height: 1, backgroundColor: colors.border, marginVertical: 5}} />
                        <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                            <Image source={require("../../assets/close.png")} style={{width: 16, height: 16, tintColor: colors.danger, marginRight: 12}} />
                            <Text style={[styles.menuText, { color: colors.danger }]}>Xóa bài tập</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL CHI TIẾT BÀI TẬP */}
        <ExerciseDetailModal
            visible={detailModalVisible}
            onClose={() => setDetailModalVisible(false)}
            exercise={selectedExerciseDetail}
            onAddToSelection={() => setDetailModalVisible(false)}
        />

        </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 10 },
  iconBtn: { padding: 5 },
  icon: { width: 24, height: 24, resizeMode: 'contain' },
  
  title: { fontSize: 26, fontWeight: '800', paddingHorizontal: 20, marginBottom: 20 },
  
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
  statBox: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 13 },

  itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  mediaContainer: { width: 70, height: 70, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  itemVideo: { width: '100%', height: '100%' },
  itemImage: { width: '100%', height: '100%' },
  itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30 },
  startBtn: { height: 55, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // STYLES CHO POPUP MENU
  modalOverlay: {
      flex: 1,
      backgroundColor: 'transparent',
  },
  menuContainer: {
      position: 'absolute',
      top: 60, 
      right: 20,
      width: 150,
      borderRadius: 12,
      padding: 5,
      elevation: 5,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
  },
  menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 15,
  },
  menuText: {
      fontSize: 16,
      fontWeight: '500',
  }
});

export default PreWorkoutScreen;