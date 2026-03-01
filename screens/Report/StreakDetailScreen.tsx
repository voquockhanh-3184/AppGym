import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions, Animated, Easing } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from "../../src/context/ThemeContext";
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

export default function StreakDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  
  // Lấy sessions từ params
  const { sessions = [] } = route.params || {};

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = {
    background: isDark ? "#0d0d0d" : "#ffffff",
    text: isDark ? "#ffffff" : "#1f2937",
    subtext: isDark ? "#A0A0A0" : "#6b7280",
    primary: "#FF5757", 
    primaryLight: isDark ? "#5E2121" : "#FFD1D1", 
    accent: "#4da3ff",
    card: isDark ? "#1C1C1E" : "#f9f9f9",
    borderDefault: isDark ? "#333" : "#ddd",
    grayBg: isDark ? "#2C2C2E" : "#F2F4F8", 
  };

  const daysLabel = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const [weekData, setWeekData] = useState<boolean[]>(new Array(7).fill(false));
  const animationRef = useRef<LottieView>(null);

  // Tính index hôm nay trong mảng T2-CN (0-6)
  // getDay(): 0 là CN, 1 là T2... => Cần map lại: 1->0, 2->1, ..., 0->6
  const todayIndex = (new Date().getDay() + 6) % 7;

  // ✅ Helper chuẩn hóa ngày -> YYYY-MM-DD
  const formatDayString = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // ✅ LOGIC MỚI: TÍNH STREAK CHÍNH XÁC TỪ DANH SÁCH SESSIONS
  // Không phụ thuộc vào biến 'streak' từ Database nữa để tránh sai lệch
  const realStreak = useMemo(() => {
      if (!sessions || sessions.length === 0) return 0;

      // 1. Lấy danh sách các ngày ĐỘC NHẤT đã tập (Unique dates)
      const uniqueDates = [...new Set(sessions.map((s: any) => {
          if (!s.date) return "";
          return formatDayString(new Date(s.date));
      }))].filter(d => d !== "").sort().reverse(); // Sắp xếp mới nhất lên đầu

      if (uniqueDates.length === 0) return 0;

      const today = new Date();
      const todayStr = formatDayString(today);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDayString(yesterday);

      // 2. Xác định ngày bắt đầu đếm
      let currentCount = 0;
      let checkDate = new Date();

      // Nếu hôm nay CÓ tập -> Bắt đầu đếm từ hôm nay
      if (uniqueDates.includes(todayStr)) {
          checkDate = today;
      } 
      // Nếu hôm nay CHƯA tập, nhưng hôm qua CÓ tập -> Bắt đầu đếm từ hôm qua (Chuỗi chưa đứt)
      else if (uniqueDates.includes(yesterdayStr)) {
          checkDate = yesterday;
      } 
      // Nếu cả hôm nay và hôm qua đều không tập -> Chuỗi đứt -> Về 0
      else {
          return 0;
      }

      // 3. Vòng lặp đếm lùi về quá khứ
      while (true) {
          const dateString = formatDayString(checkDate);
          if (uniqueDates.includes(dateString)) {
              currentCount++;
              // Lùi về 1 ngày
              checkDate.setDate(checkDate.getDate() - 1);
          } else {
              break; // Ngắt chuỗi
          }
      }

      return currentCount;
  }, [sessions]);

  const fireSource = useMemo(() => {
      if (realStreak === 0) {
          return require("../../assets/No Fire Streak.json"); 
      }
      if (realStreak >= 3) {
          return require("../../assets/Streak Fire.json");
      }
      return require("../../assets/fire.json");
  }, [realStreak]);

  const [displayStreak, setDisplayStreak] = useState(0); 
  const streakAnimValue = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    streakAnimValue.setValue(0);
    const listener = streakAnimValue.addListener(({ value }) => {
      setDisplayStreak(Math.round(value));
    });
    Animated.timing(streakAnimValue, {
      toValue: realStreak, // ✅ Dùng biến realStreak mới tính
      duration: 1200, 
      useNativeDriver: false, 
      easing: Easing.out(Easing.exp), 
    }).start(({ finished }) => {
        if (finished) setDisplayStreak(realStreak);
    });
    return () => {
      streakAnimValue.removeListener(listener);
      streakAnimValue.removeAllListeners();
    };
  }, [realStreak]); 
  
  // ✅ Logic tính toán dữ liệu tuần này (Giữ nguyên, vì nó hiển thị đúng)
  useEffect(() => {
      if (animationRef.current) animationRef.current.play();
      
      const today = new Date();
      const currentDay = today.getDay(); // 0 (CN) -> 6 (T7)
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1; 
      
      const monday = new Date(today);
      monday.setDate(today.getDate() - diffToMonday); 

      const newWeekData = new Array(7).fill(false);
      
      for (let i = 0; i < 7; i++) {
          const checkDate = new Date(monday);
          checkDate.setDate(monday.getDate() + i);
          const dateStr = formatDayString(checkDate);
          
          const hasWorkout = sessions.some((s: any) => {
              if (!s.date) return false;
              return formatDayString(new Date(s.date)) === dateStr;
          });
          
          if (hasWorkout) newWeekData[i] = true;
      }
      setWeekData(newWeekData);
  }, [sessions]); 

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image 
            source={require("../../assets/back.png")} 
            style={[styles.backIcon, { tintColor: colors.text }]} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        
        <View style={styles.fireContainer}>
           <LottieView
              ref={animationRef}
              source={fireSource} 
              style={styles.fireLottie}
              autoPlay
              loop
           />
        </View>

        {/* Hiển thị số Streak đã tính toán lại */}
        <Text style={[styles.streakCount, { color: colors.primary }]}>
            {displayStreak}
        </Text>

        <Text style={[styles.title, { color: colors.text }]}>Ngày liên tiếp</Text>
        
        <View style={styles.bestStreakRow}>
            <Image source={require("../../assets/medal.png")} style={{width: 20, height: 20, marginRight: 8, tintColor: '#FFD700'}}/>
            <Text style={[styles.bestText, { color: colors.subtext }]}>
                Tốt nhất: <Text style={{fontWeight: 'bold', color: colors.accent}}>{realStreak} ngày</Text>
            </Text>
        </View>

        <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
            <View style={styles.weekRow}>
                {daysLabel.map((day, index) => {
                    const isActive = weekData[index];
                    const isNextActive = weekData[index + 1];
                    const isToday = index === todayIndex; 

                    return (
                        <View key={index} style={styles.dayItem}>
                            
                            {/* Nối các ngày liên tiếp */}
                            {isActive && isNextActive && (
                                <View 
                                    style={{
                                        position: 'absolute',
                                        bottom: 0, 
                                        left: '50%', 
                                        width: '100%', 
                                        height: 30, 
                                        backgroundColor: colors.primaryLight,
                                        zIndex: -1, 
                                    }} 
                                />
                            )}

                            <Text style={[
                                styles.dayLabel, 
                                { 
                                    color: isToday ? colors.primary : colors.subtext,
                                    fontWeight: isToday ? 'bold' : '600',
                                    opacity: isToday ? 1 : 0.7
                                }
                            ]}>
                                {day}
                            </Text>

                            <View style={[
                                styles.dayCircle, 
                                { 
                                    backgroundColor: isActive ? colors.primary : colors.grayBg, 
                                    borderColor: isActive ? colors.primary : (isToday ? colors.primary : 'transparent'), 
                                    borderWidth: isToday ? 2 : 0 
                                }
                            ]}>
                                {isActive ? (
                                    <Image 
                                        source={require("../../assets/success.png")} 
                                        style={{
                                            width: 14, 
                                            height: 14, 
                                            tintColor: '#fff' 
                                        }} 
                                    />
                                ) : (
                                    <Text style={{ 
                                        fontSize: 14, 
                                        fontWeight: 'bold', 
                                        color: isToday ? colors.primary : colors.subtext 
                                    }}>
                                        {index + 1}
                                    </Text>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>

        <Text style={[styles.footerText, { color: colors.subtext }]}>
            Bạn mạnh mẽ hơn bạn nghĩ! Quay trở lại với các bài tập của bạn và đạt được một chuỗi mới.
        </Text>
        
        <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={() => navigation.goBack()}
        >
            <Text style={styles.buttonText}>Tiếp tục tập luyện</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
      padding: 20,
      marginTop: 10 
  },
  backButton: { padding: 5 },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  
  fireContainer: { 
      marginBottom: -30, 
      height: 240, 
      justifyContent: 'center',
      alignItems: 'center'
  },
  fireLottie: { 
      width: 240,  
      height: 240 
  },

  streakCount: { fontSize: 70, fontWeight: '900', lineHeight: 80 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  bestStreakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  bestText: { fontSize: 16 },
  
  calendarCard: { width: '100%', padding: 20, borderRadius: 20, marginBottom: 30, elevation: 2, shadowOpacity: 0.1, shadowRadius: 4 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayItem: { alignItems: 'center', gap: 8, flex: 1 }, // Thêm flex: 1 để chia đều
  dayLabel: { fontSize: 14, fontWeight: '600' },
  dayCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  
  footerText: { textAlign: 'center', fontSize: 14, lineHeight: 22, marginBottom: 30, paddingHorizontal: 20 },
  button: { width: '100%', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 'auto', marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});