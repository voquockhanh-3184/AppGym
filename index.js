/**
 * @format
 */

import 'react-native-gesture-handler';  // ✅ phải ở dòng đầu tiên
import 'react-native-reanimated';       // ✅ thêm dòng này để khởi tạo Worklets

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
