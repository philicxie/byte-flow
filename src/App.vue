<script setup>
import { ref, markRaw, provide, computed, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { useSimulation } from './simulator/engine'
import Sidebar from './Sidebar.vue'
import BlueprintSidebar from './BlueprintSidebar.vue'

import HttpRequestNode from './nodes/HttpRequestNode.vue'
import ServiceNode from './nodes/ServiceNode.vue'
import DatabaseNode from './nodes/DatabaseNode.vue'
import LoadBalancerNode from './nodes/LoadBalancerNode.vue'
import TrafficEdge from './edges/TrafficEdge.vue'
import useDragAndDrop from './useDnD'
import DropzoneBackground from './DropzoneBackground.vue'

const { addEdges, onConnect, fitView: vueFlowFitView } = useVueFlow()
const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

const nodeTypes = {
  http: markRaw(HttpRequestNode),
  database: markRaw(DatabaseNode),
  service: markRaw(ServiceNode),
  loadbalancer: markRaw(LoadBalancerNode),
}

const nodes = ref([])
const edges = ref([])
var preConnectValid = ref(false)

// 边的类型映射（用于模拟态显示不同样式）
const edgeTypes = {
  animated: markRaw(TrafficEdge)
}

// 模拟系统
const simulation = useSimulation()
const { isSimulating, simulationSpeed, metrics, startSimulation, stopSimulation } = simulation

// 提供模拟状态给所有子组件
provide('simulation', simulation)

// ========== 核心重构：全局连接验证逻辑 ==========
const validateConnection = (connection) => {

  const sourceNode = nodes.value.find(n => n.id === connection.source)
  const targetNode = nodes.value.find(n => n.id === connection.target)
  
  if (!sourceNode || !targetNode) {
    preConnectValid = false
    return preConnectValid
  }
  
  // 规则1：HTTP 可以连接到 Service 或 LoadBalancer
  if (sourceNode.type === 'http') {
    if (targetNode.type === 'service' && connection.targetHandle === 'http-in') {
      preConnectValid = true
      return preConnectValid
    }
    if (targetNode.type === 'loadbalancer' && connection.targetHandle === 'http-in') {
      preConnectValid = true
      return preConnectValid
    }
  }
  
  // 规则2：LoadBalancer 可以连接到 Service
  if (sourceNode.type === 'loadbalancer' && targetNode.type === 'service' && connection.targetHandle === 'http-in') {
    preConnectValid = true
    return preConnectValid
  }
  
  // 规则3：Service 可以连接到 Database（且只能连接一个）
  if (sourceNode.type === 'service' && targetNode.type === 'database') {
    // Service 使用 db-out 作为输出，Database 使用 db-in 作为输入
    if (connection.sourceHandle === 'db-out' && connection.targetHandle === 'db-in') {
      // 检查源 Service 是否已有数据库连接
      console.log('Validate Connect check db:', connection)

      const existingDbConnection = edges.value.some(e => 
        e.source === connection.source && 
        nodes.value.find(n => n.id === e.target)?.type === 'database'
      )
      preConnectValid = !existingDbConnection
      return preConnectValid
    }
  }

  preConnectValid = false
  
  // 其他连接均不合法
  return preConnectValid
}

// 向所有子组件提供验证函数
provide('validateConnection', validateConnection)

// 边的延时配置（编辑态）
const selectedEdge = ref(null)
const edgeLatency = ref(50)

const updateEdgeLatency = () => {
  if (selectedEdge.value) {
    const edge = edges.value.find(e => e.id === selectedEdge.value)
    if (edge) {
      edge.data = { ...edge.data, networkLatency: parseInt(edgeLatency.value) }
    }
  }
}

// 监听边选择
const onEdgeClick = ({ edge }) => {
  selectedEdge.value = edge.id
  edgeLatency.value = edge.data?.networkLatency || 50
}

// 默认边配置
const defaultEdgeOptions = {
  type: 'default',
  animated: false,
  style: {
    stroke: '#64748b',
    strokeWidth: 2
  },
  data: {
    networkLatency: 50
  }
}

// 使用 onConnect 钩子处理连接
onConnect((connection) => {
  if (!preConnectValid) {
    return
  }
  addEdges([{
    ...connection,
    id: `e${connection.source}-${connection.target}-${Date.now()}`,
    data: {
      networkLatency: 50,
      active: false,
      lastStatus: null
    }
  }])
})

// 获取边流动动画颜色
const getEdgeFlowColor = (edgeProps) => {
  if (edgeProps.data?.lastStatus >= 500) return '#f56565' // 5xx - 红色
  if (edgeProps.data?.lastStatus >= 400) return '#ed8936' // 4xx - 橙色
  if (edgeProps.data?.lastStatus >= 200) return '#22d3ee' // 2xx - 青色
  return '#22d3ee' // 默认青色
}

// 获取边动画速度
const getEdgeAnimationDuration = (edgeProps) => {
  // 根据网络延时调整动画速度：延时越高，动画越慢
  const latency = edgeProps.data?.networkLatency || 50
  return `${Math.max(0.3, latency / 100)}s`
}

// 重置视图
const fitView = () => {
  vueFlowFitView({ padding: 0.2, duration: 800 })
}

// 清空画布
const clearGraph = () => {
  if (confirm('确定要清空所有节点和连接吗？')) {
    nodes.value = []
    edges.value = []
  }
}

// 帮助弹窗状态
const showHelp = ref(false)

// 蓝图拖拽开始处理
const onBlueprintDragStart = (blueprint) => {
  console.log('开始拖拽蓝图:', blueprint.name)
}

// 底部边栏显示状态
const showBottomPanel = ref(true)
const toggleBottomPanel = () => {
  showBottomPanel.value = !showBottomPanel.value
}

const isAnimating = ref(false) // 防止动画冲突

// 监听模拟态切换
watch(isSimulating, async (newVal, oldVal) => {
  // 只在从设计态(false)切换到模拟态(true)时触发
  isAnimating.value = true
  
  // 方案1：无论当前状态，都执行一次完整的"收起→展开"
  // 产生明显的"刷新"提示效果
  const wasOpen = showBottomPanel.value
  
  // 第一步：强制收起（滑下）
  showBottomPanel.value = false
  
  // 等待收起动画完成（匹配 CSS transition 的 0.4s）
  await new Promise(resolve => setTimeout(resolve, 450))
  
  // 第二步：展开（滑上），展示模拟数据
  showBottomPanel.value = true
  
  // 动画结束，解锁
  setTimeout(() => {
    isAnimating.value = false
  }, 400)
})
</script>

<template>
  <div class="app-container">
    <!-- 左侧蓝图侧栏 -->
    <BlueprintSidebar @dragstart="onBlueprintDragStart" />

    <!-- 右侧主内容区 -->
    <div class="main-content">
      <div class="flow-container">
        <!-- 顶部工具栏 -->
        <header class="app-header">
          <!-- 左侧：Logo & 标题 -->
          <div class="brand">
            <div class="logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div class="brand-text">
              <h1>ArchSim</h1>
              <span class="subtitle">服务架构模拟器</span>
            </div>
          </div>

          <!-- 中间：模式切换 -->
          <div class="header-center">
            <div class="mode-switcher">
              <div class="mode-slider" :class="{ 'slide-right': isSimulating }"></div>
              <button 
                class="mode-btn"
                :class="{ active: !isSimulating }"
                @click="stopSimulation"
                :disabled="!isSimulating"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>设计</span>
              </button>
              <button 
                class="mode-btn"
                :class="{ active: isSimulating }"
                @click="startSimulation"
                :disabled="isSimulating || nodes.length === 0"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>模拟</span>
              </button>
            </div>
          </div>

          <!-- 右侧：工具按钮 -->
          <div class="header-actions">
            <button class="action-btn" title="重置视图" @click="fitView">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
            </button>
            <button class="action-btn" title="清空画布" @click="clearGraph">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
            <div class="action-divider"></div>
            <button class="action-btn primary" title="帮助" @click="showHelp = true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          </div>
        </header>

        <div class="dnd-flow" @drop="onDrop">
          <VueFlow
            v-model:nodes="nodes"
            v-model:edges="edges"
            :node-types="nodeTypes"
            :default-viewport="{ zoom: 0.7, x: 0, y: 0 }"
            :min-zoom="0.1"
            :max-zoom="3"
            :default-edge-options="defaultEdgeOptions"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @edge-click="onEdgeClick"
          >

            <DropzoneBackground
              :style="{
                backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                transition: 'background-color 0.2s ease',
              }"
            />
          </VueFlow>
        </div>
        
        <!-- 边延时配置面板 -->
        <div v-if="!isSimulating && selectedEdge" class="edge-config">
          <div class="config-header">
            <h4>网络延时配置</h4>
            <button class="close-btn" @click="selectedEdge = null">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="config-body">
            <div class="latency-display">
              <span class="latency-value">{{ edgeLatency }}</span>
              <span class="latency-unit">ms</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="500" 
              v-model="edgeLatency"
              @input="updateEdgeLatency"
              class="latency-slider"
            />
            <div class="latency-hints">
              <span>10ms</span>
              <span>250ms</span>
              <span>500ms</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 底部面板 - 可弹出弹入 -->
      <aside class="bottom-panel" :class="{ 'panel-collapsed': !showBottomPanel }">
        <!-- 面板头部 - 始终显示 -->
        <div class="panel-header-bar">
          <button 
            class="panel-toggle-btn"
            @click="toggleBottomPanel"
            :title="showBottomPanel ? '收起面板' : '展开面板'"
          >
            <svg v-if="showBottomPanel" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 15l6-6 6 6"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>
        
        <!-- 面板内容 - 使用 v-show 避免重建导致动画闪烁 -->
        <div class="bottom-panel-content">
          <!-- 设计态内容 -->
          <div class="design-content" v-show="!isSimulating&&!isAnimating">
            <Sidebar />
          </div>
          
          <!-- 模拟态内容 -->
          <div class="sim-content" v-show="isSimulating&&!isAnimating">
            <div class="sim-metrics-row">
              <div class="metric-item">
                <span class="metric-value">{{ metrics.totalRequests + metrics.totalErrors }}</span>
                <span class="metric-label">总请求</span>
              </div>
              <div class="metric-item">
                <span class="metric-value success">{{ metrics.totalRequests }}</span>
                <span class="metric-label">成功</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" :class="{ error: metrics.totalErrors > 0 }">{{ metrics.totalErrors }}</span>
                <span class="metric-label">错误</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" :class="{ error: metrics.errorRate > 5, warning: metrics.errorRate > 0 }">{{ metrics.errorRate.toFixed(1) }}%</span>
                <span class="metric-label">错误率</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">{{ Math.round(metrics.avgLatency) }}ms</span>
                <span class="metric-label">平均延时</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">{{ metrics.throughput }} rps</span>
                <span class="metric-label">吞吐量</span>
              </div>
              <div class="metric-item live">
                <span class="pulse-dot"></span>
                <span>LIVE</span>
              </div>
              <button @click="stopSimulation" class="stop-btn-small">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12"/>
                </svg>
                停止
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
  background: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

