import {
  buildIndexMap,
  collectCategories,
  getStoredPost,
  isAuthorized,
  json,
  loadIndexEntries,
  saveIndexEntries,
  sortEntries,
  toFullPost,
  toIndexEntry,
  writeStoredPost,
} from '../../../_blog.js'

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

export async function onRequestGet({ request, env }) {
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

export async function onRequestPost({ request, env }) {
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
