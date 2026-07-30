import axiosInstance from "./axiosInstance";

async function getSales(params) {
  const { data } = await axiosInstance.get("/reports/sales", { params });
  return data.data;
}

async function getProfit(params) {
  const { data } = await axiosInstance.get("/reports/profit", { params });
  return data.data;
}

async function getProducts(params) {
  const { data } = await axiosInstance.get("/reports/products", { params });
  return data.data;
}

async function getStock(params) {
  const { data } = await axiosInstance.get("/reports/stock", { params });
  return data.data;
}

async function getPurchases(params) {
  const { data } = await axiosInstance.get("/reports/purchases", { params });
  return data.data;
}

async function getExpenses(params) {
  const { data } = await axiosInstance.get("/reports/expenses", { params });
  return data.data;
}

async function getPaymentMethods(params) {
  const { data } = await axiosInstance.get("/reports/payment-methods", { params });
  return data.data;
}

async function downloadCsv(endpoint, params, filename) {
  const response = await axiosInstance.get(endpoint, {
    params: { ...params, format: "csv" },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default { getSales, getProfit, getProducts, getStock, getPurchases, getExpenses, getPaymentMethods, downloadCsv };
