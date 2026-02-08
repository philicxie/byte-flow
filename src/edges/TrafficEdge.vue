<!-- edges/TrafficEdge.vue -->
<script setup>
import { computed } from 'vue'
import { BaseEdge, getBezierPath } from '@vue-flow/core'

const props = defineProps({
  id: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  data: Object
})

const path = computed(() => getBezierPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  sourcePosition: props.sourcePosition,
  targetX: props.targetX,
  targetY: props.targetY,
  targetPosition: props.targetPosition,
  curvature: 0.25
}))

const pathVal = computed(() => path.value[0])
</script>

<template>
  <g class="traffic-edge">
    <!-- 背景管道 -->
    <path
      :d="pathVal"
      fill="none"
      stroke="#1a202c"
      stroke-width="8"
      stroke-linecap="round"
    />
    
    <!-- 流量填充（根据 data.load 动态宽度） -->
    <path
      :d="pathVal"
      fill="none"
      :stroke="data?.load > 80 ? '#f56565' : data?.load > 50 ? '#ecc94b' : '#48bb78'"
      :stroke-width="4 + (data?.load || 0) / 20"
      stroke-linecap="round"
      class="traffic-flow"
    />
    
    <!-- 流动动画层 -->
    <path
      :d="pathVal"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-dasharray="8 8"
      opacity="0.6"
      class="flow-animation"
    />
  </g>
</template>

<style scoped>
.traffic-flow {
  filter: drop-shadow(0 0 4px currentColor);
  transition: all 0.3s;
}

.flow-animation {
  animation: trafficMove 0.5s linear infinite;
}

@keyframes trafficMove {
  to {
    stroke-dashoffset: -16;
  }
}

/* 高负载时加速动画 */
.traffic-edge:has(.traffic-flow[stroke="#f56565"]) .flow-animation {
  animation-duration: 0.2s;
}
</style>