<script setup>
import useDragAndDrop from './useDnD'

const { onDragStart } = useDragAndDrop()

// 预设的服务模块配置（仅包含访问权限）
const serviceTemplates = {
  userService: {
    name: 'user-service',
    modules: [
      { name: 'user', access: 'rw' },
    ],
    moduleCapacity: 10,
    load: 0,
  },
  orderService: {
    name: 'order-service',
    modules: [
      { name: 'order', access: 'rw' },
      { name: 'payment', access: 'w' },  // 只写
    ],
    moduleCapacity: 15,
    load: 0,
  },
  inventoryService: {
    name: 'inventory-service',
    modules: [
      { name: 'inventory', access: 'rw' },
    ],
    moduleCapacity: 20,
    load: 0,
  },
  cartService: {
    name: 'cart-service',
    modules: [
      { name: 'cart', access: 'rw' },
      { name: 'inventory', access: 'r' },  // 只读库存
    ],
    moduleCapacity: 12,
    load: 0,
  },
  monolith: {
    name: 'monolith-service',
    modules: [
      { name: 'user', access: 'rw' },
      { name: 'order', access: 'rw' },
      { name: 'payment', access: 'w' },
      { name: 'inventory', access: 'rw' },
      { name: 'cart', access: 'rw' },
    ],
    moduleCapacity: 50,
    load: 0,
  }
}

// HTTP 请求模板（新格式：使用 moduleAccess + readRatio）
const httpTemplates = [
  { 
    method: 'GET', 
    moduleAccess: [{ name: 'user', readRatio: 100 }],  // 100%读
    label: '查询用户'
  },
  { 
    method: 'POST', 
    moduleAccess: [{ name: 'user', readRatio: 0 }],  // 100%写
    label: '创建用户'
  },
  { 
    method: 'GET', 
    moduleAccess: [
      { name: 'cart', readRatio: 100 },
      { name: 'inventory', readRatio: 100 }
    ],
    label: '查看购物车'
  },
  { 
    method: 'POST', 
    moduleAccess: [
      { name: 'cart', readRatio: 50 },  // 混合读写
      { name: 'inventory', readRatio: 30 },
      { name: 'order', readRatio: 20 },
      { name: 'payment', readRatio: 10 }
    ],
    label: '提交订单'
  },
  { 
    method: 'PUT', 
    moduleAccess: [{ name: 'inventory', readRatio: 10 }],  // 主要是写
    label: '更新库存'
  },
  { 
    method: 'GET', 
    moduleAccess: [{ name: 'inventory', readRatio: 90 }],  // 主要是读
    label: '查询库存'
  }
]

// 数据库模板
// 根据读比例返回样式类
const getAccessClass = (readRatio) => {
  if (readRatio >= 80) return 'read'
  if (readRatio <= 20) return 'write'
  return 'mixed'
}

