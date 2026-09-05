import axios from 'axios';
import { ApiResponse } from '@devlens/types';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = error.response?.data as ApiResponse | undefined;
    const message = apiError?.error?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);
