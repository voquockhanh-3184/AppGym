import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
import DB, { getAllCategories, getAllLastLogs, getWorkoutSessionsLocal } from "../../src/db/sqlite"; 
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addLocalNotification } from "../../src/utils/NotificationService"; // ✅ Import Notification Service

const { width } = Dimensions.get("window");

// --- CẤU HÌNH CAROUSEL KHÓA HỌC (ĐÃ ĐIỀU CHỈNH) ---
const CARD_WIDTH = width * 0.75; 
const CARD_SPACING = 20; 
const ITEM_SIZE = CARD_WIDTH + CARD_SPACING; 
const CONTAINER_PADDING_X = 20;

const MAX_DIFFICULTY = 3;
const MAX_EXERCISES_PER_CATEGORY = 3; 

const getCurrentUserId = async () => {
  try {
    return await AsyncStorage.getItem('currentUserId');
  } catch (e) { console.warn(e); }
  return null;
};

const getStartDayIndexStorage = async () => {
    try {
      const index = await AsyncStorage.getItem('startDayOfWeekIndex'); 
      return index !== null ? parseInt(index, 10) : 1; 
    } catch (e) { return 1; }
};

const getWeeklyGoalStorage = async () => {
    try {
      const storedGoal = await AsyncStorage.getItem('weeklyGoalDays'); 
      return storedGoal ? parseInt(storedGoal, 10) : 3;
    } catch (e) { return 3; }
};

