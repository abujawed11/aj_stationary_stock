import axiosInstance from "./axiosInstance";

async function list(params) {
  const { data } = await axiosInstance.get("/suppliers", { params });
  return data;
}

async function getById(id) {
  const { data } = await axiosInstance.get(`/suppliers/${id}`);
  return data.data;
}

async function create(payload) {
  const { data } = await axiosInstance.post("/suppliers", payload);
  return data.data;
}

async function update(id, payload) {
  const { data } = await axiosInstance.put(`/suppliers/${id}`, payload);
  return data.data;
}

async function setStatus(id, isActive) {
  const { data } = await axiosInstance.patch(`/suppliers/${id}/status`, { isActive });
  return data.data;
}

export default { list, getById, create, update, setStatus };
