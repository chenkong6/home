import {
  buildIndexMap,
  collectCategories,
  deleteStoredPost,
  getStoredPost,
  isAuthorized,
  json,
  loadIndexEntries,
  saveIndexEntries,
  sortEntries,
  toFullPost,
  toIndexEntry,
  writeStoredPost,
} from './functions/_blog.js'

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
