import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import DB from '../../src/db/sqlite';

const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ navigation }: { navigation: any }) => {
  // ===== STATE =====
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [heightVal, setHeightVal] = useState('');
  const [weightVal, setWeightVal] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State cho Popup thành công
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // State để xử lý focus input (đổi màu viền)
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const defaultRole = 'user';

  // ===== ĐĂNG KÝ TÀI KHOẢN =====
  const handleRegister = async () => {
    if (
      !email ||
      !username ||
      !gender ||
      !heightVal ||
      !weightVal ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert('⚠️ Thông báo', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('⚠️ Lỗi mật khẩu', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setLoading(true);
      await DB.initDB();
      const existing = await DB.getUserByEmailLocal(email.trim());
      if (existing) {
        Alert.alert('⚠️ Email tồn tại', 'Email này đã được sử dụng.');
        return;
      }

      await DB.createUserLocal({
        email: email.trim(),
        username: username.trim(),
        gender,
        height: parseFloat(heightVal),
        weight: parseFloat(weightVal),
        password,
        role: defaultRole,
        photoURL: '',
      });

      // ✅ THAY ĐỔI: Hiển thị Modal tùy chỉnh thay vì Alert
      setShowSuccessModal(true);

    } catch (error: any) {
      console.error('❌ Lỗi đăng ký (local):', error);
      Alert.alert('Lỗi hệ thống', 'Đăng ký thất bại, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Hàm chuyển hướng khi bấm nút trong Modal thành công
  const handleSuccessNavigation = () => {
    setShowSuccessModal(false);
    navigation.navigate('LoginScreen');
  };

  // ===== CHỌN GIỚI TÍNH =====
  const handleSelectGender = (value: string) => {
    setGender(value);
    setShowGenderModal(false);
  };

  // Helper render input
  const renderInput = (
    placeholder: string,
    value: string,
    setValue: (text: string) => void,
    key: string,
    secure = false,
    keyboardType: 'default' | 'numeric' | 'email-address' = 'default',
  ) => (
    <View style={[
      styles.inputContainer,
      focusedInput === key && styles.inputFocused
    ]}>
      <Text style={styles.inputLabel}>{placeholder}</Text>
      <TextInput
        style={styles.input}
        placeholder={`Nhập ${placeholder.toLowerCase()}`}
        placeholderTextColor="#A0A0A0"
        value={value}
        onChangeText={setValue}
        onFocus={() => setFocusedInput(key)}
        onBlur={() => setFocusedInput(null)}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );

  // ===== GIAO DIỆN =====
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Image 
                source={require('../../assets/back.png')} 
                style={styles.backIcon} 
              />
            </TouchableOpacity>
            <View style={{marginTop: 20}}>
              <Text style={styles.headerTitle}>Tạo tài khoản</Text>
              <Text style={styles.headerSubtitle}>Hãy bắt đầu hành trình sức khỏe của bạn</Text>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            
            {renderInput('Email', email, setEmail, 'email', false, 'email-address')}
            {renderInput('Tên hiển thị', username, setUsername, 'username')}

            {/* Giới tính Selection */}
            <View style={[styles.inputContainer, showGenderModal && styles.inputFocused]}>
              <Text style={styles.inputLabel}>Giới tính</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowGenderModal(true)}
              >
                <Text style={[styles.selectText, !gender && { color: '#A0A0A0' }]}>
                  {gender || 'Chọn giới tính'}
                </Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Chiều cao & Cân nặng - Side by side */}
            <View style={styles.rowContainer}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Chiều cao (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="170"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="numeric"
                  value={heightVal}
                  onChangeText={setHeightVal}
                  onFocus={() => setFocusedInput('height')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.inputLabel}>Cân nặng (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="60"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="numeric"
                  value={weightVal}
                  onChangeText={setWeightVal}
                  onFocus={() => setFocusedInput('weight')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {renderInput('Mật khẩu', password, setPassword, 'password', true)}
            {renderInput('Xác nhận mật khẩu', confirmPassword, setConfirmPassword, 'confirm', true)}

            {/* Register Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Đăng Ký</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Bạn đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
                <Text style={styles.footerLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ========================================= */}
      {/* POPUP (MODAL) THÀNH CÔNG          */}
      {/* ========================================= */}
      <Modal
        transparent
        visible={showSuccessModal}
        animationType="fade"
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            {/* Icon thành công */}
            <View style={styles.successIconContainer}>
               {/* Dùng ảnh success.png nếu có, hoặc dùng emoji/icon */}
               <Image 
                 source={require('../../assets/success.png')} 
                 style={styles.successIconImage}
                 resizeMode="contain"
               />
            </View>

            <Text style={styles.successTitle}>Đăng ký thành công!</Text>
            <Text style={styles.successMessage}>
              Tài khoản của bạn đã được tạo thành công. Hãy đăng nhập để bắt đầu tập luyện.
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessNavigation}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Sheet Modal cho Giới tính */}
      <Modal
        transparent
        animationType="slide"
        visible={showGenderModal}
        onRequestClose={() => setShowGenderModal(false)}
      >
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowGenderModal(false)}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
                <View style={styles.dragIndicator} />
                <Text style={styles.bottomSheetTitle}>Chọn giới tính</Text>
            </View>
            
            <TouchableOpacity
              style={[styles.genderOption, gender === 'Nam' && styles.genderOptionSelected]}
              onPress={() => handleSelectGender('Nam')}
            >
              <Text style={[styles.genderText, gender === 'Nam' && styles.genderTextSelected]}>Nam</Text>
              {gender === 'Nam' && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.genderOption, gender === 'Nữ' && styles.genderOptionSelected]}
              onPress={() => handleSelectGender('Nữ')}
            >
              <Text style={[styles.genderText, gender === 'Nữ' && styles.genderTextSelected]}>Nữ</Text>
              {gender === 'Nữ' && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowGenderModal(false)}
            >
              <Text style={styles.closeButtonText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ===== STYLE =====
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 60,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  formContainer: {
    padding: 24,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  inputFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F7FF',
  },
  inputLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 16,
    color: '#1E293B',
    padding: 0,
    fontWeight: '500',
    height: 24,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 24,
  },
  selectText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#64748B',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
  },
  footerLink: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
  },
  
  // MODAL STYLES (Bottom Sheet)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  bottomSheetHeader: {
      alignItems: 'center',
      marginBottom: 20
  },
  dragIndicator: {
      width: 40,
      height: 4,
      backgroundColor: '#E2E8F0',
      borderRadius: 2,
      marginBottom: 15
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  genderOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  genderText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  checkIcon: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 18,
  },
  closeButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },

  // ===== STYLE CHO SUCCESS MODAL =====
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContainer: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#E8F5E9', // Nền xanh lá nhạt
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconImage: {
    width: 40,
    height: 40,
    tintColor: '#2ECC71', // Màu xanh lá đậm
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  successButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  }
});

export default RegisterScreen;