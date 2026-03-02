// useDnD.js
import { useVueFlow } from '@vue-flow/core'
import { ref, watch } from 'vue'

let id = 0

function getId() {
  return `node_${id++}`
}

const state = {
  draggedType: ref(null),
  draggedData: ref(null),  // 新增：存储拖拽时的数据
  isDragOver: ref(false),
  isDragging: ref(false),
}

export default function useDragAndDrop() {
  const { draggedType, draggedData, isDragOver, isDragging } = state
  const { addNodes, addEdges, screenToFlowCoordinate, onNodesInitialized, updateNode } = useVueFlow()

  watch(isDragging, (dragging) => {
    document.body.style.userSelect = dragging ? 'none' : ''
  })

  // 修改：接受额外的数据参数
  function onDragStart(event, type, data = null) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/vueflow', type)
      event.dataTransfer.effectAllowed = 'move'
    }

    draggedType.value = type
    draggedData.value = data  // 保存节点数据
    isDragging.value = true

    document.addEventListener('drop', onDragEnd)
  }

  function onDragOver(event) {
    event.preventDefault()
    if (draggedType.value) {
      isDragOver.value = true
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    }
  }

  function onDragLeave() {
    isDragOver.value = false
  }

  function onDragEnd() {
    isDragging.value = false
    isDragOver.value = false
    draggedType.value = null
    draggedData.value = null  // 清空数据
    document.removeEventListener('drop', onDragEnd)
  }

  function onDrop(event) {
    // 检查是否是蓝图拖拽
    const blueprintData = event.dataTransfer.getData('application/blueprint')
    if (blueprintData) {
      const blueprint = JSON.parse(blueprintData)
      createBlueprintNodes(blueprint, event)
      return
    }

    const position = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY,
    })

    const nodeId = getId()
    
    // 使用拖拽时传递的数据，或生成默认数据
    const nodeData = draggedData.value || { label: nodeId }

    const newNode = {
      id: nodeId,
      type: draggedType.value,
      position,
      data: nodeData,
    }

    // 根据类型设置默认尺寸（用于居中）
    const { off } = onNodesInitialized(() => {
      updateNode(nodeId, (node) => ({
        position: { 
          x: node.position.x - (node.dimensions?.width || 150) / 2, 
          y: node.position.y - (node.dimensions?.height || 80) / 2 
        },
      }))
      off()
    })

    addNodes(newNode)
  }

  // 创建蓝图节点系统
  function createBlueprintNodes(blueprint, event) {
    const dropPosition = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY,
    })

    // 计算蓝图的原始边界框
    const minX = Math.min(...blueprint.nodes.map(n => n.x))
    const minY = Math.min(...blueprint.nodes.map(n => n.y))
    
    // 生成新的节点ID映射
    const idMapping = {}
    const newNodes = []
    
    blueprint.nodes.forEach((node, index) => {
      const newId = getId()
      idMapping[node.id] = newId
      
      // 计算相对位置，使放置点在蓝图中心附近
      const relativeX = node.x - minX
      const relativeY = node.y - minY
      
      newNodes.push({
        id: newId,
        type: node.type,
        position: {
          x: dropPosition.x + relativeX,
          y: dropPosition.y + relativeY - 50, // 稍微上移，让用户拖放位置在中间
        },
        data: { ...node.data }
      })
    })

    // 创建边，使用新的节点ID
    const newEdges = blueprint.edges.map(edge => ({
      id: `edge_${getId()}`,
      source: idMapping[edge.source],
      target: idMapping[edge.target],
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }))

    // 添加节点
    addNodes(newNodes)
    
    // 延迟添加边，确保节点已经创建
    setTimeout(() => {
      addEdges(newEdges)
    }, 50)
  }

  return {
    draggedType,
    draggedData,
    isDragOver,
    isDragging,
    onDragStart,
    onDragLeave,
    onDragOver,
    onDrop,
  }
}