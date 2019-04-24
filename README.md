![example created commands](https://i.imgur.com/KFtRf1D.png)

RobotStreamer Andromeda
======
by TabloidA and Micronurd

**Andromeda, Pippy's long lost mother.** The **ultimate tool** to improve your stream on Robotstreamer. Create commands that will allow your users to play audio files and control scenes on OBS. More updates coming soon.

Send any bugs and/or suggestions to **TabloidA#9083** on Discord.

# How to install

> **ZIP DOWNLOAD LINK:** https://drive.google.com/uc?id=1KxW6XlW3Esl2Hs4dQT-Xy_JvHb_B_VgF&export=download

> **NOTE: Be sure to download this for OBS in order to use the "changeScene" command action:** https://obsproject.com/forum/resources/obs-websocket-remote-control-of-obs-studio-made-easy.466

1. Unzip RS Andromeda.zip
2. Create a shortcut to "chat.exe" and place the shortcut anywhere you'd like.
3. Create a folder someone easily accessible on your computer, name it whatever you want! This will be what you keep your audio clips in.
4. Open the chat.exe shortcut you made earlier.
(Windows might mark the app as suspicious, let it run.)
5. BEFORE ADDING ANY COMMANDS
	- Go to the "Options" tab and set the Robot ID of your stream and the folder path that you want the app to check for sound files.
6. To add Commands:
	- Command Name: Enter what you want people to type in chat to execute the command action. (ex: "drums" becomes "!drums" in chat)
	- Command Action: Choose whether you want to have the command change an OBS scene or play a sound file.
	- Action Value:
		- changeScene: Enter what scene you want the command to switch to.
		- playAudio: Enter the name of the audio file you want to play. (be sure to include the extension)

![example created commands](https://i.imgur.com/EdVcYYs.png)

# How to edit start.bat to open RS Andromeda

1. Open your start.bat file in a text editor.
<<<<<<< HEAD
2. Delete this line:
=======
2. Delete this line: 
>>>>>>> 73b0f3e0cf9114b642f16f7123e39f1ede5c87a1
![startbat texteditor delete](https://i.imgur.com/mFFE9Te.png)
3. Replace it with this line: (replace [path-to-chat.exe] with the file path to the chat.exe file in your RS Andromeda folder):
`start "" "[path-to-chat.exe]"`
