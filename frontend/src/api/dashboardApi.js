import axiosInstance from "./axiosInstance";

async function getSummary() {
  const { data } = await axiosInstance.get("/dashboard/summary");
  return data.data;
}

async function getRecentSales(limit = 8) {
  const { data } = await axiosInstance.get("/dashboard/recent-sales", { params: { limit } });
  return data.data;
}

async function getSalesChart(days = 7) {
  const { data } = await axiosInstance.get("/dashboard/sales-chart", { params: { days } });
  return data.data;
}

async function getLowStock(limit = 10) {
  const { data } = await axiosInstance.get("/dashboard/low-stock", { params: { limit } });
  return data.data;
}

export default { getSummary, getRecentSales, getSalesChart, getLowStock };