interface Exercise { id: string; category: string; title: string; time: number; difficulty: string; exerciseCount: number; image: string; createdAt?: any; }

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    background: isDark ? "#0d0d0d" : "#F9FAFB",
    card: isDark ? "#1e1e1e" : "#fff",
    text: isDark ? "#ffffff" : "#222222",
    subtext: isDark ? "#bbbbbb" : "#777777",
    accent: "#0055FF", 
    accentLight: isDark ? "#002870" : "#D6E4FF", 
    border: isDark ? "#333" : "#E5E5E5", 
    dotInactive: isDark ? "#333333" : "#D1D5DB",
    badgeBg: isDark ? "#2C2C2E" : "#F3F4F6",
    inactiveCatBg: isDark ? "#2C2C2E" : "#F3F4F6",
  };

  const motivationTexts = ["Hãy luyện tập chinh phục mục tiêu!", "Không bỏ cuộc, bạn làm được!", "Mỗi ngày một tiến bộ hơn!", "Cố gắng thêm chút nữa", "Khỏe mạnh là hạnh phúc!"];
  const [motivationIndex, setMotivationIndex] = useState(0);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const animationStarted = useRef(false);

  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [completedDaysCount, setCompletedDaysCount] = useState(0); 
  const [completedDates, setCompletedDates] = useState<number[]>([]); 

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  
  const [logsMap, setLogsMap] = useState<Record<string, string>>({}); 

  const [weekDays, setWeekDays] = useState<{ date: number }[]>([]);
  const [todayDate, setTodayDate] = useState(new Date().getDate());
  
  const [activeCourseIndex, setActiveCourseIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const categoryScrollRef = useRef<ScrollView>(null);

  // --- HÀM HELPER ---
  const formatDisplayTime = (time: string | number) => {
    const totalSeconds = parseInt(String(time || 0), 10);
    if (isNaN(totalSeconds) || totalSeconds === 0) return "0 giây";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds} giây`;
    if (seconds === 0) return `${minutes} phút`;
    return `${minutes} phút ${seconds} giây`;
  };

  const formatDateLog = (isoString: string) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      return `Th${date.getMonth() + 1} ${date.getDate()}`;
  };

  const getDifficultyLevel = (difficulty: string) => {
    const d = difficulty ? difficulty.toLowerCase() : "";
    if (d.includes("khó") || d.includes("hard")) return 3;
    if (d.includes("trung") || d.includes("medium")) return 2;
    return 1; 
  };

  const calculateWeekDays = (startDayIdx: number) => {
      const today = new Date();
      setTodayDate(today.getDate());
      const currentDay = today.getDay(); 
      const diff = (currentDay - startDayIdx + 7) % 7;
      const startOfWeekDate = new Date(today);
      startOfWeekDate.setDate(today.getDate() - diff);
      const daysArray = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeekDate);
          d.setDate(startOfWeekDate.getDate() + i);
          daysArray.push({ date: d.getDate() });
      }
      setWeekDays(daysArray);
  };

  // ✅ LOGIC CHÍNH: KIỂM TRA MỤC TIÊU & GỬI THÔNG BÁO
  useEffect(() => {
    const checkGoalCompletion = async () => {
      // Chỉ kiểm tra khi đã load xong dữ liệu và có ngày hoàn thành
      if (completedDaysCount > 0 && completedDaysCount >= weeklyGoal) {
        try {
          const today = new Date();
          // Tạo key duy nhất cho tuần hiện tại (dựa vào số tuần trong năm)
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const pastDaysOfYear = (today.getTime() - startOfYear.getTime()) / 86400000;
          const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
          const goalKey = `GOAL_REACHED_${today.getFullYear()}_WEEK_${weekNumber}`;

          const hasCongratulated = await AsyncStorage.getItem(goalKey);

          if (!hasCongratulated) {
            // 1. Gửi thông báo cục bộ
            await addLocalNotification(
              "Chúc mừng! 🎉",
              `Bạn đã hoàn thành mục tiêu ${weeklyGoal} ngày tập trong tuần này. Tiếp tục phát huy nhé! 💪`,
              Date.now(),
              "promo"
            );

            // 2. Đánh dấu đã gửi để không spam
            await AsyncStorage.setItem(goalKey, "true");
            console.log("✅ Đã gửi thông báo hoàn thành mục tiêu tuần.");
          }
        } catch (error) {
          console.error("Lỗi kiểm tra mục tiêu:", error);
        }
      }
    };

    checkGoalCompletion();
  }, [completedDaysCount, weeklyGoal]); // Chạy lại khi số ngày tập hoặc mục tiêu thay đổi

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const loadData = async () => {
        try {
          const id = await getCurrentUserId();
          await DB.initDB();
          
          const savedGoal = await getWeeklyGoalStorage();
          if(mounted) setWeeklyGoal(savedGoal);
          
          const startIdx = await getStartDayIndexStorage();
          if(mounted) calculateWeekDays(startIdx);

          if (id) {
              const logs = await getAllLastLogs(Number(id)); 
              if (mounted) setLogsMap(logs || {});
          } else {
              if (mounted) setLogsMap({});
          }

          const allUsers = await DB.getAllUsersLocal();
          const foundUser = allUsers.find((u: any) => String(u.id) === String(id));
          
          if (foundUser) {
            if(mounted) {
                setUserPhoto(foundUser.photoURL || null);
                setIsAdminUser(foundUser.role === "admin");
            }

            if (foundUser.id) {
                const sessions = await getWorkoutSessionsLocal(foundUser.id);
                
                const today = new Date();
                const currentDay = today.getDay();
                const diff = (currentDay - startIdx + 7) % 7;
                
                const startOfWeekDate = new Date(today);
                startOfWeekDate.setDate(today.getDate() - diff);
                startOfWeekDate.setHours(0, 0, 0, 0); 

                const endOfWeekDate = new Date(startOfWeekDate);
                endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
                endOfWeekDate.setHours(23, 59, 59, 999); 

                const doneDatesSet = new Set<number>();
                
                if (sessions && Array.isArray(sessions)) {
                    sessions.forEach((s: any) => {
                        const sDate = new Date(s.date); 
                        if (sDate >= startOfWeekDate && sDate <= endOfWeekDate) {
                            doneDatesSet.add(sDate.getDate());
                        }
                    });
                }

                if (mounted) {
                    setCompletedDates(Array.from(doneDatesSet));
                    setCompletedDaysCount(doneDatesSet.size);
                }
            }
          } else {
             if (mounted) {
                 setCompletedDates([]);
                 setCompletedDaysCount(0);
                 setUserPhoto(null);
                 setIsAdminUser(false);
                 setLogsMap({});
             }
          }

          const dbCats = await getAllCategories();
          const catNames = [...dbCats.map((c: any) => c.name)];
          if (mounted) setCategories(catNames);
          
          if (catNames.length > 0 && mounted && selectedCategory === "Tất cả") {
              setSelectedCategory(catNames[0]);
          }

          const exRows = await DB.getExercisesLocal();
          const exData = await Promise.all(exRows.map(async (r: any) => {
              const subs = await DB.getSubExercisesLocal(r.id);
              const totalSec = subs.reduce((sum: number, s: any) => {
                 if (s.type === "time") return sum + (parseInt(s.time) || 0);
                 else return sum + ((parseInt(s.reps) || 0) * 5);
              }, 0);

              return {
                  id: String(r.id),
                  category: r.category || "",
                  title: r.title || "",
                  time: subs.length > 0 ? totalSec : parseInt(String(r.time || 0), 10),
                  difficulty: r.difficulty || "",
                  exerciseCount: subs.length > 0 ? subs.length : (r.exerciseCount || 0),
                  image: r.image || "",
              };
          }));
          
          if (mounted) setExercises(exData);

          const courseRows = await DB.getVisibleCoursesLocal();
          if (mounted) setCourses(courseRows);

        } catch (e) { console.error("Error loading home data:", e); }
      };

      loadData();
      return () => { mounted = false; };
    }, []) 
  );

  useEffect(() => {
    if (animationStarted.current) return;
    animationStarted.current = true;
    const animate = () => {
      Animated.sequence([
        Animated.timing(flipAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(flipAnim, { toValue: 2, duration: 600, useNativeDriver: true })
      ]).start(() => {
        flipAnim.setValue(0);
        setMotivationIndex((prev) => (prev + 1) % motivationTexts.length);
        animate();
      });
    };
    animate();
  }, []);

  const handleCategoryScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const snapWidth = width - 40;
    const index = Math.round(offsetX / snapWidth);
    if (categories[index] && categories[index] !== selectedCategory) {
        setSelectedCategory(categories[index]);
    }
  };

  const onCategoryPress = (cat: string, index: number) => {
    setSelectedCategory(cat);
    categoryScrollRef.current?.scrollTo({ x: index * (width - 40), animated: true });
  };

  const handleCourseScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => { 
      const offsetX = event.nativeEvent.contentOffset.x; 
      setActiveCourseIndex(Math.round(offsetX / ITEM_SIZE)); 
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: 90 }]}>
      <Header title="Tập Luyện" userPhoto={userPhoto} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* THANH TÌM KIẾM */}
        <TouchableOpacity onPress={() => navigation.navigate("SearchScreen")} activeOpacity={0.8} style={[styles.searchButton, { backgroundColor: isDark ? "#1E1E1E" : "#F1F1F3" }]}>
            <Image source={require("../../assets/search.png")} style={[styles.searchIcon, { tintColor: isDark ? "#aaa" : "#777" }]} />
            <Text style={{ color: isDark ? "#888" : "#555", fontSize: 15 }}>Tìm kiếm bài tập, khóa học...</Text>
        </TouchableOpacity>
              
        {/* MỤC TIÊU HÀNG TUẦN */}
        <View style={{ marginTop: 25, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15, paddingHorizontal: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginVertical: 0, fontSize: 18 }]}>Mục tiêu hàng tuần</Text>
                <TouchableOpacity onPress={() => navigation.navigate("WeeklyGoalScreen")} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: colors.accent }}>
                        {completedDaysCount}<Text style={{ fontSize: 15, color: colors.subtext, fontWeight: "600" }}>/{weeklyGoal}</Text>
                    </Text>
                    <Image source={require("../../assets/edit.png")} style={{ width: 14, height: 14, tintColor: colors.subtext, marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
            
            <View style={styles.weekRow}>
                {weekDays.map((d, i) => {
                    const isCompleted = completedDates.includes(d.date); 
                    const isToday = d.date === todayDate;

                    const nextDay = weekDays[i + 1];
                    const isNextCompleted = nextDay && completedDates.includes(nextDay.date);

                    return (
                        <View key={i} style={styles.dayContainer}>
                            {isCompleted && isNextCompleted && (
                                <View 
                                    style={{
                                        position: 'absolute',
                                        height: 40, 
                                        top: 0,    
                                        left: '50%', 
                                        width: (width - 40) / 7 + 5, 
                                        backgroundColor: colors.accent,
                                        opacity: 0.3, 
                                        zIndex: -1, 
                                        borderRadius: 0, 
                                    }} 
                                />
                            )}

                            {isCompleted ? (
                                <View style={[styles.dayCircle, { backgroundColor: colors.accent }]}>
                                    <Image source={require("../../assets/check-mark.png")} style={{ width: 14, height: 14, tintColor: '#fff' }} />
                                </View>
                            ) : isToday ? (
                                <View style={[styles.dayCircle, { borderColor: colors.accent, borderWidth: 1.5, backgroundColor: isDark ? colors.card : 'transparent' }]}>
                                     <Text style={{ fontSize: 16, fontWeight: "700", color: colors.accent }}>{d.date}</Text>
                                </View>
                            ) : (
                                <View style={[styles.dayCircle]}>
                                    <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>{d.date}</Text>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>

        {/* BOX TO BÊN DƯỚI (MOTIVATION) */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate("WeeklyGoalScreen")} style={[styles.goalBox, { backgroundColor: isDark ? "#1E1E1E" : "#fff" }]}>
            <View style={styles.goalContent}>
                <Image source={require("../../assets/trainer.png")} style={styles.goalImage} />
                <View style={{ overflow: "hidden", height: 28 }}>
                    <Animated.Text style={[styles.goalText, { color: isDark ? "#EAF1FF" : "#222", transform: [{ translateY: flipAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [50, 0, -50] }) }] }]}>
                        {motivationTexts[motivationIndex]}
                    </Animated.Text>
                </View>
            </View>
        </TouchableOpacity>

        {/* TIÊU ĐỀ CƠ THỂ TẬP TRUNG */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 0, paddingHorizontal: 0 }}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 20 }]}>Cơ thể tập trung</Text>
          {isAdminUser && (
             <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => navigation.navigate("EditExercisesScreen")} style={[styles.addButton, { backgroundColor: isDark ? colors.card : '#E0E0E0' }]}><Text style={[styles.addButtonText, { color: isDark ? colors.text : '#333' }]}>Sửa / Xóa</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("AddExercise")} style={styles.addButton}><Text style={styles.addButtonText}>+ Thêm</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* DANH MỤC (CHIPS) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
           {categories.map((cat, index) => {
             const isSelected = selectedCategory === cat;
             return (
                <TouchableOpacity 
                    key={cat} 
                    onPress={() => onCategoryPress(cat, index)} 
                    style={[
                        styles.categoryChip, 
                        { backgroundColor: isSelected ? '#fff' : colors.inactiveCatBg, borderColor: isSelected ? colors.accent : 'transparent', borderWidth: isSelected ? 1 : 0 }
                    ]}
                >
                    <Text style={[
                        styles.categoryText, 
                        { color: isSelected ? colors.accent : colors.subtext, fontWeight: isSelected ? '700' : '500' }
                    ]}>
                        {cat}
                    </Text>
                </TouchableOpacity>
             )
           })}
        </ScrollView>

        {/* DANH SÁCH BÀI TẬP */}
        <ScrollView ref={categoryScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleCategoryScroll} scrollEventThrottle={16}>
             {categories.map((cat) => {
                const filteredExercises = exercises.filter(ex => ex.category === cat).slice(0, MAX_EXERCISES_PER_CATEGORY);
                return (
                    <View key={cat} style={{ width: width - 40, marginRight: 0 }}> 
                        {filteredExercises.length === 0 ? (
                             <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>Không có bài tập nào.</Text>
                        ) : (
                             filteredExercises.map((ex, index) => {
                                const difficultyCount = getDifficultyLevel(ex.difficulty);
                                const lastLog = logsMap[String(ex.id)] || logsMap[ex.id]; 
                                const isLastItem = index === filteredExercises.length - 1;

                                return (
                                <View key={ex.id}>
                                    <TouchableOpacity 
                                        activeOpacity={0.9} 
                                        onPress={() => navigation.navigate("ExerciseDetailScreen", { exercise: ex })}
                                        style={{ paddingVertical: 10 }} 
                                    >
                                        <View style={styles.exerciseCard}>
                                                <Image 
                                                    source={{ uri: ex.image || "https://cdn-icons-png.flaticon.com/512/4712/4712109.png" }} 
                                                    style={styles.cardImage} 
                                                />
                                                <View style={styles.cardContent}>
                                                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                                                        {ex.title}
                                                    </Text>
                                                    
                                                    <Text style={[styles.cardSubtitle, { color: colors.subtext }]}>
                                                        {formatDisplayTime(ex.time)} • {ex.exerciseCount || 0} Bài tập
                                                    </Text>
                                                    
                                                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                                                        <View style={styles.lightningRow}>
                                                            {Array.from({ length: 3 }).map((_, i) => (
                                                                <Image 
                                                                    key={i} 
                                                                    source={require("../../assets/thunder.png")} 
                                                                    style={{ 
                                                                        width: 14, height: 14, 
                                                                        marginLeft: i === 0 ? 0 : 2, 
                                                                        tintColor: i < difficultyCount ? colors.accent : '#E0E0E0',
                                                                        resizeMode: 'contain'
                                                                    }} 
                                                                />
                                                            ))}
                                                        </View>

                                                        {lastLog && (
                                                            <View style={[styles.lastLogBadge, { backgroundColor: colors.badgeBg }]}>
                                                                <Text style={styles.lastLogText}>
                                                                    {formatDateLog(lastLog)}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                    </TouchableOpacity>
                                    {!isLastItem && (
                                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                                    )}
                                </View>
                            )})
                        )}
                    </View>
                );
            })}
        </ScrollView>

        {/* --- PHẦN KHÓA HỌC --- */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Khóa học</Text>
            {isAdminUser && (<TouchableOpacity onPress={() => navigation.navigate("BannerSettingScreen")} style={styles.addButton}><Text style={styles.addButtonText}>Quản lý</Text></TouchableOpacity>)}
        </View>

        {courses.length === 0 ? (
            <Text style={{ color: colors.text, marginVertical: 10 }}>Chưa có khóa học nào.</Text>
        ) : (
            <View>
                <Animated.ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    snapToInterval={ITEM_SIZE} 
                    decelerationRate="fast" 
                    snapToAlignment="start" 
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }],{ useNativeDriver: true, listener: handleCourseScroll })} 
                    scrollEventThrottle={16} 
                    contentContainerStyle={{ paddingHorizontal: CONTAINER_PADDING_X }} 
                >
                    {courses.map((course, index) => { 
                        const inputRange = [(index - 1) * ITEM_SIZE, index * ITEM_SIZE, (index + 1) * ITEM_SIZE]; 
                        
                        const scale = scrollX.interpolate({ 
                            inputRange, 
                            outputRange: [0.85, 1, 0.85], 
                            extrapolate: 'clamp' 
                        }); 
                        
                        const opacity = scrollX.interpolate({ 
                            inputRange, 
                            outputRange: [0.5, 1, 0.5], 
                            extrapolate: 'clamp' 
                        });

                        const translateY = scrollX.interpolate({
                            inputRange,
                            outputRange: [20, 0, 20], 
                            extrapolate: 'clamp'
                        });

                        return (
                            <Animated.View key={course.id} style={{ 
                                width: CARD_WIDTH, 
                                marginHorizontal: CARD_SPACING / 2, 
                                transform: [{ scale }, { translateY }], 
                                opacity: opacity 
                            }}>
                                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate("CourseDetailScreen", { course })} style={{ flex: 1 }}>
                                    <View style={styles.courseBanner}>
                                        <Image source={{ uri: course.image }} style={styles.courseBannerImage} />
                                        <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.courseOverlay}>
                                            <Text style={styles.courseTitle}>{course.title}</Text>
                                        </LinearGradient>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ); 
                    })}
                </Animated.ScrollView>
                <View style={styles.paginationContainer}>
                    {courses.map((_, index) => (<View key={index} style={[styles.dot, { backgroundColor: activeCourseIndex === index ? colors.accent : colors.dotInactive, width: activeCourseIndex === index ? 20 : 8 }]} />))}
                </View>
            </View>
        )}

        {/* --- TÙY CHỈNH BÀI TẬP --- */}
        <View style={{ marginTop: 10, marginBottom: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tùy chỉnh bài tập</Text>
            
            <TouchableOpacity onPress={() => navigation.navigate("CreateCustomWorkout")} activeOpacity={0.9} style={styles.customBannerContainer}>
                <LinearGradient
                    colors={['#2E93FF', '#0055FF']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 1}}
                    style={styles.customBannerGradient}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={styles.customBannerTitle}>
                            TẠO CỦA{"\n"}RIÊNG BẠN
                        </Text>
                        <View style={styles.customBannerButton}>
                            <Text style={styles.customBannerButtonText}>ĐI</Text>
                        </View>
                    </View>

                    <View style={styles.customBannerIconBg}>
                        <View style={{
                            position: 'absolute', width: '100%', height: '100%', 
                            backgroundColor: 'rgba(255,255,255,0.1)', 
                            borderRadius: 25, top: -10, right: -10, zIndex: -1
                        }} />
                        <Image 
                            source={require("../../assets/edit.png")} 
                            style={styles.customBannerIcon} 
                        />
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Footer active="Tập luyện" darkMode={isDark} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  searchButton: { flexDirection: "row", alignItems: "center", borderRadius: 30, paddingVertical: 12, paddingHorizontal: 16, marginTop: 20 },
  searchIcon: { width: 20, height: 20, marginRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginVertical: 10 },
  
  weekRow: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', paddingHorizontal: 0 },
  dayContainer: { alignItems: 'center', justifyContent: 'center', width: '13%' },
  
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 40 / 2, 
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden', 
    borderCurve: 'continuous', 
  },

  goalBox: { borderRadius: 15, padding: 15, marginTop: 10, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  goalContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  goalImage: { width: 40, height: 40 },
  goalText: { fontSize: 14, fontWeight: "600" },
  addButton: { backgroundColor: "#007AFF", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  
  categoryScroll: { flexDirection: "row", paddingVertical: 10, marginBottom: 5 },
  categoryChip: {
      borderRadius: 20, 
      paddingVertical: 8, 
      paddingHorizontal: 20, 
      marginRight: 10, 
  },
  categoryText: { fontSize: 15 },

  // --- STYLE CHO BÀI TẬP VÀ ĐƯỜNG KẺ ---
  exerciseCard: {
      flexDirection: 'row',
      alignItems: 'center', 
      paddingVertical: 5,   
  },
  cardImage: {
      width: 80,  
      height: 80, 
      borderRadius: 16, 
      resizeMode: 'cover',
      marginRight: 16,  
      backgroundColor: '#f0f0f0'
  },
  cardContent: {
      flex: 1,
      justifyContent: 'center', 
  },
  cardTitle: {
      fontSize: 17,
      fontWeight: '700', 
      marginBottom: 6,   
      lineHeight: 24,
  },
  cardSubtitle: {
      fontSize: 13,
      marginBottom: 6,
      fontWeight: '500'
  },
  lightningRow: {
      flexDirection: 'row',
  },
  lastLogBadge: {
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 6,
      marginLeft: 'auto', 
  },
  lastLogText: {
      fontSize: 11, 
      color: '#666',
      fontWeight: '500'
  },
  separator: {
    height: 1,
    width: '100%',
    marginVertical: 4, 
    opacity: 0.6
  },

  detailRow: { flexDirection: 'column', alignItems: 'flex-start', marginTop: 2 },
  courseBanner: { width: '100%', height: 160, borderRadius: 16, overflow: "hidden", backgroundColor: "#ccc", shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  courseBannerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  courseOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 12 },
  courseTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, gap: 6 },
  dot: { height: 8, borderRadius: 4 },

  customBannerContainer: {
    borderRadius: 20,
    marginTop: 5,
    overflow: 'hidden',
    height: 140, 
    shadowColor: "#0055FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  customBannerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  customBannerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
    lineHeight: 30, 
    textTransform: 'uppercase',
  },
  customBannerButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingVertical: 8,
    borderRadius: 25,
    alignSelf: 'flex-start',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  customBannerButtonText: {
    color: '#0055FF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  customBannerIconBg: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-10deg' }], 
  },
  customBannerIcon: {
    width: 40,
    height: 40,
    tintColor: '#fff',
  }
});

export default HomeScreen;