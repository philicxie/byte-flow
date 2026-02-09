<!-- nodes/ServiceNode.vue -->
<script setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { computed } from 'vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const { updateNodeData } = useVueFlow()

// 服务类型判断
const serviceType = computed(() => {
  const modules = props.data.modules || []
  if (modules.length === 0) return 'empty'
  if (modules.length === 1) return 'microservice' // 单一模块-纯微服务
  if (modules.length <= 3) return 'small-service' // 少量模块-小服务
  return 'monolith' // 多模块-单体服务
})

// 类型标签和颜色
const typeConfig = {
  'microservice': { label: '微服务', color: '#4299e1', icon: '🎯' },
  'small-service': { label: '小服务', color: '#ecc94b', icon: '📦' },
  'monolith': { label: '单体服务', color: '#9f7aea', icon: '🏛️' },
  'empty': { label: '空服务', color: '#a0aec0', icon: '📭' }
}

const config = computed(() => typeConfig[serviceType.value])

// 模块饱和度（部署的模块数/总模块容量）
const saturation = computed(() => {
  const modules = props.data.modules || []
  const capacity = props.data.moduleCapacity || 10
  return Math.min(100, (modules.length / capacity) * 100)
})

// 健康状态
const healthStatus = computed(() => {
  const load = props.data.load || 0
  const errors = props.data.errorRate || 0
  if (errors > 5 || load > 90) return 'critical'
  if (load > 70 || errors > 2) return 'warning'
  return 'healthy'
})

// 能否处理某个HTTP请求（检查是否包含所需模块）
const canHandleRequest = (requiredModules) => {
  const myModules = props.data.modules || []
  return requiredModules.every(mod => myModules.includes(mod))
}

// 模拟点击切换服务类型（演示用）
const toggleType = () => {
  const modules = props.data.modules || []
  if (modules.length > 3) {
    // 单体拆分为微服务
    updateNodeData(props.id, { 
      modules: [modules[0]], 
      messageQueue: true 
    })
  } else {
    // 微服务合并为单体
    updateNodeData(props.id, { 
      modules: ['user', 'order', 'payment', 'inventory', 'notification'],
      messageQueue: false 
    })
  }
}
</script>

<template>
  <div 
    class="service-node" 
    :class="[serviceType, healthStatus, { selected }]"
    @dblclick="toggleType"
  >
    <!-- 状态指示器 -->
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
        <span class="load-value">{{ Math.round(data.load || 0) }}%</span>
      </div>
    </div>
    
    <!-- 部署的模块展示 -->
    <div class="modules-container">
      <div class="section-header">
        <span>部署模块 ({{ (data.modules || []).length }})</span>
        <span v-if="data.moduleCapacity" class="capacity">
          容量: {{ data.moduleCapacity }}
        </span>
      </div>
      
      <div class="modules-grid">
        <div 
          v-for="mod in (data.modules || [])" 
          :key="mod"
          class="module-chip"
          :class="{ 'high-load': data.moduleLoad?.[mod] > 80 }"
        >
          <span class="mod-name">{{ mod }}</span>
          <span v-if="data.moduleLoad?.[mod]" class="mod-load">
            {{ data.moduleLoad[mod] }}%
          </span>
        </div>
        <div v-if="(data.modules || []).length === 0" class="empty-tip">
          未部署模块
        </div>
      </div>
      
      <!-- 饱和度条 -->
      <div class="saturation-bar">
        <div class="saturation-fill" :style="{ width: saturation + '%' }"></div>
      </div>
    </div>
    
    <!-- 通信方式标识 -->
    <div v-if="data.messageQueue || serviceType === 'microservice'" class="comm-badge">
      <span>📡 MQ通信</span>
    </div>
    <div v-else-if="serviceType === 'monolith'" class="comm-badge internal">
      <span>🔌 内部调用</span>
    </div>
    
    <!-- 连接点 -->
    <!-- 输入：来自HTTP请求或其他服务 -->
    <Handle 
      type="target" 
      :position="Position.Top"
      id="http-in"
      :style="{ top: '-8px', background: '#667eea' }"
    />
    
    <!-- 输出：指向数据库或其他服务 -->
    <Handle 
      type="source" 
      :position="Position.Bottom"
      id="db-out"
      :style="{ bottom: '-8px', background: '#48bb78' }"
    />
    
    <!-- 微服务间通信用侧向连接点 -->
    <Handle 
      v-if="serviceType === 'microservice' || data.messageQueue"
      type="source" 
      :position="Position.Right"
      id="service-out"
      :style="{ right: '-8px', background: '#ed8936' }"
    />
    <Handle 
      v-if="serviceType === 'microservice' || data.messageQueue"
      type="target" 
      :position="Position.Left"
      id="service-in"
      :style="{ left: '-8px', background: '#ed8936' }"
    />
  </div>
