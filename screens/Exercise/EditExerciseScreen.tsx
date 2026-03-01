import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { launchImageLibrary } from 'react-native-image-picker';
import DB from "../../src/db/sqlite";
import { useTheme } from "../../src/context/ThemeContext";

export default function EditExercisesScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Edit Modal States ---
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [exerciseCount, setExerciseCount] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Success Modal State ---
  const [successVisible, setSuccessVisible] = useState(false);

  // --- ✅ DELETE MODAL STATE (POPUP BO TRÒN MỚI) ---
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: number, title: string} | null>(null);

  const colors = {
    background: isDark ? "#0d0d0d" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A1A1A",
    subtext: isDark ? "#A0A0A0" : "#6B7280",
    border: isDark ? "#333333" : "#E5E7EB",
    danger: "#FF3B30",
    primary: "#007AFF",
    inputBg: isDark ? "#2C2C2E" : "#F9FAFB",
    success: "#34C759",
  };

  useFocusEffect(
    React.useCallback(() => {
      loadExercises();
    }, [])
  );

  const loadExercises = async () => {
    setLoading(true);
    try {
      await DB.initDB();
      const data = await DB.getExercisesLocal();
      setExercises(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Hàm mở Modal Xóa (Thay cho Alert cũ)
  const onRequestDelete = (id: number, title: string) => {
    setItemToDelete({ id, title });
    setDeleteModalVisible(true);
  };

  // 2. Hàm thực hiện xóa khi bấm "Xóa" trong Modal
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await DB.deleteExerciseLocal(itemToDelete.id);
      loadExercises();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xóa bài tập này.");
    } finally {
      setDeleteModalVisible(false);
      setItemToDelete(null);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category);
    setDifficulty(item.difficulty);
    setExerciseCount(String(item.exerciseCount));
    setImage(item.image);
    setEditModalVisible(true);
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri || null);
      }
    } catch (error) {
      console.log("Error picking image", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await DB.updateExerciseLocal(editingItem.id, {
        title: title.trim(),
        category: category.trim(),
        difficulty: difficulty.trim(),
        exerciseCount: Number(exerciseCount) || 0,
        image: image || "",
        time: editingItem.time
      });
      
      setEditModalVisible(false);
      loadExercises();
      setSuccessVisible(true);

    } catch (e) {
      console.error(e);
      Alert.alert("Lỗi", "Không thể cập nhật bài tập.");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image
        source={{ uri: item.image || "https://via.placeholder.com/100" }}
        style={styles.image}
      />
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {item.category} • {item.difficulty}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {item.exerciseCount} bài tập con
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary + "20" }]}
          onPress={() => handleEdit(item)}
        >
          <Image source={require("../../assets/edit.png")} style={[styles.icon, { tintColor: colors.primary }]} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.danger + "20", marginTop: 8 }]}
          onPress={() => onRequestDelete(item.id, item.title)}
        >
          <Image source={require("../../assets/delete.png")} style={[styles.icon, { tintColor: colors.danger }]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ✅ HEADER ĐÃ ĐIỀU CHỈNH PADDING */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quản lý bài tập</Text>
        
        {/* ✅ NÚT PLUS HÌNH ẢNH */}
        <TouchableOpacity onPress={() => navigation.navigate("AddExercise")} style={styles.addBtnHeader}>
            <Image 
                source={require("../../assets/plus.png")} 
                style={{ width: 24, height: 24, tintColor: colors.primary }} 
                resizeMode="contain"
            />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.subtext }]}>Chưa có bài tập nào.</Text>
          }
        />
      )}

      {/* --- POPUP EDIT MODAL --- */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
        >
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Sửa bài tập</Text>
                    <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                        <Text style={{ color: colors.subtext, fontSize: 16 }}>Hủy</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                    <TouchableOpacity onPress={handlePickImage} style={styles.imagePicker}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.previewImage} />
                        ) : (
                            <View style={[styles.placeholderImage, { backgroundColor: colors.inputBg }]}>
                                <Text style={{ color: colors.subtext }}>Chọn ảnh</Text>
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Image source={require("../../assets/edit.png")} style={{ width: 12, height: 12, tintColor: '#fff' }} />
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: colors.subtext }]}>Tên bài tập</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={[styles.label, { color: colors.subtext }]}>Danh mục</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        value={category}
                        onChangeText={setCategory}
                    />

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.subtext }]}>Độ khó</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                value={difficulty}
                                onChangeText={setDifficulty}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.subtext }]}>Số bài con</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                value={exerciseCount}
                                onChangeText={setExerciseCount}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                        onPress={handleSaveEdit}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- ✅ POPUP XÓA BO TRÒN (CUSTOM MODAL) --- */}
      <Modal
        transparent
        visible={deleteModalVisible}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.successOverlay}>
            <View style={[styles.successContent, { backgroundColor: colors.card }]}>
                {/* Icon Warning */}
                <View style={[styles.successIconBox, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
                     <Image 
                        source={require("../../assets/delete.png")} 
                        style={{ width: 32, height: 32, tintColor: colors.danger }} 
                        resizeMode="contain"
                    />
                </View>

                <Text style={[styles.successTitle, { color: colors.text }]}>Xóa bài tập?</Text>
                <Text style={[styles.successMessage, { color: colors.subtext }]}>
                    Bạn có chắc muốn xóa "{itemToDelete?.title}" không? Hành động này không thể hoàn tác.
                </Text>

                <View style={{flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 12}}>
                    <TouchableOpacity 
                        style={[styles.cancelDeleteBtn, { borderColor: colors.border }]}
                        onPress={() => setDeleteModalVisible(false)}
                    >
                        <Text style={{color: colors.subtext, fontWeight: '600'}}>Hủy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.confirmDeleteBtn, { backgroundColor: colors.danger }]}
                        onPress={confirmDelete}
                    >
                        <Text style={{color: '#fff', fontWeight: 'bold'}}>Xóa</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* --- MODAL THÀNH CÔNG --- */}
      <Modal
        transparent
        visible={successVisible}
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.successOverlay}>
          <View style={[styles.successContent, { backgroundColor: colors.card }]}>
            <View style={[styles.successIconBox, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
              <Image 
                source={require("../../assets/success.png")} 
                style={{ width: 40, height: 40, tintColor: colors.success }} 
                resizeMode="contain"
              />
            </View>
            
            <Text style={[styles.successTitle, { color: colors.text }]}>Thành công!</Text>
            <Text style={[styles.successMessage, { color: colors.subtext }]}>
              Cập nhật thông tin bài tập thành công.
            </Text>

            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: colors.primary }]}
              onPress={() => setSuccessVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // ✅ HEADER: Tăng paddingTop để thụt xuống
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 50, // Thụt xuống
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backBtn: { padding: 8 },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  addBtnHeader: { padding: 8 },
  
  listContent: { padding: 16 },
  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  actions: {
    marginLeft: 8,
    justifyContent: "center",
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  emptyText: { textAlign: "center", marginTop: 50, fontSize: 16 },

  // Edit Modal Styles
  modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 20,
  },
  modalContent: {
      borderRadius: 20,
      padding: 20,
      maxHeight: "90%",
  },
  modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
  },
  label: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 12,
  },
  input: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
  },
  imagePicker: {
      alignSelf: 'center',
      marginBottom: 10,
  },
  previewImage: {
      width: 100,
      height: 100,
      borderRadius: 16,
  },
  placeholderImage: {
      width: 100,
      height: 100,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
  },
  editBadge: {
      position: 'absolute',
      bottom: -5,
      right: -5,
      backgroundColor: '#007AFF',
      padding: 6,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: '#fff',
  },
  saveBtn: {
      marginTop: 24,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
  },
  saveBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },

  // Success & Delete Modal Styles (Popup Bo Tròn)
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    width: '85%',
    borderRadius: 24, // Bo tròn nhiều
    padding: 30,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  successIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  successButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  
  // Nút trong popup xóa
  cancelDeleteBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center'
  },
  confirmDeleteBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center'
  }
});