import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
  PermissionsAndroid,
  SafeAreaView,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";
import Geolocation from 'react-native-geolocation-service';

import { useTheme } from "../../src/context/ThemeContext";
import DB from "../../src/db/sqlite";
import { useNavigation } from "@react-navigation/native";

// Define Type cho kết quả tìm kiếm địa chỉ
interface AddressResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface GymBranch {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_REGION = {
  latitude: 10.762622,
  longitude: 106.660172,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function GymBranchSettingScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);

  const [branches, setBranches] = useState<any[]>([]);
  
  // State Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editBranch, setEditBranch] = useState<GymBranch | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form Data
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, long: number} | null>(null);
  
  // ✅ STATE MỚI CHO GỢI Ý ĐỊA CHỈ
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Loading states
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false); 

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtitle: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    btn: "#4da3ff",
    inputBg: isDark ? "#2a2a2a" : "#f0f0f0",
    modalBg: isDark ? "#2C2C2E" : "#FFFFFF",
    dropdownBg: isDark ? "#333" : "#fff", // Màu nền dropdown
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await DB.initDB();
    const result = await DB.getAllGymBranches();
    setBranches(result);
  };

  const openAddModal = () => {
    setEditBranch(null);
    setName("");
    setAddress("");
    setSelectedCoords(null);
    setSuggestions([]); // Reset gợi ý
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditBranch(item);
    setName(item.name);
    setAddress(item.address);
    if (item.latitude && item.longitude) {
        setSelectedCoords({ lat: item.latitude, long: item.longitude });
    } else {
        setSelectedCoords(null);
    }
    setSuggestions([]); // Reset gợi ý
    setModalVisible(true);
  };

  // ✅ HÀM TÌM KIẾM ĐỊA CHỈ (AUTOCOMPLETE)
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
        setSuggestions([]);
        return;
    }

    try {
        setIsGeocoding(true);
        // Thêm countrycodes=vn để ưu tiên Việt Nam
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=vn`;
        
        const response = await fetch(url, {
            headers: { 'User-Agent': 'GymApp/1.0' }
        });
        const data = await response.json();
        
        if (Array.isArray(data)) {
            setSuggestions(data);
            setShowSuggestions(true);
        }
    } catch (error) {
        console.log("Lỗi tìm kiếm địa chỉ:", error);
    } finally {
        setIsGeocoding(false);
    }
  };

  // ✅ Xử lý khi nhập liệu (Debounce để không gọi API quá nhiều)
  const handleAddressChange = (text: string) => {
    setAddress(text);
    // Nếu đang gõ, reset tọa độ cũ vì địa chỉ đã thay đổi
    // setSelectedCoords(null); 

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    
    debounceTimeout.current = setTimeout(() => {
        searchAddress(text);
    }, 800); // Đợi 800ms sau khi ngừng gõ mới tìm
  };

  // ✅ Xử lý khi chọn một gợi ý
  const handleSelectSuggestion = (item: AddressResult) => {
    setAddress(item.display_name); // Điền địa chỉ vào ô
    setSelectedCoords({
        lat: parseFloat(item.lat),
        long: parseFloat(item.lon)
    });
    setSuggestions([]); // Ẩn danh sách
    setShowSuggestions(false);
    Keyboard.dismiss(); // Ẩn bàn phím
  };

  const openMapModal = async () => {
    Keyboard.dismiss();
    setMapVisible(true);
    setTimeout(() => {
        const region = selectedCoords ? { 
            latitude: selectedCoords.lat, 
            longitude: selectedCoords.long, 
            latitudeDelta: 0.005, 
            longitudeDelta: 0.005 
        } : DEFAULT_REGION;
        
        if (mapRef.current) mapRef.current.animateToRegion(region, 500);
        if (!selectedCoords) setSelectedCoords({ lat: DEFAULT_REGION.latitude, long: DEFAULT_REGION.longitude });
    }, 200);
  };

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedCoords({ lat: latitude, long: longitude });
  };

  const confirmLocation = () => {
    setMapVisible(false);
  };

  const centerMapToHCM = () => {
    if (mapRef.current) {
        mapRef.current.animateToRegion(DEFAULT_REGION, 500);
    }
    if (!selectedCoords) {
        setSelectedCoords({ lat: DEFAULT_REGION.latitude, long: DEFAULT_REGION.longitude });
    }
  };

  const saveBranch = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên và địa chỉ cơ sở.");
      return;
    }
    const latVal = selectedCoords?.lat || 0;
    const longVal = selectedCoords?.long || 0;

    if (editBranch) {
      await DB.updateGymBranch(editBranch.id, name, address, latVal, longVal);
    } else {
      await DB.insertGymBranch(name, address, latVal, longVal);
    }
    setModalVisible(false);
    loadData();
  };

  const confirmDeleteBranch = (id: number) => {
      setDeleteId(id);
      setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
      if (deleteId !== null) {
          await DB.deleteGymBranch(deleteId);
          setDeleteModalVisible(false);
          setDeleteId(null);
          loadData();
      }
  };

  // Render item trong danh sách gợi ý
  const renderSuggestionItem = ({ item }: { item: AddressResult }) => (
    <TouchableOpacity 
        style={[styles.suggestionItem, { borderBottomColor: colors.border }]} 
        onPress={() => handleSelectSuggestion(item)}
    >
        <View style={styles.suggestionIcon}>
            <Image source={require("../../assets/location.png")} style={{width: 16, height: 16, tintColor: colors.subtitle}} />
        </View>
        <Text style={[styles.suggestionText, { color: colors.text }]}>{item.display_name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}
        >
          <Image source={require("../../assets/back.png")} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quản lý cơ sở</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={{ paddingHorizontal: 16, flex: 1 }}>
        <FlatList
          data={branches}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.address, { color: colors.subtitle }]}>{item.address}</Text>
                {(item.latitude !== 0 && item.longitude !== 0) ? (
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                        <Image source={require("../../assets/location.png")} style={{width: 12, height: 12, tintColor: colors.btn, marginRight: 4}} />
                        <Text style={{ fontSize: 12, color: colors.btn }}>{item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}</Text>
                    </View>
                ) : (
                    <Text style={{ fontSize: 11, color: '#ff4444', marginTop: 4, fontStyle: 'italic' }}>(Chưa có tọa độ)</Text>
                )}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEditModal(item)}><Text style={[styles.editBtn, { color: colors.btn }]}>Sửa</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDeleteBranch(item.id)}><Text style={styles.deleteBtn}>Xóa</Text></TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      <View style={styles.bottomAddContainer}>
        <TouchableOpacity style={[styles.bottomAddButton, { backgroundColor: colors.btn }]} onPress={openAddModal}>
          <Text style={styles.bottomAddText}>+ Thêm Cơ Sở</Text>
        </TouchableOpacity>
      </View>

      {/* ================= MODAL NHẬP THÔNG TIN ================= */}
      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        {/* TouchableWithoutFeedback để đóng dropdown khi bấm ra ngoài */}
        <TouchableWithoutFeedback onPress={() => { setShowSuggestions(false); Keyboard.dismiss(); }}>
            <View style={styles.modalOverlay}>
            <View style={[styles.modalContentNew, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitleNew, { color: colors.text }]}>{editBranch ? "Sửa cơ sở" : "Thêm cơ sở"}</Text>
                
                <Text style={{color: colors.text, marginBottom: 5, fontWeight:'600'}}>Tên cơ sở:</Text>
                <TextInput placeholder="Nhập tên..." placeholderTextColor={colors.subtitle} style={[styles.inputNew, { color: colors.text, borderColor: colors.border }]} value={name} onChangeText={setName}/>

                {/* ✅ PHẦN NHẬP ĐỊA CHỈ CÓ GỢI Ý */}
                <View style={{ zIndex: 1000 }}> 
                    <Text style={{color: colors.text, marginBottom: 5, fontWeight:'600'}}>Địa chỉ:</Text>
                    <View>
                        <TextInput 
                            placeholder="Nhập địa chỉ để tìm kiếm..." 
                            placeholderTextColor={colors.subtitle} 
                            style={[styles.inputNew, { color: colors.text, borderColor: colors.border }]} 
                            value={address} 
                            onChangeText={handleAddressChange}
                            onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                        />
                        {isGeocoding && (
                            <ActivityIndicator 
                                size="small" color={colors.btn} 
                                style={{position: 'absolute', right: 12, top: 12}} 
                            />
                        )}
                    </View>

                    {/* ✅ DROPDOWN GỢI Ý */}
                    {showSuggestions && suggestions.length > 0 && (
                        <View style={[styles.suggestionsContainer, { backgroundColor: colors.dropdownBg, borderColor: colors.border }]}>
                            <FlatList
                                data={suggestions}
                                keyExtractor={(item) => item.place_id.toString()}
                                renderItem={renderSuggestionItem}
                                keyboardShouldPersistTaps="handled"
                                style={{ maxHeight: 200 }} // Giới hạn chiều cao
                            />
                        </View>
                    )}
                </View>

                <Text style={{color: colors.text, marginBottom: 5, fontWeight:'600', marginTop: 10}}>Vị trí trên bản đồ:</Text>
                <TouchableOpacity 
                    style={[styles.mapSelectBtn, { borderColor: colors.btn, backgroundColor: isDark ? 'rgba(77, 163, 255, 0.1)' : '#f0f9ff' }]} 
                    onPress={openMapModal}
                >
                    <Image source={require("../../assets/location.png")} style={{width: 18, height: 18, tintColor: colors.btn, marginRight: 8}} />
                    
                    {selectedCoords ? (
                        <Text style={{color: colors.btn, fontWeight: '600'}}>Đã chọn: {selectedCoords.lat.toFixed(5)}, {selectedCoords.long.toFixed(5)}</Text>
                    ) : (
                        <Text style={{color: colors.btn, fontStyle: 'italic'}}>
                            Nhấn để xem/chọn trên Map
                        </Text>
                    )}
                </TouchableOpacity>

                <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtnNew} onPress={() => setModalVisible(false)}><Text style={[styles.cancelTextNew, { color: colors.subtitle }]}>Hủy</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtnNew, { backgroundColor: colors.btn }]} onPress={saveBranch}><Text style={styles.saveTextNew}>Lưu</Text></TouchableOpacity>
                </View>
            </View>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ================= MODAL XÓA ================= */}
      <Modal transparent visible={deleteModalVisible} animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContentNew, { backgroundColor: colors.card, alignItems: 'center' }]}>
                <View style={{width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16}}>
                      <Image source={require("../../assets/delete.png")} style={{width: 24, height: 24, tintColor: '#ff4444'}} /> 
                </View>
                <Text style={[styles.modalTitleNew, { color: colors.text, marginBottom: 8 }]}>Xóa cơ sở?</Text>
                <Text style={{ color: colors.subtitle, textAlign: 'center', marginBottom: 24 }}>
                    Hành động này không thể hoàn tác.
                </Text>
                <View style={styles.modalBtnRow}>
                    <TouchableOpacity style={[styles.cancelBtnNew, {flex: 1, alignItems: 'center'}]} onPress={() => setDeleteModalVisible(false)}>
                        <Text style={[styles.cancelTextNew, { color: colors.subtitle }]}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBtnNew, { backgroundColor: '#ff4444', flex: 1, alignItems: 'center', marginLeft: 10}]} onPress={handleDelete}>
                        <Text style={styles.saveTextNew}>Xóa bỏ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* ================= MODAL BẢN ĐỒ ================= */}
      <Modal visible={mapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
        <View style={{flex: 1}}>
            <MapView
                ref={mapRef}
                style={{flex: 1}}
                initialRegion={selectedCoords ? { latitude: selectedCoords.lat, longitude: selectedCoords.long, latitudeDelta: 0.01, longitudeDelta: 0.01 } : DEFAULT_REGION}
                onPress={handleMapPress}
                showsUserLocation={true} 
                showsMyLocationButton={false} 
            >
                {selectedCoords && <Marker coordinate={{latitude: selectedCoords.lat, longitude: selectedCoords.long}} title="Vị trí đã chọn"/>}
            </MapView>
            <View style={[styles.mapHeaderOverlay, {backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center'}]}>
                <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 16}}>Chạm vào bản đồ để chọn</Text>
                <TouchableOpacity style={{ marginLeft: 12, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.btn, borderRadius: 10 }} onPress={centerMapToHCM}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>TP. HCM</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.mapFooterOverlay}>
                 <TouchableOpacity style={[styles.confirmMapBtn, {backgroundColor: '#ff4444', marginRight: 10}]} onPress={() => setMapVisible(false)}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Hủy</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.confirmMapBtn, {backgroundColor: colors.btn}]} onPress={confirmLocation}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Xác nhận vị trí</Text>
                 </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 10, paddingBottom: 10, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  card: { padding: 14, borderRadius: 14, marginBottom: 12, flexDirection: "row", borderWidth: 1 },
  title: { fontSize: 16, fontWeight: "600" },
  address: { marginTop: 3, fontSize: 13 },
  actions: { justifyContent: "space-between", alignItems: "flex-end", marginLeft: 10 },
  editBtn: { fontSize: 14, fontWeight: "600" },
  deleteBtn: { fontSize: 14, fontWeight: "600", color: "#ff4444", marginTop: 10 },
  bottomAddContainer: { position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" },
  bottomAddButton: { width: "82%", paddingVertical: 14, borderRadius: 30, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  bottomAddText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContentNew: { width: "95%", paddingVertical: 22, paddingHorizontal: 20, borderRadius: 22, alignSelf: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  modalTitleNew: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 18 },
  inputNew: { width: "100%", borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, marginBottom: 14 },
  mapSelectBtn: { width: '100%', paddingVertical: 12, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  modalBtnRow: { width: "100%", marginTop: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cancelBtnNew: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelTextNew: { fontSize: 16, fontWeight: "600" },
  saveBtnNew: { paddingVertical: 10, paddingHorizontal: 26, borderRadius: 14, shadowColor: "#4da3ff", shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  saveTextNew: { color: "#fff", fontSize: 16, fontWeight: "700" },
  
  // ✅ Styles cho Suggestions Dropdown
  suggestionsContainer: {
    position: 'absolute',
    top: 75, // Canh chỉnh để nằm ngay dưới ô input
    left: 0,
    right: 0,
    borderWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 9999, // Đảm bảo nổi lên trên
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 14,
    flex: 1,
  },

  mapHeaderOverlay: { position: 'absolute', top: 50, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.2, elevation: 5 },
  mapFooterOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  confirmMapBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOpacity: 0.3, elevation: 5 },
});