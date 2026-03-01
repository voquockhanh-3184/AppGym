import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserByEmailLocal, createUserLocal, validateUserLocal } from "../db/sqlite";
import { executeSql } from "../db/sqlite";

const STORAGE_USER_KEY = 'currentUser';

export async function signInLocal(email: string, password: string) {
  const user = await validateUserLocal(email.trim(), password);
  if (!user) return null;

  await AsyncStorage.multiSet([
    ["currentUser", JSON.stringify(user)],
    ["currentUserId", String(user.id)] // 👈 thêm dòng này
  ]);

  console.log("✅ Lưu session thành công cho:", user.email, "| role:", user.role);
  return user;
}



export async function signOutLocal() {
  await AsyncStorage.multiRemove(["currentUser", "currentUserId"]);
  console.log("🚪 Đã đăng xuất và xóa dữ liệu user");
}


export async function getCurrentUser() {
  const raw = await AsyncStorage.getItem(STORAGE_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function getCurrentUserRole(): Promise<'admin'|'user'|null> {
  const u = await getCurrentUser();
  return u?.role ?? null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getCurrentUserRole()) === 'admin';
}
