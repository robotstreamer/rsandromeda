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
var settingsFileName = './settings.json';
var file = require(settingsFileName);
var audioPath = file[0].audioPath;

const say = require('say');
const {ipcMain} = require('electron');

const prefix = "!";
var yourRobotId = file[0].robotId;
var chatmsg = '';
var messagesToTTS = [];
var audioToPlay = [];
var commandFilter = [];
for (var i = 0; i < file[0].commands.length; i++) {
  commandFilter.push('!'+file[0].commands[i].title);
}

const chatToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX25hbWUiOiJBbmRyb21lZGFCb3QiLCJ1c2VyX2lkIjoiNDA2MTgifQ.PmtqMNec6YKZxiaTE3--uLSPgZRUJRergavTUVPSd3s";

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
  file[0].commands.push({
    title: arg.title,
    command: arg.action,
    detail: arg.value,
    id: arg.id
  })
  fs.writeFile(settingsFileName, JSON.stringify(file, null, 2), function (err) {
    if (err) return console.log(err);
    // console.log(JSON.stringify(file, null, 2));
    // console.log('writing to ' + settingsFileName);
  });
});
ipcMain.on('deleteCmd', (event, arg) => {
  for (var i = 0; i < file[0].commands.length; i++) {
    if(file[0].commands[i].id === arg) {
      file[0].commands.splice(i,1);
      console.log(file[0].commands)
    }
  }
  fs.writeFile(settingsFileName, JSON.stringify(file, null, 2), function (err) {
    if (err) return console.log(err);
    // console.log(JSON.stringify(file, null, 2));
    // console.log('writing to ' + settingsFileName);
  });
})
ipcMain.on('getInfo', (event, arg) => {
  event.sender.send('getInfoReply', file);
  console.log(arg);
})
ipcMain.on('updateCmds', (event, arg) => {
  for (var i = 0; i < file[0].commands.length; i++) {
    if(file[0].commands[i].id == arg.id) {
      file[0].commands[i] = arg;
      console.log(file[0].commands[i])
    }
  }
  fs.writeFile(settingsFileName, JSON.stringify(file, null, 2), function (err) {
    if (err) return console.log(err);
    // console.log(JSON.stringify(file, null, 2));
    // console.log('writing to ' + settingsFileName);
  });
})
ipcMain.on('updateId', (event, arg) => {
  file[0].robotId = arg;
  yourRobotId = arg;
  fs.writeFile(settingsFileName, JSON.stringify(file, null, 2), function (err) {
    if (err) return console.log(err);
    // console.log(JSON.stringify(file, null, 2));
    // console.log('writing to ' + settingsFileName);
  });
})
ipcMain.on('updatePath', (event, arg) => {
  arg = arg.replace(/\\/g,"/");
  file[0].audioPath = arg+'/';
  audioPath = arg+'/';
  fs.writeFile(settingsFileName, JSON.stringify(file, null, 2), function (err) {
    if (err) return console.log(err);
  });
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
  if (obj.robot_id == yourRobotId) {
    checkMessageNew(obj, file);
    // console.log(obj);
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// while (messagesToTTS) {
//   messagesToTTS.forEach(function(e, i) {
//
//   });
// }

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

var checkMessageNew = function(msg, jsonFile) {
  if (msg.message.includes('said '+prefix+'give')) {
    var goal = 100;
    if (msg.username !== "[RS BOT]") {
      return;
    }
    var args = msg.message.split(' ');
    let username = args[0];
    let amount = args[3];
    let donoMsg = args.slice(4).join(' ');

    if (amount >= 50) {
      player.play('audio/coin.mp3', function(err) {
        if (err) throw err
      })
    }
    obs.send('SetBrowserSourceProperties', {
      'source': "notif",
      'url': `file:///C:/Users/aydan/chatbot/templates/dono.html?name=${username}&amount=${amount}&msg=${donoMsg}`
    }).catch(err => {
        console.log(err);
    });

    var funbitgoal = 17000 / 34;
    obs.send('GetSourceSettings', {
      'sourceName': "progress"
    }).then(data => {
      // console.log(data.sourceSettings.height);
      obs.send('SetSourceSettings', {
        'sourceName': "progress",
        'sourceSettings': {
          'height': Math.floor(data.sourceSettings.height + Number(amount) / 34),
          'width': 100
        }
      }).then(newdata => {
        console.log(newdata);
      }).catch(err => { // Promise convention dicates you have a catch on every chain.
          console.log(err);
      });
    }).catch(err => { // Promise convention dicates you have a catch on every chain.
        console.log(err);
    });
  }

  messagesToTTS.push(msg.message);
  if (!soundPlaying) {
    loopArray(messagesToTTS);
    soundPlaying = true;
  }

}


function doCommand(msg, callback) {
  var output = false;
  let cmds = file[0].commands;
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
        player.play(audioPath+cmds[i].detail, { mplayer: ['-v', 0.2 ] }, function(err) {
          if (err) throw err
          callback();
        });
      }
    }
  }
  return output;
}

var checkMessage = function(msg) {
  // if (!soundPlaying) {
  //
  // }
  if (msg.message.includes(prefix+'test')) {

  } else if (msg.message.includes(prefix+'ping')) {
    chatmsg = JSON.stringify({
      'message': "no u",
      'token': chatToken,
      'robot_id': yourRobotId,
      'gre_token': chatToken
    });
    ws.send(chatmsg);
  } else if (msg.message.includes(prefix+'tts')) {
    var args = msg.message.split(' ');
    let cmd = args[0];
    let ttsMsg = args.slice(1).join(' ');

    say.speak(ttsMsg);
  } else if (msg.message.includes(prefix+'maincam')) {
    obs.send('SetCurrentScene', {
      'scene-name': "Game Scene"
    });
  }else if (msg.message.includes(prefix+'commands')) {
    obs.send('SetCurrentScene', {
      'scene-name': "commands"
    }).catch(err => { // Promise convention dicates you have a catch on every chain.
        console.log(err);
    });
  } else if (msg.message.includes('said '+prefix+'give')) {
    var goal = 100;

    if (msg.username !== "[RS BOT]") {
      return;
    }
    var args = msg.message.split(' ');
    let username = args[0];
    let amount = args[3];
    let donoMsg = args.slice(4).join(' ');

    if (amount >= 50) {
      player.play('audio/coin.mp3', function(err) {
        if (err) throw err
      })
    }
    obs.send('SetBrowserSourceProperties', {
      'source': "notif",
      'url': `file:///C:/Users/aydan/chatbot/dono.html?name=${username}&amount=${amount}&msg=${donoMsg}`
    }).catch(err => {
        console.log(err);
    });

    obs.send('GetSourceSettings', {
      'sourceName': "progress"
    }).then(data => {
      // console.log(data.sourceSettings.height);
      obs.send('SetSourceSettings', {
        'sourceName': "progress",
        'sourceSettings': {
          'height': data.sourceSettings.height + Number(amount) * 2,
          'width': 100
        }
      }).then(newdata => {
        console.log(newdata);
      }).catch(err => { // Promise convention dicates you have a catch on every chain.
          console.log(err);
      });
    }).catch(err => { // Promise convention dicates you have a catch on every chain.
        console.log(err);
    });
  }
}
