const WebSocket = require('ws');
const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();
const { app, BrowserWindow } = require('electron');
// const player = require('play-sound')(opts = {player: "C:/Users/aydan/Downloads/mpg123-1.25.10-x86-64/mpg123.exe"});
// const player = require('play-sound')(opts = {player: "C:/Users/aydan/Downloads/mplayer-svn-38117/mplayer.exe"});
const player = require('play-sound')(opts = {player: "mpg123.exe"});
var espeak = require('espeak');
var exec = require('executive');

const fs = require('fs');
const request = require('request')

const Store = require('electron-store');
const store = new Store();
var config = {}
var default_config = {
    "robotId": "101",
    "audioPath": "",
    "toggleYT": false,
    "commands": [],
    "chatToken": "xxx",
    "rs": {
        "api_host": "api.robotstreamer.com",
        "api_port": "8080",
        "api_protocol": "http",
        "chat_host": "robotstreamer.com",
        "chat_port": "8765",
        "chat_protocol": "ws",
    }
}
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
    isEnabled: true,
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
ipcMain.on('updateYT', (event, arg) => {
  store.set('config.toggleYT', arg)
})
ipcMain.on('resetConfig', (event, arg) => {
  store.set('config',null)
})

var wsChat = null;

function initChat(){
  console.log('Init Chat..')
  getChatEndpoint(store.get('config.rs.api_protocol'), store.get('config.rs.api_host'), store.get('config.rs.api_port'), true)
}
initChat()

function getChatEndpoint(api_protocol, api_host, api_port, logs){
    // http://api.robotstreamer.com:8080/v1/get_endpoint/jsmpeg_video_capture/211
    var url = api_protocol + '://' + api_host + ':' + api_port + '/v1/get_endpoint/rschat/100'
	if (logs) console.log("chat endpoint url: ", url)
	var options = {
		url: url,
		method: 'GET',
		headers: {
			"content-type": "application/json",
		}
	}
	if (logs) console.log(options)
	request(options, function(error, response, body) {
		if (logs) console.log('getChatEndpoint error:', error);
		if (logs) console.log('getChatEndpoint statusCode:', response && response.statusCode);
		if (logs) console.log('getChatEndpoint body:', body);
        if (!error && body){
            body = JSON.parse(body)
            store.set('config.rs.chat_host',body.host)
            store.set('config.rs.chat_port',body.port)
            openChatHostWebsocket()
        }
	})
}

function openChatHostWebsocket() {
    var host = store.get('config.rs.chat_host') || "robotstreamer.com"
    var port = store.get('config.rs.chat_port') || 8765
    var protocol = store.get('config.rs.chat_protocol') || "http"
	console.log('<== ws-chat opening.. '.yellow, host, port);
    if(wsChat) {
        wsChat.close()
        wsChat = null
    }
	wsChat = new WebSocket(protocol + '://' + host + ':' + port + '/echo');

	wsChat.on('open', function open() {
		console.log('<=> ws-chat open '.yellow, host, port);
		var command = '{"message": "message"}'
		console.log('sending command: ', command)
		wsChat.send(command)
	});

	wsChat.on('message', function incoming(data) {
        let obj = JSON.parse(data);
        if (obj.robot_id == store.get('config.robotId')) {
          checkMessageNew(obj);
          // console.log(obj);
        }
	});

    wsChat.on('error', function(error){
        console.log(error)
    })

    wsChat.on('close', function(error){
        setTimeout(function(){
    		console.log('chat client closed connection'.red, error)
            if (store.get('config.rs.tts_enabled')){
              initChat()
            }
    	},1000)
    })
}


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
        exec.quiet('espeak "'+msg.substr(0,75)+'"', function() {
          console.log("end of file");
          callback();
        });
      }
}

var checkMessageNew = function(msg) {
  if (msg.tts === false) { return; }

  let isYtToggled = store.get('config.toggleYT');
  if (msg.message.includes(prefix+'yt') && isYtToggled) {
    var args = msg.message.split(' ');
    var key = args[1].replace('https://www.youtube.com/watch?v=','');
    var time = args[2];
    if (!time) {
      time = "0";
    }

    obs.send('SetBrowserSourceProperties', {
      'source': "yt",
      'url': "https://www.youtube.com/embed/"+key+"?autoplay=1&start="+time
    }).catch(err => {
        console.log(err);
    });
    return;
  }

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
        if (!cmds[i].isEnabled) {
          output = false;
          return output;
        } else {
          console.log("is audio command");
          output = true;
          player.play(store.get('config.audioPath')+cmds[i].detail, { mplayer: ['-v', 0.2 ] }, function(err) {
            if (err) throw err
            callback();
          });
        }
      }
    }
  }
  return output;
}
