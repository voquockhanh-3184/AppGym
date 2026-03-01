import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  Animated, // Import Animated
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
import {
  getSubExercisesLocal,
  updateSubExerciseLocal,
  updateSubExerciseOrder,
  getAllSubExercisesLocal,
  deleteSubExerciseLocal, // ⚠️ BẠN CẦN ĐẢM BẢO CÓ HÀM NÀY TRONG FILE DB
} from "../../src/db/sqlite";
import Video from "react-native-video";
import YoutubePlayer from "react-native-youtube-iframe";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler"; // ✅ Import Swipeable

export default function EditSubExercisesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const { exerciseId } = route.params || {};

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    bg: isDark ? "#0d0d0d" : "#fff",
    card: isDark ? "#1a1a1a" : "#fff",
    text: isDark ? "#fff" : "#111",
    subtext: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#ddd",
    blue: "#007AFF",
    danger: "#FF3B30", // Màu đỏ cho nút xóa
  };

  const [subs, setSubs] = useState<any[]>([]);
  const [originalSubs, setOriginalSubs] = useState<any[]>([]);
  const [changed, setChanged] = useState(false);
  
  // ✅ State lưu các ID đã bị xóa tạm thời
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  // Ref để đóng swipe đang mở khi scroll hoặc swipe cái khác
  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());

  useEffect(() => {
    if (exerciseId) {
      load();
    } else {
      Alert.alert("Lỗi", "Không tìm thấy ID bài tập.");
      navigation.goBack();
    }
  }, [exerciseId]);

  const load = async () => {
    try {
      let list = await getSubExercisesLocal(exerciseId);
      
      if (list.length === 0) {
          const all = await getAllSubExercisesLocal();
          const found = all.find((i: any) => i.id == exerciseId);
          if (found) {
              list = [found];
          }
      }

      const orderedList = list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

      setSubs(orderedList);
      setOriginalSubs(JSON.parse(JSON.stringify(orderedList)));
      setDeletedIds([]); // Reset danh sách xóa
      setChanged(false);
    } catch (error) {
      console.error("Error loading subs:", error);
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const parseTimeToSeconds = (time: string) => {
    if (!time) return 0;
    const strTime = String(time);
    if (strTime.includes(":")) {
      const [m, s] = strTime.split(":");
      return (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
    }
    return parseInt(strTime) || 0;
  };

  const formatTime = (time: string) => {
    if (!time) return "00:00";
    let mm = 0, ss = 0;
    const strTime = String(time);
    if (strTime.includes(":")) {
      const [m, s] = strTime.split(":");
      mm = parseInt(m) || 0;
      ss = parseInt(s) || 0;
    } else {
      const totalSec = parseInt(strTime) || 0;
      mm = Math.floor(totalSec / 60);
      ss = totalSec % 60;
    }
    const newMM = String(mm).padStart(2, "0");
    const newSS = String(ss).padStart(2, "0");
    return `${newMM}:${newSS}`;
  };

  const changeValue = (item: any, increase: boolean) => {
    setChanged(true);
    let newList = [...subs];
    const idx = newList.findIndex((s) => s.id === item.id);
    if(idx === -1) return;

    if (item.type === "rep") {
      newList[idx].reps = increase
        ? (item.reps || 0) + 1
        : Math.max(1, (item.reps || 0) - 1);
    } else {
      const currentSec = parseTimeToSeconds(item.time);
      const newSec = increase ? currentSec + 5 : Math.max(5, currentSec - 5);
      newList[idx].time = formatTime(String(newSec));
    }
    setSubs(newList);
  };

  // ✅ Hàm xử lý xóa tạm thời
  const handleDeleteItem = (id: number) => {
    Alert.alert(
        "Xóa bài tập",
        "Bạn có chắc chắn muốn xóa bài tập này khỏi danh sách? (Cần bấm LƯU để áp dụng)",
        [
            { text: "Hủy", style: "cancel", onPress: () => {
                // Đóng swipe nếu hủy
                const ref = swipeableRefs.current.get(id);
                ref?.close();
            }},
            { 
                text: "Xóa", 
                style: "destructive", 
                onPress: () => {
                    setDeletedIds((prev) => [...prev, id]); // Thêm vào danh sách chờ xóa
                    setSubs((prev) => prev.filter((item) => item.id !== id)); // Xóa khỏi UI
                    setChanged(true);
                }
            }
        ]
    );
  };

  // ✅ Render nút xóa bên phải
  const renderRightActions = (id: number) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(id)}
      >
        <Image 
            source={require("../../assets/close.png")} // Hoặc icon thùng rác
            style={{ width: 24, height: 24, tintColor: '#fff' }} 
        />
        <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 4}}>Xóa</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    const youtubeId = getYoutubeId(item.video_path);

    return (
      <ScaleDecorator>
        {/* ✅ Bọc trong Swipeable */}
        <Swipeable
            ref={(ref) => {
                if (ref) swipeableRefs.current.set(item.id, ref);
            }}
            renderRightActions={() => renderRightActions(item.id)}
            overshootRight={false} 
            onSwipeableWillOpen={() => {
                // Đóng các swipe khác khi mở cái mới (tránh mở nhiều cái cùng lúc)
                [...swipeableRefs.current.entries()].forEach(([key, ref]) => {
                    if (key !== item.id && ref) ref.close();
                });
            }}
        >
            <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            activeOpacity={1}
            style={[
                styles.card,
                { backgroundColor: colors.card },
                isActive && styles.activeCard,
            ]}
            >
            <View style={styles.dragArea}>
                <Image
                source={require("../../assets/menu.png")}
                style={{ width: 20, height: 20, tintColor: colors.subtext }}
                />
            </View>

            <View style={styles.videoContainer}>
                {youtubeId ? (
                    <View pointerEvents="none" style={{flex: 1, backgroundColor: '#000'}}>
                        <YoutubePlayer
                            height={70}
                            width={70}
                            videoId={youtubeId}
                            play={false}
                            initialPlayerParams={{ controls: false, modestbranding: true }}
                        />
                    </View>
                ) : item.video_path ? (
                <Video
                    source={{ uri: item.video_path }}
                    style={styles.video}
                    muted
                    repeat
                    resizeMode="cover"
                    paused={true}
                />
                ) : (
                <View style={[styles.video, { backgroundColor: "#ccc", justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{fontSize: 10, color: '#555'}}>No Video</Text>
                </View>
                )}
            </View>

            <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>

                <Text style={[styles.exerciseDetail, { color: colors.subtext }]}>
                {item.type === "rep" ? `x${item.reps}` : formatTime(item.time)}
                </Text>

                <View style={styles.counterRow}>
                <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => changeValue(item, false)}
                >
                    <Text style={styles.counterText}>-</Text>
                </TouchableOpacity>

                <Text style={[styles.valueText, { color: colors.text }]}>
                    {item.type === "rep" ? `x${item.reps}` : formatTime(item.time)}
                </Text>

                <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => changeValue(item, true)}
                >
                    <Text style={styles.counterText}>+</Text>
                </TouchableOpacity>
                </View>
            </View>
            </TouchableOpacity>
        </Swipeable>
      </ScaleDecorator>
    );
  };

  const onDragEnd = ({ data }: any) => {
    setSubs(data);
    setChanged(true);
  };

  const cancelChanges = () => {
    setSubs(JSON.parse(JSON.stringify(originalSubs)));
    setDeletedIds([]); // ✅ Khôi phục danh sách xóa
    setChanged(false);
    
    // Đóng tất cả swipe đang mở
    swipeableRefs.current.forEach(ref => ref?.close());
  };

  const saveChanges = async () => {
    // ✅ 1. Thực hiện xóa các bài tập trong danh sách chờ xóa
    if (deletedIds.length > 0) {
        for (const id of deletedIds) {
            await deleteSubExerciseLocal(id);
        }
    }

    // ✅ 2. Cập nhật các bài tập còn lại
    for (let i = 0; i < subs.length; i++) {
      const item = subs[i];
      let detailToSave = "";
      if (item.type === "rep") {
        detailToSave = String(item.reps);
      } else {
        detailToSave = String(parseTimeToSeconds(item.time));
      }

      await updateSubExerciseLocal(
        item.id,
        item.name,
        detailToSave,
        item.video_path,
        item.type
      );

      await updateSubExerciseOrder(item.id, i);
    }

    setDeletedIds([]);
    setChanged(false);
    navigation.goBack();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
        
        <View style={styles.header}>
            <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}
            >
            <Image
                source={require("../../assets/back.png")}
                style={[styles.backIcon, { tintColor: colors.text }]}
            />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: colors.text }]}>
            Chỉnh sửa danh sách
            </Text>

            <View style={{ width: 40 }} />
        </View>

        <DraggableFlatList
            data={subs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            onDragEnd={onDragEnd}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
            // ✅ Đóng swipe khi bắt đầu scroll
            onScrollBeginDrag={() => {
                swipeableRefs.current.forEach(ref => ref?.close());
            }}
        />

        {changed && (
            <View style={[styles.bottomBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity 
                style={[styles.cancelBtn, { backgroundColor: isDark ? '#333' : '#f0f0f0', borderColor: colors.border }]} 
                onPress={cancelChanges}
            >
                <Text style={[styles.cancelText, { color: colors.text }]}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={saveChanges}>
                <Text style={styles.saveText}>Lưu</Text>
            </TouchableOpacity>
            </View>
        )}
        </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700", textAlign: 'center', flex: 1 },
  
  // ✅ Sửa style Card để tương thích với Swipeable
  card: {
    flexDirection: "row",
    padding: 10,
    // Bỏ margin horizontal ở đây nếu muốn nút xóa dính liền mép, 
    // nhưng để đẹp thì giữ margin và chỉnh nút xóa tương ứng
    marginHorizontal: 16, 
    // marginVertical được chuyển sang View bao ngoài nếu cần, 
    // nhưng Swipeable bọc trực tiếp card nội dung thì để margin ở Card vẫn ổn 
    // miễn là background Swipeable trong suốt
    marginBottom: 12, 
    borderRadius: 16,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2,
    height: 90, // Cố định chiều cao để nút xóa khớp
  },
  activeCard: {
    opacity: 0.9,
    transform: [{ scale: 1.03 }],
    elevation: 10,
    shadowColor: "black",
    shadowRadius: 10,
    shadowOpacity: 0.2,
  },
  
  // ✅ Style cho nút xóa
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 90, // Bằng chiều cao card
    borderRadius: 16, // Bo góc giống card
    marginBottom: 12, // Margin giống card
    marginRight: 16, // Margin phải để căn lề
    marginLeft: -10, // Kéo nhẹ về bên trái để sát card hơn
  },

  dragArea: { padding: 10, marginRight: 4 },
  
  videoContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  video: {
    width: '100%',
    height: '100%',
  },
  
  name: { fontSize: 16, fontWeight: "700" },
  counterRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  counterText: { fontSize: 20, fontWeight: "700", color: '#333', marginTop: -2 },
  valueText: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 14,
    minWidth: 50,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    flexDirection: "row",
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 10,
    alignItems: "center",
  },
  cancelText: { fontSize: 16, fontWeight: "600" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 18,
    marginLeft: 10,
    alignItems: "center",
  },
  saveText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  exerciseDetail: { fontSize: 13, opacity: 0.6, marginTop: 2 },
});