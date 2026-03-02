<!-- BlueprintSidebar.vue - 蓝图侧栏 -->
<script setup>
import { ref } from 'vue'

// 定义蓝图数据 - 包含完整的节点和边配置
const blueprints = [
  {
    id: 'microservices',
    name: '微服务架构',
    icon: '🔷',
    description: 'HTTP + LB + 3微服务 + DB',
    color: '#3b82f6',
    // 节点相对位置配置
    nodes: [
      { id: 'http', type: 'http', label: 'API网关', x: 50, y: 50, data: { method: 'POST', path: '/api/v1/*', modules: ['gateway'], capacity: 1000, processingDelay: 5 } },
      { id: 'lb', type: 'loadbalancer', label: '负载均衡器', x: 250, y: 50, data: { name: 'lb-main', algorithm: 'round-robin', capacity: 1000, processingRequests: 0, droppedRequests: 0 } },
      { id: 'svc1', type: 'service', label: '用户服务', x: 450, y: -50, data: { name: 'user-service', modules: ['user'], capacity: 100, processingRequests: 0, load: 0, messageQueue: true, processingDelay: 20 } },
      { id: 'svc2', type: 'service', label: '订单服务', x: 450, y: 50, data: { name: 'order-service', modules: ['order'], capacity: 100, processingRequests: 0, load: 0, messageQueue: true, processingDelay: 25 } },
      { id: 'svc3', type: 'service', label: '支付服务', x: 450, y: 150, data: { name: 'payment-service', modules: ['payment'], capacity: 100, processingRequests: 0, load: 0, messageQueue: true, processingDelay: 30 } },
      { id: 'db1', type: 'database', label: '用户DB', x: 650, y: -50, data: { type: 'PostgreSQL', name: 'user-db', modules: ['user'], processingDelay: 15 } },
      { id: 'db2', type: 'database', label: '订单DB', x: 650, y: 50, data: { type: 'PostgreSQL', name: 'order-db', modules: ['order'], processingDelay: 15 } },
      { id: 'db3', type: 'database', label: '支付DB', x: 650, y: 150, data: { type: 'PostgreSQL', name: 'payment-db', modules: ['payment'], processingDelay: 15 } },
    ],
    edges: [
      { source: 'http', target: 'lb', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'lb', target: 'svc1', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'lb', target: 'svc2', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'lb', target: 'svc3', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'svc1', target: 'db1', sourceHandle: 'db-out', targetHandle: 'db-in' },
      { source: 'svc2', target: 'db2', sourceHandle: 'db-out', targetHandle: 'db-in' },
      { source: 'svc3', target: 'db3', sourceHandle: 'db-out', targetHandle: 'db-in' },
    ]
  },
  {
    id: 'monolith',
    name: '单体架构',
    icon: '🏛️',
    description: 'HTTP + 单体服务 + 共享DB',
    color: '#a855f7',
    nodes: [
      { id: 'http', type: 'http', label: 'Web入口', x: 50, y: 100, data: { method: 'POST', path: '/api/*', modules: ['web'], capacity: 500, processingDelay: 5 } },
      { id: 'monolith', type: 'service', label: '核心服务', x: 250, y: 100, data: { name: 'monolith-app', modules: ['user', 'order', 'payment', 'inventory', 'notification'], capacity: 200, processingRequests: 0, load: 0, messageQueue: false, processingDelay: 50 } },
      { id: 'db', type: 'database', label: '主数据库', x: 450, y: 100, data: { type: 'PostgreSQL', name: 'main-db', modules: ['user', 'order', 'payment', 'inventory'], processingDelay: 20 } },
    ],
    edges: [
      { source: 'http', target: 'monolith', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'monolith', target: 'db', sourceHandle: 'db-out', targetHandle: 'db-in' },
    ]
  },
  {
    id: 'three-tier',
    name: '三层架构',
    icon: '🏗️',
    description: 'Web + App + 缓存 + DB',
    color: '#22c55e',
    nodes: [
      { id: 'http', type: 'http', label: 'Web层', x: 50, y: 100, data: { method: 'GET', path: '/web/*', modules: ['frontend'], capacity: 300, processingDelay: 10 } },
      { id: 'app1', type: 'service', label: '应用实例1', x: 250, y: 50, data: { name: 'app-1', modules: ['app'], capacity: 100, processingRequests: 0, load: 0, messageQueue: false, processingDelay: 30 } },
      { id: 'app2', type: 'service', label: '应用实例2', x: 250, y: 150, data: { name: 'app-2', modules: ['app'], capacity: 100, processingRequests: 0, load: 0, messageQueue: false, processingDelay: 30 } },
      { id: 'cache', type: 'database', label: 'Redis缓存', x: 450, y: 50, data: { type: 'Redis', name: 'redis-cache', modules: ['cache'], processingDelay: 5 } },
      { id: 'db', type: 'database', label: 'PostgreSQL', x: 450, y: 150, data: { type: 'PostgreSQL', name: 'postgres-main', modules: ['data'], processingDelay: 25 } },
    ],
    edges: [
      { source: 'http', target: 'app1', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'http', target: 'app2', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'app1', target: 'cache', sourceHandle: 'db-out', targetHandle: 'db-in' },
      { source: 'app1', target: 'db', sourceHandle: 'db-out', targetHandle: 'db-in' },
      { source: 'app2', target: 'cache', sourceHandle: 'db-out', targetHandle: 'db-in' },
      { source: 'app2', target: 'db', sourceHandle: 'db-out', targetHandle: 'db-in' },
    ]
  },
  {
    id: 'async-queue',
    name: '异步队列架构',
    icon: '📨',
    description: 'HTTP + 消息队列 + 工作节点',
    color: '#f59e0b',
    nodes: [
      { id: 'http', type: 'http', label: '任务提交', x: 50, y: 100, data: { method: 'POST', path: '/tasks', modules: ['api'], capacity: 200, processingDelay: 5 } },
      { id: 'queue', type: 'service', label: '任务队列', x: 250, y: 100, data: { name: 'task-queue', modules: ['queue'], capacity: 500, processingRequests: 0, load: 0, messageQueue: true, processingDelay: 10 } },
      { id: 'worker1', type: 'service', label: '工作节点1', x: 450, y: 50, data: { name: 'worker-1', modules: ['processor'], capacity: 50, processingRequests: 0, load: 0, messageQueue: true, processingDelay: 40 } },
      { id: 'worker2', type: 'service', label: '工作节点2', x: 450, y: 150, data: { name: 'worker-2', modules: ['processor'], capacity: 50, processingRequests: 0, load: 0, messageQueue: true, processingDelay: 40 } },
      { id: 'db', type: 'database', label: '结果存储', x: 650, y: 100, data: { type: 'MongoDB', name: 'results-db', modules: ['results'], processingDelay: 20 } },
    ],
    edges: [
      { source: 'http', target: 'queue', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'queue', target: 'worker1', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'queue', target: 'worker2', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'worker1', target: 'db', sourceHandle: 'db-out', targetHandle: 'db-in' },
      { source: 'worker2', target: 'db', sourceHandle: 'db-out', targetHandle: 'db-in' },
    ]
  },
  {
    id: 'cdn-edge',
    name: '边缘缓存架构',
    icon: '🌍',
    description: '多地域 + CDN + 源站',
    color: '#06b6d4',
    nodes: [
      { id: 'http1', type: 'http', label: '北京入口', x: 50, y: 50, data: { method: 'GET', path: '/api/*', modules: ['beijing'], capacity: 200, processingDelay: 5 } },
      { id: 'http2', type: 'http', label: '上海入口', x: 50, y: 150, data: { method: 'GET', path: '/api/*', modules: ['shanghai'], capacity: 200, processingDelay: 5 } },
      { id: 'edge1', type: 'service', label: '边缘节点-北', x: 250, y: 50, data: { name: 'edge-beijing', modules: ['cache'], capacity: 100, processingRequests: 0, load: 0, messageQueue: false, processingDelay: 15 } },
      { id: 'edge2', type: 'service', label: '边缘节点-沪', x: 250, y: 150, data: { name: 'edge-shanghai', modules: ['cache'], capacity: 100, processingRequests: 0, load: 0, messageQueue: false, processingDelay: 15 } },
      { id: 'origin', type: 'service', label: '源站服务', x: 450, y: 100, data: { name: 'origin-server', modules: ['origin'], capacity: 150, processingRequests: 0, load: 0, messageQueue: false, processingDelay: 35 } },
      { id: 'db', type: 'database', label: '主存储', x: 650, y: 100, data: { type: 'PostgreSQL', name: 'origin-db', modules: ['data'], processingDelay: 20 } },
    ],
    edges: [
      { source: 'http1', target: 'edge1', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'http2', target: 'edge2', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'edge1', target: 'origin', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'edge2', target: 'origin', sourceHandle: null, targetHandle: 'http-in' },
      { source: 'origin', target: 'db', sourceHandle: 'db-out', targetHandle: 'db-in' },
    ]
  },
]

