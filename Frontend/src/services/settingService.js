import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000'
});

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getRooms = async () => {
  try {
    const response = await api.get('/settings/get_rooms', { headers: { ...getAuthHeader() } });
    return response.data.rooms || [];
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
};

export const updateRooms = async (roomsPayload) => {
  try {
    const response = await api.post('/settings/add_rooms', roomsPayload, { headers: { ...getAuthHeader() } });
    return response.data;
  } catch (error) {
    console.error('Error updating rooms:', error);
    throw error;
  }
};

export const getTimeSettings = async () => {
  try {
    const response = await api.get('/settings/get_time_settings', { headers: { ...getAuthHeader() } });
    return response.data;
  } catch (error) {
    console.error('Error fetching time settings:', error);
    throw error;
  }
};

export const updateTimeSettings = async (timeSettings) => {
  try {
    const response = await api.post('/settings/update_time_settings', timeSettings, { headers: { ...getAuthHeader() } });
    return response.data;
  } catch (error) {
    console.error('Error updating time settings:', error);
    throw error;
  }
};

export const getDays = async () => {
  try {
    const response = await api.get('/settings/get_days', { headers: { ...getAuthHeader() } });
    return response.data;
  } catch (error) {
    console.error('Error fetching days:', error);
    throw error;
  }
};

export const updateDays = async (daysSettings) => {
  try {
    const response = await api.post('/settings/update_days', daysSettings, { headers: { ...getAuthHeader() } });
    return response.data;
  } catch (error) {
    console.error('Error updating days:', error);
    throw error;
  }
};
