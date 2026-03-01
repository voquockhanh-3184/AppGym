import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { BarChart } from "react-native-chart-kit";
import DB from "../../src/db/sqlite";
import { useTheme } from "../../src/context/ThemeContext";

const screenWidth = Dimensions.get("window").width;
const CHART_HEIGHT = 220;

// Fix lỗi TypeScript cho BarChart
const BarChartAny = BarChart as unknown as React.ComponentType<any>;

export default function RevenueScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<"week" | "month" | "year">("month");

  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [{ data: [0] }],
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [yAxisLabels, setYAxisLabels] = useState<string[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  const colors = {
    background: isDark ? "#121212" : "#F5F7FA",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1f2937",
    subtext: isDark ? "#aaaaaa" : "#6b7280",
    border: isDark ? "#333" : "#E5E5EA",
    price: "#007AFF",
    iconBg: isDark ? "#2C2C2E" : "#F0F2F5",
    modalOverlay: "rgba(0,0,0,0.5)",
    divider: isDark ? "#333" : "#E5E5EA",
    chartGradientFrom: isDark ? "#005bea" : "#007AFF",
    chartGradientTo: isDark ? "#00c6fb" : "#00B4DB",
  };

  useEffect(() => {
    setSelectedBarIndex(null);
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await DB.getRevenueReport(filter === "year" ? "all" : filter);
      const now = new Date();
      const validData = data.filter((item: any) => {
        const date = new Date(item.created_at);
        if (filter === "week") return isSameWeek(date, now);
        if (filter === "month")
          return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        if (filter === "year") return date.getFullYear() === now.getFullYear();
        return true;
      });

      setAllTransactions(validData);
      const total = validData.reduce(
        (sum: number, item: any) => sum + (item.amount || 0),
        0
      );
      setTotalRevenue(total);
      processChartData(validData, filter);
    } catch (error) {
      console.error("Lỗi load doanh thu:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBucketIndex = (item: any, type: "week" | "month" | "year") => {
    const date = new Date(item.created_at);
    if (type === "week") {
      let dayIndex = date.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6;
      return dayIndex;
    }
    if (type === "month") {
      const day = date.getDate();
      const weekIndex = Math.floor((day - 1) / 7);
      return Math.min(weekIndex, 4);
    }
    return date.getMonth();
  };

  const processChartData = (data: any[], type: "week" | "month" | "year") => {
    let labels: string[] = [];
    let values: number[] = [];

    if (type === "week") {
      labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      values = new Array(7).fill(0);
      data.forEach((item) => {
        const idx = getBucketIndex(item, "week");
        if (idx >= 0 && idx < 7) values[idx] += item.amount || 0;
      });
    } else if (type === "month") {
      labels = ["W1", "W2", "W3", "W4", "W5"];
      values = new Array(5).fill(0);
      data.forEach((item) => {
        const idx = getBucketIndex(item, "month");
        if (idx >= 0 && idx < 5) values[idx] += item.amount || 0;
      });
    } else {
      labels = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
      values = new Array(12).fill(0);
      data.forEach((item) => {
        const idx = getBucketIndex(item, "year");
        if (idx >= 0 && idx < 12) values[idx] += item.amount || 0;
      });
    }

    const formattedValues = values.map((v) => v / 1000);
    const maxValue = Math.max(...formattedValues);
    const safeMax = maxValue === 0 ? 10 : maxValue;
    const segments = 4;
    const step = safeMax / segments;
    const generatedLabels = [];
    for (let i = segments; i >= 0; i--) {
      generatedLabels.push(Math.round(i * step).toString() + "k");
    }
    setYAxisLabels(generatedLabels);

    setChartData({
      labels,
      datasets: [{ data: formattedValues }],
    });
  };

  const filteredTransactions = useMemo(() => {
    if (selectedBarIndex === null) return allTransactions;
    return allTransactions.filter((t) => {
      const idx = getBucketIndex(t, filter);
      return idx === selectedBarIndex;
    });
  }, [allTransactions, filter, selectedBarIndex]);

  const displayedTotal = useMemo(() => {
    return filteredTransactions.reduce(
      (sum: number, item: any) => sum + (item.amount || 0),
      0
    );
  }, [filteredTransactions]);

  const isSameWeek = (d1: Date, d2: Date) => {
    const oneJan = new Date(d1.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d1.getTime() - oneJan.getTime()) / 86400000);
    const result1 = Math.ceil((d1.getDay() + 1 + numberOfDays) / 7);
    const oneJan2 = new Date(d2.getFullYear(), 0, 1);
    const numberOfDays2 = Math.floor((d2.getTime() - oneJan2.getTime()) / 86400000);
    const result2 = Math.ceil((d2.getDay() + 1 + numberOfDays2) / 7);
    return result1 === result2 && d1.getFullYear() === d2.getFullYear();
  };

  const formatCurrency = (amount: number) =>
    (amount || 0).toLocaleString("vi-VN") + " đ";

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1} - ${date.getHours()}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  };

  const handleBarClick = (index: number) => {
    setSelectedBarIndex((prev) => (prev === index ? null : index));
  };

  // ✅ CẤU HÌNH ALIGNMENT (CANH CHỈNH) CHO TỪNG LOẠI BIỂU ĐỒ
  // PaddingLeft càng lớn -> Vùng chạm càng dịch sang phải
  // PaddingRight dùng để cân đối lại độ rộng của từng cột chạm
  const getOverlayConfig = () => {
    switch (filter) {
      case "week":
        // Tuần (7 cột): Cần dịch sang phải nhiều hơn một chút so với tháng
        return { paddingLeft: 52, paddingRight: 25 }; 
      case "year":
        // Năm (12 cột): Các cột rất nhỏ, cần căn chỉnh kỹ
        return { paddingLeft: 42, paddingRight: 28 }; 
      case "month":
      default:
        // Tháng (5 cột): Cấu hình cũ đã ổn
        return { paddingLeft: 30, paddingRight: 50 };
    }
  };
  
  const overlayStyle = getOverlayConfig();
  const chartWidth = filter === "year" ? screenWidth * 1.7 : screenWidth - 72;

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        setSelectedTransaction(item);
        setModalVisible(true);
      }}
      style={[
        styles.transactionItem,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.iconBg }]}>
        <Image
          source={
            item.payment_method?.toLowerCase().includes("momo")
              ? require("../../assets/momo.png")
              : require("../../assets/visa.png")
          }
          style={styles.icon}
          defaultSource={require("../../assets/bill.png")}
        />
      </View>
      <View style={styles.infoBox}>
        <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={1}>
          {item.course_title || "Khóa học"}
        </Text>
        <Text style={[styles.subText, { color: colors.subtext }]}>
          {item.user_name} • {formatDate(item.created_at)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.priceText, { color: colors.price }]}>
          +{formatCurrency(item.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#fff" }]}
        >
          <Image
            source={require("../../assets/back.png")}
            style={[styles.backIcon, { tintColor: colors.text }]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Báo cáo doanh thu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, marginBottom: 20, marginTop: 16 }}>
          <LinearGradient
            colors={[colors.chartGradientFrom, colors.chartGradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chartCard}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={styles.chartTitle}>
                {selectedBarIndex !== null
                  ? `Doanh thu ${chartData.labels[selectedBarIndex]}`
                  : "Tổng doanh thu"}
              </Text>
              <Text style={styles.chartTotal}>{formatCurrency(displayedTotal)}</Text>
            </View>

            <View style={{ flexDirection: "row", height: CHART_HEIGHT }}>
              {/* Trục Y cố định */}
              <View style={{ width: 40, justifyContent: "space-between", paddingBottom: 36, paddingTop: 10, marginRight: 5 }}>
                {yAxisLabels.map((label, index) => (
                  <Text key={index} style={{ color: "rgba(255,255,255,0.9)", fontSize: 10, textAlign: "right", fontWeight: "600" }}>
                    {label}
                  </Text>
                ))}
              </View>

              {/* Biểu đồ trượt */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                <View>
                  <BarChartAny
                    data={chartData}
                    width={chartWidth}
                    height={CHART_HEIGHT}
                    yAxisLabel=""
                    yAxisSuffix=""
                    withVerticalLabels={true}
                    withHorizontalLabels={false}
                    chartConfig={{
                      backgroundGradientFromOpacity: 0,
                      backgroundGradientToOpacity: 0,
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      strokeWidth: 2,
                      barPercentage: filter === "year" ? 0.6 : 0.7,
                      decimalPlaces: 0,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      fillShadowGradient: "#fff",
                      fillShadowGradientOpacity: 1,
                    }}
                    style={{ borderRadius: 16, paddingRight: 40, marginLeft: -10 }}
                    showBarTops={false}
                    fromZero={true}
                  />

                  {/* ✅ LỚP PHỦ VÔ HÌNH VỚI CẤU HÌNH ĐỘNG */}
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: chartWidth,
                      flexDirection: "row",
                      marginLeft: -10,
                      // Áp dụng padding động theo từng loại filter
                      paddingLeft: overlayStyle.paddingLeft,
                      paddingRight: overlayStyle.paddingRight,
                    }}
                  >
                    {chartData.labels.map((_: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={{ flex: 1 }}
                        activeOpacity={0.1} 
                        onPress={() => handleBarClick(index)}
                        // Mẹo: Nếu vẫn lệch, bạn có thể bỏ comment dòng dưới để hiện màu đỏ debug vùng chạm
                        // style={{ flex: 1, backgroundColor: index % 2 === 0 ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,0,0.2)' }}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>

            {selectedBarIndex !== null && (
              <TouchableOpacity
                onPress={() => setSelectedBarIndex(null)}
                style={{ marginTop: 5, backgroundColor: "rgba(0,0,0,0.2)", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, alignSelf: "center" }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                  Đang lọc: {chartData.labels[selectedBarIndex]} (Chạm để xem tất cả)
                </Text>
              </TouchableOpacity>
            )}
            {filter === "year" && (
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 5, fontStyle: "italic", textAlign: "center" }}>
                Vuốt ngang để xem thêm tháng
              </Text>
            )}
          </LinearGradient>
        </View>

        <View style={styles.filterContainer}>
          {[
            { key: "week", label: "Tuần này" },
            { key: "month", label: "Tháng này" },
            { key: "year", label: "Năm nay" },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                filter === f.key && styles.filterBtnActive,
                { borderColor: filter === f.key ? "#007AFF" : colors.border, backgroundColor: filter === f.key ? "#007AFF" : colors.card },
              ]}
              onPress={() => setFilter(f.key as any)}
            >
              <Text style={[styles.filterText, { color: filter === f.key ? "#fff" : colors.subtext }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.listContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {selectedBarIndex !== null
              ? `Giao dịch (${chartData.labels[selectedBarIndex]})`
              : "Tất cả giao dịch"}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : (
            <FlatList
              data={filteredTransactions}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={renderItem}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: colors.subtext, marginTop: 20 }}>
                  Không có giao dịch nào trong {selectedBarIndex !== null ? chartData.labels[selectedBarIndex] : "thời gian này"}
                </Text>
              }
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Chi tiết giao dịch</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 24, color: colors.subtext, marginTop: -5 }}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            {selectedTransaction && (
              <View>
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 5 }}>
                    {formatCurrency(selectedTransaction.amount)}
                  </Text>
                  <Text style={{ color: "#4CAF50", fontWeight: "600" }}>Thanh toán thành công</Text>
                </View>
                <DetailRow label="Mã GD" value={`#${selectedTransaction.id}`} colors={colors} />
                <DetailRow label="Khóa học" value={selectedTransaction.course_title} colors={colors} />
                <DetailRow label="Học viên" value={selectedTransaction.user_name} colors={colors} />
                <DetailRow label="Ngày" value={formatDate(selectedTransaction.created_at)} colors={colors} />
              </View>
            )}
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.price }]} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value, colors }: any) => (
  <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
    <Text style={[styles.detailLabel, { color: colors.subtext }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 10, paddingBottom: 10, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backIcon: { width: 20, height: 20, resizeMode: "contain" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  chartCard: { borderRadius: 24, padding: 20, shadowColor: "#007AFF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  chartTitle: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600", flex: 1 },
  chartTotal: { color: "#fff", fontSize: 18, fontWeight: "800" },
  filterContainer: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 20 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, marginRight: 10, minWidth: 80, alignItems: "center" },
  filterBtnActive: { borderWidth: 0 },
  filterText: { fontSize: 13, fontWeight: "600" },
  listContainer: { paddingHorizontal: 16, paddingBottom: 50 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 15 },
  transactionItem: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 14 },
  icon: { width: 26, height: 26, resizeMode: "contain" },
  infoBox: { flex: 1 },
  courseName: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  subText: { fontSize: 12 },
  priceText: { fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", borderRadius: 20, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  divider: { height: 1, width: "100%", marginBottom: 15 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 0.5 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: "600", textAlign: "right", flex: 1, marginLeft: 20 },
  closeButton: { marginTop: 20, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  closeButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});