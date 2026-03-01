import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  StyleProp,
  TextStyle,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../src/context/ThemeContext";

interface HeaderProps {
  title: string;
  userPhoto?: string | null;
  titleStyle?: StyleProp<TextStyle>;
  unreadCount?: number; // Số lượng thông báo chưa đọc
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  userPhoto, 
  titleStyle, 
  unreadCount = 0 
}) => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [menuVisible, setMenuVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;
  
  const [photo, setPhoto] = useState<string | null>(userPhoto ?? null); 

  useEffect(() => {
    if (userPhoto) {
      setPhoto(userPhoto);
      return;
    }
    
    const loadPhotoFromStorage = async () => {
      try {
        const storedPhoto = await AsyncStorage.getItem("currentUserPhoto");
        if (storedPhoto) {
          setPhoto(storedPhoto);
        }
      } catch (e) {
        console.warn("Không thể load avatar:", e);
      }
    };
    
    loadPhotoFromStorage();
  }, [userPhoto]);

  const toggleMenu = () => {
    const isOpening = !menuVisible;
    setMenuVisible(isOpening);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: isOpening ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: isOpening ? 0 : -10,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (!isOpening) setMenuVisible(false);
    });
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("currentUserPhoto");
    } catch {}
    setMenuVisible(false);
    navigation.replace("LoginScreen");
  };

  // 🎨 Bảng màu
  const headerBg = isDark ? "#0d0d0d" : "#f5faf9";
  const borderCol = isDark ? "#1a1a1a" : "rgba(0,0,0,0.08)";
  const dropdownBg = isDark ? "rgba(25,25,25,0.96)" : "rgba(255,255,255,0.98)";
  const dropdownBorder = isDark ? "#333" : "#ddd";
  const iconTint = isDark ? "#4da3ff" : "#007AFF"; 
  const bellTint = isDark ? "#ffffff" : "#333333";
  const textPrimary = isDark ? "#ffffff" : "#1f2937";
  const textLogout = "#FF3B30";
  
  const defaultTitleColor =
    ["Tập Luyện", "Cài đặt", "Lớp học", "Báo cáo"].includes(title)
      ? "#007AFF"
      : isDark
      ? "#ffffff"
      : "#000000";

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: headerBg,
            borderBottomWidth: 0,
            borderColor: borderCol,
          },
        ]}
      >
        {/* 🔹 LEFT: Tiêu đề */}
        <Text style={[styles.logo, { color: defaultTitleColor }, titleStyle]}>
          {title}
        </Text>

        <View style={styles.rightContainer}>
          {/* Avatar Button */}
          <TouchableOpacity onPress={toggleMenu} activeOpacity={0.8}>
            <View
              style={[
                styles.avatarWrapper,
                {
                  backgroundColor: isDark ? "#222" : "#f2f2f2",
                  borderColor: isDark ? "#333" : "#ccc",
                  borderWidth: 1,
                },
              ]}
            >
              <Image
                source={photo ? { uri: photo } : require("../assets/profile.png")}
                style={styles.avatar}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* 🔹 Menu xổ xuống */}
        {menuVisible && (
          <Animated.View
            style={[
              styles.dropdownMenu,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                backgroundColor: dropdownBg,
                borderColor: dropdownBorder,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItemContent}
              onPress={() => {
                toggleMenu();
                navigation.navigate("ProfileScreen");
              }}
            >
              <Image
                source={require("../assets/user.png")}
                style={[styles.menuIcon, { tintColor: iconTint }]}
              />
              <Text style={[styles.menuText, { color: textPrimary }]}>
                Hồ sơ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItemContent} onPress={handleLogout}>
              <Image
                source={require("../assets/logout.png")}
                style={[styles.menuIcon, { tintColor: textLogout }]}
              />
              <Text style={[styles.menuText, { color: textLogout }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: "absolute",
    top: 32,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
  },
  
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconButton: {
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    // position: 'relative' là mặc định trong RN, nhưng cần thiết để redDot căn chỉnh theo nút này
  },
  bellIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  
  // ✅ Style chấm đỏ (Đã tinh chỉnh vị trí)
  redDot: {
    position: "absolute",
    top: 8,         // Căn chỉnh để nằm ở góc trên của icon (Icon bắt đầu từ padding 8)
    right: 8,       // Căn chỉnh để nằm ở góc phải
    width: 10,      // Kích thước chấm
    height: 10,
    borderRadius: 5, // Bo tròn
    backgroundColor: "#FF3B30", // Màu đỏ cảnh báo
    borderWidth: 1.5, // Viền trùng màu nền tạo hiệu ứng tách biệt
    zIndex: 2,
  },

  avatarWrapper: {
    borderRadius: 10,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  
  dropdownMenu: {
    position: "absolute",
    top: 65,
    right: 16,
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 160,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    overflow: "hidden",
    borderWidth: 1,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "500",
  },
});

export default Header;