import {
  addExerciseLocal,
  updateExerciseLocal,
  deleteExerciseLocal,
  addSubExerciseLocal,
  deleteSubExercisesByParent,
  updateSubExerciseOrder,
  addExerciseToLibrary,
} from "../db/sqlite"; 
import { requireAdmin } from '../guards/acl';

// EXERCISES
export async function adminAddExerciseLocal(...args: Parameters<typeof addExerciseLocal>) {
  await requireAdmin();
  return addExerciseLocal(...args);
}
export async function adminUpdateExerciseLocal(...args: Parameters<typeof updateExerciseLocal>) {
  await requireAdmin();
  return updateExerciseLocal(...args);
}
export async function adminDeleteExerciseLocal(...args: Parameters<typeof deleteExerciseLocal>) {
  await requireAdmin();
  return deleteExerciseLocal(...args);
}

// SUB-EXERCISES
export async function adminAddSubExerciseLocal(...args: Parameters<typeof addSubExerciseLocal>) {
  await requireAdmin();
  return addSubExerciseLocal(...args);
}
export async function adminDeleteSubExercisesByParent(...args: Parameters<typeof deleteSubExercisesByParent>) {
  await requireAdmin();
  return deleteSubExercisesByParent(...args);
}
export async function adminUpdateSubExerciseOrder(...args: Parameters<typeof updateSubExerciseOrder>) {
  await requireAdmin();
  return updateSubExerciseOrder(...args);
}

// LIBRARY
export async function adminAddExerciseToLibrary(...args: Parameters<typeof addExerciseToLibrary>) {
  await requireAdmin();
  return addExerciseToLibrary(...args);
}
