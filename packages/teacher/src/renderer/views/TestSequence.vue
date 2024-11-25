<!-- Previous template code remains unchanged -->

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  Bars3Icon
} from '@heroicons/vue/24/solid'
import { debounce } from 'lodash'
import draggable from 'vuedraggable'
import AudioFiles from '../components/AudioFiles.vue'
import type { AudioFile, Option, LightSettings, Sequence, TestData } from '../types'

// State with proper type annotations
const audioFiles: Ref<AudioFile[]> = ref([])
const sequences: Ref<Sequence[]> = ref([])
const currentEditIndex: Ref<number> = ref(-1)
const currentSequence: Ref<Sequence | null> = ref(null)
const loading: Ref<boolean> = ref(false)
const error: Ref<string | null> = ref(null)

const tabs = [
  { id: 'options', name: '回答選択肢' },
  { id: 'instruction', name: '教示文' },
  { id: 'lights', name: '提示灯' }
] as const

const currentTab: Ref<string> = ref('options')

// Validation
const validateSequence = (sequence: Sequence): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (sequence.waitTime < 0) errors.push('開始待ち時間は0以上である必要があります')
  if (sequence.pauseTime < 0) errors.push('休止時間は0以上である必要があります')
  if (sequence.answerTime < 1) errors.push('回答時間は1秒以上である必要があります')
  if (!sequence.audio1) errors.push('音源1を選択してください')
  if (!sequence.audio2) errors.push('音源2を選択してください')
  if (sequence.options.length < 2) errors.push('少なくとも2つの選択肢が必要です')
  if (!sequence.correctOption) errors.push('正解選択肢を選択してください')

  return {
    valid: errors.length === 0,
    errors
  }
}

// Watchers with error handling
watch(currentEditIndex, (newIndex: number) => {
  try {
    if (newIndex >= 0 && sequences.value[newIndex]) {
      currentSequence.value = sequences.value[newIndex]
    } else {
      currentSequence.value = null
    }
  } catch (err) {
    console.error('Error updating current sequence:', err)
    error.value = 'シーケンスの更新中にエラーが発生しました'
  }
})

// Auto-save with debounce and error handling
const debouncedSave = debounce(async (sequences: Sequence[]) => {
  try {
    loading.value = true
    error.value = null
    const cleanData: TestData = {
      sequences: sequences.map(seq => ({...seq}))
    }
    await window.electronAPI.saveTestData(cleanData)
  } catch (err) {
    console.error('Error auto-saving sequences:', err)
    error.value = 'シーケンスの保存中にエラーが発生しました'
  } finally {
    loading.value = false
  }
}, 1000)

watch(() => sequences.value, (newSequences: Sequence[]) => {
  debouncedSave(newSequences)
}, { deep: true })

// Sequence management with error handling
const createNewSequence = (): Sequence => {
  return {
    id: Date.now().toString(),
    name: `シーケンス ${sequences.value.length + 1}`,
    waitTime: 2,
    pauseTime: 1,
    answerTime: 5,
    audio1: '',
    audio2: '',
    options: [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' }
    ],
    correctOption: 'A',
    instruction: '',
    lightSettings: {
      showPlayingIndicator: true,
      showCorrectLight: true,
      showWrongLight: true,
      showAlmostLight: false
    }
  }
}

const addSequence = () => {
  try {
    const newSequence = createNewSequence()
    sequences.value.push(newSequence)
    currentEditIndex.value = sequences.value.length - 1
    error.value = null
  } catch (err) {
    console.error('Error adding sequence:', err)
    error.value = '新しいシーケンスの追加中にエラーが発生しました'
  }
}

const editSequence = (index: number) => {
  try {
    currentEditIndex.value = index
    error.value = null
  } catch (err) {
    console.error('Error editing sequence:', err)
    error.value = 'シーケンスの編集中にエラーが発生しました'
  }
}

const deleteSequence = async (index: number) => {
  try {
    if (!confirm('このシーケンスを削除しますか？')) return

    sequences.value.splice(index, 1)
    if (currentEditIndex.value === index) {
      currentEditIndex.value = -1
    } else if (currentEditIndex.value > index) {
      currentEditIndex.value--
    }
    error.value = null
  } catch (err) {
    console.error('Error deleting sequence:', err)
    error.value = 'シーケンスの削除中にエラーが発生しました'
  }
}

