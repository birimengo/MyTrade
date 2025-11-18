import api from './api';

export const getRetailerStocks = (params = {}) => {
  return api.get('/retailer-stocks', { params });
};

export const createRetailerStock = (data) => {
  return api.post('/retailer-stocks', data);
};

export const updateRetailerStock = (id, data) => {
  return api.put(`/retailer-stocks/${id}`, data);
};

export const deleteRetailerStock = (id) => {
  return api.delete(`/retailer-stocks/${id}`);
};

export const getStockStatistics = () => {
  return api.get('/retailer-stocks/stats');
};