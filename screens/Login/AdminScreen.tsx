import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import DB from '../../src/db/sqlite';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Login: undefined;
  AdminHome: undefined;
  HomeScreen: undefined;
};

type AdminHomeProps = {
  navigation: StackNavigationProp<RootStackParamList, 'AdminHome'>;
};

const AdminHome: React.FC<AdminHomeProps> = ({ navigation }) => {
  const [adminName, setAdminName] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Lấy thông tin admin hiện tại
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        await DB.initDB();
        const all = await DB.getAllUsersLocal();
        const admin = all.find((u: any) => u.role === 'admin') || all[0];
        setAdminName(admin?.username || admin?.email || '');
      } catch (e) {
        console.warn('Failed to fetch admin info', e);
      }
    };
    fetchAdminInfo();
  }, []);

  // Lấy danh sách user
  const fetchUsers = async () => {
    setLoading(true);
    try {
      await DB.initDB();
      const all = await DB.getAllUsersLocal();
      setUsers(all);
    } catch (error) {
      console.error('Lỗi lấy danh sách user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Đăng xuất
  const handleLogout = () => {
    navigation.replace('Login');
  };

  // Đổi role
  const handleChangeRole = (userId: string | number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    Alert.alert('Xác nhận', `Đổi role thành "${newRole}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        onPress: async () => {
          try {
            await DB.updateUserRoleLocal(userId, newRole);
            fetchUsers();
            Alert.alert('Thành công', `Đã đổi role thành "${newRole}".`);
          } catch {
            Alert.alert('Lỗi', 'Không thể thay đổi role.');
          }
        },
      },
    ]);
  };

  // Xóa user
  const handleDeleteUser = (userId: string | number, userEmail: string) => {
    Alert.alert('Xác nhận', `Xóa tài khoản "${userEmail}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await DB.deleteUserLocal(userId);
            fetchUsers();
            Alert.alert('Thành công', 'Đã xóa user.');
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa user.');
          }
        },
      },
    ]);
  };

  // Sửa thông tin user
  const handleEditUser = (user: any) => {
    setSelectedUser({ ...user });
    setEditModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      await DB.executeSql(
        'UPDATE users SET displayName=?, age=?, gender=?, email=? WHERE id=?',
        [
          selectedUser.displayName,
          selectedUser.age,
          selectedUser.gender,
          selectedUser.email,
          selectedUser.id,
        ],
      );
      setEditModalVisible(false);
      fetchUsers();
      Alert.alert('Thành công', 'Đã lưu thông tin người dùng!');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu thay đổi!');
    }
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>
          {item.displayName || '(Chưa có tên)'}
        </Text>
        <Text style={styles.userInfo}>Email: {item.email}</Text>
        <Text style={styles.userInfo}>
          Tuổi: {item.age ?? '—'} | Giới tính: {item.gender ?? '—'}
        </Text>
        <Text style={styles.userRole}>Role: {item.role}</Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#4da6ff' }]}
          onPress={() => handleEditUser(item)}
        >
          <Text style={styles.buttonText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ffd700' }]}
          onPress={() => handleChangeRole(item.id, item.role)}
        >
          <Text style={styles.buttonText}>Role</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ff4d4d' }]}
          onPress={() => handleDeleteUser(item.id, item.email)}
        >
          <Text style={styles.buttonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#0052cc', '#3385ff']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Xin chào, {adminName}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Danh sách người dùng</Text>
        {loading ? (
          <Text style={{ color: '#333' }}>Đang tải...</Text>
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => item.id.toString()}
            renderItem={renderUserItem}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      {/* 🔹 Modal chỉnh sửa thông tin */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sửa thông tin người dùng</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên hiển thị"
              value={selectedUser?.displayName}
              onChangeText={text =>
                setSelectedUser({ ...selectedUser, displayName: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Tuổi"
              keyboardType="numeric"
              value={selectedUser?.age?.toString() || ''}
              onChangeText={text =>
                setSelectedUser({ ...selectedUser, age: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Giới tính (Nam/Nữ)"
              value={selectedUser?.gender}
              onChangeText={text =>
                setSelectedUser({ ...selectedUser, gender: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={selectedUser?.email}
              onChangeText={text =>
                setSelectedUser({ ...selectedUser, email: text })
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#4CAF50' }]}
                onPress={handleSaveUser}
              >
                <Text style={styles.modalBtnText}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ff4d4d' }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: { fontSize: 26, color: '#fff', fontWeight: 'bold' },
  subtitle: { color: '#fff', marginTop: 5, fontSize: 16 },
  logoutButton: {
    marginTop: 10,
    backgroundColor: '#ff4d4d',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  body: {
    flex: 1,
    backgroundColor: '#f8faff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 15,
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: { fontWeight: 'bold', fontSize: 16, color: '#222' },
  userInfo: { fontSize: 14, color: '#555', marginTop: 2 },
  userRole: { fontSize: 13, fontStyle: 'italic', color: '#888', marginTop: 4 },
  buttonGroup: { justifyContent: 'space-around' },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalBtnText: { color: '#fff', fontWeight: 'bold' },
});

export default AdminHome;
