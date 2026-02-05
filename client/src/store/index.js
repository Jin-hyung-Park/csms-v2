import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workScheduleReducer from './slices/workScheduleSlice';
import notificationReducer from './slices/notificationSlice';
import employeeReducer from './slices/employeeSlice';
import ownerReducer from './slices/ownerSlice';
import uiReducer from './slices/uiSlice';
import expenseReducer from './slices/expenseSlice';
import fixedExpenseReducer from './slices/fixedExpenseSlice';
import metaReducer from './slices/metaSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workSchedule: workScheduleReducer,
    notification: notificationReducer,
    employee: employeeReducer,
    owner: ownerReducer,
    ui: uiReducer,
    expense: expenseReducer,
    fixedExpense: fixedExpenseReducer,
    meta: metaReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store; 