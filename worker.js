import {
  buildIndexMap,
  collectCategories,
  deleteStoredPost,
  getStoredPost,
  isAuthorized,
  json,
  loadIndexEntries,
  saveIndexEntries,
  slugify,
  sortEntries,
  toFullPost,
  toIndexEntry,
  writeStoredPost,
} from './functions/_blog.js'

const MEDIA_PREFIX = 'blog/media/'

function nowIso() {
  return new Date().toISOString()
}

function inferMediaExtension(fileName = '', contentType = '') {
  const lowerName = String(fileName).toLowerCase()
  if (lowerName.endsWith('.png')) return '.png'
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return '.jpg'
  if (lowerName.endsWith('.webp')) return '.webp'
  if (lowerName.endsWith('.gif')) return '.gif'
  if (lowerName.endsWith('.avif')) return '.avif'
  if (lowerName.endsWith('.svg')) return '.svg'

  const mime = String(contentType || '').toLowerCase()
  if (mime.includes('png')) return '.png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg'
  if (mime.includes('webp')) return '.webp'
  if (mime.includes('gif')) return '.gif'
  if (mime.includes('avif')) return '.avif'
  if (mime.includes('svg')) return '.svg'

  return '.bin'
}

function buildMediaKey(fileName = '', contentType = '') {
  const baseName = String(fileName || 'image').replace(/\.[^.]+$/, '')
  const safeName = slugify(baseName).slice(0, 48) || 'image'
  const stamp = nowIso().replace(/[:.]/g, '-')
  const uniqueId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)
  const extension = inferMediaExtension(fileName, contentType)

  return `${MEDIA_PREFIX}${stamp}-${uniqueId}-${safeName}${extension}`
}

async function readRequestBody(request) {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return request.json()
  }

  const formData = await request.formData()
  const body = {}
  for (const [key, value] of formData.entries()) {
    body[key] = value
  }
  return body
}

async function handlePostsList(request, env) {
  const authorized = isAuthorized(request, env)
  const entries = await loadIndexEntries(env)
  const visibleEntries = authorized ? entries : entries.filter((entry) => entry.status !== 'draft')
  const sortedEntries = sortEntries(visibleEntries).map(({ searchText, ...entry }) => entry)

  return json({
    posts: sortedEntries,
    categories: collectCategories(sortedEntries),
    total: sortedEntries.length,
    admin: authorized,
  })
}

async function handlePostsCreate(request, env) {
  if (!isAuthorized(request, env)) {
    return json({ message: 'Unauthorized' }, 401)
  }

  const body = await readRequestBody(request)
  const entries = await loadIndexEntries(env)
  const indexMap = buildIndexMap(entries)
  const currentSlug = String(body.originalSlug || body.slug || '').trim()
  const existingPost = currentSlug ? await getStoredPost(env, currentSlug) : null
  const post = toFullPost(body, existingPost?.slug || currentSlug)

  if (!post.title) {
    return json({ message: 'title is required' }, 400)
  }

  if (currentSlug && currentSlug !== post.slug) {
    indexMap.delete(currentSlug)
  }

  const nextEntry = toIndexEntry(post, false)
  indexMap.set(post.slug, nextEntry)

  await writeStoredPost(env, post)
  await saveIndexEntries(env, sortEntries(Array.from(indexMap.values())))

  return json({ post, message: 'saved' })
}

async function handlePostDetail(request, env, slug) {
  const authorized = isAuthorized(request, env)
  const post = await getStoredPost(env, slug)

  if (!post) {
    return json({ message: 'Not found' }, 404)
  }

  if (!authorized && post.status === 'draft') {
    return json({ message: 'Not found' }, 404)
  }

  return json({ post })
}

async function handlePostDelete(request, env, slug) {
  if (!isAuthorized(request, env)) {
    return json({ message: 'Unauthorized' }, 401)
  }

  const entries = await loadIndexEntries(env)
  const indexMap = buildIndexMap(entries)
  if (!indexMap.has(slug)) {
    return json({ message: 'Not found' }, 404)
  }

  indexMap.delete(slug)
  await deleteStoredPost(env, slug)
  await saveIndexEntries(env, sortEntries(Array.from(indexMap.values())))

  return json({ message: 'deleted' })
}

