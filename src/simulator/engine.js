// composables/useSimulation.js
import { ref, computed, watch } from 'vue'
import { useVueFlow } from '@vue-flow/core'

export function useSimulation() {
  const { getNodes, getEdges, updateNodeData, findNode } = useVueFlow()
  
  // 模拟状态
  const isSimulating = ref(false)
  const simulationSpeed = ref(1) // 1x, 2x, 5x
  const globalTime = ref(0) // 模拟时钟(ms)
  const activeRequests = ref([]) // 进行中的请求
  
  // 统计指标
  const metrics = ref({
    totalRequests: 0,
    avgLatency: 0,
    errorRate: 0,
    throughput: 0
  })
  
  let simulationTimer = null
  let requestGenerator = null
  
  // 开始模拟
  const startSimulation = () => {
    isSimulating.value = true
    globalTime.value = 0
    
    // 模拟时钟推进
    simulationTimer = setInterval(() => {
      globalTime.value += 100 * simulationSpeed.value
      processSimulationTick()
    }, 100)
    
    // 生成HTTP请求（从所有HTTP节点）
    requestGenerator = setInterval(() => {
      generateHttpRequests()
    }, 1000 / simulationSpeed.value)
  }
  
  // 停止模拟
  const stopSimulation = () => {
    console.log('click stop simul')
    isSimulating.value = false
    clearInterval(simulationTimer)
    clearInterval(requestGenerator)
    activeRequests.value = []
  }
  
  // 生成HTTP请求
  const generateHttpRequests = () => {
    const httpNodes = getNodes.value.filter(n => n.type === 'http')
    
    httpNodes.forEach(node => {
      const request = {
        id: `req_${Date.now()}_${Math.random()}`,
        sourceNodeId: node.id,
        path: node.data.path,
        requiredModules: node.data.modules || [],
        timestamp: globalTime.value,
        latency: 0,
        path: [node.id] // 请求经过的节点路径
      }
      
      activeRequests.value.push(request)
      propagateRequest(request, node.id)
    })
  }
  
  // 传播请求到下一个节点
  const propagateRequest = (request, currentNodeId) => {
    const currentNode = findNode(currentNodeId)
    if (!currentNode) return
    
    // 1. 处理当前节点（处理延时）
    const processingDelay = calculateProcessingDelay(currentNode, request)
    
    // 2. 更新节点状态（增加负载）
    updateNodeLoad(currentNodeId, 1)
    
    // 3. 找到下游连接
    const outgoingEdges = getEdges.value.filter(e => e.source === currentNodeId)
    
    setTimeout(() => {
      // 处理完成，减少负载
      updateNodeLoad(currentNodeId, -1)
      
      if (outgoingEdges.length === 0) {
        // 到达终点（数据库或响应），完成请求
        completeRequest(request)
        return
      }
      
      // 传播到下游节点
      outgoingEdges.forEach(edge => {
        const networkDelay = edge.data?.networkLatency || 50 // 默认50ms
        
        // 更新请求状态
        request.latency += processingDelay + networkDelay
        request.path.push(edge.target)
        
        // 网络传输延时
        setTimeout(() => {
          propagateRequest(request, edge.target)
        }, networkDelay / simulationSpeed.value)
      })
      
    }, processingDelay / simulationSpeed.value)
  }
  
  // 计算处理延时
  const calculateProcessingDelay = (node, request) => {
    const baseDelay = node.data?.processingDelay || 10
    
    switch (node.type) {
      case 'http':
        // HTTP节点：解析请求开销
        return baseDelay + (request.requiredModules.length * 5)
        
      case 'service': {
        // 服务节点：根据模块匹配度和负载计算
        const modules = node.data?.modules || []
        const matchedModules = request.requiredModules.filter(m => 
          modules.includes(m)
        )
        const matchRate = matchedModules.length / request.requiredModules.length
        
        // 如果服务不包含所需模块，需要转发（额外延时）
        const forwardingDelay = matchRate < 1 ? 20 : 0
        
        // 负载影响：高负载增加处理延时
        const loadFactor = 1 + ((node.data?.load || 0) / 100)
        
        return (baseDelay + forwardingDelay) * loadFactor
      }
        
      case 'database': {
        // 数据库：根据模块分片计算
        const moduleQps = node.data?.moduleQps || {}
        const targetModule = request.requiredModules[0] // 简化：取第一个模块
        const qps = moduleQps[targetModule] || 100
        
        // QPS越高，单请求处理越快（批量优化），但存在基础延时
        return baseDelay + (1000 / qps)
      }
        
      default:
        return baseDelay
    }
  }
  
  // 更新节点负载
  const updateNodeLoad = (nodeId, delta) => {
    const node = findNode(nodeId)
    if (!node) return
    
    const currentLoad = node.data?.currentLoad || 0
    const capacity = node.data?.moduleCapacity || 10
    const newLoad = Math.max(0, currentLoad + delta)
    
    updateNodeData(nodeId, {
      ...node.data,
      currentLoad: newLoad,
      load: (newLoad / capacity) * 100 // 百分比
    })
  }
  
  // 完成请求
  const completeRequest = (request) => {
    const index = activeRequests.value.findIndex(r => r.id === request.id)
    if (index > -1) {
      activeRequests.value.splice(index, 1)
    }
    
    // 更新统计
    metrics.value.totalRequests++
    const totalLatency = metrics.value.avgLatency * (metrics.value.totalRequests - 1) + request.latency
    metrics.value.avgLatency = totalLatency / metrics.value.totalRequests
    
    // 记录到节点历史
    const lastNode = findNode(request.path[request.path.length - 1])
    if (lastNode) {
      const history = lastNode.data?.requestHistory || []
      history.push({
        timestamp: globalTime.value,
        latency: request.latency,
        path: request.path
      })
      // 只保留最近100条
      if (history.length > 100) history.shift()
      
      updateNodeData(lastNode.id, {
        ...lastNode.data,
        requestHistory: history,
        lastRequestLatency: request.latency
      })
    }
  }
  
  // 处理模拟时钟滴答（更新统计、清理等）
  const processSimulationTick = () => {
    // 计算吞吐量（最近1秒的请求数）
    const recentRequests = activeRequests.value.filter(r => 
      globalTime.value - r.timestamp < 1000
    )
    metrics.value.throughput = recentRequests.length
    
    // 更新所有节点的实时指标
    getNodes.value.forEach(node => {
      const history = node.data?.requestHistory || []
      const recentHistory = history.filter(h => 
        globalTime.value - h.timestamp < 5000 // 最近5秒
      )
      
      if (recentHistory.length > 0) {
        const avgLatency = recentHistory.reduce((a, b) => a + b.latency, 0) / recentHistory.length
        updateNodeData(node.id, {
          ...node.data,
          avgLatency: Math.round(avgLatency),
          rps: recentHistory.length / 5
        })
      }
    })
  }
  
  // 设置边的网络延时
  const setEdgeLatency = (edgeId, latency) => {
    // 通过更新边数据实现
    const edges = getEdges.value
    const edge = edges.find(e => e.id === edgeId)
    if (edge) {
      edge.data = { ...edge.data, networkLatency: latency }
    }
  }
  
  // 设置节点处理延时
  const setNodeProcessingDelay = (nodeId, delay) => {
    const node = findNode(nodeId)
    if (node) {
      updateNodeData(nodeId, {
        ...node.data,
        processingDelay: delay
      })
    }
  }
  
  return {
    isSimulating,
    simulationSpeed,
    globalTime,
    activeRequests,
    metrics,
    startSimulation,
    stopSimulation,
    setEdgeLatency,
    setNodeProcessingDelay
  }
}