<!-- App.vue -->
<script setup>
import { ref, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import HttpRequestNode from './nodes/HttpRequestNode.vue'
import LoadBalancerNode from './nodes/LoadBalancerNode.vue'
import ServerNode from './nodes/ServerNode.vue'
import DatabaseNode from './nodes/DatabaseNode.vue'
import Sidebar from './Sidebar.vue'
import useDragAndDrop from './useDnD'
import DropzoneBackground from './DropzoneBackground.vue'
import AnimationEdge from './edges/AnimationEdge.vue'


const { onConnect, addEdges } = useVueFlow()

const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()


onConnect(addEdges)

// 注册节点类型
const nodeTypes = {
  http: markRaw(HttpRequestNode),
  loadbalancer: markRaw(LoadBalancerNode),
  server: markRaw(ServerNode),
  database: markRaw(DatabaseNode)
}

// 初始化节点数据（模拟一个典型的后端架构）
const nodes = ref([
  {
    id: 'http-1',
    type: 'http',
    position: { x: 250, y: 50 },
    data: { method: 'GET', url: '/api/users' }
  },
  {
    id: 'lb-1',
    type: 'loadbalancer',
    position: { x: 250, y: 200 },
    data: { algorithm: 'Round Robin', backends: 3 }
  },
  {
    id: 'server-1',
    type: 'server',
    position: { x: 100, y: 350 },
    data: { id: '01', cpu: 4, memory: 8, load: 45, status: 'healthy', active: true }
  },
  {
    id: 'server-2',
    type: 'server',
    position: { x: 250, y: 350 },
    data: { id: '02', cpu: 4, memory: 8, load: 62, status: 'warning' }
  },
  {
    id: 'server-3',
    type: 'server',
    position: { x: 400, y: 350 },
    data: { id: '03', cpu: 4, memory: 8, load: 30, status: 'healthy' }
  },
  {
    id: 'db-1',
    type: 'database',
    position: { x: 250, y: 550 },
    data: { type: 'PostgreSQL', name: 'db-primary', qps: 1200, connections: 85 }
  }
])

// 定义连接关系
const edges = ref([
  { id: 'e1-2', source: 'http-1', target: 'lb-1' },
  { id: 'e2-3', source: 'lb-1', target: 'server-1' },
  { id: 'e2-4', source: 'lb-1', target: 'server-2' },
  { id: 'e2-5', source: 'lb-1', target: 'server-3' },
  { id: 'e3-6', source: 'server-1', target: 'db-1' },
  { id: 'e4-6', source: 'server-2', target: 'db-1' },
  { id: 'e5-6', source: 'server-3', target: 'db-1' }
])

const { onNodeClick, addNodes } = useVueFlow()

// 点击节点事件
onNodeClick((event) => {
  console.log('点击了节点:', event.node)
})

// 添加新服务器节点
const addServer = () => {
  const newId = `server-${Date.now()}`
  addNodes([
    {
      id: newId,
      type: 'server',
      position: { x: Math.random() * 400, y: 350 },
      data: { 
        id: newId.slice(-2), 
        cpu: 4, 
        memory: 16, 
        load: Math.floor(Math.random() * 100),
        status: 'healthy'
      }
    }
  ])
}
</script>

<template>
  <div class="architecture-flow">
    <div class="toolbar">
      <h3>🏗️ 后端架构模拟器</h3>
      <button @click="addServer">➕ 添加服务器</button>
    </div>

    <div class="dnd-flow" @drop="onDrop">    
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :default-zoom="0.8"
      :min-zoom="0.2"
      :max-zoom="4"
      :default-edge-options="{ type: 'animation', animated: true }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      fit-view-on-init
    >
        <template #edge-animation="edgeProps">
            <AnimationEdge
            :id="edgeProps.id"
            :source="edgeProps.source"
            :target="edgeProps.target"
            :source-x="edgeProps.sourceX"
            :source-y="edgeProps.sourceY"
            :targetX="edgeProps.targetX"
            :targetY="edgeProps.targetY"
            :source-position="edgeProps.sourcePosition"
            :target-position="edgeProps.targetPosition"
            :data="edgeProps.data"
            />
        </template>

      <DropzoneBackground
        :style="{
          backgroundColor: isDragOver ? '#e7f3ff' : 'transparent',
          transition: 'background-color 0.2s ease',
        }"
      >
      </DropzoneBackground>
      
      <!-- 控制按钮 -->
      <div class="controls">
        <button title="重置视图">⌖</button>
        <button title="放大">➕</button>
        <button title="缩小">➖</button>
      </div>
    </VueFlow>

    <Sidebar />
    </div>
  </div>
</template>

<style>
.architecture-flow {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
}
.toolbar {
  padding: 12px 20px;
  background: #1a202c;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2d3748;
}
.toolbar button {
  background: #4299e1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.toolbar button:hover {
  background: #3182ce;
}
.vue-flow {
  flex: 1;
}
.controls {
  position: absolute;
  right: 20px;
  bottom: 20px;
  display: flex;
  gap: 8px;
}
.controls button {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.controls button:hover {
  background: #f7fafc;
}
/* 自定义连线样式 */
.vue-flow__edge-path {
  stroke: #a0aec0;
  stroke-width: 2;
}
.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #4299e1;
  stroke-width: 3;
}
</style>