/* 左侧蓝图栏 - 固定宽度 */
.blueprint-sidebar {
  flex-shrink: 0;
}

/* ========== 底部面板 ========== */
.bottom-panel {
  background: linear-gradient(0deg, #1e293b 0%, #0f172a 100%);
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 100;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* 展开状态 - 头部32px + 内容148px */
.bottom-panel:not(.panel-collapsed) {
  height: 180px;
}

/* 收起状态 - 只显示头部 */
.bottom-panel.panel-collapsed {
  height: 32px;
}

/* 面板头部栏 - 始终显示 */
.panel-header-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  height: 32px;
  background: linear-gradient(0deg, #1e293b 0%, #0f172a 100%);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

/* 切换按钮 - 方形 */
.panel-toggle-btn {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 6px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  transition: all 0.2s;
  flex-shrink: 0;
}

.panel-toggle-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: scale(1.05);
}

/* 面板标题 - 始终显示 */
.panel-title {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  white-space: nowrap;
}

/* 面板内容区域 */
.bottom-panel-content {
  flex: 1;
  padding: 12px 24px;
  overflow: hidden;
  position: relative;
}

/* v-show 隐藏时的样式 */
.design-content, .sim-content {
  height: 100%;
}

.design-content[style*="display: none"],
.sim-content[style*="display: none"] {
  display: none !important;
}

/* 设计态内容 */
.design-content {
  color: #f1f5f9;
  height: 100%;
}

/* 模拟态内容 */
.sim-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.sim-metrics-row {
  display: flex;
  align-items: center;
  gap: 32px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.metric-item .metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1;
}

.metric-item .metric-value.success {
  color: #22c55e;
}

.metric-item .metric-value.error {
  color: #ef4444;
}

.metric-item .metric-value.warning {
  color: #f59e0b;
}

.metric-item .metric-label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-item.live {
  flex-direction: row;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 20px;
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
}

.stop-btn-small {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.stop-btn-small:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* ========== 顶部工具栏 ========== */
.app-header {
  height: 68px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  align-items: center;
  padding: 0 24px;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 260px;
  flex-shrink: 0;
}

.logo {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.logo svg {
  width: 26px;
  height: 26px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-text h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(90deg, #f8fafc 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.subtitle {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 500;
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-switcher {
  display: flex;
  align-items: center;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 14px;
  padding: 4px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  position: relative;
}

.mode-slider {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 10px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
  z-index: 0;
}

.mode-slider.slide-right {
  transform: translateX(100%);
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 28px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.3s;
  position: relative;
  z-index: 1;
  white-space: nowrap;
}

.mode-btn:hover:not(:disabled) {
  color: #94a3b8;
}

.mode-btn.active {
  color: white;
}

.mode-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mode-btn svg {
  transition: transform 0.2s;
}

.mode-btn:hover:not(:disabled) svg {
  transform: scale(1.1);
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 260px;
  flex-shrink: 0;
  margin-left: auto;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.action-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.5);
  color: #3b82f6;
  transform: translateY(-2px);
}

.action-btn.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: transparent;
  color: white;
}

.action-btn.primary:hover {
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
}

.action-divider {
  width: 1px;
  height: 24px;
  background: rgba(148, 163, 184, 0.2);
  margin: 0 4px;
  flex-shrink: 0;
}

/* 右侧主内容区 - 包含画布和底部面板 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ========== 主流程区域 ========== */
.flow-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

.dnd-flow {
  flex: 1;
  position: relative;
}

.animated-edge {
  cursor: pointer;
}

/* 连接线条样式 */
.connection-line {
  animation: connection-flow 0.5s linear infinite;
}

@keyframes connection-flow {
  to { stroke-dashoffset: -10; }
}

/* 基础边线 */
.edge-path-bg {
  fill: none;
  transition: all 0.3s;
  stroke-linecap: round;
}

/* 流动动画 - 参考网页效果 */
.flow-animated {
  fill: none;
  stroke-dasharray: 5;
  stroke-width: 2;
  opacity: 0.9;
  animation: dashdraw 1s linear infinite;
}

@keyframes dashdraw {
  to {
    stroke-dashoffset: -10;
  }
}

/* 流动脉冲点 */
.flow-pulse {
  fill: white;
  filter: drop-shadow(0 0 4px currentColor);
}

.flow-pulse.success {
  fill: #22d3ee;
}

.flow-pulse.error {
  fill: #f56565;
  animation: pulse-error 0.5s ease-in-out infinite;
}

@keyframes pulse-error {
  0%, 100% { opacity: 1; r: 4; }
  50% { opacity: 0.6; r: 6; }
}

/* 边的状态样式 */
.animated-edge.has-error .flow-animated {
  stroke: #f56565;
}

.animated-edge.success .flow-animated {
  stroke: #48bb78;
}

.edge-label {
  font-size: 11px;
  fill: #64748b;
  font-weight: 500;
  font-family: monospace;
}

.edge-config {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 280px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: 16px;
  color: #f1f5f9;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.15);
  overflow: hidden;
  z-index: 100;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.config-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.config-body {
  padding: 24px 20px;
}

.latency-display {
  text-align: center;
  margin-bottom: 20px;
}

.latency-value {
  font-size: 48px;
  font-weight: 800;
  color: #38bdf8;
  line-height: 1;
}

.latency-unit {
  font-size: 16px;
  color: #64748b;
  margin-left: 4px;
}

.latency-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.2);
  outline: none;
  -webkit-appearance: none;
  margin-bottom: 12px;
}

.latency-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.4);
  border: 3px solid #0f172a;
}

.latency-hints {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
}

.vue-flow {
  background: #0f172a;
}

.vue-flow__controls {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.vue-flow__controls-button {
  background: transparent;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  width: 36px;
  height: 36px;
}

.vue-flow__controls-button:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.vue-flow__minimap {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

/* 选中效果已移至各节点组件，保持统一 */

/* ========== 全局 Handle 基础样式 ========== */
.vue-flow__handle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #1e293b;
  background: #3b82f6;
  opacity: 1;
  z-index: 100;
  transition: all 0.2s ease;
  position: absolute;
}

/* 基础定位 - 使用 CSS 变量管理位置 */
.vue-flow__handle[data-handlepos="top"] {
  top: -8px;
  left: 50%;
  margin-left: -8px;
}

.vue-flow__handle[data-handlepos="bottom"] {
  bottom: -8px;
  left: 50%;
  margin-left: -8px;
}

.vue-flow__handle[data-handlepos="left"] {
  left: -8px;
  top: 50%;
  margin-top: -8px;
}

.vue-flow__handle[data-handlepos="right"] {
  right: -8px;
  top: 50%;
  margin-top: -8px;
}

/* ========== 状态管理：使用 CSS 变量控制缩放 ========== */
.vue-flow__handle {
  --handle-scale: 1;
  --handle-color: #3b82f6;
  --handle-shadow: none;
  
  transform: scale(var(--handle-scale));
  background: var(--handle-color);
  box-shadow: var(--handle-shadow);
}

/* Hover 状态 - 仅当没有 connecting/valid 时 */
.vue-flow__handle:hover:not(.connecting):not(.valid) {
  --handle-scale: 1.3;
  --handle-color: #22d3ee;
  --handle-shadow: 0 0 20px rgba(34, 211, 238, 0.8);
}

/* 确保节点 overflow 不影响 handle */
.vue-flow__node {
  overflow: visible !important;
}

/* 连接过程中的线条样式 */
.vue-flow__connection-line {
  stroke: #f59e0b;
  stroke-width: 2;
  stroke-dasharray: 5;
  animation: connection-flow 0.5s linear infinite;
}

@keyframes connection-flow {
  to {
    stroke-dashoffset: -10;
  }
}

/* 确保节点内的 handle 可见 */
.vue-flow__node {
  overflow: visible !important;
}
</style>