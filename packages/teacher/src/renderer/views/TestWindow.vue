<!-- Previous template and initial script setup remains unchanged -->

<script setup lang="ts">
// Previous imports and state management code remains unchanged...

// Methods
const setLoading = (isLoading: boolean, message: string = '') => {
  loading.value = isLoading
  loadingMessage.value = message
}

const handleError = (errorMessage: string) => {
  error.value = errorMessage
  setLoading(false)
}

const handleOpenStudentWindow = async () => {
  try {
    setLoading(true, '学生画面を開いています...')
    await window.electronAPI.createStudentWindow()
  } catch (err) {
    handleError('学生画面の起動に失敗しました')
  } finally {
    setLoading(false)
  }
}

const handleStartTest = async () => {
  if (!testData.value) {
    handleError('テストデータが見つかりません')
    return
  }

  try {
    setLoading(true, 'テストを開始しています...')
    isStarted.value = true
    isPlaying.value = true
    currentQuestionIndex.value = 0
    await window.electronAPI.startTest(testData.value)
    await startQuestionSequence()
  } catch (err) {
    handleError('テストの開始に失敗しました')
    isStarted.value = false
    isPlaying.value = false
  } finally {
    setLoading(false)
  }
}

const handlePauseTest = async () => {
  try {
    setLoading(true, 'テストを一時停止しています...')
    isPlaying.value = false
    isPaused.value = true
    clearAllTimeouts()
    await window.electronAPI.stopAudio()
  } catch (err) {
    handleError('テストの一時停止に失敗しました')
  } finally {
    setLoading(false)
  }
}

const handleResumeTest = async () => {
  try {
    setLoading(true, 'テストを再開しています...')
    isPlaying.value = true
    isPaused.value = false
    await startQuestionSequence()
  } catch (err) {
    handleError('テストの再開に失敗しました')
  } finally {
    setLoading(false)
  }
}

const handleStopTest = async () => {
  try {
    setLoading(true, 'テストを終了しています...')
    clearAllTimeouts()
    await window.electronAPI.stopAudio()
    await window.electronAPI.endTest()
    isPlaying.value = false
    isPaused.value = false
    showResults.value = true
  } catch (err) {
    handleError('テストの終了に失敗しました')
  } finally {
    setLoading(false)
  }
}

const startQuestionSequence = async () => {
  const question = currentQuestion.value
  if (!question) {
    handleError('問題データが見つかりません')
    return
  }

  try {
    // Wait time
    playingStage.value = 'wait'
    await sleep(question.waitTime * 1000)

    // Play audio 1
    playingStage.value = 'audio1'
    await window.electronAPI.playAudio(question.audio1)

    // Pause time
    playingStage.value = 'pause'
    await sleep(question.pauseTime * 1000)

    // Play audio 2
    playingStage.value = 'audio2'
    await window.electronAPI.playAudio(question.audio2)

    // Answer time
    playingStage.value = 'answer'
    remainingTime.value = question.answerTime
    startAnswerTimer()
  } catch (err) {
    handleError('問題シーケンスの実行に失敗しました')
    await handleStopTest()
  }
}

const startAnswerTimer = () => {
  if (countdownInterval) clearInterval(countdownInterval)
  
  countdownInterval = setInterval(() => {
    if (remainingTime.value > 0) {
      remainingTime.value--
    } else {
      clearInterval(countdownInterval!)
      handleQuestionEnd()
    }
  }, 1000)
}

const handleQuestionEnd = async () => {
  showingAnswer.value = true
  await sleep(5000) // Show answer for 5 seconds

  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    currentQuestionIndex.value++
    await startQuestionSequence()
  } else {
    await handleStopTest()
  }
}

const getStudentStatusClass = (student: Student): string => {
  if (!student.currentAnswer) return 'bg-gray-50'
  if (showingAnswer.value) {
    return student.currentAnswer === currentQuestion.value?.correctOption
      ? 'bg-green-50'
      : 'bg-red-50'
  }
  return 'bg-blue-50'
}

const handleCloseResults = () => {
  showResults.value = false
  // Reset test state
  isStarted.value = false
  isPlaying.value = false
  isPaused.value = false
  currentQuestionIndex.value = -1
  playingStage.value = null
}

const handleExportResults = async () => {
  try {
    setLoading(true, '結果をエクスポートしています...')
    
    const exportData = {
      timestamp: new Date().toISOString(),
      overallStats: overallStats.value,
      questionStats: questionStats.value,
      students: students.value,
    }

    // Create a Blob with the JSON data
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = `test-results-${new Date().toISOString()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

  } catch (err) {
    handleError('結果のエクスポートに失敗しました')
  } finally {
    setLoading(false)
  }
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => {
  questionSequenceTimeout = setTimeout(resolve, ms)
})

const clearAllTimeouts = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  if (questionSequenceTimeout) {
    clearTimeout(questionSequenceTimeout)
    questionSequenceTimeout = null
  }
}

// Event handlers
const handleInitTestData = (data: TestData) => {
  testData.value = data
  totalQuestions.value = data.sequences.length
}

const handleTestStateUpdate = (state: TestState) => {
  students.value = state.students
  currentQuestionStats.value = state.currentQuestionStats
  questionStats.value = state.questionStats
}

// Initialization and cleanup
onMounted(() => {
  window.electronAPI.onInitTestData(handleInitTestData)
  window.electronAPI.onTestStateUpdate(handleTestStateUpdate)
})

onUnmounted(() => {
  clearAllTimeouts()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
