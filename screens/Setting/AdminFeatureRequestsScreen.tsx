import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  SafeAreaView, 
  StatusBar,
  Platform,
  ActivityIndicator 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import DB from "../../src/db/sqlite";
import { useTheme } from "../../src/context/ThemeContext";

export default function AdminFeatureRequestsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    markAsRead(); // ✅ Gọi hàm đánh dấu đã đọc ngay khi vào màn hình
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await DB.initDB();
      const data = await DB.getAllFeatureRequests();
      setList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Hàm cập nhật trạng thái "đã đọc" xuống Database
  const markAsRead = async () => {
      try {
          await DB.initDB();
          // Hàm này cần được định nghĩa trong sqlite.ts (như hướng dẫn trước)
          if (DB.markAllFeatureRequestsAsRead) {
              await DB.markAllFeatureRequestsAsRead(); 
          }
      } catch (e) {
          console.error("Lỗi đánh dấu đã đọc:", e);
      }
  };

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    primary: "#007AFF",
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center'}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={[styles.avatarPlaceholder, {backgroundColor: isDark ? '#333' : '#f0f0f0'}]}>
                <Text style={{fontWeight: 'bold', color: colors.subtext}}>{item.username?.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
        </View>
        <Text style={[styles.date, { color: colors.subtext }]}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
      </View>
      <View style={[styles.divider, {backgroundColor: colors.border}]} />
      <Text style={[styles.content, { color: colors.text }]}>{item.content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[
                styles.backBtn, 
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }
            ]}
        >
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Danh sách đề xuất</Text>
        
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
            data={list}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
                <View style={styles.center}>
                    <Image source={require("../../assets/signature.png")} style={{width: 60, height: 60, tintColor: colors.subtext, marginBottom: 10, opacity: 0.5}} />
                    <Text style={{textAlign: 'center', color: colors.subtext}}>Chưa có đề xuất nào.</Text>
                </View>
            }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12, 
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2 
  },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  card: { 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2 
  },
  avatarPlaceholder: {
      width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  username: { fontWeight: '700', fontSize: 15 },
  date: { fontSize: 12 },
  divider: { height: 1, width: '100%', marginVertical: 8 },
  content: { fontSize: 15, lineHeight: 22 },
});