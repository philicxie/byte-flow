<!-- Sidebar.vue -->
<script setup>
import useDragAndDrop from './useDnD'

const { onDragStart } = useDragAndDrop()

// HTTP 请求模板 - 扁平化展示
const httpTemplates = [
  { name: '查询用户', modules: ['user'], rates: [{ mod: 'user', rate: 100 }] },
  { name: '提交订单',  modules: ['cart', 'inventory', 'order', 'payment'], rates: [{ mod: 'cart', rate: 50 }, { mod: 'inventory', rate: 30 }, { mod: 'order', rate: 20 }, { mod: 'payment', rate: 10 }] },
]

// 服务模板
const serviceTemplates = [
  { name: '用户服务', type: 'microservice', modules: ['user'], icon: '🎯', desc: '单模块 + MQ' },
  { name: '核心服务', type: 'monolith', modules: ['user', 'order', 'payment', 'inventory', 'notification'], icon: '🏛️', desc: '多模块内部调用' },
]

// 负载均衡器模板
const lbTemplate = { name: '负载均衡器', algorithm: 'round-robin', backends: 2, icon: '⚖️', desc: '流量分发' }

// 数据库模板
const dbTemplates = [
  { type: 'PostgreSQL', name: '主数据库', modules: ['user', 'order'], icon: '🗄️' },
  { type: 'MongoDB', name: '文档存储', modules: ['logs', 'session'], icon: '📄' },
]

// 获取颜色
const getRateColor = (rate) => {
  if (rate >= 80) return 'high'
  if (rate >= 50) return 'medium'
  if (rate >= 20) return 'low'
  return 'critical'
}
</script>

<template>
  <div class="sidebar">
    <!-- HTTP 请求 -->
    <div class="section">
      <div class="section-title">
        <span class="icon">🌐</span>
        <span>HTTP 请求</span>
      </div>
      <div class="item-list">
        <div 
          v-for="tpl in httpTemplates" 
          :key="tpl.name"
          class="draggable-item http-item"
          :draggable="true" 
          @dragstart="onDragStart($event, 'http', { 
            method: tpl.method, 
            path: tpl.path, 
            modules: tpl.modules,
            label: tpl.name 
          })"
        >
          <div class="item-main">
            <span class="item-name">{{ tpl.name }}</span>
            <span class="method-badge" :class="tpl.method">{{ tpl.method }}</span>
          </div>
        </div>
        
        <div 
          class="draggable-item http-item custom"
          :draggable="true" 
          @dragstart="onDragStart($event, 'http', { method: 'GET', path: '/api/custom', modules: ['custom'], label: '自定义请求' })"
        >
          <span class="plus">+</span>
          <span>自定义</span>
        </div>
      </div>
    </div>

    <!-- 服务实例 -->
    <div class="section">
      <div class="section-title">
        <span class="icon">⚙️</span>
        <span>服务实例</span>
      </div>
      <div class="item-list">
        <div 
          v-for="tpl in serviceTemplates" 
          :key="tpl.name"
          class="draggable-item service-item"
          :class="tpl.type"
          :draggable="true" 
          @dragstart="onDragStart($event, 'service', { 
            name: tpl.name.toLowerCase().replace(/\s/g, '-'),
            modules: tpl.modules,
            capacity: 100,
            processingRequests: 0,
            load: 0,
            messageQueue: tpl.type !== 'monolith',
            processingDelay: 20
          })"
        >
          <div class="item-icon">{{ tpl.icon }}</div>
          <div class="item-name">{{ tpl.name }}</div>
        </div>
        
        <div 
          class="draggable-item service-item custom"
          :draggable="true" 
          @dragstart="onDragStart($event, 'service', { name: 'custom-service', modules: [], capacity: 100, processingRequests: 0, load: 0, messageQueue: false, processingDelay: 20 })"
        >
          <span class="plus">+</span>
        </div>
      </div>
    </div>

    <!-- 负载均衡 -->
    <div class="section">
      <div class="section-title">
        <span class="icon">⚖️</span>
        <span>负载均衡</span>
      </div>
      <div class="item-list">
        <div 
          class="draggable-item lb-item"
          :draggable="true" 
          @dragstart="onDragStart($event, 'loadbalancer', { 
            name: lbTemplate.name,
            algorithm: lbTemplate.algorithm,
            capacity: 100,
            processingRequests: 0,
            droppedRequests: 0
          })"
        >
          <div class="item-icon">{{ lbTemplate.icon }}</div>
          <div class="item-name">{{ lbTemplate.name }}</div>
        </div>
      </div>
    </div>

    <!-- 数据存储 -->
    <div class="section">
      <div class="section-title">
        <span class="icon">🗄️</span>
        <span>数据存储</span>
      </div>
      <div class="item-list">
        <div 
          v-for="tpl in dbTemplates" 
          :key="tpl.name"
          class="draggable-item db-item"
          :draggable="true" 
          @dragstart="onDragStart($event, 'database', { 
            type: tpl.type,
            name: tpl.name.toLowerCase().replace(/\s/g, '-'),
            modules: tpl.modules,
            processingDelay: 30
          })"
        >
          <div class="item-icon">{{ tpl.icon }}</div>
          <div class="item-name">{{ tpl.name }}</div>
        </div>
        
        <div 
          class="draggable-item db-item custom"
          :draggable="true" 
          @dragstart="onDragStart($event, 'database', { type: 'PostgreSQL', name: 'custom-db', modules: ['data'], processingDelay: 30 })"
        >
          <span class="plus">+</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 16px 24px;
  color: #f1f5f9;
  overflow-x: auto;
  overflow-y: hidden;
}

