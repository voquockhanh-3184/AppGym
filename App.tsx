import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import "react-native-gesture-handler";
import "react-native-reanimated";
import { StatusBar, Platform } from "react-native";
// ✅ Import Notifee để lắng nghe sự kiện khi app đang mở
import notifee, { EventType } from '@notifee/react-native';

// Database & Context
// ✅ IMPORT HÀM fixDuplicateClasses TỪ DB
import DB, { seedAdminOnce, fixDuplicateClasses } from "./src/db/sqlite";
import { ThemeProvider } from "./src/context/ThemeContext";
import { setupNotifications } from "./src/utils/NotificationService";

// Auth Screens
import LoginScreen from "./screens/Login/LoginScreen";
import RegisterScreen from "./screens/Login/RegisterScreen";
import AdminHome from "./screens/Login/AdminScreen";

// Home & General Screens
import HomeScreen from "./screens/Home/HomeScreen";
import SearchScreen from "./screens/Home/SearchScreen";
import ProfileScreen from "./screens/Home/ProfileScreen";
import WeeklyGoalScreen from "./screens/Home/WeeklyGoalScreen";
import CreateCustomWorkout from "./screens/Home/CreateCustomWorkout";
import EditCustomWorkoutScreen from "./screens/Home/EditCustomWorkoutScreen";
import PreWorkoutScreen from "./screens/Home/PreWorkoutScreen";

// Exercise Screens
import AddExerciseScreen from "./screens/Exercise/AddExerciseScreen";
import EditExerciseScreen from "./screens/Exercise/EditExerciseScreen";
import ExerciseDetailScreen from "./screens/Exercise/ExerciseDetailScreen";
import AddSubExercisesScreen from "./screens/Exercise/AddSubExercisesScreen";
import StartExerciseScreen from "./screens/Exercise/StartExerciseScreen";
import EditSubExercisesScreen from "./screens/Exercise/EditSubExercisesScreen";
import ExerciseListScreen from "./screens/Exercise/ExerciseListScreen";
import SelectSubExercisesScreen from "./screens/Exercise/SelectSubExercisesScreen";

// Class Screens
import ClassHomeScreen from "./screens/Class/ClassHomeScreen";
import ClassDetailScreen from "./screens/Class/ClassDetailScreen";

// Course Screens
import AddCourseScreen from "./screens/Course/AddCourseScreen";
import CourseDetailScreen from "./screens/Course/CourseDetailScreen";
import EditCourseScreen from "./screens/Course/EditCourseScreen";
import PaymentScreen from "./screens/Course/PaymentScreen";

// Report Screens
import ReportScreen from "./screens/Report/ReportScreen";
import StreakDetailScreen from "./screens/Report/StreakDetailScreen";
import AllRecordsScreen from "./screens/Report/AllRecordsScreen";

