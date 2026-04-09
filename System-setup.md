# System Setup

The recommended way to setup the system is to first install git (on Windows,
**do** install Git Bash) and clone this repository. Then call the init script.

```sh
git clone https://github.com/derekshoneycutt/algorithms.git
cd algorithms
./init.sh
```

If you open the folder in VS Code, you should also get a recommendation for the
extensions that are used throughout this project. This should be enough to
have a basic environment to code in. What is missing is all the code compilers.

I highly recommend setting up docker so that you can just build the Dockerfile.
The rest of this is basically still here for reference, but it is harder to get
a system going from scratch instead of just using a reproducible docker.

Basically open the git folder and build the docker. Then update the environment
variables according to Basic setup below. You can basically skip the rest of this
document if you take this route.

```sh
docker buildx build --platform linux/amd64 -t code-runner:v0.1 --load .
```

The docker built from this is quite sizable, as should probably be expected from
containing the compiler and runtimes for 60 different programming languages. It
tends to build fastest on a multicore linux machine in my experience, but then it
is about 8.4GB saved into a .tar.gz to transfer to other computers.

## Head

This project is currently developed to build and run primarily on Linux computers.
There is also built in support for FreeBSD, Windows, and MacOS, though the support
per language is not as thorough on these other platforms, outside of using the
Dockerfile included in this repository to make a container. All the code is
currently running on command line in all OSs.

GCC is the major framework used for multiple languages, in terms of what the code
is programmed to aim in this project. Specifically, the C++ is aimed at recent
versions of C++ requiring GCC15. However, some older languages require GCC13 to
build and even to build the code in this project. Therefore, the system running
this project will likely need to prepare for having both versions of GCC installed.

Gentoo is the first supported platform, on account of it is the platform I like
to run for fun. However, it has some issues that require further setup. Namely,
I could not get Modula-3 to run under Gentoo. This requires an Ubuntu Server
or FreeBSD VM running SSH that can run that code.

There are some languages that someone can probably get working under OSs that
support for is missing in this document if they want to play with doing the
builds and dependencies all well. I skipped this a number of times so far, but
this document may be updated in the future if I find working solutions for the
missing packages.

The Windows support here is kind of added on in a begrudging fun. You can do
it, but mostly, I am just seeing if I can. Assuming I can, I will try to keep
up the assembly standard library for Windows. However, it is not a major
priority for me to have everything working amazing under Windows.

MMIXAL will run on any platform that supports the binaries from Knuth, or even
potentially with GCC compilation--not used in this project. Otherwise, the NASM
and GAS (*.nasm, *.asm) assembly will only work on x86-64, including Linux,
FreeBSD, and Windows. The ARM64 assembly only works on MacOS with modern M*
processors.

## Basic Setup

For the most part, OS setup should follow general OS setup. I have provided some
tips that can help setup the base system for building packages in the various
languages given here.

All Linux variants should export variables for use in the `~/.bash_profile`.
FreeBSD should also have the same exports in `~/.profile`.
The TIMEOUT variable will be used on every call in `run.sh`. This sets how long the
command is allowed to run before it is killed. This is especially important on headless
VMs, but it is helpful generally. EIFFEL must be either `eiffelstudio` or `libertyeiffel`
based on what is available on the system. All eiffel files will build based on which
of these is entered. Simula uses the GCC13 to ensure that simula files are run on GCC13;
the intermediate code fails on GCC15.

If you use a docker, change the RUNONDOCKER to modify which languages run on which
docker container. Separate each langauge by a space, and after the name of the desired
language do an equal sign and then the name of the docker image to run the code with.
`ada=code-runner` means that Ada code will build with the code-runner docker image.

```bash
export DEREKALGOS_TIMEOUT="-k 10s 1m"
export DEREKALGOS_EIFFEL="eiffelstudio"
export DEREKALGOS_GCC13="/usr/x86_64-pc-linux-gnu/gcc-bin/13/"
export DEREKALGOS_GCC13NAME="x86_64-pc-linux-gcc"
export DEREKALGOS_GXX13NAME="x86_64-pc-linux-g++"

export DEREKALGOS_RUNONDOCKER="ada=code-runner asm=code-runner ballerina=code-runner freebasic=code-runner c=code-runner clojure=code-runner cobol=code-runner cpp=code-runner csharp=code-runner d=code-runner dart=code-runner eiffel=code-runner erlang=code-runner elixir=code-runner fortran=code-runner factor=code-runner fsharp=code-runner forth=code-runner gleam=code-runner go=code-runner haskell=code-runner haxe=code-runner icon=code-runner idris=code-runner java=code-runner julia=code-runner javascript=code-runner kit=code-runner kotlin=code-runner llvmir=code-runner lua=code-runner objectivec=code-runner modula3=code-runner octave=code-runner ocaml=code-runner mmixal=code-runner oberon=code-runner mojo=code-runner mercury=code-runner nasm=code-runner nim=code-runner pascal=code-runner php=code-runner prolog=code-runner perl=code-runner python=code-runner r=code-runner ruby=code-runner racket=code-runner rust=code-runner scala=code-runner scheme=code-runner simula=code-runner smalltalk=code-runner swift=code-runner tcl=code-runner typescript=code-runner v=code-runner visualbasic=code-runner wat=code-runner zig=code-runner"

export DEREKALGOS_RUNONSSH="forth=UBUNTURUNNER modula3=UBUNTURUNNER oberon=UBUNTURUNNER"
export DEREKALGOS_SSH_UBUNTURUNNER_PORT="2222"
export DEREKALGOS_SSH_UBUNTURUNNER_USER="coderun"
export DEREKALGOS_SSH_UBUNTURUNNER_ADDRESS="127.0.0.1"
export DEREKALGOS_SSH_UBUNTURUNNER_CODEDIR="/home/coderun/codefiles"
export DEREKALGOS_SSH_UBUNTURUNNER_STARTDIR="/home/coderun"
export DEREKALGOS_SSH_UBUNTURUNNER_RUNSCRIPT="../run.sh"
```

### Gentoo

I have created a [Gentoo setup resource](gentoo-setup.md) which describes the general
Gentoo process that I used to create systems that can run all of this code. This
is basically just a supplement to the Gentoo Handbook and does not add anything
unusual, really. There are no significant extra steps to add to a Gentoo setup,
beyond just installing more language support, thanks to already being a source
compiling distribution.

I assume Gentoo users know how to critically evaluate the suggested paths in
this document.

### Ubuntu

Any standard Ubuntu setup will create a workable environment. Once this is
complete, we also need to install some tools that will be used by many of
the languages, or in some cases in building the tools for some languages.

```bash
apt install build-essential libtool libtool-bin cmake libstdc++-13-dev git curl unzip xz-utils zip libglu1-mesa flex bison ninja-build
```

This will give us several GCC related tools, which will already give us some
of the language support we are looking for. It also enables us to build those
that don't come in nice apt packages.

On GCC versions, Ubuntu places them all in `/usr/bin` with just a bare version
number attached. So the export variables in `~/.bash_profile` will look as follows.

```bash
export DEREKALGOS_GCC13="/usr/bin"
export DEREKALGOS_GCC13NAME="gcc-13"
export DEREKALGOS_GXX13NAME="g++-13"
```

