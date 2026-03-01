import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    Image,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { launchImageLibrary } from "react-native-image-picker";
import { useTheme } from "../../src/context/ThemeContext";
import { addSubExerciseLocal } from "../../src/db/sqlite"; 
import Video from "react-native-video";

// Danh sách các vùng cơ bắp để chọn
const AVAILABLE_TAGS = [
    'Cơ mông', 'Cơ đùi trước', 'Cơ đùi sau', 'Cơ bắp chân', 
    'Cơ bụng', 'Cơ ngực', 'Cơ lưng', 'Cơ tay', 'Cơ vai'
];

export default function AddSubExercisesScreen() {
    const navigation = useNavigation<any>();

    const { theme } = useTheme();
    const isDark = theme === "dark";

    const colors = {
        bg: isDark ? "#0d0d0d" : "#F9FAFB",
        card: isDark ? "#1c1c1e" : "#fff",
        text: isDark ? "#fff" : "#111",
        subtext: isDark ? "#aaa" : "#666",
        border: isDark ? "#333" : "#E5E7EB",
        primary: "#007AFF",
        inputBg: isDark ? "#2C2C2E" : "#F3F4F6",
    };

    const [name, setName] = useState("");
    const [type, setType] = useState<"time" | "rep">("rep");
    const [detail, setDetail] = useState("");
    
    // 1. VIDEO BÀI TẬP (Mô phỏng/Loop - Hiển thị bên ngoài)
    const [video, setVideo] = useState<string | null>(null);
    // const [videoLinkInput, setVideoLinkInput] = useState(""); // Không cần state link cho video mô phỏng nữa

    // 2. VIDEO HƯỚNG DẪN (Chi tiết - Nằm trong mục hướng dẫn)
    const [instructionVideo, setInstructionVideo] = useState<string | null>(null);
    const [instructionVideoLinkInput, setInstructionVideoLinkInput] = useState("");

    const [instruction, setInstruction] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [muscleImage, setMuscleImage] = useState<string | null>(null);
    
    const [saving, setSaving] = useState(false);

    // --- HÀM CHỌN MEDIA ---

    // Chọn Video bài tập (Mô phỏng)
    const pickVideo = () => {
        launchImageLibrary({ mediaType: "video" }, (res) => {
            if (res.assets && res.assets.length > 0) {
                setVideo(res.assets[0].uri ?? null);
            }
        });
    };

    // Chọn Video hướng dẫn
    const pickInstructionVideo = () => {
        launchImageLibrary({ mediaType: "video" }, (res) => {
            if (res.assets && res.assets.length > 0) {
                setInstructionVideo(res.assets[0].uri ?? null);
                setInstructionVideoLinkInput("");
            }
        });
    };

    // Chọn Ảnh Cơ bắp
    const pickMuscleImage = () => {
        launchImageLibrary({ mediaType: "photo" }, (res) => {
            if (res.assets && res.assets.length > 0) {
                setMuscleImage(res.assets[0].uri ?? null);
            }
        });
    };

    // --- HÀM XÓA MEDIA ---
    const removeVideo = () => { setVideo(null); };
    const removeInstructionVideo = () => { setInstructionVideo(null); setInstructionVideoLinkInput(""); };
    const removeMuscleImage = () => { setMuscleImage(null); };

    // --- HÀM XỬ LÝ LINK INPUT (Chỉ cho video hướng dẫn) ---
    const handleInstructionVideoLinkChange = (text: string) => {
        setInstructionVideoLinkInput(text);
        setInstructionVideo(text.trim().length > 0 ? text.trim() : null);
    };

    // Hàm chọn/bỏ chọn Tag
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(prev => prev.filter(t => t !== tag));
        } else {
            setSelectedTags(prev => [...prev, tag]);
        }
    };

    const save = async () => {
        if (!name.trim()) return Alert.alert("Thiếu thông tin", "Vui lòng nhập tên bài tập");
        if (!detail.trim()) return Alert.alert("Thiếu thông tin", "Vui lòng nhập số lượng hoặc thời gian");

        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                type,
                count: parseInt(detail) || 0,
                video_path: video || "", // Video mô phỏng
                instruction: instruction.trim(),
                focus_area: JSON.stringify(selectedTags),
                muscle_image: muscleImage || "",
                instruction_video: instructionVideo || "" // Video hướng dẫn mới
            };

            await addSubExerciseLocal(payload);
            
            Alert.alert("Thành công", `Bài tập con "${name.trim()}" đã được tạo.`);
            navigation.navigate("ExerciseSettingScreen");

        } catch (e) {
            console.error(e);
            Alert.alert("Lỗi", "Có lỗi xảy ra khi lưu bài tập.");
        } finally {
            setSaving(false);
        }
    };

    // Component con để render khung upload video (tái sử dụng)
    const renderVideoUploader = (
        label: string, 
        videoUri: string | null, 
        linkInput: string, 
        onPick: () => void, 
        onRemove: () => void, 
        onLinkChange: (text: string) => void,
        placeholderLink: string = "https://example.com/video.mp4",
        showLinkInput: boolean = true // ✅ Thêm tham số điều khiển hiển thị ô nhập link
    ) => (
        <View style={{ marginTop: 15 }}>
            <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>{label}</Text>
            
            {/* Input Link - Chỉ hiển thị nếu showLinkInput = true */}
            {showLinkInput && (
                <View style={{marginBottom: 10}}>
                    <Text style={[styles.subLabel, { color: colors.subtext, marginBottom: 5 }]}>Nhập URL hoặc chọn file từ máy:</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, height: 45, paddingVertical: 0 }]}
                        placeholder={placeholderLink}
                        placeholderTextColor={colors.subtext}
                        value={linkInput}
                        onChangeText={onLinkChange}
                        autoCapitalize="none"
                    />
                </View>
            )}

            {/* Picker / Preview */}
            {!videoUri ? (
                <TouchableOpacity 
                    onPress={onPick} 
                    style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.inputBg, height: 120 }]}
                >
                    <Image source={require("../../assets/camera.png")} style={{ width: 32, height: 32, tintColor: colors.primary, opacity: 0.8 }} />
                    <Text style={{ color: colors.primary, marginTop: 8, fontWeight: "600" }}>Tải video lên</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.videoContainer}>
                    <Video
                        source={{ uri: videoUri }}
                        style={styles.videoPreview}
                        muted
                        repeat
                        resizeMode="cover"
                        onError={(e) => console.log("Video Error:", e)}
                    />
                    <TouchableOpacity onPress={onRemove} style={styles.removeVideoBtn}>
                        <Image source={require("../../assets/close.png")} style={{ width: 12, height: 12, tintColor: "#fff" }} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}
                >
                    <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Tạo Bài Tập Con</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={{ height: 10 }} /> 

                    {/* TÊN BÀI TẬP */}
                    <Text style={[styles.label, { color: colors.text }]}>Tên bài tập con <Text style={{color: 'red'}}>*</Text></Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
                        placeholder="Ví dụ: Hít đất, Plank..."
                        placeholderTextColor={colors.subtext}
                        value={name}
                        onChangeText={setName}
                    />

                    {/* LOẠI BÀI TẬP */}
                    <Text style={[styles.label, { color: colors.text }]}>Loại bài tập</Text>
                    <View style={[styles.toggleContainer, { backgroundColor: colors.inputBg }]}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, type === "rep" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2 }]}
                            onPress={() => setType("rep")}
                        >
                            <Text style={[styles.toggleText, { color: type === "rep" ? colors.primary : colors.subtext, fontWeight: type === "rep" ? "700" : "500" }]}>
                                Số lần (Reps)
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toggleBtn, type === "time" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2 }]}
                            onPress={() => setType("time")}
                        >
                            <Text style={[styles.toggleText, { color: type === "time" ? colors.primary : colors.subtext, fontWeight: type === "time" ? "700" : "500" }]}>
                                Thời gian (Time)
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* CHI TIẾT SỐ LƯỢNG */}
                    <Text style={[styles.label, { color: colors.text }]}>
                        {type === "rep" ? "Số lần thực hiện" : "Thời gian thực hiện (giây)"} <Text style={{color: 'red'}}>*</Text>
                    </Text>
                    <TextInput
                        keyboardType="numeric"
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
                        placeholder={type === "rep" ? "Ví dụ: 12" : "Ví dụ: 45"}
                        placeholderTextColor={colors.subtext}
                        value={detail}
                        onChangeText={setDetail}
                    />

                    {/* 1. VIDEO BÀI TẬP (MÔ PHỎNG - BÊN NGOÀI) - ĐÃ BỎ LINK */}
                    {renderVideoUploader(
                        "Video mô phỏng bài tập (Hoạt hình/Loop)", 
                        video, 
                        "", // Không dùng link input
                        pickVideo, 
                        removeVideo, 
                        () => {}, // Không xử lý link change
                        "",
                        false // showLinkInput = false
                    )}

                    {/* --- KHU VỰC HƯỚNG DẪN CHI TIẾT --- */}
                    <View style={{marginTop: 25, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10}}>
                        <Text style={[styles.sectionHeader, {color: colors.primary}]}>PHẦN HƯỚNG DẪN</Text>
                        
                        {/* HƯỚNG DẪN TEXT */}
                        <Text style={[styles.label, { color: colors.text }]}>Nội dung hướng dẫn</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                            placeholder="Nhập hướng dẫn chi tiết cách tập..."
                            placeholderTextColor={colors.subtext}
                            multiline
                            value={instruction}
                            onChangeText={setInstruction}
                        />

                        {/* 2. VIDEO HƯỚNG DẪN (CHI TIẾT - CÓ LINK) */}
                        {renderVideoUploader(
                            "Video hướng dẫn chi tiết (Kèm lời nói/Giải thích)", 
                            instructionVideo, 
                            instructionVideoLinkInput, 
                            pickInstructionVideo, 
                            removeInstructionVideo, 
                            handleInstructionVideoLinkChange,
                            "URL Video hướng dẫn (YouTube/MP4)...",
                            true // showLinkInput = true
                        )}
                    </View>

                    {/* --- KHU VỰC VÙNG TẬP TRUNG --- */}
                    <View style={{marginTop: 25, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10}}>
                        <Text style={[styles.sectionHeader, {color: colors.primary}]}>CƠ BẮP & VÙNG TẬP TRUNG</Text>
                        
                        <Text style={[styles.label, { color: colors.text }]}>Chọn vùng tập trung</Text>
                        <View style={styles.tagsWrapper}>
                            {AVAILABLE_TAGS.map((tag) => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <TouchableOpacity
                                        key={tag}
                                        onPress={() => toggleTag(tag)}
                                        style={[
                                            styles.tagChip,
                                            { 
                                                backgroundColor: isSelected ? colors.primary : colors.inputBg,
                                                borderColor: isSelected ? colors.primary : 'transparent'
                                            }
                                        ]}
                                    >
                                        <Text style={{ 
                                            color: isSelected ? '#fff' : colors.text,
                                            fontWeight: isSelected ? '700' : '400',
                                            fontSize: 13
                                        }}>
                                            {tag}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Chọn Ảnh Cơ bắp */}
                        <View style={{ marginTop: 10 }}>
                            <Text style={[styles.subLabel, { color: colors.subtext }]}>Ảnh minh họa cơ bắp (Tùy chọn)</Text>
                            {!muscleImage ? (
                                <TouchableOpacity 
                                    onPress={pickMuscleImage} 
                                    style={[styles.miniUploadArea, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                >
                                    <Image source={require("../../assets/camera.png")} style={{ width: 24, height: 24, tintColor: colors.primary, opacity: 0.8 }} />
                                    <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: "600" }}>Chọn ảnh cơ bắp</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.imagePreviewContainer}>
                                    <Image source={{ uri: muscleImage }} style={styles.imagePreview} resizeMode="contain" />
                                    <TouchableOpacity onPress={removeMuscleImage} style={styles.removeBtn}>
                                        <Image source={require("../../assets/close.png")} style={{ width: 10, height: 10, tintColor: "#fff" }} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* BUTTON SAVE */}
            <View style={[styles.footer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <TouchableOpacity
                    onPress={saving ? undefined : save}
                    style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                    disabled={saving}
                >
                    {saving ? (
                         <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                            Lưu & Tiếp tục
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    /* Header */
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        paddingBottom: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    backIcon: { width: 20, height: 20, resizeMode: "contain" },
    headerTitle: { fontSize: 18, fontWeight: "700" },

    /* Content */
    scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

    label: { fontSize: 14, fontWeight: "600", marginTop: 20, marginBottom: 8 },
    subLabel: { fontSize: 12, marginBottom: 5 },
    sectionHeader: { fontSize: 16, fontWeight: "800", marginTop: 10, marginBottom: 5 },

    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },

    /* Toggle Type */
    toggleContainer: {
        flexDirection: "row",
        borderRadius: 12,
        padding: 4,
        height: 50,
    },
    toggleBtn: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
    },
    toggleText: {
        fontSize: 14,
    },

    /* Tags Area */
    tagsWrapper: { flexDirection: 'row', flexWrap: 'wrap' },
    tagChip: {
        paddingHorizontal: 14, 
        paddingVertical: 8, 
        borderRadius: 20,
        marginRight: 8, 
        marginBottom: 8, 
        borderWidth: 1,
    },

    /* Image Picker (Mini) */
    miniUploadArea: {
        flexDirection: 'row',
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
    },
    imagePreviewContainer: {
        marginTop: 5,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        height: 150,
        backgroundColor: '#000'
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: 6,
        borderRadius: 20,
    },

    /* Video Upload */
    uploadArea: {
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
    },
    videoContainer: {
        marginTop: 5,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        height: 200, // Fixed height for preview
    },
    videoPreview: {
        width: "100%",
        height: "100%", // Fill container
        backgroundColor: "#000",
    },
    removeVideoBtn: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: 8,
        borderRadius: 20,
    },

    /* Footer Button */
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
    },
    saveBtn: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
});