# switch-craft demo
Output img/demo.gif
Set Framerate 60

Set Shell bash
Set FontFamily "FiraCode Nerd Font"
Set FontSize 16
Set Width 1000
Set Height 600
Set WindowBar Colorful
Set WindowBarSize 40
Set BorderRadius 8
Set Margin 20
Set MarginFill "#1a1a2e"
Set Padding 15
Set TypingSpeed 75ms

# Setup and launch (hidden)
Hide
Type "cd ~/Projects/switch-craft"
Enter
Type "export SWITCH_CRAFT_CONFIG=./config.example.json"
Enter
Type "./dist/switch-craft select sh"
Enter
Sleep 500ms
Show

# Let the UI settle
Sleep 1s

# Navigate down
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms

# Type to filter
Type "titan"
Sleep 1s

# Show command preview with Ctrl+O
Ctrl+o
Sleep 4s
