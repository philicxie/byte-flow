<!-- nodes/ServerNode.vue -->
<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: String,
  data: Object,
  selected: Boolean
})
</script>

<template>
  <div class="server-node" :class="{ selected, active: data.active }">
    <div class="status-indicator" :class="data.status || 'healthy'"></div>
    <div class="node-content">
      <div class="node-header">
        <span class="icon">🖥️</span>
        <span>服务器 {{ data.id || '' }}</span>
      </div>
      <div class="specs">
        <div class="spec">CPU: {{ data.cpu || '2' }}核</div>
        <div class="spec">MEM: {{ data.memory || '4' }}GB</div>
      </div>
      <div class="load-bar">
        <div class="load-fill" :style="{ width: (data.load || 0) + '%' }"></div>
      </div>
      <div class="load-text">负载: {{ data.load || 0 }}%</div>
    </div>
    <!-- 输入连接点（来自负载均衡） -->
    <Handle type="target" :position="Position.Top" />
    <!-- 输出连接点（连向数据库） -->
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped>
.server-node {
  background: #2d3748;
  border-radius: 8px;
  padding: 12px;
  min-width: 130px;
  color: white;
  position: relative;
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
  border: 2px solid transparent;
  transition: all 0.3s;
}
.server-node.selected {
  border-color: #ffd700;
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.3);
}
.server-node.active {
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(72, 187, 120, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(72, 187, 120, 0); }
}
.status-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-indicator.healthy { background: #48bb78; box-shadow: 0 0 0 2px rgba(72, 187, 120, 0.3); }
.status-indicator.warning { background: #ecc94b; }
.status-indicator.error { background: #f56565; }
.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 13px;
}
.icon { font-size: 16px; }
.specs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.spec {
  font-size: 10px;
  background: rgba(255,255,255,0.1);
  padding: 2px 6px;
  border-radius: 3px;
}
.load-bar {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}
.load-fill {
  height: 100%;
  background: linear-gradient(90deg, #48bb78, #ecc94b, #f56565);
  transition: width 0.3s;
}
.load-text {
  font-size: 10px;
  text-align: right;
  opacity: 0.8;
}
</style>