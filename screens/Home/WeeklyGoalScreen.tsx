import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, Dimensions, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from "../../src/context/ThemeContext";

const getAsyncStorage = () => {
  return require('@react-native-async-storage/async-storage')?.default || require('@react-native-async-storage/async-storage');
};

const { width } = Dimensions.get('window');

// Tính toán kích thước
const PADDING_HORIZONTAL = 24 * 2;
const GAP = 12;
const COLUMNS = 4;
const ITEM_SIZE = (width - PADDING_HORIZONTAL - (GAP * (COLUMNS - 1))) / COLUMNS;

const DAYS_OPTIONS = [
    { label: "Thứ 2", value: 1 },
    { label: "Thứ 7", value: 6 },
    { label: "Chủ Nhật", value: 0 },
];

const WeeklyGoalScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme(); 
  const isDark = theme === "dark";

  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [startDayIndex, setStartDayIndex] = useState(1); 
  const [modalVisible, setModalVisible] = useState(false);

  const colors = {
    bg: isDark ? "#0d0d0d" : "#ffffff",
    text: isDark ? "#ffffff" : "#222222",
    subText: isDark ? "#888888" : "#666666",
    primary: "#0055FF", 
    border: isDark ? "#333" : "#E5E5E5",
    cardBg: isDark ? "#1e1e1e" : "#f9f9f9",
    modalBg: isDark ? "#1e1e1e" : "#ffffff",
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const AsyncStorage = getAsyncStorage();
        const savedDays = await AsyncStorage.getItem('weeklyGoalDays');
        if (savedDays) setDaysPerWeek(parseInt(savedDays, 10));
        
        const savedStartIndex = await AsyncStorage.getItem('startDayOfWeekIndex');
        if (savedStartIndex !== null) setStartDayIndex(parseInt(savedStartIndex, 10));
      } catch (e) { console.warn(e); }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
        const AsyncStorage = getAsyncStorage();
        await AsyncStorage.setItem('weeklyGoalDays', daysPerWeek.toString());
        await AsyncStorage.setItem('startDayOfWeekIndex', startDayIndex.toString());
        navigation.goBack();
    } catch (e) { console.warn(e); }
  };

  const getDayLabel = (index: number) => {
      const day = DAYS_OPTIONS.find(d => d.value === index);
      return day ? day.label : "Thứ 2";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Image source={require("../../assets/right-arrow.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Đặt mục tiêu hàng tuần{'\n'}của bạn</Text>
        <Text style={[styles.description, { color: colors.subText }]}>
          Chúng tôi khuyến nghị tập luyện ít nhất 3 ngày mỗi tuần để có kết quả tốt hơn.
        </Text>

        {/* Chọn số ngày */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                 <Image source={require("../../assets/trainer.png")} style={styles.sectionIcon} />
                 <Text style={[styles.sectionTitle, { color: colors.subText }]}>Ngày tập luyện hàng tuần</Text>
            </View>
            <View style={styles.daysGrid}>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const isSelected = daysPerWeek === num;
                    return (
                        <TouchableOpacity
                            key={num}
                            activeOpacity={0.8}
                            style={[
                                styles.dayOption, 
                                { 
                                    backgroundColor: isSelected ? colors.primary : colors.bg, 
                                    borderColor: isSelected ? colors.primary : colors.border 
                                }
                            ]}
                            onPress={() => setDaysPerWeek(num)}
                        >
                            <Text style={[styles.dayOptionText, { color: isSelected ? "#fff" : colors.text, fontWeight: isSelected ? '700' : '400' }]}>{num}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>

        {/* Chọn ngày đầu tuần */}
        <View style={styles.sectionContainer}>
             <View style={styles.sectionHeader}>
                 <Image source={{uri: "https://cdn-icons-png.flaticon.com/512/2693/2693507.png"}} style={[styles.sectionIcon, { tintColor: colors.subText }]} />
                 <Text style={[styles.sectionTitle, { color: colors.subText }]}>Ngày đầu tiên của tuần</Text>
            </View>
            
            <TouchableOpacity 
                activeOpacity={0.7} 
                style={[styles.dropdown, { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={{fontSize: 16, fontWeight: '700', color: colors.text}}>
                    {getDayLabel(startDayIndex).toUpperCase()}
                </Text>
                <Image source={require("../../assets/right-arrow.png")} style={{width: 14, height: 14, transform: [{rotate: '90deg'}], tintColor: colors.text}} />
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      {/* Modal chọn ngày */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn ngày bắt đầu</Text>
                <FlatList
                    data={DAYS_OPTIONS}
                    keyExtractor={(item) => item.value.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[styles.modalItem, item.value === startDayIndex && { backgroundColor: colors.primary + '20' }]}
                            onPress={() => { setStartDayIndex(item.value); setModalVisible(false); }}
                        >
                            <Text style={[styles.modalItemText, { color: item.value === startDayIndex ? colors.primary : colors.text }]}>{item.label}</Text>
                            {item.value === startDayIndex && <Image source={require("../../assets/success.png")} style={{ width: 16, height: 16, tintColor: colors.primary }} />}
                        </TouchableOpacity>
                    )}
                />
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Text style={{ color: colors.subText }}>Đóng</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // 1. Đẩy header xuống
  header: { 
      paddingHorizontal: 20, 
      paddingTop: 20, // Tăng padding top
      marginTop: 10,  // Thêm margin top để tách khỏi mép màn hình
  },
  backButton: { padding: 5 },
  backIcon: { width: 20, height: 20, transform: [{rotate: '180deg'}] },
  
  // 2. Đẩy nội dung chính xuống sâu hơn
  content: { 
      flex: 1, 
      paddingHorizontal: 24, 
      alignItems: 'center', 
      paddingTop: 60 // Tăng từ 40 lên 60
  },
  
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  description: { textAlign: 'center', fontSize: 14, marginBottom: 50, paddingHorizontal: 10 },
  
  sectionContainer: { width: '100%', marginBottom: 35 }, 
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, 
  sectionIcon: { width: 20, height: 20, marginRight: 8, resizeMode: 'contain' },
  sectionTitle: { fontSize: 15, fontWeight: '500' },
  
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: GAP },
  
  dayOption: { 
      width: ITEM_SIZE, 
      height: ITEM_SIZE, 
      borderRadius: 14, 
      borderWidth: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginBottom: 5 
  },
  dayOptionText: { fontSize: 20 },
  
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, width: '100%' },
  footer: { padding: 20, paddingBottom: 30 },
  saveButton: { width: '100%', paddingVertical: 16, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '50%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: '#ccc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16 },
  closeButton: { marginTop: 15, alignItems: 'center', padding: 10 }
});

export default WeeklyGoalScreen;