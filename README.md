# CBD Expert Review Form

这是用于专家扫码评审的 GitHub Pages 静态问卷。页面内包含图5-1、图5-2、图5-3实验图片，并按照“功能适配、建构合规、形式表现”三个维度采集排序评价。

## 本地预览

直接打开：

`D:\CBD\paper_assets\expert_review_site\index.html`

## 修复二维码 404

如果扫码出现 `Site not found · GitHub Pages / 404`，说明 GitHub Pages 还没有发布。先登录 GitHub：

```powershell
gh auth login
```

然后运行一键发布脚本：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File D:\CBD\paper_assets\expert_review_site\scripts\publish_to_github.ps1
```

默认发布到：

`https://zudazhuang.github.io/cbd-expert-review/`

发布完成后 GitHub Pages 可能需要 1-3 分钟生效。生效前扫码仍可能短暂显示 404。

如果 GitHub 用户名或仓库名不同：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File D:\CBD\paper_assets\expert_review_site\scripts\publish_to_github.ps1 -GitHubUser your_user -Repo cbd-expert-review
```

## 二维码

发布脚本会重新生成：

`assets\review_form_qr.png`

以及可直接发群或贴到PPT里的海报：

`assets\review_form_qr_poster.png`

也可以手动生成：

```powershell
python D:\CBD\paper_assets\expert_review_site\scripts\make_qr.py --url https://zudazhuang.github.io/cbd-expert-review/
```

## 数据回收

GitHub Pages 是静态托管，本身不能写入数据表。页面已预留后台回收接口，配置后专家点击“提交结果”会自动把数据发送到后台，同时仍可下载CSV或复制JSON作为备份。

后台接口配置在：

`config.js`

```js
window.EXPERT_REVIEW_SUBMIT_ENDPOINT = "填写后台 Web App / webhook URL";
window.EXPERT_REVIEW_SUBMIT_MODE = "no-cors";
```

可直接使用 Google Sheets 作为后台数据表。先新建 Google 表格，打开“扩展程序 / Apps Script”，复制：

`backend\google-apps-script.gs`

部署为 Web App 后，把生成的 URL 填入 `config.js`。每次完整提交会在表格里追加 240 条记录，即 2 个对比组 × 8 个案例 × 3 个维度 × 5 个名次。
