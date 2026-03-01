import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  Platform,
  SafeAreaView, // ✅ Thêm SafeAreaView
  StatusBar,    // ✅ Thêm StatusBar
} from "react-native";
import { useTheme } from "../../src/context/ThemeContext";
import DB from "../../src/db/sqlite";
import { useNavigation } from "@react-navigation/native";

export default function TrainerSettingScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ✅ Bảng màu đồng bộ với UserManagementScreen
  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    blue: "#4da3ff",
    modalBg: isDark ? "#2C2C2E" : "#FFFFFF",
    deleteBg: isDark ? "#1E1E1E" : "#FFFFFF",
    shadow: isDark ? "#000" : "#999",
  };

  const [trainers, setTrainers] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string; phone: string; specialty: string; } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadData = async () => {
    await DB.initDB();
    const data = await DB.getAllTrainers();
    setTrainers(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditing(null); setName(""); setPhone(""); setSpecialty(""); setModalVisible(true);
  };
  const openEdit = (trainer: any) => {
    setEditing(trainer); setName(trainer.name); setPhone(trainer.phone); setSpecialty(trainer.specialty); setModalVisible(true);
  };
  const saveTrainer = async () => {
    if (!name.trim()) return Alert.alert("Lỗi", "Tên HLV không được để trống.");
    if (editing) { await DB.updateTrainer(editing.id, name, phone, specialty); } 
    else { await DB.addTrainer(name, phone, specialty); }
    setEditing(null); setModalVisible(false); loadData();
  };
  const deleteTrainer = (id: number) => { setDeleteId(id); setDeleteModal(true); };
  const confirmDelete = async () => {
    if (deleteId !== null) { await DB.deleteTrainer(deleteId); loadData(); }
    setDeleteModal(false); setDeleteId(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ✅ Header Đồng Bộ */}
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
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quản lý huấn luyện viên</Text>
        
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={trainers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View 
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
              <Text style={{ color: colors.subtext, marginTop: 4 }}>Điện thoại: {item.phone}</Text>
              <Text style={{ color: colors.subtext }}>Chuyên môn: {item.specialty}</Text>
            </View>

            <View style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <TouchableOpacity onPress={() => openEdit(item)}>
                    <Text style={[styles.editBtn]}>Sửa</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => deleteTrainer(item.id)}>
                    <Text style={[styles.deleteBtn]}>Xóa</Text>
                </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.bottomAddContainer}>
        <TouchableOpacity style={[styles.bottomAddButton, { backgroundColor: colors.blue }]} onPress={openAdd}>
          <Text style={styles.bottomAddText}>+ Thêm HLV</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12, textAlign: 'center' }}>
              {editing ? "Chỉnh sửa HLV" : "Thêm HLV mới"}
            </Text>
            <TextInput placeholder="Tên huấn luyện viên" placeholderTextColor={colors.subtext} style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={name} onChangeText={setName} />
            <TextInput placeholder="Số điện thoại" placeholderTextColor={colors.subtext} keyboardType="phone-pad" style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={phone} onChangeText={setPhone} />
            <TextInput placeholder="Chuyên môn" placeholderTextColor={colors.subtext} style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={specialty} onChangeText={setSpecialty} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveTrainer}><Text style={styles.saveText}>Lưu</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteBox, { backgroundColor: colors.deleteBg, shadowColor: colors.shadow }]}>
            <View style={{width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16}}>
                 <Image source={require("../../assets/delete.png")} style={{width: 24, height: 24, tintColor: '#ff4444'}} /> 
            </View>
            <Text style={[styles.deleteTitle, { color: colors.text }]}>Xóa huấn luyện viên?</Text>
            <Text style={[styles.deleteMessage, { color: colors.subtext }]}>Hành động này không thể hoàn tác.</Text>
            <View style={styles.deleteButtons}>
              <TouchableOpacity onPress={() => setDeleteModal(false)}><Text style={[styles.deleteCancel, { color: colors.subtext }]}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDelete}><Text style={styles.deleteConfirmText}>Xóa</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // ✅ Header Style Mới
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  // ✅ Back Btn Style Mới
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

  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, flexDirection: "row", justifyContent: 'space-between' },
  editBtn: { color: "#4da3ff", fontWeight: "600", marginBottom: 10 },
  deleteBtn: { color: "#ff5555", fontWeight: "600" },
  bottomAddContainer: { position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" },
  bottomAddButton: { width: "82%", paddingVertical: 14, borderRadius: 30, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  bottomAddText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 },
  modalBox: { width: "90%", borderRadius: 20, padding: 20, borderWidth: 1, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 15 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelText: { color: "#888", fontSize: 15, fontWeight: "600" },
  saveBtn: { backgroundColor: "#4da3ff", paddingVertical: 10, paddingHorizontal: 26, borderRadius: 12, shadowColor: "#4da3ff", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  deleteOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  deleteBox: { width: "80%", padding: 24, borderRadius: 20, alignItems: "center", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  deleteTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  deleteMessage: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  deleteButtons: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deleteCancel: { fontSize: 15, fontWeight: "600", padding: 10 },
  deleteConfirmBtn: { backgroundColor: "#ff4444", paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, shadowColor: "#ff4444", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  deleteConfirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});