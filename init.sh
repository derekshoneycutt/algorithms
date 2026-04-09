#! /bin/sh

# The point of this script is to initiate the system for working with
# several parts. This doesn't do anything with the installing any compilers,
# though the docker is suggested beforehand.

# At this time, the environment variables for SSH have to be added manually,
# but this will provide a really good start.

CURRENT_PLATFORM=$(uname -s)
DO_PROMPT=1
COPY_ICONS=1
COPY_ICONS_TO=~/.vscode/extensions/icons/
UPDATE_ENVIRONMENT=1
USE_TIMEOUT="-k 10s 1m"
USE_EIFFEL="eiffelstudio"
USE_GCC13="/usr/bin/"
USE_GCC13NAME="gcc-13"
USE_GXX13NAME="g++-13"
USE_RUNONDOCKER="ada=code-runner asm=code-runner ballerina=code-runner freebasic=code-runner c=code-runner clojure=code-runner cobol=code-runner cpp=code-runner csharp=code-runner d=code-runner dart=code-runner eiffel=code-runner erlang=code-runner elixir=code-runner fortran=code-runner factor=code-runner fsharp=code-runner forth=code-runner gleam=code-runner go=code-runner haskell=code-runner haxe=code-runner icon=code-runner idris=code-runner java=code-runner julia=code-runner javascript=code-runner kit=code-runner kotlin=code-runner llvmir=code-runner lua=code-runner objectivec=code-runner modula3=code-runner octave=code-runner ocaml=code-runner mmixal=code-runner oberon=code-runner mojo=code-runner mercury=code-runner nasm=code-runner nim=code-runner pascal=code-runner php=code-runner prolog=code-runner perl=code-runner python=code-runner r=code-runner ruby=code-runner racket=code-runner rust=code-runner scala=code-runner scheme=code-runner simula=code-runner smalltalk=code-runner swift=code-runner tcl=code-runner typescript=code-runner v=code-runner visualbasic=code-runner wat=code-runner zig=code-runner"
USE_RUNONSSH=""

if [ ! -f "./init.sh" ]; then
    git clone https://github.com/derekshoneycutt/algorithms.git
    cd algorithms
fi

# We accept full control of this script via command line arguments if appropriate
for arg in "$@"; do
    case "$arg" in
    --no-prompt)
        DO_PROMPT=0
        ;;
    --copy-icons)
        COPY_ICONS=1
        ;;
    --no-icons)
        COPY_ICONS=0
        ;;
    --icons-to=*)
        COPY_ICONS_TO="${arg#*=}"
        ;;
    --update-environment)
        UPDATE_ENVIRONMENT=1
        ;;
    --skip-environment)
        UPDATE_ENVIRONMENT=0
        ;;
    --use-timeout=*)
        USE_TIMEOUT="${arg#*=}"
        ;;
    --use-eiffel=*)
        USE_EIFFEL="${arg#*=}"
        ;;
    --use-gcc13=*)
        USE_GCC13="${arg#*=}"
        ;;
    --use-gcc13name=*)
        USE_GCC13NAME="${arg#*=}"
        ;;
    --use-gxx13name=*)
        USE_GXX13NAME="${arg#*=}"
        ;;
    --use-runondocker=*)
        USE_RUNONDOCKER="${arg#*=}"
        ;;
    --use-runonssh=*)
        USE_RUNONSSH="${arg#*=}"
        ;;
    *)
        echo "Processing: $arg"
        ;;
    esac
done

# Potentially prompt if we should copy the icons
if [ "$DO_PROMPT" -eq 1 ]; then
    YN_PROMPT="[Y/n]"
    if [ "$COPY_ICONS" -eq 0 ]; then
        YN_PROMPT="[y/N]"
    fi
    read -p "Do you wish to copy icons to VSCode local folder? $YN_PROMPT " yn
    case "$yn" in
        [Yy]* ) COPY_ICONS=1 ;;
        [Nn]* ) COPY_ICONS=0 ;;
        * ) ;;
    esac
fi

# If set to do so, prompt for the location and copy the icons to the specified location
if [ "$COPY_ICONS" -eq 1 ]; then
    if [ "$DO_PROMPT" -eq 1 ]; then
        read -p "Enter folder to copy icons to [$COPY_ICONS_TO]: " input
        if [ -n "$input" ]; then
            COPY_ICONS_TO="$input"
        fi
    fi
    mkdir -p "$COPY_ICONS_TO"
    cp -fv ./icons/*.svg "$COPY_ICONS_TO"
fi

# Potentially prompt if we should update the environment variables
if [ "$DO_PROMPT" -eq 1 ]; then
    YN_PROMPT="[Y/n]"
    if [ "$UPDATE_ENVIRONMENT" -eq 0 ]; then
        YN_PROMPT="[y/N]"
    fi
    read -p "Do you wish to update the environment? $YN_PROMPT " yn
    case "$yn" in
        [Yy]* ) UPDATE_ENVIRONMENT=1 ;;
        [Nn]* ) UPDATE_ENVIRONMENT=0 ;;
        * ) ;;
    esac
fi

# Now we update the environment variables via the user profile file
if [ "$UPDATE_ENVIRONMENT" -eq 1 ]; then
    # Start prompting for any important
    if [ "$DO_PROMPT" -eq 1 ]; then
        read -p "Enter a timeout [$USE_TIMEOUT]: " input
        if [ -n "$input" ]; then
            USE_TIMEOUT="$input"
        fi
        read -p "Enter the Eiffel compiler used (eiffelstudio/libertyeiffel) [$USE_EIFFEL]: " input
        if [ -n "$input" ]; then
            USE_EIFFEL="$input"
        fi
        read -p "Enter the GCC 13 path [$USE_GCC13]: " input
        if [ -n "$input" ]; then
            USE_GCC13="$input"
        fi
        read -p "Enter the GCC 13 executable name [$USE_GCC13NAME]: " input
        if [ -n "$input" ]; then
            USE_GCC13NAME="$input"
        fi
        read -p "Enter the G++ 13 executable name [$USE_GXX13NAME]: " input
        if [ -n "$input" ]; then
            USE_GXX13NAME="$input"
        fi
        read -p "Enter the string of languages to run on docker [$USE_RUNONDOCKER]: " input
        if [ -n "$input" ]; then
            USE_RUNONDOCKER="$input"
        fi
        read -p "Enter the languages to run on SSH Servers [$USE_RUNONSSH]: " input
        if [ -n "$input" ]; then
            USE_RUNONSSH="$input"
        fi
    fi

    USE_PROFILE=
    case "$CURRENT_PLATFORM" in
        "MINGW64_NT"*)
            USE_PROFILE=~/.bash_profile
        ;;
        "Linux"*)
            USE_PROFILE=~/.bash_profile
        ;;
        "FreeBSD")
            USE_PROFILE=~/.profile
        ;;
        "Darwin")
            USE_PROFILE=~/.zprofile
        ;;
        *) ;;
    esac

    echo "
export DEREKALGOS_TIMEOUT=\"$USE_TIMEOUT\"
export DEREKALGOS_EIFFEL=\"$USE_EIFFEL\"
export DEREKALGOS_GCC13=\"$USE_GCC13\"
export DEREKALGOS_GCC13NAME=\"$USE_GCC13NAME\"
export DEREKALGOS_GXX13NAME=\"$USE_GXX13NAME\"
export DEREKALGOS_RUNONDOCKER=\"$USE_RUNONDOCKER\"
export DEREKALGOS_RUNONSSH=\"$USE_RUNONSSH\"" >> "$USE_PROFILE"

fi
