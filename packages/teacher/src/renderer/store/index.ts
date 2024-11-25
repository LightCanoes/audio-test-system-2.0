// src/renderer/store/index.ts
import { reactive, readonly, DeepReadonly } from 'vue'

interface AudioState {
  id: string | null
  isPlaying: boolean
}

interface State {
  isLoading: boolean
  error: string | null
  currentAudio: AudioState
}

type Store = {
  state: DeepReadonly<State>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCurrentAudio: (id: string | null, isPlaying: boolean) => void
  clearError: () => void
}

const state = reactive<State>({
  isLoading: false,
  error: null,
  currentAudio: {
    id: null,
    isPlaying: false
  }
})

export const store: Store = {
  state: readonly(state) as DeepReadonly<State>,
  
  setLoading(loading: boolean): void {
    state.isLoading = loading
  },
  
  setError(error: string | null): void {
    state.error = error
    
    if (error) {
      setTimeout(() => {
        state.error = null
      }, 5000)
    }
  },
  
  setCurrentAudio(id: string | null, isPlaying: boolean): void {
    state.currentAudio = { id, isPlaying }
  },
  
  clearError(): void {
    state.error = null
  }
}

// Export types for use in components
export type { State, AudioState, Store }
