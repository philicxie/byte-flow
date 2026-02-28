<script setup>
import { Position, useVueFlow } from '@vue-flow/core'
import { computed, ref, inject } from 'vue'
import AnimatedHandle from '../components/AnimatedHandle.vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const { updateNodeData, getEdges, getNodes } = useVueFlow()

// 注入父组件提供的状态
const simulation = inject('simulation', null)
const isSimulating = computed(() => simulation?.isSimulating?.value || false)

// 可用算法列表
const algorithms = [
  { key: 'round-robin', name: '轮询', desc: '按顺序分发' },
  { key: 'least-connections', name: '最少连接', desc: '选择连接最少' },
  { key: 'ip-hash', name: 'IP哈希', desc: '按IP固定分配' },
  { key: 'weighted', name: '加权', desc: '按权重分配' }
]

// 当前配置
const algorithm = computed(() => props.data.algorithm || 'round-robin')

// 容量和处理中请求（模拟态核心属性）
const capacity = computed(() => props.data.capacity || 100)
const processingRequests = computed(() => props.data.processingRequests || 0)
const droppedRequests = computed(() => props.data.droppedRequests || 0)

// 动态计算后端列表 - 根据连接的服务实例
const backends = computed(() => {
  const edges = getEdges.value
  const nodes = getNodes.value
  
  const connectedServices = edges
    .filter(edge => edge.source === props.id)
    .map(edge => {
      const targetNode = nodes.find(n => n.id === edge.target)
      if (targetNode && targetNode.type === 'service') {
        return {
          id: targetNode.id,
          name: targetNode.data?.name || '未命名服务',
          weight: targetNode.data?.weight || 100,
          healthy: targetNode.data?.healthy !== false
        }
      }
      return null
    })
    .filter(Boolean)
  
  return connectedServices
})

// 计算负载百分比（基于容量和处理中请求）
const loadPercentage = computed(() => {
  if (capacity.value === 0) return 0
  return Math.min(100, (processingRequests.value / capacity.value) * 100)
})

// 是否过载
const isOverloaded = computed(() => processingRequests.value >= capacity.value)

// 健康状态
const healthStatus = computed(() => {
  if (backends.value.length === 0) return 'empty'
  if (isOverloaded.value) return 'critical'
  const healthyCount = backends.value.filter(b => b.healthy !== false).length
  if (healthyCount === 0) return 'critical'
  if (healthyCount < backends.value.length) return 'warning'
  return 'healthy'
})

// 编辑态：显示算法选择器
const showAlgorithmSelector = ref(false)

// 获取算法名称
const getAlgorithmName = (key) => {
  return algorithms.find(a => a.key === key)?.name || key
}

// 切换算法
const selectAlgorithm = (key) => {
  updateNodeData(props.id, { ...props.data, algorithm: key })
  showAlgorithmSelector.value = false
}

// 打开/关闭算法选择器
const openAlgorithmSelector = () => {
  if (isSimulating.value) return
  showAlgorithmSelector.value = true
}
const closeAlgorithmSelector = () => {
  showAlgorithmSelector.value = false
}

// 更新容量
const updateCapacity = (value) => {
  updateNodeData(props.id, { ...props.data, capacity: parseInt(value) })
}
</script>

