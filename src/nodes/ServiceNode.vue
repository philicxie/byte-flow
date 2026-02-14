<!-- nodes/ServiceNode.vue -->
<script setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { computed, ref, inject } from 'vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const emit = defineEmits(['update:data'])

const { updateNodeData } = useVueFlow()
const simulation = inject('simulation', null)
const isSimulating = computed(() => simulation?.isSimulating?.value || false)

// 编辑态：显示模块编辑器
const showModuleEditor = ref(false)

// 可用模块列表
const availableModules = ['user', 'cart', 'inventory', 'order', 'payment', 'notification']

// 解析模块配置（仅保留 access 权限）
const moduleConfigs = computed(() => {
  const modules = props.data.modules || []
  return modules.map(m => {
    if (typeof m === 'string') {
      // 兼容旧格式
      return { name: m, access: 'rw' }
    }
    return {
      name: m.name,
      access: m.access || 'rw'
    }
  })
})

// 实时状态
const currentLoad = computed(() => props.data.currentLoad || 0)
const capacity = computed(() => props.data.moduleCapacity || 10)
const saturation = computed(() => (currentLoad.value / capacity.value) * 100)
const isOverloaded = computed(() => saturation.value > 90)

// 健康状态
const healthStatus = computed(() => {
  if (isOverloaded.value) return 'critical'
  if (saturation.value > 70) return 'warning'
  return 'healthy'
})

// 是否有错误（用于模拟态显示）
const hasRecentError = computed(() => {
  const lastError = props.data.lastErrorAt
  if (!lastError) return false
  return (Date.now() - lastError) < 2000
})

// 获取访问权限显示
const getAccessLabel = (access) => {
  const labels = { r: '只读', w: '只写', rw: '读写' }
  return labels[access] || access
}

// 获取访问权限颜色
const getAccessColor = (access) => {
  const colors = { r: '#48bb78', w: '#f56565', rw: '#ecc94b' }
  return colors[access] || '#a0aec0'
}

// 打开模块编辑器
const openModuleEditor = () => {
  if (isSimulating.value) return
  showModuleEditor.value = true
}

// 关闭模块编辑器
const closeModuleEditor = () => {
  showModuleEditor.value = false
}

// 添加模块
const addModule = (moduleName) => {
  const currentModules = moduleConfigs.value
  if (currentModules.find(m => m.name === moduleName)) return
  
  const newModules = [...currentModules, { name: moduleName, access: 'rw' }]
  updateNodeData(props.id, { ...props.data, modules: newModules })
}

// 移除模块
const removeModule = (moduleName) => {
  const newModules = moduleConfigs.value.filter(m => m.name !== moduleName)
  updateNodeData(props.id, { ...props.data, modules: newModules })
}

// 切换访问权限
const toggleAccess = (moduleName) => {
  const module = moduleConfigs.value.find(m => m.name === moduleName)
  if (!module) return
  
  const accessOrder = ['r', 'w', 'rw']
  const currentIndex = accessOrder.indexOf(module.access)
  const nextAccess = accessOrder[(currentIndex + 1) % accessOrder.length]
  
  updateModuleAccess(moduleName, nextAccess)
}

// 更新模块权限
const updateModuleAccess = (moduleName, access) => {
  const newModules = moduleConfigs.value.map(m => 
    m.name === moduleName ? { ...m, access } : m
  )
  updateNodeData(props.id, { ...props.data, modules: newModules })
}
</script>