</template>

<style scoped>
.service-node {
  background: #2d3748;
  border-radius: 16px;
  padding: 16px;
  min-width: 240px;
  max-width: 320px;
  color: white;
  position: relative;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  border: 3px solid transparent;
  transition: all 0.3s;
  cursor: pointer;
}
.service-node.selected {
  border-color: #ffd700;
  box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.3);
}
.service-node.healthy { border-left-color: #48bb78; }
.service-node.warning { border-left-color: #ecc94b; }
.service-node.critical { border-left-color: #f56565; animation: pulse-red 2s infinite; }

/* 微服务样式 */
.service-node.microservice {
  background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
  border: 2px solid #4299e1;
}
/* 单体服务样式 */
.service-node.monolith {
  background: linear-gradient(135deg, #44337a 0%, #553c9a 100%);
  border: 2px solid #9f7aea;
}
/* 小服务样式 */
.service-node.small-service {
  background: linear-gradient(135deg, #744210 0%, #975a16 100%);
  border: 2px solid #ecc94b;
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 101, 101, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(245, 101, 101, 0); }
}

.health-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.health-indicator.healthy { 
  background: #48bb78; 
  box-shadow: 0 0 0 3px rgba(72, 187, 120, 0.3);
}
.health-indicator.warning { background: #ecc94b; }
.health-indicator.critical { background: #f56565; }

.node-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.type-icon { font-size: 24px; }
.title-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
}
.service-name {
  font-weight: bold;
  font-size: 16px;
}
.type-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.load-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #48bb78 calc(var(--saturation) * 3.6deg),
    rgba(255,255,255,0.1) 0deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.load-ring::before {
  content: '';
  position: absolute;
  width: 36px;
  height: 36px;
  background: #2d3748;
  border-radius: 50%;
}
.load-value {
  position: relative;
  font-size: 10px;
  font-weight: bold;
}

.modules-container {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.capacity {
  font-size: 10px;
  background: rgba(255,255,255,0.1);
  padding: 2px 6px;
  border-radius: 4px;
}
.modules-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
  max-height: 100px;
  overflow-y: auto;
}
.module-chip {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}
.module-chip:hover {
  background: rgba(255,255,255,0.25);
  transform: translateY(-1px);
}
.module-chip.high-load {
  background: rgba(245, 101, 101, 0.3);
  border-color: #f56565;
  animation: blink 1.5s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.mod-load {
  font-size: 9px;
  background: rgba(0,0,0,0.3);
  padding: 1px 4px;
  border-radius: 4px;
}
.empty-tip {
  font-size: 12px;
  opacity: 0.5;
  font-style: italic;
  padding: 8px;
}
.saturation-bar {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}
.saturation-fill {
  height: 100%;
  background: linear-gradient(90deg, #48bb78, #ecc94b, #f56565);
  transition: width 0.3s;
}

.comm-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: rgba(237, 137, 54, 0.2);
  border: 1px solid #ed8936;
  border-radius: 8px;
  font-size: 11px;
  color: #ed8936;
}
.comm-badge.internal {
  background: rgba(72, 187, 120, 0.2);
  border-color: #48bb78;
  color: #48bb78;
}

/* 滚动条样式 */
.modules-grid::-webkit-scrollbar {
  width: 4px;
}
.modules-grid::-webkit-scrollbar-track {
  background: transparent;
}
.modules-grid::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
}
</style>