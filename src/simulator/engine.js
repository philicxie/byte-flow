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
    totalErrors: 0,
    avgLatency: 0,
    errorRate: 0,
    throughput: 0,
    errorLog: [] // 错误日志，用于调试
  })
  
  let simulationTimer = null
  let requestGenerator = null
  
  // 开始模拟
  const startSimulation = () => {
    isSimulating.value = true
    globalTime.value = 0
    
    // 重置错误统计
    metrics.value.totalErrors = 0
    metrics.value.errorLog = []
    
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
      // 解析模块访问需求（兼容新旧格式）
      const moduleAccess = parseModuleAccess(node.data)
      
      const request = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceNodeId: node.id,
        path: node.data.path,
        moduleAccess: moduleAccess,  // 新的格式: [{name, operation}]
        requiredModules: moduleAccess.map(m => m.name), // 兼容旧格式
        timestamp: globalTime.value,
        latency: 0,
        path: [node.id], // 请求经过的节点路径
        status: 'pending', // pending, success, error
        errorReason: null
      }
      
      activeRequests.value.push(request)
      propagateRequest(request, node.id)
    })
  }
  
  // 解析模块访问配置（兼容新旧格式）
  const parseModuleAccess = (data) => {
    // 优先使用新的 moduleAccess 格式（包含 readRatio）
    if (data.moduleAccess && Array.isArray(data.moduleAccess)) {
      return data.moduleAccess
    }
    // 兼容旧格式：将字符串数组转换为新格式
    const modules = data.modules || []
    const defaultRatio = data.method === 'GET' ? 100 : 50
    return modules.map(name => ({
      name,
      readRatio: defaultRatio
    }))
  }
  
  // 解析服务节点的模块配置
  const parseServiceModules = (nodeData) => {
    const modules = nodeData.modules || []
    return modules.map(m => {
      if (typeof m === 'string') {
        // 兼容旧格式
        return { name: m, access: 'rw', readWriteRatio: 80 }
      }
      return {
        name: m.name,
        access: m.access || 'rw',
        readWriteRatio: m.readWriteRatio ?? 80
      }
    })
  }
  
  // 检查服务是否支持请求的模块访问
  const checkModuleAccess = (serviceNode, request) => {
    const serviceModules = parseServiceModules(serviceNode.data)
    const requestAccess = request.moduleAccess || []
    
    const errors = []
    
    for (const req of requestAccess) {
      const serviceMod = serviceModules.find(m => m.name === req.name)
      
      if (!serviceMod) {
        // 服务不包含该模块
        errors.push({
          module: req.name,
          readRatio: req.readRatio,
          reason: `模块 '${req.name}' 未部署`
        })
        continue
      }
      
      // 根据 readRatio 判断需要的权限
      // readRatio: 0-100，表示读操作的比例
      // readRatio = 100: 纯读，需要读权限
      // readRatio = 0: 纯写，需要写权限
      // 0 < readRatio < 100: 混合，根据阈值判断
      const readRatio = req.readRatio ?? 100
      const serviceAccess = serviceMod.access
      
      // 检查服务是否支持所需操作
      // serviceAccess: 'r'只读, 'w'只写, 'rw'读写
      const canRead = serviceAccess.includes('r')
      const canWrite = serviceAccess.includes('w')
      
      // 判断请求需要什么权限
      const needsRead = readRatio > 0
      const needsWrite = readRatio < 100
      
      if (needsRead && !canRead) {
        errors.push({
          module: req.name,
          readRatio,
          reason: `模块 '${req.name}' 配置为只写，无法读取 (${readRatio}%读)`
        })
      }
      
      if (needsWrite && !canWrite) {
        errors.push({
          module: req.name,
          readRatio,
          reason: `模块 '${req.name}' 配置为只读，无法写入 (${100 - readRatio}%写)`
        })
      }
    }
    
    return {
      success: errors.length === 0,
      errors,
      matchedModules: requestAccess.filter(req => 
        serviceModules.some(m => m.name === req.name)
      ).length
    }
  }
  
  // 传播请求到下一个节点
  const propagateRequest = (request, currentNodeId) => {
    const currentNode = findNode(currentNodeId)
    if (!currentNode) return
    
    // 1. 如果是服务节点，检查模块访问权限
    if (currentNode.type === 'service') {
      const accessCheck = checkModuleAccess(currentNode, request)
      
      if (!accessCheck.success) {
        // 触发 500 错误
        handleRequestError(request, {
          nodeId: currentNodeId,
          nodeName: currentNode.data.name || 'Unknown Service',
          errors: accessCheck.errors
        })
        return
      }
      
      // 记录请求在该节点上活跃的模块（用于UI显示）
      updateNodeActiveModules(currentNodeId, request.moduleAccess)
    }
    
    // 2. 处理当前节点（处理延时）
    const processingDelay = calculateProcessingDelay(currentNode, request)
    
    // 3. 更新节点状态（增加负载）
    updateNodeLoad(currentNodeId, 1)
    
    // 4. 找到下游连接
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
  
  // 处理请求错误（500错误）
  const handleRequestError = (request, errorInfo) => {
    request.status = 'error'
    request.errorReason = errorInfo
    
    // 记录到错误日志
    const errorRecord = {
      id: request.id,
      timestamp: globalTime.value,
      path: request.path,
      failedAt: errorInfo.nodeName,
      errors: errorInfo.errors
    }
    
    metrics.value.errorLog.unshift(errorRecord)
    if (metrics.value.errorLog.length > 50) {
      metrics.value.errorLog.pop()
    }
    
    // 更新统计
    metrics.value.totalErrors++
    
    // 标记节点有错误（用于UI显示）
    const node = findNode(request.path[request.path.length - 1])
    if (node) {
      const currentErrors = node.data.recentErrors || []
      currentErrors.unshift({
        timestamp: globalTime.value,
        requestId: request.id,
        reason: errorInfo.errors[0]?.reason
      })
      if (currentErrors.length > 5) currentErrors.pop()
      
      updateNodeData(node.id, {
        ...node.data,
        recentErrors: currentErrors,
        lastErrorAt: globalTime.value
      })
      
      // 2秒后清除错误标记
      setTimeout(() => {
        const freshNode = findNode(node.id)
        if (freshNode && freshNode.data.lastErrorAt === globalTime.value) {
          updateNodeData(node.id, {
            ...freshNode.data,
            lastErrorAt: null
          })
        }
      }, 2000 / simulationSpeed.value)
    }
    
    // 从活跃请求中移除
    const index = activeRequests.value.findIndex(r => r.id === request.id)
    if (index > -1) {
      activeRequests.value.splice(index, 1)
    }
    
    // 更新错误率统计
    updateErrorRate()
  }
  
  // 更新错误率
  const updateErrorRate = () => {
    const total = metrics.value.totalRequests + metrics.value.totalErrors
    if (total > 0) {
      metrics.value.errorRate = (metrics.value.totalErrors / total) * 100
    }
  }
  
  // 更新节点活跃模块（用于UI显示）
  const updateNodeActiveModules = (nodeId, moduleAccess) => {
    const node = findNode(nodeId)
    if (!node) return
    
    const activeModules = { ...(node.data.activeModules || {}) }
    moduleAccess.forEach(m => {
      activeModules[m.name] = (activeModules[m.name] || 0) + 1
    })
    
    updateNodeData(nodeId, {
      ...node.data,
      activeModules
    })
    
    // 500ms后清除活跃状态
    setTimeout(() => {
      const freshNode = findNode(nodeId)
      if (freshNode) {
        const freshActiveModules = { ...(freshNode.data.activeModules || {}) }
        moduleAccess.forEach(m => {
          freshActiveModules[m.name] = Math.max(0, (freshActiveModules[m.name] || 0) - 1)
          if (freshActiveModules[m.name] === 0) {
            delete freshActiveModules[m.name]
          }
        })
        updateNodeData(nodeId, {
          ...freshNode.data,
          activeModules: freshActiveModules
        })
      }
    }, 500 / simulationSpeed.value)
  }
  
  // 计算处理延时
  const calculateProcessingDelay = (node, request) => {
    const baseDelay = node.data?.processingDelay || 10
    
    switch (node.type) {
      case 'http':
        // HTTP节点：解析请求开销
        const accessCount = (request.moduleAccess || request.requiredModules || []).length
        return baseDelay + (accessCount * 5)
        
      case 'service': {
        // 服务节点：根据模块匹配度和负载计算
        const serviceModules = parseServiceModules(node.data)
        const requestAccess = request.moduleAccess || []
        
        // 计算匹配率
        let matchedCount = 0
        let totalReadRatio = 0
        
        requestAccess.forEach(req => {
          const serviceMod = serviceModules.find(m => m.name === req.name)
          if (serviceMod) {
            matchedCount++
            // 使用请求的 readRatio 计算优化因子
            // readRatio 越高（读越多），处理越快
            const readRatio = req.readRatio ?? 100
            totalReadRatio += readRatio / 100
          }
        })
        
        const matchRate = requestAccess.length > 0 ? matchedCount / requestAccess.length : 1
        const avgReadRatio = matchedCount > 0 ? totalReadRatio / matchedCount : 1
        
        // 读写优化：读比例越高，处理越快 (0.8x ~ 1.2x)
        const rwOptimization = 0.8 + (0.4 * avgReadRatio)
        
        // 负载影响：高负载增加处理延时
        const loadFactor = 1 + ((node.data?.load || 0) / 200)
        
        return (baseDelay * rwOptimization * loadFactor) / Math.max(0.5, matchRate)
      }
        
      case 'database': {
        // 数据库：根据模块分片计算
        const moduleQps = node.data?.moduleQps || {}
        const targetModuleAccess = request.moduleAccess?.[0]
        const targetModule = targetModuleAccess?.name || request.requiredModules?.[0]
        const qps = moduleQps[targetModule] || 100
        
        // QPS越高，单请求处理越快（批量优化），但存在基础延时
        // 根据 readRatio 判断写操作的比例，写越多越慢
        const readRatio = targetModuleAccess?.readRatio ?? 100
        const writeRatio = (100 - readRatio) / 100  // 0~1
        const writePenalty = 1 + (writeRatio * 0.5)  // 1x ~ 1.5x
        
        return (baseDelay + (1000 / qps)) * writePenalty
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
    
    if (request.status === 'error') {
      return // 错误请求不计入成功统计
    }
    
    request.status = 'success'
    
    // 更新统计
    metrics.value.totalRequests++
    const totalLatency = metrics.value.avgLatency * (metrics.value.totalRequests - 1) + request.latency
    metrics.value.avgLatency = totalLatency / metrics.value.totalRequests
    
    // 更新错误率
    updateErrorRate()
    
    // 记录到节点历史
    const lastNode = findNode(request.path[request.path.length - 1])
    if (lastNode) {
      const history = lastNode.data?.requestHistory || []
      history.push({
        timestamp: globalTime.value,
        latency: request.latency,
        path: request.path,
        status: 'success'
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
    setNodeProcessingDelay,
    // 导出内部函数供测试
    checkModuleAccess,
    parseServiceModules,
    parseModuleAccess
  }
}
