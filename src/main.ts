import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')

import { provide, inject } from 'vue'

const SimulationSymbol = Symbol('simulation')

export function provideSimulation(simulation) {
  provide(SimulationSymbol, simulation)
}

export function useSimulationState() {
  const simulation = inject(SimulationSymbol)
  if (!simulation) {
    throw new Error('useSimulationState must be used after provideSimulation')
  }
  return simulation
}