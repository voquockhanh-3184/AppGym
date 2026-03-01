import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
  LayoutAnimation,
  Platform, 
} from "react-native";
import DB, { getWorkoutSessionsLocal } from "../../src/db/sqlite"; 
import { useFocusEffect, useNavigation } from "@react-navigation/native"; 
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useTheme } from "../../src/context/ThemeContext";
import { LineChart } from "react-native-chart-kit";
import Animated, { FadeIn } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage"; 
import { Rect, Text as TextSVG, Svg } from "react-native-svg";

const screenWidth = Dimensions.get("window").width;

// ✅ Helper: Lấy ID user đang đăng nhập
const getCurrentUserId = async () => {
  try {
    const id = await AsyncStorage.getItem("currentUserId");
    return id;
  } catch (err) {
    console.warn("⚠️ Lỗi lấy currentUserId:", err);
    return null;
  }
};

// 🔹 Helper Logic BMI
const getBMIStatus = (bmi: number) => {
  if (bmi < 18.5) return { label: "Thiếu cân", color: "#00BFFF" };
  if (bmi < 25) return { label: "Bình thường", color: "#3CD070" };
  if (bmi < 30) return { label: "Thừa cân", color: "#FFC107" };
  if (bmi < 35) return { label: "Béo phì độ 1", color: "#FF9800" };
  return { label: "Béo phì độ 2+", color: "#FF3B30" };
};

const getBMIPointerPosition = (bmi: number) => {
  const totalFlex = 24;
  let position = 0;
  if (bmi < 18.5) {
    const minDisplay = 10;
    const val = Math.max(bmi, minDisplay);
    const percentInSegment = (val - minDisplay) / (18.5 - minDisplay);
    position = percentInSegment * (2.5 / totalFlex) * 100;
  } else if (bmi < 25) {
    const startPercent = (2.5 / totalFlex) * 100;
    const percentInSegment = (bmi - 18.5) / (25 - 18.5);
    position = startPercent + percentInSegment * (6.5 / totalFlex) * 100;
  } else if (bmi < 30) {
    const startPercent = (9.0 / totalFlex) * 100;
    const percentInSegment = (bmi - 25) / (30 - 25);
    position = startPercent + percentInSegment * (5.0 / totalFlex) * 100;
  } else if (bmi < 35) {
    const startPercent = (14.0 / totalFlex) * 100;
    const percentInSegment = (bmi - 30) / (35 - 30);
    position = startPercent + percentInSegment * (5.0 / totalFlex) * 100;
  } else {
    const startPercent = (19.0 / totalFlex) * 100;
    const maxDisplay = 40;
    const val = Math.min(bmi, maxDisplay);
    const percentInSegment = (val - 35) / (maxDisplay - 35);
    position = startPercent + percentInSegment * (5.0 / totalFlex) * 100;
  }
  return Math.max(0, Math.min(100, position));
};

