import axiosInstance from "./axiosInstance";

async function list(params) {
  const { data } = await axiosInstance.get("/sales-returns", { params });
  return data;
}

async function getById(id) {
  const { data } = await axiosInstance.get(`/sales-returns/${id}`);
  return data.data;
}

async function create(payload) {
  const { data } = await axiosInstance.post("/sales-returns", payload);
  return data.data;
}

export default { list, getById, create };
