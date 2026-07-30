import axiosInstance from "./axiosInstance";

async function list(params) {
  const { data } = await axiosInstance.get("/categories", { params });
  return data;
}

async function create(payload) {
  const { data } = await axiosInstance.post("/categories", payload);
  return data.data;
}

async function update(id, payload) {
  const { data } = await axiosInstance.put(`/categories/${id}`, payload);
  return data.data;
}

async function setStatus(id, isActive) {
  const { data } = await axiosInstance.patch(`/categories/${id}/status`, { isActive });
  return data.data;
}

export default { list, create, update, setStatus };
