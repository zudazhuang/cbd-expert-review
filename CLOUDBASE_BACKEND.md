# 腾讯云 CloudBase 后台部署说明

部署完成后，专家仍然扫描原二维码填写问卷，不需要任何额外操作。新打开页面会优先写入 CloudBase 云数据库；CrudCrud 只作为临时兜底。

## 需要在腾讯云控制台完成的一次性配置

1. 登录腾讯云控制台，进入 CloudBase。
2. 新建环境，选择免费或基础套餐均可。
3. 复制环境 ID，例如 `xxx-123456`。
4. 数据库中新建集合：`expert_review_submissions`。
5. 云函数中部署本项目的 `expertReview` 函数。
6. 为云函数开启 HTTP 访问，复制访问 URL。
7. 安全域名或 Web 安全域名中加入：`zudazhuang.github.io`。

## 本地写入网站配置

拿到 HTTP 访问 URL 后运行：

```powershell
python scripts/set_cloudbase_backend.py "https://你的-cloudbase-http-url"
git add config.js
git commit -m "Use CloudBase backend for expert review"
git push
```

## 验证

1. 打开问卷提交一份测试数据。
2. CloudBase 数据库集合 `expert_review_submissions` 应新增一条记录。
3. 打开后台页面确认“提交列表”读取成功。

