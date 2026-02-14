<!-- Sidebar.vue -->
<script setup>
import useDragAndDrop from './useDnD'

const { onDragStart } = useDragAndDrop()

// HTTP 请求模板 - 扁平化展示
const httpTemplates = [
  { name: '查询用户', method: 'GET', path: '/api/users', modules: ['user'], rates: [{ mod: 'user', rate: 100 }] },
  { name: '创建用户', method: 'POST', path: '/api/users', modules: ['user'], rates: [{ mod: 'user', rate: 0 }] },
  { name: '查看购物车', method: 'GET', path: '/api/cart', modules: ['cart', 'inventory'], rates: [{ mod: 'cart', rate: 100 }, { mod: 'inventory', rate: 100 }] },
  { name: '提交订单', method: 'POST', path: '/api/orders', modules: ['cart', 'inventory', 'order', 'payment'], rates: [{ mod: 'cart', rate: 50 }, { mod: 'inventory', rate: 30 }, { mod: 'order', rate: 20 }, { mod: 'payment', rate: 10 }] },
  { name: '更新库存', method: 'PUT', path: '/api/inventory', modules: ['inventory'], rates: [{ mod: 'inventory', rate: 10 }] },
  { name: '查询库存', method: 'GET', path: '/api/inventory', modules: ['inventory'], rates: [{ mod: 'inventory', rate: 90 }] },
]

// 服务模板
const serviceTemplates = [
  { name: '用户服务', type: 'microservice', modules: ['user'], icon: '🎯', desc: '单模块 + MQ' },
  { name: '订单服务', type: 'small', modules: ['order', 'payment'], icon: '📦', desc: '2-3模块 + MQ' },
  { name: '核心服务', type: 'monolith', modules: ['user', 'order', 'payment', 'inventory', 'notification'], icon: '🏛️', desc: '多模块内部调用' },
]

// 数据库模板
const dbTemplates = [
  { type: 'PostgreSQL', name: '主数据库', modules: ['user', 'order'], icon: '🗄️' },
  { type: 'MongoDB', name: '文档存储', modules: ['logs', 'session'], icon: '📄' },
  { type: 'Redis', name: '缓存集群', modules: ['cache', 'session'], icon: '⚡' },
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
    <!-- 头部 -->
    <div class="sidebar-header">
      <h3>🛠️ 架构组件</h3>
      <p>拖拽组件到画布构建架构</p>
    </div>

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
          <div class="item-tags">
            <span 
              v-for="r in tpl.rates" 
              :key="r.mod"
              class="rate-tag"
              :class="getRateColor(r.rate)"
            >
              {{ r.mod }} {{ r.rate }}%R
            </span>
          </div>
        </div>
        
        <div 
          class="draggable-item http-item custom"
          :draggable="true" 
          @dragstart="onDragStart($event, 'http', { method: 'GET', path: '/api/custom', modules: ['custom'], label: '自定义请求' })"
        >
          <span class="plus">+</span>
          <span>自定义请求</span>
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
            moduleCapacity: tpl.type === 'microservice' ? 3 : tpl.type === 'small' ? 5 : 10,
            load: 0,
            messageQueue: tpl.type !== 'monolith',
            processingDelay: 20
          })"
        >
          <div class="item-icon">{{ tpl.icon }}</div>
          <div class="item-info">
            <div class="item-name">{{ tpl.name }}</div>
            <div class="item-desc">{{ tpl.modules.length }} 模块 · {{ tpl.desc }}</div>
          </div>
        </div>
        
        <div 
          class="draggable-item service-item custom"
          :draggable="true" 
          @dragstart="onDragStart($event, 'service', { name: 'custom-service', modules: [], moduleCapacity: 5, load: 0, messageQueue: false, processingDelay: 20 })"
        >
          <span class="plus">+</span>
          <span>自定义服务</span>
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
          <div class="item-info">
            <div class="item-name">{{ tpl.name }}</div>
            <div class="item-desc">{{ tpl.type }} · {{ tpl.modules.length }} 模块</div>
          </div>
        </div>
        
        <div 
          class="draggable-item db-item custom"
          :draggable="true" 
          @dragstart="onDragStart($event, 'database', { type: 'PostgreSQL', name: 'custom-db', modules: ['data'], processingDelay: 30 })"
        >
          <span class="plus">+</span>
          <span>自定义数据库</span>
        </div>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="sidebar-footer">
      <span>💡</span>
      <span>双击服务节点可切换架构模式</span>
    </div>
</template>

<style scoped>
.sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #f1f5f9;
}

/* 头部 */
.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  text-align: center;
}

.sidebar-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(90deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-header p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

/* 区块 */
.section {
  padding: 16px 16px 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-title .icon {
  font-size: 16px;
}

/* 项目列表 */
.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 可拖拽项基础 */
.draggable-item {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 10px;
  padding: 12px;
  cursor: grab;
  transition: all 0.2s;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
}

.plus {
  font-size: 18px;
  font-weight: 300;
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

.item-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
}

.method-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.method-badge.GET { background: #61affe; color: #0c4a6e; }
.method-badge.POST { background: #49cc90; color: #064e3b; }
.method-badge.PUT { background: #fca130; color: #78350f; }

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rate-tag {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
}

.rate-tag.high { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.rate-tag.medium { background: rgba(234, 179, 8, 0.2); color: #facc15; }
.rate-tag.low { background: rgba(249, 115, 22, 0.2); color: #fb923c; }
.rate-tag.critical { background: rgba(239, 68, 68, 0.2); color: #f87171; }

/* 服务项 */
.service-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

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

.item-icon {
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.item-info {
  flex: 1;
}

.item-desc {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

/* 数据库项 */
.db-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.15) 100%);
  border-color: rgba(34, 197, 94, 0.3);
}

.db-item:hover {
  border-color: rgba(34, 197, 94, 0.6);
}

/* 底部 */
.sidebar-footer {
  margin-top: auto;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

/* 滚动条 */
.sidebar::-webkit-scrollbar {
  width: 6px;
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