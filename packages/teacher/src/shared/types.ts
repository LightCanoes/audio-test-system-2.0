// Common interfaces used by both main and renderer processes

export interface AudioFile {
  id: string
  name: string
  path: string
  originalPath: string
}

export interface Option {
  value: string
  label: string
}

export interface LightSettings {
  showPlayingIndicator: boolean
  showCorrectLight: boolean
  showWrongLight: boolean
  showAlmostLight: boolean
}

export interface Sequence {
  id: string
  name: string
  waitTime: number
  pauseTime: number
  answerTime: number
  audio1: string
  audio2: string
  options: Option[]
  correctOption: string
  instruction: string
  lightSettings: LightSettings
}

export interface TestData {
  sequences: Sequence[]
}

// IPC Channel names
export const IPC_CHANNELS = {
  SAVE_TEST_DATA: 'save-test-data',
  LOAD_TEST_DATA: 'load-test-data',
  GET_AUDIO_FILES: 'get-audio-files',
  PLAY_AUDIO: 'play-audio',
  STOP_AUDIO: 'stop-audio',
  IMPORT_AUDIO_FILES: 'import-audio-files',
  DELETE_AUDIO_FILE: 'delete-audio-file',
  CREATE_TEST_WINDOW: 'create-test-window',
  START_TEST: 'start-test',
  NEXT_QUESTION: 'next-question',
  END_TEST: 'end-test'
} as const