<template>
  <div 
    class="lb-node" 
    :class="[
      healthStatus,
      { 
        selected, 
        simulating: isSimulating,
        overloaded: isOverloaded
      }
    ]"
  >
    <!-- 过载警告（模拟态） -->
    <div v-if="isSimulating && isOverloaded" class="overload-alert">
      ⚠️ 请求过载 - 正在丢弃
    </div>
    
    <!-- 健康状态指示器 -->
    <div class="health-indicator" :class="healthStatus"></div>
    
    <!-- 节点头部 -->
    <div class="node-header">
      <span class="type-icon">⚖️</span>
      <div class="title-section">
        <input 
          v-if="!isSimulating"
          v-model="data.name"
          class="lb-name-input"
          placeholder="负载均衡器"
          @click.stop
        />
        <span v-else class="lb-name">{{ data.name || '负载均衡器' }}</span>
        <span class="algorithm-badge" @click="openAlgorithmSelector">
          {{ getAlgorithmName(algorithm) }}
        </span>
      </div>
      <!-- 负载环形指示器 -->
      <div class="load-ring" :class="{ danger: isOverloaded }" :style="{ '--load': loadPercentage + '%' }">
        <span class="load-value">{{ Math.round(loadPercentage) }}%</span>
      </div>
    </div>
    
    <!-- 后端服务统计 -->
    <div class="backends-section">
      <div class="section-header">
        <span>后端服务</span>
        <span class="backend-count">
          {{ backends.length }} 个节点
        </span>
      </div>
      
      <!-- 后端节点状态 -->
      <div class="backends-list">
        <div 
          v-for="backend in backends" 
          :key="backend.id"
          class="backend-item"
          :class="{ 
            healthy: backend.healthy !== false,
            unhealthy: backend.healthy === false
          }"
        >
          <span class="backend-dot" :class="backend.healthy !== false ? 'healthy' : 'unhealthy'"></span>
          <span class="backend-name">{{ backend.name }}</span>
          <span v-if="algorithm === 'weighted'" class="backend-weight">{{ Math.round(backend.weight) }}%</span>
        </div>
        
        <!-- 空状态提示 -->
        <div 
          v-if="backends.length === 0" 
          class="backend-item empty-hint"
        >
          <span class="hint-icon">🔗</span>
          <span>连接服务实例以添加后端</span>
        </div>
      </div>
    </div>
    
    <!-- 模拟态：请求处理状态 -->
    <div v-if="isSimulating" class="processing-panel">
      <div class="processing-header">
        <span class="processing-title">请求处理</span>
        <span v-if="droppedRequests > 0" class="dropped-badge">
          已丢弃: {{ droppedRequests }}
        </span>
      </div>
      
      <div class="processing-stats">
        <div class="stat-box">
          <span class="stat-label">处理中</span>
          <span class="stat-value" :class="{ danger: isOverloaded }">
            {{ processingRequests }}
          </span>
        </div>
        <div class="stat-box">
          <span class="stat-label">容量上限</span>
          <span class="stat-value">{{ capacity }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">可用</span>
          <span class="stat-value" :class="{ warning: capacity - processingRequests < capacity * 0.2 }">
            {{ Math.max(0, capacity - processingRequests) }}
          </span>
        </div>
      </div>
      
      <!-- 处理中进度条 -->
      <div class="processing-bar">
        <div 
          class="processing-fill" 
          :class="{ danger: isOverloaded, warning: loadPercentage > 70 && !isOverloaded }"
          :style="{ width: Math.min(100, loadPercentage) + '%' }"
        ></div>
      </div>
      
      <!-- 其他指标 -->
      <div class="extra-metrics">
        <span>QPS: {{ Math.round(data.qps || 0) }}</span>
        <span>平均响应: {{ Math.round(data.avgLatency || 0) }}ms</span>
      </div>
    </div>
    
    <!-- 编辑态：配置面板 -->
    <div v-else class="config-panel">
      <label class="capacity-config">
        <div class="config-label">
          <span>容量上限</span>
          <span class="config-value">{{ capacity }} 请求</span>
        </div>
        <input 
          type="range" 
          min="10" 
          max="500"
          step="10"
          :value="capacity"
          @input="updateCapacity($event.target.value)"
          class="nodrag"
        />
        <span class="config-hint">超过此值的新请求将被丢弃</span>
      </label>
    </div>
    
    <!-- 算法选择器弹窗（编辑态） -->
    <div v-if="showAlgorithmSelector && !isSimulating" class="selector-overlay" @click="closeAlgorithmSelector">
      <div class="algorithm-selector" @click.stop>
        <h4>选择负载均衡算法</h4>
        
        <div class="algorithm-list">
          <div 
            v-for="algo in algorithms" 
            :key="algo.key"
            class="algorithm-option"
            :class="{ active: algorithm === algo.key }"
            @click="selectAlgorithm(algo.key)"
          >
            <div class="algo-info">
              <span class="algo-name">{{ algo.name }}</span>
              <span class="algo-desc">{{ algo.desc }}</span>
            </div>
            <span v-if="algorithm === algo.key" class="check-mark">✓</span>
          </div>
        </div>
        
        <button @click="closeAlgorithmSelector" class="close-btn">完成</button>
      </div>
    </div>
    
    <!-- 输入 Handle - 接收 HTTP 请求 -->
    <AnimatedHandle 
      type="target" 
      :position="Position.Top" 
      id="http-in"
      :node-id="props.id"
    />
    
    <!-- 输出 Handle - 分发到后端 -->
    <AnimatedHandle 
      type="source" 
      :position="Position.Bottom" 
      id="lb-out"
      :node-id="props.id"
    />
  </div>
</template>

<style scoped>
.lb-node {
  background: #2d3748;
  border-radius: 16px;
  padding: 16px;
  min-width: 240px;
  max-width: 320px;
  color: white;
  position: relative;
  border: 3px solid transparent;
  transition: all 0.3s;
}

.lb-node.selected {
  border-color: #ffd700;
}

.lb-node.simulating {
  box-shadow: 0 0 30px rgba(0,0,0,0.5);
}

.lb-node.overloaded {
  animation: shake 0.5s infinite;
  border-color: #f56565;
  box-shadow: 0 0 20px rgba(245, 101, 101, 0.4);
}

.lb-node.healthy {
  --status-color: #48bb78;
}

.lb-node.warning {
  --status-color: #ecc94b;
}

.lb-node.critical {
  --status-color: #f56565;
}

.lb-node.empty {
  --status-color: #a0aec0;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* 过载警告 */
.overload-alert {
  position: absolute;
  top: -12px;
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
  white-space: nowrap;
}

@keyframes alert-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.health-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 16px 16px 0 0;
}

.health-indicator.healthy { background: #48bb78; }
.health-indicator.warning { background: #ecc94b; }
.health-indicator.critical { background: #f56565; }
.health-indicator.empty { background: #a0aec0; }

.node-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.type-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 8px;
}

.title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lb-name-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid #4a5568;
  border-radius: 4px;
  padding: 4px 8px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  width: 100%;
}

.lb-name-input:focus {
  outline: none;
  border-color: #f5576c;
}

.lb-name {
  font-weight: bold;
  font-size: 14px;
}

.algorithm-badge {
  font-size: 10px;
  background: rgba(240, 147, 251, 0.3);
  color: #f093fb;
  padding: 2px 8px;
  border-radius: 12px;
  width: fit-content;
  cursor: pointer;
  transition: all 0.2s;
}

.algorithm-badge:hover {
  background: rgba(240, 147, 251, 0.5);
}

.load-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: conic-gradient(
    #f5576c calc(var(--load) * 1%),
    rgba(255, 255, 255, 0.1) 0
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s;
}

.load-ring.danger {
  background: conic-gradient(
    #f56565 calc(var(--load) * 1%),
    rgba(255, 255, 255, 0.1) 0
  );
  animation: ring-pulse 1s infinite;
}

@keyframes ring-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 101, 101, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(245, 101, 101, 0); }
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
  font-size: 11px;
  font-weight: bold;
}

.backends-section {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 10px;
}

.backend-count {
  font-size: 11px;
  color: #718096;
}

.backends-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.backend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
  position: relative;
  transition: all 0.2s;
}

