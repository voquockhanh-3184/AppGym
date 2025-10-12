import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import auth from "@react-native-firebase/auth";

const HomeScreen = () => {
  const [userName, setUserName] = useState<string>("Người dùng");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [filteredExercises, setFilteredExercises] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Bụng");
  const [selectedDay, setSelectedDay] = useState(29);

  // Tab đang chọn
  const [activeTab, setActiveTab] = useState<string>("Tập luyện");

  const categories = ["Bụng", "Cánh tay", "Ngực"];
  const days = [28, 29, 30, 1, 2, 3, 4];

  const exercises = [
    { id: 1, category: "Bụng", title: "Bụng cơ bản", time: "20 phút", image: "https://cdn-icons-png.flaticon.com/512/3143/3143643.png" },
    { id: 2, category: "Bụng", title: "Bụng trung bình", time: "15 phút", image: "https://cdn-icons-png.flaticon.com/512/3143/3143612.png" },
    { id: 3, category: "Cánh tay", title: "Tay săn chắc", time: "25 phút", image: "https://cdn-icons-png.flaticon.com/512/2972/2972065.png" },
  ];

  const courses = [
    { id: 1, title: "Tăng cơ 30 ngày" },
    { id: 2, title: "Giảm mỡ toàn thân" },
  ];

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUserName(currentUser.displayName || currentUser.email || "Người dùng");
        setUserPhoto(currentUser.photoURL ?? null);
      } else {
        setUserName("Khách");
        setUserPhoto(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    const keyword = text.trim().toLowerCase();
    if (keyword === "") {
      setFilteredExercises([]);
      setFilteredCourses([]);
      return;
    }
    setFilteredExercises(exercises.filter((ex) => ex.title.toLowerCase().includes(keyword)));
    setFilteredCourses(courses.filter((co) => co.title.toLowerCase().includes(keyword)));
  };

  const bottomTabs = [
    { key: "Tập luyện", icon: require("../assets/dumbbell.png") },
    { key: "Lớp học", icon: require("../assets/school.png") },
    { key: "Báo cáo", icon: require("../assets/statistics.png") },
    { key: "Cài đặt", icon: require("../assets/setting.png") },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>GYM</Text>
        <View style={styles.userContainer}>
          <Image
            source={userPhoto ? { uri: userPhoto } : require("../assets/profile.png")}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{userName}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Image source={require("../assets/search.png")} style={styles.searchIcon} />
        <TextInput
          placeholder="Tìm kiếm bài tập hoặc khóa học..."
          style={styles.searchInput}
          placeholderTextColor="#777"
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>

      {/* Search Results */}
      {(filteredExercises.length > 0 || filteredCourses.length > 0) && (
        <ScrollView style={styles.resultContainer}>
          {filteredExercises.map((ex) => (
            <Text key={ex.id} style={styles.resultText}>🏋️ {ex.title}</Text>
          ))}
          {filteredCourses.map((co) => (
            <Text key={co.id} style={styles.resultText}>📘 {co.title}</Text>
          ))}
        </ScrollView>
      )}

      {/* Weekly Goals & Exercises */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Mục tiêu hàng tuần</Text>
        <View style={styles.weekContainer}>
          {days.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayCircle, selectedDay === day && styles.daySelected]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayText, selectedDay === day && styles.dayTextSelected]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.goalBox}>
          <View style={styles.goalContent}>
            <Image
              source={{ uri: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png" }}
              style={styles.goalImage}
            />
            <Text style={styles.goalText}>Hãy luyện tập chinh phục mục tiêu của bạn!</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Các bài tập</Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryButton, selectedCategory === cat && styles.categorySelected]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextSelected]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.exerciseList}>
          {exercises.filter((ex) => ex.category === selectedCategory).map((ex) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <Image source={{ uri: ex.image }} style={styles.exerciseImage} />
              <View>
                <Text style={styles.exerciseTitle}>{ex.title}</Text>
                <Text style={styles.exerciseTime}>{ex.time}</Text>
                <Text style={styles.exerciseIcons}>⚡⚡</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {bottomTabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <View style={[styles.iconCircle, isActive && styles.iconCircleActive]}>
                <Image source={tab.icon} style={[styles.navIcon, isActive && { tintColor: "#fff" }]} />
              </View>
              <Text style={isActive ? styles.navTextActive : styles.navText}>{tab.key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingHorizontal: 20, paddingTop: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { fontSize: 22, fontWeight: "bold", color: "#007AFF" },
  userContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { fontWeight: "500" },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "#007AFF" },

  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#EEE", borderRadius: 12, paddingHorizontal: 10, marginTop: 15 },
  searchInput: { flex: 1, padding: 8 },
  searchIcon: { width: 20, height: 20, marginRight: 8, tintColor: "#777" },

  resultContainer: { backgroundColor: "#fff", marginTop: 10, borderRadius: 10, padding: 10 },
  resultText: { fontSize: 14, paddingVertical: 4, color: "#333" },

  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 8 },
  weekContainer: { flexDirection: "row", gap: 10 },
  dayCircle: { width: 35, height: 35, borderRadius: 18, backgroundColor: "#F0F0F0", justifyContent: "center", alignItems: "center" },
  daySelected: { backgroundColor: "#007AFF" },
  dayText: { color: "#000" },
  dayTextSelected: { color: "#fff" },
  goalBox: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginTop: 15, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  goalContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  goalImage: { width: 40, height: 40 },
  goalText: { flex: 1, fontSize: 14, color: "#333" },

  categoryContainer: { flexDirection: "row", gap: 10, marginBottom: 10 },
  categoryButton: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, backgroundColor: "#EEE" },
  categorySelected: { backgroundColor: "#E0E7FF", borderColor: "#007AFF", borderWidth: 1 },
  categoryText: { color: "#000" },
  categoryTextSelected: { color: "#007AFF", fontWeight: "600" },
  exerciseList: { gap: 15 },
  exerciseCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 15, padding: 10, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  exerciseImage: { width: 60, height: 60, marginRight: 15 },
  exerciseTitle: { fontWeight: "600", fontSize: 15 },
  exerciseTime: { color: "#555", marginTop: 2 },
  exerciseIcons: { color: "#007AFF", marginTop: 2 },

  bottomNav: {
  position: "absolute",
  bottom: 10,
  left: 15,
  right: 15,
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  backgroundColor: "#dddddd",
  borderRadius: 50, 
  paddingVertical: 8, 
  borderWidth: 0.5,
  borderColor: "rgba(255, 255, 255, 0.6)",
},
navItem: {
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
},
navText: {
  color: "#777", 
  fontSize: 10, 
  marginTop: 2,
  fontWeight: "500",
},
navTextActive: {
  color: "#007AFF", 
  fontSize: 10,
  marginTop: 2,
  fontWeight: "700",
},
iconCircle: {
  width: 50,           
  height: 35,          
  borderRadius: 20,    
  backgroundColor: "#dddddd",
  justifyContent: "center",
  alignItems: "center",
},
iconCircleActive: {
  width: 50,
  height: 35,
  borderRadius: 20,
  backgroundColor: "#007AFF",
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#007AFF",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.5,
  shadowRadius: 4,
  elevation: 5,
},

navIcon: {
  width: 18, 
  height: 18,
},
navIconActive: {
  tintColor: "#007AFF", 
},

});

export default HomeScreen;