/* 区块 */
.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px;
  white-space: nowrap;
}

.section-title .icon {
  font-size: 14px;
}

/* 项目列表 */
.item-list {
  display: flex;
  gap: 10px;
}

/* 可拖拽项基础 */
.draggable-item {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  padding: 10px 14px;
  cursor: grab;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 100px;
}

.draggable-item:hover {
  background: rgba(51, 65, 85, 0.6);
  border-color: rgba(148, 163, 184, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.draggable-item:active {
  cursor: grabbing;
}

.draggable-item.custom {
  border-style: dashed;
  border-color: rgba(148, 163, 184, 0.3);
  color: #64748b;
  justify-content: center;
  min-width: 44px;
}

.plus {
  font-size: 16px;
  font-weight: 300;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.method-badge {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  width: fit-content;
}

.method-badge.GET { background: #61affe; color: #0c4a6e; }
.method-badge.POST { background: #49cc90; color: #064e3b; }
.method-badge.PUT { background: #fca130; color: #78350f; }

.item-icon {
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

/* HTTP 项 */
.http-item {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  border-color: rgba(102, 126, 234, 0.3);
}

.http-item:hover {
  border-color: rgba(102, 126, 234, 0.6);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
}

/* 服务项 */
.service-item.microservice {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%);
  border-color: rgba(59, 130, 246, 0.3);
}

.service-item.microservice:hover {
  border-color: rgba(59, 130, 246, 0.6);
}

.service-item.small {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.15) 100%);
  border-color: rgba(234, 179, 8, 0.3);
}

.service-item.small:hover {
  border-color: rgba(234, 179, 8, 0.6);
}

.service-item.monolith {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%);
  border-color: rgba(168, 85, 247, 0.3);
}

.service-item.monolith:hover {
  border-color: rgba(168, 85, 247, 0.6);
}

/* 数据库项 */
.db-item {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.15) 100%);
  border-color: rgba(34, 197, 94, 0.3);
}

.db-item:hover {
  border-color: rgba(34, 197, 94, 0.6);
}

/* 负载均衡项 */
.lb-item {
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.15) 0%, rgba(245, 87, 108, 0.15) 100%);
  border-color: rgba(240, 147, 251, 0.3);
}

.lb-item:hover {
  border-color: rgba(240, 147, 251, 0.6);
}

/* 滚动条 */
.sidebar::-webkit-scrollbar {
  height: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.3);
}
</style>
