import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  LayoutAnimation,
  UIManager
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
import DB, { getWorkoutSessionsLocal, getCurrentUserId } from "../../src/db/sqlite";

const { width } = Dimensions.get("window");

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- HELPER FUNCTIONS ---
const formatDate = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

// --- ✅ LOGIC GOM NHÓM ĐÃ SỬA LỖI ---
const groupSessionsByWeek = (sessions: any[], selectedMonth: number, selectedYear: number) => {
  if (!sessions || sessions.length === 0) return [];

  // 1. Lọc theo tháng và năm được chọn
  const sessionsInMonth = sessions.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  // 2. Sắp xếp giảm dần theo thời gian (Mới nhất lên đầu)
  const sorted = [...sessionsInMonth].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 3. ✅ LỌC TRÙNG LẶP (LOGIC MỚI)
  const uniqueSessions: any[] = [];
  const processedIds = new Set(); // Dùng Set để đảm bảo ID là duy nhất tuyệt đối

  sorted.forEach((current) => {
      // A. Kiểm tra trùng ID (Fix lỗi DB trả về nhiều dòng giống nhau)
      if (processedIds.has(current.id)) return;

      // B. Kiểm tra "Spam Click" (Người dùng bấm lưu 2 lần liên tiếp tạo ra 2 ID khác nhau nhưng cùng nội dung)
      // So sánh với phần tử hợp lệ cuối cùng đã thêm vào danh sách
      if (uniqueSessions.length > 0) {
          const lastAdded = uniqueSessions[uniqueSessions.length - 1];
          const timeDiff = Math.abs(new Date(current.date).getTime() - new Date(lastAdded.date).getTime());
          const isSameTitle = current.title === lastAdded.title;

          // Nếu cùng tên và thời gian lệch nhau dưới 30 giây -> Coi là trùng -> Bỏ qua
          if (isSameTitle && timeDiff < 30000) return; 
      }

      // Nếu hợp lệ thì thêm vào danh sách
      processedIds.add(current.id);
      uniqueSessions.push(current);
  });

  // 4. Gom nhóm theo tuần
  const groups: any[] = [];
  if (uniqueSessions.length === 0) return [];

  let currentWeekStart: Date | null = null;
  let currentWeekEnd: Date | null = null;
  let currentGroupData: any[] = [];

  const getWeekRange = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay(); 
      // Chỉnh để tuần bắt đầu từ Thứ 2 (Monday)
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
      
      const monday = new Date(date);
      monday.setDate(diff);
      monday.setHours(0,0,0,0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);
      
      return { start: monday, end: sunday };
  };

  const createWeekSummary = (groupData: any[], start: Date, end: Date) => {
      // Tạo danh sách tên bài tập duy nhất để hiển thị tóm tắt
      const uniqueNames = Array.from(new Set(groupData.map(item => item.title || "Bài tập"))).join(', ');
      return {
          id: start.toISOString(),
          title: `${formatDate(start)} - ${formatDate(end)}`,
          sessions: groupData, 
          totalCount: groupData.length,
          totalDuration: groupData.reduce((acc, curr) => acc + (parseInt(curr.duration) || 0), 0),
          totalCalories: groupData.reduce((acc, curr) => acc + (parseInt(curr.calories) || 0), 0),
          exerciseList: uniqueNames
      };
  };

  uniqueSessions.forEach((session) => {
      const sDate = new Date(session.date);
      const { start, end } = getWeekRange(sDate);
      
      if (currentWeekStart && start.getTime() === currentWeekStart.getTime()) {
          // Vẫn trong cùng 1 tuần -> gom vào
          currentGroupData.push(session);
      } else {
          // Sang tuần mới -> Đẩy tuần cũ vào groups
          if (currentGroupData.length > 0 && currentWeekStart && currentWeekEnd) {
             groups.push(createWeekSummary(currentGroupData, currentWeekStart, currentWeekEnd));
          }
          // Reset cho tuần mới
          currentWeekStart = start;
          currentWeekEnd = end;
          currentGroupData = [session];
      }
  });

  // Đẩy tuần cuối cùng vào groups
  if (currentGroupData.length > 0 && currentWeekStart && currentWeekEnd) {
      groups.push(createWeekSummary(currentGroupData, currentWeekStart, currentWeekEnd));
  }

  return groups;
};

