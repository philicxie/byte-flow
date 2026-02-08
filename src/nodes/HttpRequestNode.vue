<!-- nodes/HttpRequestNode.vue -->
<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: String,
  data: Object,
  selected: Boolean
})
</script>

<template>
  <div class="http-node" :class="{ selected }">
    <div class="node-header">
      <span class="icon">🌐</span>
      <span>HTTP 请求</span>
    </div>
    <div class="node-body">
      <div class="method-badge" :class="data.method || 'GET'">
        {{ data.method || 'GET' }}
      </div>
      <div class="url">{{ data.url || '/' }}</div>
    </div>
    <!-- 只有输出连接点 -->
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped>
.http-node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 12px;
  min-width: 140px;
  color: white;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border: 2px solid transparent;
  transition: all 0.3s;
}
.http-node.selected {
  border-color: #ffd700;
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.3);
}
.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
}
.icon { font-size: 16px; }
.node-body {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  padding: 8px;
}
.method-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  margin-bottom: 4px;
}
.method-badge.GET { background: #61affe; }
.method-badge.POST { background: #49cc90; }
.method-badge.PUT { background: #fca130; }
.method-badge.DELETE { background: #f93e3e; }
.url {
  font-size: 11px;
  opacity: 0.9;
  word-break: break-all;
}
</style>