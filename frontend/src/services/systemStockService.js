import api from './api';

export const getSystemStocks = (params = {}) => {
  return api.get('/system-stocks', { params });
};

export const updateSystemStock = (id, data) => {
  return api.put(`/system-stocks/${id}`, data);
};