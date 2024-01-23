# Switch-Craft Plugin
alias cdx="switch_craft 'Clean Environment'"

# Use existing projects dir from env var if set, otherwise default to ~/Projects
projects_dir=${SWITCH_CRAFT_PROJECTS_DIR:-~/Projects}

switch_craft() {
    project_name_display=$1
    project_name=$2
    kubectx=${3-'false'}
    gcloud=${4-'false'}
    enable_venv=${5-'false'}
    aws=${6-'false'}
    azure=${7-'false'}

    clear;

    # Reset

    while command -v deactivate &> /dev/null
    do
        echo "Deactivating virtualenv..."
        deactivate
        sleep 1
    done

    # Go

    if [ $enable_venv != 'false' ]
    then
        echo "Enabling venv"
        cd $projects_dir/$enable_venv;
        disable_autoswitch_virtualenv
    fi

    if [ $project_name ]
    then
        echo "Open Project $project_name"
        cd $projects_dir/$project_name

        if [ $enable_venv != 'false' ]
        then
          enable_autoswitch_virtualenv
        fi
    else
        cd $projects_dir
    fi

    if [ $kubectx != 'false' ]
    then
        echo "Setting kubectx to $kubectx"
        kubectx $kubectx
    else
        kubectx -u
    fi

    if [ $gcloud != 'false' ]
    then
        echo "Setting gcloud to $gcloud"
        gcloud config configurations activate $gcloud
    else
        gcloud config configurations activate default
        rm ~/.config/gcloud/active_config
    fi

    if [ $aws != 'false' ]
    then
        echo "Setting aws to $aws"
        export AWS_PROFILE=$aws
    else
        unset AWS_PROFILE
    fi

    if [ $azure != 'false' ]
    then
        echo "No mechanism for switching azure yet"
    else
        az account clear
    fi

    echo "\nSwitched to:"

    # If figlet and lolcat are available, use them to display the project name
    if command -v figlet &> /dev/null && command -v lolcat &> /dev/null
    then
        figlet -t -f 'JS Stick Letters' $project_name_display | lolcat
    else
        echo $project_name_display
    fi
}
