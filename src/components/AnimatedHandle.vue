<script setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { computed, inject } from 'vue'

const props = defineProps({
  id: String,
  type: {
    type: String,
    default: 'source',
    validator: (value) => ['source', 'target'].includes(value)
  },
  position: {
    type: String,
    default: Position.Bottom,
    validator: (value) => Object.values(Position).includes(value)
  },
  nodeId: String
})

const { 
  connectionStartHandle, 
  connectionEndHandle
} = useVueFlow()

// 注入父组件提供的验证函数
const validateConnection = inject('validateConnection')

// ========== 连接状态管理 ==========
const isConnecting = computed(() => connectionStartHandle.value !== null)

// 是否正在成为连接目标
const isPotentialTarget = computed(() => {
  if (!isConnecting.value) return false
  if (!connectionEndHandle.value) return false
  return connectionEndHandle.value.nodeId === props.nodeId &&
         connectionEndHandle.value.id === props.id
})

// 当前连接是否合法
const isValidTarget = computed(() => {
  if (!isConnecting.value) return false
  if (!connectionStartHandle.value) return false
  
  return validateConnection({
    source: connectionStartHandle.value.nodeId,
    sourceHandle: connectionStartHandle.value.id,
    target: props.nodeId,
    targetHandle: props.id,
  })
})

// 获取 handle 的样式类
const handleClass = computed(() => {
  const classes = []
  
  if (isConnecting.value) {
    if (isPotentialTarget.value) {
      if (isValidTarget.value) {
        classes.push('connecting-valid')
      } else {
        classes.push('connecting-invalid')
      }
    } else {
      classes.push('connecting')
    }
  }
  
  return classes.join(' ')
})
</script>

<template>
  <Handle 
    :type="type"
    :position="position"
    :id="id"
    :class="handleClass"
    :is-valid-connection="type === 'target' ? validateConnection : undefined"
  />
</template>

<style>
/* AnimatedHandle 组件样式 - 全局生效以作用于 Vue Flow Handle */
.vue-flow__handle {
  width: 16px !important;
  height: 16px !important;
  border-radius: 50% !important;
  border: 3px solid white !important;
  background: #3b82f6 !important;
  opacity: 1 !important;
  z-index: 100 !important;
  transition: all 0.2s ease !important;
}

/* 根据位置调整 */
.vue-flow__handle[data-handlepos="top"] {
  top: -8px !important;
  left: 50% !important;
  margin-left: -8px !important;
}

.vue-flow__handle[data-handlepos="bottom"] {
  bottom: -8px !important;
  left: 50% !important;
  margin-left: -8px !important;
}

.vue-flow__handle[data-handlepos="left"] {
  left: -8px !important;
  top: 50% !important;
  margin-top: -8px !important;
}

.vue-flow__handle[data-handlepos="right"] {
  right: -8px !important;
  top: 50% !important;
  margin-top: -8px !important;
}

/* 连接中状态 - 基础 */
.vue-flow__handle.connecting {
  background: #f59e0b !important;
  animation: handle-pulse 0.6s ease-in-out infinite !important;
}

/* 合法连接目标 - 绿色脉冲 */
.vue-flow__handle.connecting-valid {
  background: #48bb78 !important;
  border-color: #fff !important;
  animation: handle-pulse-valid 0.6s ease-in-out infinite !important;
  box-shadow: 0 0 0 0 rgba(72, 187, 120, 0.5) !important;
}

/* 非法连接目标 - 红色 */
.vue-flow__handle.connecting-invalid {
  background: #f56565 !important;
  border-color: #fff !important;
  animation: handle-shake 0.4s ease-in-out infinite !important;
  cursor: not-allowed !important;
}

/* 脉冲动画 - 连接中 */
@keyframes handle-pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5);
  }
  50% { 
    transform: scale(1.4);
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
}

/* 脉冲动画 - 合法连接 */
@keyframes handle-pulse-valid {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(72, 187, 120, 0.5);
  }
  50% { 
    transform: scale(1.5);
    box-shadow: 0 0 0 12px rgba(72, 187, 120, 0);
  }
}

/* 抖动动画 - 非法连接 */
@keyframes handle-shake {
  0%, 100% { transform: translateX(0) scale(1); }
  25% { transform: translateX(-3px) scale(1); }
  75% { transform: translateX(3px) scale(1); }
}
</style>
