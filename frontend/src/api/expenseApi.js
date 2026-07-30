import axiosInstance from "./axiosInstance";

async function list(params) {
  const { data } = await axiosInstance.get("/expenses", { params });
  return data;
}

async function getById(id) {
  const { data } = await axiosInstance.get(`/expenses/${id}`);
  return data.data;
}

async function create(payload) {
  const { data } = await axiosInstance.post("/expenses", payload);
  return data.data;
}

async function update(id, payload) {
  const { data } = await axiosInstance.put(`/expenses/${id}`, payload);
  return data.data;
}

async function remove(id) {
  await axiosInstance.delete(`/expenses/${id}`);
}

export default { list, getById, create, update, remove };
