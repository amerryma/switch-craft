# switch-craft
Effortlessly navigate between projects with a single command.

## Oh My Zsh

1. Clone this repository into `$ZSH_CUSTOM/plugins` (by default `~/.oh-my-zsh/custom/plugins`)

    ```sh
    git clone https://github.com/amerryma/switch-craft ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/switch-craft
    ```

2. Add the plugin to the list of plugins for Oh My Zsh to load (inside `~/.zshrc`):

    ```sh
    plugins=( 
        # other plugins...
        switch-craft
    )
    ```

3. Start a new terminal session.

## Set Project Alias

The arguments are positional. Use quotes if you need to include spaces. If you need
to skip an argument, use "false".

```sh
alias cdp='switch-craft <project-display-name> <project-name> <kubectx> <gcloud> <enable-venv> <aws> <azure>'
```

To switch the default project dir of `~/Projects`, you can set the `SWITCH_CRAFT_PROJECTS_DIR` environment variable.

```sh
export SWITCH_CRAFT_PROJECTS_DIR=~/my-projects

# or per alias

alias cdp='SWITCH_CRAFT_PROJECTS_DIR=~/my-projects switch-craft <..args>'
```

