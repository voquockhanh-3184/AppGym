import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    StatusBar,
    Dimensions,
    ImageBackground,
    Linking, 
    Alert,
    Modal,
    FlatList
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAdmin } from "../../src/auth/helpers";
import { useTheme } from "../../src/context/ThemeContext";
import DB from "../../src/db/sqlite"; 

const { width, height } = Dimensions.get('window');

export default function CourseDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { course } = route.params || {};

    const { theme } = useTheme();
    const isDark = theme === "dark";

    const colors = {
        background: isDark ? "#121212" : "#FFFFFF",
        text: isDark ? "#FFFFFF" : "#1A1A1A",
        subtext: isDark ? "#A0A0A0" : "#666666",
        primary: "#007AFF",
        accent: "#FF9500",
        danger: "#FF3B30", 
        success: "#34C759",
        cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
        divider: isDark ? "#333" : "#F0F0F0",
        overlay: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
        modalBg: isDark ? "#1E1E1E" : "#FFFFFF", 
    };

    const [isAdminUser, setIsAdminUser] = useState(false);
    const [isTrainer, setIsTrainer] = useState(false);
    
    const [reviews, setReviews] = useState<any[]>([]);
    const [ptReviews, setPtReviews] = useState<any[]>([]);
    const [ptReviewsVisible, setPtReviewsVisible] = useState(false);
    const [stats, setStats] = useState({ course: { avg: 0, count: 0 }, pt: { avg: 0, count: 0 } });
    
    const [ptPhoto, setPtPhoto] = useState<string | null>(null);
    // ✅ State lưu ID huấn luyện viên để chat
    const [ptId, setPtId] = useState<number | null>(null);

    const [isRegistered, setIsRegistered] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    
    const [reRegisterModalVisible, setReRegisterModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (!course?.id) return;

            const fetchData = async () => {
                const reviewData = await DB.getReviewsByCourse(course.id);
                setReviews(reviewData);

                if (course.ptName) {
                    const ptData = await DB.getReviewsByPT(course.ptName);
                    setPtReviews(ptData);

                    // ✅ SỬA LẠI: Lấy cả ID và PHOTO của PT
                    try {
                        const ptUserRes = await DB.executeSql(
                            "SELECT id, photoURL FROM users WHERE username = ? LIMIT 1",
                            [course.ptName]
                        );
                        if (ptUserRes.rows.length > 0) {
                            const ptData = ptUserRes.rows.item(0);
                            setPtPhoto(ptData.photoURL);
                            setPtId(ptData.id); // Lưu ID để dùng cho chat
                        }
                    } catch (e) {
                        console.log("Error fetching PT photo/id:", e);
                    }
                }

                const newStats = await DB.calculateAverageRatings(course.id, course.ptName);
                setStats(newStats);

                const adminStatus = await isAdmin();
                setIsAdminUser(adminStatus);

                const idStr = await AsyncStorage.getItem("currentUserId");
                if (idStr) {
                    const uid = parseInt(idStr);
                    setCurrentUserId(uid);
                    
                    const userRes = await DB.executeSql("SELECT role FROM users WHERE id = ? LIMIT 1", [uid]);
                    if (userRes.rows.length > 0 && userRes.rows.item(0).role === 'trainer') {
                        setIsTrainer(true);
                    }

                    if (!adminStatus && !(userRes.rows.length > 0 && userRes.rows.item(0).role === 'trainer')) {
                        const checkReg = await DB.executeSql(
                            `SELECT * FROM payments WHERE user_id = ? AND course_id = ?`, 
                            [uid, course.id]
                        );

                        if (checkReg.rows.length > 0) {
                            setIsRegistered(true);
                            
                            const attendanceCheck = await DB.executeSql(
                                `SELECT COUNT(*) as attended_count 
                                 FROM attendance a
                                 JOIN classes cl ON a.class_id = cl.id
                                 WHERE a.user_id = ? 
                                 AND cl.course_id = ? 
                                 AND (a.status = 'present' OR a.status = 'late')`,
                                [uid, course.id]
                            );
                            
                            const attendedCount = attendanceCheck.rows.length > 0 ? attendanceCheck.rows.item(0).attended_count : 0;
                            const totalSessions = course.sessions || 0;

                            if (attendedCount >= totalSessions && totalSessions > 0) {
                                setIsCompleted(true);
                                setIsRegistered(false); 
                            } else {
                                setIsCompleted(false);
                            }
                        } else {
                            setIsRegistered(false);
                            setIsCompleted(false);
                        }
                    }
                }
            };

            fetchData();
        }, [course])
    );

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "--/--";
        try {
            return new Date(dateString).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' });
        } catch { return "--/--"; }
    };

    const handleMainAction = () => {
        if (isCompleted) {
            setReRegisterModalVisible(true);
        } else if (isRegistered) {
            setCancelModalVisible(true);
        } else {
            navigation.navigate("PaymentScreen", { course });
        }
    };

    const confirmReRegister = () => {
        setReRegisterModalVisible(false);
        navigation.navigate("PaymentScreen", { course });
    };

    const confirmCancel = async () => {
        if (!currentUserId || !course?.id) return;
        const success = await DB.cancelRegistration(currentUserId, course.id);
        setCancelModalVisible(false); 
        if (success) {
            try {
                const userName = await AsyncStorage.getItem("currentUserName") || "Một học viên";
                await DB.addNotification("Hủy đăng ký khóa học", `${userName} vừa hủy đăng ký khóa học: ${course.title}.`, "cancel");
            } catch (err) {}
            setIsRegistered(false); 
            setTimeout(() => setSuccessModalVisible(true), 300);
        } else {
            Alert.alert("Lỗi", "Không thể hủy khóa học lúc này.");
        }
    };

    const handleSuccessClose = () => {
        setSuccessModalVisible(false);
        navigation.goBack();
    };
    
    const handleOpenMap = () => {
        const facility = course?.facility;
        if (!facility || facility === "Chưa cập nhật") {
            Alert.alert("Thông báo", "Địa điểm tập luyện chưa được cung cấp.");
            return;
        }
        const encodedFacility = encodeURIComponent(facility);
        const mapUrl = `https://maps.google.com/maps?q=${encodedFacility}`;
        Linking.openURL(mapUrl).catch(err => Alert.alert("Lỗi", "Không thể mở ứng dụng bản đồ."));
    };

    // ✅ HÀM XỬ LÝ CHUYỂN SANG MÀN HÌNH CHAT
    const handleChatWithTrainer = () => {
        if (!currentUserId) {
            Alert.alert("Thông báo", "Vui lòng đăng nhập để chat với huấn luyện viên.");
            return;
        }
        if (!ptId) {
            Alert.alert("Thông báo", "Không tìm thấy thông tin huấn luyện viên.");
            return;
        }
        if (currentUserId === ptId) {
            Alert.alert("Thông báo", "Bạn không thể chat với chính mình.");
            return;
        }

        // Chuyển sang màn hình Chat với params
        navigation.navigate("ChatScreen", { 
            receiverId: ptId, 
            receiverName: course.ptName,
            receiverAvatar: ptPhoto
        });
    };

    const renderReviewItem = (item: any) => {
        const isMe = currentUserId && (item.user_id === currentUserId);

        return (
            <View key={item.id} style={[styles.reviewCard, { backgroundColor: isDark ? '#2C2C2E' : '#F5F7FA' }]}>
                <View style={styles.reviewHeader}>
                    <Image source={item.photoURL ? { uri: item.photoURL } : require("../../assets/user.png")} style={styles.reviewerAvatar} />
                    <View style={{ flex: 1 }}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                            <Text style={[styles.reviewerName, { color: colors.text }]}>
                                {item.username || "Người dùng ẩn danh"} 
                                {isMe ? <Text style={{color: colors.primary, fontWeight: '800'}}> (Bạn)</Text> : ""}
                            </Text>
                            <Text style={{ color: colors.subtext, fontSize: 11 }}>{formatDate(item.created_at)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', marginTop: 2 }}>
                            {[...Array(5)].map((_, i) => (
                                <Image key={i} source={require("../../assets/star.png")} style={{ width: 12, height: 12, marginRight: 2, tintColor: i < item.rating ? '#FFD700' : colors.subtext }} />
                            ))}
                        </View>
                    </View>
                </View>
                <Text style={[styles.reviewComment, { color: colors.text, marginTop: 8 }]}>{item.comment}</Text>
            </View>
        );
    };

    const getButtonConfig = () => {
        if (isCompleted) {
            return { 
                text: "Đăng Ký Lại Ngay", 
                colors: ['#FF9500', '#EF6C00'], 
                icon: require("../../assets/refresh.png") 
            };
        }
        if (isRegistered) {
            return { 
                text: "Hủy Khóa Học", 
                colors: [colors.danger, '#D32F2F'], 
                icon: require("../../assets/delete.png") 
            };
        }
        return { 
            text: "Mở Khóa Ngay", 
            colors: ['#007AFF', '#0056b3'], 
            icon: require("../../assets/lock.png") 
        };
    };

    const btnConfig = getButtonConfig();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={styles.headerContainer}>
                <ImageBackground source={{ uri: course?.image || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" }} style={styles.headerImage} resizeMode="cover">
                    <LinearGradient colors={["rgba(0,0,0,0.6)", "transparent", colors.background]} style={styles.gradientOverlay} />
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Image source={require("../../assets/back.png")} style={styles.backIcon} />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.tagContainer}><Text style={styles.tagText}>PREMIUM COURSE</Text></View>
                        <Text style={styles.headerTitle}>{course?.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <Image source={require("../../assets/star.png")} style={{ width: 18, height: 18, tintColor: '#FFD700', marginRight: 6 }} />
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{stats.course.avg > 0 ? stats.course.avg : "Chưa có đánh giá"}</Text>
                            {stats.course.count > 0 && (<Text style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 6 }}>({stats.course.count} lượt)</Text>)}
                        </View>
                    </View>
                </ImageBackground>
            </View>

            <View style={[styles.bodyContainer, { backgroundColor: colors.cardBg }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View style={styles.instructorRow}>
                        <Image 
                            source={ptPhoto ? { uri: ptPhoto } : require("../../assets/instructor.png")} 
                            style={[styles.instructorAvatar, { backgroundColor: colors.divider }]} 
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.instructorLabel, { color: colors.subtext }]}>Huấn luyện viên</Text>
                            <Text style={[styles.instructorName, { color: colors.text, marginBottom: 4 }]}>{course?.ptName || "Đang cập nhật"}</Text>
                            {stats.pt.count > 0 ? (
                                <TouchableOpacity onPress={() => setPtReviewsVisible(true)} activeOpacity={0.7}>
                                    <View style={[styles.ratingBadge, { backgroundColor: isDark ? '#333' : '#FFF9C4' }]}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: isDark ? '#FFD700' : '#F57F17', marginRight: 4 }}>{stats.pt.avg}</Text>
                                        <Image source={require("../../assets/star.png")} style={{ width: 12, height: 12, tintColor: isDark ? '#FFD700' : '#FBC02D', marginRight: 6 }} />
                                        <Text style={{ color: colors.subtext, fontSize: 12 }}>({stats.pt.count} đánh giá)</Text>
                                        <Image source={require("../../assets/right-arrow.png")} style={{ width: 10, height: 10, tintColor: colors.subtext, marginLeft: 4 }} />
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>Chưa có đánh giá</Text>
                            )}
                        </View>
                        
                        {/* ✅ GẮN HÀM XỬ LÝ VÀO NÚT CHAT */}
                        {/* <TouchableOpacity 
                            style={[styles.chatBtn, { borderColor: colors.divider, backgroundColor: isDark ? '#333' : '#fff' }]}
                            onPress={handleChatWithTrainer}
                        >
                             <Image source={require("../../assets/chat.png")} style={{ width: 20, height: 20, tintColor: colors.primary }} />
                        </TouchableOpacity> */}
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                    <View style={styles.statsGrid}>
                        <StatItem label="Số buổi" value={`${course?.sessions || 0}`} icon={require("../../assets/dumbbell.png")} colors={colors} />
                        <View style={[styles.verticalLine, { backgroundColor: colors.divider }]} />
                        <StatItem label="Bắt đầu" value={formatDate(course?.startDate)} icon={require("../../assets/calendar.png")} colors={colors} />
                        <View style={[styles.verticalLine, { backgroundColor: colors.divider }]} />
                        <StatItem label="Kết thúc" value={formatDate(course?.endDate)} icon={require("../../assets/clock.png")} colors={colors} />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Về khóa học này</Text>
                    <Text style={[styles.description, { color: colors.subtext }]}>{course?.description || "Khóa học được thiết kế đặc biệt..."}</Text>
                    
                    <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 24 }]}>Địa điểm tập luyện</Text>
                    <TouchableOpacity style={[styles.locationBox, { backgroundColor: isDark ? '#2C2C2E' : '#F5F7FA' }]} onPress={handleOpenMap} activeOpacity={0.7}>
                        <Image source={require("../../assets/location.png")} style={{ width: 24, height: 24, tintColor: colors.primary, marginRight: 12 }} />
                        <Text style={{ color: colors.text, flex: 1, fontSize: 15 }}>{course?.facility || "Chưa cập nhật"}</Text>
                        <Image source={require("../../assets/right-arrow.png")} style={{ width: 16, height: 16, tintColor: colors.subtext }} />
                    </TouchableOpacity>

                    <View style={{ marginTop: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={[styles.sectionHeader, { color: colors.text, marginBottom: 0 }]}>Đánh giá khóa học</Text>
                            {reviews.length > 3 && (<Text style={{ color: colors.primary, fontSize: 14 }}>Xem tất cả</Text>)}
                        </View>
                        {reviews.length > 0 ? reviews.slice(0, 3).map((item) => renderReviewItem(item)) : <Text style={{ color: colors.subtext, fontStyle: 'italic', marginTop: 5 }}>Chưa có đánh giá nào cho khóa học này.</Text>}
                    </View>
                </ScrollView>
            </View>

            {!isAdminUser && !isTrainer && (
                <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.divider }]}>
                    <View>
                        {isCompleted ? (
                            <Text style={{ color: colors.success, fontSize: 14, fontWeight: 'bold' }}>Đã hoàn thành</Text>
                        ) : (
                            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 2 }}>{isRegistered ? "Đã đăng ký" : "Tổng chi phí"}</Text>
                        )}
                        <Text style={{ color: isRegistered ? colors.success : colors.accent, fontSize: 22, fontWeight: 'bold' }}>
                            {isRegistered ? "Thành viên" : `${course?.price ? course.price.toLocaleString() : "0"} đ`}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleMainAction} activeOpacity={0.8}>
                        <LinearGradient colors={btnConfig.colors} style={styles.payButton} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
                            <Image source={btnConfig.icon} style={{ width: 18, height: 18, tintColor: '#fff', marginRight: 8 }} />
                            <Text style={styles.payButtonText}>{btnConfig.text}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            <Modal visible={reRegisterModalVisible} transparent animationType="fade" onRequestClose={() => setReRegisterModalVisible(false)}>
                <View style={modalStyles.overlay}>
                    <View style={[modalStyles.container, { backgroundColor: colors.modalBg }]}>
                        <View style={[modalStyles.iconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                            <Image source={require("../../assets/refresh.png")} style={{ width: 32, height: 32, tintColor: '#FF9500' }} />
                        </View>
                        
                        <Text style={[modalStyles.title, { color: colors.text }]}>Đăng ký lại?</Text>
                        <Text style={[modalStyles.message, { color: colors.subtext }]}>
                            Bạn đã hoàn thành khóa học này. Bạn có muốn đăng ký lại để tiếp tục tập luyện không?
                        </Text>
                        
                        <View style={modalStyles.buttonRow}>
                            <TouchableOpacity 
                                style={[modalStyles.button, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} 
                                onPress={() => setReRegisterModalVisible(false)}
                            >
                                <Text style={[modalStyles.btnText, { color: colors.text }]}>Để sau</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[modalStyles.button, { backgroundColor: '#FF9500', marginLeft: 12 }]} 
                                onPress={confirmReRegister}
                            >
                                <Text style={[modalStyles.btnText, { color: '#fff' }]}>Đồng ý</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
                <View style={modalStyles.overlay}>
                    <View style={[modalStyles.container, { backgroundColor: colors.modalBg }]}>
                        <Text style={[modalStyles.title, { color: colors.text }]}>Hủy khóa học?</Text>
                        <Text style={[modalStyles.message, { color: colors.subtext }]}>Bạn có chắc chắn muốn hủy đăng ký khóa học này?</Text>
                        <View style={modalStyles.buttonRow}>
                            <TouchableOpacity style={[modalStyles.button, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} onPress={() => setCancelModalVisible(false)}><Text style={[modalStyles.btnText, { color: colors.text }]}>Không</Text></TouchableOpacity>
                            <TouchableOpacity style={[modalStyles.button, { backgroundColor: '#FF3B30', marginLeft: 12 }]} onPress={confirmCancel}><Text style={[modalStyles.btnText, { color: '#fff' }]}>Đồng ý Hủy</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={successModalVisible} transparent animationType="fade" onRequestClose={handleSuccessClose}>
                <View style={modalStyles.overlay}>
                    <View style={[modalStyles.container, { backgroundColor: colors.modalBg }]}>
                        <Image source={require("../../assets/success.png")} style={{ width: 32, height: 32, tintColor: '#34C759', marginBottom: 15 }} />
                        <Text style={[modalStyles.title, { color: colors.text }]}>Thành công</Text>
                        <Text style={[modalStyles.message, { color: colors.subtext }]}>Đã hủy khóa học thành công.</Text>
                        <TouchableOpacity style={[modalStyles.fullButton, { backgroundColor: '#34C759' }]} onPress={handleSuccessClose}><Text style={[modalStyles.btnText, { color: '#fff' }]}>OK</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={ptReviewsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPtReviewsVisible(false)}>
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                        <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Đánh giá Huấn luyện viên</Text>
                        <TouchableOpacity onPress={() => setPtReviewsVisible(false)} style={styles.closeModalBtn}>
                            <Image source={require("../../assets/close.png")} style={{ width: 24, height: 24, tintColor: colors.text }} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={ptReviews}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({item}) => renderReviewItem(item)}
                        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                        ListHeaderComponent={() => (
                            <View style={{ alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                                <Text style={{ fontSize: 16, color: colors.subtext, marginBottom: 8 }}>Tổng điểm trung bình</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 48, fontWeight: 'bold', color: colors.text, marginRight: 10 }}>{stats.pt.avg}</Text>
                                    <View>
                                        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                                            {[...Array(5)].map((_, i) => (
                                                <Image key={i} source={require("../../assets/star.png")} style={{ width: 18, height: 18, marginRight: 2, tintColor: i < Math.round(stats.pt.avg) ? '#FFD700' : colors.subtext }} />
                                            ))}
                                        </View>
                                        <Text style={{ color: colors.subtext }}>Dựa trên {stats.pt.count} đánh giá</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 50 }}><Image source={require("../../assets/star.png")} style={{ width: 60, height: 60, tintColor: colors.divider, marginBottom: 10 }} /><Text style={{ color: colors.subtext }}>Chưa có đánh giá nào.</Text></View>}
                    />
                </View>
            </Modal>
        </View>
    );
}

