import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { launchImageLibrary } from "react-native-image-picker";
import DB from "../../src/db/sqlite";
import { useTheme } from "../../src/context/ThemeContext";

interface EditData {
  username: string;
  age: string;
  gender: string;
  email: string;
  photoURL: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  
  // State cho Modal chọn giới tính
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    background: isDark ? "#121212" : "#F8F9FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A1A1A",
    subtext: isDark ? "#A0A0A0" : "#6B7280",
    border: isDark ? "#333333" : "#E5E7EB",
    inputBg: isDark ? "#2C2C2E" : "#F3F4F6",
    primary: "#007AFF",
    danger: "#FF3B30",
    success: "#34C759",
    disabledBg: isDark ? "#2C2C2E" : "#E9ECEF", // Màu nền cho field bị disable
  };

  const [editData, setEditData] = useState<EditData>({
    username: "",
    age: "",
    gender: "Nam",
    email: "",
    photoURL: "",
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        await DB.initDB();
        const id = await AsyncStorage.getItem("currentUserId");
        if (!id) {
          setLoading(false);
          return;
        }
        const all = await DB.getAllUsersLocal();
        const found = all.find((u: any) => String(u.id) === String(id));
        if (found) {
          setUser(found);
          setEditData({
            username: found.username || "",
            age: found.age ? found.age.toString() : "",
            gender: found.gender || "Nam",
            email: found.email || "",
            photoURL: found.photoURL || "",
          });
        }
      } catch (err) {
        console.error("❌ Lỗi load user:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handlePickAvatar = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      selectionLimit: 1,
      includeBase64: true,
    });
    if (result.didCancel) return;
    const selected = result.assets?.[0];
    if (selected?.uri) {
      setEditData((prev) => ({ ...prev, photoURL: selected.uri || "" }));
    }
  };

  const handleSave = async () => {
    try {
      if (!user) return;
      const parsedAge = parseInt(editData.age);
      const finalAge = !isNaN(parsedAge) ? parsedAge : 0;

      // Lưu ý: email vẫn lấy từ editData (vốn là giá trị cũ) nên không thay đổi
      const newUserData = {
        ...user,
        username: editData.username.trim(),
        age: finalAge,
        gender: editData.gender,
        email: user.email, // Đảm bảo giữ nguyên email gốc
        photoURL: editData.photoURL,
      };

      await DB.executeSql(
        "UPDATE users SET username=?, age=?, gender=?, email=?, photoURL=?, height=?, weight=? WHERE id=?",
        [
          newUserData.username,
          finalAge,
          newUserData.gender,
          newUserData.email,
          newUserData.photoURL,
          user.height || 0,
          user.weight || 0,
          user.id,
        ]
      );

      await AsyncStorage.setItem("currentUserPhoto", newUserData.photoURL || "");
      setUser(newUserData);
      setIsEditing(false);
      setSuccessVisible(true);
    } catch (e) {
      console.error("Save Error:", e);
      Alert.alert("❌ Lỗi", "Không thể lưu thay đổi.");
    }
  };

  const handleLogout = () => setConfirmLogoutVisible(true);
  const confirmLogoutAction = async () => {
    await AsyncStorage.removeItem("currentUserId");
    setConfirmLogoutVisible(false);
    navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* --- HEADER & AVATAR --- */}
          <View style={styles.profileSection}>
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Image source={require("../../assets/back.png")} style={[styles.backIcon, {tintColor: colors.text}]} />
                </TouchableOpacity>
                <Text style={[styles.screenTitle, { color: colors.text }]}>Hồ sơ cá nhân</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={isEditing ? handlePickAvatar : undefined} activeOpacity={0.8}>
                <Image
                  source={editData.photoURL ? { uri: editData.photoURL } : require("../../assets/profile.png")}
                  style={[styles.avatar, { borderColor: colors.card }]}
                />
                {isEditing && (
                  <View style={styles.editBadge}>
                    <Image source={require("../../assets/camera.png")} style={styles.cameraIcon} />
                  </View>
                )}
              </TouchableOpacity>
              {!isEditing && (
                  <View style={{alignItems: 'center', marginTop: 16}}>
                    <Text style={[styles.userNameDisplay, { color: colors.text }]}>{user?.username || "Người dùng"}</Text>
                    <Text style={[styles.userEmailDisplay, { color: colors.subtext }]}>{user?.email || "Chưa cập nhật email"}</Text>
                  </View>
              )}
            </View>
          </View>

          {/* --- FORM --- */}
          <View style={styles.formContainer}>
            
            {/* USERNAME */}
            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.subtext }]}>Họ và tên</Text>
                {isEditing ? (
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        value={editData.username}
                        onChangeText={(t) => setEditData((prev) => ({ ...prev, username: t }))}
                    />
                ) : (
                    <View style={[styles.readOnlyBox, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.readOnlyText, { color: colors.text }]}>{user?.username || "---"}</Text>
                    </View>
                )}
            </View>

            {/* EMAIL (ĐÃ SỬA: KHÔNG CHO PHÉP EDIT) */}
            <View style={styles.inputGroup}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={[styles.label, { color: colors.subtext }]}>Email</Text>
                    {isEditing && (
                        <Text style={{fontSize: 12, color: colors.subtext, fontStyle: 'italic', marginTop: 2}}>
                            (Không thể thay đổi)
                        </Text>
                    )}
                </View>
                <View style={[
                    styles.readOnlyBox, 
                    { 
                        borderBottomColor: colors.border,
                        // Nếu đang edit thì làm mờ nền và chỉnh style cho giống input bị disable
                        opacity: isEditing ? 0.7 : 1,
                        backgroundColor: isEditing ? colors.disabledBg : 'transparent',
                        paddingHorizontal: isEditing ? 12 : 0,
                        borderRadius: isEditing ? 12 : 0,
                        borderBottomWidth: isEditing ? 0 : 1,
                        height: isEditing ? 50 : 40,
                        alignItems: isEditing ? 'flex-start' : undefined,
                        justifyContent: 'center'
                    }
                ]}>
                    <Text style={[styles.readOnlyText, { color: colors.text }]}>{user?.email || "---"}</Text>
                </View>
            </View>

            {/* AGE & GENDER */}
            <View style={styles.row}>
                {/* AGE */}
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={[styles.label, { color: colors.subtext }]}>Tuổi</Text>
                    {isEditing ? (
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                            value={editData.age}
                            keyboardType="numeric"
                            placeholder="Nhập tuổi"
                            placeholderTextColor={colors.subtext}
                            onChangeText={(t) => setEditData((prev) => ({ ...prev, age: t }))}
                        />
                    ) : (
                        <View style={[styles.readOnlyBox, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.readOnlyText, { color: colors.text }]}>{user?.age || "---"}</Text>
                        </View>
                    )}
                </View>

                {/* GENDER (MODAL) */}
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                    <Text style={[styles.label, { color: colors.subtext }]}>Giới tính</Text>
                    {isEditing ? (
                        <TouchableOpacity 
                            onPress={() => setGenderModalVisible(true)}
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, justifyContent: 'center' }]}
                        >
                            <Text style={{ color: editData.gender ? colors.text : colors.subtext, fontSize: 16 }}>
                                {editData.gender || "Chọn..."}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.readOnlyBox, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.readOnlyText, { color: colors.text }]}>{user?.gender || "---"}</Text>
                        </View>
                    )}
                </View>
            </View>
          </View>

          {/* --- BUTTONS --- */}
          <View style={styles.actionContainer}>
            {isEditing ? (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.subtext, flex: 1, marginRight: 8 }]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.buttonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary, flex: 1, marginLeft: 8 }]}
                  onPress={handleSave}
                >
                  <Text style={styles.buttonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.buttonOutline, { borderColor: colors.primary }]}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={[styles.buttonOutlineText, { color: colors.primary }]}>Chỉnh sửa hồ sơ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.buttonOutline, { borderColor: colors.danger, marginTop: 12 }]}
                  onPress={handleLogout}
                >
                  <Text style={[styles.buttonOutlineText, { color: colors.danger }]}>Đăng xuất</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- MODAL CHỌN GIỚI TÍNH --- */}
      <Modal transparent visible={genderModalVisible} animationType="fade" onRequestClose={() => setGenderModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.card, width: '80%' }]}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 20 }]}>Chọn giới tính</Text>
                
                {["Nam", "Nữ", "Khác"].map((gender) => (
                    <TouchableOpacity 
                        key={gender}
                        style={[
                            styles.genderOption, 
                            { 
                                backgroundColor: editData.gender === gender ? colors.primary + '20' : 'transparent',
                                borderColor: editData.gender === gender ? colors.primary : colors.border
                            }
                        ]}
                        onPress={() => {
                            setEditData(prev => ({ ...prev, gender }));
                            setGenderModalVisible(false);
                        }}
                    >
                        <Text style={{ 
                            fontSize: 16, 
                            fontWeight: editData.gender === gender ? '700' : '400',
                            color: editData.gender === gender ? colors.primary : colors.text 
                        }}>
                            {gender}
                        </Text>
                        {editData.gender === gender && (
                            <Image source={require("../../assets/success.png")} style={{ width: 18, height: 18, tintColor: colors.primary }} />
                        )}
                    </TouchableOpacity>
                ))}

                <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: colors.subtext, marginTop: 15 }]} 
                    onPress={() => setGenderModalVisible(false)}
                >
                    <Text style={styles.buttonText}>Đóng</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal transparent visible={successVisible} animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
              <Image source={require("../../assets/success.png")} style={[styles.modalIcon, { tintColor: colors.success }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Thành công</Text>
            <Text style={[styles.modalMessage, { color: colors.subtext }]}>Hồ sơ đã được cập nhật!</Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={() => setSuccessVisible(false)}>
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* LOGOUT CONFIRM MODAL */}
      <Modal transparent visible={confirmLogoutVisible} animationType="fade" onRequestClose={() => setConfirmLogoutVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.danger }]}>Đăng xuất</Text>
            <Text style={[styles.modalMessage, { color: colors.text }]}>Bạn có chắc chắn muốn đăng xuất?</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: colors.subtext }]} onPress={() => setConfirmLogoutVisible(false)}>
                <Text style={{ color: colors.text }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.danger, marginLeft: 10, flex: 1 }]} onPress={confirmLogoutAction}>
                <Text style={styles.buttonText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16 },
  scrollContent: { paddingBottom: 60, paddingTop: 20 },
  
  profileSection: { alignItems: "center", paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' },
  backBtn: { padding: 5 },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  screenTitle: { fontSize: 18, fontWeight: '700' },

  avatarContainer: { position: "relative", marginTop: 20, alignItems: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 28, borderWidth: 3, backgroundColor: "#E0E0E0" },
  editBadge: { position: "absolute", bottom: -6, right: -6, backgroundColor: "#007AFF", width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#fff" },
  cameraIcon: { width: 16, height: 16, tintColor: "#fff" },
  userNameDisplay: { fontSize: 22, fontWeight: "bold", marginTop: 8 },
  userEmailDisplay: { fontSize: 14 },

  formContainer: { paddingHorizontal: 20, marginTop: 10 },
  inputGroup: { marginBottom: 20 },
  row: { flexDirection: "row" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, fontSize: 16 },
  
  // Style cho ô hiển thị (Read Only)
  readOnlyBox: { height: 40, justifyContent: "flex-end", paddingBottom: 8, borderBottomWidth: 1 },
  readOnlyText: { fontSize: 17, fontWeight: "500" },

  actionContainer: { paddingHorizontal: 20, marginTop: 10 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", width: '100%' },
  button: { height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  buttonOutline: { height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 1.5, backgroundColor: "transparent" },
  buttonOutlineText: { fontSize: 16, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "80%", borderRadius: 24, padding: 24, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalIcon: { width: 32, height: 32 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  modalMessage: { fontSize: 16, textAlign: "center", marginBottom: 24 },
  modalButton: { flex: 1, width: "100%", height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  modalButtonSecondary: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center" },

  genderOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
  }
});