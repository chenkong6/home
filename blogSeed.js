export const blogSeedPosts = [
  {
    slug: 'homepage-to-blog',
    title: '把个人主页扩展成博客',
    category: '博客建设',
    tags: ['Vue', 'Cloudflare Pages', 'R2'],
    summary: '从单页主页升级到可发文、可分类、可搜索的博客，需要先把内容模型和存储层分开。',
    cover: '/img/sunshine.jpg',
    status: 'published',
    publishedAt: '2026-04-08T08:00:00.000Z',
    updatedAt: '2026-04-08T08:00:00.000Z',
    readTime: 4,
    content: `# 从主页到博客

一个可维护的博客，不只是把文章塞进页面，而是要把“文章内容”“分类标签”“搜索能力”“编辑入口”拆成独立模块。

## 我现在的目标

- 文章可以新增、编辑和删除
- 文章支持分类和标签
- 列表页支持全文搜索和筛选
- Cloudflare R2 负责存储文章正文

## 最实用的做法

先把文章元数据放到索引里，再把正文放到 R2 的独立对象中。这样列表加载更快，正文也可以单独读取。

> 这套结构适合个人博客，也方便以后继续加草稿、置顶和封面图。
`,
  },
  {
    slug: 'r2-as-article-store',
    title: '用 Cloudflare R2 作为文章仓库',
    category: '部署笔记',
    tags: ['R2', 'Cloudflare', 'API'],
    summary: 'R2 很适合存储文章 JSON 或 Markdown 文件，配合 Pages Functions 就能形成一个轻量 CMS。',
    cover: '/img/sunshine.jpg',
    status: 'published',
    publishedAt: '2026-04-07T08:00:00.000Z',
    updatedAt: '2026-04-07T08:00:00.000Z',
    readTime: 3,
    content: `# Cloudflare R2 的角色

R2 不负责业务逻辑，只负责把文章数据安全地存下来。

## 推荐结构

- 一个 index 文件保存文章列表和摘要
- 每篇文章一个独立 JSON 对象保存正文
- 搜索在前端完成，接口只负责读写

## 好处

- 列表读取更轻
- 正文可以按需加载
- 后续迁移到数据库也更容易
`,
  },
  {
    slug: 'category-and-search',
    title: '文章分区和搜索应该怎么设计',
    category: '内容组织',
    tags: ['搜索', '分类', 'UX'],
    summary: '当文章数量增多以后，分类和搜索比单纯的时间排序更重要。',
    cover: '/img/sunshine.jpg',
    status: 'published',
    publishedAt: '2026-04-06T08:00:00.000Z',
    updatedAt: '2026-04-06T08:00:00.000Z',
    readTime: 2,
    content: `# 分类优先，搜索兜底

好的博客导航通常有两层：

1. 分类，帮助读者快速缩小范围
2. 搜索，帮助读者精确定位内容

如果后面文章变多，还可以加上置顶、归档和专题页。`,
  },
]
