import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Video from "react-native-video";
import { useTheme } from "../../src/context/ThemeContext";

import {
  getAllSubExercisesLocal,
  deleteSubExerciseLocal,
  executeSql,
} from "../../src/db/sqlite";

export default function ExerciseSettingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // 🔥 ID bài tập cha gửi từ ExerciseDetailScreen
  const exerciseId = route.params?.exerciseId;

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = {
    bg: isDark ? "#0d0d0d" : "#F5F6FA",
    card: isDark ? "#1c1c1e" : "#fff",
    text: isDark ? "#fff" : "#111",
    subtitle: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#ddd",
    blue: "#4da3ff",
    red: "#FF3B30",
  };

  const [subs, setSubs] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubs();
  }, []);

  const loadSubs = async () => {
    setLoading(true);
    const list = await getAllSubExercisesLocal();
    setSubs(list);
    setLoading(false);
  };

  // 🔘 Chọn / bỏ chọn bài tập con
  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 🔥 Gán nhiều bài tập con vào bài tập cha
  const addSelectedToParent = async () => {
    if (!exerciseId) {
      Alert.alert("Lỗi", "Không tìm thấy ID bài tập cha.");
      return;
    }

    if (selected.length === 0) return;

    for (let id of selected) {
      await executeSql("UPDATE sub_exercises SET parent_id = ? WHERE id = ?", [
        exerciseId,
        id,
      ]);
    }

    Alert.alert(
      "Thành công",
      `Đã thêm ${selected.length} bài tập con vào bài tập cha`,
      [
        {
          text: "OK",
          onPress: () =>
            navigation.navigate("ExerciseDetailScreen", {
              exerciseId: exerciseId,
            }),
        },
      ]
    );
  }; // ⬅️ ĐÃ ĐÓNG ĐỦ HÀM

  // 🔥 Xóa bài tập con
  const confirmDelete = (id: number) => {
    Alert.alert("Xóa bài tập", "Bạn có chắc muốn xóa bài tập con này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await deleteSubExerciseLocal(id);
          loadSubs();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.blue} />
        ) : subs.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: colors.subtitle }}>
            Chưa có bài tập con nào.
          </Text>
        ) : (
          subs.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Checkbox */}
              <TouchableOpacity
                onPress={() => toggleSelect(item.id)}
                style={[
                  styles.checkbox,
                  {
                    borderColor: colors.blue,
                    backgroundColor: selected.includes(item.id)
                      ? colors.blue
                      : "transparent",
                  },
                ]}
              />

              {/* Video */}
              {item.video_path ? (
                <Video
                  source={{ uri: item.video_path }}
                  style={styles.video}
                  muted
                  repeat
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.video, styles.noVideo]}>
                  <Text style={{ color: colors.subtitle }}>No Video</Text>
                </View>
              )}

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {item.name}
                </Text>

                <Text style={[styles.subtitleText, { color: colors.subtitle }]}>
                  {item.type === "time"
                    ? `⏱ ${item.time}`
                    : `🔁 ${item.reps} lần`}
                </Text>

                {/* Actions */}
                <View style={{ flexDirection: "row", marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.blue }]}
                    onPress={() =>
                      navigation.navigate("EditSubExercisesScreen", {
                        id: item.id,
                      })
                    }
                  >
                    <Text style={styles.actionText}>Sửa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.red, marginLeft: 10 },
                    ]}
                    onPress={() => confirmDelete(item.id)}
                  >
                    <Text style={styles.actionText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Nút thêm nhiều */}
      <TouchableOpacity
        style={[
          styles.addSelectedBtn,
          { backgroundColor: selected.length > 0 ? colors.blue : "#777" },
        ]}
        disabled={selected.length === 0}
        onPress={addSelectedToParent}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          + Thêm {selected.length} bài tập đã chọn vào bài tập cha
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    flexDirection: "row",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: 12,
  },
  video: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#000",
    marginRight: 12,
  },
  noVideo: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "700" },
  subtitleText: { marginTop: 4, fontSize: 13 },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionText: { color: "#fff", fontWeight: "600" },
  addSelectedBtn: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
});
