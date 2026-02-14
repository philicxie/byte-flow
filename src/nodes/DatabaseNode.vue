<!-- nodes/DatabaseNode.vue -->
<script setup>
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

// 按模块分片显示
const moduleShards = computed(() => {
  return props.data.shards || [
    { module: 'user', records: 15000 },
    { module: 'order', records: 45000 },
    { module: 'payment', records: 12000 }
  ]
})

// 总QPS计算
const totalQps = computed(() => {
  return Object.values(props.data.moduleQps || {}).reduce((a, b) => a + b, 0)
})
</script>

<template>
  <div class="db-node" :class="{ selected }">
    <div class="db-cylinder">
      <div class="db-top">
        <span class="db-icon">🗄️</span>
        <span class="db-type">{{ data.type || 'PostgreSQL' }}</span>
      </div>
      
      <div class="db-body">
        <div class="db-header">
          <span class="db-name">{{ data.name || 'db-cluster' }}</span>
          <span class="qps-badge">{{ totalQps }} QPS</span>
        </div>
        
        <!-- 模块分片可视化 -->
        <div class="shards-section">
          <div class="section-title">模块数据分片</div>
          <div class="shard-list">
            <div 
              v-for="shard in moduleShards" 
              :key="shard.module"
              class="shard-item"
            >
              <div class="shard-info">
                <span class="shard-mod">{{ shard.module }}</span>
                <span class="shard-count">{{ shard.records?.toLocaleString() }} 条</span>
              </div>
              <div class="shard-bar">
                <div 
                  class="shard-fill" 
                  :style="{ width: Math.min(100, shard.records / 500) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 模块QPS热力图 -->
        <div class="qps-heatmap">
          <div class="section-title">模块访问热度</div>
          <div class="heat-grid">
            <div 
              v-for="(qps, mod) in (data.moduleQps || {})" 
              :key="mod"
              class="heat-cell"
              :style="{ 
                background: `rgba(245, 101, 101, ${Math.min(1, qps / 1000)})`,
                color: qps > 500 ? 'white' : '#2d3748'
              }"
            >
              <span class="heat-mod">{{ mod }}</span>
              <span class="heat-val">{{ qps }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="db-bottom"></div>
    </div>
    
    <!-- 多个输入连接点，对应不同服务 -->
    <Handle 
      v-for="(mod, idx) in (data.modules || ['default'])" 
      :key="mod"
      type="target" 
      :position="Position.Top"
      :id="`db-${mod}`"
      :style="{ 
        left: `${20 + (idx * 60)}px`,
        background: '#9f7aea',
        width: '16px',
        height: '16px',
        border: '3px solid white'
      }"
    />
  </div>
</template>

<style scoped>
.db-node {
  position: relative;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));
}
.db-node.selected .db-body {
  border-color: #ffd700;
  box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.3);
}
.db-cylinder {
  width: 280px;
}
.db-top, .db-bottom {
  height: 24px;
  background: linear-gradient(135deg, #553c9a 0%, #44337a 100%);
  border-radius: 50%;
  border: 2px solid #6b46c1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.db-top {
  margin-bottom: -12px;
  position: relative;
  z-index: 2;
  background: linear-gradient(135deg, #805ad5 0%, #6b46c1 100%);
  color: white;
  font-weight: bold;
  font-size: 14px;
}
.db-icon { font-size: 16px; }
.db-body {
  background: linear-gradient(135deg, #44337a 0%, #2d3748 100%);
  padding: 20px 16px 16px;
  border-left: 2px solid #6b46c1;
  border-right: 2px solid #6b46c1;
  color: white;
  position: relative;
  z-index: 1;
  border-radius: 4px;
}
.db-bottom {
  margin-top: -12px;
  position: relative;
  z-index: 0;
}
.db-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.db-name {
  font-weight: bold;
  font-size: 16px;
  font-family: monospace;
}
.qps-badge {
  background: rgba(255,255,255,0.15);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}
.section-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 10px;
  letter-spacing: 0.5px;
}
.shards-section {
  margin-bottom: 16px;
}
.shard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shard-item {
  background: rgba(0,0,0,0.2);
  padding: 10px;
  border-radius: 8px;
}
.shard-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
}
.shard-mod {
  font-weight: bold;
  color: #b794f4;
}
.shard-count {
  opacity: 0.8;
  font-size: 11px;
}
.shard-bar {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}
.shard-fill {
  height: 100%;
  background: linear-gradient(90deg, #9f7aea, #b794f4);
  transition: width 0.3s;
}
.qps-heatmap {
  margin-top: 12px;
}
.heat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
  gap: 6px;
}
.heat-cell {
  padding: 8px;
  border-radius: 6px;
  text-align: center;
  transition: all 0.3s;
  border: 1px solid rgba(255,255,255,0.1);
}
.heat-mod {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  margin-bottom: 2px;
  opacity: 0.9;
}
.heat-val {
  display: block;
  font-size: 14px;
  font-weight: bold;
}
</style>