const dbTemplates = [
  { type: 'PostgreSQL', name: 'db-primary', modules: ['user', 'order', 'payment'] },
  { type: 'MongoDB', name: 'db-user', modules: ['user'] },
  { type: 'Redis', name: 'cache-inventory', modules: ['inventory', 'cart'] }
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h3>🏗️ 架构组件</h3>
      <p>拖拽组件到画布构建架构</p>
    </div>

    <!-- HTTP 请求节点 -->
    <div class="node-category">
      <div class="category-title">
        <span>🌐</span>
        <span>HTTP 请求</span>
      </div>
      <div class="node-list">
        <div 
          v-for="(tpl, idx) in httpTemplates" 
          :key="idx"
          class="draggable-node http-node-preview"
          :draggable="true" 
          @dragstart="onDragStart($event, 'http', { ...tpl })"
        >
          <div class="node-preview-header">
            <span class="method-badge" :class="tpl.method">{{ tpl.method }}</span>
            <span class="label-text">{{ tpl.label }}</span>
          </div>
          <div class="modules-hint">
            <span 
              v-for="mod in tpl.moduleAccess" 
              :key="mod.name"
              class="access-tag"
              :class="getAccessClass(mod.readRatio)"
            >
              {{ mod.name }} {{ mod.readRatio }}%R
            </span>
          </div>
        </div>
        
        <!-- 自定义 HTTP 节点 -->
        <div 
          class="draggable-node http-node-preview custom"
          :draggable="true" 
          @dragstart="onDragStart($event, 'http', { 
            method: 'GET',
            moduleAccess: [],
            label: '自定义请求'
          })"
        >
          <span class="plus-icon">+</span>
          <span>自定义请求</span>
        </div>
      </div>
    </div>

    <!-- 服务节点 -->
    <div class="node-category">
      <div class="category-title">
        <span>⚙️</span>
        <span>服务实例</span>
      </div>
      <div class="node-list">
        <!-- 单体服务 -->
        <div 
          class="draggable-node service-node-preview monolith"
          :draggable="true" 
          @dragstart="onDragStart($event, 'service', serviceTemplates.monolith)"
        >
          <div class="service-icon">🏛️</div>
          <div class="service-info">
            <div class="service-name">单体服务</div>
            <div class="service-desc">全模块支持</div>
          </div>
          <div class="module-count">5 模块</div>
        </div>

        <!-- 用户服务 -->
        <div 
          class="draggable-node service-node-preview user"
          :draggable="true" 
          @dragstart="onDragStart($event, 'service', serviceTemplates.userService)"
        >
          <div class="service-icon">👤</div>
          <div class="service-info">
            <div class="service-name">用户服务</div>
            <div class="service-desc">user (RW)</div>
          </div>
          <div class="module-count">1 模块</div>
        </div>

        <!-- 订单服务 -->
        <div 
          class="draggable-node service-node-preview order"
          :draggable="true" 
          @dragstart="onDragStart($event, 'service', serviceTemplates.orderService)"
        >
          <div class="service-icon">📋</div>
          <div class="service-info">
            <div class="service-name">订单服务</div>
            <div class="service-desc">order(RW) + payment(W)</div>
          </div>
          <div class="module-count">2 模块</div>
        </div>

        <!-- 库存服务 -->
        <div 
          class="draggable-node service-node-preview inventory"
          :draggable="true" 
          @dragstart="onDragStart($event, 'service', serviceTemplates.inventoryService)"
        >
          <div class="service-icon">📦</div>
          <div class="service-info">
            <div class="service-name">库存服务</div>
            <div class="service-desc">inventory (RW)</div>
          </div>
          <div class="module-count">1 模块</div>
        </div>

        <!-- 购物车服务 -->
        <div 
          class="draggable-node service-node-preview cart"
          :draggable="true" 
          @dragstart="onDragStart($event, 'service', serviceTemplates.cartService)"
        >
          <div class="service-icon">🛒</div>
          <div class="service-info">
            <div class="service-name">购物车服务</div>
            <div class="service-desc">cart(RW) + inv(R)</div>
          </div>
          <div class="module-count">2 模块</div>
        </div>

        <!-- 自定义服务 -->
        <div 
          class="draggable-node service-node-preview custom"
          :draggable="true" 
          @dragstart="onDragStart($event, 'service', {
            name: 'custom-service',
            modules: [],
            moduleCapacity: 10,
            load: 0
          })"
        >
          <span class="plus-icon">+</span>
          <span>自定义服务</span>
        </div>
      </div>
    </div>

    <!-- 数据库节点 -->
    <div class="node-category">
      <div class="category-title">
        <span>🗄️</span>
        <span>数据存储</span>
      </div>
      <div class="node-list">
        <div 
          v-for="(tpl, idx) in dbTemplates" 
          :key="idx"
          class="draggable-node db-node-preview"
          :draggable="true" 
          @dragstart="onDragStart($event, 'database', { ...tpl, label: tpl.name })"
        >
          <div class="db-icon">{{ tpl.type === 'Redis' ? '⚡' : '🗄️' }}</div>
          <div class="db-info">
            <div class="db-type">{{ tpl.type }}</div>
            <div class="db-name">{{ tpl.name }}</div>
          </div>
          <div class="db-modules">{{ tpl.modules.length }} 模块</div>
        </div>

        <!-- 自定义数据库 -->
        <div 
          class="draggable-node db-node-preview custom"
          :draggable="true" 
          @dragstart="onDragStart($event, 'database', {
            type: 'PostgreSQL',
            name: 'db-custom',
            modules: ['data'],
            label: 'Custom DB'
          })"
        >
          <span class="plus-icon">+</span>
          <span>自定义数据库</span>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="sidebar-footer">
      <div class="tip">
        <span>💡</span>
        <span>提示：点击服务节点上的模块可切换读写权限<br>请求节点需要匹配的模块权限才能成功处理</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  background: linear-gradient(180deg, #1a202c 0%, #2d3748 100%);
  color: white;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #4a5568;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #4a5568;
}

.sidebar-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-header p {
  margin: 0;
  font-size: 12px;
  color: #a0aec0;
}