async function handleMediaUpload(request, env) {
  if (!isAuthorized(request, env)) {
    return json({ message: 'Unauthorized' }, 401)
  }

  const formData = await request.formData()
  const file = formData.get('file') || formData.get('cover') || formData.get('image')
  if (!file || typeof file.arrayBuffer !== 'function') {
    return json({ message: 'image file is required' }, 400)
  }

  const contentType = String(file.type || '')
  if (!contentType.startsWith('image/')) {
    return json({ message: 'Only image files are allowed' }, 400)
  }

  if (file.size > 5 * 1024 * 1024) {
    return json({ message: 'Image too large' }, 413)
  }

  const key = buildMediaKey(file.name || 'image', contentType)
  await env.BLOG_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType,
    },
    customMetadata: {
      originalName: file.name || '',
      uploadedAt: nowIso(),
    },
  })

  const responseUrl = new URL(request.url)
  const rawUrl = new URL(responseUrl)
  rawUrl.pathname = `/api/media/${encodeURIComponent(key)}`
  rawUrl.hash = ''

  const pageUrl = new URL(responseUrl)
  pageUrl.pathname = '/'
  pageUrl.hash = `#/blog/media/${encodeURIComponent(key)}`

  return json({
    key,
    url: rawUrl.toString(),
    pageUrl: pageUrl.toString(),
    name: file.name || '',
    size: file.size,
    contentType,
  })
}

async function handleMediaRequest(request, env, key) {
  const stored = await env.BLOG_BUCKET.get(key)
  if (!stored) {
    return json({ message: 'Not found' }, 404)
  }

  const headers = new Headers()
  headers.set('content-type', stored.httpMetadata?.contentType || 'application/octet-stream')
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  const fileName = stored.customMetadata?.originalName || key.split('/').pop() || 'image'
  headers.set('content-disposition', `inline; filename="${fileName.replace(/"/g, '')}"`)

  return new Response(stored.body, {
    status: 200,
    headers,
  })
}

function getStaticFetcher(env) {
  if (env?.ASSETS && typeof env.ASSETS.fetch === 'function') {
    return (request) => env.ASSETS.fetch(request)
  }

  // Some deploy modes expose the static fetcher under a non-default binding name.
  for (const value of Object.values(env || {})) {
    if (!value || value === env?.BLOG_BUCKET) {
      continue
    }
    if (typeof value.fetch === 'function') {
      return (request) => value.fetch(request)
    }
  }

  return null
}

async function serveStaticAssets(request, env) {
  const staticFetch = getStaticFetcher(env)
  if (!staticFetch) {
    return json(
      {
        message: 'ASSETS binding is missing',
      },
      500,
    )
  }

  const response = await staticFetch(request)
  if (response.status !== 404 || request.method !== 'GET') {
    return response
  }

  const url = new URL(request.url)
  url.pathname = '/index.html'
  return staticFetch(new Request(url, request))
}

export default {
  async fetch(request, env, context) {
    try {
      const url = new URL(request.url)

      if (url.pathname === '/api/posts' && request.method === 'GET') {
        return handlePostsList(request, env, context)
      }

      if (url.pathname === '/api/posts' && request.method === 'POST') {
        return handlePostsCreate(request, env, context)
      }

      if (url.pathname === '/api/uploads' && request.method === 'POST') {
        return handleMediaUpload(request, env, context)
      }

      const mediaMatch = url.pathname.match(/^\/api\/media\/(.+)$/)
      if (mediaMatch && request.method === 'GET') {
        return handleMediaRequest(request, env, decodeURIComponent(mediaMatch[1]))
      }

      const postDetailMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/)
      if (postDetailMatch) {
        const slug = decodeURIComponent(postDetailMatch[1])
        if (request.method === 'GET') {
          return handlePostDetail(request, env, slug)
        }

        if (request.method === 'DELETE') {
          return handlePostDelete(request, env, slug)
        }
      }

      return serveStaticAssets(request, env)
    } catch (error) {
      return json(
        {
          message: 'Worker runtime error',
          error: error?.message || 'unknown',
        },
        500,
      )
    }
  },
}