const StatItem = ({ label, value, icon, colors }: any) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
        <View style={{ backgroundColor: colors.divider, padding: 8, borderRadius: 50, marginBottom: 6 }}>
            <Image source={icon} style={{ width: 18, height: 18, tintColor: colors.text }} resizeMode="contain" />
        </View>
        <Text style={{ color: colors.subtext, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 15 }}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    headerContainer: { height: height * 0.45, width: '100%' },
    headerImage: { width: '100%', height: '100%', justifyContent: 'flex-end' },
    gradientOverlay: { ...StyleSheet.absoluteFillObject },
    backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40, left: 20, width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    backIcon: { width: 20, height: 20, tintColor: '#fff' },
    headerContent: { padding: 24, paddingBottom: 50 },
    tagContainer: { backgroundColor: '#007AFF', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
    tagText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 36 },
    bodyContainer: { flex: 1, marginTop: -30, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 30 },
    instructorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    instructorAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 14 },
    instructorLabel: { fontSize: 12, marginBottom: 2 },
    instructorName: { fontSize: 18, fontWeight: 'bold' },
    chatBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    divider: { height: 1, width: '100%', marginVertical: 20 },
    verticalLine: { width: 1, height: 40 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionHeader: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
    description: { fontSize: 15, lineHeight: 24 },
    locationBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginTop: 5 },
    reviewCard: { padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginTop: 4 },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    reviewerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#eee' },
    reviewerName: { fontWeight: '700', fontSize: 14, marginBottom: 2 },
    reviewComment: { fontSize: 14, lineHeight: 22 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 20 },
    payButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, shadowColor: "#007AFF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    payButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, marginTop: Platform.OS === 'ios' ? 40 : 0 },
    modalHeaderTitle: { fontSize: 18, fontWeight: 'bold' },
    closeModalBtn: { padding: 5 }
});

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    container: { width: '85%', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
    iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 59, 48, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    message: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    buttonRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    button: { flex: 1, paddingVertical: 12, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    fullButton: { width: '100%', paddingVertical: 12, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    btnText: { fontSize: 15, fontWeight: 'bold' }
});