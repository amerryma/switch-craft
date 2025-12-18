# Contributing

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Build local binary
bun run build:local

# Lint
bun run lint

# Format
bun run format
```

## Generating the Demo GIF

The demo GIF is created using [VHS](https://github.com/charmbracelet/vhs), a terminal recording tool.

### Prerequisites

1. Install VHS:
   ```bash
   go install github.com/charmbracelet/vhs@latest
   ```

2. Install ttyd with nerd font support (for icons):
   ```bash
   # Install dependencies
   sudo apt-get install build-essential cmake git libjson-c-dev libwebsockets-dev

   # Clone and build ttyd-nerd-font
   git clone https://github.com/metorm/ttyd-nerd-font.git
   cd ttyd-nerd-font && mkdir build && cd build
   cmake .. && make
   sudo make install
   ```

3. Install ffmpeg:
   ```bash
   sudo apt install ffmpeg
   ```

### Recording the Demo

1. Build the project first:
   ```bash
   bun run build:local
   ```

2. Run VHS with the tape file:
   ```bash
   vhs demo.tape
   ```

This generates `img/demo.gif` from the instructions in `demo.tape`.

### Customizing the Demo

Edit `demo.tape` to change the recording. The tape file uses a test config (`config.example.json`) so your personal projects aren't shown.

Key VHS commands:
- `Type "text"` - Types text
- `Enter` - Press enter
- `Down` / `Up` - Arrow keys
- `Ctrl+o` - Ctrl+O keypress
- `Sleep 500ms` - Pause recording
- `Hide` / `Show` - Hide/show commands from recording
