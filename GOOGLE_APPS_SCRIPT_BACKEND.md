# Google Apps Script 长期后台部署说明

目标：让专家仍然扫描同一个二维码填写问卷，但正式提交数据写入 Google Sheet，不再依赖 CrudCrud 的 100 次请求额度。

## 对专家是否有影响

没有影响。专家不需要配置任何东西，也不需要知道后端变化。部署完成后，仍然打开同一个 GitHub Pages 问卷链接。

已经打开旧页面正在填写的人不会被强制刷新；他们原页面继续保持当前逻辑。新打开页面的人会优先写入 Google Apps Script 后台。

## 一次性部署步骤

1. 打开 Google Drive，新建一个 Google Sheet，例如命名为 `CBD Expert Review Responses`。
2. 在该表中点击 `扩展程序` -> `Apps Script`。
3. 删除默认代码，将本项目中的 `google_apps_script_backend.gs` 全部复制进去。
4. 点击保存。
5. 点击 `部署` -> `新建部署`。
6. 类型选择 `Web 应用`。
7. 执行身份选择 `我`。
8. 访问权限选择 `任何人`。
9. 点击部署，复制生成的 Web App URL，形如：

   `https://script.google.com/macros/s/xxxxxxxxxxxxxxxx/exec`

10. 回到本项目目录执行：

   ```powershell
   python scripts/set_primary_backend.py "https://script.google.com/macros/s/xxxxxxxxxxxxxxxx/exec"
   git add config.js
   git commit -m "Use Google Apps Script backend for expert review"
   git push
   ```

## 部署后验证

1. 打开问卷，填写一份测试提交。
2. 打开 Google Sheet，确认新增一行数据。
3. 打开后台页面：

   `https://zudazhuang.github.io/cbd-expert-review/admin.html`

4. 确认“提交列表”能看到 Google Sheet 中的正式提交。

## 旧数据

迁移期间后台仍会读取旧 CrudCrud 数据，因此旧的 `XHY` 数据不会丢。正式论文统计时可以从后台下载 CSV，或继续使用本地 `D:\CBD\评价数据\analyze_expert_review.py` 统一分析。
