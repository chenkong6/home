import { blogSeedPosts } from '../blogSeed.js'

const INDEX_KEY = 'blog/index.json'
const POST_PREFIX = 'blog/posts/'

function nowIso() {
  return new Date().toISOString()
}

function slugify(value) {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || `post-${Date.now().toString(36)}`
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean)
  }

  return String(tags || '')
    .split(/[，,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function deriveReadTime(content) {
  const length = String(content || '').replace(/\s+/g, '').length
  return Math.max(1, Math.ceil(length / 420))
}

function deriveSearchText(post) {
  return [post.title, post.summary, post.category, ...(post.tags || []), post.content]
    .join(' ')
    .toLowerCase()
}

function toIndexEntry(post, isSeed = false) {
  const content = post.content || ''
  return {
    slug: post.slug,
    title: post.title,
    category: post.category || '未分类',
    tags: normalizeTags(post.tags),
    summary: post.summary || '',
    excerpt: post.excerpt || post.summary || '',
    cover: post.cover || '/img/sunshine.jpg',
    coverKey: post.coverKey || '',
    status: post.status || 'published',
    publishedAt: post.publishedAt || nowIso(),
    updatedAt: post.updatedAt || post.publishedAt || nowIso(),
    readTime: post.readTime || deriveReadTime(content),
    searchText: post.searchText || deriveSearchText(post),
    isSeed,
  }
}

function toFullPost(post, fallbackSlug = '') {
  const now = nowIso()
  const title = String(post.title || '').trim()
  const content = String(post.content || '').trim()
  const slug = slugify(post.slug || fallbackSlug || title)
  const tags = normalizeTags(post.tags)
  const summary = String(post.summary || '').trim() || content.slice(0, 160)
  const status = post.status === 'draft' ? 'draft' : 'published'
  const publishedAt = post.publishedAt || now

  return {
    slug,
    title,
    category: String(post.category || '未分类').trim() || '未分类',
    tags,
    summary,
    cover: String(post.cover || '').trim() || '/img/sunshine.jpg',
    coverKey: String(post.coverKey || '').trim(),
    content,
    status,
    publishedAt,
    updatedAt: now,
    createdAt: post.createdAt || post.publishedAt || now,
    readTime: post.readTime || deriveReadTime(content),
    searchText: deriveSearchText({ title, summary, category: post.category || '未分类', tags, content }),
  }
}

async function readJson(bucket, key) {
  const object = await bucket.get(key)
  if (!object) {
    return null
  }

  return JSON.parse(await object.text())
}

async function writeJson(bucket, key, data) {
  await bucket.put(key, JSON.stringify(data, null, 2), {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
    },
  })
}

async function loadIndexEntries(env) {
  const bucket = env.BLOG_BUCKET
  const index = await readJson(bucket, INDEX_KEY)
  if (Array.isArray(index) && index.length) {
    return index
  }

  return blogSeedPosts.map((post) => toIndexEntry(post, true))
}

async function saveIndexEntries(env, entries) {
  await writeJson(env.BLOG_BUCKET, INDEX_KEY, entries)
}

function buildIndexMap(entries) {
  return new Map(entries.map((entry) => [entry.slug, entry]))
}

function isAuthorized(request, env) {
  const expectedToken = String(env.BLOG_ADMIN_TOKEN || '').trim()
  if (!expectedToken) {
    return true
  }

  const receivedToken = request.headers.get('x-blog-admin-token') || ''
  return receivedToken === expectedToken
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function collectCategories(entries) {
  return Array.from(new Set(entries.map((entry) => entry.category || '未分类')))
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    const leftTime = new Date(left.publishedAt || left.updatedAt || 0).getTime()
    const rightTime = new Date(right.publishedAt || right.updatedAt || 0).getTime()
    return rightTime - leftTime
  })
}

async function getStoredPost(env, slug) {
  const key = `${POST_PREFIX}${slug}.json`
  const storedPost = await readJson(env.BLOG_BUCKET, key)
  if (storedPost) {
    return storedPost
  }

  const seedPost = blogSeedPosts.find((post) => post.slug === slug)
  return seedPost ? { ...seedPost } : null
}

async function writeStoredPost(env, post) {
  const key = `${POST_PREFIX}${post.slug}.json`
  await writeJson(env.BLOG_BUCKET, key, post)
}

async function deleteStoredPost(env, slug) {
  await env.BLOG_BUCKET.delete(`${POST_PREFIX}${slug}.json`)
}

export {
  INDEX_KEY,
  buildIndexMap,
  collectCategories,
  deleteStoredPost,
  getStoredPost,
  isAuthorized,
  json,
  loadIndexEntries,
  normalizeTags,
  saveIndexEntries,
  slugify,
  sortEntries,
  toFullPost,
  toIndexEntry,
  writeStoredPost,
}
