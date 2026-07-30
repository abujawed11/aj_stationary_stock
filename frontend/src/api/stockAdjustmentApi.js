import axiosInstance from "./axiosInstance";

async function list(params) {
  const { data } = await axiosInstance.get("/stock-adjustments", { params });
  return data;
}

async function getById(id) {
  const { data } = await axiosInstance.get(`/stock-adjustments/${id}`);
  return data.data;
}

async function create(payload) {
  const { data } = await axiosInstance.post("/stock-adjustments", payload);
  return data.data;
}

export default { list, getById, create };