.backend-item.healthy {
  background: rgba(72, 187, 120, 0.1);
  border: 1px solid rgba(72, 187, 120, 0.3);
}

.backend-item.unhealthy {
  background: rgba(245, 101, 101, 0.1);
  border: 1px solid rgba(245, 101, 101, 0.3);
  opacity: 0.7;
}

.backend-item.empty-hint {
  background: transparent;
  border: 2px dashed rgba(255, 255, 255, 0.15);
  color: #718096;
  justify-content: center;
  font-style: italic;
}

.backend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.backend-dot.healthy {
  background: #48bb78;
  box-shadow: 0 0 6px #48bb78;
}

.backend-dot.unhealthy {
  background: #f56565;
}

.backend-name {
  flex: 1;
  font-weight: 500;
}

.backend-weight {
  font-size: 10px;
  color: #a0aec0;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
}

.hint-icon {
  font-size: 14px;
}

/* 模拟态：请求处理面板 */
.processing-panel {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 12px;
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.processing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.processing-title {
  font-size: 12px;
  font-weight: 600;
  color: #a0aec0;
}

.dropped-badge {
  font-size: 10px;
  background: rgba(245, 101, 101, 0.3);
  color: #f56565;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: bold;
}

.processing-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.stat-box {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 10px;
  color: #718096;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #48bb78;
}

.stat-value.danger {
  color: #f56565;
  animation: value-blink 0.5s infinite;
}

.stat-value.warning {
  color: #ecc94b;
}

@keyframes value-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.processing-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}

.processing-fill {
  height: 100%;
  background: linear-gradient(90deg, #48bb78 0%, #ecc94b 50%, #f56565 100%);
  transition: width 0.3s;
}

.processing-fill.warning {
  background: #ecc94b;
}

.processing-fill.danger {
  background: #f56565;
  animation: bar-pulse 0.5s infinite;
}

@keyframes bar-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.extra-metrics {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #718096;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 编辑态：配置面板 */
.config-panel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.capacity-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #a0aec0;
}

.config-value {
  font-weight: bold;
  color: #f093fb;
}

.config-hint {
  font-size: 10px;
  color: #718096;
  font-style: italic;
}

.capacity-config input[type="range"] {
  width: 100%;
  accent-color: #f5576c;
}

/* 算法选择器弹窗 */
.selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.algorithm-selector {
  background: #2d3748;
  border-radius: 16px;
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.algorithm-selector h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #e2e8f0;
}

.algorithm-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.algorithm-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.algorithm-option:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: #f5576c;
}

.algorithm-option.active {
  background: rgba(240, 147, 251, 0.15);
  border-color: #f093fb;
}

.algo-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.algo-name {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.algo-desc {
  font-size: 11px;
  color: #a0aec0;
}

.check-mark {
  color: #f093fb;
  font-weight: bold;
}

.close-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.close-btn:hover {
  opacity: 0.9;
}
</style>
