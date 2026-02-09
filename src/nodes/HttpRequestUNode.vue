<!-- nodes/HttpRequestNode.vue -->
<script setup>
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

// 请求的服务模块列表
const requiredModules = computed(() => {
  return props.data.modules || ['user', 'order'] // 默认示例
})

// 计算请求复杂度颜色
const complexityColor = computed(() => {
  const count = requiredModules.value.length
  if (count <= 2) return '#48bb78' // 绿色-简单
  if (count <= 4) return '#ecc94b' // 黄色-中等
  return '#f56565' // 红色-复杂
})
</script>

<template>
  <div class="http-node" :class="{ selected }">
    <div class="node-header">
      <span class="icon">🌐</span>
      <span>HTTP 请求</span>
      <span class="complexity-badge" :style="{ background: complexityColor }">
        {{ requiredModules.length }} 模块
      </span>
    </div>
    
    <div class="node-body">
      <div class="request-line">
        <span class="method" :class="data.method || 'GET'">{{ data.method || 'GET' }}</span>
        <span class="path">{{ data.path || '/api/v1/...' }}</span>
      </div>
      
      <!-- 所需服务模块标签 -->
      <div class="modules-section">
        <div class="section-title">所需服务模块:</div>
        <div class="module-tags">
          <span 
            v-for="mod in requiredModules" 
            :key="mod"
            class="module-tag"
            :class="{ 'missing': data.missingModules?.includes(mod) }"
          >
            {{ mod }}
          </span>
        </div>
      </div>
      
      <!-- 请求体预览 -->
      <div v-if="data.body" class="body-preview">
        <div class="section-title">请求体:</div>
        <code>{{ JSON.stringify(data.body).slice(0, 50) }}...</code>
      </div>
    </div>
    
    <!-- 输出连接点：指向服务实例 -->
    <Handle 
      type="source" 
      :position="Position.Bottom"
      :style="{ background: complexityColor }"
    />
  </div>
</template>

<style scoped>
.http-node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  min-width: 220px;
  max-width: 300px;
  color: white;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  border: 2px solid transparent;
  transition: all 0.3s;
}
.http-node.selected {
  border-color: #ffd700;
  box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.3);
}
.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  margin-bottom: 12px;
  font-size: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  padding-bottom: 8px;
}
.icon { font-size: 18px; }
.complexity-badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
}
.node-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.request-line {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.2);
  padding: 6px 10px;
  border-radius: 6px;
}
.method {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}
.method.GET { background: #61affe; }
.method.POST { background: #49cc90; }
.method.PUT { background: #fca130; }
.method.DELETE { background: #f93e3e; }
.path {
  font-size: 12px;
  opacity: 0.9;
  font-family: monospace;
}
.modules-section {
  background: rgba(255,255,255,0.1);
  padding: 10px;
  border-radius: 8px;
}
.section-title {
  font-size: 10px;
  text-transform: uppercase;
  opacity: 0.8;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}
.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.module-tag {
  background: rgba(255,255,255,0.2);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  border: 1px solid rgba(255,255,255,0.3);
  transition: all 0.2s;
}
.module-tag.missing {
  background: rgba(245, 101, 101, 0.3);
  border-color: #f56565;
  text-decoration: line-through;
  opacity: 0.6;
}
.body-preview {
  background: rgba(0,0,0,0.2);
  padding: 8px;
  border-radius: 6px;
  font-size: 10px;
}
.body-preview code {
  font-family: 'Courier New', monospace;
  opacity: 0.9;
  word-break: break-all;
}
</style>