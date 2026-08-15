<script setup lang="ts">
defineProps<{ type: 'info' | 'tutorial' }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>{{ type === 'info' ? '项目信息' : '使用教程' }}</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <template v-if="type === 'info'">
          <div class="info-section">
            <div class="info-logo">Zako Files HUB</div>
            <p class="info-tagline">基于 Hugging Face Hub 的免费文件管理系统</p>
          </div>

          <div class="info-section">
            <h3 class="section-title">核心特性</h3>
            <ul class="feature-list">
              <li><span class="feature-icon">∞</span> 无限免费公开存储</li>
              <li><span class="feature-icon">⚡</span> 纯前端架构，零后端依赖</li>
              <li><span class="feature-icon">📁</span> 拖拽上传，支持所有文件类型</li>
              <li><span class="feature-icon">⊞</span> 批量管理：多选、移动、删除</li>
              <li><span class="feature-icon">🔗</span> 多格式分享链接（URL / Markdown / HTML / BBCode）</li>
              <li><span class="feature-icon">📱</span> 响应式设计，适配移动端</li>
              <li><span class="feature-icon">🪞</span> 国内镜像加速支持</li>
            </ul>
          </div>

          <div class="info-section">
            <h3 class="section-title">技术栈</h3>
            <div class="tech-tags">
              <span class="tech-tag">Vue 3</span>
              <span class="tech-tag">Vite</span>
              <span class="tech-tag">TypeScript</span>
              <span class="tech-tag">Hugging Face Hub</span>
              <span class="tech-tag">Cloudflare Pages</span>
            </div>
          </div>

          <div class="info-section">
            <h3 class="section-title">存储说明</h3>
            <p class="info-text">
              所有文件存储在 Hugging Face 公开仓库中，支持 Dataset 和 Model 两种仓库类型。
              数据公开可访问，适合个人轻量级文件管理。
            </p>
          </div>
        </template>

        <template v-else>
          <div class="tutorial-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3 class="step-title">配置账号</h3>
              <p class="step-desc">点击侧边栏「设置」按钮，输入 Hugging Face Token（需 Write 权限）、仓库名称和仓库类型。首次使用会自动创建仓库。</p>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3 class="step-title">上传文件</h3>
              <p class="step-desc">将文件拖拽到上传区域，或点击上传区域选择文件。支持多文件同时上传，大文件自动使用 LFS 存储。上传进度显示在右下角面板。</p>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3 class="step-title">浏览与搜索</h3>
              <p class="step-desc">点击侧边栏文件夹切换分类，使用顶部搜索框按文件名筛选。支持网格视图和列表视图切换。</p>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h3 class="step-title">查看文件</h3>
              <p class="step-desc">点击文件打开详情面板，支持图片预览、视频播放、文本编辑。可全屏查看、缩放平移。</p>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="step-number">5</div>
            <div class="step-content">
              <h3 class="step-title">分享文件</h3>
              <p class="step-desc">在文件详情面板中，可选择 URL / Markdown / HTML / BBCode 格式复制分享链接。开启镜像后链接自动使用 hf-mirror.com 加速。</p>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="step-number">6</div>
            <div class="step-content">
              <h3 class="step-title">批量操作</h3>
              <p class="step-desc">点击多选按钮进入多选模式，可拖选多个文件。支持全选、批量移动到其他文件夹、批量删除。移动端长按 500ms 也可激活多选。</p>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="step-number">7</div>
            <div class="step-content">
              <h3 class="step-title">文件夹管理</h3>
              <p class="step-desc">侧边栏点击「+」按钮创建新文件夹。可将文件移动到不同文件夹进行分类管理。删除文件夹会同时删除其中所有文件。</p>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="step-number">8</div>
            <div class="step-content">
              <h3 class="step-title">国内加速</h3>
              <p class="step-desc">在设置中开启「国内镜像」选项，文件直链将使用 hf-mirror.com 加速访问，适合国内网络环境。</p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal {
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
}
.modal-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ink);
}
.close-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 1.1rem;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  min-width: 36px;
  min-height: 36px;
  transition: background 0.15s, color 0.15s;
}
.close-btn:hover {
  background: var(--bg3);
  color: var(--ink);
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.info-section {
  margin-bottom: 24px;
}
.info-section:last-child {
  margin-bottom: 0;
}
.info-logo {
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 6px;
}
.info-tagline {
  font-size: 0.9rem;
  color: var(--muted);
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
  color: var(--ink);
}
.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--bg3);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  flex-shrink: 0;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tech-tag {
  background: var(--bg3);
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 100px;
  border: 1px solid var(--rule);
}

.info-text {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.tutorial-step {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}
.tutorial-step:last-child {
  margin-bottom: 0;
}
.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 50%;
  flex-shrink: 0;
}
.step-content {
  flex: 1;
  min-width: 0;
}
.step-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 4px;
}
.step-desc {
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }
  .modal {
    max-width: none;
    max-height: 90vh;
    border-radius: var(--radius) var(--radius) 0 0;
  }
  .modal-header {
    padding: 16px 16px;
  }
  .modal-body {
    padding: 16px;
  }
}
</style>
