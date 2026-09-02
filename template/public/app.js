"use strict";

const API_BASE = window.__API_BASE || "";

async function loadData() {
  const keyword = document.getElementById("keyword").value.trim();
  const result = document.getElementById("result");
  result.textContent = "加载中…";
  try {
    const url = API_BASE + "/api/demo?q=" + encodeURIComponent(keyword || "hello");
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("接口返回 " + res.status);
    const data = await res.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    result.textContent = "请求失败：" + e.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn").addEventListener("click", loadData);
  document.getElementById("keyword").addEventListener("keydown", e => {
    if (e.key === "Enter") loadData();
  });
});
