import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { Event, EventConflict } from '@/Types/EventType';

interface EventState {
  events: any[];
  loading: boolean;
  checkingConflicts?: boolean
  error: any;
  warnings: any | null;
}

const initialState: EventState = {
  events: [],
  loading: false,
  checkingConflicts: false,
  error: null,
  warnings: null,
};

export const fetchEvents = createAsyncThunk('events/fetchEvents',
  async (_, thunkAPI) => {
    try {
      const response = await axios.get('http://localhost:3400/events');
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
});

export const fetchEventById = createAsyncThunk(
  "events/fetchEventById",
  async ({ eventId, token }: { eventId: string; token?: string | null },  thunkAPI) => {
    try {
      const response = await axios.get(`/events/${eventId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return await response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (newEvent: Event, thunkAPI) => {
      try {
          const response = await axios.post('http://localhost:3400/events', newEvent);
          return response.data;
      } catch (error: any) {
          return thunkAPI.rejectWithValue(error?.response?.data);
      }
  }
);

export const checkConflicts = createAsyncThunk(
  'events/checkConflicts',
  async (newEvent: EventConflict, thunkAPI) => {
      try {
          const response = await axios.post('http://localhost:3400/events/check-conflicts', newEvent);
          return response.data;
      } catch (error: any) {
          return thunkAPI.rejectWithValue(error?.response?.data);
      }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async (updatedEvent: any, thunkAPI) => {
    try {
      const response = await axios.put(`http://localhost:3400/events/${updatedEvent.id}`, updatedEvent);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId: string, thunkAPI) => {
    try {
      await axios.delete(`http://localhost:3400/events/${eventId}`);
      return eventId;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);


export const eventSlice = createSlice({
    name: 'events',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(fetchEvents.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(fetchEvents.fulfilled, (state, action) => {
            state.loading = false;
            state.events = action.payload;
        });
        builder.addCase(fetchEvents.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        });

        // add Event case
       builder.addCase(createEvent.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(createEvent.fulfilled, (state, action) => {
            state.loading = false;
            state.warnings = action.payload.warnings || null;
            if (action.payload.event) {
                state.events.push(action.payload.event);
            }
        });
        builder.addCase(createEvent.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        });

        builder.addCase(checkConflicts.pending, (state) => {
            state.checkingConflicts = true;
        });

        builder.addCase(checkConflicts.fulfilled, (state, action) => {
            state.checkingConflicts = false;
            state.warnings = action.payload;
        });

        builder.addCase(checkConflicts.rejected, (state, action) => {
            state.checkingConflicts = false;
            state.error = action.payload;
        });

        builder.addCase(updateEvent.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(updateEvent.fulfilled, (state, action) => {
            state.loading = false;
            state.events = state.events.map((event) => {
                if (event.id === action.payload.id) {
                    return action.payload;
                }
                return event;
            });
        });
        builder.addCase(updateEvent.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        });

        // delete Event case
        builder.addCase(deleteEvent.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(deleteEvent.fulfilled, (state, action) => {
            state.loading = false;
            state.events = state.events.filter((event) => event.id !== action.payload);
        });
    },
});

export default eventSlice.reducer;