<template>
  <div 
    class="service-node" 
    :class="[
      healthStatus, 
      { 
        selected, 
        simulating: isSimulating,
        overloaded: isOverloaded,
        'has-error': hasRecentError
      }
    ]"
  >
    <!-- 模拟态：负载警告 -->
    <div v-if="isSimulating && isOverloaded" class="overload-alert">
      ⚠️ 过载
    </div>
    
    <!-- 模拟态：错误提示 -->
    <div v-if="isSimulating && hasRecentError" class="error-alert">
      ❌ 500
    </div>
    
    <div class="health-indicator" :class="healthStatus"></div>
    
    <div class="node-header">
      <span class="type-icon">⚙️</span>
      <div class="title-section">
        <input 
          v-if="!isSimulating"
          v-model="data.name"
          class="service-name-input"
          placeholder="服务名称"
          @click.stop
        />
        <span v-else class="service-name">{{ data.name || 'Service' }}</span>
        <span class="module-count-badge">
          {{ moduleConfigs.length }} 模块
        </span>
      </div>
      <div class="load-ring" :style="{ '--saturation': saturation + '%' }">
        <span class="load-value">{{ Math.round(saturation) }}%</span>
      </div>
    </div>
    
    <!-- 模块展示 -->
    <div class="modules-container">
      <div class="section-header">
        <span>部署模块</span>
        <span v-if="isSimulating" class="live-indicator">
          <span class="dot"></span>
          {{ currentLoad }}/{{ capacity }} 请求
        </span>
        <span v-else class="capacity">容量: {{ capacity }}</span>
      </div>
      
      <div class="modules-grid">
        <div 
          v-for="mod in moduleConfigs" 
          :key="mod.name"
          class="module-chip"
          :class="{ 
            'processing': isSimulating && data.activeModules?.[mod.name] > 0,
            'has-error': isSimulating && data.recentErrors?.some(e => e.reason?.includes(mod.name))
          }"
          :style="{ borderColor: getAccessColor(mod.access) }"
          @click="!isSimulating && toggleAccess(mod.name)"
          :title="!isSimulating ? '点击切换权限' : ''"
        >
          <span class="mod-name">{{ mod.name }}</span>
          <span 
            class="mod-access" 
            :style="{ background: getAccessColor(mod.access) }"
          >
            {{ mod.access.toUpperCase() }}
          </span>
        </div>
        
        <!-- 添加模块按钮（编辑态） -->
        <div 
          v-if="!isSimulating" 
          class="module-chip add-module"
          @click="openModuleEditor"
        >
          <span class="add-icon">+</span>
        </div>
      </div>
      
      <!-- 饱和度条 -->
      <div class="saturation-bar">
        <div 
          class="saturation-fill" 
          :class="{ danger: saturation > 80 }"
          :style="{ width: saturation + '%' }"
        ></div>
      </div>
    </div>
    
    <!-- 模拟态：实时指标 -->
    <div v-if="isSimulating" class="sim-metrics">
      <div class="metric-row">
        <span>RPS: {{ Math.round(data.rps || 0) }}</span>
        <span>avg: {{ Math.round(data.avgLatency || 0) }}ms</span>
      </div>
    </div>
    
    <!-- 编辑态：配置面板 -->
    <div v-else class="config-panel">
      <label class="capacity-config">
        模块容量: {{ data.moduleCapacity || 10 }}
        <input 
          type="range" 
          min="1" 
          max="50"
          :value="data.moduleCapacity || 10"
          @input="$emit('update:data', { ...data, moduleCapacity: +$event.target.value })"
          class="nodrag"
        />
      </label>
      <label class="delay-config">
        处理延时: {{ data.processingDelay || 20 }}ms
        <input 
          type="range" 
          min="10" 
          max="200"
          :value="data.processingDelay || 20"
          @input="$emit('update:data', { ...data, processingDelay: +$event.target.value })"
          class="nodrag"
        />
      </label>
    </div>
    
    <!-- 模块编辑器弹窗（编辑态） -->
    <div v-if="showModuleEditor && !isSimulating" class="module-editor-overlay" @click="closeModuleEditor">
      <div class="module-editor" @click.stop>
        <h4>配置模块权限</h4>
        
        <!-- 当前已选模块 -->
        <div class="selected-modules">
          <div 
            v-for="mod in moduleConfigs" 
            :key="mod.name"
            class="module-config-item"
          >
            <span class="mod-name">{{ mod.name }}</span>
            <div class="access-selector">
              <button 
                v-for="access in ['r', 'w', 'rw']"
                :key="access"
                :class="['access-btn', access, { active: mod.access === access }]"
                @click="updateModuleAccess(mod.name, access)"
                :title="getAccessLabel(access)"
              >
                {{ access.toUpperCase() }}
              </button>
            </div>
            <button @click="removeModule(mod.name)" class="remove-btn">×</button>
          </div>
          
          <div v-if="moduleConfigs.length === 0" class="empty-hint">
            暂无模块，请从下方添加
          </div>
        </div>
        
        <!-- 添加新模块 -->
        <div class="add-new-module">
          <span>添加模块:</span>
          <div class="available-modules">
            <button 
              v-for="modName in availableModules.filter(m => !moduleConfigs.find(cm => cm.name === m))"
              :key="modName"
              @click="addModule(modName)"
              class="add-mod-btn"
            >
              {{ modName }}
            </button>
          </div>
        </div>
        
        <button @click="closeModuleEditor" class="close-btn">完成</button>
      </div>
    </div>
    
    <!-- 连接点 -->
    <Handle 
      type="target" 
      :position="Position.Top" 
      id="http-in"
      :style="{ 
        background: '#3b82f6',
        width: '16px',
        height: '16px',
        border: '3px solid white'
      }"
    />
    <Handle 
      type="source" 
      :position="Position.Bottom" 
      id="db-out"
      :style="{ 
        background: '#48bb78',
        width: '16px',
        height: '16px',
        border: '3px solid white'
      }"
    />
  </div>
</template>

<style scoped>
.service-node {
  background: #2d3748;
  border-radius: 16px;
  padding: 16px;
  min-width: 260px;
  color: white;
  position: relative;
  border: 3px solid transparent;
  transition: all 0.3s;
}

