import axiosInstance from "./axiosInstance";

async function list(params) {
  const { data } = await axiosInstance.get("/sales", { params });
  return data;
}

async function getById(id) {
  const { data } = await axiosInstance.get(`/sales/${id}`);
  return data.data;
}

async function create(payload) {
  const { data } = await axiosInstance.post("/sales", payload);
  return data.data;
}

async function cancel(id) {
  const { data } = await axiosInstance.post(`/sales/${id}/cancel`);
  return data.data;
}

async function getReceipt(id) {
  const { data } = await axiosInstance.get(`/sales/${id}/receipt`);
  return data.data;
}

async function recordPayment(id, payload) {
  const { data } = await axiosInstance.post(`/sales/${id}/payment`, payload);
  return data.data;
}

export default { list, getById, create, cancel, getReceipt, recordPayment };
