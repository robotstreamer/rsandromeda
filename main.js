const WebSocket = require('ws');
const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();
const { app, BrowserWindow } = require('electron');
// const player = require('play-sound')(opts = {player: "C:/Users/aydan/Downloads/mpg123-1.25.10-x86-64/mpg123.exe"});
// const player = require('play-sound')(opts = {player: "C:/Users/aydan/Downloads/mplayer-svn-38117/mplayer.exe"});
const player = require('play-sound')(opts = {});
const mp3Duration = require('mp3-duration');
var espeak = require('espeak');
var wavFileInfo = require('wav-file-info');
const { getAudioDurationInSeconds } = require('get-audio-duration');
var exec = require('executive');

const fs = require('fs');

const Store = require('electron-store');
const store = new Store();
var config = {}
var default_config = {
    "robotId": "101",
    "audioPath": "",
    "commands": [],
    "chatToken": "xxx"
}
// store.set('config',null)
if (!store.get('config')) {
    console.log('loading default settings')
    store.set('config', default_config)
    console.log('store initalized with config:', config)
    config = default_config
} else {
    config = store.get('config')
    console.log('settings loaded: ', config)
}
var audioPath = store.get('config.audioPath');

const say = require('say');
const {ipcMain} = require('electron');

const prefix = "!";
var yourRobotId = store.get('config.robotId');
var chatmsg = '';
var messagesToTTS = [];
var audioToPlay = [];
var commandFilter = [];
for (var i = 0; i < store.get('config.commands').length; i++) {
  commandFilter.push('!'+store.get('config.commands')[i].title);
}

function createWindow () {
  let win = new BrowserWindow({ width: 650, height: 800, minWidth: 620 })
  win.loadFile('index.html')

  win.on('closed', () => {
    win = null
  })
}
app.on('ready', createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})

ipcMain.on('addCmd', (event, arg) => {
  let data = JSON.stringify(arg);
  let cmds = store.get('config.commands')
  cmds.push({
    title: arg.title,
    command: arg.action,
    detail: arg.value,
    id: arg.id
  })
  console.log(cmds);
  console.log('config:',store.get('config'))
  store.set('config.commands', cmds)
});
ipcMain.on('deleteCmd', (event, arg) => {
  var cmds = store.get('config.commands')
  for (var i = 0; i < cmds.length; i++) {
    if(cmds[i].id === arg) {
      cmds.splice(i,1);
    }
  }
  store.set('config.commands', cmds)
})
ipcMain.on('getInfo', (event, arg) => {
  event.sender.send('getInfoReply', store.get('config'));
  console.log(arg);
})
ipcMain.on('updateCmds', (event, arg) => {
  let cmds = store.get('config.commands')
  for (var i = 0; i < cmds.length; i++) {
    if(cmds[i].id == arg.id) {
      cmds[i] = arg;
    }
  }
  store.set('config.commands', cmds)
})
ipcMain.on('updateId', (event, arg) => {
  store.set('config.robotId', arg)
})
ipcMain.on('updatePath', (event, arg) => {
  arg = arg.replace(/\\/g,"/") + '/';
  store.set('config.audioPath', arg)
})

var ws = new WebSocket("ws://45_63_68_108.robotstreamer.com:8769/");

// OBS STUFF
obs.connect({
        address: 'localhost:4444'
    })
    .then(() => {
        console.log(`Success! We're connected & authenticated.`);
        return obs.send('GetSceneList');
    })
    .then(data => {
        console.log(`${data.scenes.length} Available Scenes!`);
        // console.log(data.scenes[0].sources)
    })
    .catch(err => {
        console.log(err);
    });
obs.on('SwitchScenes', data => {
    console.log(`Scene Switched To: ${data.sceneName}`);
});
obs.on('error', err => {
    console.error('socket error:', err);
});

// CHAT STUFF
ws.onopen = function (event) {
  ws.send(JSON.stringify({type: 'connect', message: 'joined'}));
};

ws.onmessage = function (event) {
  //console.log("ws client received", event.data);
  //console.log("event.data", event.data);
  let obj = JSON.parse(event.data);
  if (obj.robot_id == store.get('config.robotId')) {
    checkMessageNew(obj);
    // console.log(obj);
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

var x = 0;
var audioLength;
var soundPlaying = false;
var loopArray = function(arr) {
    waitForAction(arr[x],arr,function() {
        if(x < arr.length) {
          loopArray(arr);
        } else {
          soundPlaying = false;
        }
    });
}

function waitForAction(msg,arr,callback) {
      arr.shift();
      if (!doCommand(msg,callback)) {
        exec.quiet('espeak "'+msg+'"', function() {
          console.log("end of file");
          callback();
        });
      }
}

var checkMessageNew = function(msg) {
  if (msg.tts === false) { return; }

  messagesToTTS.push(msg.message);

  if (!soundPlaying) {
    loopArray(messagesToTTS);
    soundPlaying = true;
  }

}

function doCommand(msg, callback) {
  var output = false;
  let cmds = store.get('config.commands');
  for (var i = 0; i < cmds.length; i++) {
    let msgArgs = msg.split(' ');
    if (msgArgs[0].includes('!'+cmds[i].title)) {
      console.log("found command: !"+cmds[i].title);
      if(cmds[i].command == 'changeScene') {
        obs.send('SetCurrentScene', {
          'scene-name': cmds[i].detail
        });
      } else if(cmds[i].command == 'playAudio') {
        console.log("is audio command");
        output = true;
        player.play(store.get('config.audioPath')+cmds[i].detail, { mplayer: ['-v', 0.2 ] }, function(err) {
          if (err) throw err
          callback();
        });
      }
    }
  }
  return output;
}
