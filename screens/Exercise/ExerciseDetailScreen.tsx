import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator,
  StatusBar, Platform, Alert
} from "react-native";
import { useRoute, useNavigation, useIsFocused } from "@react-navigation/native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import DB, {
  getExercisesLocal, getSubExercisesLocal, updateSubExerciseOrder,
  getLastWorkoutLog, saveWorkoutLog,      
  getWorkoutProgress, addWorkoutSession, getCurrentUserId     
} from "../../src/db/sqlite";
import { useTheme } from "../../src/context/ThemeContext";
import Video from "react-native-video";
// ✅ IMPORT MODAL CHI TIẾT
import ExerciseDetailModal from "./ExerciseDetailModal";

export default function ExerciseDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  // Nhận thêm tham số historyData và isHistoryView từ màn hình Lịch sử
  const { exercise, exerciseId: passedExerciseId, historyData, isHistoryView } = route.params || {};
  const exerciseId = passedExerciseId || exercise?.id;

  const [exerciseData, setExerciseData] = useState<any>(exercise || null);
  const [subExercises, setSubExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDurationSec, setTotalDurationSec] = useState(0);
  
  // Các state phụ cho logic tập luyện (chỉ dùng khi không phải xem lịch sử)
  const [lastLogDate, setLastLogDate] = useState<string | null>(null);
  const [savedProgressIndex, setSavedProgressIndex] = useState(0); 

  // ✅ STATE CHO MODAL CHI TIẾT
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<any>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A1A1A",
    subtext: isDark ? "#A0A0A0" : "#8E8E93",
    border: isDark ? "#333" : "#E5E5EA",
    primary: "#007AFF",
    infoBg: isDark ? "#2C2C2E" : "#EFEFEF", 
  };

  const formatTime = (secondsInput: string | number) => {
    const total = typeof secondsInput === 'string' ? parseInt(secondsInput) : secondsInput;
    if (!total || isNaN(total)) return "00:00";
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // ✅ HÀM MỞ MODAL
  const openDetail = (item: any) => {
    setSelectedExerciseForDetail(item);
    setDetailModalVisible(true);
  };

  const handleStartWorkout = async () => {
      // 1. Logic cho nút "Tập lại bài này" (từ màn hình Lịch sử)
      if (isHistoryView) {
          const caloriesBurned = Math.ceil(totalDurationSec * 0.1);
          
          navigation.navigate("StartExerciseScreen", { 
              subExercises, 
              exercise: exerciseData, // Dữ liệu bài cha
              targetDuration: totalDurationSec,
              targetCalories: caloriesBurned
          });
          return;
      }

      // 2. Logic cho bài tập mới (từ Home)
      try {
          if (!exerciseId) return;
          const userIdStr = await getCurrentUserId();
          if (!userIdStr) {
              Alert.alert("Lỗi", "Vui lòng đăng nhập để lưu lịch sử.");
              return;
          }
          
          const durationMins = Math.ceil(totalDurationSec / 60) || 1; 
          const caloriesBurned = Math.ceil(totalDurationSec * 0.1); 
          
          // Chuẩn bị danh sách bài tập con (JSON string)
          const exercisesListJson = JSON.stringify(subExercises.map((sub, index) => ({
              id: sub.id, 
              name: sub.name, 
              reps: sub.reps, 
              time: sub.time,
              image: index === 0 ? (exerciseData?.image || sub.image || "") : (sub.image || "")
          })));

          await addWorkoutSession(
              Number(userIdStr),           // userId
              exerciseData?.title || "Bài tập chưa đặt tên", // title
              durationMins,                // duration
              caloriesBurned,              // calories
              exercisesListJson,           // exercises (JSON string)
              exerciseData?.image || "",   // image url
              exerciseId                   // exerciseId (Parent ID)
          );
          
          // Lưu log để đánh dấu lần tập gần nhất
          await saveWorkoutLog(exerciseId, Number(userIdStr));
          
          navigation.navigate("StartExerciseScreen", { 
              subExercises, 
              exercise: exerciseData,
              targetDuration: totalDurationSec,
              targetCalories: caloriesBurned
          });
      } catch (error) { console.error("Lỗi khi bắt đầu tập:", error); }
  };

  useEffect(() => {
    if (!isFocused) return;
    let mounted = true;
    setLoading(true);

    const load = async () => {
      try {
        // --- TRƯỜNG HỢP 1: XEM LỊCH SỬ (HISTORY) ---
        if (historyData && Array.isArray(historyData) && historyData.length > 0) {
            if (mounted) {
                setSubExercises(historyData);
                
                const totalSec = historyData.reduce((sum: number, s: any) => {
                   if (s.type === "time" || (!s.reps && s.time)) {
                       return sum + (parseInt(s.time) || 0);
                   } else {
                       return sum + ((parseInt(s.reps) || 0) * 5); 
                   }
                }, 0);
                
                setTotalDurationSec(totalSec);
                setLoading(false);
            }
            return; 
        }

        // --- TRƯỜNG HỢP 2: TẬP MỚI (LOAD TỪ DB) ---
        await DB.initDB();
        
        if (!exerciseData && exerciseId) {
          const list = await getExercisesLocal();
          const found = list.find((e) => String(e.id) === String(exerciseId));
          if (found && mounted) setExerciseData(found);
        }

        if (exerciseId) {
            const subs = await getSubExercisesLocal(exerciseId);
            const ordered = subs.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
            if (mounted) setSubExercises(ordered);

            const lastDate = await getLastWorkoutLog(exerciseId);
            if (mounted) setLastLogDate(lastDate);

            const currentIndex = await getWorkoutProgress(exerciseId);
            if (mounted) setSavedProgressIndex(currentIndex);

            const totalSec = ordered.reduce((sum, s) => {
               if (s.type === "time") return sum + (parseInt(s.time) || 0);
               else return sum + ((parseInt(s.reps) || 0) * 5);
            }, 0);

            if (mounted) setTotalDurationSec(totalSec);
        }
      } catch (e) { console.log("Error loading detail:", e); } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [isFocused, exerciseId, historyData]);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => (
    <TouchableOpacity
      onLongPress={!isHistoryView ? drag : undefined}
      onPress={() => openDetail(item)} // ✅ GỌI HÀM MỞ MODAL KHI CLICK
      activeOpacity={0.7}
      style={[
        styles.exerciseItem,
        { backgroundColor: colors.card, borderColor: colors.border },
        isActive && styles.activeItem,
      ]}
    >
      <View style={styles.videoWrapper}>
          {item.video_path ? (
            <Video
              source={{ uri: item.video_path }}
              style={styles.exerciseImage}
              muted={true} repeat={true} paused={false} resizeMode="cover"
            />
          ) : (
             <Image 
                source={item.image ? {uri: item.image} : require("../../assets/workout_placeholder.png")} 
                style={styles.exerciseImage} 
                resizeMode="cover"
             />
          )}
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10 }}>
          <View>
            <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
              {item.name || item.title}
            </Text>
            <Text style={[styles.exerciseDetail, { color: colors.subtext }]}>
                {(item.type === "time" || (!item.reps && item.time)) 
                    ? formatTime(item.time) 
                    : `x${item.reps || 0}`}
            </Text>
          </View>
      </View>
      
      {!isHistoryView && (
          <View style={{justifyContent: 'center', alignItems: 'flex-end'}}>
            <Image source={require("../../assets/menu.png")} style={{ width: 20, height: 20, tintColor: colors.subtext }} />
          </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <View style={{flex: 1, paddingHorizontal: 10}}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {exerciseData?.title || "Chi tiết bài tập"}
            </Text>
            {isHistoryView && <Text style={{textAlign:'center', color: colors.subtext, fontSize: 12, marginTop: 2}}>(Đã tập)</Text>}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.dashboard, { marginTop: 24 }]}>
        <View style={[styles.infoCard, { backgroundColor: colors.infoBg, borderColor: colors.border }]}>
              <Text style={[styles.infoValue, { color: colors.primary }]}>{formatTime(totalDurationSec)}</Text>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>Thời lượng</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.infoBg, borderColor: colors.border }]}>
              <Text style={[styles.infoValue, { color: colors.primary }]}>{subExercises.length}</Text>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>Bài tập</Text>
        </View>
      </View>
      
      <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Danh sách bài tập</Text>
          {!isHistoryView && (
              <TouchableOpacity
                onPress={() => navigation.navigate("EditSubExercisesScreen", { exerciseId: exerciseId })}
                style={[styles.editButtonContainer, { backgroundColor: colors.card }]}
              >
                <Text style={{color: colors.primary, fontWeight: '600', fontSize: 13, marginRight: 4}}>Chỉnh sửa</Text>
                <Image source={require("../../assets/right-arrow.png")} style={{ width: 12, height: 12, tintColor: colors.primary }} />
              </TouchableOpacity>
          )}
      </View>

      <DraggableFlatList
        data={subExercises}
        keyExtractor={(i, index) => (i.id ? String(i.id) : String(index))} 
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onDragEnd={async ({ data }) => {
          if (isHistoryView) return; 
          setSubExercises(data); 
          for (let i = 0; i < data.length; i++) {
            if (data[i].id) {
                await updateSubExerciseOrder(data[i].id, i);
            }
          }
        }}
      />

      <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={handleStartWorkout} 
          >
            <Image source={isHistoryView ? require("../../assets/refresh.png") : require("../../assets/play.png")} style={{width: 18, height: 18, tintColor: '#fff', marginRight: 8}} />
            <Text style={styles.startButtonText}>
                {isHistoryView ? "TẬP LẠI BÀI NÀY" : (savedProgressIndex > 0 ? `TIẾP TỤC` : "BẮT ĐẦU TẬP LUYỆN")}
            </Text>
          </TouchableOpacity>
      </View>

      {/* ✅ MODAL HIỂN THỊ CHI TIẾT BÀI TẬP */}
      <ExerciseDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        exercise={selectedExerciseForDetail}
        // Ở màn hình này ta chỉ xem chi tiết, nút "Thêm" trong modal có thể dùng để đóng modal
        onAddToSelection={() => setDetailModalVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
  },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700", textAlign: 'center', flex: 1 },
  dashboard: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, 
    marginTop: 20, marginBottom: 20, gap: 15 
  },
  infoCard: {
    flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 0, 
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  infoValue: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  infoLabel: { fontSize: 12, fontWeight: "500" },
  sectionRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, marginBottom: 12
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  editButtonContainer: { 
      flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, 
      borderRadius: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3
  },
  exerciseItem: {
    flexDirection: "row", padding: 12, borderRadius: 16, alignItems: "center", marginBottom: 12, borderWidth: 1,
  },
  videoWrapper: { position: 'relative', marginRight: 0 },
  exerciseImage: {
    width: 70, height: 70, borderRadius: 12, overflow: "hidden", backgroundColor: "#eee"
  },
  exerciseName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  exerciseDetail: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  activeItem: {
    transform: [{ scale: 1.02 }], shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  footerContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  startButton: {
    flexDirection: 'row', borderRadius: 16, paddingVertical: 16,
    alignItems: "center", justifyContent: 'center', shadowColor: "#007AFF", shadowOpacity: 0.3, shadowRadius: 8, elevation: 6
  },
  startButtonText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
});