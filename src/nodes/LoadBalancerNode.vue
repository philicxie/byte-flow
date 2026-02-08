<!-- nodes/LoadBalancerNode.vue -->
<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: String,
  data: Object,
  selected: Boolean
})
</script>

<template>
  <div class="lb-node" :class="{ selected }">
    <div class="node-header">
      <span class="icon">⚖️</span>
      <span>负载均衡</span>
    </div>
    <div class="node-body">
      <div class="algorithm">{{ data.algorithm || 'Round Robin' }}</div>
      <div class="stats">
        <span>后端: {{ data.backends || 3 }} 个</span>
      </div>
    </div>
    <!-- 输入连接点 -->
    <Handle type="target" :position="Position.Top" />
    <Handle id="bottom" type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped>
.lb-node {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 50px;
  padding: 15px 20px;
  min-width: 150px;
  color: white;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border: 2px solid transparent;
  transition: all 0.3s;
}
.lb-node.selected {
  border-color: #ffd700;
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.3);
}
.node-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
}
.icon { font-size: 18px; }
.algorithm {
  font-size: 12px;
  background: rgba(255,255,255,0.2);
  padding: 4px 8px;
  border-radius: 12px;
  margin-bottom: 6px;
}
.stats {
  font-size: 11px;
  opacity: 0.9;
}
</style>