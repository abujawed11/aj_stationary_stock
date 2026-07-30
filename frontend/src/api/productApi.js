import axiosInstance from "./axiosInstance";

async function list(params) {
  const { data } = await axiosInstance.get("/products", { params });
  return data;
}

async function getById(id) {
  const { data } = await axiosInstance.get(`/products/${id}`);
  return data.data;
}

async function create(payload) {
  const { data } = await axiosInstance.post("/products", payload);
  return data.data;
}

async function update(id, payload) {
  const { data } = await axiosInstance.put(`/products/${id}`, payload);
  return data.data;
}

async function setStatus(id, isActive) {
  const { data } = await axiosInstance.patch(`/products/${id}/status`, { isActive });
  return data.data;
}

async function getStockLedger(id, params) {
  const { data } = await axiosInstance.get(`/products/${id}/stock-ledger`, { params });
  return data;
}

export default { list, getById, create, update, setStatus, getStockLedger };
