NOTE: Be sure to download this for OBS in order to use the "changeScene" command action: https://obsproject.com/forum/resources/obs-websocket-remote-control-of-obs-studio-made-easy.466

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
