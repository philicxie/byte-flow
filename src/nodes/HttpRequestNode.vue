<!-- nodes/HttpRequestNode.vue -->
<script setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { ref, computed, watch, inject } from 'vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const { updateNodeData } = useVueFlow()
const simulation = inject('simulation', null)
const isSimulating = computed(() => simulation?.isSimulating?.value || false)

// 可用模块列表
const availableModules = ['user', 'cart', 'inventory', 'order', 'payment', 'notification']

// 编辑态：显示模块编辑器
const showModuleEditor = ref(false)

// 解析模块访问配置
const moduleAccess = computed(() => {
  if (props.data.moduleAccess && Array.isArray(props.data.moduleAccess)) {
    return props.data.moduleAccess
  }
  // 兼容旧格式
  const modules = props.data.modules || []
  return modules.map(name => ({ name, readRatio: 100 }))
})

// 获取所有需要的模块名称
const requiredModuleNames = computed(() => moduleAccess.value.map(m => m.name))

// 计算复杂度颜色
const complexityColor = computed(() => {
  const count = requiredModuleNames.value.length
  if (count <= 1) return '#48bb78'
  if (count <= 3) return '#ecc94b'
  return '#f56565'
})

// 实时状态（模拟态）
const isProcessing = computed(() => (props.data.currentLoad || 0) > 0)
const rps = computed(() => Math.round(props.data.rps || 0))
const avgLatency = computed(() => Math.round(props.data.avgLatency || 0))

// 脉冲动画触发
const pulseActive = ref(false)
watch(() => props.data.currentLoad, (newVal, oldVal) => {
  if (newVal > oldVal) {
    pulseActive.value = true
    setTimeout(() => pulseActive.value = false, 300)
  }
})

// 获取操作类型标签
const getOperationLabel = (readRatio) => {
  if (readRatio >= 80) return '读'
  if (readRatio <= 20) return '写'
  return `${readRatio}%读`
}

