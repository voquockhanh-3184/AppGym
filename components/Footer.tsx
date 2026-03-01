// ======================
//  FOOTER COMPONENT (ULTRA CLEAN - FLAT UI)
// ======================
import React from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";

const tabs = [
  { key: "Tập luyện", icon: require("../assets/dumbbell.png"), screen: "HomeScreen" },
  { key: "Lớp học", icon: require("../assets/school.png"), screen: "ClassHomeScreen" },
  { key: "Báo cáo", icon: require("../assets/statistics.png"), screen: "ReportScreen" },
  { key: "Cài đặt", icon: require("../assets/setting.png"), screen: "SettingScreen" },
];

interface FooterProps {
  active?: string;
  darkMode?: boolean;
}

const Footer: React.FC<FooterProps> = ({
  active = "Tập luyện",
  darkMode = false,
}) => {
  const navigation = useNavigation<any>();
  
  // ✅ SỬA LỖI: Nếu là Light Mode (darkMode = false), dùng màu đen #000000.
  const inactiveColor = darkMode ? "#8E8E93" : "#000000"; 
  const activeColor = darkMode ? "#4DA3FF" : "#007AFF";
  
  const textColor = (isActive: boolean) => isActive ? activeColor : inactiveColor;

  return (
    <View style={[styles.wrapper, darkMode ? styles.borderDark : styles.borderLight]}>
      <BlurView
        style={styles.absoluteFill}
        blurType={darkMode ? "dark" : "light"}
        blurAmount={10}
        reducedTransparencyFallbackColor={darkMode ? "#1a1a1a" : "#ffffff"}
      />

      <View style={styles.contentContainer}>
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.item}
              activeOpacity={0.7} // Giảm độ nháy khi ấn
              onPress={() => navigation.navigate(tab.screen)}
            >
              <View
                style={[
                  styles.iconCircle,
                  // Logic màu nền: Xanh khi active, Trong suốt tuyệt đối khi inactive
                  { backgroundColor: isActive ? activeColor : 'transparent' },
                ]}
              >
                <Image
                  source={tab.icon}
                  style={[
                    styles.icon,
                    // Áp dụng màu đen khi inactive trong Light Mode
                    { tintColor: isActive ? "#fff" : inactiveColor },
                  ]}
                />
              </View>

              <Text style={[styles.label, { color: textColor(isActive), fontWeight: isActive ? "600" : "500" }]}>
                {tab.key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 35,
    overflow: "hidden", 
    borderWidth: 1,
    backgroundColor: 'transparent', 
  },
  
  borderLight: {
    borderColor: "rgba(0,0,0,0.05)",
  },
  
  borderDark: {
    borderColor: "rgba(255,255,255,0.1)",
  },
  
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: 'transparent',
  },

  item: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    flex: 1,
  },

  iconCircle: {
    width: 40,
    height: 32,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    borderWidth: 0,
  },

  icon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  
  label: {
    fontSize: 10,
    marginTop: 2,
  }
});

export default Footer;