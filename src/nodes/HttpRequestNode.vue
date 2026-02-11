<!-- nodes/HttpRequestNode.vue -->
<script setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { ref, computed, watch } from 'vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const { isSimulating } = useVueFlow() // 注入模拟状态

// 请求复杂度
const requiredModules = computed(() => props.data.modules || [])
const complexityColor = computed(() => {
  const count = requiredModules.value.length
  if (count <= 2) return '#48bb78'
  if (count <= 4) return '#ecc94b'
  return '#f56565'
})

// 实时状态（模拟态）
const isProcessing = computed(() => (props.data.currentLoad || 0) > 0)
const rps = computed(() => Math.round(props.data.rps || 0))
const avgLatency = computed(() => Math.round(props.data.avgLatency || 0))

// 脉冲动画触发
const pulseActive = ref(false)
watch(() => props.data.currentLoad, (newVal, oldVal) => {
  if (newVal > oldVal) {
    pulseActive.value = true
    setTimeout(() => pulseActive.value = false, 300)
  }
})
</script>

<template>
  <div 
    class="http-node" 
    :class="{ 
      selected, 
      'simulating': isSimulating,
      'processing': isProcessing,
      'pulse': pulseActive
    }"
  >
    <!-- 模拟态指示器 -->
    <div v-if="isSimulating" class="sim-badge" :class="{ active: isProcessing }">
      <span class="pulse-dot"></span>
      {{ isProcessing ? '处理中' : '待机' }}
    </div>
    
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
        <span class="path">{{ data.path || '/api/...' }}</span>
      </div>
      
      <!-- 服务模块标签 -->
      <div class="modules-section">
        <div class="section-title">所需服务模块:</div>
        <div class="module-tags">
          <span 
            v-for="mod in requiredModules" 
            :key="mod"
            class="module-tag"
          >
            {{ mod }}
          </span>
        </div>
      </div>
      
      <!-- 模拟态实时指标 -->
      <div v-if="isSimulating" class="metrics-panel">
        <div class="metric">
          <span class="metric-label">RPS</span>
          <span class="metric-value" :class="{ high: rps > 50 }">{{ rps }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">延时</span>
          <span class="metric-value" :class="{ high: avgLatency > 200 }">
            {{ avgLatency }}ms
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">负载</span>
          <span class="metric-value">{{ Math.round(data.load || 0) }}%</span>
        </div>
      </div>
      
      <!-- 编辑态：处理延时配置 -->
      <div v-else class="config-panel">
        <label>
          处理延时: {{ data.processingDelay || 10 }}ms
          <input 
            type="range" 
            min="5" 
            max="100" 
            :value="data.processingDelay || 10"
            @input="$emit('update:data', { ...data, processingDelay: +$event.target.value })"
            class="nodrag"
          />
        </label>
      </div>
    </div>
    
    <Handle 
      type="source" 
      :position="Position.Bottom"
      :style="{ background: isProcessing ? '#48bb78' : complexityColor }"
    />
  </div>
</template>

<style scoped>
.http-node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  min-width: 220px;
  color: white;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  border: 2px solid transparent;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.http-node.selected {
  border-color: #ffd700;
}

/* 模拟态样式 */
.http-node.simulating {
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
}

.http-node.processing {
  animation: processing-glow 1s ease-in-out infinite alternate;
}

@keyframes processing-glow {
  from { box-shadow: 0 0 10px rgba(72, 187, 120, 0.5); }
  to { box-shadow: 0 0 30px rgba(72, 187, 120, 0.8); }
}

.http-node.pulse {
  animation: pulse-scale 0.3s ease;
}

@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* 模拟徽章 */
.sim-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.3);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sim-badge.active {
  background: rgba(72, 187, 120, 0.3);
  color: #48bb78;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 指标面板 */
.metrics-panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.2);
}

.metric {
  text-align: center;
  background: rgba(0,0,0,0.2);
  padding: 6px;
  border-radius: 6px;
}

.metric-label {
  display: block;
  font-size: 9px;
  opacity: 0.8;
  text-transform: uppercase;
}

.metric-value {
  display: block;
  font-size: 14px;
  font-weight: bold;
  margin-top: 2px;
}

.metric-value.high {
  color: #f56565;
  animation: alert-pulse 1s infinite;
}

@keyframes alert-pulse {
  0%, 100% { color: #f56565; }
  50% { color: #fc8181; }
}

/* 配置面板 */
.config-panel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.2);
  font-size: 12px;
}

.config-panel label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-panel input[type="range"] {
  width: 100%;
  accent-color: white;
}

/* 其他样式保持不变... */
.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  margin-bottom: 12px;
  font-size: 14px;
}

/* ... 其他原有样式 ... */
</style>