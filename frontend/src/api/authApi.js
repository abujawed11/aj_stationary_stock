import axiosInstance from "./axiosInstance";

async function login(username, password) {
  const { data } = await axiosInstance.post("/auth/login", { username, password });
  return data.data.user;
}

async function logout() {
  await axiosInstance.post("/auth/logout");
}

async function getCurrentUser() {
  const { data } = await axiosInstance.get("/auth/me");
  return data.data.user;
}

async function changePassword(currentPassword, newPassword) {
  await axiosInstance.post("/auth/change-password", { currentPassword, newPassword });
}

export default { login, logout, getCurrentUser, changePassword };
