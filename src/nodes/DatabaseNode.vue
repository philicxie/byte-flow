<!-- nodes/DatabaseNode.vue -->
<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: String,
  data: Object,
  selected: Boolean
})
</script>

<template>
  <div class="db-node" :class="{ selected }">
    <div class="db-cylinder">
      <div class="db-top"></div>
      <div class="db-body">
        <div class="node-header">
          <span class="icon">🗄️</span>
          <span>{{ data.type || 'MySQL' }}</span>
        </div>
        <div class="db-info">
          <div class="db-name">{{ data.name || 'db-master' }}</div>
          <div class="db-stats">
            <span>QPS: {{ data.qps || '0' }}</span>
            <span>Conn: {{ data.connections || '0' }}</span>
          </div>
        </div>
      </div>
      <div class="db-bottom"></div>
    </div>
    <!-- 只有输入连接点 -->
    <Handle type="target" :position="Position.Top" />
  </div>
</template>

<style scoped>
.db-node {
  position: relative;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}
.db-node.selected .db-body {
  border-color: #ffd700;
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.3);
}
.db-cylinder {
  width: 140px;
}
.db-top, .db-bottom {
  height: 20px;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  border-radius: 50%;
  border: 2px solid #4a5568;
}
.db-top {
  margin-bottom: -10px;
  position: relative;
  z-index: 2;
  background: linear-gradient(135deg, #718096 0%, #4a5568 100%);
}
.db-body {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  padding: 15px 12px 12px;
  border-left: 2px solid #4a5568;
  border-right: 2px solid #4a5568;
  color: white;
  position: relative;
  z-index: 1;
}
.db-bottom {
  margin-top: -10px;
  position: relative;
  z-index: 0;
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
.db-name {
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 6px;
  font-family: monospace;
}
.db-stats {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  background: rgba(0,0,0,0.2);
  padding: 4px 8px;
  border-radius: 4px;
}
</style>