const handleDragEnd = () => {
  try {
    if (currentSequence.value) {
      const newIndex = sequences.value.findIndex(seq => seq.id === currentSequence.value?.id)
      if (newIndex !== -1) {
        currentEditIndex.value = newIndex
      }
    }
    error.value = null
  } catch (err) {
    console.error('Error handling drag end:', err)
    error.value = 'シーケンスの並び替え中にエラーが発生しました'
  }
}

const addOption = () => {
  try {
    if (!currentSequence.value) return
    
    const lastOption = currentSequence.value.options[currentSequence.value.options.length - 1]
    const nextLabel = String.fromCharCode(lastOption.label.charCodeAt(0) + 1)
    
    currentSequence.value.options.push({
      value: nextLabel,
      label: nextLabel
    })
    error.value = null
  } catch (err) {
    console.error('Error adding option:', err)
    error.value = '選択肢の追加中にエラーが発生しました'
  }
}

const deleteOption = (index: number) => {
  try {
    if (!currentSequence.value) return
    
    if (currentSequence.value.options.length <= 2) {
      error.value = '最低2つの選択肢が必要です'
      return
    }
    
    const optionToDelete = currentSequence.value.options[index]
    currentSequence.value.options.splice(index, 1)
    
    // If deleting the correct option, set the first option as correct
    if (optionToDelete.value === currentSequence.value.correctOption) {
      currentSequence.value.correctOption = currentSequence.value.options[0].value
    }
    error.value = null
  } catch (err) {
    console.error('Error deleting option:', err)
    error.value = '選択肢の削除中にエラーが発生しました'
  }
}

// Save all sequences with validation
const handleSaveAll = async () => {
  try {
    loading.value = true
    error.value = null

    if (currentSequence.value && currentEditIndex.value >= 0) {
      const validation = validateSequence(currentSequence.value)
      if (!validation.valid) {
        error.value = validation.errors.join('\n')
        return
      }
      sequences.value[currentEditIndex.value] = { ...currentSequence.value }
    }

    const cleanData: TestData = {
      sequences: sequences.value.map(seq => ({ ...seq }))
    }
    await window.electronAPI.saveTestData(cleanData)
  } catch (err) {
    console.error('Error saving data:', err)
    error.value = 'データの保存中にエラーが発生しました'
  } finally {
    loading.value = false
  }
}

// Start test with validation
const startTest = async () => {
  try {
    loading.value = true
    error.value = null

    if (currentSequence.value && currentEditIndex.value >= 0) {
      const validation = validateSequence(currentSequence.value)
      if (!validation.valid) {
        error.value = validation.errors.join('\n')
        return
      }
      sequences.value[currentEditIndex.value] = { ...currentSequence.value }
    }

    if (sequences.value.length === 0) {
      error.value = '少なくとも1つのシーケンスを追加してください'
      return
    }

    // Validate all sequences
    for (const sequence of sequences.value) {
      const validation = validateSequence(sequence)
      if (!validation.valid) {
        error.value = `シーケンス "${sequence.name}" でエラーが発生しました:\n${validation.errors.join('\n')}`
        return
      }
    }

    const testData: TestData = {
      sequences: sequences.value.map(seq => ({ ...seq }))
    }
    
    await window.electronAPI.createTestWindow(testData)
  } catch (err) {
    console.error('Error starting test:', err)
    error.value = 'テストの開始中にエラーが発生しました'
  } finally {
    loading.value = false
  }
}

const handleAudioSelect = async (fileId: string) => {
  try {
    if (!currentSequence.value) return
    // Handle audio selection logic here
    error.value = null
  } catch (err) {
    console.error('Error selecting audio:', err)
    error.value = '音源の選択中にエラーが発生しました'
  }
}

// Initialization
onMounted(async () => {
  try {
    loading.value = true
    error.value = null

    // Load audio files
    audioFiles.value = await window.electronAPI.getAudioFiles() || []
    
    // Load saved sequence data
    const savedData = await window.electronAPI.loadTestData()
    if (savedData?.sequences) {
      sequences.value = savedData.sequences
      // Select first sequence if available
      if (sequences.value.length > 0) {
        currentEditIndex.value = 0
      }
    }
  } catch (err) {
    console.error('Error loading initial data:', err)
    error.value = '初期データの読み込み中にエラーが発生しました'
  } finally {
    loading.value = false
  }
})

// Cleanup
onUnmounted(() => {
  // Cancel any pending operations
  debouncedSave.cancel()
})
</script>

<style scoped>
.drag-handle {
  cursor: move;
}
</style>
