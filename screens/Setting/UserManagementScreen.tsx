import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Alert,
    Modal,
    ActivityIndicator,
    StatusBar,
    Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext"; 
import DB from "../../src/db/sqlite"; 
import AsyncStorage from "@react-native-async-storage/async-storage";

// Định nghĩa các Role
const ROLES = [
    { key: "user", label: "Học viên", color: "#34C759" },
    { key: "trainer", label: "Huấn luyện viên", color: "#FF9500" },
    { key: "admin", label: "Quản trị viên", color: "#FF3B30" },
];

export default function UserManagementScreen() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // State cho Modal chọn Role
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    
    // ✅ STATE MỚI: Modal Thành công
    const [successVisible, setSuccessVisible] = useState(false); 
    const [successMessage, setSuccessMessage] = useState("");

    const colors = {
        background: isDark ? "#121212" : "#F5F7FA",
        card: isDark ? "#1E1E1E" : "#FFFFFF",
        text: isDark ? "#FFFFFF" : "#1f2937",
        subtext: isDark ? "#aaaaaa" : "#6b7280",
        border: isDark ? "#333" : "#E5E5EA",
        modalBg: isDark ? "#2C2C2E" : "#FFFFFF",
    };

    const loadData = async () => {
        setLoading(true);
        try {
            await DB.initDB();
            const myId = await AsyncStorage.getItem("currentUserId");
            setCurrentUserId(myId);

            const list = await DB.getAllUsersLocal();
            setUsers(list);
        } catch (error) {
            console.error("Lỗi load users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // ✅ SỬA HÀM: Cập nhật role và đồng bộ bảng Trainers
    const handleUpdateRole = async (roleKey: string) => {
        if (!selectedUser) return;

        try {
            // 1. Cập nhật role trong bảng users
            await DB.updateUserRoleLocal(selectedUser.id, roleKey);

            // 2. Logic đồng bộ Trainer
            if (roleKey === 'trainer') {
                // Kiểm tra xem đã có trong bảng trainers chưa (tránh trùng)
                const trainers = await DB.getAllTrainers();
                const exists = trainers.some((t: any) => t.name === selectedUser.username);
                
                if (!exists) {
                    // Thêm vào bảng personal_trainers
                    // Lưu ý: phone lấy từ user (nếu có) hoặc để trống
                    await DB.addTrainer(selectedUser.username, selectedUser.phone || "", "HLV mới");
                }
            } 
            
            setModalVisible(false);
            
            // Xây dựng thông báo thành công
            let msg = `Đã cập nhật vai trò của ${selectedUser.username} thành ${getRoleLabel(roleKey)}.`;
            if (roleKey === 'trainer') {
                 msg = `Đã cập nhật vai trò của ${selectedUser.username} thành Huấn luyện viên và thêm vào danh sách HLV.`;
            }
            setSuccessMessage(msg);
            
            setSuccessVisible(true);
            setSelectedUser(null);
            loadData(); // Reload lại danh sách
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể cập nhật role.");
        }
    };

    // Hàm xử lý xóa User
    const handleDeleteUser = (user: any) => {
        Alert.alert(
            "Xác nhận xóa",
            `Bạn có chắc muốn xóa tài khoản "${user.username}"? Hành động này không thể hoàn tác.`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await DB.deleteUserLocal(user.id);
                            loadData();
                        } catch (error) {
                            Alert.alert("Lỗi", "Không thể xóa người dùng.");
                        }
                    },
                },
            ]
        );
    };

    const openRoleModal = (user: any) => {
        if (String(user.id) === String(currentUserId)) {
            Alert.alert("Thông báo", "Bạn không thể thay đổi quyền của chính mình.");
            return;
        }
        setSelectedUser(user);
        setModalVisible(true);
    };
    
    const getRoleLabel = (role: string) => {
        const found = ROLES.find(r => r.key === role);
        return found ? found.label : 'Người dùng';
    };

    const renderItem = ({ item }: { item: any }) => {
        const roleConfig = ROLES.find((r) => r.key === item.role) || ROLES[0];
        const isMe = String(item.id) === String(currentUserId);

        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                    {/* Avatar Area */}
                    <View style={styles.avatarContainer}>
                        {item.photoURL ? (
                            <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                               <Text style={{fontSize: 18, fontWeight: 'bold', color: colors.subtext}}>
                                   {item.username?.charAt(0).toUpperCase()}
                               </Text>
                            </View>
                        )}
                    </View>

                    {/* Info Area */}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.nameText, { color: colors.text }]}>
                            {item.username} {isMe && "(Bạn)"}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.subtext }}>{item.email}</Text>
                        
                        {/* Role Badge */}
                        <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + "20" }]}>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: roleConfig.color }}>
                                {roleConfig.label}
                            </Text>
                        </View>
                    </View>

                    {/* Edit Button */}
                    {!isMe && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, {backgroundColor: colors.border}]}
                            onPress={() => openRoleModal(item)}
                        >
                            <Image source={require("../../assets/edit.png")} style={{width: 16, height: 16, tintColor: colors.text}} />
                        </TouchableOpacity>
                    )}
                </View>

                {!isMe && (
                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                        <TouchableOpacity 
                            style={styles.footerBtn}
                            onPress={() => openRoleModal(item)}
                        >
                            <Text style={{color: colors.text, fontWeight: '500'}}>Đổi quyền</Text>
                        </TouchableOpacity>
                        
                        <View style={{width: 1, backgroundColor: colors.border, height: 20}} />

                        <TouchableOpacity 
                            style={styles.footerBtn}
                            onPress={() => handleDeleteUser(item)}
                        >
                            <Text style={{color: "#FF3B30", fontWeight: '500'}}>Xóa tài khoản</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
                {/* ✅ Button Back được cập nhật style */}
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={[
                        styles.backBtn, 
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }
                    ]}
                >
                    <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.text }]}>Quản lý tài khoản</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={
                        <Text style={{ textAlign: "center", marginTop: 20, color: colors.subtext }}>Không có tài khoản nào</Text>
                    }
                />
            )}

            {/* Modal Chọn Role */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
                        <View style={styles.modalIndicator} />
                        <Text style={[styles.modalTitle, {color: colors.text}]}>
                            Cập nhật quyền hạn
                        </Text>
                        <Text style={{textAlign: 'center', marginBottom: 20, color: colors.subtext}}>
                            Cho tài khoản: {selectedUser?.username}
                        </Text>

                        {ROLES.map((role) => (
                            <TouchableOpacity
                                key={role.key}
                                style={[
                                    styles.roleOption, 
                                    { 
                                        backgroundColor: selectedUser?.role === role.key ? role.color + "20" : colors.background,
                                        borderColor: selectedUser?.role === role.key ? role.color : colors.border
                                    }
                                ]}
                                onPress={() => handleUpdateRole(role.key)}
                            >
                                <Text style={{ 
                                    fontSize: 16, 
                                    fontWeight: '600', 
                                    color: selectedUser?.role === role.key ? role.color : colors.text 
                                }}>
                                    {role.label}
                                </Text>
                                {selectedUser?.role === role.key && (
                                    <Image source={require("../../assets/success.png")} style={{width: 20, height: 20, tintColor: role.color}} />
                                )}
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity 
                            style={[styles.closeBtn, {backgroundColor: colors.border}]}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={{fontWeight: '600', color: colors.text}}>Hủy bỏ</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal Thành công */}
            <Modal transparent visible={successVisible} animationType="fade">
                <View style={styles.successOverlay}>
                    <View style={[styles.successContent, { backgroundColor: colors.card }]}>
                        <View style={styles.successIconBox}>
                            <Image source={require("../../assets/success.png")} style={styles.successIcon} />
                        </View>
                        
                        <Text style={[styles.successTitle, { color: colors.text }]}>Thành công!</Text>
                        <Text style={[styles.successMessage, { color: colors.subtext }]}>{successMessage}</Text>
                        
                        <TouchableOpacity style={[styles.successButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setSuccessVisible(false)}>
                            <Text style={[styles.successButtonText, { color: colors.text }]}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    // ✅ Cập nhật backBtn style để có bo tròn và shadow
    backBtn: { 
        width: 40, 
        height: 40, 
        justifyContent: "center", 
        alignItems: "center",
        borderRadius: 12, // Bo tròn
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2 // Đổ bóng
    },
    backIcon: { width: 20, height: 20, resizeMode: "contain" },
    headerTitle: { fontSize: 18, fontWeight: "700" },
    
    card: { borderRadius: 16, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', padding: 16, alignItems: 'center' },
    avatarContainer: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
    avatar: { width: '100%', height: '100%' },
    avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    nameText: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
    
    actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    
    cardFooter: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 12 },
    footerBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Modal (Bottom Sheet - Role Picker)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalIndicator: { width: 40, height: 5, backgroundColor: '#ccc', borderRadius: 3, alignSelf: 'center', marginBottom: 20, opacity: 0.5 },
    modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
    roleOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, alignItems: 'center' },
    closeBtn: { marginTop: 10, padding: 16, borderRadius: 16, alignItems: 'center' },

    // Styles cho Modal Thành công
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    successContent: {
        width: '100%',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        elevation: 8,
    },
    successIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(52, 199, 89, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    successIcon: {
        width: 30,
        height: 30,
        tintColor: '#34C759',
    },
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    successMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 25,
    },
    successButton: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});