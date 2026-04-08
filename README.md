# leleo-home-page 个人主页

## 目录
- [项目简介](#项目简介)
- [功能特性](#功能特性)  
- [演示地址](#演示地址)
- [技术栈](#技术栈)
- [安装与运行](#安装与运行)
  - [本地运行](#本地运行)
  - [Vercel在线部署](#vercel在线部署)
  - [CloudFlare Worker 在线部署](#cloudflare-worker-在线部署)
- [修改配置](#修改配置)


## 项目简介

这是一个简单的个人主页项目，用于展示个人信息、技能、项目等。主页设计简洁、响应式，适合在不同设备上浏览。支持自定义配置。

<img src="./img/leleo-home-page/1737532219807.png" width="600" alt="桌面端预览" style="display: block; margin: 10px auto;border-radius:8px;">
<img src="./img/leleo-home-page/1737533474493.png" width="170" alt="移动端预览" style="display: block; margin: 10px auto;border-radius:8px;">
<img src="./img/leleo-home-page/1737532290584.png" width="600" alt="功能预览1" style="display: block; margin: 10px auto;border-radius:8px;">
<img src="./img/leleo-home-page/1737532316302.png" width="600" alt="功能预览2" style="display: block; margin: 10px auto;border-radius:8px;">

## 功能特性

- **响应式设计**：适配桌面、平板和手机等不同设备
- **个人信息展示**：包括头像、个性标签、简介、技能等
- **项目展示**：展示项目，包括项目描述、技术栈和链接  
- **预览配置**：支持主题、背景壁纸预览（包括动、静态/PC、移动端壁纸设置）以及音乐播放配置
- **博客功能**：支持文章新增、编辑、删除、分类、搜索和详情页
- **R2 存储**：文章正文和索引可以直接落到 Cloudflare R2
- **在线部署配置**：支持vercel一键部署及使用vercel环境变量进行在线自定义配置

## 演示地址

[在线演示](https://leleo.top)

## 技术栈

- **前端**：Vue
- **UI框架**：Vuetify  
- **构建工具**：Vite
- **版本控制**：Git
- **部署平台**：Vercel

## 安装与运行

### 本地运行

1. 克隆仓库：

```bash
git clone https://github.com/leleo886/leleo-home-page.git
```

2. 进入项目目录：

```bash
cd leleo-home-page
```

3. 安装依赖：

```bash
npm install
```

4. 启动开发服务器：

```bash
npm run dev
```

### Vercel在线部署

> 无需服务器，点击链接一键在线部署到 [Vercel](https://vercel.com/new/clone?s=https://github.com/leleo886/leleo-home-page.git)（首先需要有github和vercel账号）

![Vercel部署步骤1](./img/leleo-home-page/1737785497852.png)

> ---登录vercel账号，并选择github关联账号，为项目取个名字，然后点击"Create"按钮开始部署

![Vercel部署完成](./img/leleo-home-page/1737538980894.png)

> ---部署完成后，点击回到控制面板

![Vercel控制面板](./img/leleo-home-page/1737539171658.png)

注意：Vercel提供的`.vercel.app`域名在中国大陆地区可能无法访问，所以建议绑定自定义域名。（若没有自己的域名，这里提供简单的[免费二级域名服务](https://sds.leleo.top)及本项目如何进行域名绑定的[说明](./img/domainToVercel.md)）

### CloudFlare Worker 在线部署

> 你现在看到的 `Set up your application` 页面就是 Worker Git 部署入口，这个仓库就是按这个入口来配置的。

1. 点击 `Continue with GitHub`，连接 GitHub 并选择当前仓库。
2. 项目名称填 `home`。
3. 构建命令填 `npm run build`。
4. 部署命令填 `npx wrangler deploy`。
5. 非生产分支部署命令可留空，或者填 `npx wrangler versions upload`。
6. 路径填 `/`。
7. 如果页面要求 `API 令牌`，可以先留空；如果你的 Cloudflare 配置强制要求填写，再创建一个带 Workers 和 R2 相关权限的 Token。

部署完成后，到项目设置里继续配置 R2 绑定和环境变量。

> R2 bucket 建议使用 `homepage-blog`。
> 如果需要绑定域名，按 Cloudflare 页面上的提示操作即可。

## 修改配置

### 方法1. 修改配置文件

自定义数据文件为项目src目录下面的 config.js，这里有[配置说明](./img/config.md)，然后就是代码的拉取、修改上传。如果部署方式为CloudFlare Page，直接在Github修改后Commit即可自动部署

**若使用此方法请勿配置环境变量**

### 方法2. 在线修改环境变量

**注意**：在vercel中此方法优先级高于方法1，CloudFlare中方法1优先级更高

#### vercel部署

> (1). 首先还是打开vercel中本项目主面板，然后依次点击`Settings`、`Environments`、`Production`
![Vercel控制面板](./img/leleo-home-page/1737624788108.png)

> (2). 然后下翻点击`Add Environment Variable`按钮，要求填入`Key`值为`VITE_CONFIG`,`Value`值如[环境变量值](./img/env.md)所示，全部复制粘贴即可（有点多），根据个人情况自定义修改，配置说明同方法1。
![Vercel控制面板](./img/leleo-home-page/1737625015472.png)

> (3). 回到项目主面板，依次点击`Project`、`Build Logs`，进入新页面后再找到`Redeploy`。最后等待重新部署完成即可。
![Vercel控制面板](./img/leleo-home-page/1737626184576.png)
![Vercel控制面板](./img/leleo-home-page/1737626397809.png)

#### CloudFlare Worker 部署

> (1). 到你的 Worker Git 部署项目，点击"设置"，找到"变量和机密"点击右侧"添加"
![设置页](./img/leleo-home-page/IMG_20250813_125718.jpg)

> (2). 构建命令填 `npm run build`，部署命令填 `npx wrangler deploy`，路径填 `/`，如果页面要求 API 令牌就按 Cloudflare 提示创建后填写。

> (3). 部署完成后，重新部署一次，等待完成即可。
![重试部署](./img/leleo-home-page/IMG_20250813_131021.jpg)

### 博客和 R2 配置

如果你要启用文章发布能力，需要在 Cloudflare Worker 项目里额外配置一个 R2 绑定和一个可选的管理员口令。

如果你后续要用外部 S3 客户端直连 R2，可以使用这个 S3 API：`https://097feb25db62df21d291254373e71243.r2.cloudflarestorage.com/homepage-blog`。
当前项目内置的博客接口仍然通过 Worker 绑定访问 R2 bucket，不需要手动填写这个地址。

1. 在 R2 控制台新建一个 bucket，名称建议与 [wrangler.jsonc](wrangler.jsonc) 保持一致。
   bucket 名只能包含小写字母、数字和连字符，推荐使用类似 `homepage-blog` 这样的命名。
2. 在 Worker 项目的环境变量里添加 `BLOG_ADMIN_TOKEN`，用于保护写入接口。
3. 重新部署后，博客页会通过 `/api/posts` 读取和保存文章。

默认情况下，如果没有配置管理员口令，写入接口仍然可用；如果你要公开部署，建议一定配置口令。