.service-node.selected {
  border-color: #ffd700;
}

.service-node.simulating {
  box-shadow: 0 0 30px rgba(0,0,0,0.5);
}

.service-node.overloaded {
  animation: shake 0.5s infinite;
  border-color: #f56565;
}

.service-node.has-error {
  border-color: #f56565;
  box-shadow: 0 0 20px rgba(245, 101, 101, 0.4);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.overload-alert,
.error-alert {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  animation: alert-blink 1s infinite;
  z-index: 10;
}

.overload-alert {
  background: #ecc94b;
  color: #744210;
}

.error-alert {
  background: #f56565;
  color: white;
}

@keyframes alert-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-name-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid #4a5568;
  border-radius: 4px;
  padding: 4px 8px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  width: 100%;
}

.service-name-input:focus {
  outline: none;
  border-color: #4299e1;
}

.service-name {
  font-weight: bold;
  font-size: 14px;
}

.module-count-badge {
  font-size: 10px;
  background: rgba(66, 153, 225, 0.3);
  color: #4299e1;
  padding: 2px 8px;
  border-radius: 12px;
  width: fit-content;
}

.load-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: conic-gradient(
    #48bb78 calc(var(--saturation) * 1%),
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

.modules-container {
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

.modules-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.module-chip {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid #4a5568;
  border-radius: 8px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 60px;
  position: relative;
  transition: all 0.2s;
}

.module-chip:hover:not(.add-module) {
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
}

.module-chip.processing {
  animation: module-process 0.5s ease;
}

.module-chip.has-error {
  border-color: #f56565;
  background: rgba(245, 101, 101, 0.2);
}

@keyframes module-process {
  0% { background: rgba(255, 255, 255, 0.1); }
  50% { background: rgba(72, 187, 120, 0.3); }
  100% { background: rgba(255, 255, 255, 0.1); }
}

.module-chip.add-module {
  background: transparent;
  border-style: dashed;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  min-width: 50px;
  min-height: 50px;
}

.module-chip.add-module:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: #4299e1;
}

.add-icon {
  font-size: 20px;
  color: #a0aec0;
}

.mod-name {
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.mod-access {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  width: fit-content;
}

.saturation-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 12px;
  overflow: hidden;
}

.saturation-fill {
  height: 100%;
  background: #48bb78;
  transition: width 0.3s;
}

.saturation-fill.danger {
  background: #f56565;
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
  justify-content: space-between;
}

.metric-row {
  display: flex;
  gap: 16px;
  width: 100%;
}

.config-panel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.capacity-config,
.delay-config {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-panel input[type="range"] {
  width: 100%;
  accent-color: #4299e1;
}

/* 模块编辑器弹窗 */
.module-editor-overlay {
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

.module-editor {
  background: #2d3748;
  border-radius: 16px;
  padding: 24px;
  min-width: 360px;
  max-width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.module-editor h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #e2e8f0;
}

.selected-modules {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.module-config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
}

.module-config-item .mod-name {
  font-size: 14px;
  font-weight: bold;
  min-width: 80px;
  text-transform: capitalize;
}

.access-selector {
  display: flex;
  gap: 6px;
  flex: 1;
}

.access-btn {
  flex: 1;
  padding: 8px;
  border: 2px solid #4a5568;
  background: transparent;
  color: #a0aec0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s;
}

.access-btn:hover {
  border-color: #718096;
  color: #e2e8f0;
}

.access-btn.r.active {
  background: rgba(72, 187, 120, 0.3);
  border-color: #48bb78;
  color: #48bb78;
}

.access-btn.w.active {
  background: rgba(245, 101, 101, 0.3);
  border-color: #f56565;
  color: #f56565;
}

.access-btn.rw.active {
  background: rgba(236, 201, 75, 0.3);
  border-color: #ecc94b;
  color: #ecc94b;
}

.remove-btn {
  background: #f56565;
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: #e53e3e;
}

.empty-hint {
  text-align: center;
  color: #718096;
  font-size: 13px;
  padding: 20px;
  font-style: italic;
}

.add-new-module {
  border-top: 1px solid #4a5568;
  padding-top: 16px;
  margin-bottom: 16px;
}

.add-new-module > span {
  display: block;
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 12px;
}

.available-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.add-mod-btn {
  background: rgba(66, 153, 225, 0.2);
  border: 1px solid #4299e1;
  color: #4299e1;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  text-transform: capitalize;
  transition: all 0.2s;
}

.add-mod-btn:hover {
  background: rgba(66, 153, 225, 0.3);
}

.close-btn {
  width: 100%;
  padding: 12px;
  background: #4299e1;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
}

.close-btn:hover {
  background: #3182ce;
}
</style>
