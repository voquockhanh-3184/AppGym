import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  Platform,
  Alert,
  Animated
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native"; 
import { useTheme } from "../../src/context/ThemeContext";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";

// Import DB functions
import { 
  getNotificationsByUserId, 
  markNotificationAsRead, 
  deleteNotification, 
  deleteAllNotifications,
  getCurrentUserId,
} from "../../src/db/sqlite";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  type: "system" | "promo" | "alert" | "goal" | "course" | "schedule" | "cancel";
  is_read: number;
  created_at: string;
}

const NotificationScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const rowRefs = useRef(new Map());

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    primary: "#007AFF",
    unreadBg: isDark ? "#2C2C2E" : "#F0F9FF",
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const formatTime = (isoString: string) => {
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.round(diffMs / 60000);

        if (diffMins < 1) return "Vừa xong";
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.round(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        const diffDays = Math.round(diffHours / 24);
        if (diffDays <= 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    } catch (e) {
        return "--/--";
    }
  };

  const loadNotifications = async () => {
    try {
      const userIdStr = await getCurrentUserId();
      if (!userIdStr) return;
      const userId = Number(userIdStr);

      const data = await getNotificationsByUserId(userId);
      
      const formattedData = data.map((item: any) => ({
        ...item,
        time: formatTime(item.created_at)
      })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(formattedData);
    } catch (e) {
      console.error("Lỗi load thông báo:", e);
    }
  };

  const handleDelete = async (id: number) => {
    const updatedList = notifications.filter((item) => item.id !== id);
    setNotifications(updatedList);
    await deleteNotification(id);
    if (rowRefs.current.has(id)) {
        rowRefs.current.delete(id);
    }
  };

  const handlePressItem = async (item: NotificationItem) => {
    if (item.is_read === 0) {
      const updatedList = notifications.map((n) =>
        n.id === item.id ? { ...n, is_read: 1 } : n
      );
      setNotifications(updatedList);
      await markNotificationAsRead(item.id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    
    Alert.alert("Xóa tất cả", "Bạn có chắc muốn xóa hết thông báo?", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Xóa Hết", 
        style: "destructive", 
        onPress: async () => {
          const userIdStr = await getCurrentUserId();
          if (userIdStr) {
             await deleteAllNotifications(Number(userIdStr));
             setNotifications([]);
          }
        }
      }
    ]);
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case "goal":
        return { icon: require("../../assets/trophy.png"), bgLight: isDark ? "rgba(255, 215, 0, 0.15)" : "#FFF9C4", tint: "#FBC02D" };
      case "course": // ✅ Dùng cho Đăng ký khóa học thành công
        return { icon: require("../../assets/success.png"), bgLight: isDark ? "rgba(76, 175, 80, 0.15)" : "#E8F5E9", tint: "#4CAF50" };
      case "schedule":
        return { icon: require("../../assets/calendar.png"), bgLight: isDark ? "rgba(33, 150, 243, 0.15)" : "#E3F2FD", tint: "#2196F3" };
      case "alert":
      case "cancel":
        return { icon: require("../../assets/warning.png"), bgLight: isDark ? "rgba(244, 67, 54, 0.15)" : "#FFEBEE", tint: "#F44336" };
      case "promo":
        return { icon: require("../../assets/gift.png"), bgLight: isDark ? "rgba(156, 39, 176, 0.15)" : "#F3E5F5", tint: "#9C27B0" };
      default:
        return { icon: require("../../assets/bell.png"), bgLight: isDark ? "#333" : "#F0F0F0", tint: isDark ? "#FFF" : "#757575" };
    }
  };

  const renderRightActions = (progress: any, dragX: any, id: number) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity 
        onPress={() => handleDelete(id)}
        style={styles.deleteButtonContainer}
      >
        <Animated.View style={[styles.deleteButton, { transform: [{ scale }] }]}>
            <Image source={require("../../assets/delete.png")} style={{width: 20, height: 20, tintColor: '#fff'}} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const styleConfig = getNotificationStyle(item.type);
    const isUnread = item.is_read === 0;

    return (
      <View style={[styles.cardWrapper, {shadowColor: colors.border}]}> 
        <Swipeable
            ref={ref => {
                if (ref && !rowRefs.current.get(item.id)) {
                    rowRefs.current.set(item.id, ref);
                }
            }}
            renderRightActions={(progress, dragX) => 
                renderRightActions(progress, dragX, item.id)
            }
            overshootRight={false}
        >
          <TouchableOpacity
            style={[
              styles.card,
              { 
                backgroundColor: !isUnread ? colors.card : colors.unreadBg,
                borderColor: colors.border 
              },
            ]}
            activeOpacity={0.9}
            onPress={() => handlePressItem(item)}
          >
            <View style={styles.cardContent}>
                <View style={[styles.iconContainer, { backgroundColor: styleConfig.bgLight }]}>
                    <Image source={styleConfig.icon} style={[styles.itemIcon, { tintColor: styleConfig.tint }]} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.rowHeader}>
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <View style={[styles.timeBadge, { backgroundColor: colors.border }]}>
                             <Text style={[styles.timeText, { color: colors.subtext }]}>{item.time}</Text>
                        </View>
                    </View>
                    
                    <Text 
                        style={[styles.message, { color: colors.subtext, fontWeight: isUnread ? "500" : "400" }]} 
                        numberOfLines={2}
                    >
                        {item.message}
                    </Text>
                </View>

                {isUnread && <View style={[styles.unreadDot, {backgroundColor: colors.primary}]} />}
            </View>
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}
            >
                <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: colors.text }]}>Thông báo</Text>
            
            <TouchableOpacity onPress={clearAllNotifications} style={styles.clearBtn}>
                <Text style={{ fontSize: 13, color: "#FF3B30", fontWeight: '500' }}>Xóa hết</Text>
            </TouchableOpacity>
        </View>

        <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
            }
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Image source={require("../../assets/bell.png")} style={[styles.emptyIcon, { tintColor: colors.subtext }]} />
                    <Text style={[styles.emptyText, { color: colors.subtext }]}>Chưa có thông báo nào</Text>
                </View>
            }
        />
        </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  clearBtn: { padding: 5 },
  listContent: { padding: 16, paddingBottom: 40 },
  cardWrapper: { marginBottom: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  card: { borderRadius: 16, borderWidth: 1 },
  cardContent: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  iconContainer: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  itemIcon: { width: 24, height: 24, resizeMode: "contain" },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  message: { fontSize: 13, lineHeight: 18 },
  timeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  timeText: { fontSize: 11, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, position: "absolute", top: 16, right: 16 },
  deleteButtonContainer: { width: 70, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center' },
  deleteButton: { justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 100 },
  emptyIcon: { width: 60, height: 60, opacity: 0.5, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600' },
});

export default NotificationScreen;