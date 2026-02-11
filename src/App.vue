<!-- App.vue -->
<script setup>
import { ref, markRaw, provide } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { useSimulation } from './simulator/engine'
import Sidebar from './Sidebar.vue'

import HttpRequestNode from './nodes/HttpRequestNode.vue'
import ServiceNode from './nodes/ServiceNode.vue'
import DatabaseNode from './nodes/DatabaseNode.vue'
import useDragAndDrop from './useDnD'
import DropzoneBackground from './DropzoneBackground.vue'
import AnimationEdge from './edges/AnimationEdge.vue'

const { onConnect, addEdges } = useVueFlow()
const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

const nodeTypes = {
  http: markRaw(HttpRequestNode),
//   loadbalancer: markRaw(LoadBalancerNode),
  database: markRaw(DatabaseNode),
  service: markRaw(ServiceNode),
}

const nodes = ref([])
const edges = ref([])

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

onConnect(addEdges)


console.log(isSimulating.value)

</script>

<template>
  <div class="app-container">
    <!-- 侧边栏 -->
    <Sidebar v-if="!isSimulating" />
    
    <!-- 模拟控制面板 -->
    <div v-else class="sim-control-panel">
      <div class="sim-stats">
        <div class="stat">
          <span class="stat-label">总请求</span>
          <span class="stat-value">{{ metrics.totalRequests }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">平均延时</span>
          <span class="stat-value">{{ Math.round(metrics.avgLatency) }}ms</span>
        </div>
        <div class="stat">
          <span class="stat-label">吞吐量</span>
          <span class="stat-value">{{ metrics.throughput }} rps</span>
        </div>
      </div>
      
      <div class="sim-speed">
        <label>速度: {{ simulationSpeed }}x</label>
        <input 
          type="range" 
          min="0.5" 
          max="5" 
          step="0.5"
          v-model="simulationSpeed"
        />
      </div>
      
      <button @click="stopSimulation" class="stop-btn">
        ⏹ 停止模拟
      </button>
    </div>

    <div class="flow-container">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <h3>🏗️ 服务架构模拟器</h3>
        
        <div class="mode-switch">
          <button 
            :class="{ active: !isSimulating }"
            @click="stopSimulation"
            :disabled="!isSimulating"
          >
            ✏️ 编辑模式
          </button>
          <button 
            :class="{ active: isSimulating }"
            @click="startSimulation"
            :disabled="isSimulating || nodes.length === 0"
          >
            ▶️ 模拟模式
          </button>
        </div>
      </div>

      <div class="dnd-flow" @drop="onDrop">
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        :default-viewport="{ zoom: 0.7, x: 0, y: 0 }"
        :min-zoom="0.1"
        :max-zoom="3"
        :default-edge-options="{ type: 'animation', animated: true }"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        :fit-view-on-init="false"
        >
        <!-- 默认边：可配置延时 -->
        <template #edge-default="edgeProps">
          <g 
            class="animated-edge"
            :class="{ 'simulating': isSimulating }"
          >
            <!-- 基础线 -->
            <path
              :d="edgeProps.path"
              class="edge-path"
              :style="{ 
                stroke: selectedEdge === edgeProps.id ? '#ffd700' : '#a0aec0',
                strokeWidth: 2
              }"
            />
            
            <!-- 模拟态：流动动画 -->
            <path
              v-if="isSimulating"
              :d="edgeProps.path"
              class="flow-particles"
              :style="{
                stroke: edgeProps.data?.networkLatency > 100 ? '#f56565' : '#48bb78',
                animationDuration: `${Math.max(0.2, (edgeProps.data?.networkLatency || 50) / 200)}s`
              }"
            />
            
            <!-- 延时标签 -->
            <text
              v-if="!isSimulating"
              :x="edgeProps.labelX"
              :y="edgeProps.labelY"
              class="edge-label"
              text-anchor="middle"
            >
              {{ edgeProps.data?.networkLatency || 50 }}ms
            </text>
          </g>
        </template>

        <DropzoneBackground
        :style="{
          backgroundColor: isDragOver ? '#e7f3ff' : 'transparent',
          transition: 'background-color 0.2s ease',
        }"
      >
      </DropzoneBackground>

        <!-- 背景 -->
        <div class="vue-flow__background pattern-dots" />
      </VueFlow>
      </div>
      
      <!-- 边延时配置面板（编辑态） -->
      <div v-if="!isSimulating && selectedEdge" class="edge-config">
        <h4>网络延时配置</h4>
        <label>
          延时: {{ edgeLatency }}ms
          <input 
            type="range" 
            min="10" 
            max="500" 
            v-model="edgeLatency"
            @input="updateEdgeLatency"
          />
        </label>
        <button @click="selectedEdge = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<style>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #1a202c;
}

/* 模拟控制面板 */
.sim-control-panel {
  width: 200px;
  background: #2d3748;
  border-right: 1px solid #4a5568;
  padding: 20px;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sim-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat {
  background: rgba(0,0,0,0.2);
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 11px;
  opacity: 0.8;
  text-transform: uppercase;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  margin-top: 4px;
  color: #48bb78;
}

.sim-speed {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sim-speed label {
  font-size: 12px;
}

.stop-btn {
  background: #f56565;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  margin-top: auto;
}

.stop-btn:hover {
  background: #e53e3e;
}

/* 主流程区域 */
.flow-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.toolbar {
  padding: 16px 24px;
  background: #2d3748;
  border-bottom: 1px solid #4a5568;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.mode-switch {
  display: flex;
  gap: 8px;
}

.mode-switch button {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #4a5568;
  background: transparent;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-switch button.active {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.mode-switch button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 边样式 */
.animated-edge {
  cursor: pointer;
}

.edge-path {
  fill: none;
  transition: all 0.3s;
}

.flow-particles {
  fill: none;
  stroke-dasharray: 10 5;
  stroke-width: 3;
  opacity: 0.8;
  animation: flow linear infinite;
}

@keyframes flow {
  to {
    stroke-dashoffset: -15;
  }
}

.edge-label {
  font-size: 10px;
  fill: #a0aec0;
  background: #2d3748;
}

/* 边配置面板 */
.edge-config {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: #2d3748;
  padding: 16px;
  border-radius: 12px;
  color: white;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  border: 1px solid #4a5568;
}

.edge-config h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.edge-config label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 12px;
}

.edge-config button {
  width: 100%;
  padding: 8px;
  background: #4a5568;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

/* 模拟态全局样式 */
.vue-flow.simulating {
  background: radial-gradient(circle at center, #1a202c 0%, #0d1117 100%);
}
</style>