.node-category {
  padding: 16px;
  border-bottom: 1px solid #4a5568;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 可拖拽节点基础样式 */
.draggable-node {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 10px;
  padding: 12px;
  cursor: grab;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.draggable-node:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.draggable-node:active {
  cursor: grabbing;
}

.draggable-node.custom {
  border-style: dashed;
  border-color: #4a5568;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #a0aec0;
  font-size: 13px;
}

.plus-icon {
  font-size: 18px;
  font-weight: bold;
}

/* HTTP 节点预览 */
.http-node-preview {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  border-color: rgba(102, 126, 234, 0.5);
}

.http-node-preview:hover {
  border-color: #667eea;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.node-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.method-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.method-badge.GET { background: #61affe; color: #1a365d; }
.method-badge.POST { background: #49cc90; color: #1c4532; }
.method-badge.PUT { background: #fca130; color: #744210; }
.method-badge.DELETE { background: #f93e3e; color: white; }
.method-badge.PATCH { background: #50e3c2; color: #1c4532; }

.path-text {
  font-size: 12px;
  font-family: monospace;
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modules-hint {
  font-size: 10px;
  color: #a0aec0;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.access-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  text-transform: capitalize;
}

.access-tag.read {
  background: rgba(72, 187, 120, 0.3);
  color: #48bb78;
}

.access-tag.write {
  background: rgba(245, 101, 101, 0.3);
  color: #f56565;
}

.access-tag.mixed {
  background: rgba(236, 201, 75, 0.3);
  color: #ecc94b;
}

/* 服务节点预览 */
.service-node-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.service-node-preview.monolith {
  background: linear-gradient(135deg, rgba(159, 122, 234, 0.2) 0%, rgba(128, 90, 213, 0.2) 100%);
  border-color: rgba(159, 122, 234, 0.5);
}

.service-node-preview.monolith:hover {
  border-color: #9f7aea;
  box-shadow: 0 4px 16px rgba(159, 122, 234, 0.3);
}

.service-node-preview.user {
  background: linear-gradient(135deg, rgba(66, 153, 225, 0.2) 0%, rgba(49, 130, 206, 0.2) 100%);
  border-color: rgba(66, 153, 225, 0.5);
}

.service-node-preview.user:hover {
  border-color: #4299e1;
  box-shadow: 0 4px 16px rgba(66, 153, 225, 0.3);
}

.service-node-preview.order {
  background: linear-gradient(135deg, rgba(236, 201, 75, 0.2) 0%, rgba(214, 158, 46, 0.2) 100%);
  border-color: rgba(236, 201, 75, 0.5);
}

.service-node-preview.order:hover {
  border-color: #ecc94b;
  box-shadow: 0 4px 16px rgba(236, 201, 75, 0.3);
}

.service-node-preview.inventory {
  background: linear-gradient(135deg, rgba(72, 187, 120, 0.2) 0%, rgba(56, 161, 105, 0.2) 100%);
  border-color: rgba(72, 187, 120, 0.5);
}

.service-node-preview.inventory:hover {
  border-color: #48bb78;
  box-shadow: 0 4px 16px rgba(72, 187, 120, 0.3);
}

.service-node-preview.cart {
  background: linear-gradient(135deg, rgba(237, 137, 54, 0.2) 0%, rgba(221, 107, 32, 0.2) 100%);
  border-color: rgba(237, 137, 54, 0.5);
}

.service-node-preview.cart:hover {
  border-color: #ed8936;
  box-shadow: 0 4px 16px rgba(237, 137, 54, 0.3);
}

.service-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.service-info {
  flex: 1;
}

.service-name {
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 2px;
}

.service-desc {
  font-size: 10px;
  color: #a0aec0;
}

.module-count {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: bold;
}

/* 数据库节点预览 */
.db-node-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, rgba(72, 187, 120, 0.2) 0%, rgba(56, 161, 105, 0.2) 100%);
  border-color: rgba(72, 187, 120, 0.5);
}

.db-node-preview:hover {
  border-color: #48bb78;
  box-shadow: 0 4px 16px rgba(72, 187, 120, 0.3);
}

.db-icon {
  font-size: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.db-info {
  flex: 1;
}

.db-type {
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 2px;
}

.db-name {
  font-size: 10px;
  color: #a0aec0;
  font-family: monospace;
}

.db-modules {
  font-size: 10px;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 8px;
}

/* 底部提示 */
.sidebar-footer {
  margin-top: auto;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
}

.tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11px;
  color: #a0aec0;
  line-height: 1.4;
}

.tip span:first-child {
  font-size: 14px;
}

/* 滚动条样式 */
.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
</style>
