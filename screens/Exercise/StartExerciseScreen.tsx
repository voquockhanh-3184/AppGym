import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
  Modal,
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Video from "react-native-video";
import Tts from 'react-native-tts'; 
import LottieView from 'lottie-react-native'; 
import Svg, { Circle } from 'react-native-svg'; 
import { 
    saveWorkoutLog, 
    saveWorkoutProgress,    
    getWorkoutProgress,     
    deleteWorkoutProgress,
    getCurrentUserId,
    addWorkoutSession, 
    getAllUsersLocal        
} from "../../src/db/sqlite";

const { height, width } = Dimensions.get('window');

// Tạo Animated Component cho Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- HELPERS CHO BMI ---
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

export default function StartExerciseScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const params = route.params || {};
  const exerciseData = params.exercise || {}; 
  const exerciseId = exerciseData.id; 

  const subExercises = params.subExercises || exerciseData.subExercises || [];
  
  const workoutCoverImage = params.image || exerciseData.image;
  const parentTitle = params.title || exerciseData.title || exerciseData.name || "Bài tập của bạn";

  // --- STATE ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false); 

  // State User & BMI & Weight
  const [userBMI, setUserBMI] = useState<number | null>(null);
  const [userWeight, setUserWeight] = useState(60); 

  // State cho Modal hỏi tiếp tục
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [savedIndexToResume, setSavedIndexToResume] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  const [isResting, setIsResting] = useState(false);
  const [restTime, setRestTime] = useState(30);
  const [customRestTime, setCustomRestTime] = useState(30);
  
  const [finished, setFinished] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState<number | null>(null);
  
  const [showRestModal, setShowRestModal] = useState(false);
  const [selectedRest, setSelectedRest] = useState(customRestTime);
  
  const progressAnim = useRef(new Animated.Value(1)).current;
  const exerciseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // [MỚI] Animation cho vòng tròn đếm ngược (0 -> 1)
  const circleProgress = useRef(new Animated.Value(0)).current; 
  
  // Cấu hình kích thước vòng tròn
  const RADIUS = 60; 
  const STROKE_WIDTH = 8; 
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; 

  // [MỚI] Ref cho Animation Hoa Giấy
  const confettiRef = useRef<LottieView>(null);

  // --- State Theo dõi thời gian thực tế ---
  const [startTime, setStartTime] = useState<number>(0); 
  const [totalDuration, setTotalDuration] = useState(0); 
  const [caloriesBurned, setCaloriesBurned] = useState(0); 

  // [MỚI] Tính toán tiến độ bài tập con (Progress Bar)
  const totalSubExercises = subExercises.length;
  // Tính % dựa trên index hiện tại (ví dụ: bài 1/10 -> 10%)
  // Dùng currentIndex + 1 để khi vừa vào bài 1 đã hiện 1 chút
  const progressPercent = totalSubExercises > 0 
      ? ((currentIndex + 1) / totalSubExercises) * 100 
      : 0;

  const currentExercise = subExercises[currentIndex] || {};
  const nextExercise = subExercises[currentIndex + 1] || {};
  const isTimeExercise = currentExercise?.type === 'time';

  const restOptions = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90];

  const feelingOptions = [
    { id: 0, label: "Quá khó", icon: require("../../assets/hard.gif") }, 
    { id: 1, label: "Bình thường", icon: require("../../assets/normal.gif") },
    { id: 2, label: "Quá dễ", icon: require("../../assets/easy.gif") }
  ];

  // --- 2. SETUP VOICE TTS ---
  useEffect(() => {
    Tts.getInitStatus().then(() => {
        Tts.setDefaultLanguage('vi-VN'); 
        Tts.setDefaultRate(0.5); 
        Tts.setIgnoreSilentSwitch('ignore'); 
    }, (err) => {
        if (err.code === 'no_engine') {
            Tts.requestInstallEngine();
        }
    });
    return () => {
        Tts.stop();
    };
  }, []);

  // --- [MỚI] EFFECT KÍCH HOẠT HOA GIẤY KHI FINISHED ---
  useEffect(() => {
    if (finished) {
        setTimeout(() => {
            if (confettiRef.current) {
                confettiRef.current.play();
                Tts.speak("Chúc mừng bạn đã hoàn thành bài tập"); 
            }
        }, 100);
    }
  }, [finished]);

  // --- Tính calo và BMI ---
  useEffect(() => {
      const loadUserInfo = async () => {
          try {
              const id = await getCurrentUserId(); 
              const allUsers = await getAllUsersLocal(); 
              let foundUser = null;
              if (id) foundUser = allUsers.find((u: any) => String(u.id) === String(id));
              if (!foundUser && allUsers.length > 0) foundUser = allUsers[allUsers.length - 1];
              if (foundUser && foundUser.weight && foundUser.height) {
                  const w = foundUser.weight;
                  const h = foundUser.height;
                  const bmiVal = w / Math.pow(h / 100, 2);
                  setUserBMI(Number(bmiVal.toFixed(1)));
                  setUserWeight(w); 
              }
          } catch (e) {
              console.warn("Error loading User Info:", e);
          }
      };
      loadUserInfo();
  }, []);

  // --- HELPER FUNCTIONS ---
  // Hiển thị giây
  const formatTime = (time: string | number) => {
    if (!time) return "00:00";
    if (typeof time === "string" && time.includes(":")) return time;
    const total = parseInt(time as string) || 0;
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  //Quy đổi sang giây
  const getSecondsFromTime = (time: string) => {
    if (!time) return 20;
    if (time.includes(":")) {
      const [m, s] = time.split(":").map(v => parseInt(v) || 0);
      return m * 60 + s;
    }
    return parseInt(time) || 0;
  };

  // ✅ CALCULATE RESULTS
  const calculateResults = () => {
      const now = Date.now();
      let wallClockDuration = 0; 
      if (startTime > 0) {
          wallClockDuration = Math.floor((now - startTime) / 1000);
      }
      let activeSeconds = 0;
      subExercises.forEach((ex: any) => {
          if (ex.type === "time") {
              activeSeconds += getSecondsFromTime(ex.time || "00:20");
          } else {
              const reps = parseInt(ex.reps) || 10;
              activeSeconds += (reps * 3.5);
          }
      });
      const MET = 5.8; 
      const weight = userWeight > 0 ? userWeight : 60; 
      const activeMinutes = activeSeconds / 60;
      const calculatedCalories = (MET * 3.5 * weight * activeMinutes) / 200;
      const finalCalories = Math.floor(calculatedCalories);
      const displayCalories = finalCalories > 0 ? finalCalories : 1; 

      setTotalDuration(wallClockDuration);
      setCaloriesBurned(displayCalories);

      return { duration: wallClockDuration, calories: displayCalories };
  };

  // 1. CHECK PROGRESS
  useEffect(() => {
      const checkProgress = async () => {
          setStartTime(Date.now()); 
          if (exerciseId) {
              const savedIndex = await getWorkoutProgress(exerciseId);
              if (savedIndex > 0 && savedIndex < subExercises.length) {
                  setSavedIndexToResume(savedIndex);
                  setShowContinueModal(true); 
              } else {
                  setIsLoaded(true);
              }
          } else {
              setIsLoaded(true);
          }
      };
      checkProgress();
  }, []);

  const handleResume = () => {
      setCurrentIndex(savedIndexToResume);
      setIsLoaded(true);
      setShowContinueModal(false);
      setStartTime(Date.now()); 
  };

  const handleRestart = () => {
      setCurrentIndex(0);
      setIsLoaded(true);
      setShowContinueModal(false);
      setStartTime(Date.now());
  };

  // 2. AUTO SAVE
  useEffect(() => {
      if (isLoaded && exerciseId && !finished) {
          saveWorkoutProgress(exerciseId, currentIndex);
      }
  }, [currentIndex, isLoaded, finished]);

  // 3. SETUP EXERCISE & RUN CIRCLE ANIMATION
  useEffect(() => {
    if (!currentExercise?.name) return;
    
    // Setup cho bài tính giờ
    if (isTimeExercise) {
      const totalSeconds = getSecondsFromTime(currentExercise.time || '00:20');
      setTimeLeft(totalSeconds);
      progressAnim.setValue(1);
    }
    
    // Reset đếm ngược
    setIsCountingDown(true);
    setCountdown(3);
    setIsPlaying(false);

    // Chạy Animation vòng tròn trong 3 giây (3000ms)
    // Giá trị chạy từ 0 (đầy) -> 1 (hết)
    circleProgress.setValue(0);
    Animated.timing(circleProgress, {
        toValue: 1,
        duration: 3000, 
        useNativeDriver: true, 
    }).start();

    // Đọc tên bài tập
    Tts.stop();
    Tts.speak(`Bài tập ${currentExercise.name}`);
  }, [currentIndex]); 

  // 4. COUNTDOWN & VOICE
  useEffect(() => {
    if (isCountingDown && !finished && !isResting && isLoaded) {
      if (countdown > 0) {
        // Chỉ stop giọng đọc ở giây 2 và 1, để giây 3 đọc hết tên bài tập
        if (countdown < 3) {
            Tts.stop();
        }
        Tts.speak(String(countdown));
        const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        Tts.stop();
        Tts.speak("Bắt đầu");
        setIsCountingDown(false);
        setIsPlaying(true);
      }
    }
  }, [countdown, isCountingDown, finished, isResting, isLoaded]);
  
  // 5. TIMER RUNNING
  useEffect(() => {
    if (isPlaying && isTimeExercise && !isResting && !isCountingDown && timeLeft > 0) {
      exerciseTimerRef.current = setTimeout(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          Animated.timing(progressAnim, {
            toValue: next / getSecondsFromTime(currentExercise.time || '00:20'),
            duration: 1000,
            useNativeDriver: false,
          }).start();
          return next;
        });
      }, 1000);
    } else if (isPlaying && isTimeExercise && timeLeft === 0 && !isResting && !isCountingDown) {
      handleNext();
    }
    return () => {
      if (exerciseTimerRef.current) clearTimeout(exerciseTimerRef.current);
    };
  }, [isPlaying, timeLeft, isResting, isCountingDown, currentExercise]);

  // 6. REST TIMER
  useEffect(() => {
    let restTimer: any;
    if (isResting && restTime > 0) {
      restTimer = setTimeout(() => {
        setRestTime(prev => prev - 1);
      }, 1000);
    } else if (isResting && restTime <= 0) {
      finishRestAndStartNext();
    }
    return () => clearTimeout(restTimer);
  }, [isResting, restTime]);


  // play/pause, chuyển bài tập
  const handlePlayPause = () => setIsPlaying(prev => !prev);

  const handleNext = async () => {
    if (currentIndex < subExercises.length - 1) {
      setRestTime(customRestTime);
      setIsResting(true);
      setIsPlaying(false);
    } else {
      // ✅ HOÀN THÀNH
      const results = calculateResults(); 
      if (exerciseId) {
          await saveWorkoutLog(exerciseId); 
          await deleteWorkoutProgress(exerciseId); 
          const userId = await getCurrentUserId();
          if (userId) {
              await addWorkoutSession(
                  Number(userId),
                  parentTitle,
                  results.duration, 
                  results.calories, 
                  subExercises,
                  workoutCoverImage, 
                  Number(exerciseId)
              );
          }
      }
      setFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setIsResting(false);
    }
  };

  const finishRestAndStartNext = () => {
    setIsResting(false);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSkipRest = () => finishRestAndStartNext();
  const handleAddRestTime = () => setRestTime(prev => prev + 20);
  const handleConfirmCustomRest = () => {
    setCustomRestTime(selectedRest);
    setRestTime(selectedRest);
    setShowRestModal(false);
  };

  if (!isLoaded && !showContinueModal) return <View style={[styles.safeArea, {justifyContent: 'center', alignItems: 'center'}]}><Text>Đang tải...</Text></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      {!currentExercise?.name ? (
        <Text style={{ color: '#000', fontSize: 18 }}>Không có dữ liệu bài tập.</Text>
      ) : isResting ? (
        // REST VIEW
        <View style={styles.restWrapper}>
          <View style={styles.restTop}>
            {nextExercise?.video || nextExercise?.video_path ? (
              <Video source={{ uri: nextExercise.video || nextExercise.video_path }} style={styles.restImage} resizeMode="contain" repeat muted />
            ) : (
              <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png" }} style={styles.restImage} resizeMode="contain" />
            )}
          </View>
          <View style={styles.restBottom}>
            <Text style={styles.nextText}>TIẾP THEO {currentIndex + 2}/{subExercises.length}</Text>
            <Text style={styles.nextName}>{nextExercise?.name || "Bài tập tiếp theo"}</Text>
            <Text style={styles.nextReps}>{nextExercise?.type === "time" ? formatTime(nextExercise.time) : `x ${nextExercise?.reps}`}</Text>
            <Text style={styles.restTitle}>NGHỈ NGƠI</Text>
            <Text style={styles.restTimer}>{formatTime(restTime)}</Text>
            <TouchableOpacity style={styles.editRestBtn} onPress={() => { setSelectedRest(customRestTime); setShowRestModal(true); }}>
              <Text style={styles.editRestText}>Chỉnh sửa thời gian nghỉ</Text>
            </TouchableOpacity>
            <View style={styles.restButtonsRow}>
              <TouchableOpacity style={styles.add20Btn} onPress={handleAddRestTime}><Text style={styles.add20Text}>+20s</Text></TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkipRest}><Text style={styles.skipText}>Bỏ qua</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      ) : isCountingDown ? (
        // COUNTDOWN VIEW
        <View style={styles.readyContainer}>
          {currentExercise.video || currentExercise.video_path ? (
            <Video source={{ uri: currentExercise.video || currentExercise.video_path }} style={styles.exerciseVideo} resizeMode="cover" repeat muted />
          ) : (
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png' }} style={styles.exerciseImage} resizeMode="contain" />
          )}
          <Text style={styles.readyTitle}>ĐÃ SẴN SÀNG TẬP!</Text>
          <Text style={styles.exerciseName}>{currentExercise.name}</Text>
            <Text style={{ fontSize: 18, color: "#555", marginTop: 4 }}>{currentExercise.type === "time" ? formatTime(currentExercise.time) : `${currentExercise.reps} lần`}</Text>
          
          {/* [MỚI] Vòng tròn đếm ngược SVG */}
          <View style={styles.circleWrapper}>
              <Svg width={140} height={140} viewBox="0 0 140 140">
                  {/* Vòng tròn nền (màu xám mờ) */}
                  <Circle
                      cx="70" cy="70"
                      r={RADIUS}
                      stroke="#E5E5EA"
                      strokeWidth={STROKE_WIDTH}
                      fill="transparent"
                  />
                  {/* Vòng tròn xanh chạy (Animation) */}
                  <AnimatedCircle
                      cx="70" cy="70"
                      r={RADIUS}
                      stroke="#007AFF"
                      strokeWidth={STROKE_WIDTH}
                      fill="transparent"
                      strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE}
                      // strokeDashoffset chạy từ 0 (đầy) đến CIRCUMFERENCE (biến mất)
                      strokeDashoffset={circleProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, CIRCUMFERENCE] 
                      })}
                      rotation="-90" // Xoay để bắt đầu từ đỉnh 12h
                      origin="70, 70"
                  />
              </Svg>
              {/* Số đếm ngược nằm đè lên trên */}
              <View style={styles.countdownOverlay}>
                  <Text style={styles.countdownText}>{countdown}</Text>
              </View>
          </View>

        </View>
      ) : finished ? (
        // === FINISH SCREEN (KÈM HOA GIẤY) ===
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.finishWrapper} contentContainerStyle={{paddingBottom: 40}}>
            <View style={styles.finishHeaderContainer}>
                {workoutCoverImage ? (
                    <Image source={{ uri: workoutCoverImage }} style={styles.finishHeaderImage} />
                ) : (
                    <View style={styles.defaultFinishBanner}>
                        <Image source={require("../../assets/edit.png")} style={styles.defaultFinishIcon} resizeMode="contain" />
                    </View>
                )}
                
                <View style={styles.finishHeaderText}>
                <Text style={styles.finishBigTitle}>Tuyệt, bạn đã hoàn thành!</Text>
                <Text style={styles.finishSubTitle}>{parentTitle}</Text>
                </View>
            </View>
            <View style={styles.statBox}>
                <View style={styles.statItem}><Text style={styles.statLabel}>Bài tập</Text><Text style={styles.statValue}>{subExercises.length}</Text></View>
                <View style={styles.statSeparator} />
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Calo</Text>
                    <Text style={styles.statValue}>{caloriesBurned}</Text>
                </View>
                <View style={styles.statSeparator} />
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Thời gian</Text>
                    <Text style={styles.statValue}>{formatTime(totalDuration)}</Text>
                </View>
            </View>
            <View style={styles.rateBox}>
                <Text style={styles.rateTitle}>Bạn cảm thấy thế nào</Text>
                <Text style={styles.rateSubtitle}>Phản hồi giúp cải thiện bài tập</Text>
                <View style={styles.rateRow}>
                {feelingOptions.map((item) => (
                    <TouchableOpacity 
                    key={item.id} 
                    style={[styles.rateItem, item.id === 1 && styles.rateItemCenter]} 
                    onPress={() => setSelectedFeeling(item.id)}
                    >
                    <Image 
                        source={item.icon} 
                        style={[
                            styles.rateGif, 
                            { 
                            opacity: (selectedFeeling === null || selectedFeeling === item.id) ? 1 : 0.4,
                            transform: [{ scale: selectedFeeling === item.id ? 1.2 : 1 }] 
                            }
                        ]} 
                        resizeMode="contain"
                    />
                    <Text style={[
                        styles.rateText, 
                        { color: selectedFeeling === item.id ? "#000" : "#999" }
                        ]}>
                        {item.label}
                    </Text>
                    </TouchableOpacity>
                ))}
                </View>
            </View>

            {/* BẢNG BMI */}
            {userBMI && (
                <View style={styles.bmiBox}>
                    <View style={styles.bmiHeader}>
                        <Text style={[styles.bmiValue, { color: getBMIStatus(userBMI).color }]}>{userBMI}</Text>
                        <View style={{alignItems: 'flex-start'}}>
                            <Text style={[styles.bmiLabel, { color: '#888' }]}>Chỉ số BMI của bạn</Text>
                            <Text style={{ color: getBMIStatus(userBMI).color, fontWeight: 'bold', fontSize: 16 }}>
                                {getBMIStatus(userBMI).label}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={{ marginTop: 15, marginBottom: 10 }}>
                        <View style={styles.bmiBarContainer}>
                            <View style={styles.bmiBarRow}>
                                <View style={[styles.bmiBarItem, { backgroundColor: "#00BFFF", flex: 2.5 }]} />
                                <View style={[styles.bmiBarItem, { backgroundColor: "#3CD070", flex: 6.5 }]} />
                                <View style={[styles.bmiBarItem, { backgroundColor: "#FFC107", flex: 5.0 }]} />
                                <View style={[styles.bmiBarItem, { backgroundColor: "#FF9800", flex: 5.0 }]} />
                                <View style={[styles.bmiBarItem, { backgroundColor: "#FF3B30", flex: 5.0 }]} />
                            </View>
                            <View style={[styles.bmiPointer, { left: `${getBMIPointerPosition(userBMI)}%`, transform: [{ translateX: -6 }] }]}>
                                <View style={[styles.pointerArrowDown, { borderTopColor: '#333' }]} />
                            </View>
                            <View style={styles.bmiLabelsRow}>
                                <Text style={[styles.bmiScaleText, { left: '10.4%', color: '#888' }]}>18.5</Text>
                                <Text style={[styles.bmiScaleText, { left: '37.5%', color: '#888' }]}>25</Text>
                                <Text style={[styles.bmiScaleText, { left: '58.3%', color: '#888' }]}>30</Text>
                                <Text style={[styles.bmiScaleText, { left: '79.1%', color: '#888' }]}>35</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            <TouchableOpacity style={styles.nextButton} onPress={() => navigation.goBack()}>
                <Text style={styles.nextButtonText}>Hoàn thành</Text>
            </TouchableOpacity>
            </ScrollView>

            {/* [MỚI] LỚP HOA GIẤY PHỦ LÊN TRÊN */}
            <View style={styles.confettiContainer} pointerEvents="none">
                 <LottieView
                    ref={confettiRef}
                    source={require('../../assets/confetti.json')}
                    autoPlay={true}
                    loop={false}
                    style={styles.lottie}
                    resizeMode="cover"
                />
            </View>
        </View>
      ) : (
        // PLAYING VIEW
        <>
          <View style={styles.videoContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Image source={require('../../assets/back.png')} style={styles.backIcon} resizeMode="contain" />
            </TouchableOpacity>
            {currentExercise.video || currentExercise.video_path ? (
              <Video source={{ uri: currentExercise.video || currentExercise.video_path }} style={styles.fullVideo} resizeMode="cover" repeat muted />
            ) : (
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png' }} style={styles.fullVideo} resizeMode="cover" />
            )}

            {/* [MỚI] THANH TIẾN ĐỘ (PROGRESS BAR) */}
            <View style={styles.progressBarContainer}>
                {/* Thanh nền mờ */}
                <View style={styles.progressBarBackground} />
                {/* Thanh màu xanh chạy theo tiến độ */}
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>

          </View>
          <View style={styles.bottomSection}>
            <Text style={styles.exerciseName}>{currentExercise.name}</Text>
            
            {isTimeExercise ? (
                <>
                    <Text style={{ fontSize: 16, color: "#888", marginTop: -10 }}>
                        Thời gian: {formatTime(currentExercise.time)}
                    </Text>
                    <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                    <LinearGradient colors={['#007AFF', '#0066FF']} style={styles.playButton}>
                        <TouchableOpacity style={styles.playTouch} onPress={handlePlayPause}>
                            <View style={styles.playContent}>
                                <Image source={isPlaying ? require("../../assets/pause.png") : require("../../assets/play.png")} style={styles.playIcon} resizeMode="contain" />
                                <Text style={styles.playText}>{isPlaying ? "TẠM DỪNG" : "TIẾP TỤC"}</Text>
                            </View>
                        </TouchableOpacity>
                    </LinearGradient>
                </>
            ) : (
                <>
                    <Text style={{ fontSize: 36, fontWeight: '900', color: "#000", marginTop: 10 }}>
                          x {currentExercise.reps}
                    </Text>
                    <Text style={{ fontSize: 16, color: "#888", marginBottom: 30 }}>Lần tập</Text>
                    <TouchableOpacity style={[styles.doneButton, { backgroundColor: '#007AFF' }]} onPress={handleNext}>
                        <Image source={require("../../assets/success.png")} style={{width: 24, height: 24, tintColor: '#fff', marginRight: 10}} />
                        <Text style={styles.doneButtonText}>HOÀN THÀNH</Text>
                    </TouchableOpacity>
                </>
            )}
            <View style={{ flex: 1 }} />
            <View style={styles.bottomNav}>
              <TouchableOpacity onPress={handlePrev} style={styles.navButtonLeft}>
                <Image source={require("../../assets/forward.png")} style={styles.navIcon} />
                <Text style={styles.navText}>Trước đó</Text>
              </TouchableOpacity>
              <View style={styles.middleLine} />
              <TouchableOpacity onPress={handleNext} style={styles.navButtonRight}>
                <Text style={styles.navText}>Bỏ qua</Text>
                <Image source={require("../../assets/next.png")} style={styles.navIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Modal Rest */}
      <Modal visible={showRestModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRestModal(false)} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hẹn giờ nghỉ ngơi</Text>
            <Text style={styles.modalSubtitle}>Đặt thời gian nghỉ giữa các bài tập</Text>
          </View>
          <View style={styles.listContainer}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {restOptions.map((val) => (
                <TouchableOpacity key={val} onPress={() => setSelectedRest(val)} style={[styles.pickerItem, selectedRest === val && styles.pickerItemActive]}>
                  <Text style={[styles.pickerText, selectedRest === val && styles.pickerTextActive]}>{val}s</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity style={styles.modalDoneBtn} onPress={handleConfirmCustomRest}>
            <Text style={styles.modalDoneText}>Xong</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal Continue */}
      <Modal visible={showContinueModal} transparent animationType="fade">
          <View style={styles.continueModalOverlay}>
              <View style={styles.continueModalContent}>
                  <Text style={styles.continueTitle}>Tiếp tục tập luyện?</Text>
                  <Text style={styles.continueMessage}>
                      Bạn đang tập dở ở bài số {savedIndexToResume + 1}. Bạn có muốn tiếp tục không?
                  </Text>
                  <View style={styles.continueButtonsRow}>
                      <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
                          <Text style={styles.restartText}>Tập lại từ đầu</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.resumeBtn} onPress={handleResume}>
                          <Text style={styles.resumeText}>Tiếp tục</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  videoContainer: { width: "100%", height: "40%", backgroundColor: "#000", justifyContent: "center", alignItems: "center", position: "relative" },
  fullVideo: { width: "100%", height: "100%", borderRadius: 0 },
  playContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  playIcon: { width: 26, height: 26, tintColor: "#fff" },
  bottomNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 30, paddingBottom: 40 },
  navButtonLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  navButtonRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  middleLine: { width: 1, height: 28, backgroundColor: "#ccc" },
  navIcon: { width: 20, height: 20, tintColor: "#aaa" },
  navText: { fontSize: 16, color: '#999', fontWeight: '500' },
  bottomSection: { flex: 1, alignItems: "center", width: "100%", backgroundColor: "#fff", paddingTop: 30 }, 
  timerText: { fontSize: 44, fontWeight: '900', color: '#000', marginVertical: 25 },
  playButton: { width: '85%', height: 60, borderRadius: 30, overflow: 'hidden', marginTop: 10 },
  playTouch: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  exerciseName: { fontSize: 24, fontWeight: '800', color: '#000', marginTop: 5, marginBottom: 10, textAlign: 'center', paddingHorizontal: 20 }, 
  doneButton: { width: '80%', height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  doneButtonText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  backBtn: { position: 'absolute', left: 20, top: 20, zIndex: 10, backgroundColor: 'rgba(240,240,240,0.8)', borderRadius: 25, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  backIcon: { width: 20, height: 20, tintColor: '#007AFF' },
  readyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  readyTitle: { fontSize: 26, fontWeight: '900', color: '#007AFF', marginTop: 10 },
  exerciseImage: { width: 260, height: 260 },
  
  // [MỚI] Style cho vòng tròn đếm ngược
  circleWrapper: {
      width: 140,
      height: 140,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
      position: 'relative', // Để đặt số đè lên
  },
  countdownOverlay: {
      position: 'absolute', // Đặt số nằm giữa vòng tròn
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
  },
  
  countdownText: { 
      fontSize: 60, 
      fontWeight: '900', 
      color: '#000' 
  },

  exerciseVideo: { width: 260, height: 260, borderRadius: 20, backgroundColor: "#000" },
  restWrapper: { flex: 1, width: "100%", backgroundColor: "#fff" },
  restTop: { height: "40%", backgroundColor: "#fff", justifyContent: "center", alignItems: "center", borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  restImage: { width: "70%", height: "70%" },
  restBottom: { flex: 1, backgroundColor: "#0A7BFF", alignItems: "center", paddingTop: 40, paddingHorizontal: 20 },
  nextText: { color: "#fff", fontSize: 16, opacity: 0.9 },
  nextName: { color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 4 },
  nextReps: { color: "#fff", fontSize: 20, fontWeight: "600", marginTop: 6, opacity: 0.9 },
  restTitle: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 25 },
  restTimer: { color: "#fff", fontSize: 60, fontWeight: "900", marginTop: 10 },
  editRestBtn: { marginTop: 15, backgroundColor: "rgba(255,255,255,0.25)", paddingVertical: 10, paddingHorizontal: 25, borderRadius: 25 },
  editRestText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  restButtonsRow: { flexDirection: "row", width: "100%", justifyContent: "space-around", marginTop: 40 },
  add20Btn: { backgroundColor: "rgba(255,255,255,0.3)", paddingVertical: 14, paddingHorizontal: 35, borderRadius: 30 },
  add20Text: { color: "#fff", fontSize: 18, fontWeight: "700" },
  skipBtn: { backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 35, borderRadius: 30 },
  skipText: { color: "#0A7BFF", fontSize: 18, fontWeight: "700" },
  finishWrapper: { flex: 1, backgroundColor: "#F3F4F6" },
  finishHeaderContainer: { width: "100%", height: 240, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, overflow: "hidden", position: "relative" },
  finishHeaderImage: { width: "100%", height: "100%", resizeMode: "cover" },
  // ✅ STYLES CHO BANNER MẶC ĐỊNH
  defaultFinishBanner: { width: "100%", height: "100%", backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center" },
  defaultFinishIcon: { width: 80, height: 80, tintColor: "#fff" },

  finishHeaderText: { position: "absolute", bottom: 20, left: 20, right: 20 },
  finishBigTitle: { fontSize: 28, fontWeight: "900", color: "#fff", lineHeight: 32 },
  finishSubTitle: { fontSize: 17, color: "#fff", marginTop: 6, opacity: 0.9 },
  statBox: { backgroundColor: "#fff", marginTop: -20, marginHorizontal: 20, paddingVertical: 18, borderRadius: 16, flexDirection: "row", justifyContent: "space-between", elevation: 4 },
  statItem: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 16, color: "#666" },
  statValue: { fontSize: 26, fontWeight: "900", color: "#007AFF", marginTop: 4 },
  statSeparator: { width: 1, backgroundColor: "#ddd" },
  rateBox: { backgroundColor: "#fff", padding: 20, marginHorizontal: 20, marginTop: 20, borderRadius: 16, elevation: 3 },
  rateTitle: { fontSize: 18, fontWeight: "800", color: "#000" },
  rateSubtitle: { fontSize: 14, color: "#888", marginTop: 4 },
  rateRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 25 },
  rateItem: { alignItems: "center", flex: 1 },
  rateItemCenter: { alignItems: "center", flex: 1, transform: [{ translateY: -5 }] },
  
  rateGif: { width: 60, height: 60, marginBottom: 8 }, 
  rateText: { marginTop: 0, fontSize: 14, fontWeight: "600" },
  
  nextButton: { backgroundColor: "#007AFF", marginHorizontal: 20, marginTop: 30, paddingVertical: 18, borderRadius: 30, alignItems: "center" },
  nextButtonText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { position: 'absolute', bottom: 0, width: '100%', height: '55%', backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 25, paddingBottom: 30 },
  modalHeader: { alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#000' },
  modalSubtitle: { fontSize: 15, color: '#888', marginTop: 6 },
  listContainer: { flex: 1, width: '100%', marginVertical: 10 },
  scrollContent: { paddingVertical: 30, alignItems: 'center' },
  pickerItem: { paddingVertical: 12, width: '100%', alignItems: 'center', marginBottom: 5 },
  pickerItemActive: {},
  pickerText: { fontSize: 22, color: '#ccc', fontWeight: '500' },
  pickerTextActive: { fontSize: 34, fontWeight: '900', color: '#007AFF' },
  modalDoneBtn: { width: '100%', backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  modalDoneText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  backBtnError: { padding: 10, borderRadius: 8, marginTop: 20 },

  continueModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30
  },
  continueModalContent: {
      width: '100%',
      backgroundColor: '#fff',
      borderRadius: 20, 
      padding: 25,
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10
  },
  continueTitle: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 10,
      color: '#000'
  },
  continueMessage: {
      fontSize: 16,
      color: '#555',
      textAlign: 'center',
      marginBottom: 25,
      lineHeight: 22
  },
  continueButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      gap: 10
  },
  restartBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: '#999',
      alignItems: 'center'
  },
  restartText: {
      color: '#666',
      fontSize: 16,
      fontWeight: '600'
  },
  resumeBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 25,
      backgroundColor: '#007AFF',
      alignItems: 'center'
  },
  resumeText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700'
  },

  // --- STYLE BMI BOX (MỚI) ---
  bmiBox: { backgroundColor: "#fff", padding: 20, marginHorizontal: 20, marginTop: 20, borderRadius: 16, elevation: 3 },
  bmiHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  bmiValue: { fontSize: 32, fontWeight: "900" },
  bmiLabel: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  
  bmiBarContainer: { position: 'relative', height: 40 }, 
  bmiBarRow: { flexDirection: "row", height: 12, borderRadius: 6, overflow: 'hidden', width: '100%' },
  bmiBarItem: { flex: 1 },
  bmiPointer: { position: "absolute", top: -8, zIndex: 2 },
  pointerArrowDown: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent" },
  
  bmiLabelsRow: { position: 'absolute', top: 16, width: '100%', height: 20 }, 
  bmiScaleText: { position: 'absolute', fontSize: 10, width: 30, textAlign: 'center', marginLeft: -15 }, 

  // --- [MỚI] STYLE CHO HOA GIẤY ---
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999, // Tăng lên cao
    elevation: 99, // <--- BẮT BUỘC CHO ANDROID (để đè lên các View khác)
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent' // Đảm bảo nền trong suốt
  },
  lottie: {
    width: '100%',
    height: '100%',
  },

  // [MỚI] Styles cho Progress Bar
  progressBarContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 4, // Độ dày của thanh line
      backgroundColor: 'transparent',
      zIndex: 10,
  },
  progressBarBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.3)', // Màu nền mờ
  },
  progressBarFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      backgroundColor: '#007AFF', // Màu xanh chủ đạo
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
  },
});