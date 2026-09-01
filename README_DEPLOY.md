# 云部署说明

这个项目是一个无第三方依赖的 Node.js 服务，读取环境变量 `PORT`，可直接部署到 Render、Railway、Fly.io 等平台，也可以直接用 Docker 运行。

## 本地运行

```bash
npm start
```

或直接运行：

```bash
node server.js
```

打开 `http://localhost:8745/long`。

## Render 一键部署

1. 把本项目推送到 GitHub。
2. 在 Render 新建 Blueprint 或 Web Service，选择该仓库。
3. Render 会自动读取 `render.yaml`。
4. 部署完成后访问平台分配的域名，路径加 `/long`。

## Docker

```bash
docker build -t stock-long-dashboard .
docker run -p 8745:8745 stock-long-dashboard
```

## Railway / Fly.io

- Railway：直接把仓库交给 Railway，或使用 `railway up`；项目内已提供 `railway.json`。
- Fly.io：已提供 `fly.toml`，执行 `fly launch` 后按提示部署即可。

## 注意事项

- 服务需要访问东方财富、腾讯、新浪等行情接口，请确认云平台所在地区可以访问这些接口。
- Render 免费版会在无访问一段时间后休眠；如需 24 小时在线，建议用付费实例或加外部定时心跳。