const formatDayString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function ReportScreen() {
  const navigation = useNavigation<any>(); 
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Người dùng");
  const [userWeight, setUserWeight] = useState<number | null>(null);
  const [userHeight, setUserHeight] = useState<number | null>(null);
  
  const [editMode, setEditMode] = useState(false);
  const [editWeight, setEditWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [originalWeight, setOriginalWeight] = useState("");
  const [originalHeight, setOriginalHeight] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState(""); 

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  
  // Stats hiển thị
  const [workouts, setWorkouts] = useState(0);
  const [calories, setCalories] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [streak, setStreak] = useState(0); 

  const [bmi, setBmi] = useState<number | null>(null);
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>([]);
  
  const [allSessions, setAllSessions] = useState<any[]>([]); 
  
  const [sessionsModalVisible, setSessionsModalVisible] = useState(false);
  const [selectedDaySessions, setSelectedDaySessions] = useState<any[]>([]);
  const [selectedDayTitle, setSelectedDayTitle] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [clickedPoint, setClickedPoint] = useState<{x: number, y: number, value: number, index: number} | null>(null);

  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const colors = {
    background: isDarkMode ? "#0d0d0d" : "#f5faf9",
    card: isDarkMode ? "#1C1C1E" : "#ffffff",
    text: isDarkMode ? "#FFFFFF" : "#1f2937",
    subtext: isDarkMode ? "#A0A0A0" : "#6b7280",
    border: isDarkMode ? "rgba(255,255,255,0.15)" : "#e5e7eb",
    shadow: isDarkMode ? "transparent" : "#000",
    primary: isDarkMode ? "#4da3ff" : "#007AFF",
    inputBg: isDarkMode ? "#2C2C2E" : "#FFFFFF",
    chartLine: isDarkMode ? "#FFFFFF" : "#007AFF",
    chartGrid: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
    chartDotStroke: isDarkMode ? "#1C1C1E" : "#FFFFFF",
    divider: isDarkMode ? "#333" : "#e5e7eb",
    modalOverlay: "rgba(0,0,0,0.6)", 
  };

  useEffect(() => {
    (async () => {
      try {
        await DB.initDB();
        const id = await getCurrentUserId();
        if (id) {
          const history = await DB.getWeightHistoryLocal(Number(id));
          const sortedHistory = history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          if (sortedHistory.length > 0) setWeightHistory(sortedHistory);
          else {
            setWeightHistory([
              { date: formatDayString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), weight: 72.0 },
              { date: formatDayString(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)), weight: 70.5 },
            ]);
          }
        }
      } catch (e) {
        console.warn("⚠️ Lỗi khi load weight history:", e);
      }
    })();
  }, []);

  // ✅ HÀM TÍNH STREAK CỤC BỘ TỪ DANH SÁCH SESSIONS
  const calculateLocalStreak = (sessions: any[]) => {
      if (!sessions || sessions.length === 0) return 0;

      // 1. Lấy danh sách các ngày duy nhất đã tập
      const uniqueDates = [...new Set(sessions.map((s: any) => {
          if (!s.date) return "";
          return formatDayString(new Date(s.date));
      }))].filter(d => d !== "").sort().reverse(); 

      if (uniqueDates.length === 0) return 0;

      const today = new Date();
      const todayStr = formatDayString(today);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDayString(yesterday);

      let currentCount = 0;
      let checkDate = new Date();

      if (uniqueDates.includes(todayStr)) {
          checkDate = today;
      } else if (uniqueDates.includes(yesterdayStr)) {
          checkDate = yesterday;
      } else {
          return 0;
      }

      while (true) {
          const dateString = formatDayString(checkDate);
          if (uniqueDates.includes(dateString)) {
              currentCount++;
              checkDate.setDate(checkDate.getDate() - 1);
          } else {
              break;
          }
      }
      return currentCount;
  };

  // ✅ HÀM CẬP NHẬT STATS (ĐÃ SỬA: ĐẾM BÀI TẬP CHA)
  const updateStatsForDate = (date: Date, sessions: any[]) => {
      const dayStr = formatDayString(date);
      
      // Lọc các session thuộc ngày được chọn
      const dailySessions = sessions.filter(s => {
          if (!s.date) return false;
          const sessionDate = new Date(s.date);
          return formatDayString(sessionDate) === dayStr;
      });

      // 1. Đếm số lượng bài tập cha (Workout Sessions)
      // Mỗi bản ghi trong workout_sessions tương ứng với 1 lần hoàn thành bài tập cha
      const totalExercisesCount = dailySessions.length; 

      // 2. Tính tổng thời gian
      const totalMins = dailySessions.reduce((acc, s) => {
          return acc + (parseInt(s.duration || "0") || 0);
      }, 0);

      // 3. Tính tổng Calo
      const totalCals = dailySessions.reduce((acc, s) => {
          return acc + (parseInt(s.calories || "0") || 0);
      }, 0);
      
      // Cập nhật State
      setWorkouts(totalExercisesCount);
      setMinutes(totalMins); 
      setCalories(totalCals);
  };

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          await DB.initDB();
          const id = await getCurrentUserId();
          const allUsers = await DB.getAllUsersLocal();
          
          let foundUser: any = null;
          if (id) foundUser = allUsers.find((u: any) => String(u.id) === String(id));
          if (!foundUser && allUsers.length > 0) foundUser = allUsers[allUsers.length - 1];

          if (foundUser && mounted) {
            setUserId(String(foundUser.id));
            setUserName(foundUser.username || "Người dùng");
            setUserWeight(foundUser.weight || 0);
            setUserHeight(foundUser.height || 0);
            setEditWeight(foundUser.weight ? String(foundUser.weight) : "");
            setEditHeight(foundUser.height ? String(foundUser.height) : "");
            setOriginalWeight(foundUser.weight ? String(foundUser.weight) : "");
            setOriginalHeight(foundUser.height ? String(foundUser.height) : "");
            setUserPhoto(foundUser.photoURL || null);

            if (foundUser.weight && foundUser.height) {
              const bmiVal = foundUser.height > 0
                ? foundUser.weight / Math.pow(foundUser.height / 100, 2)
                : null;
              setBmi(bmiVal ? Number(bmiVal.toFixed(1)) : null);
            } else {
              setBmi(null);
            }
          }

          try {
            if (foundUser && foundUser.id) {
              const sessions = await getWorkoutSessionsLocal(foundUser.id);
              
              // ✅ Tính Streak
              const realStreak = calculateLocalStreak(sessions || []);

              if (mounted) {
                  setAllSessions(sessions || []);
                  setStreak(realStreak); 
                  
                  const today = new Date();
                  setSelectedDate(today);
                  updateStatsForDate(today, sessions || []);
              }
            }
          } catch (err) {
            console.warn('Error loading sessions', err);
          }
        } catch (e) {
          console.warn("⚠️ Lỗi tải dữ liệu:", e);
        } finally {
          if (mounted) setLoading(false);
        }
      })();
      return () => { mounted = false; };
    }, [])
  );

  const handleDayPress = (dayDate: Date) => {
      setSelectedDate(dayDate);
      updateStatsForDate(dayDate, allSessions);
  };

  const handleOpenSessionModal = (sessions: any[], dayDate: Date, dayName: string) => {
      if (sessions.length > 0) {
        setSelectedDaySessions(sessions);
        setSelectedDayTitle(`${dayName} ${dayDate.getDate()}/${dayDate.getMonth()+1}`);
        setSessionsModalVisible(true);
      } else {
          Alert.alert("Thông báo", "Không có bài tập nào trong ngày này.");
      }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const w = parseFloat(editWeight.replace(',', '.'));
      const h = parseFloat(editHeight.replace(',', '.'));
      
      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
        Alert.alert("Lỗi", "Vui lòng nhập số cân nặng và chiều cao hợp lệ!");
        setSaving(false);
        return;
      }
      
      await DB.executeSql("UPDATE users SET weight=?, height=? WHERE id=?", [w, h, userId]);
      setUserWeight(w);
      setUserHeight(h);
      
      const bmiValue = w / Math.pow(h / 100, 2);
      setBmi(Number(bmiValue.toFixed(1)));
      
      setSuccessMessage("Dữ liệu cân nặng và chiều cao của bạn đã được cập nhật.");
      setSuccessVisible(true);
      setEditMode(false);
    } catch (e) {
      console.error("Lỗi khi lưu dữ liệu:", e);
      Alert.alert("Lỗi", "Không thể lưu dữ liệu!");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Báo cáo" userPhoto={userPhoto} />

      <KeyboardAwareScrollView
        style={{ flex: 1, marginTop: Platform.OS === 'android' ? 90 : 110 }} 
        contentContainerStyle={{ paddingBottom: 130, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <View style={styles.statsRow}>
            {/* ✅ Hiển thị số lượng bài tập cha */}
            <StatBox icon={require("../../assets/medal.png")} value={workouts} label="Bài tập" color="#4da3ff" themeColors={colors} />
            <View style={{ width: 1, height: 40, backgroundColor: colors.border }} />
            <StatBox icon={require("../../assets/calo.png")} value={calories} label="Calo" color="#ffb703" themeColors={colors} />
            <View style={{ width: 1, height: 40, backgroundColor: colors.border }} />
            <StatBox icon={require("../../assets/working-hours.png")} value={minutes} label="Phút" color="#3CD070" themeColors={colors} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lịch sử</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate("AllRecordsScreen", { allSessions: allSessions })}
            style={{ padding: 5 }}
          >
            <Text style={{ color: colors.primary, fontWeight: '500', fontSize: 14 }}>Tất cả bản ghi</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <View style={styles.weekRow}>
            {Array.from({ length: 7 }).map((_, i) => {
              const today = new Date();
              const currentDay = today.getDay();
              const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
              
              const dayDate = new Date(today);
              dayDate.setDate(today.getDate() - currentDay + i);
              
              const isSelected = formatDayString(dayDate) === formatDayString(selectedDate);
              const isToday = formatDayString(dayDate) === formatDayString(today);
              
              const dayStr = formatDayString(dayDate);
              // Lọc session để hiển thị dấu chấm/màu
              const sessionsForDay = allSessions.filter(s => {
                  if (!s.date) return false;
                  return formatDayString(new Date(s.date)) === dayStr;
              });
              
              return (
                <TouchableOpacity 
                  key={i} 
                  activeOpacity={0.7} 
                  onPress={() => handleDayPress(dayDate)}
                  onLongPress={() => handleOpenSessionModal(sessionsForDay, dayDate, days[i])}
                  style={styles.dayTouchable}
                >
                  <View style={[styles.dayBox, {
                    backgroundColor: isSelected 
                        ? colors.primary 
                        : (isToday ? (isDarkMode ? "#333" : "#e0e0e0") : "transparent"),
                    borderRadius: 10, 
                    height: 60,
                    width: 40,
                    justifyContent: 'center'
                  }]}>
                    <Text style={{ fontSize: 13, color: isSelected ? "#fff" : colors.subtext, fontWeight: isSelected ? "700" : "500" }}>{days[i]}</Text>
                    <Text style={{ fontSize: 13, color: isSelected ? "#fff" : colors.text, marginTop: 2, fontWeight: isSelected ? "700" : "500" }}>{dayDate.getDate()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={[styles.divider, { borderBottomColor: colors.divider }]} />
          
          <TouchableOpacity 
            style={styles.streakContainer}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("StreakDetailScreen", { 
                streak: streak,         
                sessions: allSessions   
            })} 
          >
            <Text style={[styles.streakTitle, { color: colors.subtext }]}>Chuỗi ngày liên tiếp</Text>
            <View style={styles.streakRow}>
              <Image source={require("../../assets/fire.png")} style={styles.streakIcon} resizeMode="contain" />
              <Text style={[styles.streakText, { color: colors.text }]}>
                  {streak}
              </Text> 
            </View>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          visible={sessionsModalVisible}
          transparent={true}
          onRequestClose={() => setSessionsModalVisible(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ height: 360, backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{selectedDayTitle || 'Chi tiết'}</Text>
                <TouchableOpacity onPress={() => setSessionsModalVisible(false)}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Đóng</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
                {selectedDaySessions.length === 0 ? (
                  <Text style={{ color: colors.subtext }}>Không có buổi tập trong ngày này.</Text>
                ) : (
                  selectedDaySessions.map((s, idx) => (
                    <View key={idx} style={{ padding: 12, borderRadius: 12, backgroundColor: isDarkMode ? '#0d0d0d' : '#f9f9f9', marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontWeight: '700', color: colors.text }}>{s.title || 'Buổi tập'}</Text>
                      <Text style={{ color: colors.subtext, fontSize: 13 }}>{new Date(s.date).toLocaleString('vi-VN')}</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 13 }}>⏱️ Thời lượng: <Text style={{ fontWeight: '600' }}>{s.duration}</Text> phút</Text>
                        <Text style={{ color: colors.text, fontSize: 13 }}>🔥 Calo: <Text style={{ fontWeight: '600' }}>{s.calories || 0}</Text></Text>
                      </View>
                      <View style={{ marginTop: 8 }}>
                        {s.exercises ? (
                          <Text style={{ color: colors.subtext, fontSize: 13, fontStyle: 'italic' }}>
                            {(() => {
                              try {
                                const exercisesArray = typeof s.exercises === 'string' ? JSON.parse(s.exercises) : s.exercises;
                                if (Array.isArray(exercisesArray)) {
                                    const names = exercisesArray.map((e: any) => e.name).join(', ');
                                    return names.length > 100 ? names.substring(0, 97) + '...' : names;
                                }
                                return 'Không rõ bài tập';
                              } catch (e) {
                                return 'Lỗi dữ liệu bài tập';
                              }
                            })()}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cân nặng</Text>
          <TouchableOpacity
            style={[styles.logButton, { backgroundColor: colors.primary }]}
            onPress={async () => {
              try {
                if (!userId || userWeight === null) return Alert.alert("Lỗi", "Vui lòng nhập cân nặng trước!");
                
                await DB.addWeightRecordLocal(Number(userId), userWeight);
                
                const updated = await DB.getWeightHistoryLocal(Number(userId));
                const sorted = [...updated].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setWeightHistory(sorted);
                
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                
                setSuccessMessage(`Đã ghi lại cân nặng: ${userWeight} kg thành công.`);
                setSuccessVisible(true);

              } catch (e) { console.error(e); Alert.alert("Lỗi", "Không thể ghi lại cân nặng."); }
            }}
          >
            <Text style={styles.logButtonText}>Ghi lại</Text>
          </TouchableOpacity>
        </View>

        {/* 🔹 BIỂU ĐỒ CÂN NẶNG */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.weightSummaryRow}>
            <View>
              <Text style={[styles.measureLabel, { color: colors.subtext }]}>Hiện tại</Text>
              <Text style={[styles.measureValue, { color: colors.text }]}>{userWeight || "--"} <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.subtext }}>kg</Text></Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Đặt width cố định cho Label và căn phải text */}
                <Text style={{ width: 70, textAlign: 'right', color: colors.subtext, marginRight: 10, fontSize: 13 }}>
                  Nặng nhất
                </Text>
                {/* Đặt width cố định cho Value để không bị nhảy layout */}
                <Text style={{ width: 40, textAlign: 'right', color: colors.text, fontSize: 13, fontWeight: "bold" }}>
                  {weightHistory.length > 0 ? Math.max(...weightHistory.map((w) => w.weight)) : "--"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ width: 70, textAlign: 'right', color: colors.subtext, marginRight: 10, fontSize: 13 }}>
                  Nhẹ nhất
                </Text>
                <Text style={{ width: 40, textAlign: 'right', color: colors.text, fontSize: 13, fontWeight: "bold" }}>
                  {weightHistory.length > 0 ? Math.min(...weightHistory.map((w) => w.weight)) : "--"}
                </Text>
              </View>
            </View>
          </View>

          <Animated.View entering={FadeIn.duration(600)}>
            {weightHistory.length > 0 ? (() => {
              const sortedData = [...weightHistory];
              const weights = sortedData.map(w => w.weight);
              const minVal = Math.floor(Math.min(...weights)) - 1;
              const maxVal = Math.ceil(Math.max(...weights)) + 1;
              const chartWidth = Math.max(screenWidth - 80, sortedData.length * 60);

              const maxWeight = Math.max(...weights);
              const minWeight = Math.min(...weights);
              const latestIndex = weights.length - 1;

              return (
                <View style={{ flexDirection: "row", marginTop: 10 }}>
                  <View style={{ width: 35, justifyContent: 'space-between', paddingVertical: 10, paddingBottom: 40, alignItems: 'flex-end', paddingRight: 5 }}>
                    {[maxVal, (minVal + (maxVal - minVal) * 0.75), (minVal + (maxVal - minVal) * 0.5), (minVal + (maxVal - minVal) * 0.25), minVal].map((val, idx) => (
                      <Text key={idx} style={{ fontSize: 11, color: colors.subtext }}>{val.toFixed(0)}</Text>
                    ))}
                  </View>
                  
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      key={JSON.stringify(weightHistory)}
                      data={{
                        labels: sortedData.map(w => { const d = new Date(w.date); return `${d.getDate()}/${d.getMonth() + 1}`; }),
                        datasets: [
                            { data: weights, withDots: true }, 
                            { data: [minVal], withDots: false }, 
                            { data: [maxVal], withDots: false }
                        ]
                      }}
                      width={chartWidth}
                      height={220}
                      yAxisInterval={1}
                      withVerticalLines={true}
                      withHorizontalLines={true}
                      withInnerLines={true}
                      withOuterLines={false}
                      withHorizontalLabels={false}
                      getDotProps={(value, index) => {
                        const isLatest = index === latestIndex;
                        const isMax = value === maxWeight;
                        const isMin = value === minWeight;

                        if (isLatest || isMax || isMin) {
                            return {
                                r: "5", 
                                strokeWidth: "2",
                                stroke: colors.chartDotStroke,
                                fill: colors.chartLine
                            };
                        }
                        return { r: "0", strokeWidth: "0" };
                      }}
                      onDataPointClick={(data) => {
                        if (clickedPoint && clickedPoint.index === data.index && clickedPoint.value === data.value) {
                            setClickedPoint(null);
                        } else {
                            setClickedPoint({
                                x: data.x,
                                y: data.y,
                                value: data.value,
                                index: data.index
                            });
                        }
                      }}
                      decorator={() => {
                        return clickedPoint ? (
                            <View>
                                <Svg>
                                    <Rect 
                                        x={clickedPoint.x - 20} 
                                        y={clickedPoint.y - 40} 
                                        width="40" 
                                        height="25" 
                                        fill={colors.primary} 
                                        rx={8} 
                                    />
                                    <TextSVG
                                        x={clickedPoint.x}
                                        y={clickedPoint.y - 23}
                                        fill="white"
                                        fontSize="12"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                    >
                                        {clickedPoint.value}
                                    </TextSVG>
                                </Svg>
                            </View>
                        ) : null;
                      }}
                      chartConfig={{
                        backgroundColor: "transparent",
                        backgroundGradientFrom: isDarkMode ? "transparent" : "#FFFFFF",
                        backgroundGradientTo: isDarkMode ? "transparent" : "#FFFFFF",
                        decimalPlaces: 1,
                        color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 122, 255, ${opacity})`,
                        labelColor: () => colors.subtext,
                        fillShadowGradientFrom: colors.chartLine,
                        fillShadowGradientFromOpacity: 0.15,
                        fillShadowGradientTo: colors.chartLine,
                        fillShadowGradientToOpacity: 0.02,
                        style: { borderRadius: 16 },
                        propsForBackgroundLines: { strokeDasharray: "5, 5", stroke: colors.chartGrid, strokeWidth: 1 },
                      }}
                      bezier
                      segments={4}
                      style={{ marginRight: 20, marginLeft: -35 }} 
                    />
                  </ScrollView>
                </View>
              );
            })() : (
              <View style={{ height: 150, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.subtext }}>Chưa có dữ liệu cân nặng</Text>
              </View>
            )}
            {weightHistory.length > 0 && (
               <Text style={{ textAlign: "center", color: colors.subtext, fontSize: 12, marginTop: 5, fontStyle: 'italic' }}>*Dữ liệu được sắp xếp theo thời gian thực</Text>
            )}
          </Animated.View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Chỉ số cơ thể</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.measureRow}>
            <View style={styles.measureBox}>
              <Text style={[styles.measureLabel, { color: colors.subtext }]}>Cân nặng (kg)</Text>
              <Text style={[styles.measureValue, { color: colors.text }]}>{userWeight || "--"}</Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
            <View style={styles.measureBox}>
              <Text style={[styles.measureLabel, { color: colors.subtext }]}>Chiều cao (cm)</Text>
              <Text style={[styles.measureValue, { color: colors.text }]}>{userHeight || "--"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>BMI</Text>
          <TouchableOpacity
            onPress={() => {
              if (!editMode) {
                setOriginalWeight(editWeight);
                setOriginalHeight(editHeight);
                setEditMode(true);
              } else {
                setEditWeight(originalWeight);
                setEditHeight(originalHeight);
                setEditMode(false);
              }
            }}
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.editButtonText}>{editMode ? "Hủy bỏ" : "Chỉnh sửa"}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {editMode ? (
            <>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.measureLabel, { color: colors.subtext }]}>Cân nặng (kg)</Text>
                  <TextInput
                    value={editWeight}
                    onChangeText={setEditWeight}
                    keyboardType="numeric"
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                    placeholderTextColor={colors.subtext}
                  />
                </View>
                <View style={{ width: 15 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.measureLabel, { color: colors.subtext }]}>Chiều cao (cm)</Text>
                  <TextInput
                    value={editHeight}
                    onChangeText={setEditHeight}
                    keyboardType="numeric"
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                    placeholderTextColor={colors.subtext}
                  />
                </View>
              </View>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {bmi ? (
                <>
                  <View style={styles.bmiHeader}>
                    <Text style={[styles.bmiValue, { color: getBMIStatus(bmi).color }]}>{bmi}</Text>
                    <View style={{alignItems: 'center'}}>
                        <Text style={[styles.bmiLabel, { color: colors.subtext, fontSize: 14 }]}>Chỉ số BMI của bạn</Text>
                        <Text style={{ color: getBMIStatus(bmi).color, fontWeight: 'bold', fontSize: 16, marginTop: 2 }}>
                            {getBMIStatus(bmi).label}
                        </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 15, marginBottom: 10 }}>
                    <View style={styles.bmiBarContainer}>
                          <View style={styles.bmiBarRow}>
                            <View style={[styles.bmiBox, { backgroundColor: "#00BFFF", flex: 2.5 }]} />
                            <View style={[styles.bmiBox, { backgroundColor: "#3CD070", flex: 6.5 }]} />
                            <View style={[styles.bmiBox, { backgroundColor: "#FFC107", flex: 5.0 }]} />
                            <View style={[styles.bmiBox, { backgroundColor: "#FF9800", flex: 5.0 }]} />
                            <View style={[styles.bmiBox, { backgroundColor: "#FF3B30", flex: 5.0 }]} />
                        </View>
                        
                        <View style={[styles.bmiPointer, { left: `${getBMIPointerPosition(bmi)}%`, transform: [{ translateX: -6 }] }]}>
                           <View style={[styles.pointerArrowDown, { borderTopColor: colors.text }]} />
                        </View>

                        <View style={styles.bmiLabelsRow}>
                            <Text style={[styles.bmiScaleText, { left: '10.4%', color: colors.subtext }]}>18.5</Text>
                            <Text style={[styles.bmiScaleText, { left: '37.5%', color: colors.subtext }]}>25</Text>
                            <Text style={[styles.bmiScaleText, { left: '58.3%', color: colors.subtext }]}>30</Text>
                            <Text style={[styles.bmiScaleText, { left: '79.1%', color: colors.subtext }]}>35</Text>
                        </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                    <Image source={require("../../assets/information.png")} style={{ width: 40, height: 40, tintColor: colors.subtext, marginBottom: 10 }} />
                    <Text style={{ textAlign: 'center', color: colors.subtext }}>Chưa có dữ liệu. Vui lòng bấm "Chỉnh sửa" để nhập thông tin.</Text>
                </View>
              )}
            </>
          )}
        </View>

      </KeyboardAwareScrollView>

      <Footer active="Báo cáo" darkMode={isDarkMode} />

      <Modal transparent visible={successVisible} animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={require("../../assets/success.png")} style={styles.successIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Cập nhật thành công</Text>
            <Text style={[styles.modalMessage, { color: colors.subtext }]}>
                {successMessage || "Dữ liệu của bạn đã được lưu."}
            </Text>
            <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]} 
                onPress={() => setSuccessVisible(false)}
            >
              <Text style={styles.modalButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const StatBox = ({ icon, value, label, color, themeColors }: any) => (
  <View style={styles.statBox}>
    <Image source={icon} style={[styles.statIcon, { tintColor: color }]} />
    <Text style={[styles.statValue, { color: themeColors.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: themeColors.subtext }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topCard: { margin: 6, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 10, alignItems: "center", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", width: "100%" },
  statBox: { alignItems: "center", justifyContent: "center", flex: 1 },
  statValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  statLabel: { fontSize: 12, marginTop: 2 },
  statIcon: { width: 28, height: 28, resizeMode: 'contain' },
  
  card: { marginHorizontal: 5, marginTop: 5, marginBottom: 10, borderRadius: 14, padding: 16, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 5, marginLeft: 5, marginBottom: 5 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5, paddingHorizontal: 5, marginTop: 6 },
  
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  dayBox: { flex: 1, alignItems: "center", paddingVertical: 8, marginHorizontal: 2, justifyContent: 'space-between' },
  dayTouchable: { flex: 1, marginHorizontal: 1, alignItems: 'center' },
  divider: { borderBottomWidth: 1, marginVertical: 12 },
  dividerVertical: { width: 1, height: '80%', alignSelf: 'center' },
  
  streakContainer: { alignItems: "center", marginTop: 0 },
  streakTitle: { fontSize: 13, fontWeight: "600", marginBottom: 4, alignSelf: "flex-start" },
  streakRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginLeft: 0 },
  streakIcon: { width: 24, height: 24, marginRight: 6 },
  streakText: { fontSize: 18, fontWeight: "700" },

  logButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10 },
  logButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  
  weightSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  measureRow: { flexDirection: "row", justifyContent: "space-between" },
  measureBox: { flex: 1, alignItems: "center" },
  measureLabel: { fontSize: 13, marginBottom: 4 },
  measureValue: { fontSize: 20, fontWeight: "700" },
  
  editButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10 },
  editButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  row: { flexDirection: "row", marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, width: '100%' },
  saveBtn: { borderRadius: 12, marginTop: 15, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  bmiHeader: { alignItems: "center", marginBottom: 10 },
  bmiValue: { fontSize: 36, fontWeight: "800" },
  bmiLabel: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  
  bmiBarContainer: { position: 'relative', height: 40 }, 
  bmiBarRow: { flexDirection: "row", height: 12, borderRadius: 6, overflow: 'hidden', width: '100%' },
  bmiBox: { flex: 1 },
  bmiPointer: { position: "absolute", top: -8, zIndex: 2 },
  pointerArrowDown: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent" },
  
  bmiLabelsRow: { position: 'absolute', top: 16, width: '100%', height: 20 }, 
  bmiScaleText: { position: 'absolute', fontSize: 10, width: 30, textAlign: 'center', marginLeft: -15 }, 

  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContainer: { 
      width: '85%', 
      borderRadius: 24, 
      alignItems: "center", 
      paddingVertical: 30, 
      paddingHorizontal: 24, 
      borderWidth: 1, 
      elevation: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10
  },
  successIcon: { width: 70, height: 70, resizeMode: "contain", marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  modalMessage: { fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  modalButton: { borderRadius: 16, paddingVertical: 14, width: '100%', alignItems: 'center' },
  modalButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});