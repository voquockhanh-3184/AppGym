import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🎨 Kiểu dữ liệu theme
type Theme = "light" | "dark";

// 🎨 Giao diện cho màu theme
interface ThemeColors {
  background: string;
  card: string;
  text: string;
  subText: string;
  border: string;
  inputBackground: string;
  modalBackground: string;
}

// 🧠 Interface cho Context
interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
  isDarkMode: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: "light",
  toggleTheme: () => {},
  isDarkMode: false,
  colors: {
    background: "#f3f4f6",
    card: "#fff",
    text: "#181818",
    subText: "#555",
    border: "#ddd",
    inputBackground: "#fff",
    modalBackground: "#fff",
  },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("light");

  // 🎯 Load theme từ AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem("theme");
        if (saved === "dark") setTheme("dark");
      } catch (err) {
        console.warn("Không thể load theme:", err);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newTheme = theme === "light" ? "dark" : "light";
      setTheme(newTheme);
      await AsyncStorage.setItem("theme", newTheme);
    } catch (err) {
      console.warn("Không thể lưu theme:", err);
    }
  };

  // 🎨 Bộ màu
  const lightColors: ThemeColors = {
    background: "#f3f4f6",
    card: "#fff",
    text: "#181818",
    subText: "#555",
    border: "#ddd",
    inputBackground: "#fff",
    modalBackground: "#fff",
  };

  const darkColors: ThemeColors = {
    background: "#0d0d0d",
    card: "#1e1e1e",
    text: "#f5f5f5",
    subText: "#aaa",
    border: "#333",
    inputBackground: "#2a2a2a",
    modalBackground: "#1f1f1f",
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        isDarkMode: theme === "dark",
        colors: theme === "dark" ? darkColors : lightColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
