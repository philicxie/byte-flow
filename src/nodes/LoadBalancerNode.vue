<script setup>
import { Position, useVueFlow } from '@vue-flow/core'
import { computed, ref, inject } from 'vue'
import AnimatedHandle from '../components/AnimatedHandle.vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const { updateNodeData } = useVueFlow()

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
const backends = computed(() => props.data.backends || [])
const maxConnections = computed(() => props.data.maxConnections || 1000)
const currentConnections = computed(() => props.data.currentConnections || 0)

// 计算负载百分比
const loadPercentage = computed(() => {
  if (maxConnections.value === 0) return 0
  return Math.min(100, (currentConnections.value / maxConnections.value) * 100)
})

// 健康状态
const healthStatus = computed(() => {
  if (backends.value.length === 0) return 'empty'
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

// 获取算法描述
const getAlgorithmDesc = (key) => {
  return algorithms.find(a => a.key === key)?.desc || ''
}

// 切换算法
const selectAlgorithm = (key) => {
  updateNodeData(props.id, { ...props.data, algorithm: key })
  showAlgorithmSelector.value = false
}

// 打开算法选择器
const openAlgorithmSelector = () => {
  if (isSimulating.value) return
  showAlgorithmSelector.value = true
}

// 关闭算法选择器
const closeAlgorithmSelector = () => {
  showAlgorithmSelector.value = false
}

// 更新最大连接数
const updateMaxConnections = (value) => {
  updateNodeData(props.id, { ...props.data, maxConnections: parseInt(value) })
}

// 生成后端配置（用于拖拽初始化）
const generateBackends = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `backend-${i + 1}`,
    name: `后端 ${i + 1}`,
    weight: 100 / count,
    healthy: true
  }))
}

// 更新后端数量
const updateBackendCount = (count) => {
  const newBackends = generateBackends(count)
  updateNodeData(props.id, { ...props.data, backends: newBackends })
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
        overloaded: loadPercentage > 90
      }
    ]"
  >
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
      <div class="load-ring" :style="{ '--load': loadPercentage + '%' }">
        <span class="load-value">{{ Math.round(loadPercentage) }}%</span>
      </div>
    </div>
    
    <!-- 后端服务统计 -->
    <div class="backends-section">
      <div class="section-header">
        <span>后端服务</span>
        <span v-if="isSimulating" class="live-indicator">
          <span class="dot"></span>
          {{ currentConnections }}/{{ maxConnections }} 连接
        </span>
        <span v-else class="backend-count">
          {{ backends.length }} 个节点
        </span>
      </div>
      
      <!-- 后端节点状态 -->
      <div class="backends-list">
        <div 
          v-for="(backend, index) in backends" 
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
          <!-- 输出 Handle - 每个后端一个 -->
          <AnimatedHandle 
            type="source" 
            :position="Position.Bottom" 
            :id="`backend-${index}`"
            :node-id="props.id"
          />
        </div>
        
        <!-- 添加后端按钮（编辑态） -->
        <div 
          v-if="!isSimulating && backends.length < 5" 
          class="backend-item add-backend"
          @click="updateBackendCount(backends.length + 1)"
        >
          <span class="add-icon">+</span>
          <span>添加后端</span>
        </div>
      </div>
      
      <!-- 负载条 -->
      <div class="load-bar">
        <div 
          class="load-fill" 
          :class="{ danger: loadPercentage > 80 }"
          :style="{ width: loadPercentage + '%' }"
        ></div>
      </div>
    </div>
    
    <!-- 模拟态：实时指标 -->
    <div v-if="isSimulating" class="sim-metrics">
      <div class="metric-row">
        <span>QPS: {{ Math.round(data.qps || 0) }}</span>
        <span>失败: {{ Math.round(data.errorRate || 0) }}%</span>
      </div>
      <div class="metric-row">
        <span>平均响应: {{ Math.round(data.avgLatency || 0) }}ms</span>
      </div>
    </div>
    
    <!-- 编辑态：配置面板 -->
    <div v-else class="config-panel">
      <label class="backend-config">
        后端数量: {{ backends.length }}
        <input 
          type="range" 
          min="1" 
          max="5"
          :value="backends.length"
          @input="updateBackendCount(+$event.target.value)"
          class="nodrag"
        />
      </label>
      <label class="capacity-config">
        最大连接: {{ maxConnections }}
        <input 
          type="range" 
          min="100" 
          max="10000"
          step="100"
          :value="maxConnections"
          @input="updateMaxConnections($event.target.value)"
          class="nodrag"
        />
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
  </div>
</template>

<style scoped>
.lb-node {
  background: #2d3748;
  border-radius: 16px;
  padding: 16px;
  min-width: 240px;
  max-width: 300px;
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
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 10px;
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

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.backend-count {
  font-size: 11px;
  color: #718096;
}

.backends-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
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

.backend-item.add-backend {
  background: transparent;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  justify-content: center;
  cursor: pointer;
  color: #a0aec0;
}

.backend-item.add-backend:hover {
  border-color: #f5576c;
  color: #f5576c;
  background: rgba(245, 87, 108, 0.05);
}

.add-icon {
  font-size: 16px;
  font-weight: 300;
}

.load-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.load-fill {
  height: 100%;
  background: linear-gradient(90deg, #48bb78 0%, #ecc94b 50%, #f56565 100%);
  transition: width 0.3s;
}

.load-fill.danger {
  animation: danger-pulse 1s infinite;
}

@keyframes danger-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.sim-metrics {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  color: #a0aec0;
}

.config-panel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.backend-config,
.capacity-config {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #a0aec0;
}

.config-panel input[type="range"] {
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

/* Handle 位置调整 - 每个后端一个输出点 */
:deep(.vue-flow__handle[data-handlepos="bottom"]) {
  position: absolute !important;
  transform: translateX(-50%) !important;
}

/* 动态调整每个后端 handle 的位置 */
.backend-item:nth-child(1) :deep(.vue-flow__handle[data-handlepos="bottom"]) {
  left: 50% !important;
}

.backend-item:nth-child(2) :deep(.vue-flow__handle[data-handlepos="bottom"]) {
  left: 50% !important;
}

.backend-item:nth-child(3) :deep(.vue-flow__handle[data-handlepos="bottom"]) {
  left: 50% !important;
}

.backend-item:nth-child(4) :deep(.vue-flow__handle[data-handlepos="bottom"]) {
  left: 50% !important;
}

.backend-item:nth-child(5) :deep(.vue-flow__handle[data-handlepos="bottom"]) {
  left: 50% !important;
}
</style>
