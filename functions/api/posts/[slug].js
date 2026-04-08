import {
  buildIndexMap,
  deleteStoredPost,
  getStoredPost,
  isAuthorized,
  json,
  loadIndexEntries,
  saveIndexEntries,
  sortEntries,
} from '../../../_blog.js'

export async function onRequestGet({ request, env, params }) {
  const authorized = isAuthorized(request, env)
  const post = await getStoredPost(env, params.slug)

  if (!post) {
    return json({ message: 'Not found' }, 404)
  }

  if (!authorized && post.status === 'draft') {
    return json({ message: 'Not found' }, 404)
  }

  return json({ post })
}

export async function onRequestDelete({ request, env, params }) {
  if (!isAuthorized(request, env)) {
    return json({ message: 'Unauthorized' }, 401)
  }

  const entries = await loadIndexEntries(env)
  const indexMap = buildIndexMap(entries)
  if (!indexMap.has(params.slug)) {
    return json({ message: 'Not found' }, 404)
  }

  indexMap.delete(params.slug)
  await deleteStoredPost(env, params.slug)
  await saveIndexEntries(env, sortEntries(Array.from(indexMap.values())))

  return json({ message: 'deleted' })
}
