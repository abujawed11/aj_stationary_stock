import axiosInstance from "./axiosInstance";

async function list(params) {
  const { data } = await axiosInstance.get("/purchases", { params });
  return data;
}

async function getById(id) {
  const { data } = await axiosInstance.get(`/purchases/${id}`);
  return data.data;
}

async function create(payload) {
  const { data } = await axiosInstance.post("/purchases", payload);
  return data.data;
}

async function cancel(id) {
  const { data } = await axiosInstance.post(`/purchases/${id}/cancel`);
  return data.data;
}

export default { list, getById, create, cancel };