// 获取操作类型颜色
const getOperationColor = (readRatio) => {
  if (readRatio >= 80) return '#48bb78'
  if (readRatio <= 20) return '#f56565'
  return '#ecc94b'
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

// 添加模块访问
const addModuleAccess = (moduleName) => {
  const current = moduleAccess.value
  if (current.find(m => m.name === moduleName)) return
  
  const newModuleAccess = [...current, { name: moduleName, readRatio: 100 }]
  updateModuleData(newModuleAccess)
}

// 移除模块访问
const removeModuleAccess = (moduleName) => {
  const newModuleAccess = moduleAccess.value.filter(m => m.name !== moduleName)
  updateModuleData(newModuleAccess)
}

// 更新读写比例
const updateReadRatio = (moduleName, ratio) => {
  const newModuleAccess = moduleAccess.value.map(m => 
    m.name === moduleName ? { ...m, readRatio: ratio } : m
  )
  updateModuleData(newModuleAccess)
}

// 切换纯读/纯写
const toggleOperation = (moduleName) => {
  const mod = moduleAccess.value.find(m => m.name === moduleName)
  if (!mod) return
  
  let newRatio
  if (mod.readRatio >= 80) {
    newRatio = 0
  } else if (mod.readRatio <= 20) {
    newRatio = 100
  } else {
    newRatio = 100
  }
  
  updateReadRatio(moduleName, newRatio)
}

// 统一更新模块数据
const updateModuleData = (newModuleAccess) => {
  updateNodeData(props.id, { 
    ...props.data, 
    moduleAccess: newModuleAccess,
    modules: newModuleAccess.map(m => m.name)
  })
}
</script>

<template>
  <div 
    class="http-node" 
    :class="{ 
      selected, 
      'simulating': isSimulating,
      'processing': isProcessing,
      'pulse': pulseActive
    }"
  > 
    <div class="node-header">
      <span class="icon">🌐</span>
      <span>HTTP 请求</span>
      <span class="complexity-badge" :style="{ background: complexityColor }">
        {{ requiredModuleNames.length }} 模块
      </span>
    </div>
    
    <div class="node-body">
      <!-- 模块访问标签 -->
      <div class="modules-section">
        <div class="section-header">
          <span class="section-title">访问模块 & 读写比例:</span>
          <button 
            v-if="!isSimulating" 
            class="edit-modules-btn"
            @click="openModuleEditor"
          >
            编辑
          </button>
        </div>
        <div class="module-tags">
          <div 
            v-for="mod in moduleAccess" 
            :key="mod.name"
            class="module-tag"
            :class="{ 'processing': isSimulating && data.activeModules?.[mod.name] > 0 }"
            :style="{ borderColor: getOperationColor(mod.readRatio) }"
            @click="!isSimulating && toggleOperation(mod.name)"
            :title="`点击切换: ${mod.readRatio}%读, ${100 - mod.readRatio}%写`"
          >
            <span class="mod-name">{{ mod.name }}</span>
            <span 
              class="mod-operation" 
              :style="{ background: getOperationColor(mod.readRatio) }"
            >
              {{ getOperationLabel(mod.readRatio) }}
            </span>
          </div>
          
          <!-- 编辑态添加按钮 -->
          <button 
            v-if="!isSimulating" 
            class="add-module-btn"
            @click="openModuleEditor"
          >
            +
          </button>
        </div>
      </div>
      
      <!-- 模拟态实时指标 -->
      <div v-if="isSimulating" class="metrics-panel">
        <div class="metric">
          <span class="metric-label">RPS</span>
          <span class="metric-value" :class="{ high: rps > 50 }">{{ rps }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">延时</span>
          <span class="metric-value" :class="{ high: avgLatency > 200 }">
            {{ avgLatency }}ms
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">状态码</span>
          <span 
            class="metric-value status-code"
            :class="{ 
              'status-success': (data.lastRequestStatus || 200) < 400,
              'status-4xx': (data.lastRequestStatus || 200) >= 400 && (data.lastRequestStatus || 200) < 500,
              'status-5xx': (data.lastRequestStatus || 200) >= 500
            }"
          >
            {{ data.lastRequestStatus || '-' }}
          </span>
        </div>
      </div>
      
    </div>
    
    <!-- 模块编辑器弹窗（编辑态） -->
    <div v-if="showModuleEditor && !isSimulating" class="module-editor-overlay" @click="closeModuleEditor">
      <div class="module-editor" @click.stop>
        <h4>配置请求模块</h4>
        <p class="editor-hint">选择模块并设置读写比例</p>
        
        <!-- 当前已选模块 -->
        <div class="selected-modules">
          <div 
            v-for="mod in moduleAccess" 
            :key="mod.name"
            class="module-config-item"
          >
            <span class="mod-name">{{ mod.name }}</span>
            
            <div class="ratio-control">
              <div class="ratio-labels">
                <span class="read-label">读 {{ mod.readRatio }}%</span>
                <span class="write-label">写 {{ 100 - mod.readRatio }}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100"
                :value="mod.readRatio"
                @input="updateReadRatio(mod.name, +$event.target.value)"
                class="ratio-slider nodrag"
              />
              <div class="ratio-hints">
                <button @click="updateReadRatio(mod.name, 100)" class="hint-btn read">纯读</button>
                <button @click="updateReadRatio(mod.name, 50)" class="hint-btn">均衡</button>
                <button @click="updateReadRatio(mod.name, 0)" class="hint-btn write">纯写</button>
              </div>
            </div>
            
            <button @click="removeModuleAccess(mod.name)" class="remove-btn">×</button>
          </div>
          
          <div v-if="moduleAccess.length === 0" class="empty-hint">
            暂无模块，请从下方添加
          </div>
        </div>
        
        <!-- 添加新模块 -->
        <div class="add-new-module">
          <span>添加模块:</span>
          <div class="available-modules">
            <button 
              v-for="modName in availableModules.filter(m => !moduleAccess.find(ma => ma.name === m))"
              :key="modName"
              @click="addModuleAccess(modName)"
              class="add-mod-btn"
            >
              {{ modName }}
            </button>
          </div>
        </div>
        
        <button @click="closeModuleEditor" class="close-btn">完成</button>
      </div>
    </div>
    
    <Handle 
      type="source" 
      :position="Position.Bottom"
      :style="{ 
        background: isProcessing ? '#48bb78' : complexityColor,
        width: '16px',
        height: '16px',
        border: '3px solid white'
      }"
    />
  </div>
</template>

<style scoped>
.http-node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  min-width: 200px;
  max-width: 260px;
  color: white;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  border: 2px solid transparent;
  transition: all 0.3s;
  position: relative;
  overflow: visible;
}

.http-node.selected {
  border-color: #ffd700;
}

.http-node.simulating {
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
}

