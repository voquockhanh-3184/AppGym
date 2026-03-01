import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  PermissionsAndroid,
  Platform,
  Dimensions,
  StatusBar,
  Modal,
  Linking,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DB from "../../src/db/sqlite";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTheme } from "../../src/context/ThemeContext";
import Geolocation from "react-native-geolocation-service";
import LinearGradient from "react-native-linear-gradient";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

const { width } = Dimensions.get("window");

// ✅ HELPER: Hàm chuẩn hóa hiển thị ngày về DD/MM/YYYY
const formatToVNDate = (dateString: string) => {
    if (!dateString) return "";
    // Nếu đã là DD/MM/YYYY thì giữ nguyên
    if (dateString.includes('/') && dateString.split('/')[2].length === 4) return dateString;
    
    // Nếu là YYYY-MM-DD (2025-12-28) -> chuyển thành 28/12/2025
    if (dateString.includes('-')) {
        const parts = dateString.split('-'); // [2025, 12, 28]
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
    return dateString;
};

export default function ClassDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { classId } = route.params;
  const mapRef = useRef<MapView>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [classInfo, setClassInfo] = useState<any>(null);
  const [gymLocation, setGymLocation] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState({ 
      type: 'success', title: '', message: '' 
  });

  const colors = {
    background: isDark ? "#121212" : "#F2F4F8",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A1A1A",
    subtext: isDark ? "#A0A0A0" : "#8E8E93",
    primary: "#007AFF",
    secondary: "#00C6FF",
    success: "#34C759",
    accent: "#FF3B30",
    iconBg: isDark ? "#2C2C2E" : "#F0F8FF",
    border: isDark ? "#333" : "#E5E5EA",
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showPopup = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
      setPopupData({ type, title, message });
      setPopupVisible(true);
  };

  const getFormattedTime = () => {
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const seconds = currentTime.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const loadData = async () => {
    try {
      await DB.initDB();
      const currentUserId = await AsyncStorage.getItem("currentUserId");
      
      const res = await DB.executeSql("SELECT * FROM classes WHERE id = ?", [classId]);
      if (res.rows.length > 0) {
        const cls = res.rows.item(0);
        setClassInfo(cls);

        const branchRes = await DB.executeSql("SELECT * FROM gym_branch WHERE name = ? LIMIT 1", [cls.facility]);
        if (branchRes.rows.length > 0) {
            const branch = branchRes.rows.item(0);
            if (branch.latitude && branch.longitude) {
                setGymLocation({
                    latitude: branch.latitude,
                    longitude: branch.longitude,
                    address: branch.address
                });
            }
        }

        if (currentUserId) {
            const attRes = await DB.executeSql(
                "SELECT status FROM attendance WHERE class_id = ? AND user_id = ? LIMIT 1", 
                [classId, parseInt(currentUserId)]
            );
            if (attRes.rows.length > 0) {
                const status = attRes.rows.item(0).status;
                if (status === 'present' || status === 'late') {
                    setIsCheckedIn(true);
                } else {
                    setIsCheckedIn(false);
                }
            } else {
                setIsCheckedIn(false);
            }
        }
      } else {
        showPopup('error', "Lỗi", "Lớp học không tồn tại.");
        navigation.goBack();
      }
    } catch (err) {
      console.log("LOAD CLASS ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), getCurrentUserLocation()]);
    setRefreshing(false);
  }, [classId]);

  useEffect(() => {
    loadData();
    getCurrentUserLocation(); 
  }, []);

  const hasLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted';
    }
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            return false;
        }
    }
    return false;
  };

  const getCurrentUserLocation = async () => {
      const hasPermission = await hasLocationPermission();
      if (hasPermission) {
          Geolocation.getCurrentPosition(
              (position) => {
                  setUserLocation({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude
                  });
              },
              (error) => console.log(error),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
      }
  };

  const openExternalMap = () => {
    if (!gymLocation) {
        showPopup('warning', 'Chưa có tọa độ', 'Cơ sở này chưa cập nhật vị trí trên bản đồ.');
        return;
    }

    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${gymLocation.latitude},${gymLocation.longitude}`;
    const label = classInfo?.facility || 'Phòng tập';
    
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
        Linking.openURL(url).catch(() => showPopup('error', 'Lỗi', 'Không thể mở ứng dụng bản đồ.'));
    }
  };

  const handleCheckin = async () => {
    if (!classInfo || isCheckedIn) return;
    setCheckingIn(true);

    try {
      const hasPermission = await hasLocationPermission();
      if (!hasPermission) {
        showPopup('warning', "Cần quyền", "Vui lòng cấp quyền vị trí.");
        setCheckingIn(false);
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => processCheckinLogic(position),
        (error) => {
          console.log("📍 GPS Error:", error);
          showPopup('error', "Lỗi GPS", "Không thể lấy vị trí.");
          setCheckingIn(false);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
      );
    } catch (error) {
      console.log("CRASH PREVENTED:", error);
      setCheckingIn(false);
      showPopup('error', "Lỗi", "Đã xảy ra lỗi không xác định.");
    }
  };

  // ✅ CẬP NHẬT LOGIC CHECK TIME: Xử lý cả 2 định dạng ngày
  const checkTimeValidity = (classDateStr: string, classTimeStr: string) => {
    try {
      let day, month, year;
      
      // Xử lý định dạng YYYY-MM-DD
      if (classDateStr.includes('-')) {
          const parts = classDateStr.split('-').map(Number);
          year = parts[0];
          month = parts[1];
          day = parts[2];
      } 
      // Xử lý định dạng DD/MM/YYYY
      else {
          const parts = classDateStr.split('/').map(Number);
          day = parts[0];
          month = parts[1];
          year = parts[2];
      }

      const [hours, minutes] = classTimeStr.split(':').map(Number);
      
      const classDateTime = new Date(year, month - 1, day, hours, minutes);
      const now = new Date();

      const isSameDay = 
        now.getDate() === classDateTime.getDate() &&
        now.getMonth() === classDateTime.getMonth() &&
        now.getFullYear() === classDateTime.getFullYear();

      if (!isSameDay) {
        if (now < classDateTime) {
            return { status: 'invalid', message: 'Chưa đến ngày học.', lateText: '' };
        } else {
            return { status: 'invalid', message: 'Lớp học đã kết thúc từ ngày trước.', lateText: '' };
        }
      }

      const diffMs = now.getTime() - classDateTime.getTime();
      const diffMinutes = Math.ceil(diffMs / 60000);

      if (diffMinutes < -60) {
          return { status: 'invalid', message: 'Bạn đến quá sớm (chỉ mở điểm danh trước 60 phút).', lateText: '' };
      }

      if (diffMinutes <= 0) {
        return { status: 'present', lateText: '', message: '' };
      } else {
        let lateString = "";
        if (diffMinutes >= 60) {
            const h = Math.floor(diffMinutes / 60);
            const m = diffMinutes % 60;
            lateString = m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
        } else {
            lateString = `${diffMinutes} phút`;
        }
        return { status: 'late', lateText: lateString, message: '' };
      }

    } catch (e) {
      console.log("Date parse error:", e);
      return { status: 'present', lateText: '', message: '' };
    }
  };

  const processCheckinLogic = async (position: any) => {
       try {
      const timeCheck = checkTimeValidity(classInfo.date, classInfo.time);
      
      if (timeCheck.status === 'invalid') {
          showPopup('error', "Sai thời gian", timeCheck.message || '');
          setCheckingIn(false);
          return;
      }

      const { latitude: userLat, longitude: userLong } = position.coords;
      setUserLocation({ latitude: userLat, longitude: userLong });

      if (!gymLocation) {
         showPopup('error', "Lỗi dữ liệu", `Không tìm thấy tọa độ cơ sở: ${classInfo.facility}`);
         setCheckingIn(false);
         return;
      }

      const distanceMeters = getDistanceFromLatLonInM(userLat, userLong, gymLocation.latitude, gymLocation.longitude);
      const ALLOWED_RADIUS = 200; 

      if (distanceMeters > ALLOWED_RADIUS) {
        showPopup(
            'error', 
            "Sai địa điểm", 
            `Bạn đang cách phòng tập ${distanceMeters.toFixed(0)}m (Yêu cầu < ${ALLOWED_RADIUS}m).\nVui lòng đến đúng địa điểm.`
        );
        setCheckingIn(false);
        return;
      }

      const currentUserId = await AsyncStorage.getItem("currentUserId");
        
      if (currentUserId) {
          await DB.updateAttendanceStatus(classId, parseInt(currentUserId), timeCheck.status);
          
          setIsCheckedIn(true);

          if (timeCheck.status === 'present') {
             showPopup('success', "Điểm danh thành công!", `Bạn đến đúng giờ.\nKhoảng cách: ${distanceMeters.toFixed(0)}m.`);
          } else {
             showPopup('warning', "Điểm danh thành công (Trễ)", `Bạn đi trễ ${timeCheck.lateText}.\nKhoảng cách: ${distanceMeters.toFixed(0)}m.`);
          }
      } else {
          showPopup('error', "Lỗi", "Không tìm thấy thông tin người dùng.");
      }

    } catch (err) {
      console.log("Lỗi Logic:", err);
      showPopup('error', "Lỗi hệ thống", "Có lỗi xảy ra khi xử lý.");
    } finally {
      setCheckingIn(false);
    }
  };

  function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; 
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
  }

  function deg2rad(deg: number) { return deg * (Math.PI / 180); }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chi Tiết Lớp Học</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]} 
                tintColor={colors.primary} 
            />
        }
      >
        {/* THÔNG TIN VÉ */}
        <View style={[styles.ticketContainer, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.decorativeBar} />
            <View style={styles.ticketContent}>
                <Text style={[styles.categoryLabel, { color: colors.primary }]}>TÊN LỚP</Text>
                <Text style={[styles.className, { color: colors.text }]}>{classInfo.className}</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.subtext }]}>Ngày</Text>
                        {/* ✅ SỬA: Dùng hàm formatToVNDate để hiển thị thống nhất */}
                        <Text style={[styles.infoValue, { color: colors.text }]}>{formatToVNDate(classInfo.date)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.subtext }]}>Thời gian</Text>
                        <Text style={[styles.infoValue, { fontSize: 20, color: colors.primary }]}>{classInfo.time}</Text>
                    </View>
                </View>
                <View style={{ marginTop: 20 }}>
                    <InfoRow icon={require("../../assets/coach.png")} label="Huấn luyện viên" value={classInfo.ptName || "Chưa cập nhật"} colors={colors} />
                    <InfoRow icon={require("../../assets/location.png")} label="Địa điểm" value={classInfo.facility} colors={colors} />
                </View>
            </View>
            <View style={styles.ticketRip}>
                <View style={[styles.circle, { left: -10, backgroundColor: colors.background }]} />
                <View style={[styles.dashedLine, { borderColor: colors.subtext }]} />
                <View style={[styles.circle, { right: -10, backgroundColor: colors.background }]} />
            </View>
            <View style={styles.ticketFooter}>
                <Image source={require("../../assets/information.png")} style={{ width: 40, height: 40, tintColor: colors.subtext, opacity: 0.5 }} />
                <Text style={{ color: colors.subtext, fontSize: 12, marginLeft: 10, flex: 1 }}>
                    Vui lòng đến đúng giờ để điểm danh. Hệ thống sử dụng GPS.
                </Text>
            </View>
        </View>

        {/* BẢN ĐỒ */}
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Bản đồ</Text>
            <View style={[styles.mapContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                {gymLocation ? (
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        initialRegion={{
                            latitude: gymLocation.latitude,
                            longitude: gymLocation.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                    >
                        <Marker 
                            coordinate={{ latitude: gymLocation.latitude, longitude: gymLocation.longitude }} 
                            title={classInfo.facility}
                            description={gymLocation.address}
                        >
                            <Image source={require("../../assets/location.png")} style={{width: 32, height: 32, tintColor: '#FF3B30'}} resizeMode="contain" />
                        </Marker>

                        {userLocation && (
                            <Marker 
                                coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }} 
                                title="Vị trí của bạn"
                            >
                                <View style={styles.userDot}>
                                    <View style={styles.userDotInner} />
                                </View>
                            </Marker>
                        )}
                        
                        {userLocation && (
                             <Polyline
                                coordinates={[
                                    { latitude: userLocation.latitude, longitude: userLocation.longitude },
                                    { latitude: gymLocation.latitude, longitude: gymLocation.longitude }
                                ]}
                                strokeColor={colors.primary}
                                strokeWidth={2}
                                lineDashPattern={[5, 5]} 
                             />
                        )}

                    </MapView>
                ) : (
                    <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: colors.subtext }}>Đang tải bản đồ hoặc chưa có tọa độ...</Text>
                    </View>
                )}

                <TouchableOpacity style={[styles.directionsBtn, { backgroundColor: colors.card }]} onPress={openExternalMap}>
                    <Image source={require("../../assets/location.png")} style={{ width: 20, height: 20, tintColor: colors.primary, marginRight: 8 }} />
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Chỉ đường</Text>
                </TouchableOpacity>
            </View>
        </View>

      </ScrollView>

      {/* FOOTER CHECKIN */}
      <View style={[styles.footerAction, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={[styles.statusDot, { backgroundColor: userLocation ? '#34C759' : '#FF9500' }]} />
            <Text style={{ color: colors.subtext, fontSize: 13, marginLeft: 6 }}>
                {userLocation ? 'GPS đã sẵn sàng' : 'Đang tìm vị trí... (Kéo xuống để tải lại)'}
            </Text>
        </View>
        
        <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={handleCheckin} 
            disabled={checkingIn || isCheckedIn} 
            style={styles.shadowBtn}
        >
             <LinearGradient 
                colors={isCheckedIn ? [colors.success, colors.success] : checkingIn ? ["#999", "#999"] : [colors.primary, colors.secondary]} 
                start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
                style={styles.btnCheckin}
            >
                {checkingIn ? ( <ActivityIndicator color="#fff" /> ) : (
                    <>
                        <Image 
                            source={isCheckedIn ? require("../../assets/success.png") : require("../../assets/location.png")} 
                            style={{ width: 22, height: 22, tintColor: '#fff', marginRight: 8 }} 
                        />
                        <Text style={styles.txtCheckin}>
                            {isCheckedIn ? "ĐÃ ĐIỂM DANH" : `ĐIỂM DANH • ${getFormattedTime()}`}
                        </Text>
                    </>
                )}
             </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* MODAL POPUP */}
      <Modal visible={popupVisible} transparent animationType="fade">
        <View style={styles.popupOverlay}>
            <View style={[styles.popupContainer, { backgroundColor: colors.card }]}>
                <View style={[styles.popupIconBox, { 
                    backgroundColor: popupData.type === 'success' ? 'rgba(52, 199, 89, 0.1)' : popupData.type === 'error' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 149, 0, 0.1)'
                }]}>
                    <Image 
                        source={popupData.type === 'success' ? require("../../assets/success.png") : popupData.type === 'error' ? require("../../assets/close.png") : require("../../assets/information.png")} 
                        style={{ 
                            width: 40, 
                            height: 40, 
                            tintColor: popupData.type === 'error' ? undefined : (popupData.type === 'success' ? '#34C759' : '#FF9500')
                        }} 
                    />
                </View>
                <Text style={[styles.popupTitle, { color: colors.text }]}>{popupData.title}</Text>
                <Text style={[styles.popupMessage, { color: colors.subtext }]}>{popupData.message}</Text>
                <TouchableOpacity style={[styles.popupButton, { backgroundColor: colors.primary }]} onPress={() => setPopupVisible(false)}>
                    <Text style={styles.popupButtonText}>Đóng</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const InfoRow = ({ icon, label, value, colors }: any) => (
    <View style={styles.rowContainer}>
        <View style={[styles.iconBox, { backgroundColor: colors.iconBg }]}>
            <Image source={icon} style={{ width: 20, height: 20, tintColor: colors.primary }} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.subtext, marginBottom: 2 }}>{label}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 50 : 70, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  backIcon: { width: 20, height: 20 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  ticketContainer: { borderRadius: 20, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, marginBottom: 20 },
  decorativeBar: { height: 6, width: '100%' },
  ticketContent: { padding: 24 },
  categoryLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 5, opacity: 0.8 },
  className: { fontSize: 26, fontWeight: 'bold', lineHeight: 32 },
  divider: { height: 1, width: '100%', marginVertical: 20, opacity: 0.5 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 13, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '700' },
  rowContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  ticketRip: { height: 20, flexDirection: 'row', alignItems: 'center', position: 'relative', zIndex: 10, backgroundColor: 'transparent' },
  circle: { width: 20, height: 20, borderRadius: 10, position: 'absolute' },
  dashedLine: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 1, marginHorizontal: 15, opacity: 0.3 },
  ticketFooter: { padding: 20, paddingTop: 10, flexDirection: 'row', alignItems: 'center', opacity: 0.8 },
  footerAction: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  shadowBtn: { shadowColor: "#007AFF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  btnCheckin: { flexDirection: 'row', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  txtCheckin: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  popupOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  popupContainer: { width: '85%', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  popupIconBox: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  popupTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  popupMessage: { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  popupButton: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  popupButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  mapContainer: { height: 220, borderRadius: 16, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  directionsBtn: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4
  },
  userDot: {
      width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0, 122, 255, 0.3)',
      justifyContent: 'center', alignItems: 'center'
  },
  userDotInner: {
      width: 10, height: 10, borderRadius: 5, backgroundColor: '#007AFF',
      borderWidth: 1, borderColor: '#fff'
  }
});