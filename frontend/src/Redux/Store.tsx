import { configureStore } from '@reduxjs/toolkit';
import EventSlice from './Reducers/EventSlice'

const Store = configureStore({
  reducer: {
    events: EventSlice,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false,
  }),
});

export default Store;

export type RootState = ReturnType<typeof Store.getState>;
export type AppDispatch = typeof Store.dispatch;
