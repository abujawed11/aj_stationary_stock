import axiosInstance from "./axiosInstance";

async function list(params) {
  const { data } = await axiosInstance.get("/supplier-quotations", { params });
  return data;
}

async function getById(id) {
  const { data } = await axiosInstance.get(`/supplier-quotations/${id}`);
  return data.data;
}

async function create(payload) {
  const { data } = await axiosInstance.post("/supplier-quotations", payload);
  return data.data;
}

async function update(id, payload) {
  const { data } = await axiosInstance.put(`/supplier-quotations/${id}`, payload);
  return data.data;
}

async function remove(id) {
  await axiosInstance.delete(`/supplier-quotations/${id}`);
}

async function compare(productId, requiredQty) {
  const { data } = await axiosInstance.get("/supplier-quotations/compare", {
    params: { productId, requiredQty },
  });
  return data.data;
}

export default { list, getById, create, update, remove, compare };