// --- MAIN SCREEN ---
export default function AllRecordsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { allSessions: paramSessions } = route.params || {};
  
  const [sessions, setSessions] = useState<any[]>(paramSessions || []);
  const [loading, setLoading] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    background: isDark ? "#0d0d0d" : "#F5F7FA",
    text: isDark ? "#ffffff" : "#1f2937",
    subtext: isDark ? "#A0A0A0" : "#6b7280",
    card: isDark ? "#1C1C1E" : "#ffffff",
    border: isDark ? "#333" : "#E5E7EB",
    primary: isDark ? "#4da3ff" : "#007AFF",
    headerBg: isDark ? "#0d0d0d" : "#ffffff",
  };

  useFocusEffect(
    useCallback(() => {
        const loadData = async () => {
            // Nếu chưa có dữ liệu hoặc params trống thì bật loading
            if (!sessions || sessions.length === 0) setLoading(true);
            try {
                await DB.initDB();
                const uid = await getCurrentUserId();
                if (uid) {
                    const data = await getWorkoutSessionsLocal(Number(uid));
                    setSessions(data);
                }
            } catch (e) {
                console.error("Lỗi tải lịch sử:", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []) // Xóa paramSessions khỏi dependencies để tránh reload không cần thiết
  );

  const weeklyGroups = useMemo(() => 
    groupSessionsByWeek(sessions, viewDate.getMonth(), viewDate.getFullYear()), 
    [sessions, viewDate]
  );

  const changeMonth = (direction: number) => {
      const newDate = new Date(viewDate);
      newDate.setMonth(viewDate.getMonth() + direction);
      setViewDate(newDate);
      setCollapsedWeeks({}); 
  };

  const toggleWeek = (weekId: string) => {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(300, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
      );
      setCollapsedWeeks(prev => ({ ...prev, [weekId]: !prev[weekId] }));
  };

  const renderHeader = () => {
      const currentYear = viewDate.getFullYear();
      const currentMonth = viewDate.getMonth();
      const today = new Date();
      
      const daysCount = getDaysInMonth(currentMonth, currentYear);
      const firstDayIndex = getFirstDayOfMonth(currentMonth, currentYear);
      
      const calendarDays = [];
      for (let i = 0; i < firstDayIndex; i++) calendarDays.push(null);
      for (let i = 1; i <= daysCount; i++) calendarDays.push(i);

      // Tạo Set chứa các ngày có tập luyện trong tháng đang xem để highlight trên lịch
      const workoutDaysSet = new Set(
          sessions.map(s => {
              const d = new Date(s.date);
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear ? d.getDate() : -1;
          })
      );

      return (
          <View style={[styles.headerContainer, { backgroundColor: colors.headerBg }]}>
              <View style={styles.navRow}>
                  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                      <Image source={require("../../assets/back.png")} style={[styles.icon, { tintColor: colors.text }]} />
                  </TouchableOpacity>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>Lịch sử</Text>
                  <View style={{ width: 24 }} /> 
              </View>
              
              <View style={styles.monthNavRow}>
                  <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 10 }}>
                      <Image source={require("../../assets/left-arrow.png")} style={[styles.smallIcon, { tintColor: colors.subtext }]} />
                  </TouchableOpacity>
                  <Text style={[styles.monthText, { color: colors.text }]}>
                      {currentYear}/{currentMonth + 1}
                  </Text>
                  <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 10 }}>
                      <Image source={require("../../assets/right-arrow.png")} style={[styles.smallIcon, { tintColor: colors.subtext }]} />
                  </TouchableOpacity>
              </View>

              <View style={styles.calendarContainer}>
                  <View style={styles.weekDaysRow}>
                      {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, index) => (
                          <Text key={index} style={[styles.weekDayText, { color: colors.subtext }]}>{d}</Text>
                      ))}
                  </View>
                  <View style={styles.daysGrid}>
                      {calendarDays.map((day, index) => {
                          if (!day) return <View key={index} style={styles.dayCell} />;
                          const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                          const hasWorkout = workoutDaysSet.has(day);
                          const hasPrev = workoutDaysSet.has(day - 1) && (index % 7 !== 0); 
                          const hasNext = workoutDaysSet.has(day + 1) && ((index + 1) % 7 !== 0);

                          return (
                              <View key={index} style={styles.dayCell}>
                                  {hasWorkout && hasPrev && <View style={[styles.connector, { left: -1, width: '52%', backgroundColor: colors.primary }]} />}
                                  {hasWorkout && hasNext && <View style={[styles.connector, { right: -1, width: '52%', backgroundColor: colors.primary }]} />}
                                  <View style={[styles.dateCircle, hasWorkout ? { backgroundColor: colors.primary } : (isToday ? { borderWidth: 1, borderColor: colors.primary } : undefined)]}>
                                      <Text style={[styles.dateText, { color: hasWorkout ? '#fff' : (isToday ? colors.primary : colors.text) }, (isToday || hasWorkout) ? { fontWeight: 'bold' } : undefined]}>
                                          {day}
                                      </Text>
                                  </View>
                              </View>
                          );
                      })}
                  </View>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tóm Tắt Theo Tuần</Text>
          </View>
      );
  };

  const SessionItem = ({ session, index, isLast }: { session: any, index: number, isLast: boolean }) => {
      let exerciseName = session.title || "Bài tập tùy chỉnh";
      
      let rawImage = (session.image && session.image !== "null" && session.image !== "undefined" && session.image !== "") 
                          ? session.image 
                          : null;
      
      if (rawImage && typeof rawImage === 'string' && !rawImage.startsWith('http')) {
            if (!rawImage.startsWith('file://') && (rawImage.startsWith('/') || rawImage.indexOf('/') > -1)) {
                rawImage = `file://${rawImage}`;
            } 
      }

      let historySubExercises: any[] = [];
      let calculatedTotalSeconds = 0;
      let firstEx: any = null;

      try {
          const parsed = typeof session.exercises === 'string' ? JSON.parse(session.exercises) : session.exercises;
          if (Array.isArray(parsed) && parsed.length > 0) {
              historySubExercises = parsed;
              firstEx = parsed[0];

              calculatedTotalSeconds = historySubExercises.reduce((acc, sub) => {
                  if (sub.type === 'time' || (!sub.reps && sub.time)) {
                      return acc + (parseInt(sub.time) || 0);
                  } else {
                      return acc + ((parseInt(sub.reps) || 0) * 5);
                  }
              }, 0);

              if (!session.title) {
                 exerciseName = firstEx.name || firstEx.title;
                 if (parsed.length > 1) exerciseName += ` + ${parsed.length - 1} bài khác`;
              }
          }
      } catch (e) {
          console.log("Error parsing sub-exercises", e);
      }

      const startTime = formatTime(session.date);

      const handlePress = () => {
        const detailImage = rawImage || (firstEx ? (firstEx.image || firstEx.img || firstEx.thumbnail) : null);

        navigation.navigate("ExerciseDetailScreen", { 
            exerciseId: session.exercise_id || session.id,
            exercise: {
                id: session.exercise_id || session.id,
                title: session.title || exerciseName,
                image: detailImage,
                difficulty: session.difficulty || 'Dễ',
                time: calculatedTotalSeconds > 0 ? calculatedTotalSeconds : (session.duration * 60), 
                exerciseCount: historySubExercises.length
            },
            historyData: historySubExercises, 
            isHistoryView: true 
        });
      };

      return (
          <TouchableOpacity activeOpacity={0.7} onPress={handlePress} style={[styles.sessionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#f0f0f0' }]}>
              {rawImage ? (
                  <Image source={{ uri: rawImage }} style={styles.sessionImage} resizeMode="cover" />
              ) : (
                  <View style={[styles.sessionImage, { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' }]}>
                       <Image source={require("../../assets/edit.png")} style={{ width: 24, height: 24, tintColor: '#fff' }} />
                  </View>
              )}

              <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.sessionDate, { color: colors.subtext }]}>{formatDate(session.date)}, {startTime}</Text>
                  <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>{session.title || exerciseName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 12}}>
                          <Image source={require("../../assets/clock.png")} style={{width: 12, height: 12, tintColor: colors.primary, marginRight: 4}} />
                          <Text style={{ fontSize: 12, color: colors.subtext }}>{Math.floor(session.duration / 60)}:{String(session.duration % 60).padStart(2, '0')}</Text>
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Image source={require("../../assets/calo.png")} style={{width: 12, height: 12, tintColor: '#FF5722', marginRight: 4}} />
                          <Text style={{ fontSize: 12, color: colors.subtext }}>{session.calories} kcal</Text>
                      </View>
                  </View>
              </View>
              <Image source={require("../../assets/right-arrow.png")} style={{ width: 14, height: 14, tintColor: colors.subtext }} />
          </TouchableOpacity>
      );
  };

  const renderWeekCard = ({ item }: { item: any }) => {
    const isCollapsed = collapsedWeeks[item.id]; 
    return (
      <View style={[styles.weekCard, { backgroundColor: colors.card, shadowColor: isDark ? "#000" : "#ccc", borderColor: colors.border, borderWidth: 1 }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => toggleWeek(item.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? 0 : 12, borderBottomWidth: isCollapsed ? 0 : 1, borderBottomColor: isDark ? '#333' : '#eee', paddingBottom: isCollapsed ? 0 : 10 }}>
            <View>
                <Text style={[styles.weekTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
                    Tổng: {item.totalCount} buổi • {Math.floor(item.totalDuration / 60)}p {item.totalDuration % 60}s • {item.totalCalories} kcal
                </Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.badge, { backgroundColor: colors.primary, marginRight: 8 }]}>
                    <Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}}>Tuần</Text>
                </View>
                <Image source={require("../../assets/right-arrow.png")} style={{ width: 16, height: 16, tintColor: colors.subtext, transform: [{ rotate: isCollapsed ? '0deg' : '90deg' }] }} />
            </View>
        </TouchableOpacity>
        {!isCollapsed && (
            <View>
                {item.sessions.map((session: any, index: number) => (
                    <SessionItem 
                        key={`${session.id}-${index}`} 
                        session={session} 
                        index={index} 
                        isLast={index === item.sessions.length - 1} 
                    />
                ))}
            </View>
        )}
      </View>
    );
  };

  if (loading) {
      return (
          <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
          </SafeAreaView>
      )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <FlatList
        data={weeklyGroups}
        keyExtractor={(item) => item.id}
        renderItem={renderWeekCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? (<View style={{ alignItems: 'center', marginTop: 30 }}><Text style={{ color: colors.subtext }}>Không có dữ liệu trong tháng này.</Text></View>) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  headerContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  backButton: { padding: 5 },
  icon: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  monthNavRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  monthText: { fontSize: 16, fontWeight: '700', marginHorizontal: 30 },
  smallIcon: { width: 14, height: 14, resizeMode: 'contain' },
  calendarContainer: { marginBottom: 25 },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { width: width / 7 - 6, textAlign: 'center', fontSize: 13 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCell: { width: (width - 40) / 7, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 5, position: 'relative' },
  connector: { position: 'absolute', height: 32, top: 4 },
  dateCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  weekCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  weekTitle: { fontSize: 16, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  
  sessionImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#eee', overflow: 'hidden' },
  
  sessionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  sessionDate: { fontSize: 12, marginBottom: 2 }
});