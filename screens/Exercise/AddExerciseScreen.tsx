import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Image,
    SafeAreaView,
    Platform,
    KeyboardAvoidingView,
    StatusBar,
    Modal,
    FlatList
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DB, { getAllCategories, addCategory } from '../../src/db/sqlite'; 
import { useNavigation } from '@react-navigation/native';

const AddExerciseScreen = () => {
    const navigation = useNavigation<any>();

    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [difficulty, setDifficulty] = useState('Dễ');
    const [exerciseCount, setExerciseCount] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // State Modal Danh mục
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    // State Modal Thành công
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [newExerciseId, setNewExerciseId] = useState<number | null>(null);

    // ✅ State Modal Lỗi (Thay cho Alert mặc định)
    const [errorModalVisible, setErrorModalVisible] = useState(false);

    const colors = {
        background: "#F5F7FA",
        card: "#FFFFFF",
        text: "#1F2937",
        subtext: "#9CA3AF",
        primary: "#007AFF",
        border: "#E5E7EB",
        inputBg: "#F9FAFB",
        warning: "#FF9500", // Màu cam cho cảnh báo
        danger: "#FF3B30"
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        const cats = await getAllCategories();
        setCategoriesList(cats);
    };

    const handleAddNewCategory = async () => {
        if (!newCategoryName.trim()) return;
        await addCategory(newCategoryName);
        setNewCategoryName('');
        setIsAddingCategory(false);
        loadCategories(); 
    };

    const handleChooseImage = async () => {
        try {
            const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
            if (result.assets && result.assets.length > 0) {
                setImage(result.assets[0].uri || null);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
        }
    };

    const handleAdd = async () => {
        // ✅ Thay thế Alert bằng Modal Custom
        if (!title.trim() || !category.trim()) {
            setErrorModalVisible(true);
            return;
        }

        setSaving(true);
        try {
            await DB.initDB();
            const newId = await DB.addExerciseLocal({
                title: title.trim(),
                category: category.trim(),
                time: '',
                difficulty: difficulty.trim() || 'Dễ',
                exerciseCount: Number(exerciseCount) || 0,
                image: image || 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
            });

            if (newId) {
                setNewExerciseId(newId);
                setSuccessModalVisible(true);

                // --- KHÔNG RESET FORM Ở ĐÂY NỮA ---
                // Giữ lại giá trị để người dùng có thể thấy bài tập cha vừa tạo

            } else {
                Alert.alert('Lỗi', 'Không thể tạo bài tập (ID trả về rỗng).');
            }
            
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể thêm bài tập.');
        } finally {
            setSaving(false);
        }
    };

    // ✅ ĐIỀU HƯỚNG ĐẾN MÀN HÌNH CHỌN/GÁN BÀI TẬP CON (SelectSubExercisesScreen)
    const handleGoToSubExercises = () => {
        setSuccessModalVisible(false);
        if (newExerciseId) {
            // Chuyển sang màn hình chọn/gán bài tập con
            navigation.navigate("SelectSubExercisesScreen", { exerciseId: newExerciseId });
        }
    };

    const handleCloseSuccess = () => {
        setSuccessModalVisible(false);
        navigation.goBack();
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            
            {/* --- HEADER ĐÃ CHỈNH SỬA PADDING --- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Image source={require("../../assets/back.png")} style={{ width: 20, height: 20, tintColor: '#333' }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo bài tập mới</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    
                    {/* ẢNH BÌA */}
                    <Text style={styles.label}>Ảnh mô tả</Text>
                    <TouchableOpacity style={styles.imagePicker} onPress={handleChooseImage}>
                        {image ? (
                            <>
                                <Image source={{ uri: image }} style={styles.previewImage} />
                                <View style={styles.editBadge}><Image source={require("../../assets/edit.png")} style={{ width: 14, height: 14, tintColor: '#fff' }} /></View>
                            </>
                        ) : (
                            <View style={styles.placeholderContainer}>
                                <Image source={require("../../assets/camera.png")} style={{ width: 32, height: 32, tintColor: colors.primary, marginBottom: 8 }} />
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>Chọn ảnh từ thư viện</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.formContainer}>
                        
                        {/* Tên bài tập */}
                        <Text style={styles.label}>Tên bài tập <Text style={{color: 'red'}}>*</Text></Text>
                        <TextInput
                            placeholder="Ví dụ: Full Body Workout"
                            placeholderTextColor={colors.subtext}
                            value={title}
                            onChangeText={setTitle}
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                        />

                        {/* DANH MỤC */}
                        <Text style={styles.label}>Nhóm cơ / Danh mục <Text style={{color: 'red'}}>*</Text></Text>
                        <TouchableOpacity 
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, justifyContent: 'center' }]}
                            onPress={() => setCategoryModalVisible(true)}
                        >
                            <Text style={{ color: category ? colors.text : colors.subtext, fontSize: 15 }}>
                                {category || "Chọn danh mục..."}
                            </Text>
                        </TouchableOpacity>

                        {/* Số lượng bài */}
                        <Text style={styles.label}>Số lượng bài tập con (Dự kiến)</Text>
                        <TextInput
                            placeholder="Ví dụ: 5"
                            placeholderTextColor={colors.subtext}
                            value={exerciseCount}
                            onChangeText={setExerciseCount}
                            keyboardType="numeric"
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                        />

                        {/* Độ khó */}
                        <Text style={styles.label}>Độ khó</Text>
                        <View style={styles.difficultyRow}>
                            {['Dễ', 'Trung bình', 'Khó'].map(level => {
                                const isActive = difficulty === level;
                                return (
                                    <TouchableOpacity
                                        key={level}
                                        style={[styles.difficultyItem, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                        onPress={() => setDifficulty(level)}
                                    >
                                        <Text style={[styles.difficultyText, isActive && { color: '#fff', fontWeight: 'bold' }]}>{level}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* BUTTON FOOTER */}
            <View style={styles.footer}>
                <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.7 }]} onPress={!saving ? handleAdd : undefined} activeOpacity={0.8}>
                    <Text style={styles.saveButtonText}>{saving ? 'Đang lưu...' : 'Tạo bài tập'}</Text>
                </TouchableOpacity>
            </View>

            {/* 🖼️ MODAL CHỌN DANH MỤC */}
            <Modal visible={categoryModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Chọn danh mục</Text>
                        
                        <FlatList 
                            data={categoriesList}
                            keyExtractor={(item) => item.id.toString()}
                            style={{ maxHeight: 300 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.categoryItem}
                                    onPress={() => { setCategory(item.name); setCategoryModalVisible(false); }}
                                >
                                    <Text style={styles.categoryItemText}>{item.name}</Text>
                                    {category === item.name && <Image source={require("../../assets/success.png")} style={{ width: 18, height: 18, tintColor: colors.primary }} />}
                                </TouchableOpacity>
                            )}
                        />

                        {/* Thêm danh mục mới */}
                        {isAddingCategory ? (
                            <View style={styles.addCategoryRow}>
                                <TextInput 
                                    style={styles.addCategoryInput} 
                                    placeholder="Nhập tên danh mục..." 
                                    value={newCategoryName}
                                    onChangeText={setNewCategoryName}
                                    autoFocus
                                />
                                <TouchableOpacity onPress={handleAddNewCategory} style={styles.addCategoryBtn}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.addNewBtn} onPress={() => setIsAddingCategory(true)}>
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Thêm danh mục mới</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setCategoryModalVisible(false)}>
                            <Text style={{ color: '#666' }}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ✅ MODAL LỖI (POPUP BO TRÒN - THIẾU THÔNG TIN) */}
            <Modal visible={errorModalVisible} transparent animationType="fade">
                <View style={styles.successOverlay}>
                    <View style={styles.successCard}>
                        <View style={[styles.successIconBox, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                            <Image 
                                source={require("../../assets/information.png")} 
                                style={{ width: 36, height: 36, tintColor: colors.warning }} 
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.successTitle}>Thiếu thông tin</Text>
                        <Text style={styles.successMessage}>
                            Vui lòng nhập tên bài tập và chọn danh mục để tiếp tục.
                        </Text>

                        <TouchableOpacity 
                            style={[styles.primaryBtn, { backgroundColor: colors.warning, shadowColor: colors.warning }]} 
                            onPress={() => setErrorModalVisible(false)}
                        >
                            <Text style={styles.primaryBtnText}>Đã hiểu</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ✅ MODAL THÀNH CÔNG */}
            <Modal visible={successModalVisible} transparent animationType="fade">
                <View style={styles.successOverlay}>
                    <View style={styles.successCard}>
                        <View style={styles.successIconBox}>
                            <Image source={require("../../assets/success.png")} style={{ width: 40, height: 40, tintColor: '#34C759' }} />
                        </View>
                        <Text style={styles.successTitle}>Thành công!</Text>
                        <Text style={styles.successMessage}>
                            Bài tập cha đã được tạo thành công. Bạn có muốn thêm bài tập con (ví dụ: Hít đất, Plank...) vào ngay bây giờ không?
                        </Text>

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleGoToSubExercises}>
                            <Text style={styles.primaryBtnText}>Thêm bài tập con</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryBtn} onPress={handleCloseSuccess}>
                            <Text style={styles.secondaryBtnText}>Để sau</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    
    // ✅ HEADER: Tăng paddingTop để thụt xuống
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 16, 
        paddingTop: Platform.OS === 'android' ? 40 : 50, 
        paddingBottom: 12, 
        backgroundColor: '#F5F7FA' 
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#fff', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
    
    imagePicker: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', backgroundColor: '#fff' },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    editBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 },
    formContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F2937', height: 50 },
    difficultyRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    difficultyItem: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
    difficultyText: { fontSize: 14, color: '#6B7280' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    saveButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: "#007AFF", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    /* Modal Styles */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    categoryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
    categoryItemText: { fontSize: 16, color: '#333' },
    addNewBtn: { marginTop: 15, alignSelf: 'center', padding: 10 },
    closeModalBtn: { marginTop: 10, alignSelf: 'center', padding: 10 },
    addCategoryRow: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
    addCategoryInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginRight: 10 },
    addCategoryBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8 },

    /* ✅ SUCCESS/ERROR MODAL STYLES */
    successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    successCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', width: '100%', maxWidth: 340, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 },
    successIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    successTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 10 },
    successMessage: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    primaryBtn: { backgroundColor: '#007AFF', width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, shadowColor: "#007AFF", shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: { paddingVertical: 12, width: '100%', alignItems: 'center' },
    secondaryBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '600' }
});

export default AddExerciseScreen;