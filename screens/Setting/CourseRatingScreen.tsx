import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  Alert
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DB from "../../src/db/sqlite"; 
import { useTheme } from "../../src/context/ThemeContext";

export default function CourseRatingScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    success: "#34C759",
    pending: "#FF9500",
    primary: "#007AFF",
    disabled: "#A0A0A0"
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await DB.initDB();
      const userId = await AsyncStorage.getItem("currentUserId");
      if (userId) {
        const data = await DB.getRegisteredCoursesForRating(Number(userId));
        setCourses(data);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách đánh giá:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // ✅ CẬP NHẬT HÀM NÀY: Chặn điều hướng nếu đã đánh giá
  const handlePressCourse = (item: any) => {
      // 1. Nếu đã đánh giá rồi -> Không làm gì cả (Không cho xem lại)
      if (item.is_rated) {
          return; 
      }

      // 2. Nếu chưa học xong -> Báo lỗi
      if (!item.can_rate) {
          Alert.alert(
              "Chưa hoàn thành", 
              `Bạn mới hoàn thành ${item.attended_sessions}/${item.total_sessions} buổi học.\nVui lòng hoàn thành khóa học để đánh giá.`
          );
          return;
      }

      // 3. Nếu chưa đánh giá và đã học xong -> Chuyển trang đánh giá
      navigation.navigate("MyRegisteredCoursesScreen", { course: item });
  };

  // Hàm xử lý Đăng ký lại
  const handleReRegister = (item: any) => {
      const courseParams = {
          id: item.course_id,
          title: item.course_title,
          image: item.image,
          price: item.price || 0,
          sessions: item.total_sessions, 
          startDate: item.start_date,    
          endDate: item.end_date,        
          facility: item.facility,       
          ptName: item.pt_name,          
          description: item.description  
      };
      
      navigation.navigate("CourseDetailScreen", { course: courseParams });
  };

  const renderItem = ({ item }: { item: any }) => {
    const isFinished = item.can_rate; 
    const isRated = item.is_rated;    

    return (
        <TouchableOpacity
            activeOpacity={isRated ? 1 : 0.9} // Nếu đã đánh giá thì không có hiệu ứng mờ khi ấn
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handlePressCourse(item)}
        >
        <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: item.image ? 'transparent' : '#007AFF' }]}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.courseImage} resizeMode="cover" />
                ) : (
                    <Image source={require("../../assets/exercise.png")} style={{width: 24, height: 24, tintColor: '#fff'}} />
                )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <Text style={[styles.courseTitle, { color: colors.text, flex: 1 }]} numberOfLines={2}>
                        {item.course_title}
                    </Text>
                    
                    <View style={[
                        styles.badge, 
                        { backgroundColor: isRated ? colors.success + '20' : (isFinished ? colors.pending + '20' : colors.border) }
                    ]}>
                        <Text style={[
                            styles.badgeText, 
                            { color: isRated ? colors.success : (isFinished ? colors.pending : colors.subtext) }
                        ]}>
                            {isRated ? "Hoàn tất" : (isFinished ? "Chờ đánh giá" : "Đang học")}
                        </Text>
                    </View>
                </View>
                
                <Text style={{ fontSize: 13, color: colors.subtext, marginBottom: 4 }}>
                    PT: <Text style={{fontWeight: '600', color: colors.text}}>{item.pt_name || "Không có"}</Text>
                </Text>

                <Text style={[styles.dateText, { color: isFinished ? colors.success : colors.primary, fontWeight: '600' }]}>
                    Tiến độ: {item.attended_sessions}/{item.total_sessions} buổi
                </Text>
            </View>
        </View>

        {/* Footer Row */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
            {/* Phần bên trái: Trạng thái đánh giá */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {isRated ? (
                    // ✅ CẬP NHẬT UI: Chỉ hiện thông báo đã đánh giá (không còn nút bấm)
                    <View style={{flexDirection: 'row', alignItems: 'center', opacity: 0.8}}>
                        <Image source={require("../../assets/success.png")} style={{width: 14, height: 14, tintColor: colors.success, marginRight: 6}} />
                        <Text style={{color: colors.success, fontWeight: '600', fontSize: 13}}>Đã gửi đánh giá</Text>
                    </View>
                ) : isFinished ? (
                    <>
                        <Text style={{color: colors.pending, fontWeight: '700', fontSize: 13}}>Viết đánh giá ngay</Text>
                        <Image source={require("../../assets/right-arrow.png")} style={{width: 12, height: 12, tintColor: colors.pending, marginLeft: 4}} />
                    </>
                ) : (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Image source={require("../../assets/lock.png")} style={{width: 14, height: 14, tintColor: colors.subtext, marginRight: 6}} />
                        <Text style={{color: colors.subtext, fontWeight: '500', fontSize: 13}}>
                            Chưa hoàn thành
                        </Text>
                    </View>
                )}
            </View>

            {/* Phần bên phải: Nút Đăng ký lại (Chỉ hiện khi đã học xong) */}
            {isFinished && (
                <TouchableOpacity 
                    style={[styles.reRegisterBtn, { backgroundColor: isDark ? '#333' : '#EEF2FF' }]}
                    onPress={() => handleReRegister(item)}
                >
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Đăng ký lại</Text>
                </TouchableOpacity>
            )}
        </View>
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}
        >
            <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Đánh giá khóa học</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={{flex: 1}}> 
        {loading ? (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        ) : (
            <FlatList
            data={courses}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            ListEmptyComponent={
                <View style={styles.center}>
                    <Text style={{ textAlign: "center", marginTop: 50, color: colors.subtext }}>
                    Bạn chưa đăng ký khóa học nào.
                    </Text>
                </View>
            }
            />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 10, paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: { 
    width: 40, height: 40, justifyContent: "center", alignItems: "center",
    borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 
  },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  card: {
    borderRadius: 16, marginBottom: 12, borderWidth: 1, overflow: 'hidden',
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardHeader: { flexDirection: "row", padding: 16, alignItems: 'center' },
  iconBox: { width: 60, height: 60, borderRadius: 12, justifyContent: "center", alignItems: "center", overflow: 'hidden' },
  courseImage: { width: '100%', height: '100%' },
  courseTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2, marginRight: 8 },
  dateText: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginLeft: 8 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  cardFooter: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.02)'
  },
  reRegisterBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      marginLeft: 10,
      borderWidth: 1,
      borderColor: 'rgba(0,122,255,0.2)'
  }
});