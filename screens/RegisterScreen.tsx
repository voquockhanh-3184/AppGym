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
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import '../config/firebaseConfig';

const RegisterScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!email || !username || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      console.log('⏳ Đang tạo tài khoản với email:', email);

      // 🔹 Tạo tài khoản Firebase Authentication
      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      const user = userCredential.user;

      // 🔹 Lưu thông tin người dùng vào Firestore
      await firestore().collection('users').doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        username: username.trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Tạo tài khoản thành công:', user.email);

      // ✅ Hiển thị thông báo rõ ràng
      Alert.alert(
        '🎉 Thành công',
        'Đăng ký tài khoản thành công!\nBạn sẽ được chuyển đến trang đăng nhập.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Đợi 0.5 giây để đảm bảo Alert đóng xong mới chuyển trang
              setTimeout(() => {
                navigation.navigate('LoginScreen');
              }, 500);
            },
          },
        ]
      );
    } catch (error: any) {
      console.log('❌ Lỗi chi tiết:', error);

      let message = 'Đăng ký thất bại, vui lòng thử lại.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email này đã được sử dụng.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Email không hợp lệ.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
      }

      Alert.alert('Lỗi', message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.innerContainer}>
        <Text style={styles.headerText}>Tạo tài khoản mới</Text>
        <Text style={styles.subHeaderText}>Bắt đầu hành trình của bạn!</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Tên đăng nhập"
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Xác nhận mật khẩu"
          placeholderTextColor="#888"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>Đăng ký</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
            <Text style={styles.loginLink}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  headerText: { fontSize: 35, fontWeight: 'bold', color: '#0000ff', marginBottom: 10 },
  subHeaderText: { fontSize: 16, color: '#3a3a3a', marginBottom: 40 },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    color: '#000',
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  registerButton: {
    width: '100%',
    backgroundColor: '#0000ff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', marginTop: 30 },
  footerText: { color: '#aaa', fontSize: 15 },
  loginLink: { color: '#0000ff', fontWeight: 'bold', fontSize: 15 },
});

export default RegisterScreen;