Additionally, Ubuntu has some deeper resources on how to install many
of the most common languages today.
[View the How-to guides](https://documentation.ubuntu.com/ubuntu-for-developers/howto/).
I will not try to go into the most depth, just choosing a common, simple route
and offering it if it works on my own system. Please do review the Ubuntu
documentation and make your own decisions as well for these common languages.

### FreeBSD

If you are going to run FreeBSD as a code server, you need to make sure that
you choose the SSH Daemon running on startup, or install it yourself. Otherwise,
there is not much more to do. The
[FreeBSD Handbook](https://docs.freebsd.org/en/books/handbook/bsdinstall/)
contains an excellent chapter on installing FreeBSD, as well as many other topics.

You should install `gdate` which `run.sh` uses to show the time in milliseconds
that it takes to compile and run the algorithms.

```sh
sudo pkg install gdate
```

### MacOS

The initial MacOS setup is basically as easy as Windows, but with the FreeBSD
background, it is a little bit easier for us to get more packages working
without major modification on MacOS. I use a Macbook Pro with an M5 chip,
which may impact the exact setup of this project, but most MacOS setups should
be pretty similar given the uniformity of them.

Start by ensuring the device is running the latest version of MacOS. I then
started the install with xcode. This prompted a GUI install of the development
tools that get the system overall started for programming. Then, we install
Homebrew, which will manage additional packages for us on MacOS. I had to launch
a new terminal for brew to still then be available.

```zsh
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew update
brew doctor
```

Once homebrew is installed, we use it to install coreutils and git, first of all.
These will be the foundations for allowing us to work with the project in general.

```zsh
brew install coreutils
brew install git
git --version
cd ~
curl -O https://raw.githubusercontent.com/nicolashery/mac-dev-setup/master/.gitconfig
git config --global user.name "Your Name Here"
git config --global user.email "your_email@youremail.com"
```

For VS Code, simply download it from the VS Code website and install by opening
the .dmg file from downloads and dragging the VS Code icon to the Applications
folder on screen.

The major point of the Mac OS part of this right now is to support assembly on
MacOS. The other languages should follow pretty standard practice. Note that
MacOS comes with Apple's version of clang installed and `gcc` pointing to it.
This is sufficient for the C code in this project without further modification,
but at the time of this writing, Apple's clang does not support features such
as generators in C++ that are used here. The run script is set to try this anyway
so that may change in the future.

For now, I would recommend using a VM with Ubuntu Server to run most
of the languages. If you decide to try moving forward, it will probably be
closer to the FreeBSD notes, but MacOS is still unique in many respects.

### Windows

I highly recommend starting a Windows setup for this project by installing Visual
Studio. The Community version is free and available for open source or similar
projects, though they want you to upgrade for commercial, etc. purporses. Even
Visual Studio Community, however, allows you to install the dotnet langauges for
this project, as well as python, node, and the Visual C++ compiler.

That said, I primarily use VS Code not the entire VS IDE for this project.
VS Code is a little bit lighter and the extensions are a little bit easier
to make work for this project. I do recommend going to the VS Code website
and downloading and installing it on Windows.

The next task is to install [git](https://gitforwindows.org). Download it from
their website and follow the install instructions. This should install Git Bash
along the way (if prompted, ensure to include it).

Instead of a separate build script, this project uses Git Bash on Windows to
run the code. This allows the same run and build script on all platforms.
It is not exactly the native choice on Windows, but it ends up working quite
well. This does mean you need to run the run script via `bash.exe`. The VS Code
settings provided will do this if you have the
[VS Code Settings for Mac Windows and Linux extension by franmastromarino](https://github.com/franmastromarino/vs-code-settings-os)
extension installed in VS Code alongside the code runner. Alternatively, you
can just run the build script from inside a Git Bash instance.

I install MingW for C/C++ because we do use GCC for this project, and there is
some point to reduce how much I have to change the run script for different
platforms. I suggest starting there as well, in the C and C++ sections.

Ultimately, Windows is a special kind of hell that does not play as well with
multiplatform code, let alone trying to install all of these languages in a way that
is easily accessible from a single central location. It is incredibly normal for
languages to recommend and even require setting up some special package manager
environment that you have to call into in order to use the tools. This would
be completely different from the run bash script style on every other platform.
The instructions here try to avoid the special environments and everything,
but the result is tons of painful overlap, and painful management of that
overlap. I am not going heavily into it here. I recommend just doing an Ubuntu
Server VM or WSL for a lot of the langauges on Windows.

## Setting up an Unbuntu Server VM as a Code Runner

A small collection of languages do not seem to like the Gentoo system. Unsurprisingly,
these tend to be older languages not necessarily built within modern systems
that Gentoo likes to stay on the bleeding edge with. There are a handful of ways
to consider fixing this, but the easiest is to just create a VM running Ubuntu Server
and setup the necessary packages on there. This section will describe how to setup
such a VM, briefly, using VirtualBox. I assume anyone wishing to go with another VM
software or anything more convoluted than presented here will be familiar with
VMs enough to guide those decisions.

### VirtualBox Setup (optional)

For the sake of documentation, I installed VirtualBox on Gentoo for this purpose with
the following commands.

```bash
emerge app-emulation/virtualbox app-emulation/virtualbox-additions
mkdir /etc/modules-load.d
nano /etc/modules-load.d/virtualbox.conf
```

Add the following lines:

```text
vboxdrv
vboxnetadp
vboxnetflt
```

Ensure systemd is working correctly with this, and do any rebuilds that may be necessary.

```bash
systemctl start systemd-modules-load
emerge @module-rebuild
```

### VM Setup

Setup a VM for running Ubuntu Server or FreeBSD. This should be pretty basic and
obvious to any VM software. In VirtualBox, you can simply select the iso and
select all your values.

For OS, Ubuntu Server is the best choice of Ubuntu. FreeBSD also works wonderfully
as a VM code server. These both come with SSH already running and setup for being
run headless. This way, we can have the VM running in the background
as just an SSH host.

A standard install should be enough to get going here. More RAM and CPU cores will
increase performance of the VM, but it also can prevent those resources being used
by the host. Use a reasonable amount. I find most of the languages for this are older
and not very resource intensive in any moment. It is worth making sure it can run
headless, since we can just ssh into it.

SSHD will run on port 22, but we do not always want to expose that on our
host machine. Instead, we will forward the SSH port 22 on the VM to the local port
2222 of our host for calling into. This works with the standard NAT networking.
To do this in Virtualbox, I run `ip a` to get the IP of the guest OS. This is used
in the Port Forwarding settings to forward port 22 of the guest to port 2222 of the host.

Now, on the guest OS, I run the following commands to create a `coderun` user
and the directory structure we will use to run the codes.

```bash
sudo mkdir --parents /home/coderun/codefiles/
sudo chmod a+wr /home/coderun/codefiles/
sudo adduser coderun
```

At this point, you can copy `run.sh` from this repository to `/home/coderun/run.sh`.
This will be used to run any code that is requested on the VM. Follow the Ubuntu
setup for any language that is desired to be run on the VM.

If you are on Ubuntu, we need the essential build setup.

```bash
apt install build-essential libtool libtool-bin cmake libstdc++-13-dev git curl unzip xz-utils zip flex bison ninja-build
```

### SSH Setup

On the host OS, we setup an easy SSH link to the guest and our coderun user. This
creates a special key so that we do not have to manually login with the password
every time. We can also test it to make sure that it works after.

```bash
ssh-keygen -t ed25519
ssh-copy-id -p 2222 coderun@127.0.0.1
ssh -p coderun@127.0.0.1 echo "test"
```

### Run.sh Environment Variables

Once languages are set up in the guest OS, we can specify that the project should
compile and run them on the VM by modifying the `DEREKALGOS_RUNONSSH` variable. The
best way to do this is by modifying your profile--`~/.bash_profile` on Linux and
`~/.profile` on FreeBSD--with the following lines,
and then running `source ~/.bash_profile` or `source ~/.profile`.

Especially on the host, OS, pay attention to `DEREKALGOS_RUNONSSH`. All
languages that should run on the VM are in this string in the host OS,
separated by a single space. This should probably be an empty string on the
guest OS, unless you want to setup a string of code running servers.
Separate each langauge by a space, and after the name of the desired
language do an equal sign and then the name of the VM to run the code with.
`ada=UBUNTURUNNER` means that Ada code will build with the UBUNTURUNNER VM.
The VMs are defined by the `DEREKALGOS_SSH_{VMNAME}_VAR` variables.

Additionally, on the guest OS, you should at least export the `DEREKALGOS_TIMEOUT`
environment variable in your profile.

For some languages, it is important that we always run code in GCC-13. However,
our default is to use GCC-15. For this purpose, we need to set `DEREKALGOS_GCC13`
to the directory that contains the gcc and g++ executables. Then
`DEREKALGOS_GCC13NAME` contains the name of the gcc 13 executable,
and `DEREKALGOS_GXX13NAME` contains the name of the g++ 13 executable. This
is required for e.g. Simula.

```bash
export DEREKALGOS_TIMEOUT="-k 10s 1m"
export DEREKALGOS_EIFFEL="eiffelstudio"
export DEREKALGOS_GCC13="/usr/x86_64-pc-linux-gnu/gcc-bin/13/"
export DEREKALGOS_GCC13NAME="x86_64-pc-linux-gcc"
export DEREKALGOS_GXX13NAME="x86_64-pc-linux-g++"
export DEREKALGOS_RUNONDOCKER=""
export DEREKALGOS_RUNONSSH="forth=UBUNTURUNNER modula3=UBUNTURUNNER oberon=UBUNTURUNNER"
export DEREKALGOS_SSH_UBUNTURUNNER_PORT="2222"
export DEREKALGOS_SSH_UBUNTURUNNER_USER="coderun"
export DEREKALGOS_SSH_UBUNTURUNNER_ADDRESS="127.0.0.1"
export DEREKALGOS_SSH_UBUNTURUNNER_CODEDIR="/home/coderun/codefiles"
export DEREKALGOS_SSH_UBUNTURUNNER_STARTDIR="/home/coderun"
export DEREKALGOS_SSH_UBUNTURUNNER_RUNSCRIPT="../run.sh"
```

### VM Hibernation

This is generally good enough to get going once we install the language support as
well. However, in Ubuntu Server, there is a significant issue that the VM will
hibernate and take tens of minutes to start up again at times. To fix this, we
need to turn off some services that will try to force it, and also update grub
settings to change how the OS is started. We start with disabling the services.

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

This alone has proved insufficient in my experieence as other services bypass and still
start a hibernation cycle. The deeper fix is to `nano /etc/default/grub` in
the guest OS, and change `GRUB_CMDLINE_LINUX_DEFAULT` to include `acpi=off apm=off`.
Then updating grub and restarting will result in a VM that is always on.

```bash
sudo update-grub
```

### Starting up VM on Startup

I have a startup script that is run on Gnome startup to ensure that the VM is
always running in the back. In this case, I named my VM "UbuntuCodeChild".

```bash
#! /bin/bash

is_vm_running() {
    VBoxManage list runningvms | grep -q "\"$1\""
}

VM_NAME="UbuntuCodeChild"
if is_vm_running $VM_NAME; then
    echo "The VirtualBox machine \"${VM_NAME}\" is already running."
else
    echo "The VirtualBox machine \"${VM_NAME}\" is not running. Starting it now..."
    VBoxManage startvm "${VM_NAME}" --type headless
fi
```

## VSCode

I primarily use VS Code as my IDE of sorts for this project. Other editors are
easily used, if you want.

The easiest way in most places is to download the install package from the VS Code
website. There is a deb for Ubuntu there. In Gentoo, it is as easy as
`sudo emerge -av vscode`.

I highly recommend the
[VS Code Settings for Mac Windows and Linux extension by franmastromarino](https://github.com/franmastromarino/vs-code-settings-os).
This project effectively utilizes this extension in the
.vscode folder to have varied settings based on the OS that is currently
being run on.

Another recommendation is the
[Material Design Icon Theme Extension](https://github.com/material-extensions/vscode-material-icon-theme).
This makes looking at a list of files in 60 different
programming languages a little bit easier on the eyes in my opinion, and
I have provided settings that work with this extension.

In order to get all of the icons for every language, you will need to copy any
missing icons from the `icon` folder in this repository into the appropriate
folder for the VS Code extension. This is usually in somewhere like `~/.vscode`
and it takes a little bit of looking.

Furthermore, I largely use the
[Code Runner Extension by Jun Han](https://github.com/formulahendry/vscode-code-runner)
in order to provide easy access. The settings files in `.vscode` include
instructions for this extension to run each language via the run
script included in the project.

## Ada

We use the GNAT toolchain here.

### Ada on Gentoo

We have to add the `ada` USE flag to gcc and, if necessary, rebuild GCC with the
new flag.

```bash
emerge -p gcc
echo "sys-devel/gcc ada" >> /etc/portage/package.use/gcc
emerge -avU gcc
gnatmake --version
```

### Ada on Ubuntu

We need to isntall GNAT, which is kindly on apt for easy install.

```bash
sudo apt install gnat
gnatmake --version
```

### Ada on FreeBSD

We can get GNAT from pkg. The simplest includes GNAT 12, but we
can get GNAT 14 as well if we want.

```sh
sudo pkg install gmake gprbuild gnat12 git gnupg alire
```

I ran into some issues here. Because I had multiple versions of GCC
installed already, and gprbuild wants to install GCC12 for yet another,
neither gnat12 nor gnat14 ended up actually installing properly on
my VM. Rather, I got a nice little package of executables to do with
what I wanted. This includes versions of GCC, so there is some
apprehension about just extracting it and setting it as path. That said,
the basic idea of how to get them and make them usable, if you use it
cautiously...

```sh
tar xvf /usr/local/share/gnat14/assets/gnat-x86_64-freebsd.15-14.2.0.tar.xz
cd gnat-x86_64-freebsd.15-14.2.0
mkdir ~/.local
mv -fv ./* ~/.local
```

Then you can export variables to access them well.

```sh
export PATH="$HOME/.local/bin/:$PATH"
export LD_LIBRARY_PATH="$HOME/.local/lib/:$LD_LIBRARY_PATH"
export LIBRARY_PATH="$HOME/.local/lib/:$LIBRARY_PATH"
export C_INCLUDE_PATH="$HOME/.local/include/:$C_INCLUDE_PATH"
export CPP_INCLUDE_PATH="$HOME/.local/include/:$CPP_INCLUDE_PATH"
```

### Ada on Windows

The run script for this project is built for just a normal gnatmake setup.
You can try to set that up, but it is kind of a pain. This is so easy to
get working on Linux, I do not want to move forward with the pain that is
Windows. You can try some things to make this work if you want, including
an Ubuntu Server VM or try one of the existing distribution methods and
see if you can make it work.

## Assembly

We support 3 kinds of native assembly in this project (see also MMIXAL,
WASM, and LLVM IR for other low level "assembly" type languages). This
includes NASM and GAS/AT&T on x86-64 and ARM64 for Apple hardware.
Linux, FreeBSD, and Windows will focus on NASM and GAS. Apple hardware will
focus on the ARM64 assembly

### Assembly on Gentoo

NASM is one simple package in protage. Otherwise, `as` should be installed
as part of gcc.

```bash
emerge -av dev-lang/nasm
nasm -v
as -v
ld -v
```

### Assembly on Ubuntu

This is also very easy on apt for nasm, and asm and ld will be installed
as part of GCC (see C/C++).

```bash
sudo apt install nasm
nasm -v
```

### Assembly on FreeBSD

This is also very easy on pkg for nasm, and asm and ld will be installed
as part of GCC (see C/C++).
The Netwide Assembler is available on pkg.

```sh
pkg install nasm
```

### Assembly on MacOS

Apple comes with a build of clang that includes `as` that we will use to
assembly ARM64 code. No further action is required.

You can also install NASM and GNU as/ld if you want to play with them,
but they are not as well supported on Apple hardware.

```zsh
brew install nasm
nasm --version
```

### Assembly on Windows

NASM and GNU as come along with mingw, which we can utilize immediately.
You can start at the [MingW Website](https://www.mingw-w64.org/).

We will go with a [WinLibs](https://winlibs.com/) route about this. We need
both GCC 15 and GCC 13, and this is somewhat easier with the winlibs route.
We just download zip files for version 15 and version 13. We can do the latest
of both for Win64.

Personally, I placed the contents of the version 15 package such that bin,
etc. were directly in $HOME/.local. I also placed version 13 alongside in
its own mingw13 folder within $HOME/.local. As long as you know where these are
and can use both, you can use your own layout as you wish.

You need to open $HOME/.bash_profile and add the following exports to the
extracted binaries. This assumes the $HOME/.local layout; change as required
for your own layout.

Pay careful attention to the last variable, as this is used specifically
with the assembly. You need to set this to the lib directory from mingw that
contains libkernel32.a and other files that allow for linking to Windows OS.

```bash
export PATH="$HOME/.local/bin:$PATH"
export CC="$HOME/.local/bin/x86_64-w64-mingw32-gcc.exe"
export CXX="$HOME/.local/bin/x86_64-w64-mingw32-g++.exe"
export FC="$HOME/.local/bin/x86_64-w64-mingw32-gfortran.exe"
export F77="$HOME/.local/bin/x86_64-w64-mingw32-gfortran.exe"
export LD="$HOME/.local/bin/ld.exe"
export AR="$HOME/.local/bin/x86_64-w64-mingw32-gcc-ar.exe"
export RANLIB="$HOME/.local/bin/x86_64-w64-mingw32-gcc-ranlib.exe"
export WINDRES="$HOME/.local/bin/windres.exe"
export RC="$HOME/.local/bin/windres.exe"
export NM="$HOME/.local/bin/x86_64-w64-mingw32-gcc-nm.exe"
export DLLTOOL="$HOME/.local/bin/dlltool.exe"
export STRIP="$HOME/.local/bin/strip.exe"
export PKG_CONFIG="$HOME/.local/bin/pkgconf.exe"
export LD_ADDITIONAL_DIRECTORY="$HOME/.local/x86_64-w64-mingw32/lib/"
```

We can then test this in a Git Bash.

```bash
. ~/.bash_profile
gcc --version
```

## Ballerina

Ballerina requires Java. The
[Installation Options](https://ballerina.io/downloads/installation-options/)
states that Java version 11 is required for Update 7 and below,
Java version 17 for Updates 8, 9, and 10, and Java 21 for
Update 11 and above.

### Ballerina on Gentoo

First, ensure Java is already installed. See Java.

We can download the language ZIP file from the
[Installation Options](https://ballerina.io/downloads/installation-options/)
and continue with installation from there.

At the location of the zip file, we unzip it and then we just have to find
the binary and create a link to it in our PATH somewhere. I use `~/bin` but
this is entirely optional. As long as it is in your PATH, or you add the location
to PATH in `~/.bash_profile`

```bash
unzip ballerina-2201.13.1-swan-lake.zip
# you can move the files that are extracted, etc. as you need
# if you need a link, something like the following will put the link
# at ~/bin/bal, so if ~/bin is in PATH, it's callable
ln -s /home/USER/path-to-ballerina-bins/bin/bal ~/bin/bal
bal --version
```

### Ballerina on Ubuntu

I needed to make sure that Java was installed first, despite having a .deb. See Java.

For Ubuntu, we download Ballerina right from the
[Downloads](https://ballerina.io/downloads/) page on their website, for us in deb form.
Simply install this, and Ballerina is up and going.

```bash
bal --version
```

### Ballerina on FreeBSD

Ballerina runs on Java, so maybe we can look at how to get support. Immediately, it
is noted that there are bash scripts that run the underlying java. However, they
require bash. They may be able to be modified. I have decided not to try at this point.

### Ballerina on Windows

You can just download and install the MSI from the
[Downloads page](https://ballerina.io/downloads/).

Consider installing Java first, to get it out of the way. It is not a strict
requirement before the install, however.

You will then need to make sure that it is in PATH for Git Bash.
You could just use an alias for this, since we want `bal` and not `bal.bat`
so need an alias anyway. I show adding to
PATH anyway for verbosity. Edit `C:\Users\YOURUSER\.bash_profile`

```bash

export PATH="/c/Program Files/Ballerina/bin:$PATH"
alias bal="bal.bat"
```

## C

We use GCC on Linux.

### C on Gentoo

We have to install GCC on Gentoo during OS install, so we already have the basics.

```bash
gcc --version
```

If you somehow did an LLVM build or the like, it is a simple portage call, at least.
Alter the USE variables if necessary.

```bash
emerge -av gcc
```

For some languages, I needed to get GCC 13 in a slot and set environment settings
for some of their packages. Installing the extra slot is simple enough on a fresh
install, but you may need to disable specific USE flags if you get circular
dependency issues.

```bash
emerge -av =sys-devel/gcc-13*
```

You can switch between these with `gcc-config [GCC-INSTANCE]`.
Use `gcc-config -l` to view all available instances that you can set to.

### C on Ubuntu

We have installed GCC on Ubuntu at the start of this document via `build-essential`,
so we already have the basics. We can view the version that was installed to be sure.

```bash
gcc --version
```

If needed, it is otherwise simple.

```bash
apt install gcc
```

If we get a version below 15 and have any issues with modern code, we can update
to 15 by the adding the testing PPA, and then managing the g++ version
via update-alternatives.

```bash
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
apt install gcc
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-13 110
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-15 220
sudo update-alternatives --config gcc
gcc --version
```

### C on FreeBSD

The default compiler on FreeBSD that usually comes preinstalled is Clang,
which we use for some purposes. However, we primarily favor GCC for C/C++,
and it is also required for several other builds.

GCC is available on pkg in multiple versions.

```sh
pkg install gcc gcc13 gcc15
```

FreeBSD does not have the same kind of tooling available for managing
multiple versions of GCC in a single place. Rather, we will need to be prepared
to play with simlinks, PATH, and linker environment variables to make
sure everything stays good. A quick hack that is used in the run script,
you can create symlinks in a folder and specify that directory first in
PATH. You can use `whereis gcc` and similar to find the exact location
of the executables you will link to.

```sh
whereis gcc15
mkdir -p $HOME/links
ln -s /usr/local/bin/gcc15 $HOME/links/gcc
PATH="$HOME/links/:$PATH" gcc --version
```

### C on Windows

You can play with Visual C++ for C code if you want, but this project uses
GCC on all platforms, so we are going to look at mingw here. You can start
at the [MingW Website](https://www.mingw-w64.org/).

We will go with a [WinLibs](https://winlibs.com/) route about this. We need
both GCC 15 and GCC 13, and this is somewhat easier with the winlibs route.
We just download zip files for version 15 and version 13. We can do the latest
of both for Win64.

Personally, I placed the contents of the version 15 package such that bin,
etc. were directly in $HOME/.local. I also placed version 13 alongside in
its own mingw13 folder within $HOME/.local. As long as you know where these are
and can use both, you can use your own layout as you wish.

You need to open $HOME/.bash_profile and add the following exports to the
extracted binaries. This assumes the $HOME/.local layout; change as required
for your own layout.

```bash
export PATH="$HOME/.local/bin:$PATH"
export CC="$HOME/.local/bin/x86_64-w64-mingw32-gcc.exe"
export CXX="$HOME/.local/bin/x86_64-w64-mingw32-g++.exe"
export FC="$HOME/.local/bin/x86_64-w64-mingw32-gfortran.exe"
export F77="$HOME/.local/bin/x86_64-w64-mingw32-gfortran.exe"
export LD="$HOME/.local/bin/ld.exe"
export AR="$HOME/.local/bin/x86_64-w64-mingw32-gcc-ar.exe"
export RANLIB="$HOME/.local/bin/x86_64-w64-mingw32-gcc-ranlib.exe"
export WINDRES="$HOME/.local/bin/windres.exe"
export RC="$HOME/.local/bin/windres.exe"
export NM="$HOME/.local/bin/x86_64-w64-mingw32-gcc-nm.exe"
export DLLTOOL="$HOME/.local/bin/dlltool.exe"
export STRIP="$HOME/.local/bin/strip.exe"
export PKG_CONFIG="$HOME/.local/bin/pkgconf.exe"
export LD_ADDITIONAL_DIRECTORY="$HOME/.local/x86_64-w64-mingw32/lib/"
```

We can then test this in a Git Bash.

```bash
. ~/.bash_profile
gcc --version
```

## C++

We use GCC on Linux.

### C++ on Gentoo

We have to install GCC on Gentoo during OS install, so we already have the basics.

```bash
g++ --version
```

If you somehow did an LLVM build or the like, it is a simple portage call, at least.
Note that g++ is typically installed in Gentoo as part of the GCC package.
Alter the USE variables if necessary. The `cxx` flag is usually already enabled.

```bash
emerge -av gcc
```

For some languages, I needed to get GCC 13 in a slot and set environment settings
for some of their packages. Installing the extra slot is simple enough on a fresh
install, but you may need to disable specific USE flags if you get circular
dependency issues.

```bash
emerge -av =sys-devel/gcc-13*
```

You can switch between these with `gcc-config [GCC-INSTANCE]`.
Use `gcc-config -l` to view all available instances that you can set to.

### C++ on Ubuntu

We have installed GCC on Ubuntu at the start of this document via `build-essential`,
so we already have the basics. We can view the version that was installed to be sure.

*Quick warning*: The code in this repository was coded on Gentoo, where I immediately
had access to GCC 15. This means I am already using modern C++ that is not available
on Ubuntu without adding testing repositories. This may change as Ubuntu upgrades, etc.

```bash
g++ --version
```

If we get a version below 15, we can update to 15 by the adding the testing PPA,
and then managing the g++ version via update-alternatives.

```bash
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
apt install g++
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-13 110
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-15 220
sudo update-alternatives --config g++
g++ --version
```

### C++ on FreeBSD

The default compiler on FreeBSD that usually comes preinstalled is Clang,
which we use for some purposes. However, we primarily favor GCC for C/C++,
and it is also required for several other builds.

GCC is available on pkg in multiple versions.

```sh
pkg install gcc gcc13 gcc15
```

FreeBSD does not have the same kind of tooling available for managing
multiple versions of GCC in a single place. Rather, we will need to be prepared
to play with simlinks, PATH, and linker environment variables to make
sure everything stays good. A quick hack that is used in the run script,
you can create symlinks in a folder and specify that directory first in
PATH. You can use `whereis gcc` and similar to find the exact location
of the executables you will link to.

```sh
whereis gcc15
mkdir -p $HOME/links
ln -s /usr/local/bin/gcc15 $HOME/links/gcc
ln -s /usr/local/bin/g++15  $HOME/links/g++
PATH="$HOME/links/:$PATH" gcc --version
```

### C++ on Windows

You can play with Visual C++ for C++ code if you want, but this project uses
GCC on all platforms, so we are going to look at mingw here. You can start
at the [MingW Website](https://www.mingw-w64.org/).

We will go with a [WinLibs](https://winlibs.com/) route about this. We need
both GCC 15 and GCC 13, and this is somewhat easier with the winlibs route.
We just download zip files for version 15 and version 13. We can do the latest
of both for Win64.

Personally, I placed the contents of the version 15 package such that bin,
etc. were directly in $HOME/.local. I also placed version 13 alongside in
its own mingw13 folder within $HOME/.local. As long as you know where these are
and can use both, you can use your own layout as you wish.

You need to open $HOME/.bash_profile and add the following exports to the
extracted binaries. This assumes the $HOME/.local layout; change as required
for your own layout.

```bash
export PATH="$HOME/.local/bin:$PATH"
export CC="$HOME/.local/bin/x86_64-w64-mingw32-gcc.exe"
export CXX="$HOME/.local/bin/x86_64-w64-mingw32-g++.exe"
export FC="$HOME/.local/bin/x86_64-w64-mingw32-gfortran.exe"
export F77="$HOME/.local/bin/x86_64-w64-mingw32-gfortran.exe"
export LD="$HOME/.local/bin/ld.exe"
export AR="$HOME/.local/bin/x86_64-w64-mingw32-gcc-ar.exe"
export RANLIB="$HOME/.local/bin/x86_64-w64-mingw32-gcc-ranlib.exe"
export WINDRES="$HOME/.local/bin/windres.exe"
export RC="$HOME/.local/bin/windres.exe"
export NM="$HOME/.local/bin/x86_64-w64-mingw32-gcc-nm.exe"
export DLLTOOL="$HOME/.local/bin/dlltool.exe"
export STRIP="$HOME/.local/bin/strip.exe"
export PKG_CONFIG="$HOME/.local/bin/pkgconf.exe"
export LD_ADDITIONAL_DIRECTORY="$HOME/.local/x86_64-w64-mingw32/lib/"
```

We can then test this in a Git Bash.

```bash
. ~/.bash_profile
g++ --version
```

## C\#

We have 2 options for any dotnet language on Linux these days. I use the
native dotnet package from Microsoft. Alternatively, mono is available and
used.

Microsoft has instructions for multiple flavors of linux available at
[on their website](https://learn.microsoft.com/en-us/dotnet/core/install/linux).\

Once installed, you can then run `dotnet --list-sdks` to see what SDKs are
installed, for example.

### C\# on Gentoo

We use the manual install scripts to install dotnet under Gentoo.

Ensure the following dependencies are already installed (usually are
in Gentoo): ca-certificates, libc6, libgcc-s1, libgssapi-krb5-2,
libicu74, libssl3t64, libstdc++6, tzdata, zlib1g

Running the following as root in a terminal will install dotnet for all users
on a gentoo machine.

Note: It can be worth it to keep the dotnet-install.sh around to upgrade to new
versions of .NET as they are released. You can also do the manual installation
specified by Microsoft, but I find the script helpful and easy.

```bash
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x ./dotnet-install.sh
mkdir /usr/share/dotnet
./dotnet-install.sh --version latest --install-dir /usr/share/dotnet
./dotnet-install.sh --version latest --runtime aspnetcore --install-dir /usr/share/dotnet
ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet
```

### C\# on Ubuntu

Ubuntu manages the SDK version via apt that works quite well system wide.
For the latest versions, you can consider including the test PPA. The test
repository is commented here.

```bash
# sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt install --install-suggests dotnet-sdk-10.0
```

### C\# on FreeBSD

The FreeBSD team has made .NET surprisingly easy for not being so immediately
supported on official channels. It is not always up to the latest version, but
is often on its way.

```sh
sudo pkg install dotnet
dotnet --version
dotnet --list-sdks
dotnet --list-runtimes
```

### C\# on Windows

The suggested route for this document is to navigate to the Visual Studio
website and download the Community version. This will give a Visual Studio
installer tool that allows many selections. Install all that you might
want, including .NET.

In a Powershell, you can check the full info on dotnet in a single command.

```powershell
dotnet --info
```

## Clojure

We use the Leiningen tool on Linux. On any distribution, this requires Java.
See Java.

Once java is installed, all Linux flavors use the lein script. FreeBSD uses
`pkg install` easily enough.

```bash
# Linux
wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein
sudo chmod a+x ./lein
sudo mv -vf ./lein /usr/bin/lein
lein
```

```sh
# FreeBSD
sudo pkg install leiningen
lein
```

Then `nano ~/.lein/profiles.clj` and add the following line.

```clj
{:user {:plugins [[lein-exec "0.3.7"]]}}
```

If you run `lein` again, you will see it pull in the new plugin. This will
then allow running `lein exec file.clj` on any well structured Clojure file,
as we do in this project.

## COBOL

We use the GNU COBOL compiler on Linux.

### COBOL on Gentoo

This is present in portage at version 3, which fits the needs for this project.

```bash
emerge -av dev-lang/gnucobol
cobc --version
```

### COBOL on Ubuntu

This is present in apt at version 3 as default, which fits the needs for
this project.

```bash
sudo apt install gnucobol
cobc --version
```

### COBOL on FreeBSD

Another easy one with pkg.

```sh
sudo pkg install gnucobol
cobc --version
```

### COBOL on Windows

You can download some binaries are recent as 2023 from
[Arnold Trembley's website](https://www.arnoldtrembley.com/GnuCOBOL.htm).

These end up conflicting with other GCC binaries and such without using some
convoluted special environment and package manager. These do not click as well
with the script for every other OS, so we avoid it. I opted not to continue
here, but it is available and possible if you want to do the work.

## D

We use the standard D compiler on Linux.

### D on Gentoo

We can just emerge `dev-lang/dmd` to get going with D.

```bash
emerge -av dev-lang/dmd
dmd --version
```

### D on Ubuntu

For Ubuntu, there is no apt package, but it is available on snap.

```bash
sudo snap install --classic dmd
dmd --version
```

### D on FreeBSD

For FreeBSD, we can use the
[Official Install Script](https://dlang.org/install.html), if we
install bash, first. For the most part, I do avoid using bash, and in fact
avoided actually going furthere here. This is a reference so you can
consider the requirements.

```sh
sudo pkg install bash
curl https://dlang.org/install.sh | bash -s
```

### D on Windows

We just download and run the installer from the
[D Language website](https://dlang.org/download.html).

Once it is installed, you should find a `dmd2vars64.bat` file in `C:\D\` or
wherever you installed D. This will contain a good hint of the PATH variables
that we need to add to `~/.bash_profile` as follows. Note, we also add an
alias so we don't have to add .exe to everything. There are other commands you
can add an alias to if you want, but the run script does not require any more.

```bash
export PATH="/c/D/dmd2/windows/bin;$PATH"
export PATH="/c/D/dmd2/windows/bin64:$PATH"
alias dmd="dmd.exe"
```

## Dart

We use the standard Dart compiler on Linux. This is actually quite strange
because the easiest way is to install it through VS Code.
I have the instructions to install and setup VS Code as a base above, so this
will assume that it is already there.

You can see the
[Official Flutter Docs](https://docs.flutter.dev/install/quick)
to see these steps in a bit more detail and laid out wider, but it is weird
but simple.

Launch VS Code, and navigate to the Extensions. Search for Flutter and install
the Flutter extension. This is just the core Flutter extension from Dart Code.

Once installed, use `Ctrl + Shift + P` to open the command pallet, and type in
`New Project`. Find the `Flutter > New Project` and click enter.
This will present a small prompt in the VS Code notifications to download and
install the Flutter SDK. Do this. Pick a good source code folder for the
SDK to be downloaded into, and then wait.

When it is complete, you will be prompted to add it to your PATH. Go ahead and
say Yes.

I found that this made an appropriate entry in my `~/.bash_profile` but
in some cases, until reboot, I did have to do a `source ~/.bash_profile` in order
to access dart. On Windows, I had to restart any Git Bash instances for the
change to take full effect.

```bash
dart --version
```

### Dart and FreeBSD

Looking over the Dart Language GitHub discussions, the team does not consider
any flavor of BSD viable for them in terms of human resources to support. This
is somewhat unfortunate, but maybe in the future.

## Eiffel

We use the standard, open source EiffelStudio compiler. This is available for
both Linux and FreeBSD (and many others).

It should be noted that EiffelStudio is a licensed product with a complete,
interesting IDE for development. The compiler is dual licensed, requiring
a commercial paid license for continued commerical use. Open source software
may continue to use it under an open source license. The code in this project
is all being released under the MIT license and for educational purposes only.
As such, we take advantage of the open source license.

A note on Ubuntu: The EiffelStudio website mentions a route using a custom PPA,
but that did not have any packages for 24.04, here in 2026, so I found it highly
unreliable and went the same path as I did for Gentoo.

Download EiffelStudio from the [Eiffel website](https://account.eiffel.com/downloads/).

Consult their
[Linux Installation Instructions](https://www.eiffel.org/doc/eiffelstudio/Linux) Or
[FreeBSD Installation Instructions](https://www.eiffel.org/doc/eiffelstudio/FreeBSD)
for more instructions, this is just a simple walkthrough, leaning towards Linux.

EiffelStudio itself is a graphic IDE, so it requires a graphical environment like
wayland or X going. It will not work great for headless server situations.

I downloaded it via browser and then continued to move it to `/usr/local` for
installation across the system in that folder.

```bash
sudo su
mv /home/USER/Downloads/Eiffel_*.tar.bz2 /usr/local
cd /usr/local
tar xvfj ./Eiffel_*.tar.bz2
exit
```

We then need to set some variables, so we can set these in `~/.bash_profile`.
Change the version number as appropriate for what you are installing.

```text
export ISE_EIFFEL=/usr/local/Eiffel_25.12
export ISE_PLATFORM=linux-x86-64
export PATH=$PATH:$ISE_EIFFEL/studio/spec/$ISE_PLATFORM/bin
```

You may have to do a `source ~/.bash_profile` but you should see the `ec` command.

Before going any further, I suggest running `estudio`. You might consider logging in
and having this IDE available longer than the guest period, if that is your thing.
However, even if only as a guest, making a basic empty project and running it in here
seems to set the system up so that `ec` happily compiles. If you are getting
a lot of errors and failures, try this.

You should now be able to run code with the `run.sh` script for EiffelStudio in this
project.

## Elixir

We use the standard Elixir tool on Linux.

### Elixir on Gentoo

Elixir is available on portage.

```bash
emerge -av dev-lang/elixir
elixir --version
```

### Elixir on Ubuntu

Ubuntu tends to lag behind, so it is an install script.

```bash
curl -fsSO https://elixir-lang.org/install.sh
sh install.sh elixir@1.19.5 otp@28.1
```

Then `nano ~/.bash_profile` and add the following lines:

```text
export PATH=$HOME/.elixir-install/installs/otp/28.1/bin:$PATH
export PATH=$HOME/.elixir-install/installs/elixir/1.19.5-otp-28/bin:$PATH
```

Finally, we can run it.

```bash
source ~/.bash_profile
iex --version
```

### Elixir on FreeBSD

This is available on pkg, and will also install Erlang.

```sh
sudo pkg install elixir
iex --version
```

### Elixir on Windows

Finish the Erlang install first. Then go to the
[Elixir Website](https://elixir-lang.org/install.html#windows).
Download and install Elixir for the appropriate Erlang version.
The installer offers to add to your PATH, and you should. Then
restarting any Git Bash will be enough.

```bash
iex --version
```

## Erlang

We use the standard Erlang tool on Linux.

### Erlang on Gentoo

Erlang is available on portage.

```bash
emerge -av dev-lang/erlang
erl
```

### Erlang on Ubuntu

Erlang is available on apt in a usable manner.

```bash
sudo apt install erlang
erl
```

### Erlang on FreeBSD

This is available on pkg.

```sh
sudo pkg install erlang
erl
```

### Erlang on Windows

You can download an installer off the
[Erlang website](https://www.erlang.org/downloads).

I had to add the bin directory for the install made from that to my PATH
for Git Bash. While there, I made an alias to not need the .exe part.

```bash
export PATH="/c/Program Files/Erlang OTP/bin:$PATH"
alias erl="erl.exe"
alias erlc="erlc.exe"
```

## F\#

We have 2 options for any dotnet language on Linux these days. I use the
native dotnet package from Microsoft. Alternatively, mono is available and
used.

Microsoft has instructions for multiple flavors of linux available at
[on their website](https://learn.microsoft.com/en-us/dotnet/core/install/linux).\

Once installed, you can then run `dotnet --list-sdks` to see what SDKs are
installed, for example.

### F\# on Gentoo

We use the manual install scripts to install dotnet under Gentoo.

Ensure the following dependencies are already installed (usually are
in Gentoo): ca-certificates, libc6, libgcc-s1, libgssapi-krb5-2,
libicu74, libssl3t64, libstdc++6, tzdata, zlib1g

Running the following as root in a terminal will install dotnet for all users
on a gentoo machine.

Note: It can be worth it to keep the dotnet-install.sh around to upgrade to new
versions of .NET as they are released. You can also do the manual installation
specified by Microsoft, but I find the script helpful and easy.

```bash
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x ./dotnet-install.sh
mkdir /usr/share/dotnet
./dotnet-install.sh --version latest --install-dir /usr/share/dotnet
./dotnet-install.sh --version latest --runtime aspnetcore --install-dir /usr/share/dotnet
ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet
```

### F\# on Ubuntu

Ubuntu manages the SDK version via apt that works quite well system wide.
For the latest versions, you can consider including the test PPA. The test
repository is commented here.

```bash
# sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt install --install-suggests dotnet-sdk-10.0
```

### F\# on FreeBSD

The FreeBSD team has made .NET surprisingly easy for not being so immediately
supported on official channels. It is not always up to the latest version, but
is often on its way.

```sh
sudo pkg install dotnet
dotnet --version
dotnet --list-sdks
dotnet --list-runtimes
```

### F\# on Windows

The suggested route for this document is to navigate to the Visual Studio
website and download the Community version. This will give a Visual Studio
installer tool that allows many selections. Install all that you might
want, including .NET.

In a Powershell, you can check the full info on dotnet in a single command.

```powershell
dotnet --info
```

## Factor

We use the standard Factor tool. To get this, navigate to the
[Factor website](https://factorcode.org) and download the tar.gz package.
I assume that the tar.gz is downloaded to `~`. Adjust your own
actions accordingly.

### Factor on Gentoo and Ubuntu

This is the same process for all versions of Linux.

```bash
tar zxvf factor-linux-*.tar.gz
cd factor
```

Then `nano ~/.bash_profile` to add the factor directory to PATH. Note, however,
that many linux machines come with a `factor` in `/usr/bin` that calculates a factor.
If anything in your system is expecting this from your user, this could be
problematic. You will need to consider this yourself.

```bash
export PATH=$HOME/factor:$PATH
```

After doing `source ~/.bash_profile` we should then be able to get coding
with factor.

```bash
factor --version
```

### Factor on FreeBSD

Unfortunately, it does not have a formally supported FreeBSD version. We
can try to build it from source with the Linux style if we want, but I am not
going to include that here.

### Factor on Windows

Windows is not really well supported for this project. You can download the Zip,
and extract it somewhere. Double click the `factor.exe` to open the GUI. The
structure of this GUI and not really having a file run mechanism in Windows
means that it does not work for our needs. However, you can play with it.

You can add the factor directory to your PATH in `.bash_profile`, still.
This example demonstrates it in your user profile.

```bash
export PATH="/c/Users/YOURUSER/factor:$PATH"
alias factor="factor.exe"
```

## Forth

We use the GNU Forth tool on Linux.

### Forth on Gentoo

I struggled with Gentoo at first, but I was able to get the portage package to
work for me. I just had to make it use GCC 13 when I was compiling. To do this,
I used `gcc-config` before and after the emerge.

```bash
gcc-config x86_64-pc-linux-gnu-13
. /etc/profile
emerge -av gforth
gcc-config x86_64-pc-linux-gnu-15
. /etc/profile
gforth --version
```

### Forth on Ubuntu

You can in fact just install gforth from apt easily enough. In my experience,
it is also quite easy to build the latest version from source with standard means.

```bash
sudo apt install gforth
gforth --version
```

### Forth on FreeBSD

This is pretty easily available on pkg.

```sh
sudo pkg install gforth
gforth --version
```

### Forth on Windows

The way to move forward with forth on Windows is to build gforth yourself
from the source code. I am not doing that, but Windows is an officially
supported platform in the documentation.

## Fortran

We use the GNU Fortran tool on Linux.

### Fortran on Gentoo

We have to add the `fortran` USE flag to gcc and, if necessary, rebuild GCC with the
new flag.

```bash
emerge -p gcc
# If you already have the ada flag, you can skip the next 2 lines
echo "sys-devel/gcc fortran" >> /etc/portage/package.use/gcc
emerge -avU gcc
gfortran --version
```

### Fortran on Ubuntu

We need to isntall gfortran, which is kindly on apt for easy install.

```bash
sudo apt install gfortran
gnatmake --version
```

### Fortran on FreeBSD

This was installed as part of the GCC package. See C or C++.

### Fortran on Windows

You can play with Visual C++ for C++ code if you want, but this project uses
GCC on all platforms, so we are going to look at mingw here. You can start
at the [MingW Website](https://www.mingw-w64.org/).

We will go with a [WinLibs](https://winlibs.com/) route about this. We need
both GCC 15 and GCC 13, and this is somewhat easier with the winlibs route.
We just download zip files for version 15 and version 13. We can do the latest
of both for Win64.

Personally, I placed the contents of the version 15 package such that bin,
etc. were directly in $HOME/.local. I also placed version 13 alongside in
its own mingw13 folder within $HOME/.local. As long as you know where these are
and can use both, you can use your own layout as you wish.

You need to open $HOME/.bash_profile and add the following exports to the
extracted binaries. This assumes the $HOME/.local layout; change as required
for your own layout.

```bash
export PATH="$HOME/.local/bin:$PATH"
export CC="$HOME/.local/bin/x86_64-w64-mingw32-gcc.exe"
export CXX="$HOME/.local/bin/x86_64-w64-mingw32-g++.exe"
export FC="$HOME/.local/bin/x86_64-w64-mingw32-gfortran.exe"
export F77="$HOME/.local/bin/x86_64-w64-mingw32-gfortran.exe"
export LD="$HOME/.local/bin/ld.exe"
export AR="$HOME/.local/bin/x86_64-w64-mingw32-gcc-ar.exe"
export RANLIB="$HOME/.local/bin/x86_64-w64-mingw32-gcc-ranlib.exe"
export WINDRES="$HOME/.local/bin/windres.exe"
export RC="$HOME/.local/bin/windres.exe"
export NM="$HOME/.local/bin/x86_64-w64-mingw32-gcc-nm.exe"
export DLLTOOL="$HOME/.local/bin/dlltool.exe"
export STRIP="$HOME/.local/bin/strip.exe"
export PKG_CONFIG="$HOME/.local/bin/pkgconf.exe"
export LD_ADDITIONAL_DIRECTORY="$HOME/.local/x86_64-w64-mingw32/lib/"
```

We can then test this in a Git Bash.

```bash
. ~/.bash_profile
gfortran --version
```

## FreeBASIC

We use the standard FreeBASIC tool on Linux.

### FreeBASIC on Gentoo

The FreeBASIC compiler is available on portage.

```bash
emerge -av dev-lang/fbc
fbc --version
```

### FreeBASIC on Ubuntu

Go to [The FreeBASIC Website](https://freebasic.net) and download the
latest version of FreeBASIC from sourceforge. This will give you a deb file
you can install through the ordinary package manager.

This failed to install a required libtinfo5, and this appears not to
exist on Ubuntu repositories any more. So we need to manually install that.

```bash
sudo apt update
wget http://security.ubuntu.com/ubuntu/pool/universe/n/ncurses/libtinfo5_6.3-2ubuntu0.1_amd64.deb
sudo apt install ./libtinfo5_6.3-2ubuntu0.1_amd64.deb
fbc --version
```

### FreeBASIC on FreeBSD

FreeBASIC does offer official FreeBASIC packages for FreeBSD on their
[GitHub Releases](https://github.com/freebasic/fbc/releases). Here, I just copy
all of the files from the extract to local PATH directories.

```sh
tar xvf FreeBASIC-1.10.1-freebsd-x86_64.tar.gz
cd FreeBASIC-1.10.1-freebsd-x86_64
cp -Rfv ./* ~/.local/
cd
fbc --version
```

### FreeBASIC on Windows

This is surprisingly similar to FreeBSD. Download the zip file from the
[FreeBASIC Website](https://www.freebasic.net/). Extract it somewhere like
C:/Users/YOURUSER and then add it with an alias to PATH in `.bash_profile`.

```bash
export PATH="/c/Users/derek/freeBASIC:$PATH"
alias fbc="fbc64.exe"
```

And then we can access it in Git Bash.

```bash
fbc --version
```

## Gleam

We use the standard Gleam tool on Linux.

### Gleam on Gentoo

Gleam is on portage, and even recognized on the official website for it.

```bash
sudo echo 'dev-lang/gleam ~amd64' >> /etc/portage/package.accept_keywords
emerge -av dev-lang/gleam
gleam --version
```

### Gleam on Ubuntu

To get Gleam working on Ubuntu, I needed to build it from scratch. This requires
Rust to be installed first, at the lastest stable. See Rust.

```bash
git clone https://github.com/gleam-lang/gleam.git --branch v1.14.0
cd gleam
cargo install --path gleam-bin --force --locked
```

### Gleam on FreeBSD

This can be installed easily enough via pkg.

```sh
sudo pkg install gleam
gleam --version
```

### Gleam on Windows

Gleam is available on Windows, primarily through package managers. There are
some binaries on GitHub releases you can also try. None of this works great
for this project without some more work. It is just far easier on linux.

## Go

We use the standard Go tool on Linux.

### Go on Gentoo

Go is on portage.

```bash
emerge -av dev-lang/go
go --version
```

### Go on Ubuntu

It is pretty easy to install a more recent build of Go via snap.

```bash
sudo snap install --classic go
go --version
```

### Go on FreeBSD

This is available on pkg.

```sh
sudo pkg install go
go --version
```

### Go on Windows

We just download Go from the Website for Windows.
[Go Website](https://go.dev/dl/). Run the MSI and follow the
instructions. This will add `go` to your PATH, you just need to restart
any bash shells that you want to use it in immediately.

## Haskell

We use the standard Glasgow Haskell Compiler on Linux.

### Haskell on Gentoo

The Glasgow Haskell Compiler is on portage.

```bash
emerge -av dev-lang/ghc
ghc --version
```

### Haskell on Ubuntu

The Glasgow Haskell Compiler can be easily installed via apt.

```bash
sudo apt install ghc
ghc --version
```

### Haskell on FreeBSD

The Glasgow Haskell Compiler can be easily installed via pkg.

```sh
sudo pkg add ghc
ghc --version
```

### Haskell on Windows

You can use package managers and things that do allow additional libraries
and all that fun stuff.

We download it from the [GHC Website](https://www.haskell.org/ghc/).
Simply extract this somewhere and then add the bin directory to
PATH in `.bash_profile`. This example extracts the inner folder into
the `.local` directory immediately under the user profile.

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Haxe

We use the standard Haxe tool on Linux.

### Haxe on Gentoo

Download the binaries from the [Haxe Website](https://haxe.org/download/)
and place the files into somewhere in your PATH. I like it in a `~/bin` and
exporting that as part of PATH in `~/.bash_profile`.

I cannot really make this easier because they have a kind of annoying
download link setup. It is what it is.

```bash
mkdir ~/haxelib && haxelib setup ~/haxelib
```

### Haxe on Ubuntu

There is a PPA that is well maintained by the Haxe team to download
recent versions.

```bash
sudo add-apt-repository ppa:haxe/releases -y
sudo apt update
sudo apt install haxe
mkdir ~/haxelib && haxelib setup ~/haxelib
```

### Haxe on FreeBSD

You could try to build it from the source. It might work. I am not attempting
it at this time.

### Haxe on Windows

Download the installer from the [Haxe Website](https://haxe.org/download/)
and run it, installing it to the system. This should add the executable to
PATH and be ready to use immediately.

```bash
haxe --version
```

## Icon

We use the standard Icon tools on Linux. All distributions will build the Icon
tools from source. Pay attention to the lines below; the `make Configure` line
should only be run once, based on the platform that you are building on.
Once the source is built, I copy the contents of the bin directory to somewhere
in PATH. If `~/.local/bin` is in PATH, this works. Otherwise change the `cp`
line to copy somewhere to PATH.

```bash
git clone https://github.com/gtownsend/icon.git
cd icon
make Configure name=linux
make Configure name=bsd
make
cp ./bin/* ~/.local/bin/
icon
```

### Icon on Windows

There is an experimental build for Windows 7 and later available. You can
try and play with this if you want, but I am not going any further.

## Idris2

We use the standard Idris2 tools on Linux.

### Idris2 on Gentoo

Idris2 is on portage.

```bash
emerge -av dev-lang/idris2
go --version
```

### Idris2 on Ubuntu

Install Racket first. This is required to install pack, which we
will then use to install Idris2. Once racket is installed, return here.

First `nano ~/.bash_profile` and add the following line:

```bash
export PATH="$HOME/.local/bin:$HOME/.idris2/bin:$PATH"
```

Then install pack and Idris2 together. Verifying that Idris2 works will
verify that the install was successful.

```bash
source ~/.bash_profile
bash -c "$(curl -fsSL https://raw.githubusercontent.com/stefan-hoeck/idris2-pack/main/install.bash)"
idris2 --version
```

### Idris2 on FreeBSD

It appears the way to go here is to build the package from source. I have not
yet attempted this. The
[Install Instructions](https://github.com/idris-lang/Idris2/blob/main/INSTALL.md)
on GitHub mention modifications for BSD. Feel free to give it a go.

### Idris2 on Windows

Generally, go with a VM or try WSL for this one.

## Java

We use Java on Linux.

### Java on Gentoo

There is a good, binary distribution of OpenJDK available on portage.

```bash
emerge -av dev-java/openjdk-bin
java --version
```

### Java on Ubuntu

We can get a pretty common version of Java that is the `default-jdk` on Ubuntu.
If we don't know that we need something else, we can just install that.

```bash
sudo apt install default-jdk
java --version
```

### Java on FreeBSD

On FreeBSD, we need to specify a version when we install via pkg, but it is quite
easy from there.

```sh
sudo pkg search openjdk
sudo pkg install openjdk25
java --version
```

### Java on Windows

You can download the JDK from [the website](https://jdk.java.net).
Simply extract this somewhere and then add the bin directory to
PATH in `.bash_profile`. This example extracts the inner folder into
the `.local` directory immediately under the user profile.

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Javascript

We use node on Linux.

### Javascript on Gentoo

Portage has a good management of node.

```bash
emerge -av net-libs/nodejs
node --version
```

### Javascript on Ubuntu

Node can be installed right on apt.

```bash
sudo apt install nodejs
node --version
```

### Javascript on FreeBSD

This is also pretty simple with pkg.

```sh
sudo pkg install node
node --version
```

### Javascript on Windows

For this, we download it from [The Node Website](https://nodejs.org).
I just use the installer for this project. This creates a good install
of node on the system and adds it to PATH.

```bash
node --version
```

## Julia

We use the standard Julia tools on Linux and FreeBSD.
This is the same on every Linux distribution, as well as on FreeBSD,
using juliaup to manage the installation.

```bash
curl -fsSL https://install.julialang.org | sh
source ~/.bashrc
juliaup
julia --version
```

### Julia on Windows

Go to the [Julia Website](https://julialang.org/), where we are instructed to
install it via the Microsoft Store.

```powershell
winget install --name Julia --id 9NJNWW8PVKMN -e -s msstore
julia --version
```

## Kit

We use the standard Kit tools on Linux. You should install Zig first, regardless
of your distribution. Come back here when Zig is installed.

For Kit in VS Code, you also have to use the
[GitLab Repository](https://gitlab.com/kit-lang/kit-vscode-extension)
and install it from there. The extension is otherwise not available for VSCode
at the time of this writing.

The build script here requires bash, so I did not go further on FreeBSD. Assuming
that you are okay with bash, it may work okay. Proceed with caution. There is
also simply the whole source you can attempt to build. Windows does not appear to
have any support from Kit at this time.

One other prerequisite is also required, libffi. On gentoo, this is an easy
`emerge -av dev-libs/libffi`. On Ubuntu, you can `sudo apt install libffi-dev`.

Once this is done, the developers have created a nice install script that is
easily called.

```bash
curl -fsSL https://kit-lang.org/install.sh | bash
```

This installs to e.g. `~/.kit` and we need to add `~/.kit/bin` to PATH. So
we can open `nano ~/.bash_profile` and add a PATH export.

```bash
export PATH="$HOME/.kit/bin:$PATH"
```

Then go ahead and verify

```bash
source ~/.bash_profile
kit --version
```

## Kotlin

We use the standard Kotlin tools and Java on Linux.

### Kotlin on Gentoo

You can install the binary from portage quite easily.

```bash
emerge -av dev-lang/kotlin-bin
kotlinc -version
```

### Kotlin on Ubuntu

You can install what we need from apt quite easily.

```bash
sudo apt install kotlin
kotlinc -version
```

### Kotlin on FreeBSD

This is available on pkg. Funnily enough, it will install bash, so
languages requiring bash may accidentally make it through the no-bash-on-FreeBSD
filter once this one is installed.

```sh
sudo pkg install kotlin
kotlinc -version
```

### Kotlin on Windows

You install Kotlin via one of the big IDEs you are never going to use again
in your entire life. I did not bother. If I do more Android development,
maybe I will come back and try to add how it works here. Basically, install
Android Studio.

## LLVM IR

We use the standard LLVM tools on Linux. In fact, we are specifically using
Clang as our in to LLVM, and will bring in what we need with LLVM.

### LLVM on Gentoo

We can just install clang from portage.

```bash
emerge -av llvm-core/clang
clang --version
```

### LLVM on Ubuntu

We have to shuffle the versions thing, especially if you just install `clang`
at first. And we offer the test repository again.

```bash
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
apt install clang-22
sudo update-alternatives --install /usr/bin/clang clang /usr/bin/clang-18 110
sudo update-alternatives --install /usr/bin/clang clang /usr/bin/clang-22 220
sudo update-alternatives --config clang
clang --version
```

### LLVM on FreeBSD

FreeBSD comes packaged with Clang installed!

```sh
clang --version
```

### LLVM on Windows

You try this one from the Microsoft Store. This did work for me, but some
newer syntax included in this code is not supported by the older compiler
that was installed with this.

```powershell
winget install LLVM.LLVM
```

Otherwise, we download clang+llvm from
[The GitHub Releases](https://github.com/llvm/llvm-project/releases/tag/llvmorg-18.1.8).
This gives a tar.xz at the time of this writing, which we will open and
extract onto our computer. This was painful and I needed to use a command
line to extract it successfully. It is another case that we just extract
it and add the executables to our PATH. This overlaps with some other packages
I previously installed and stopped here, but it is available.

```powershell
tar xJvf clang+llvm-18.1.8-x86_64-pc-windows-msvc.tar.xz
```

## Lua

We use the standard Lua tools on Linux.

### Lua on Gentoo

We can just install this from portage if it isn't already installed.

```bash
emerge -av dev-lang/lua
lua -v
```

### Lua on Ubuntu

There are multiple versions of lua available on apt. We will use 5.4, which
is the version on portage as the time of this writing.

```bash
sudo apt install lua5.4
lua -v
```

### Lua on FreeBSD

There are several versions of Lua available on pkg. We do 54. If we need to,
we can create a symlink to allow the run script etc. to call simply `lua`.

```sh
sudo pkg install lua54
lua54 -v
```

### Lua on Windows

We install Lua from Lua for Windows, which makes a nice package for us on
the [GitHub Releases](https://github.com/rjpcomputing/luaforwindows/releases).
Download and run the installer.

I still had to add an alias in `.bash_profile` so that `lua` worked as a simple
command.

```bash
alias lua="lua.exe"
```

## Mercury

We use the Melbourne Mercury Compiler tools on Linux.

### Mercury on Gentoo

We can just install this from portage.

```bash
emerge -av dev-lang/mercury
mmc --version
```

### Mercury on Ubuntu

I was able to get the PPA for this working correctly.

```bash
sudo apt install wget ca-certificates
cd /tmp
wget https://paul.bone.id.au/paul.asc
sudo cp paul.asc /etc/apt/trusted.gpg.d/paulbone.asc
```

Open `nano /etc/apt/sources.list.d/mercury.list` and paste in the
following text (this is for 24.04 noble; change accordingly).

```text
deb http://dl.mercurylang.org/deb/ noble main
deb-src http://dl.mercurylang.org/deb/ noble main
```

Then we update and install it.

```bash
sudo apt update
sudo apt install mercury-recommended
mmc --version
```

### Mercury on FreeBSD

You can download the source and try to build it from scratch. I have not
attempted this at this time.

### Mercury on Windows

The release is a source based distribution. You can download it and try, I
guess, but I have not even tried.

## MMIX

We use the Knuth's MMIXware tools on Linux.sud

### MMIX on Gentoo

This is one simple package in protage.

```bash
emerge -av dev-lang/mmix
mmix
```

### MMIX on Ubuntu

You can download the literal binaries at
[MMIXware Site](https://mmix.cs.hm.edu/bin/index.html).
Go to somewhere in your PATH and download them.

```bash
wget https://mmix.cs.hm.edu/bin/mmix
wget https://mmix.cs.hm.edu/bin/mmixal
wget https://mmix.cs.hm.edu/bin/mmmix
wget https://mmix.cs.hm.edu/bin/mmotype
chmod a+x mmix mmixal mmmix mmotype
```

### MMIX on FreeBSD

There are no official binaries for MMIXAL. I have not gone further, but the
source code is available, and GCC also has some support for MMIXAL if built
correctly. I have not explored either of these on FreeBSD at this time.

### MMIX on Windows

Download the 4 exe files from
[The MMIX Website](https://mmix.cs.hm.edu/exe/index.html).
`mmix`, `mmmix`, `mmixal`, and `mmotype`. Save each of these somewhere in your
PATH, and it should be accessible for this project.

## Modula-3

We use the Critical Mass Modula-3 tools on Linux.

### Modula-3 on Gentoo

I did not succeed in getting any tools working to build Modula-3 on
my Gentoo system. You can try building cm3 from source if you're into
that kinda thing. I recommend using a VM with Ubuntu Server.

There is technically a binary in the bootstrapper when I attempt to compile
this on Gentoo. This is not the well built version intended. In fact, trying
to use it to build code immediately runs into the fact that there are missing
libraries.

Modula-3 has its whole own build setup that is quite interesting but makes
troubleshooting what is wrong on Gentoo almost impossible. I would gladly
put in some effort to describe it here if I find a way in the future.

### Modula-3 on Ubuntu

We download the release package from the GitHub repository that allows
us to bootstrap our system for building the compiler. We extract this
file and go into a temporary build directory to call the concierge
script that will build it for us.

```bash
wget https://github.com/modula3/cm3/releases/download/d5.11.10/cm3-dist-AMD64_LINUX-None.tar.xz
tar xvf cm3-*.tar.xz
mkdir build
cd build
../cm3-dist-AMD64_LINUX-None/scripts/concierge.py install --prefix $HOME/cm3
```

Now `nano ~/.bash_profile` and add `$HOME/cm3/bin` to PATH

```bash
export PATH="$HOME/cm3/bin:$PATH"
```

Now we can verify that the install is complete.

```bash
source ~/.bash_profile
cm3 --version
```

### Modula-3 on FreeBSD

FreeBSD has its own way to move forward here, as outlined on the
[GitHub repo](https://github.com/modula3/cm3/wiki/Getting-Started:-BSD).
This process does not seem to work on the latest version, so I actually went back
a couple of revisions to get this to build on FreeBSD. Then we can fix the build
to have a FreeBSD target and use the `c++` compiler. Finally, it is that concierge
python script to walk us through the build.

```sh
sudo pkg install cmake gtar python3 unixODBC wget
wget https://github.com/modula3/cm3/releases/download/d5.11.4/cm3-dist-AMD64_LINUX-d5.11.4.tar.xz
gtar Jxf cm3-dist-AMD64_LINUX-d5.11.4.tar.xz
sed -i -e 's/^SYSTEM_CC.*/SYSTEM_CC = "c++ -fPIC"/' cm3-dist-AMD64_LINUX-d5.11.4/m3-sys/cminstall/src/config-no-install/AMD64_FREEBSD
mkdir build
cd build
../cm3-dist-AMD64_LINUX-d5.11.4/scripts/concierge.py install --prefix $HOME/cm3 --target AMD64_FREEBSD
```

Now edit `~/.profile` and add `$HOME/cm3/bin` to PATH

```bash
export PATH="$HOME/cm3/bin:$PATH"
```

Now we can verify that the install is complete.

```bash
. ~/.profile
cm3 --version
```

### Modula-3 on Windows

You have to build this. Ubuntu Server is my goto for this still. Feel free
to try it. Windows is an officially supported language.
[GitHub Instructions](https://github.com/modula3/cm3/wiki/Getting-Started%3A-Windows).

## Mojo

We use the standard Mojo tools on Linux. FreeBSD and Windows are not officially
supported, so a VM or WSL etc. are required.

This is kind of annoying on all the platforms. We need to install this through
the pixi package management system. Once that is installed, we navigate
to some directory outside of the current project and create some dummy
project. Maybe you have something want to do and can start a project here.

This makes it so we can just go into this repo and start someething up in mojo.
The `pixi add mojo` is just an example, but doing so is why we have
`pixi.lock` and `pixi.toml`, which include references to mojo.

```bash
curl -fsSL https://pixi.sh/install.sh | sh
source ~/.bashrc
mkdir ~/temp-directory/
# Initiate mojo in our system
cd ~/temp-directory/
pixi init hello-world \
  -c https://conda.modular.com/max-nightly/ -c conda-forge \
  && cd hello-world
pixi add mojo
# run something in our repo
cd algos-repo/src/random/hello_world/
../../../run.sh hello.mojo
```

## Nim

We use the standard Nim tools on Linux.

### Nim on Gentoo

This is one simple package in protage.

```bash
emerge -av dev-lang/nim
nasm -v
```

### Nim on Ubuntu

This is also very easy on apt.

```bash
sudo apt install nim
nasm -v
```

### Nim on FreeBSD

Nim is available through pkg as well. Note: On my system, the `nim` was
binary was installed in "/usr/local/nim/bin" and this needed to be added to PATH.

```sh
sudo pkg install nim
nim -v
```

### Nim on Windows

Go to [The Nim Language Website](https://nim-lang.org) and download the install
package for Windows.

## Objective-C

We use the standard Clang tools on Linux.

### Objective-C on Gentoo

In gentoo, we install gnustep and libobjc2, and it works quite nicely.

```bash
emerge gnustep-base/libobjc2 gnustep-base/gnustep-base gnustep-base/gnustep-make
```

### Objective-C on Ubuntu

This was really annoying for me. In theory, we just install the appropriate
packages and go.

```bash
sudo apt update
sudo apt install gobjc gnustep gnustep-devel
```

I ended up with a system that could not find header files for Objective-C when
I attempted to build Objective-C code. If you run into the same thing,
hey, there's always Gentoo or a VM of some kind. I basically hosed an Ubuntu VM
trying to chase a fix, so I will leave the "official" recommendation above
and this word of warning.

That said... I did the following export, and my Objective-C compilations
began to work correctly again. I consider a bit of a hack, but if you need
it, and it works for you, too...

```bash
export OBJC_INCLUDE_PATH="/usr/lib/gcc/x86_64-linux-gnu/15/include/:$OBJC_INCLUDE_PATH"
```

### Objective-C on FreeBSD

Clang comes installed on FreeBSD, but we need to add libobjc2 and gnustep
in order to make our builds for Objective-C work. We also need to add a
source to pull in GNU step information. The second line should also be
added to `~/.profile`.

```sh
sudo pkg install libobjc2 gnustep gnustep-make
. /usr/local/GNUstep/System/Library/Makefiles/GNUstep.sh
```

### Objective-C on Windows

I stopped at file collisions installing Clang. However, continue with Clang
and also look up GNUStep install for windows. You could also try it from
the Microsoft Store. The GNUStep tools are available on
[The GitHub](https://github.com/gnustep/tools-windows-msvc).

```powershell
winget install LLVM.LLVM
```

## Ocaml

We use the standard Ocaml tools on Linux.

### Ocaml on Gentoo

This is an easy package in portage.

```bash
emerge -av dev-lang/ocaml
ocaml --version
```

### Ocaml on Ubuntu

This is a simple package in apt that works.

```bash
sudo apt install ocaml
ocaml --version
```

### Ocaml on FreeBSD

Just install this via pkg as well.

```sh
sudo pkg install ocaml
ocaml --version
```

### OCaml on Windows

We can install opam from Microsoft Store. I had to start a new Powershell
after the initial install so that the alias to opam took effect. I then
allowed it to install its own Cygwin instance. When opam init is done,
we need to run `opam env` and copy these in a bash format into our
`.bash_profile` file. You need to modify each line of the output into
bash format that works right to add the appropriate variables to the
environment for Git Bash.

```powershell
winget install Ocaml.opam
opam init
opam env
```

## Octave (MATLAB)

We use the GNU Octave tools on Linux.

### Octave on Gentoo

This is another easy package in portage.

```bash
emerge -av sci-mathematics/octave
octave --version
```

### Octave on Ubuntu

This is available on apt easily.

```bash
sudo apt install octave
octave --version
```

### Octave on FreeBSD

This is on pkg. This loaded in tons of dependencies for me,
so take caution where you will about that. If you already have a destkop
installed on FreeBSD, you may have less.

```sh
sudo pkg install octave
octave --version
```

### Octave on Windows

Download the installer from [The Octave Website](https://octave.org/download).
Run it and follow the instructions to install on the PC. After install,
I had to find where the correct executables for octave were located on my
machine. This installed yet another instance of mingw, so we need to be careful
about the collisions yet again. I add the Octave path to the end of PATH,
which allows anything else to take priority.

```bash
export PATH="$PATH:C:\Program Files\GNU Octave\Octave-11.1.0\mingw64\bin"
```

## Oberon

We use the Vishap Oberon Compiler tools on Linux.

### Oberon on Gentoo

I was able to figure out how to get Vishap Oberon Compiler to build
on Gentoo with some work, some of it quite odd.

First, I had to `sudo nano /etc/os-release` and change the `ID='gentoo'`
line to `ID=gentoo`; note the removed single quotes. I replaced these
quotes as soon as I was done with this build, assuming other parts
may assume they are there.

I also used `gcc-config` to make sure that I was using GCC-13 for the
build, which seems to make it easier. Otherwise, it was a pretty
standard build following the github.

```bash
sudo gcc-config x86_64-pc-linux-gnu-13
. /etc/profile
git clone https://github.com/vishaps/voc
cd voc
make full
sudo make install
sudo gcc-config x86_64-pc-linux-gnu-15
. /etc/profile
```

In our `~/.bash_profile` we then export the installed bin directory.

```bash
export PATH="/opt/voc/bin:$PATH"
```

### Oberon on Ubuntu

This is surpisingly easy in Ubuntu. The only thing I did do is to ensure
via `update-alternatives` that I was running GCC 13. See the C/C++ section
for instructions on setting that up.

```bash
sudo update-alternatives --config gcc
sudo update-alternatives --config g++
git clone https://github.com/vishaps/voc
cd voc
make full
sudo make install
sudo update-alternatives --config gcc
sudo update-alternatives --config g++
```

In our `~/.bash_profile` we then export the installed bin directory.

```bash
export PATH="/opt/voc/bin:$PATH"
```

### Oberon on FreeBSD

Because FreeBSD does not do the whole multiple GCC version management like
Gentoo or Ubuntu, if we need to change GCC version, that is going to be
on us to do manually. I was able to just use whatever GCC I had active at
the time, but your mileage may vary.

```sh
git clone https://github.com/vishaps/voc
cd voc
make full
sudo make install
```

In our `~/.profile` we then export the installed bin directory.

```bash
export PATH="/usr/local/share/voc/bin:$PATH"
```

### Oberon on Windows

You can try to follow the build instructions on
[The GitHub](https://github.com/vishaps/voc).
I have not pursued this any further than noting that Windows is a supported
platform, but it takes some extra work.

## Pascal

We use the standard Free Pascal tools on Linux.

### Pascal on Gentoo

We use the basic portage package for this.

```bash
emerge -av dev-lang/fpc
fpc -h
```

### Pascal on Ubuntu

This is also available as a simple apt package.

```bash
sudo apt install fpc
fpc -h
```

### Pascal on FreeBSD

We install this via pkg as well.

```sh
sudo pkg install fpc
fpc -h
```

### Pascal on Windows

We download the binaries from the
[Free Pascal Website](https://www.freepascal.org). For windows, this comes
with a visual installer. Simply follow the steps on screen.
This should add `fpc` to your path, but you might need to restart bash shells.

## Perl

We use the standard Perl tools on Linux.

### Perl on Gentoo

There is a basic portage package for this.

```bash
emerge -av dev-lang/perl
perl --version
```

### Perl on Ubuntu

This is also available as a simple apt package.

```bash
sudo apt install perl
perl --version
```

### Perl on FreeBSD

This got pulled in by another dependency along the way for me, but
it is also available on pkg as perl5.

```sh
sudo pkg install perl5
perl --version
```

### Perl on Windows

For this project, we use strawberry perl. You can also check out activeperl
for Windows. We download the MSI from the
[Strawberry Perl Website](https://strawberryperl.com). I did not even have
to restart any bash shells to see this working.

## PHP

We use the standard PHP tools on Linux.

### PHP on Gentoo

There is a basic portage package for this.

```bash
emerge -av dev-lang/php
php --version
```

### PHP on Ubuntu

This is also available as a simple apt package.

```bash
sudo apt install php
php --version
```

### PHP on FreeBSD

We can install this via php85 on pkg.

```sh
sudo pkg install php85
php --version
```

### PHP on Windows

This was just downloaded from
[the PHP Website](https://www.php.net/downloads.php?os=windows).
I extracted this to a php folder in my profile directory and added that
to PATH in `.bash_profile`.

## Prolog

We use the GNU Prolog tools on Linux.

### Prolog on Gentoo

There is a basic portage package for this.
There are both a `prolog` and a `gprolog` package available in portage,
and we use the one with the `g`.

```bash
emerge -av dev-lang/gprolog
gplc --version
```

### Prolog on Ubuntu

This is also available as a simple apt package. Note that this
is the `gprolog` package, preceded with a `g`.

```bash
sudo apt install gprolog
gplc --version
```

### Prolog on FreeBSD

This is also available on pkg

```sh
sudo pkg install gprolog
gplc --version
```

### Prolog on Windows

We can download an installer from
[The GNU Prolog web site](https://gprolog.org/#download).
After letting the installer go, I had to add `/c/GNU-Prolog/bin` to my
PATH in `.bash_profile`. gplc ran for me after this, but I was unsuccessful
in getting this to build the project code.

## Python

We use the standard Python tools on Linux.

### Python on Gentoo

Portage depends on python, but you can get into the weeds of python slots and
environments on Gentoo if you want. Portage manages the packages in the main
python environment in Gentoo, and you typically create another environment
to use other package managers. Keep up with the news on the official Gentoo
feed, `eselect news read`, to be aware of signficant version changes. We just
use python3 quite happily at this point.

```bash
python --version
```

### Python on Ubuntu

Python3 is often already installed. If not, it is a simple apt package.
You can install the python-is-python3 to call into python as simply `python`
instead of `python3`.

```bash
sudo apt install python3 python-is-python3
python --version
```

### Python on FreeBSD

This is also available on pkg.

```sh
sudo pkg install python
python --version
```

### Python on Windows

Python got automatically installed for me through another package that
depended on it. [The Python Website](https://www.python.org) also has
downloads that are fairly easy to install. Or via winget.

```powershell
winget install 9NQ7512CXL7T.
```

## R

We use the standard R tools on Linux.

### R on Gentoo

There is a basic portage package for this.

```bash
emerge -av dev-lang/R
R --version
```

### R on Ubuntu

For ubuntu, we have to add the CRAN sources to `/etc/apt/sources.list.d/cran.list`
and install from there. First, to add to the file.

```text
deb https://cloud.r-project.org/bin/linux/ubuntu noble-cran40/
```

Then we can install.

```bash
sudo apt update
sudo apt install r-base
R --version
```

### R on FreeBSD

This is available on pkg.

```sh
sudo pkg install R
R --version
```

### R on Windows

We get R on windows by following the CRAN server and downloading
the installer from [The R Website](https://www.r-project.org). After
the install, I needed to add `/c/Program Files/R/R-4.5.3/bin/x64` to
my PATH in `.bash_profile` before it worked.

```bash
export PATH="/c/Program Files/R/R-4.5.3/bin/x64:$PATH"
```

## Racket

We use the standard Racket tools on Linux.

### Racket on Gentoo

You can also get Racket via the portage package.

```bash
emerge -av dev-scheme/racket
racket --version
```

### Racket on Ubuntu

You can get Racket via apt easily.

```bash
sudo apt install racket
racket --version
```

### Racket on FreeBSD

This is available on pkg.

```sh
sudo pkg install racket
racket --version
```

### Racket on Windows

We download the installer from
[The Racket Website](https://download.racket-lang.org) and run it. After
the install, I needed to add `/c/Program Files/Racket` to
my PATH in `.bash_profile` before it worked.

```bash
export PATH="/c/Program Files/Racket:$PATH"
```

## Ruby

We use the standard Ruby tools on Linux.

### Ruby on Gentoo

You can also get Ruby via the portage package.

```bash
emerge -av dev-lang/rub
ruby --version
```

### Ruby on Ubuntu

You can get Ruby via apt easily.

```bash
sudo apt install ruby
ruby --version
```

### Ruby on FreeBSD

This is available on pkg.

```sh
sudo pkg install ruby
ruby --version
```

### Ruby on Windows

For Windows, we use [RubyInstaller](https://rubyinstaller.org). This is
a visual installer that will walk through the install, and it includes
the option to add the executables to PATH in Windows. You may have to restart
Bash shells to make this work.

## Rust

We use the standard Rust tools on Linux.

### Rust on Gentoo

Rust is typically installed at first install in Gentoo, as the kernel now requires it.
If you need to review the installation, you can review portage.

```bash
emerge -p dev-lang/rust
rustc --version
```

### Rust on Ubuntu

For Ubuntu, we use rustup to manage the Rust install.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.bash_profile
rustc --version
```

### Rust on FreeBSD

This is available on pkg.

```sh
sudo pkg install rust
rustc --version
```

### Rust on Windows

We just install rustup on Windows, too. Follow the
[rustup Website](https://rustup.rs). I did have to restart Bash terminals
after this, but it set PATH for me.

## Scala

We use the standard Scala tools.

### Scala on Linux

I ended up not using any of the packages that are immediately in the
package managers on linux for this. You can find the appropriate command line
to run on [The Scala Website](https://www.scala-lang.org/download/).

```bash
curl -fL https://github.com/coursier/coursier/releases/latest/download/cs-x86_64-pc-linux.gz | gzip -d > cs && chmod +x cs && ./cs setup
source ~/.bash_profile
scala --version
```

### Scala on FreeBSD

I just used pkg to install scala.

```sh
sudo pkg install scala
scala --version
```

### Scala on Windows

We download the Windows installer from
[The Scala Website](https://scala-lang.org/download/) and run it.
I did not install a JVM when prompted, since it just failed to detect
the one I already had. It will add executables for Scala to PATH for you.
Except that did not work for me, and I needed to go into `.bash_profile`
to add the PATH and an alias for scala.bat.

```bash
export PATH="/c/Users/USER/AppData/Local/Coursier/data/bin:$PATH"
alias scala="scala.bat"
```

## Scheme

We use the GNU Guile tools on Linux.
Chez Scheme is also available in both, but this project is built with
Guile in mind.

### Scheme on Gentoo

Guile is easily available in portage.

```bash
emerge -av dev-scheme/guile
guile --version
```

Alternative (not how this project is using it):

```bash
emerge -av dev-scheme/chez
chezscheme --version
```

### Scheme on Ubuntu

Guile is easily available in apt.

```bash
sudo apt install guile-3.0
guile --version
```

Alternative (not how this project is using it):

```bash
sudo apt install chezscheme
chezscheme --version
```

### Scheme on FreeBSD

Guild is easily available.

```sh
sudo pkg install lang/guile
guile --version
```

Alternative:

```sh
sudo pkg install chez-scheme
chez-scheme --version
```

### Scheme on Windows

Guile is not supported on Windows, so the code in this project may not
run successfully. You can get Chez Scheme from the
[GitHub Releases](https://github.com/cisco/ChezScheme/releases). We do not
use it in this project so far, but you can play with Scheme through that.

## Simula

We use GNU cim. It is not always the easiest to get going, but I was able
to figure it out on Gentoo and Ubuntu. This process did not work on FreeBSD,
and I stopped and moved on without getting this going on FreeBSD yet. I did
not even attempt cim on Windows. You can try portable simula if you want to
play with Simula on Windows.

I downloaded 5.1 tar.gz from
[The GNU Cim Website](https://www.gnu.org/prep/ftp.html#north_america). Extract
this to a working directory somewhere for compilation with `tar zxvf cim-5.1.tar.gz`.

I was able to get Simula working on Gentoo and Ubuntu with GCC-13 (see C or C++ section).
You need to switch to the correct GCC version before beginning.

```bash
# Gentoo:
sudo gcc-config x86_64-pc-linux-gnu-13
. /etc/profile

# Ubuntu:
sudo update-alternatives --config gcc
```

Then I had to modify 2 files. In lib/ : simset.c and simulation.c both try to
`#include ../../lib/cim.h` But that doesn't exist obviously on my system. However,
it does exist literally right next door. So I just changed them to cim.h bare.
This made cim compile and install well under Ubuntu.

```bash
wget http://mirror.keystealth.org/gnu/cim/cim-5.1.tar.gz
tar zxvf cim-5.1.tar.gz
cd cim-5.1
nano ./lib/simset.c # Fix the ../../lib/cim.h to just cim.h at the very top
nano ./lib/simulation.c # Fix the ../../lib/cim.h to just cim.h at the very top
./configure
make
sudo make install
cim --version
```

This installs libraries in `/usr/local/lib` that need to be made aware to
the linker appropriately.

```bash
sudo touch /etc/ld.so.conf.d/libc5.conf
echo "/usr/local/lib" | sudo tee /etc/ld.so.conf.d/libc5.conf
sudo ldconfig
```

For a temporary fix, we can also

```bash
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib
```

At the end, don't forget to set back to GCC 15, if that is your default.

```bash
# Gentoo
sudo gcc-config x86_64-pc-linux-gnu-15
. /etc/profile

# Ubuntu:
sudo update-alternatives --config gcc
```

### Protable Simula

I did get Portable Simula working as well, although I now use cim.
This should probably work fine on any distribution with Java installed.
Latest Simula requires Java 25 or later.
SimulaSetupR21 requires Java 21-25.
SimulaSetupR17 requires Java 17-25.

[Download Portable Simula](https://portablesimula.github.io/github.io/).

```bash
java -jar SimulaSetup.jar`
```

After this, I created the following bash script, saved simply as `simula`,
and put it with `chmod a+x simula` in a directory in PATH. You should check
the location where Simula is setup and modify the script accordingly

```bash
#! /bin/bash
java -jar /home/USER/Simula/Simula-2.0/simula.jar $@
```

To run scripts in the console without the custom popup that Portable Simula
offers, you can add the `-noPopup` argument.

## Smalltalk

We use the GNU Smalltalk tools on Linux. I attempted this process on FreeBSD
but got more build errors and did not pursue it further. With some
determination, this may work. I did not attempt this on Windows. Good luck.

I was able to get Simula working on Gentoo and Ubuntu with GCC-13
(see C or C++ section).
You need to switch to the correct GCC version before beginning.

```bash
# Gentoo:
sudo gcc-config x86_64-pc-linux-gnu-13
. /etc/profile

# Ubuntu:
sudo update-alternatives --config gcc
sudo update-alternatives --config g++
```

We download the latest version, which at the time of writing was 3.2.5,
extract it, and build and install it in the usual `make` way.

This got extremely weird, to be honest, though.

On Gentoo, I had to edit the `packages/blox/tk/BloxTK.c` file and remove
references to a parameter that is not recognized in my system. I just
replaced it with nothing, which reduces useful output in development for
that unique case, but I can live with it.

On both Gentoo and Ubuntu, the `make` appeared to have an obscure error
related to awk. `make install` immediately worked, after I noticed the
binaries all seemed to be there. This has been a working system for me since.

```bash
wget https://ftp.gnu.org/gnu/smalltalk/smalltalk-3.2.5.tar.gz
tar zxvf smalltalk-3.2.5.tar.gz
cd smalltalk-3.2.5
./configure
make
sudo make install
```

At the end, don't forget to set back to GCC 15, if that is your default.

```bash
# Gentoo
sudo gcc-config x86_64-pc-linux-gnu-15
. /etc/profile

# Ubuntu:
sudo update-alternatives --config gcc
sudo update-alternatives --config g++
```

## Swift

We use the standard Swift tools on Linux.

### Swift on Gentoo

Swift is easily available in portage.

```bash
emerge -av dev-lang/swift
swift --version
```

### Swift on Ubuntu

Swift is a little more annoying on Ubuntu. We will use the Swiftly tool
to manage it on Ubuntu. [The Swift Website](https://www.swift.org/install/linux/)
describes this.

```bash
curl -O https://download.swift.org/swiftly/linux/swiftly-$(uname -m).tar.gz && \
    tar zxf swiftly-$(uname -m).tar.gz && \
    ./swiftly init --quiet-shell-followup && \
    . "${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/env.sh" && \
    hash -r
source ~/.bash_profile
swift --version
```

### Swift on FreeBSD

You can try to get one of the builds to run on here if you want, but it is not
officially supported on the website. I did not pursue it so far.

### Swift on Windows

Whe follow [The Swift Website](https://www.swift.org/install/windows/).

```powershell
winget install --id Microsoft.VisualStudio.2022.Community --exact --force --custom "--add Microsoft.VisualStudio.Component.Windows11SDK.22621 --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.VC.Tools.ARM64" --source winget
winget install --id Swift.Toolchain -e --source winget
```

## Tcl

We use the standard Tcl tools on Linux.

### Tcl on Gentoo

This another simply easy one on Gentoo.

```bash
emerge -av dev-lang/tcl dev-lang/tk
# tclsh
```

### Tcl on Ubuntu

apt makes it easy on Ubuntu as well.

```bash
emerge -av dev-lang/tcl dev-lang/tk
# tclsh
```

### Tcl on FreeBSD

We install this via pkg as version 9.

```sh
sudo pkg install tcl90
# tclsh9.0
```

### Tcl on Windows

So far, I have not pursued Tcl on Windows. There are some options you can
pursue if this is something you want to play with.

## Typescript

We use the standard Typescript tools and node on Linux.

### Typescript on Gentoo

This another simply easy one on Gentoo.

```bash
emerge -av dev-lang/typescript
tsc --verison
```

### Typescript on Ubuntu

Ubuntu annoys me about this one, but we have to go through NPM.

```bash
sudo apt install nodejs npm
sudo npm install -g typescript
tsc --version
```

### Typescript on FreeBSD

We use NPM to install typescript on FreeBSD.

```sh
sudo pkg install node npm
sudo npm install -g typescript
tsc --version
```

### Typescript on Windows

Install node (see Javascript), and then in a terminal, we just install
typescript via NPM. You may have to set an ExecutionPolicy if doing this
in powershell; if you get an error trying to run NPM after installing node,
check the link in the error.

```powershell
npm install -g typescript
tsc --version
```

## V

We use the standard V tools.

### V on Linux

On linux, we just load the zip from the website and build it.

```bash
wget https://github.com/vlang/v/releases/latest/download/v_linux.zip
unzip v_linux.zip
cd v
make
# you can move the v directory to $HOME if you wish; this is my preferred
cd .. && cp -fv ./v ~/v
# Finally, v will make a global symlink for us
sudo ~/v symlink
v --version
```

### V on FreeBSD

We build from source on FreeBSD. We also need to add the boehm-gc-threaded
dependency first.

```sh
sudo pkg install boehm-gc-threaded
git clone --depth=1 https://github.com/vlang/v
cd v
make
# you can move the v directory to $HOME if you wish; this is my preferred
cd .. && cp -Rfv ./v ~/v
# Finally, v will make a global symlink for us
sudo /home/USER/v/v symlink
v --version
```

### V on Windows

Navigate to the [V Website](https://vlang.io) and download the language pack
for Windows. This will give a zip file. I just extract this into the user profile
and add the directory to PATH in `.bash_profile` and it works.

## Visual Basic .Net

We have 2 options for any dotnet language on Linux these days. I use the
native dotnet package from Microsoft. Alternatively, mono is available and
used.

Microsoft has instructions for multiple flavors of linux available at
[on their website](https://learn.microsoft.com/en-us/dotnet/core/install/linux).\

Once installed, you can then run `dotnet --list-sdks` to see what SDKs are
installed, for example.

### Visual Basic .Net on Gentoo

We use the manual install scripts to install dotnet under Gentoo.

Ensure the following dependencies are already installed (usually are
in Gentoo): ca-certificates, libc6, libgcc-s1, libgssapi-krb5-2,
libicu74, libssl3t64, libstdc++6, tzdata, zlib1g

Running the following as root in a terminal will install dotnet for all users
on a gentoo machine.

Note: It can be worth it to keep the dotnet-install.sh around to upgrade to new
versions of .NET as they are released. You can also do the manual installation
specified by Microsoft, but I find the script helpful and easy.

```bash
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x ./dotnet-install.sh
mkdir /usr/share/dotnet
./dotnet-install.sh --version latest --install-dir /usr/share/dotnet
./dotnet-install.sh --version latest --runtime aspnetcore --install-dir /usr/share/dotnet
ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet
```

### Visual Basic .Net on Ubuntu

Ubuntu manages the SDK version via apt that works quite well system wide.
For the latest versions, you can consider including the test PPA. The test
repository is commented here.

```bash
# sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt install --install-suggests dotnet-sdk-10.0
```

### Visual Basic .Net on FreeBSD

The FreeBSD team has made .NET surprisingly easy for not being so immediately
supported on official channels. It is not always up to the latest version, but
is often on its way.

```sh
sudo pkg install dotnet
dotnet --version
dotnet --list-sdks
dotnet --list-runtimes
```

### Visual Basic .Net on Windows

The suggested route for this document is to navigate to the Visual Studio
website and download the Community version. This will give a Visual Studio
installer tool that allows many selections. Install all that you might
want, including .NET.

In a Powershell, you can check the full info on dotnet in a single command.

```powershell
dotnet --info
```

## Web Assembly (WASM)

We use the wabt tools and node. See the Javascript section
for installing node. Assuming this is done, we just clone the git repository
for wabt, import its submodules, make, and install it. This was done
on Linux and FreeBSD; with a mingw, it should work on Windows as well.

```bash
git clone https://github.com/WebAssembly/wabt.git
cd wabt
git submodule update --init
make
sudo make install
wat2wasm --version

#if you don't have /usr/local/bin in PATH, add to ~/.bash_profile :
export PATH="$PATH:/usr/local/bin"
```

## Zig

We use the standard Zig tools on Linux.

### Zig on Gentoo

This is easy to install on portage.

```bash
emerge -av dev-lang/zig
```

### Zig on Ubuntu

Ubuntu does not have such an easy package, so we need to do som extra work.
Go to the Zig website and download the correct package. The wget here is
an example. We then extract it and move it to somewhere useful. I just use
`~/zig` here as an example. We will want to keep it where we put it.

```bash
wget https://ziglang.org/builds/zig-x86_64-linux-0.16.0-dev.2973+06b85a4fd.tar.xz
tar xvf zig-*.tar.xz
mv -vf ./zig-x86_64-linux-0.16.0-dev.2973+06b85a4fd ~/zig
```

Now we `nano ~/.bash_profile` and our new zig folder to PATH.

```bash
export PATH="$HOME/zig:$PATH"
```

Then, to verify we can source a terminal and run it.

```bash
source ~/.bash_profile
zig version
```

### Zig on FreeBSD

This is available on pkg.

```sh
sudo pkg install zig
zig --version
```

### Zig on Windows

Navigate to the [Zig Website](https://ziglang.org/download/)
and download the language pack for Windows. This will give a zip file.
I just extract this into the user profile and add the directory to PATH in
`.bash_profile` and it works.
