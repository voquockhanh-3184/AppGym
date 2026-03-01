import React, { useState, useEffect, useRef } from "react";
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
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import DB from "../../src/db/sqlite";
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const { width } = Dimensions.get("window");

// ====================== Helper: AsyncStorage ======================
const safeSetCurrentUserId = async (key: string, value: string) => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage')?.default || require('@react-native-async-storage/async-storage');
    if (AsyncStorage && AsyncStorage.setItem) {
      await AsyncStorage.setItem(key, value);
      return true;
    }
  } catch (e) {
    console.warn('AsyncStorage not available', e);
  }
  return false;
};

// ====================== Component: Typewriter ======================
const TypewriterText: React.FC = () => {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const typingSpeed = 100;
  const deletingSpeed = 50;
  const delayAfterTyping = 1500;
  const texts = [
    "Bứt Phá Mọi Giới Hạn",
    "Không Gì Là Không Thể",
    "Chinh Phục Mục Tiêu",
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
      } else if (isDeleting && updatedText === "") {
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
    <View style={styles.typewriterContainer}>
      <Text style={styles.headerText}>
        {text}
        <Text style={styles.cursor}>|</Text>
      </Text>
    </View>
  );
};

// ====================== Main Screen ======================
type RootStackParamList = {
  Login: undefined;
  RegisterScreen: undefined;
  HomeScreen: undefined;
};

type LoginScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "Login">;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    DB.initDB().catch((e) => console.error('DB init error', e));
    GoogleSignin.configure({
      webClientId: '974277955893-gjoh8fku0r4k1v4o296i9qa1gtd8utg9.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // --- Logic Đăng nhập Local ---
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Thông báo", "Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }
    setLoading(true);
    try {
      const user = await DB.validateUserLocal(username.trim(), password);
      if (!user) {
        Alert.alert('Đăng nhập thất bại', 'Tên đăng nhập hoặc mật khẩu không đúng.');
        setLoading(false);
        return;
      }
      await safeSetCurrentUserId('currentUserId', String(user.id));
      console.log("Login success:", user.username);
      navigation.replace('HomeScreen');
    } catch (e) {
      console.error('Login error', e);
      Alert.alert('Lỗi', 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // --- Logic Đăng nhập Google ---
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const gUser: any = (userInfo as any).user || (userInfo as any);
      const email = gUser.email;
      const gUsername = gUser.name || gUser.email || 'GoogleUser';

      await DB.initDB();
      let existing = await DB.getUserByEmailLocal(email);
      let localId: any;
      if (!existing) {
        localId = await DB.createUserLocal({
          uid: gUser.id || '',
          email,
          username: gUsername,
          password: '',
          role: 'user',
        });
      } else {
        localId = existing.id;
      }
      await safeSetCurrentUserId('currentUserId', String(localId));
      navigation.replace('HomeScreen');
    } catch (error: any) {
      console.error('Google Sign-in error:', error);
      Alert.alert('Đăng nhập thất bại', 'Không thể kết nối với Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Decorative Circles Background */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.contentContainer}>
          
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>GYM<Text style={{color: '#2563EB'}}>FLOW</Text></Text>
            </View>
            <TypewriterText />
            <Text style={styles.welcomeText}>Chào mừng bạn quay trở lại!</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            
            {/* Username Input */}
            <View style={styles.inputWrapper}>
              {/* Thay Ionicons bằng Image user.png */}
              <Image 
                source={require("../../assets/user.png")} 
                style={styles.inputIconImage} 
                resizeMode="contain"
              />
              <TextInput
                style={styles.input}
                placeholder="Tên đăng nhập"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              {/* Thay Ionicons bằng Image lock.png */}
              <Image 
                source={require("../../assets/lock.png")} 
                style={styles.inputIconImage} 
                resizeMode="contain"
              />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Image
                  source={
                    showPassword
                      ? require("../../assets/eye-off.png")
                      : require("../../assets/eye.png")
                  }
                  style={styles.eyeIconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPasswordButton}>
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.orText}>Hoặc tiếp tục với</Text>
              <View style={styles.line} />
            </View>

            {/* Google Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Image
                source={require("../../assets/google.png")}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>Đăng nhập bằng Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <Text style={styles.footerText}>Bạn chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("RegisterScreen")}>
              <Text style={styles.signupText}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ====================== Styles ======================
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ffffff" 
  },
  // Decorative Background Circles
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#EBF3FF',
  },
  circle2: {
    position: 'absolute',
    top: 100,
    left: -80,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F5F7FA',
  },
  
  keyboardView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  
  // Header Styles
  header: { 
    alignItems: "center", 
    marginBottom: 35 
  },
  logoContainer: {
    marginBottom: 10,
  },
  logoText: {
    fontSize: 42,
    fontWeight: "900",
    color: "#1A1A1A",
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  typewriterContainer: {
    height: 30, // Fixed height to prevent jump
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB", // Modern Blue
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cursor: { 
    color: "#2563EB", 
    fontWeight: "600" 
  },
  welcomeText: {
    marginTop: 8,
    fontSize: 14,
    color: "#888",
  },

  // Form Styles
  formContainer: { 
    width: "100%" 
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6FA", // Soft gray background
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent", // Clean look
  },
  // Style mới cho icon ảnh
  inputIconImage: {
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: "#666", // Đổi màu ảnh thành màu xám cho hợp
  },
  input: {
    flex: 1,
    color: "#1A1A1A",
    fontSize: 16,
    fontWeight: "500",
  },
  eyeButton: {
    padding: 8,
  },
  eyeIconImage: {
    width: 20,
    height: 20,
    tintColor: "#999",
  },
  
  forgotPasswordButton: { 
    alignSelf: "flex-end", 
    marginBottom: 24 
  },
  forgotPasswordText: { 
    color: "#666", 
    fontSize: 14, 
    fontWeight: "600" 
  },

  // Button Styles
  loginButton: {
    backgroundColor: "#2563EB",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8, // Android shadow
  },
  loginButtonText: { 
    color: "#ffffff", 
    fontSize: 18, 
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#EEEEEE",
  },
  orText: {
    color: "#999",
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: "500",
  },

  // Google Button
  googleButton: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: { 
    width: 24, 
    height: 24, 
    marginRight: 10 
  },
  googleButtonText: { 
    fontSize: 16, 
    color: "#1A1A1A", 
    fontWeight: "600" 
  },

  // Footer
  footer: { 
    flexDirection: "row", 
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: { 
    color: "#666", 
    fontSize: 15 
  },
  signupText: { 
    color: "#2563EB", 
    fontWeight: "700", 
    fontSize: 15 
  },
});

export default LoginScreen;