<!-- nodes/ServiceNode.vue -->
<script setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { computed } from 'vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const { isSimulating, updateNodeData } = useVueFlow()

// 服务类型
const serviceType = computed(() => {
  const modules = props.data.modules || []
  if (modules.length === 0) return 'empty'
  if (modules.length === 1) return 'microservice'
  if (modules.length <= 3) return 'small-service'
  return 'monolith'
})

const typeConfig = {
  'microservice': { label: '微服务', color: '#4299e1', icon: '🎯' },
  'small-service': { label: '小服务', color: '#ecc94b', icon: '📦' },
  'monolith': { label: '单体服务', color: '#9f7aea', icon: '🏛️' },
  'empty': { label: '空服务', color: '#a0aec0', icon: '📭' }
}

const config = computed(() => typeConfig[serviceType.value])

// 实时状态
const currentLoad = computed(() => props.data.currentLoad || 0)
const capacity = computed(() => props.data.moduleCapacity || 10)
const saturation = computed(() => (currentLoad.value / capacity.value) * 100)
const isOverloaded = computed(() => saturation.value > 90)

// 健康状态
const healthStatus = computed(() => {
  if (isOverloaded.value) return 'critical'
  if (saturation.value > 70) return 'warning'
  return 'healthy'
})

// 切换编辑/模拟态显示
const toggleMode = () => {
  if (!isSimulating.value) {
    // 编辑态：切换单体/微服务
    const modules = props.data.modules || []
    if (modules.length > 3) {
      updateNodeData(props.id, { 
        modules: [modules[0]], 
        messageQueue: true 
      })
    } else {
      updateNodeData(props.id, { 
        modules: ['user', 'order', 'payment', 'inventory', 'notification'],
        messageQueue: false 
      })
    }
  }
}
</script>

<template>
  <div 
    class="service-node" 
    :class="[
      serviceType, 
      healthStatus, 
      { 
        selected, 
        simulating: isSimulating,
        overloaded: isOverloaded 
      }
    ]"
    @dblclick="toggleMode"
  >
    <!-- 编辑态：类型切换提示 -->
    <div v-if="!isSimulating" class="edit-hint">
      双击切换架构模式
    </div>
    
    <!-- 模拟态：负载警告 -->
    <div v-if="isSimulating && isOverloaded" class="overload-alert">
      ⚠️ 过载
    </div>
    
    <div class="health-indicator" :class="healthStatus"></div>
    
    <div class="node-header">
      <span class="type-icon">{{ config.icon }}</span>
      <div class="title-section">
        <span class="service-name">{{ data.name || 'Service' }}</span>
        <span class="type-badge" :style="{ background: config.color }">
          {{ config.label }}
        </span>
      </div>
      <div class="load-ring" :style="{ '--saturation': saturation + '%' }">
        <span class="load-value">{{ Math.round(saturation) }}%</span>
      </div>
    </div>
    
    <!-- 模块展示 -->
    <div class="modules-container">
      <div class="section-header">
        <span>部署模块 ({{ (data.modules || []).length }})</span>
        <span v-if="isSimulating" class="live-indicator">
          <span class="dot"></span>
          {{ currentLoad }}/{{ capacity }} 请求
        </span>
        <span v-else class="capacity">容量: {{ capacity }}</span>
      </div>
      
      <div class="modules-grid">
        <div 
          v-for="mod in (data.modules || [])" 
          :key="mod"
          class="module-chip"
          :class="{ 'processing': isSimulating && data.moduleLoad?.[mod] > 0 }"
        >
          <span class="mod-name">{{ mod }}</span>
          <span v-if="isSimulating && data.moduleLoad?.[mod]" class="mod-load">
            {{ data.moduleLoad[mod] }}
          </span>
        </div>
      </div>
      
      <!-- 饱和度条 -->
      <div class="saturation-bar">
        <div 
          class="saturation-fill" 
          :class="{ danger: saturation > 80 }"
          :style="{ width: saturation + '%' }"
        ></div>
      </div>
    </div>
    
    <!-- 模拟态：实时指标 -->
    <div v-if="isSimulating" class="sim-metrics">
      <div class="metric-row">
        <span>RPS: {{ Math.round(data.rps || 0) }}</span>
        <span>avg: {{ Math.round(data.avgLatency || 0) }}ms</span>
      </div>
    </div>
    
    <!-- 编辑态：延时配置 -->
    <div v-else class="delay-config">
      <label>
        处理延时: {{ data.processingDelay || 20 }}ms
        <input 
          type="range" 
          min="10" 
          max="200"
          :value="data.processingDelay || 20"
          @input="$emit('update:data', { ...data, processingDelay: +$event.target.value })"
          class="nodrag"
        />
      </label>
    </div>
    
    <!-- 通信标识 -->
    <div v-if="data.messageQueue" class="comm-badge">
      <span>📡 MQ通信</span>
    </div>
    
    <!-- 连接点 -->
    <Handle type="target" :position="Position.Top" id="http-in" />
    <Handle type="source" :position="Position.Bottom" id="db-out" />
    <Handle 
      v-if="data.messageQueue" 
      type="source" 
      :position="Position.Right" 
      id="service-out" 
    />
    <Handle 
      v-if="data.messageQueue" 
      type="target" 
      :position="Position.Left" 
      id="service-in" 
    />
  </div>
</template>

<style scoped>
/* 基础样式与之前类似，增加模拟态样式 */
.service-node {
  background: #2d3748;
  border-radius: 16px;
  padding: 16px;
  min-width: 240px;
  color: white;
  position: relative;
  border: 3px solid transparent;
  transition: all 0.3s;
}

.service-node.simulating {
  box-shadow: 0 0 30px rgba(0,0,0,0.5);
}

.service-node.overloaded {
  animation: shake 0.5s infinite;
  border-color: #f56565;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.overload-alert {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #f56565;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  animation: alert-blink 1s infinite;
  z-index: 10;
}

@keyframes alert-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.edit-hint {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.3s;
  white-space: nowrap;
  pointer-events: none;
}

.service-node:hover .edit-hint {
  opacity: 1;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #48bb78;
}

.live-indicator .dot {
  width: 6px;
  height: 6px;
  background: #48bb78;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.sim-metrics {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
  font-size: 12px;
  display: flex;
  justify-content: space-between;
}

.delay-config {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.delay-config label {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.saturation-fill.danger {
  background: #f56565;
  animation: danger-pulse 1s infinite;
}

@keyframes danger-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 其他原有样式... */
</style>