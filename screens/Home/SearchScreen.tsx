import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
// ✅ Import DB để dùng getSubExercisesLocal
import DB, { getAllCategories } from "../../src/db/sqlite";

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);
  
  const [categories, setCategories] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]); 
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const cats = await getAllCategories();
      setCategories(cats.map((c: any) => c.name));

      const allExercises = await DB.getExercisesLocal();
      const uniqueLevels = [...new Set(allExercises.map((e: any) => e.difficulty).filter((d: any) => d))];

      const sortOrder = ["Dễ", "Trung bình", "Khó", "Tùy chỉnh"];
      uniqueLevels.sort((a: any, b: any) => {
        let indexA = sortOrder.indexOf(a);
        let indexB = sortOrder.indexOf(b);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
      });

      setLevels(uniqueLevels as string[]);
    };
    loadData();
  }, []);

  // ⚡ ✅ HÀM LỌC VÀ TÍNH TOÁN LẠI THỜI GIAN/SỐ LƯỢNG
  const executeFilter = async (searchStr: string, cat: string | null, lvl: string | null) => {
    let rawData = await DB.getExercisesLocal();

    // 1. Lọc thô trước (Filter)
    if (searchStr.trim()) {
      rawData = rawData.filter((ex: any) =>
        ex.title.toLowerCase().includes(searchStr.toLowerCase())
      );
    }
    if (cat) {
      rawData = rawData.filter((ex: any) => ex.category === cat);
    }
    if (lvl) {
      rawData = rawData.filter((ex: any) => ex.difficulty === lvl);
    }

    // 2. ✅ Tính toán chi tiết (Map & Calculate) cho các kết quả đã lọc
    // Bước này giúp hiển thị đúng số phút và số bài tập
    const enrichedResults = await Promise.all(rawData.map(async (ex: any) => {
        // Lấy bài tập con để tính tổng thời gian thực tế
        const subs = await DB.getSubExercisesLocal(ex.id);

        const totalSec = subs.reduce((sum: number, s: any) => {
            if (s.type === "time") return sum + (parseInt(s.time) || 0);
            else return sum + ((parseInt(s.reps) || 0) * 5); // Ước tính 5s mỗi rep
        }, 0);

        return {
            ...ex,
            // Nếu có bài tập con thì lấy tổng giây tính được, không thì lấy mặc định
            time: subs.length > 0 ? totalSec : parseInt(String(ex.time || 0), 10),
            // Đếm số lượng bài tập con
            exerciseCount: subs.length > 0 ? subs.length : (ex.exerciseCount || 0),
        };
    }));

    setResults(enrichedResults);
  };

  const handleSearch = (text: string) => {
    setKeyword(text);
    setSelectedCategory(null);
    setSelectedLevel(null);
    
    if (!text.trim()) {
      setResults([]);
      return;
    }
    executeFilter(text, null, null);
  };

  const handleSelectCategory = (cat: string) => {
    const newCat = selectedCategory === cat ? null : cat;
    setSelectedCategory(newCat);
    setKeyword(""); 
    executeFilter("", newCat, selectedLevel);
  };

  const handleSelectLevel = (lvl: string) => {
    const newLvl = selectedLevel === lvl ? null : lvl;
    setSelectedLevel(newLvl);
    setKeyword(""); 
    executeFilter("", selectedCategory, newLvl); 
  };

  // Helper hiển thị thời gian
  const formatDisplayTime = (time: string | number) => {
    const totalSeconds = parseInt(String(time || 0), 10);
    if (isNaN(totalSeconds) || totalSeconds === 0) return "0 giây";
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) return `${seconds} giây`;
    // Nếu có cả phút cả giây (ví dụ 1 phút 30 giây)
    if (seconds > 0) return `${minutes} phút ${seconds} giây`;
    
    return `${minutes} phút`;
  };

  const renderChip = (label: string, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected 
            ? (isDark ? "#fff" : "#000") 
            : (isDark ? "#1E1E1E" : "#F1F1F1"),
          borderColor: isSelected ? "transparent" : (isDark ? "#333" : "#E5E5E5"),
          borderWidth: 1,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { 
            color: isSelected 
              ? (isDark ? "#000" : "#fff") 
              : (isDark ? "#ccc" : "#555") 
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#0D0D0D" : "#FFFFFF" },
      ]}
    >
      {/* 🔍 Thanh tìm kiếm */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? "#1E1E1E" : "#F1F1F1",
              borderColor: isDark ? "#333" : "#E5E5E5",
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <Image
            source={require("../../assets/search.png")}
            style={[
              styles.searchIcon,
              { tintColor: isDark ? "#aaa" : "#555" },
            ]}
          />

          <TextInput
            autoFocus={false}
            placeholder="Tìm kiếm bài tập..."
            value={keyword}
            onChangeText={handleSearch}
            style={[
              styles.searchInput,
              { color: isDark ? "#fff" : "#000" },
            ]}
            placeholderTextColor={isDark ? "#888" : "#777"}
          />
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text
            style={[
              styles.cancelText,
              { color: isDark ? "#4DA3FF" : "#007AFF" },
            ]}
          >
            Hủy bỏ
          </Text>
        </TouchableOpacity>
      </View>

      {/* 📂 Vùng Filters (Danh mục & Cấp độ) */}
      <View>
        <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
          Danh mục
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          {categories.map((cat) => 
            renderChip(cat, selectedCategory === cat, () => handleSelectCategory(cat))
          )}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000", marginTop: 15 }]}>
          Cấp độ
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          {levels.length > 0 ? (
            levels.map((lvl) => 
              renderChip(lvl, selectedLevel === lvl, () => handleSelectLevel(lvl))
            )
          ) : (
            <Text style={{ color: isDark ? "#666" : "#999", fontSize: 13 }}>Chưa có dữ liệu cấp độ</Text>
          )}
        </ScrollView>
      </View>

      {/* 🔎 Kết quả */}
      <ScrollView style={{ marginTop: 20 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {results.length === 0 && (keyword || selectedCategory || selectedLevel) ? (
          <View style={{ alignItems: 'center', marginTop: 30, paddingHorizontal: 20 }}>
             <Image
               source={require("../../assets/research.png")} 
               style={{
                 width: 180,
                 height: 180,
                 resizeMode: 'contain',
                 marginBottom: 15 
               }}
             />
             
             <Text style={{ 
                 textAlign: 'center', 
                 color: isDark ? '#FFF' : '#333', 
                 fontSize: 20, 
                 fontWeight: 'bold',
                 marginBottom: 10 
             }}>
               Xin lỗi, không tìm thấy kết quả phù hợp nào
             </Text>

             <Text style={{ 
                 textAlign: 'center', 
                 color: isDark ? '#888' : '#666', 
                 fontSize: 14,
                 lineHeight: 20 
             }}>
               Vui lòng thử các từ khóa khác để tìm thấy bài tập mà bạn ưa thích
             </Text>
          </View>
        ) : null}

        {results.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            style={[
              styles.item,
              {
                backgroundColor: isDark ? "#1A1A1A" : "#F7F7F7",
                borderColor: isDark ? "#333" : "#EEE",
                borderWidth: 1,
              },
            ]}
            onPress={() =>
              navigation.navigate("ExerciseDetailScreen", { exercise: ex })
            }
          >
            <Image
              source={{
                uri:
                  ex.image ||
                  "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
              }}
              style={styles.itemImg}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.itemTitle,
                  { color: isDark ? "#fff" : "#000" },
                ]}
              >
                {ex.title}
              </Text>

              <Text
                style={[
                  styles.itemSub,
                  { color: isDark ? "#aaa" : "#777" },
                ]}
              >
                {/* ✅ Giờ đây ex.time và ex.exerciseCount đã được tính toán lại chính xác */}
                {formatDisplayTime(ex.time)} • {ex.exerciseCount || 0} bài tập
                {ex.difficulty ? ` • ${ex.difficulty}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10,
  },

  searchBox: {
    flexDirection: "row",
    flex: 1,
    backgroundColor: "#1E1E1E",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 22,
    alignItems: "center",
    marginRight: 10,
    height: 42,
  },

  searchIcon: { width: 18, height: 18, marginRight: 6 },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
    lineHeight: 20,
    paddingVertical: 0,
  },

  cancelText: {
    fontSize: 16,
    fontWeight: "500",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 5,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    height: 36,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },

  item: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
  },

  itemImg: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#ccc'
  },

  itemTitle: { fontSize: 16, fontWeight: "700" },

  itemSub: { fontSize: 12, marginTop: 3 },
});