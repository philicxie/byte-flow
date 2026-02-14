<!-- App.vue -->
<script setup>
import { ref, markRaw, provide } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { useSimulation } from './simulator/engine'
import Sidebar from './Sidebar.vue'

import HttpRequestNode from './nodes/HttpRequestNode.vue'
import ServiceNode from './nodes/ServiceNode.vue'
import DatabaseNode from './nodes/DatabaseNode.vue'
import TrafficEdge from './edges/TrafficEdge.vue'
import useDragAndDrop from './useDnD'
import DropzoneBackground from './DropzoneBackground.vue'

const { addEdges, onConnect, fitView: vueFlowFitView } = useVueFlow()
const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

const nodeTypes = {
  http: markRaw(HttpRequestNode),
  database: markRaw(DatabaseNode),
  service: markRaw(ServiceNode),
}

const nodes = ref([])
const edges = ref([])

// 边的类型映射（用于模拟态显示不同样式）
const edgeTypes = {
  animated: markRaw(TrafficEdge)
}

// 模拟系统
const simulation = useSimulation()
const { isSimulating, simulationSpeed, metrics, startSimulation, stopSimulation } = simulation

// 提供模拟状态给所有子组件
provide('simulation', simulation)

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
  console.log('Connection attempt:', connection)
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
</script>

<template>
  <div class="app-container">
    <!-- 左侧边栏 - 始终显示，内容切换 -->
    <aside class="sidebar">
      <!-- 设计态内容 -->
      <div class="sidebar-panel design-panel" :class="{ 'panel-active': !isSimulating }">
        <Sidebar />
      </div>
      
      <!-- 模拟态内容 -->
      <div class="sidebar-panel sim-panel" :class="{ 'panel-active': isSimulating }">
        <div class="panel-header">
          <h4>📊 实时监控</h4>
          <div class="live-indicator">
            <span class="pulse-dot"></span>
            <span>LIVE</span>
          </div>
        </div>
        
        <div class="sim-stats">
          <div class="stat-row">
            <div class="stat">
              <span class="stat-value">{{ metrics.totalRequests + metrics.totalErrors }}</span>
              <span class="stat-label">总请求</span>
            </div>
            <div class="stat">
              <span class="stat-value success">{{ metrics.totalRequests }}</span>
              <span class="stat-label">成功</span>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat">
              <span class="stat-value" :class="{ error: metrics.totalErrors > 0 }">
                {{ metrics.totalErrors }}
              </span>
              <span class="stat-label">错误</span>
            </div>
            <div class="stat">
              <span class="stat-value" :class="{ error: metrics.errorRate > 5, warning: metrics.errorRate > 0 }">
                {{ metrics.errorRate.toFixed(1) }}%
              </span>
              <span class="stat-label">错误率</span>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat wide">
              <span class="stat-value">{{ Math.round(metrics.avgLatency) }}ms</span>
              <span class="stat-label">平均延时</span>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat wide">
              <span class="stat-value">{{ metrics.throughput }} rps</span>
              <span class="stat-label">吞吐量</span>
            </div>
          </div>
        </div>
        
        <div class="sim-speed">
          <div class="speed-header">
            <span>模拟速度</span>
            <span class="speed-value">{{ simulationSpeed }}x</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="5" 
            step="0.5"
            v-model="simulationSpeed"
          />
        </div>
        
        <button @click="stopSimulation" class="stop-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
          停止模拟
        </button>
      </div>
    </aside>

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
  height: 100vh;
  width: 100vw;
  background: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

/* ========== 左侧边栏 - 双面板滑动切换 ========== */
.sidebar {
  width: 260px;
  min-width: 260px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  position: relative;
  overflow: hidden;
}

/* 面板容器 - 相对定位用于滑动 */
.sidebar-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: translateX(-100%);
  pointer-events: none;
}

/* 激活状态的面板 */
.sidebar-panel.panel-active {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

/* 设计面板 */
.design-panel {
  color: #f1f5f9;
}

/* 模拟面板 */
.sim-panel {
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  flex-shrink: 0;
}

.panel-header h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #ef4444;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.sim-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.stat-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat {
  background: rgba(15, 23, 42, 0.6);
  padding: 16px 12px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.stat.wide {
  grid-column: 1 / -1;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-value.success {
  color: #22c55e;
}

.stat-value.error {
  color: #ef4444;
}

.stat-value.warning {
  color: #f59e0b;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sim-speed {
  background: rgba(15, 23, 42, 0.6);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  flex-shrink: 0;
}

.speed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  color: #94a3b8;
}

.speed-value {
  color: #38bdf8;
  font-weight: 600;
  font-family: monospace;
}

.sim-speed input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.2);
  outline: none;
  -webkit-appearance: none;
}

.sim-speed input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(56, 189, 248, 0.4);
}

.stop-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
  flex-shrink: 0;
}

.stop-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

.stop-btn svg {
  fill: currentColor;
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

.vue-flow__node.selected {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

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