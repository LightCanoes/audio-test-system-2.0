export interface AudioFile {
    id: string
    name: string
    path: string
    originalPath: string
  }
  
  export interface TestOption {
    value: string
    label: string
  }
  
  export interface TestSequence {
    waitTime: number             // 開始待ち時間
    audio1: string              // 第一音源ファイルID
    pauseTime: number           // 休止時間
    audio2: string              // 第二音源ファイルID
    answerTime: number          // 回答時間
    correctOption: string       // 正解選択肢
  }
  
  export interface LightSettings {
    showPlayingIndicator: boolean  // 音源呈示提示灯
    showCorrectLight: boolean      // 正解提示灯
    showWrongLight: boolean        // 不正解提示灯
    showAlmostLight: boolean       // おしい提示灯
  }
  
  export interface TestSettings {
    instruction: string           // 教示文
    options: TestOption[]         // 回答選択肢
    sequences: TestSequence[]     // シーケンス
    lightSettings: LightSettings  // 提示灯設定
  }