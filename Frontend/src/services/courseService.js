import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getCourses = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/courses/`, {
      headers: { ...getAuthHeader() }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
};

export const addCourse = async (course) => {
  try {
    const response = await axios.post(`${BASE_URL}/courses/add`, course, {
      headers: { ...getAuthHeader() }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding course:', error);
    throw error;
  }
};

export const updateCourse = async (courseCode, course) => {
  try {
    const response = await axios.put(`${BASE_URL}/courses/update/${courseCode}`, course, {
      headers: { ...getAuthHeader() }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

export const deleteCourse = async (courseCode) => {
  try {
    const response = await axios.delete(`${BASE_URL}/courses/delete/${courseCode}`, {
      headers: { ...getAuthHeader() }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

export const uploadExcel = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers: { 
        ...getAuthHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading Excel file:', error);
    throw error;
  }
};