.http-node.processing {
  animation: processing-glow 1s ease-in-out infinite alternate;
}

@keyframes processing-glow {
  from { box-shadow: 0 0 10px rgba(72, 187, 120, 0.5); }
  to { box-shadow: 0 0 30px rgba(72, 187, 120, 0.8); }
}

.http-node.pulse {
  animation: pulse-scale 0.3s ease;
}

@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* 模拟徽章 */
.sim-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.3);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sim-badge.active {
  background: rgba(72, 187, 120, 0.3);
  color: #48bb78;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  margin-bottom: 12px;
  font-size: 14px;
}

.icon {
  font-size: 18px;
}

.complexity-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: auto;
}

.node-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 模块区域 */
.modules-section {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  font-size: 11px;
  opacity: 0.8;
  text-transform: uppercase;
}

.edit-modules-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
}

.edit-modules-btn:hover {
  background: rgba(255,255,255,0.3);
}

.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.module-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.15);
  border: 2px solid #4a5568;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.module-tag:hover {
  background: rgba(255,255,255,0.25);
}

.module-tag.processing {
  animation: tag-process 0.5s ease;
}

@keyframes tag-process {
  0% { background: rgba(255,255,255,0.15); }
  50% { background: rgba(72, 187, 120, 0.4); }
  100% { background: rgba(255,255,255,0.15); }
}

.mod-name {
  font-weight: 600;
  text-transform: capitalize;
}

.mod-operation {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}

.add-module-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 2px dashed rgba(255,255,255,0.3);
  background: transparent;
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-module-btn:hover {
  border-color: rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.1);
}

/* 指标面板 */
.metrics-panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.2);
}

.metric {
  text-align: center;
  background: rgba(0,0,0,0.2);
  padding: 6px;
  border-radius: 6px;
}

.metric-label {
  display: block;
  font-size: 9px;
  opacity: 0.8;
  text-transform: uppercase;
}

.metric-value {
  display: block;
  font-size: 14px;
  font-weight: bold;
  margin-top: 2px;
}

.metric-value.high {
  color: #ffd700;
  animation: alert-pulse 1s infinite;
}

.metric-value.status-code {
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.metric-value.status-success {
  background: rgba(72, 187, 120, 0.3);
  color: #48bb78;
}

.metric-value.status-4xx {
  background: rgba(237, 137, 54, 0.3);
  color: #ed8936;
}

.metric-value.status-5xx {
  background: rgba(245, 101, 101, 0.3);
  color: #f56565;
}

/* 错误指示器 */
.error-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 101, 101, 0.2);
  border: 1px solid rgba(245, 101, 101, 0.3);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  color: #f56565;
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.error-icon {
  font-size: 14px;
}

.error-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes alert-pulse {
  0%, 100% { color: #ffd700; }
  50% { color: #ffed4a; }
}

/* 提示面板 */
.hint-panel {
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.2);
  font-size: 11px;
  color: rgba(255,255,255,0.7);
  text-align: center;
}

.hint-text {
  display: block;
  line-height: 1.4;
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
  min-width: 380px;
  max-width: 440px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.module-editor h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #e2e8f0;
}

.editor-hint {
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 16px;
}

.selected-modules {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
  max-height: 280px;
  overflow-y: auto;
}

.module-config-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
}

.module-config-item .mod-name {
  font-size: 14px;
  font-weight: bold;
  min-width: 70px;
  text-transform: capitalize;
  color: #e2e8f0;
  padding-top: 4px;
}

.ratio-control {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ratio-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.read-label {
  color: #48bb78;
  font-weight: bold;
}

.write-label {
  color: #f56565;
  font-weight: bold;
}

.ratio-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(90deg, #48bb78 0%, #f56565 100%);
  border-radius: 3px;
  outline: none;
}

.ratio-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.ratio-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.ratio-hints {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.hint-btn {
  padding: 4px 12px;
  border: 1px solid #4a5568;
  background: transparent;
  color: #a0aec0;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.hint-btn:hover {
  border-color: #718096;
  color: #e2e8f0;
}

.hint-btn.read:hover {
  background: rgba(72, 187, 120, 0.2);
  border-color: #48bb78;
  color: #48bb78;
}

.hint-btn.write:hover {
  background: rgba(245, 101, 101, 0.2);
  border-color: #f56565;
  color: #f56565;
}

.remove-btn {
  background: #f56565;
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
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
