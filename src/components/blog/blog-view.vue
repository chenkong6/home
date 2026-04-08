<template>
  <div class="blog-shell">
    <v-container fluid class="blog-page">
      <section class="blog-hero">
        <div class="blog-hero__copy">
          <div class="blog-eyebrow">Blog / R2 / Search</div>
          <h1>{{ blogTitle }}</h1>
          <p>{{ blogSubtitle }}</p>
          <div class="blog-hero__actions">
            <v-btn color="var(--leleo-vcard-color)" variant="elevated" @click="$emit('go-home')">
              返回首页
            </v-btn>
            <v-btn variant="tonal" color="var(--leleo-vcard-color)" @click="openEditor()">
              写文章
            </v-btn>
            <v-btn variant="tonal" color="var(--leleo-vcard-color)" @click="openAuthDialog()">
              管理员
            </v-btn>
          </div>
        </div>

        <div class="blog-hero__stats">
          <v-card class="blog-stat-card" rounded="xl" variant="tonal">
            <div class="blog-stat-card__value">{{ visiblePosts.length }}</div>
            <div class="blog-stat-card__label">文章总数</div>
          </v-card>
          <v-card class="blog-stat-card" rounded="xl" variant="tonal">
            <div class="blog-stat-card__value">{{ categories.length }}</div>
            <div class="blog-stat-card__label">分类数量</div>
          </v-card>
          <v-card class="blog-stat-card" rounded="xl" variant="tonal">
            <div class="blog-stat-card__value">{{ draftCount }}</div>
            <div class="blog-stat-card__label">草稿数量</div>
          </v-card>
        </div>
      </section>

      <v-card class="blog-toolbar" rounded="xl" variant="tonal">
        <div class="blog-toolbar__row">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            label="搜索标题、分类、标签或正文"
            variant="solo"
            density="comfortable"
            hide-details
            clearable
          />

          <v-select
            v-model="statusFilter"
            :items="statusOptions"
            item-title="title"
            item-value="value"
            label="状态"
            variant="solo"
            density="comfortable"
            hide-details
          />

          <v-btn color="var(--leleo-vcard-color)" variant="elevated" @click="openEditor()">
            新建文章
          </v-btn>
        </div>

        <v-chip-group v-model="selectedCategory" mandatory class="blog-toolbar__chips">
          <v-chip
            v-for="category in categoryOptions"
            :key="category"
            :value="category"
            variant="tonal"
          >
            {{ category }}
          </v-chip>
        </v-chip-group>
      </v-card>

      <div v-if="loading" class="blog-loading">
        <v-progress-circular indeterminate color="var(--leleo-vcard-color)"></v-progress-circular>
      </div>

      <div v-if="errorMessage" class="blog-empty-state blog-empty-state--notice">
        <v-icon size="40">mdi-cloud-alert</v-icon>
        <div>{{ errorMessage }}</div>
      </div>

      <v-row class="blog-grid">
        <v-col
          v-for="post in filteredPosts"
          :key="post.slug"
          cols="12"
          md="6"
          xl="4"
        >
          <v-card class="blog-post-card" rounded="xl" variant="tonal" @click="openDetail(post.slug)">
            <v-img
              :src="post.cover || defaultCover"
              height="220"
              cover
              class="blog-post-card__cover"
            />
            <v-card-text class="blog-post-card__content">
              <div class="blog-post-card__meta">
                <v-chip size="small" variant="flat" color="rgba(255,255,255,0.18)">
                  {{ post.category || '未分类' }}
                </v-chip>
                <v-chip
                  v-if="post.status === 'draft'"
                  size="small"
                  variant="flat"
                  color="rgba(255,160,90,0.22)"
                >
                  草稿
                </v-chip>
              </div>

              <h2>{{ post.title }}</h2>
              <p>{{ post.summary || post.excerpt || '暂无摘要' }}</p>

              <div class="blog-post-card__footer">
                <span>{{ formatDate(post.publishedAt) }}</span>
                <span>{{ post.readTime || 1 }} 分钟</span>
              </div>

              <div class="blog-post-card__tags">
                <v-chip
                  v-for="tag in post.tags || []"
                  :key="`${post.slug}-${tag}`"
                  size="small"
                  variant="tonal"
                >
                  {{ tag }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <div v-if="!loading && !filteredPosts.length" class="blog-empty-state">
        <v-icon size="40">mdi-text-search</v-icon>
        <div>没有找到匹配的文章</div>
      </div>
    </v-container>

    <v-dialog v-model="detailDialog" max-width="980">
      <v-card class="blog-dialog" rounded="xl">
        <v-card-title class="blog-dialog__header">
          <div>
            <div class="blog-dialog__eyebrow">文章详情</div>
            <h3>{{ detailPost?.title }}</h3>
          </div>

          <div class="blog-dialog__actions">
            <v-btn variant="tonal" @click="startEdit(detailPost)">编辑</v-btn>
            <v-btn variant="text" @click="detailDialog = false">关闭</v-btn>
          </div>
        </v-card-title>

        <v-card-text v-if="detailPost" class="blog-article">
          <div class="blog-article__meta">
            <v-chip variant="tonal">{{ detailPost.category || '未分类' }}</v-chip>
            <span>{{ formatDate(detailPost.publishedAt) }}</span>
            <span>{{ detailPost.readTime || 1 }} 分钟阅读</span>
          </div>

          <div class="blog-article__tags">
            <v-chip v-for="tag in detailPost.tags || []" :key="`${detailPost.slug}-${tag}-detail`" size="small" variant="tonal">
              {{ tag }}
            </v-chip>
          </div>

          <div class="blog-article__content markdown-body" v-html="renderContent(detailPost.content)"></div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editorDialog" max-width="1100" scrollable>
      <v-card class="blog-dialog" rounded="xl">
        <v-card-title class="blog-dialog__header">
          <div>
            <div class="blog-dialog__eyebrow">{{ editorMode === 'create' ? '新建文章' : '编辑文章' }}</div>
            <h3>{{ editorForm.title || '未命名文章' }}</h3>
          </div>
          <div class="blog-dialog__actions">
            <v-btn variant="tonal" @click="savePost" :loading="saving">保存</v-btn>
            <v-btn variant="text" @click="editorDialog = false">取消</v-btn>
          </div>
        </v-card-title>

        <v-card-text>
          <v-row>
            <v-col cols="12" md="7">
              <v-text-field v-model="editorForm.title" label="标题" variant="outlined" class="mb-3" />
              <v-text-field v-model="editorForm.slug" label="Slug" variant="outlined" class="mb-3" />
              <v-combobox
                v-model="editorForm.category"
                :items="categoryOptions.filter((item) => item !== '全部')"
                label="分类"
                variant="outlined"
                class="mb-3"
                clearable
                allow-new
              />
              <v-text-field v-model="tagsInput" label="标签，逗号分隔" variant="outlined" class="mb-3" />
              <v-text-field v-model="editorForm.cover" label="封面地址" variant="outlined" class="mb-3" />
              <v-textarea v-model="editorForm.summary" label="摘要" rows="3" variant="outlined" class="mb-3" />
              <v-textarea v-model="editorForm.content" label="正文 Markdown" rows="14" variant="outlined" />
            </v-col>

            <v-col cols="12" md="5">
              <v-card rounded="xl" variant="tonal" class="blog-preview">
                <div class="blog-preview__title">实时预览</div>
                <div class="blog-preview__meta">
                  <span>{{ editorForm.category || '未分类' }}</span>
                  <span>{{ editorForm.status === 'draft' ? '草稿' : '已发布' }}</span>
                </div>
                <div class="markdown-body" v-html="renderContent(previewSource)"></div>
              </v-card>

              <v-select
                v-model="editorForm.status"
                :items="statusOptions.slice(0, 2)"
                item-title="title"
                item-value="value"
                label="状态"
                variant="outlined"
                class="mt-4"
              />

              <v-text-field v-model="editorForm.publishedAt" type="datetime-local" label="发布时间" variant="outlined" class="mt-4" />

              <v-btn
                v-if="editorMode === 'edit'"
                color="error"
                variant="tonal"
                class="mt-4"
                :loading="deleting"
                @click="deleteCurrentPost"
              >
                删除文章
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="authDialog" max-width="560">
      <v-card class="blog-dialog" rounded="xl">
        <v-card-title>
          <h3>管理员口令</h3>
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="adminTokenInput"
            label="BLOG_ADMIN_TOKEN"
            type="password"
            variant="outlined"
            hide-details
          />
          <p class="blog-auth-tip">
            如果 Cloudflare Pages 里配置了管理员口令，这里必须填写一致的值才能发布、编辑或删除文章。
          </p>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="authDialog = false">取消</v-btn>
          <v-btn variant="tonal" color="var(--leleo-vcard-color)" @click="saveAdminToken">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="2400" rounded="pill">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script>
import { blogSeedPosts } from '../../../blogSeed.js'
import { markdownToHtml } from '../../utils/blogMarkdown.js'
import { useDisplay } from 'vuetify'

const STORAGE_KEY = 'blog-admin-token'

function createEmptyPost() {
  const now = new Date()
  const timeValue = now.toISOString().slice(0, 16)

  return {
    title: '',
    slug: '',
    category: '未分类',
    tags: [],
    summary: '',
    cover: '/img/sunshine.jpg',
    content: '',
    status: 'published',
    publishedAt: timeValue,
  }
}

export default {
  emits: ['go-home'],
  setup() {
    const { smAndDown } = useDisplay()
    return { smAndDown }
  },
  props: {
    configdata: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      blogTitle: '辰空的博客',
      blogSubtitle: '文章、分类、搜索与 Cloudflare R2 存储。',
      defaultCover: '/img/sunshine.jpg',
      posts: [],
      categories: [],
      loading: false,
      errorMessage: '',
      searchQuery: '',
      selectedCategory: '全部',
      statusFilter: 'published',
      statusOptions: [
        { title: '已发布', value: 'published' },
        { title: '草稿', value: 'draft' },
        { title: '全部', value: 'all' },
      ],
      detailDialog: false,
      detailPost: null,
      editorDialog: false,
      editorMode: 'create',
      editorForm: createEmptyPost(),
      originalSlug: '',
      tagsInput: '',
      saving: false,
      deleting: false,
      authDialog: false,
      adminTokenInput: '',
      snackbar: {
        show: false,
        text: '',
        color: 'var(--leleo-vcard-color)',
      },
    }
  },
  computed: {
    categoryOptions() {
      return ['全部', ...this.categories]
    },
    visiblePosts() {
      const isAdmin = Boolean(this.adminTokenInput.trim())
      return this.posts.filter((post) => isAdmin || post.status !== 'draft')
    },
    draftCount() {
      return this.visiblePosts.filter((post) => post.status === 'draft').length
    },
    filteredPosts() {
      const query = this.searchQuery.trim().toLowerCase()
      const category = this.selectedCategory
      const isAdmin = Boolean(this.adminTokenInput.trim())

      return this.visiblePosts.filter((post) => {
        if (!isAdmin && post.status === 'draft') {
          return false
        }

        const matchedCategory = category === '全部' || post.category === category
        const matchedStatus = this.statusFilter === 'all' || post.status === this.statusFilter
        const matchedSearch = !query || [post.title, post.summary, post.excerpt, post.category, post.searchText, ...(post.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(query)

        return matchedCategory && matchedStatus && matchedSearch
      })
    },
    previewSource() {
      return [
        `# ${this.editorForm.title || '文章标题'}`,
        '',
        this.editorForm.summary ? `> ${this.editorForm.summary}` : '',
        '',
        this.editorForm.content || '在这里输入 Markdown 正文。',
      ]
        .filter(Boolean)
        .join('\n')
    },
  },
  mounted() {
    this.blogTitle = this.configdata?.blog?.title || this.blogTitle
    this.blogSubtitle = this.configdata?.blog?.subtitle || this.blogSubtitle
    this.defaultCover = this.configdata?.blog?.cover || this.defaultCover

    const savedToken = window.localStorage.getItem(STORAGE_KEY)
    if (savedToken) {
      this.adminTokenInput = savedToken
    }

    this.loadPosts()
  },
  methods: {
    renderContent(content) {
      return markdownToHtml(content || '')
    },
    formatDate(value) {
      if (!value) {
        return '未发布'
      }

      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    },
    showMessage(text, color = 'var(--leleo-vcard-color)') {
      this.snackbar = {
        show: true,
        text,
        color,
      }
    },
    apiHeaders(extraHeaders = {}) {
      const headers = { ...extraHeaders }
      if (this.adminTokenInput.trim()) {
        headers['X-Blog-Admin-Token'] = this.adminTokenInput.trim()
      }
      return headers
    },
    async loadPosts() {
      this.loading = true
      this.errorMessage = ''

      try {
        const response = await fetch('/api/posts', {
          headers: this.apiHeaders(),
        })

        if (!response.ok) {
          throw new Error('请求文章列表失败')
        }

        const data = await response.json()
        this.posts = data.posts || []
        this.categories = data.categories || []
      } catch (error) {
        this.posts = blogSeedPosts.map((post) => ({
          ...post,
          excerpt: post.summary,
          searchText: `${post.title} ${post.summary} ${post.category} ${(post.tags || []).join(' ')} ${post.content}`.toLowerCase(),
        }))
        this.categories = Array.from(new Set(this.posts.map((post) => post.category).filter(Boolean)))
        this.errorMessage = '当前没有连上 Cloudflare R2，已回退到本地示例文章。'
        if (import.meta.env.DEV) {
          console.warn(error)
        }
      } finally {
        this.loading = false
      }
    },
    async openDetail(slug) {
      try {
        const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
          headers: this.apiHeaders(),
        })

        if (!response.ok) {
          throw new Error('文章不存在')
        }

        const data = await response.json()
        this.detailPost = data.post
        this.detailDialog = true
      } catch (error) {
        const fallback = this.posts.find((post) => post.slug === slug)
        if (fallback) {
          this.detailPost = fallback
          this.detailDialog = true
          return
        }

        this.showMessage('读取文章失败', 'error')
        if (import.meta.env.DEV) {
          console.error(error)
        }
      }
    },
    openEditor(post = null) {
      if (!this.adminTokenInput.trim()) {
        this.openAuthDialog()
      }

      if (!post) {
        this.editorMode = 'create'
        this.editorForm = createEmptyPost()
        this.originalSlug = ''
        this.tagsInput = ''
        this.editorDialog = true
        return
      }

      this.startEdit(post)
    },
    async startEdit(post) {
      if (!post) {
        return
      }

      try {
        const response = await fetch(`/api/posts/${encodeURIComponent(post.slug)}`, {
          headers: this.apiHeaders(),
        })

        if (!response.ok) {
          throw new Error('读取文章失败')
        }

        const data = await response.json()
        const nextPost = data.post || post
        this.editorMode = 'edit'
        this.originalSlug = nextPost.slug
        this.editorForm = {
          title: nextPost.title || '',
          slug: nextPost.slug || '',
          category: nextPost.category || '未分类',
          tags: nextPost.tags || [],
          summary: nextPost.summary || '',
          cover: nextPost.cover || this.defaultCover,
          content: nextPost.content || '',
          status: nextPost.status || 'published',
          publishedAt: String(nextPost.publishedAt || new Date().toISOString()).slice(0, 16),
        }
        this.tagsInput = (nextPost.tags || []).join(', ')
        this.editorDialog = true
      } catch (error) {
        this.showMessage('无法打开编辑器', 'error')
        if (import.meta.env.DEV) {
          console.error(error)
        }
      }
    },
    async savePost() {
      if (!this.adminTokenInput.trim()) {
        this.openAuthDialog()
        this.showMessage('请先保存管理员口令', 'warning')
        return
      }

      const title = this.editorForm.title.trim()
      const content = this.editorForm.content.trim()
      if (!title || !content) {
        this.showMessage('标题和正文不能为空', 'warning')
        return
      }

      this.saving = true
      try {
        const payload = {
          ...this.editorForm,
          title,
          content,
          tags: this.tagsInput
            .split(/[，,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean),
          originalSlug: this.originalSlug,
        }

        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: this.apiHeaders({
            'content-type': 'application/json',
          }),
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || '保存失败')
        }

        this.showMessage('文章已保存')
        this.editorDialog = false
        this.detailDialog = false
        await this.loadPosts()
      } catch (error) {
        this.showMessage(error.message || '保存失败', 'error')
        if (import.meta.env.DEV) {
          console.error(error)
        }
      } finally {
        this.saving = false
      }
    },
    async deleteCurrentPost() {
      if (!this.originalSlug) {
        return
      }

      if (!window.confirm('确定要删除这篇文章吗？')) {
        return
      }

      this.deleting = true
      try {
        const response = await fetch(`/api/posts/${encodeURIComponent(this.originalSlug)}`, {
          method: 'DELETE',
          headers: this.apiHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || '删除失败')
        }

        this.showMessage('文章已删除')
        this.editorDialog = false
        this.detailDialog = false
        await this.loadPosts()
      } catch (error) {
        this.showMessage(error.message || '删除失败', 'error')
        if (import.meta.env.DEV) {
          console.error(error)
        }
      } finally {
        this.deleting = false
      }
    },
    openAuthDialog() {
      this.authDialog = true
    },
    saveAdminToken() {
      const token = this.adminTokenInput.trim()
      if (token) {
        window.localStorage.setItem(STORAGE_KEY, token)
        this.showMessage('管理员口令已保存')
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
        this.showMessage('管理员口令已清空', 'warning')
      }
      this.authDialog = false
      this.loadPosts()
    },
  },
}
</script>

