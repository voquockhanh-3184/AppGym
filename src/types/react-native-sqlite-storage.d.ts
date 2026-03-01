declare module 'react-native-sqlite-storage' {
  interface OpenParams {
    name: string;
    location?: string;
  }
  export function DEBUG(flag: boolean): void;
  export function enablePromise(flag: boolean): void;
  export interface ResultSet {
    insertId?: number;
    rows: { length: number; item: (i: number) => any };
  }
  export interface SQLiteDatabase {
    executeSql(sql: string, params?: any[]): Promise<[ResultSet]>;
    close(): Promise<void>;
  }
  export function openDatabase(params: OpenParams): Promise<SQLiteDatabase>;
  const _default: {
    DEBUG: (flag: boolean) => void;
    enablePromise: (flag: boolean) => void;
    openDatabase: (params: OpenParams) => Promise<SQLiteDatabase>;
  };
  export default _default;
}