// Setting Screens
import SettingScreen from "./screens/Setting/SettingScreen";
import ExerciseSettingScreen from "./screens/Setting/ExerciseSettingScreen";
import BannerSettingScreen from "./screens/Setting/BannerSettingScreen";
import GymBranchSettingScreen from "./screens/Setting/GymBranchSettingScreen";
import TrainerSettingScreen from "./screens/Setting/TrainerSettingScreen";
import RevenueScreen from "./screens/Setting/RevenueScreen";
import AttendanceScreen from "./screens/Setting/AttendanceScreen";
import AttendanceClassListScreen from "./screens/Setting/AttendanceClassListScreen";
import UserClassSessionsScreen from "./screens/Setting/UserClassSessionsScreen";
import UserRegisteredCoursesScreen from "./screens/Setting/UserRegisteredCoursesScreen";
import UserManagementScreen from "./screens/Setting/UserManagementScreen";
import GeneralSettingsScreen from "./screens/Setting/GeneralSettingsScreen";
import AdminFeatureRequestsScreen from "./screens/Setting/AdminFeatureRequestsScreen";
import CourseRatingScreen from "./screens/Setting/CourseRatingScreen";
import MyRegisteredCoursesScreen from "./screens/Setting/MyRegisteredCoursesScreen";
import PaymentSuccessScreen from "./screens/Course/PaymentSuccessScreen";
import NotificationScreen from "./screens/Notification/NotificationScreen";
import CouponSettingScreen from "./screens/Setting/CouponSettingScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("📦 Khởi tạo ứng dụng...");
        
        // 1. Khởi tạo DB
        await DB.initDB();

        // 2. Seed Admin
        await seedAdminOnce();

        // ✅ 3. CHẠY HÀM SỬA LỖI TRÙNG LẶP LỚP HỌC 1 LẦN DUY NHẤT
        // Hàm này sẽ xóa các lớp trùng và tạo ràng buộc UNIQUE
        await fixDuplicateClasses();

        // 4. Cấu hình thông báo (Xin quyền)
        await setupNotifications();
        console.log("🔔 Đã cấu hình thông báo");

      } catch (err) {
        console.warn("❌ Lỗi khởi tạo App:", err);
      }
    };

    initializeApp();

    // ✅ 5. Lắng nghe sự kiện thông báo khi App đang mở (Foreground)
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      switch (type) {
        case EventType.DISMISSED:
          console.log('👉 Người dùng đã vuốt bỏ thông báo');
          break;
        case EventType.PRESS:
          console.log('👉 Người dùng đã bấm vào thông báo:', detail.notification);
          // Tại đây bạn có thể thêm logic điều hướng nếu cần (sử dụng Navigation Ref)
          break;
      }
    });

    // Cleanup listener khi unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        {/* Set StatusBar trong suốt để giao diện tràn viền đẹp hơn */}
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="LoginScreen"
            screenOptions={{
              headerShown: false,
              // ✨ Mặc định: Trượt từ phải sang (Chuẩn iOS/Android hiện đại)
              animation: "slide_from_right", 
              // Cho phép vuốt ngược để back (Swipe Back)
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              // Màu nền mặc định khi chuyển trang để không bị nháy trắng
              contentStyle: { backgroundColor: '#FFFFFF' }, 
            }}
          >
            {/* ================= AUTH GROUP (Hiệu ứng Fade nhẹ nhàng) ================= */}
            <Stack.Group screenOptions={{ animation: 'fade' }}>
                <Stack.Screen name="LoginScreen" component={LoginScreen} />
                <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
            </Stack.Group>
            
            {/* ================= MAIN TABS & HOME ================= */}
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="AdminHome" component={AdminHome} />
            
            {/* ================= MODAL GROUP (Trượt từ dưới lên) ================= */}
            {/* Dùng cho các tác vụ Thêm mới, Chỉnh sửa, Thanh toán để tạo cảm giác lớp phủ */}
            <Stack.Group screenOptions={{ animation: 'slide_from_bottom', presentation: 'modal' }}>
                <Stack.Screen name="AddExercise" component={AddExerciseScreen} />
                <Stack.Screen name="AddSubExercisesScreen" component={AddSubExercisesScreen} />
                <Stack.Screen name="AddCourseScreen" component={AddCourseScreen} />
                <Stack.Screen name="CreateCustomWorkout" component={CreateCustomWorkout} />
                
                {/* Các màn hình Edit */}
                <Stack.Screen name="EditExercisesScreen" component={EditExerciseScreen} />
                <Stack.Screen name="EditSubExercisesScreen" component={EditSubExercisesScreen} />
                <Stack.Screen name="EditCourseScreen" component={EditCourseScreen} />
                <Stack.Screen name="EditCustomWorkoutScreen" component={EditCustomWorkoutScreen} />
                
                {/* Thanh toán*/}
                <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
            </Stack.Group>

            {/* ================= STANDARD NAVIGATION GROUP (Mặc định) ================= */}
            
            {/* Exercise Group */}
            <Stack.Screen name="ExerciseDetailScreen" component={ExerciseDetailScreen} />
            <Stack.Screen name="StartExerciseScreen" component={StartExerciseScreen} />
            <Stack.Screen name="ExerciseListScreen" component={ExerciseListScreen} />
            <Stack.Screen name="SelectSubExercisesScreen" component={SelectSubExercisesScreen} />

            {/* Course Group */}
            <Stack.Screen name="CourseDetailScreen" component={CourseDetailScreen} />
            <Stack.Screen name="PaymentSuccessScreen" component={PaymentSuccessScreen} options={{ animation: 'fade' }} />

            {/* Class Group */}
            <Stack.Screen name="ClassHomeScreen" component={ClassHomeScreen} />
            <Stack.Screen name="ClassDetailScreen" component={ClassDetailScreen} />
            
            {/* Home Features */}
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="SearchScreen" component={SearchScreen} options={{ animation: 'fade' }} /> 
            <Stack.Screen name="WeeklyGoalScreen" component={WeeklyGoalScreen} />
            <Stack.Screen name="PreWorkoutScreen" component={PreWorkoutScreen} />
            
            {/* Notification */}
            <Stack.Screen name="NotificationScreen" component={NotificationScreen} />

            {/* Settings & Admin Group */}
            <Stack.Screen name="SettingScreen" component={SettingScreen} />
            <Stack.Screen name="ExerciseSettingScreen" component={ExerciseSettingScreen} />
            <Stack.Screen name="BannerSettingScreen" component={BannerSettingScreen} />
            <Stack.Screen name="GymBranchSettingScreen" component={GymBranchSettingScreen} />
            <Stack.Screen name="TrainerSettingScreen" component={TrainerSettingScreen} />
            <Stack.Screen name="RevenueScreen" component={RevenueScreen} />
            <Stack.Screen name="AttendanceScreen" component={AttendanceScreen} />
            <Stack.Screen name="AttendanceClassListScreen" component={AttendanceClassListScreen} />
            <Stack.Screen name="UserManagementScreen" component={UserManagementScreen} />
            <Stack.Screen name="GeneralSettingsScreen" component={GeneralSettingsScreen} />
            <Stack.Screen name="AdminFeatureRequestsScreen" component={AdminFeatureRequestsScreen} />

            {/* User Personal Data in Settings */}
            <Stack.Screen name="UserClassSessionsScreen" component={UserClassSessionsScreen} />
            <Stack.Screen name="UserRegisteredCoursesScreen" component={UserRegisteredCoursesScreen} />

            {/* Report Group */}
            <Stack.Screen name="ReportScreen" component={ReportScreen} />
            <Stack.Screen name="StreakDetailScreen" component={StreakDetailScreen} />
            <Stack.Screen name="AllRecordsScreen" component={AllRecordsScreen} />

            {/* Other */}
            <Stack.Screen name="CourseRatingScreen" component={CourseRatingScreen} />
            <Stack.Screen name="MyRegisteredCoursesScreen" component={MyRegisteredCoursesScreen} />
            
            <Stack.Screen name="CouponSettingScreen" component={CouponSettingScreen} />

          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}