<style scoped>
.blog-shell {
  min-height: 100vh;
  padding: 1.25rem;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, rgba(255, 203, 142, 0.22), transparent 30%),
    radial-gradient(circle at top right, rgba(120, 184, 255, 0.18), transparent 24%),
    linear-gradient(180deg, rgba(8, 12, 24, 0.72), rgba(8, 12, 24, 0.86));
  color: rgba(255, 255, 255, 0.94);
}

.blog-page {
  max-width: 1440px;
}

.blog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.8fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.blog-hero__copy,
.blog-hero__stats,
.blog-toolbar,
.blog-dialog,
.blog-post-card,
.blog-preview {
  backdrop-filter: blur(16px);
}

.blog-hero__copy {
  padding: 1.6rem;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.blog-eyebrow,
.blog-dialog__eyebrow,
.blog-preview__title {
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.7;
}

.blog-hero h1 {
  margin: 0.5rem 0 0.8rem;
  font-size: clamp(2.2rem, 4vw, 4.6rem);
  line-height: 1;
}

.blog-hero p {
  max-width: 52rem;
  margin: 0;
  font-size: 1rem;
  line-height: 1.8;
  opacity: 0.86;
}

.blog-hero__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1.3rem;
}

.blog-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.blog-stat-card {
  padding: 1rem;
  text-align: center;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
}

