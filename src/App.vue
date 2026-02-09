<!-- App.vue -->
<script setup>
import { ref, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import HttpRequestNode from './nodes/HttpRequestUNode.vue'
import LoadBalancerNode from './nodes/LoadBalancerNode.vue'
import ServerNode from './nodes/ServerNode.vue'
import DatabaseNode from './nodes/DatabaseNode.vue'
import ServiceNode from './nodes/ServiceNode.vue'
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
  database: markRaw(DatabaseNode),
  service: markRaw(ServiceNode),
}

// 初始化节点数据（模拟一个典型的后端架构）
var nodess = ref([
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

// 场景1：单体架构 - 一个服务包含所有模块
const monolithScenario = [
  {
    id: 'http-1',
    type: 'http',
    position: { x: 300, y: 50 },
    data: { 
      method: 'POST', 
      path: '/api/v1/order/create',
      modules: ['user', 'order', 'payment', 'inventory', 'notification'],
      body: { userId: 123, items: [] }
    }
  },
  {
    id: 'svc-monolith',
    type: 'service',
    position: { x: 300, y: 250 },
    data: {
      name: 'monolith-api',
      modules: ['user', 'order', 'payment', 'inventory', 'notification'],
      moduleCapacity: 10,
      load: 75,
      errorRate: 1,
      moduleLoad: { user: 30, order: 80, payment: 60, inventory: 40, notification: 20 }
    }
  },
  {
    id: 'db-1',
    type: 'database',
    position: { x: 300, y: 550 },
    data: {
      name: 'db-primary',
      type: 'PostgreSQL',
      modules: ['user', 'order', 'payment', 'inventory', 'notification'],
      moduleQps: { user: 200, order: 800, payment: 400, inventory: 300, notification: 150 },
      shards: [
        { module: 'user', records: 50000 },
        { module: 'order', records: 120000 },
        { module: 'payment', records: 80000 }
      ]
    }
  }
]

// 场景2：微服务架构 - 多个服务，每个负责单一模块，通过MQ通信
const microservicesScenario = [
  {
    id: 'http-2',
    type: 'http',
    position: { x: 400, y: 50 },
    data: { 
      method: 'POST', 
      path: '/api/v2/order/create',
      modules: ['user', 'order', 'payment', 'inventory', 'notification']
    }
  },
  // API Gateway / BFF 层
  {
    id: 'svc-gateway',
    type: 'service',
    position: { x: 400, y: 200 },
    data: {
      name: 'api-gateway',
      modules: ['gateway'],
      moduleCapacity: 5,
      load: 45,
      messageQueue: true
    }
  },
  // 核心服务
  {
    id: 'svc-user',
    type: 'service',
    position: { x: 100, y: 400 },
    data: {
      name: 'user-service',
      modules: ['user'],
      moduleCapacity: 3,
      load: 35,
      messageQueue: true
    }
  },
  {
    id: 'svc-order',
    type: 'service',
    position: { x: 300, y: 400 },
    data: {
      name: 'order-service',
      modules: ['order'],
      moduleCapacity: 3,
      load: 65,
      messageQueue: true
    }
  },
  {
    id: 'svc-payment',
    type: 'service',
    position: { x: 500, y: 400 },
    data: {
      name: 'payment-service',
      modules: ['payment'],
      moduleCapacity: 3,
      load: 55,
      messageQueue: true
    }
  },
  {
    id: 'svc-inventory',
    type: 'service',
    position: { x: 700, y: 400 },
    data: {
      name: 'inventory-service',
      modules: ['inventory'],
      moduleCapacity: 3,
      load: 40,
      messageQueue: true
    }
  },
  // 数据库按服务分片
  {
    id: 'db-user',
    type: 'database',
    position: { x: 100, y: 650 },
    data: {
      name: 'db-user',
      type: 'MongoDB',
      modules: ['user'],
      moduleQps: { user: 300 }
    }
  },
  {
    id: 'db-order',
    type: 'database',
    position: { x: 300, y: 650 },
    data: {
      name: 'db-order',
      type: 'PostgreSQL',
      modules: ['order'],
      moduleQps: { order: 600 }
    }
  },
  // 消息队列（作为中间节点）
  {
    id: 'mq-1',
    type: 'service',
    position: { x: 400, y: 320 },
    data: {
      name: 'kafka-cluster',
      modules: ['message-queue'],
      load: 30,
      messageQueue: true
    }
  }
]

// 当前场景
const nodes = ref(microservicesScenario)

// 定义连接关系
const edgess = ref([
  { id: 'e1-2', source: 'http-1', target: 'lb-1' },
  { id: 'e2-3', source: 'lb-1', target: 'server-1' },
  { id: 'e2-4', source: 'lb-1', target: 'server-2' },
  { id: 'e2-5', source: 'lb-1', target: 'server-3' },
  { id: 'e3-6', source: 'server-1', target: 'db-1' },
  { id: 'e4-6', source: 'server-2', target: 'db-1' },
  { id: 'e5-6', source: 'server-3', target: 'db-1' }
])

// 边定义（带类型标识）
const edges = ref([
  // HTTP -> Gateway
  { 
    id: 'e1', 
    source: 'http-2', 
    target: 'svc-gateway',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#667eea', strokeWidth: 3 },
    label: 'REST API'
  },
  // Gateway -> MQ -> Services
  { 
    id: 'e2', 
    source: 'svc-gateway', 
    target: 'mq-1',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#ed8936', strokeWidth: 2 },
    label: '事件发布'
  },
  { id: 'e3', source: 'mq-1', target: 'svc-user', type: 'smoothstep', animated: true },
  { id: 'e4', source: 'mq-1', target: 'svc-order', type: 'smoothstep', animated: true },
  { id: 'e5', source: 'mq-1', target: 'svc-payment', type: 'smoothstep', animated: true },
  // Services -> DBs
  { 
    id: 'e6', 
    source: 'svc-user', 
    target: 'db-user',
    type: 'smoothstep',
    style: { stroke: '#9f7aea' },
    label: 'user-db'
  },
  { 
    id: 'e7', 
    source: 'svc-order', 
    target: 'db-order',
    type: 'smoothstep',
    style: { stroke: '#9f7aea' },
    label: 'order-db'
  }
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

.architecture-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background: #1a202c;
}
.toolbar {
  padding: 16px 24px;
  background: #2d3748;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #4a5568;
}
.scenario-switch {
  display: flex;
  gap: 12px;
}
.btn-monolith, .btn-micro {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}
.btn-monolith {
  background: linear-gradient(135deg, #9f7aea, #805ad5);
  color: white;
}
.btn-micro {
  background: linear-gradient(135deg, #4299e1, #3182ce);
  color: white;
}
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(45, 55, 72, 0.9);
  padding: 16px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  backdrop-filter: blur(10px);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.dot.micro { background: #4299e1; }
.dot.mono { background: #9f7aea; }
.dot.db { background: #48bb78; }

/* 连线动画 */
.vue-flow__edge.animated path {
  stroke-dasharray: 8;
  animation: dash 1s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -16;
  }
}
</style>