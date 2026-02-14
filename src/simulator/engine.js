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
    errorLog: [], // 错误日志，用于调试
    statusCodeDistribution: {
      '200': 0,
      '4xx': 0,
      '5xx': 0
    }
  })
  
  let simulationTimer = null
  let requestGenerator = null
  
  // 开始模拟
  const startSimulation = () => {
    isSimulating.value = true
    globalTime.value = 0
    
    // 重置统计
    metrics.value.totalErrors = 0
    metrics.value.errorLog = []
    metrics.value.statusCodeDistribution = { '200': 0, '4xx': 0, '5xx': 0 }
    
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
    isSimulating.value = false
    clearInterval(simulationTimer)
    clearInterval(requestGenerator)
    activeRequests.value = []
  }
  
  // ==================== 请求生命周期管理 ====================
  
  // 创建新请求
  const createRequest = (httpNode) => {
    const moduleAccess = parseModuleAccess(httpNode.data)
    
    return {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceNodeId: httpNode.id,
      moduleAccess,
      timestamp: globalTime.value,
      
      // 正向传播状态
      forward: {
        path: [],           // 已经经过的节点路径
        pendingBranches: 0, // 等待完成的下游分支数
        arrivedAt: null     // 到达叶子节点的时间
      },
      
      // 反向传播收集的响应
      backward: {
        responses: [],      // 各分支返回的响应
        completedAt: null
      },
      
      // 最终结果
      result: {
        statusCode: null,
        totalLatency: 0,
        errorReason: null,
        path: []
      }
    }
  }
  
  // 生成HTTP请求
  const generateHttpRequests = () => {
    const httpNodes = getNodes.value.filter(n => n.type === 'http')
    
    httpNodes.forEach(node => {
      const request = createRequest(node)
      activeRequests.value.push(request)
      
      // 启动正向传播
      forward(request, node.id, null)
    })
  }
  
  // ==================== 正向传播 (Forward Propagation) ====================
  
  /**
   * 正向传播：请求从源头向下游传播
   * @param {Object} request - 请求对象
   * @param {String} currentNodeId - 当前节点ID
   * @param {String|null} fromEdgeId - 来自哪条边（用于计算网络延时）
   */
  const forward = (request, currentNodeId, fromEdgeId) => {
    const currentNode = findNode(currentNodeId)
    if (!currentNode) return
    
    // 记录路径
    request.forward.path.push(currentNodeId)
    
    // 标记进入边为激活状态
    if (fromEdgeId) {
      updateEdgeState(fromEdgeId, { active: true, lastStatus: null })
    }
    
    // 更新节点活跃模块显示
    if (currentNode.type === 'service') {
      updateNodeActiveModules(currentNodeId, request.moduleAccess)
    }
    
    // 增加节点负载
    updateNodeLoad(currentNodeId, 1)
    
    // 查找下游连接
    const outgoingEdges = getEdges.value.filter(e => e.source === currentNodeId)
    
    // 判断是否是叶子节点（无下游连接）
    if (outgoingEdges.length === 0) {
      // 到达叶子节点，生成响应并开始反向传播
      handleLeafNode(request, currentNode, fromEdgeId)
      return
    }
    
    // 继续向下游传播
    request.forward.pendingBranches = outgoingEdges.length
    
    outgoingEdges.forEach(edge => {
      const networkDelay = edge.data?.networkLatency || 50
      
      setTimeout(() => {
        forward(request, edge.target, edge.id)
      }, networkDelay / simulationSpeed.value)
    })
  }
  
  /**
   * 处理叶子节点（无下游连接的节点）
   * 根据节点类型生成不同的响应
   */
  const handleLeafNode = (request, node, fromEdgeId) => {
    request.forward.arrivedAt = globalTime.value
    
    let response
    
    switch (node.type) {
      case 'http':
        // HTTP 节点是叶子节点 → 4xx 错误（没有连接服务）
        response = {
          nodeId: node.id,
          nodeType: 'http',
          statusCode: 404,
          latency: 0,
          networkLatency: 0,
          errorReason: '未找到下游服务节点',
          isError: true,
          errorType: '4xx'
        }
        break
        
      case 'service':
        // Service 节点是叶子节点 → 检查是否是合法的叶子
        const accessCheck = checkModuleAccess(node, request)
        
        if (!accessCheck.success) {
          // 权限检查失败 → 5xx 错误
          response = {
            nodeId: node.id,
            nodeType: 'service',
            statusCode: 500,
            latency: calculateProcessingDelay(node, request),
            networkLatency: 0,
            errorReason: accessCheck.errors.map(e => e.reason).join('; '),
            isError: true,
            errorType: '5xx'
          }
        } else {
          // Service 期望连接 DB 但没有 → 5xx 错误
          response = {
            nodeId: node.id,
            nodeType: 'service',
            statusCode: 503,
            latency: calculateProcessingDelay(node, request),
            networkLatency: 0,
            errorReason: '服务未连接数据库',
            isError: true,
            errorType: '5xx'
          }
        }
        break
        
      case 'database':
        // DB 节点是正常的叶子节点 → 成功响应
        response = {
          nodeId: node.id,
          nodeType: 'database',
          statusCode: 200,
          latency: calculateProcessingDelay(node, request),
          networkLatency: 0,
          errorReason: null,
          isError: false
        }
        break
        
      default:
        response = {
          nodeId: node.id,
          nodeType: node.type,
          statusCode: 200,
          latency: 10,
          networkLatency: 0,
          errorReason: null,
          isError: false
        }
    }
    
    // 减少负载并开始反向传播（标记为叶子节点）
    updateNodeLoad(node.id, -1)
    
    // 更新进入边的状态
    const currentIndex = request.forward.path.indexOf(node.id)
    const parentNodeId = currentIndex > 0 ? request.forward.path[currentIndex - 1] : null
    if (parentNodeId) {
      const incomingEdge = getEdges.value.find(e => e.source === parentNodeId && e.target === node.id)
      if (incomingEdge) {
        updateEdgeState(incomingEdge.id, {
          active: true,
          lastStatus: response.statusCode,
          hasError: response.isError,
          hasSuccess: !response.isError
        })
      }
    }
    
    backward(request, node.id, response, true)
  }
  
  // ==================== 反向传播 (Backward Propagation) ====================
  
  /**
   * 反向传播：响应从叶子节点向上游返回
   * @param {Object} request - 请求对象
   * @param {String} currentNodeId - 当前节点ID
   * @param {Object} childResponse - 来自下游的响应
   * @param {Boolean} isLeafNode - 是否是叶子节点发起的反向传播（叶子节点已在handleLeafNode中减少负载）
   */
  const backward = (request, currentNodeId, childResponse, isLeafNode = false) => {
    const currentNode = findNode(currentNodeId)
    if (!currentNode) return
    
    // 收集子响应
    request.backward.responses.push(childResponse)
    
    // 找到上游节点（父节点）
    const currentIndex = request.forward.path.indexOf(currentNodeId)
    const parentNodeId = currentIndex > 0 ? request.forward.path[currentIndex - 1] : null
    
    // 找到进入边（从父节点到当前节点）
    const incomingEdge = parentNodeId 
      ? getEdges.value.find(e => e.source === parentNodeId && e.target === currentNodeId)
      : null
    
    // 更新进入边状态 - 记录响应状态
    if (incomingEdge) {
      updateEdgeState(incomingEdge.id, {
        active: true,
        lastStatus: childResponse.statusCode,
        hasError: childResponse.isError,
        hasSuccess: !childResponse.isError
      })
    }
    
    // 检查是否所有分支都已返回
    if (request.backward.responses.length < request.forward.pendingBranches) {
      // 还有分支未返回，继续等待
      return
    }
    
    // 所有分支已返回，聚合响应
    const aggregated = aggregateResponses(request, currentNode)
    
    if (currentIndex <= 0) {
      // 到达源头，完成请求
      finalizeRequest(request, aggregated)
      return
    }
    
    // 计算网络延时（从父节点到当前节点的边）
    const networkDelay = incomingEdge?.data?.networkLatency || 50
    
    // 减少当前节点负载（叶子节点已在 handleLeafNode 中减少）
    if (!isLeafNode) {
      updateNodeLoad(currentNodeId, -1)
    }
    
    // 延迟后清除边的激活状态并向上游传播
    setTimeout(() => {
      if (incomingEdge) {
        updateEdgeState(incomingEdge.id, { active: false })
      }
      backward(request, parentNodeId, aggregated, false)
    }, networkDelay / simulationSpeed.value)
  }
  
  /**
   * 聚合多个分支的响应
   */
  const aggregateResponses = (request, currentNode) => {
    const responses = request.backward.responses
    
    // 计算聚合延时（取最大值，模拟并行分支的最慢路径）
    const maxChildLatency = Math.max(...responses.map(r => r.latency + (r.networkLatency || 0)))
    
    // 当前节点的处理延时
    const nodeProcessingDelay = calculateProcessingDelay(currentNode, request)
    
    // 检查是否有错误
    const errors = responses.filter(r => r.isError)
    
    let statusCode
    let errorReason
    let isError
    
    if (errors.length > 0) {
      // 有错误，优先返回 5xx，其次是 4xx
      const has5xx = errors.some(e => e.statusCode >= 500)
      const has4xx = errors.some(e => e.statusCode >= 400 && e.statusCode < 500)
      
      if (has5xx) {
        statusCode = 500
        isError = true
        errorReason = errors.find(e => e.statusCode >= 500)?.errorReason
      } else if (has4xx) {
        statusCode = 404
        isError = true
        errorReason = errors.find(e => e.statusCode >= 400 && e.statusCode < 500)?.errorReason
      }
    } else {
      // 无错误
      statusCode = 200
      isError = false
    }
    
    return {
      nodeId: currentNode.id,
      nodeType: currentNode.type,
      statusCode,
      latency: nodeProcessingDelay + maxChildLatency,
      networkLatency: 0, // 在反向传播时由调用方添加
      errorReason,
      isError
    }
  }
  
  // ==================== 请求完成与统计 ====================
  
  /**
   * 完成请求，更新统计
   */
  const finalizeRequest = (request, finalResponse) => {
    request.backward.completedAt = globalTime.value
    
    // 计算总延时（从请求创建到响应返回源头）
    const totalLatency = globalTime.value - request.timestamp
    
    // 设置最终结果
    request.result = {
      statusCode: finalResponse.statusCode,
      totalLatency,
      errorReason: finalResponse.errorReason,
      path: [...request.forward.path]
    }
    
    // 更新统计
    if (finalResponse.isError) {
      metrics.value.totalErrors++
      
      // 记录错误日志
      const errorRecord = {
        id: request.id,
        timestamp: globalTime.value,
        statusCode: finalResponse.statusCode,
        path: request.forward.path,
        reason: finalResponse.errorReason,
        latency: totalLatency
      }
      metrics.value.errorLog.unshift(errorRecord)
      if (metrics.value.errorLog.length > 50) {
        metrics.value.errorLog.pop()
      }
      
      // 更新状态码分布
      if (finalResponse.statusCode >= 500) {
        metrics.value.statusCodeDistribution['5xx']++
      } else if (finalResponse.statusCode >= 400) {
        metrics.value.statusCodeDistribution['4xx']++
      }
    } else {
      metrics.value.totalRequests++
      metrics.value.statusCodeDistribution['200']++
      
      // 更新平均延时
      const totalReqs = metrics.value.totalRequests
      const currentAvg = metrics.value.avgLatency
      metrics.value.avgLatency = ((currentAvg * (totalReqs - 1)) + totalLatency) / totalReqs
    }
    
    // 更新错误率
    const total = metrics.value.totalRequests + metrics.value.totalErrors
    if (total > 0) {
      metrics.value.errorRate = (metrics.value.totalErrors / total) * 100
    }
    
    // 记录到源头节点
    const httpNode = findNode(request.sourceNodeId)
    if (httpNode) {
      const history = httpNode.data?.requestHistory || []
      history.push({
        timestamp: globalTime.value,
        statusCode: finalResponse.statusCode,
        latency: totalLatency,
        path: request.forward.path
      })
      if (history.length > 100) history.shift()
      
      updateNodeData(request.sourceNodeId, {
        ...httpNode.data,
        requestHistory: history,
        lastRequestStatus: finalResponse.statusCode,
        lastRequestLatency: totalLatency
      })
      
      // 如果有错误，临时标记节点
      if (finalResponse.isError) {
        updateNodeData(request.sourceNodeId, {
          ...httpNode.data,
          lastError: {
            timestamp: globalTime.value,
            statusCode: finalResponse.statusCode,
            reason: finalResponse.errorReason
          }
        })
        
        // 2秒后清除错误标记
        setTimeout(() => {
          const freshNode = findNode(request.sourceNodeId)
          if (freshNode?.data?.lastError?.timestamp === globalTime.value) {
            updateNodeData(request.sourceNodeId, {
              ...freshNode.data,
              lastError: null
            })
          }
        }, 2000 / simulationSpeed.value)
      }
    }
    
    // 从活跃请求中移除
    const index = activeRequests.value.findIndex(r => r.id === request.id)
    if (index > -1) {
      activeRequests.value.splice(index, 1)
    }
  }
  
  // ==================== 工具函数 ====================
  
  // 解析模块访问配置
  const parseModuleAccess = (data) => {
    if (data.moduleAccess && Array.isArray(data.moduleAccess)) {
      return data.moduleAccess
    }
    const modules = data.modules || []
    return modules.map(name => ({
      name,
      readRatio: 100
    }))
  }
  
  // 解析服务节点的模块配置
  const parseServiceModules = (nodeData) => {
    const modules = nodeData.modules || []
    return modules.map(m => {
      if (typeof m === 'string') {
        return { name: m, access: 'rw' }
      }
      return {
        name: m.name,
        access: m.access || 'rw'
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
        errors.push({
          module: req.name,
          readRatio: req.readRatio,
          reason: `模块 '${req.name}' 未部署`
        })
        continue
      }
      
      const readRatio = req.readRatio ?? 100
      const serviceAccess = serviceMod.access
      const canRead = serviceAccess.includes('r')
      const canWrite = serviceAccess.includes('w')
      
      const needsRead = readRatio > 0
      const needsWrite = readRatio < 100
      
      if (needsRead && !canRead) {
        errors.push({
          module: req.name,
          readRatio,
          reason: `模块 '${req.name}' 配置为只写，无法读取`
        })
      }
      
      if (needsWrite && !canWrite) {
        errors.push({
          module: req.name,
          readRatio,
          reason: `模块 '${req.name}' 配置为只读，无法写入`
        })
      }
    }
    
    return {
      success: errors.length === 0,
      errors
    }
  }
  
  // 计算处理延时
  const calculateProcessingDelay = (node, request) => {
    const baseDelay = node.data?.processingDelay || 10
    
    switch (node.type) {
      case 'http': {
        const accessCount = (request.moduleAccess || []).length
        return baseDelay + (accessCount * 5)
      }
        
      case 'service': {
        const serviceModules = parseServiceModules(node.data)
        const requestAccess = request.moduleAccess || []
        
        let matchedCount = 0
        let totalReadRatio = 0
        
        requestAccess.forEach(req => {
          const serviceMod = serviceModules.find(m => m.name === req.name)
          if (serviceMod) {
            matchedCount++
            const readRatio = req.readRatio ?? 100
            totalReadRatio += readRatio / 100
          }
        })
        
        const matchRate = requestAccess.length > 0 ? matchedCount / requestAccess.length : 1
        const avgReadRatio = matchedCount > 0 ? totalReadRatio / matchedCount : 1
        const rwOptimization = 0.8 + (0.4 * avgReadRatio)
        const loadFactor = 1 + ((node.data?.load || 0) / 200)
        
        return (baseDelay * rwOptimization * loadFactor) / Math.max(0.5, matchRate)
      }
        
      case 'database': {
        const moduleQps = node.data?.moduleQps || {}
        const targetModuleAccess = request.moduleAccess?.[0]
        const targetModule = targetModuleAccess?.name
        const qps = moduleQps[targetModule] || 100
        
        const readRatio = targetModuleAccess?.readRatio ?? 100
        const writeRatio = (100 - readRatio) / 100
        const writePenalty = 1 + (writeRatio * 0.5)
        
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
      load: (newLoad / capacity) * 100
    })
  }
  
  // 更新节点活跃模块
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
  
  // 处理模拟时钟滴答
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
        globalTime.value - h.timestamp < 5000
      )
      
      if (recentHistory.length > 0) {
        const avgLatency = recentHistory.reduce((a, b) => a + b.latency, 0) / recentHistory.length
        const errorCount = recentHistory.filter(h => h.statusCode >= 400).length
        
        updateNodeData(node.id, {
          ...node.data,
          avgLatency: Math.round(avgLatency),
          rps: recentHistory.length / 5,
          recentErrorRate: (errorCount / recentHistory.length) * 100
        })
      }
    })
  }
  
  // 设置边的网络延时
  const setEdgeLatency = (edgeId, latency) => {
    const edges = getEdges.value
    const edge = edges.find(e => e.id === edgeId)
    if (edge) {
      edge.data = { ...edge.data, networkLatency: latency }
    }
  }
  
  // 更新边状态（用于动画效果）
  const updateEdgeState = (edgeId, state) => {
    const edges = getEdges.value
    const edgeIndex = edges.findIndex(e => e.id === edgeId)
    if (edgeIndex === -1) return
    
    const edge = edges[edgeIndex]
    edges[edgeIndex] = {
      ...edge,
      data: {
        ...edge.data,
        ...state
      }
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
    updateEdgeState,
    // 导出内部函数供测试
    checkModuleAccess,
    parseServiceModules,
    parseModuleAccess,
    createRequest,
    forward,
    backward,
    aggregateResponses
  }
}