.blog-stat-card__value {
  font-size: clamp(1.7rem, 3vw, 2.6rem);
  font-weight: 700;
}

.blog-stat-card__label {
  margin-top: 0.3rem;
  opacity: 0.72;
}

.blog-toolbar {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
}

.blog-toolbar__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px auto;
  gap: 0.85rem;
  align-items: center;
}

.blog-toolbar__chips {
  margin-top: 0.75rem;
}

.blog-grid {
  margin-top: 0;
}

.blog-post-card {
  cursor: pointer;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.blog-post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.blog-post-card__content {
  padding: 1rem 1rem 1.15rem;
}

.blog-post-card__meta,
.blog-post-card__footer,
.blog-article__meta,
.blog-article__tags,
.blog-post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.blog-post-card__content h2 {
  margin: 0.95rem 0 0.55rem;
  font-size: 1.3rem;
  line-height: 1.35;
}

.blog-post-card__content p {
  min-height: 3.6rem;
  margin: 0;
  opacity: 0.78;
  line-height: 1.7;
}

.blog-post-card__footer {
  justify-content: space-between;
  margin-top: 0.9rem;
  font-size: 0.82rem;
  opacity: 0.72;
}

.blog-post-card__tags {
  margin-top: 0.8rem;
}

.blog-loading,
.blog-empty-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  margin: 1rem 0;
  gap: 0.8rem;
  border-radius: 24px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
}

