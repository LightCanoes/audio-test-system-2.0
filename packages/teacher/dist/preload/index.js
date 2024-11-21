"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 已有的API
  playAudio: (path) => electron.ipcRenderer.invoke("play-audio", path),
  stopAudio: () => electron.ipcRenderer.invoke("stop-audio"),
  getAudioFiles: (fileIds) => electron.ipcRenderer.invoke("get-audio-files", fileIds),
  importAudioFiles: () => electron.ipcRenderer.invoke("import-audio-files"),
  deleteAudioFile: (fileId) => electron.ipcRenderer.invoke("delete-audio-file", fileId),
  // 测试窗口相关
  createTestWindow: (testData) => electron.ipcRenderer.invoke("create-test-window", testData),
  createStudentWindow: () => electron.ipcRenderer.invoke("create-student-window"),
  // 测试数据相关
  saveTestData: (data) => electron.ipcRenderer.invoke("save-test-data", data),
  loadTestData: () => electron.ipcRenderer.invoke("load-test-data"),
  // 测试控制
  startTest: (testData) => electron.ipcRenderer.invoke("start-test", testData),
  nextQuestion: () => electron.ipcRenderer.invoke("next-question"),
  endTest: () => electron.ipcRenderer.invoke("end-test"),
  // 事件监听
  onTestStateUpdate: (callback) => {
    electron.ipcRenderer.on("test-state-update", (_, state) => callback(state));
  },
  onInitTestData: (callback) => {
    electron.ipcRenderer.on("init-test-data", (_, data) => callback(data));
  }
});
