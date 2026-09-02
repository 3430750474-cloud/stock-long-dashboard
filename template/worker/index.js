const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status) {
  status = status || 200;
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }, CORS)
  });
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  return res.json();
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response("", { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/demo") {
        const q = url.searchParams.get("q") || "hello";
        return json({ message: "接口正常", q });
      }
      if (url.pathname === "/api/proxy") {
        const target = url.searchParams.get("url") || "";
        if (!/^https:\/\//.test(target)) return json({ error: "bad url" }, 400);
        return json(await fetchJson(target));
      }
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }
};