.blog-dialog {
  border-radius: 28px;
  background: rgba(14, 18, 31, 0.92);
  color: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.blog-dialog__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.blog-dialog__header h3 {
  margin: 0.35rem 0 0;
  font-size: 1.55rem;
}

.blog-dialog__actions {
  display: flex;
  gap: 0.6rem;
}

.blog-article {
  padding-top: 0.4rem;
}

.blog-article__meta {
  align-items: center;
  margin-bottom: 0.9rem;
  opacity: 0.74;
}

.blog-article__content {
  margin-top: 1.2rem;
}

.blog-preview {
  min-height: 540px;
  padding: 1rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.blog-preview__meta {
  display: flex;
  gap: 0.5rem;
  margin: 0.7rem 0 1rem;
  opacity: 0.75;
}

.blog-auth-tip {
  margin-top: 0.8rem;
  line-height: 1.7;
  opacity: 0.8;
}

.markdown-body {
  line-height: 1.9;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 1.1rem 0 0.65rem;
  line-height: 1.3;
}

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(blockquote),
.markdown-body :deep(pre) {
  margin: 0 0 1rem;
}

.markdown-body :deep(blockquote) {
  padding: 0.9rem 1rem;
  border-left: 4px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0 16px 16px 0;
}

.markdown-body :deep(code) {
  padding: 0.16rem 0.34rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
}

.markdown-body :deep(pre code) {
  display: block;
  padding: 1rem;
  overflow-x: auto;
  white-space: pre;
}

@media (max-width: 960px) {
  .blog-hero,
  .blog-toolbar__row {
    grid-template-columns: 1fr;
  }

  .blog-hero__stats {
    grid-template-columns: 1fr;
  }

  .blog-dialog__header {
    flex-direction: column;
  }

  .blog-dialog__actions {
    flex-wrap: wrap;
  }
}
</style>