const emit = defineEmits(['dragstart'])

const onDragStart = (event, blueprint) => {
  // 传递蓝图数据
  event.dataTransfer.setData('application/blueprint', JSON.stringify(blueprint))
  event.dataTransfer.effectAllowed = 'copy'
  emit('dragstart', blueprint)
}
</script>

<template>
  <div class="blueprint-sidebar">
    <div class="sidebar-header">
      <span class="header-icon">📐</span>
      <span class="header-title">架构蓝图</span>
    </div>
    
    <div class="blueprint-list">
      <div
        v-for="bp in blueprints"
        :key="bp.id"
        class="blueprint-item"
        :draggable="true"
        @dragstart="onDragStart($event, bp)"
        :style="{ '--bp-color': bp.color }"
      >
        <div class="bp-icon">{{ bp.icon }}</div>
        <div class="bp-info">
          <div class="bp-name">{{ bp.name }}</div>
          <div class="bp-desc">{{ bp.description }}</div>
        </div>
        <div class="bp-drag-hint">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="sidebar-footer">
      <div class="tip">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <span>拖拽蓝图到画布创建完整系统</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blueprint-sidebar {
  width: 260px;
  height: 100%;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.header-icon {
  font-size: 20px;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: -0.3px;
}

.blueprint-list {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.blueprint-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-left: 3px solid var(--bp-color, #3b82f6);
  border-radius: 10px;
  cursor: grab;
  transition: all 0.2s ease;
  position: relative;
}

.blueprint-item:hover {
  background: rgba(51, 65, 85, 0.6);
  border-color: rgba(148, 163, 184, 0.2);
  border-left-color: var(--bp-color, #3b82f6);
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1);
}

.blueprint-item:active {
  cursor: grabbing;
}

.bp-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.bp-info {
  flex: 1;
  min-width: 0;
}

.bp-name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bp-desc {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bp-drag-hint {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  opacity: 0;
  transition: all 0.2s;
}

.blueprint-item:hover .bp-drag-hint {
  opacity: 1;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.tip svg {
  flex-shrink: 0;
  color: #3b82f6;
}

/* 滚动条样式 */
.blueprint-list::-webkit-scrollbar {
  width: 6px;
}

.blueprint-list::-webkit-scrollbar-track {
  background: transparent;
}

.blueprint-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 3px;
}

.blueprint-list::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.3);
}

/* 拖拽时的样式 */
.blueprint-item[draggable="true"]:hover {
  background: rgba(59, 130, 246, 0.08);
}
</style>
