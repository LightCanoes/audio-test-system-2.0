"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const ws = require("ws");
const events = require("events");
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    crypto.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}
const native = {
  randomUUID: crypto.randomUUID
};
function v4(options, buf, offset) {
  if (native.randomUUID && !buf && !options) {
    return native.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
class AudioManager {
  audioDir;
  files = /* @__PURE__ */ new Map();
  audioPlayer = null;
  constructor(userDataPath) {
    this.audioDir = path.join(userDataPath, "audio");
  }
  async loadInitialFiles() {
    try {
      await fs.promises.mkdir(this.audioDir, { recursive: true });
      const files = await fs.promises.readdir(this.audioDir);
      for (const file of files) {
        if (file.endsWith(".wav") || file.endsWith(".mp3")) {
          const filePath = path.join(this.audioDir, file);
          const id = file.split("_")[0];
          this.files.set(id, {
            id,
            path: filePath,
            name: file.split("_")[1] || file,
            // Get original name if exists
            originalPath: filePath
          });
        }
      }
    } catch (error) {
      console.error("Failed to load initial files:", error);
    }
  }
  async importAudioFiles() {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Audio Files", extensions: ["wav", "mp3"] }
      ]
    });
    if (!result.canceled) {
      const importedFiles = [];
      for (const filePath of result.filePaths) {
        const id = v4();
        const originalName = filePath.split(/[\\/]/).pop() || "";
        const newName = `${id}_${originalName}`;
        const newPath = path.join(this.audioDir, newName);
        try {
          await fs.promises.copyFile(filePath, newPath);
          const audioFile = {
            id,
            path: newPath,
            name: originalName,
            originalPath: filePath
          };
          this.files.set(id, audioFile);
          importedFiles.push(audioFile);
        } catch (error) {
          console.error(`Failed to import file ${filePath}:`, error);
        }
      }
      return importedFiles;
    }
    return [];
  }
  async deleteAudioFile(fileId) {
    const file = this.files.get(fileId);
    if (!file) return false;
    try {
      await fs.promises.unlink(file.path);
      this.files.delete(fileId);
      return true;
    } catch (error) {
      console.error(`Failed to delete file ${fileId}:`, error);
      return false;
    }
  }
  async getAudioFiles(fileIds) {
    if (fileIds) {
      return fileIds.map((id) => this.files.get(id)).filter((file) => file !== void 0);
    }
    return Array.from(this.files.values());
  }
  async playAudio(fileId) {
    const file = this.files.get(fileId);
    if (!file) return false;
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
    }
    this.audioPlayer = new Audio(file.path);
    await this.audioPlayer.play();
    return true;
  }
  stopAudio() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.audioPlayer = null;
    }
  }
}
class TestManager extends events.EventEmitter {
  wss = null;
  students = /* @__PURE__ */ new Map();
  test = null;
  currentQuestionIndex = -1;
  stats = null;
  constructor() {
    super();
  }
  startServer() {
    if (this.wss) return;
    this.wss = new ws.WebSocketServer({ port: 8080 });
    this.wss.on("connection", (ws2, request) => {
      const clientId = Date.now().toString();
      const isTeacher = request.url?.includes("teacher");
      if (!isTeacher) {
        this.students.set(clientId, {
          id: clientId,
          answers: [],
          correctCount: 0,
          totalAnswered: 0,
          correctRate: 0
        });
        this.broadcastToTeachers({
          type: "student-connected",
          student: this.students.get(clientId)
        });
      }
      this.sendToClient(ws2, {
        type: "connection-status",
        status: "connected",
        id: clientId,
        role: isTeacher ? "teacher" : "student"
      });
      if (this.test) {
        this.sendToClient(ws2, {
          type: "test-state",
          test: this.test,
          currentQuestionIndex: this.currentQuestionIndex,
          stats: this.stats
        });
      }
      ws2.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message, ws2);
        } catch (error) {
          console.error("Error handling message:", error);
        }
      });
      ws2.on("close", () => {
        if (!isTeacher) {
          this.students.delete(clientId);
          this.broadcastToTeachers({
            type: "student-disconnected",
            studentId: clientId
          });
        }
      });
    });
  }
  handleMessage(clientId, message, ws2) {
    const student = this.students.get(clientId);
    switch (message.type) {
      case "answer":
        if (student && this.test) {
          const answer = message.answer;
          const question = this.test.sequences[this.currentQuestionIndex];
          const isCorrect = answer.option === question.correctOption;
          student.answers.push(answer);
          student.currentAnswer = answer.option;
          if (isCorrect) student.correctCount++;
          student.totalAnswered++;
          student.correctRate = student.correctCount / student.totalAnswered * 100;
          this.updateStats(student, answer, isCorrect);
          this.broadcastToTeachers({
            type: "answer-submitted",
            studentId: clientId,
            answer: {
              ...answer,
              isCorrect
            }
          });
          this.sendToClient(ws2, {
            type: "answer-result",
            result: isCorrect ? "correct" : "wrong"
          });
        }
        break;
      case "request-stats":
        if (this.stats) {
          this.sendToClient(ws2, {
            type: "stats-update",
            stats: this.stats
          });
        }
        break;
    }
  }
  updateStats(student, answer, isCorrect) {
    if (!this.stats) {
      this.initializeStats();
    }
    if (this.stats) {
      const currentStats = this.stats.currentQuestionStats;
      const questionStats = this.stats.questionStats[this.currentQuestionIndex];
      currentStats.totalAnswers++;
      if (isCorrect) currentStats.correctAnswers++;
      currentStats.correctRate = currentStats.correctAnswers / currentStats.totalAnswers * 100;
      currentStats.optionCounts[answer.option] = (currentStats.optionCounts[answer.option] || 0) + 1;
      currentStats.answers[student.id] = { option: answer.option, time: answer.timestamp - answer.startTime };
      currentStats.averageTime = Object.values(currentStats.answers).reduce((sum, a) => sum + a.time, 0) / currentStats.totalAnswers;
      questionStats.totalAnswers = currentStats.totalAnswers;
      questionStats.correctAnswers = currentStats.correctAnswers;
      questionStats.correctRate = currentStats.correctRate;
      questionStats.averageTime = currentStats.averageTime;
      questionStats.optionCounts = { ...currentStats.optionCounts };
      questionStats.answers = { ...currentStats.answers };
      const totalAnswers = this.stats.questionStats.reduce((sum, q) => sum + q.totalAnswers, 0);
      const totalCorrect = this.stats.questionStats.reduce((sum, q) => sum + q.correctAnswers, 0);
      const totalTime = this.stats.questionStats.reduce((sum, q) => sum + q.averageTime * q.totalAnswers, 0);
      this.stats.overallStats = {
        totalAnswers,
        correctAnswers: totalCorrect,
        correctRate: totalAnswers > 0 ? totalCorrect / totalAnswers * 100 : 0,
        averageTime: totalAnswers > 0 ? totalTime / totalAnswers : 0
      };
      this.broadcastToTeachers({
        type: "stats-update",
        stats: this.stats
      });
    }
  }
  initializeStats() {
    if (!this.test) return;
    const questionStats = this.test.sequences.map(() => ({
      totalAnswers: 0,
      correctAnswers: 0,
      correctRate: 0,
      averageTime: 0,
      optionCounts: {},
      answers: {}
    }));
    this.stats = {
      currentQuestionStats: {
        totalAnswers: 0,
        correctAnswers: 0,
        correctRate: 0,
        averageTime: 0,
        optionCounts: {},
        answers: {}
      },
      questionStats,
      overallStats: {
        totalAnswers: 0,
        correctAnswers: 0,
        correctRate: 0,
        averageTime: 0
      },
      students: Array.from(this.students.values())
    };
  }
  broadcastToTeachers(message) {
    if (!this.wss) return;
    this.wss.clients.forEach((client) => {
      if (client.readyState === ws.WebSocket.OPEN) {
        try {
          const isTeacher = client._isTeacher;
          if (isTeacher) {
            client.send(JSON.stringify(message));
          }
        } catch (error) {
          console.error("Error broadcasting to teachers:", error);
        }
      }
    });
  }
  sendToClient(ws$1, message) {
    if (ws$1.readyState === ws.WebSocket.OPEN) {
      try {
        ws$1.send(JSON.stringify(message));
      } catch (error) {
        console.error("Error sending to client:", error);
      }
    }
  }
  startTest(testData) {
    this.test = testData;
    this.currentQuestionIndex = 0;
    this.initializeStats();
    this.wss?.clients.forEach((client) => {
      if (client.readyState === ws.WebSocket.OPEN) {
        this.sendToClient(client, {
          type: "test-start",
          currentQuestionIndex: this.currentQuestionIndex,
          totalQuestions: this.test.sequences.length,
          options: this.test.sequences[0].options,
          instruction: this.test.instruction,
          lightSettings: this.test.lightSettings
        });
      }
    });
  }
  nextQuestion() {
    if (!this.test || this.currentQuestionIndex >= this.test.sequences.length - 1) return;
    this.currentQuestionIndex++;
    const question = this.test.sequences[this.currentQuestionIndex];
    this.wss?.clients.forEach((client) => {
      if (client.readyState === ws.WebSocket.OPEN) {
        this.sendToClient(client, {
          type: "next-question",
          questionIndex: this.currentQuestionIndex,
          options: question.options
        });
      }
    });
  }
  endTest() {
    if (!this.test) return;
    this.wss?.clients.forEach((client) => {
      if (client.readyState === ws.WebSocket.OPEN) {
        this.sendToClient(client, {
          type: "test-end",
          stats: this.stats
        });
      }
    });
    this.test = null;
    this.currentQuestionIndex = -1;
    this.stats = null;
  }
  stopServer() {
    if (this.wss) {
      this.wss.close(() => {
        console.log("WebSocket server closed");
      });
      this.wss = null;
    }
  }
}
let mainWindow = null;
let testWindow = null;
let studentWindow = null;
let audioManager = null;
let testManager = null;
const createMainWindow = () => {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/index.js")
    }
  });
  if (!electron.app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
};
const createTestWindow = async (testData) => {
  if (testWindow) {
    testWindow.focus();
    return;
  }
  testManager?.startServer();
  testWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/index.js")
    }
  });
  if (!electron.app.isPackaged) {
    await testWindow.loadURL("http://localhost:5173/#/test");
  } else {
    await testWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
      hash: "test"
    });
  }
  testWindow.webContents.once("did-finish-load", () => {
    testWindow?.webContents.send("init-test-data", testData);
  });
  testWindow.on("closed", () => {
    testWindow = null;
    testManager?.stopServer();
    if (studentWindow) {
      studentWindow.close();
      studentWindow = null;
    }
  });
};
const createStudentWindow = async () => {
  if (studentWindow) {
    studentWindow.focus();
    return;
  }
  studentWindow = new electron.BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/index.js")
    }
  });
  if (!electron.app.isPackaged) {
    await studentWindow.loadURL("http://localhost:5173/#/student");
  } else {
    await studentWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
      hash: "student"
    });
  }
  studentWindow.on("closed", () => {
    studentWindow = null;
  });
};
const setupIpcHandlers = () => {
  electron.ipcMain.handle("create-test-window", async (event, testData) => {
    await createTestWindow(testData);
  });
  electron.ipcMain.handle("create-student-window", async () => {
    await createStudentWindow();
  });
  electron.ipcMain.handle("play-audio", (event, path2) => {
    return audioManager?.playAudio(path2);
  });
  electron.ipcMain.handle("stop-audio", () => {
    return audioManager?.stopAudio();
  });
  electron.ipcMain.handle("start-test", (event, testData) => {
    testManager?.startTest(testData);
  });
  electron.ipcMain.handle("next-question", () => {
    testManager?.nextQuestion();
  });
  electron.ipcMain.handle("end-test", () => {
    testManager?.endTest();
  });
  electron.ipcMain.handle("get-audio-files", () => audioManager?.getAudioFiles());
  electron.ipcMain.handle("import-audio-files", () => audioManager?.importAudioFiles());
  electron.ipcMain.handle("delete-audio-file", (event, fileId) => audioManager?.deleteAudioFile(fileId));
};
const createDevMenu = () => {
  if (!electron.app.isPackaged) {
    mainWindow?.webContents.on("context-menu", (_, params) => {
      const menu = require("electron").Menu.buildFromTemplate([
        {
          label: "打开开发者工具",
          click: () => mainWindow?.webContents.openDevTools()
        },
        {
          label: "テストビューを開く",
          click: () => createTestWindow({})
        },
        {
          label: "学生ビューを開く",
          click: () => createStudentWindow()
        }
      ]);
      menu.popup();
    });
  }
};
electron.app.whenReady().then(async () => {
  createMainWindow();
  audioManager = new AudioManager(electron.app.getPath("userData"));
  await audioManager.loadInitialFiles();
  testManager = new TestManager();
  setupIpcHandlers();
  createDevMenu();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
electron.app.on("before-quit", () => {
  testManager?.stopServer();
});
