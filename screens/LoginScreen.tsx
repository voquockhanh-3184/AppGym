import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import '../config/firebaseConfig';

// ✅ Cấu hình Google Sign-in
GoogleSignin.configure({
  webClientId:
    '974277955893-gjoh8fku0r4k1v4o296i9qa1gtd8utg9.apps.googleusercontent.com',
});

// ====================== Typewriter Component ======================
const TypewriterText: React.FC = () => {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  const typingSpeed = 120;
  const deletingSpeed = 80;
  const delayAfterTyping = 1200;
  const texts = [
    'Bứt Phá Mọi Giới Hạn',
    'Không Gì Là Không Thể',
    'Chinh Phục Mục Tiêu Của Bạn',
  ];

  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % texts.length;
      const fullText = texts[i];
      const updatedText = isDeleting
        ? fullText.substring(0, text.length - 1)
        : fullText.substring(0, text.length + 1);
      setText(updatedText);

      if (!isDeleting && updatedText === fullText) {
        setTimeout(() => setIsDeleting(true), delayAfterTyping);
      } else if (isDeleting && updatedText === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };
    const timer = setTimeout(
      handleTyping,
      isDeleting ? deletingSpeed : typingSpeed
    );
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum]);

  return (
    <Text style={styles.headerText}>
      {text}
      <Text style={styles.cursor}>|</Text>
    </Text>
  );
};

// ====================== Login Screen Component ======================
type RootStackParamList = {
  Login: undefined;
  RegisterScreen: undefined;
  HomeScreen: undefined; // ✅ THÊM DÒNG NÀY
};

type LoginScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Đăng nhập thường
  const handleLogin = () => {
    if (!username || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // ✅ Sau khi đăng nhập thành công → chuyển sang HomeScreen
      navigation.replace('HomeScreen');
    }, 2000);
  };

  // Đăng nhập bằng Google
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);

      const currentUser = auth().currentUser;
      Alert.alert(
        'Đăng nhập thành công 🎉',
        `Xin chào ${currentUser?.displayName}`
      );

      navigation.replace('HomeScreen');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Đăng nhập thất bại', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>GYM</Text>
          <TypewriterText />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
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
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Image
              source={{
                uri: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Google_%22G%22_Logo.svg',
              }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Đăng nhập bằng Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('RegisterScreen')}
          >
            <Text style={styles.signupText}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ====================== Styles ======================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#0052cc',
    letterSpacing: 2,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0052cc',
    marginTop: 10,
    height: 30,
  },
  cursor: { color: '#0052cc', fontWeight: '600' },
  formContainer: { width: '100%' },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    color: '#333',
    fontSize: 16,
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: '#0052cc',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    height: 50,
    justifyContent: 'center',
  },
  loginButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  forgotPasswordButton: { alignSelf: 'flex-end' },
  forgotPasswordText: { color: '#555', fontSize: 14, fontWeight: 'bold' },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    height: 50,
  },
  googleIcon: { width: 24, height: 24, marginRight: 10 },
  googleButtonText: { fontSize: 16, color: '#333', fontWeight: '500' },
  footer: { flexDirection: 'row', position: 'absolute', bottom: 30 },
  footerText: { color: '#888', fontSize: 15 },
  signupText: { color: '#0052cc', fontWeight: '700', fontSize: 15 },
});

export default LoginScreen;
