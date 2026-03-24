# System Setup

**CAUTION**: You are going to have to think critically and troubelshoot for
yourself if you try to follow the instructions here. The goal is to make it
possible to run the code in this repository in a standard way, but it can
be helpful for other means.

This project is currently developed to build and run on Linux computers. All
the code is currently running on command line.

Gentoo is the first supported platform, on account of it is the platform I like
to run for fun. However, it has some issues that require further setup.

## Basic Setup

For the most part, OS setup should follow general OS setup. I have provided some
tips that can help setup the base system for building packages in the various
languages given here.

All Linux variants should export variables for use in the `~/.bash_profile`.
The VM variables are described further below, but the TIMEOUT variable will
be used on every call in `run.sh`. This sets how long the command is allowed
to run before it is killed. This is especially important on headless VMs, but
it is helpful generally.

```bash
export DEREKALGOS_RUNONVM="forth modula3 oberon simula smalltalk"
export DEREKALGOS_VMPORT="2222"
export DEREKALGOS_VMUSER="coderun"
export DEREKALGOS_VMADDRESS="127.0.0.1"
export DEREKALGOS_VMCODEDIR="/home/coderun/codefiles"
export DEREKALGOS_VMSTARTDIR="/home/coderun"
export DEREKALGOS_VMRUNSCRIPT="../run.sh"
export DEREKALGOS_TIMEOUT="-k 10s 1m"
export DEREKALGOS_GCC13="/usr/x86_64-pc-linux-gnu/gcc-bin/13/"
export DEREKALGOS_GCC13NAME="x86_64-pc-linux-gnu-gcc"
export DEREKALGOS_GXX13NAME="x86_64-pc-linux-gnu-g++"
```

### Gentoo

I have created a [gentoo-setup.md](gentoo-setup.md) which describes the general
Gentoo process that I used to create systems that can run all of this code. This
is basically just a supplement to the Gentoo Handbook and does not add anything
unusual, really. There are no significant extra steps to add to a Gentoo setup,
beyond just installing more language support, thanks to already be a source
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

Setup a VM for running Ubuntu Server. This should be pretty basic and obvious to any
VM software. In VirtualBox, you can simply select the Ubuntu Server iso and select all
your values.

For OS, Ubuntu Server is the best choice of Ubuntu. This comes with SSH already running
and setup for being run headless. This way, we can have the VM running in the background
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

Just as the other Ubuntu setups, we need the essential build setup.

```bash
apt install build-essential libtool cmake
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
compile and run them on the VM by modifying the `DEREKALGOS_RUNONVM` variable. The
best way to do this is by modifying `~/.bash_profile` with the following line,
and then running `source ~/.bash_profile` or restarting your OS session. All
languages that should run on the VM are in this string in the host OS,
separated by a single space. This should probably be an empty string on the
guest OS, unless you want to setup a string of code running servers.

Additionally, on the guest OS, you should at least export the `DEREKALGOS_TIMEOUT`
environment variable in `~/.bash_profile`.

For some languages, it is important that we always run code in GCC-13. However,
our default is to use GCC-15. For this purpose, we need to set `DEREKALGOS_GCC13`
to the directory that contains the gcc and g++ executables. Then
`DEREKALGOS_GCC13NAME` contains the name of the gcc 13 executable,
and `DEREKALGOS_GXX13NAME` contains the name of the g++ 13 executable. This
is required for e.g. Simula.

In fact, there are several other variables you can modify, including the username,
port, and other factors of the SSH server that will be connected to for running
code. As per `DEREKALGOS_RUNONVM`, it is normal for the host OS and guest OS
to set different values in their respective `~/.bash_profile` instances.

```bash
export DEREKALGOS_RUNONVM="forth modula3 oberon simula smalltalk"
export DEREKALGOS_VMPORT="2222"
export DEREKALGOS_VMUSER="coderun"
export DEREKALGOS_VMADDRESS="127.0.0.1"
export DEREKALGOS_VMCODEDIR="/home/coderun/codefiles"
export DEREKALGOS_VMSTARTDIR="/home/coderun"
export DEREKALGOS_VMRUNSCRIPT="../run.sh"
export DEREKALGOS_TIMEOUT="-k 10s 1m"
export DEREKALGOS_GCC13="/usr/x86_64-pc-linux-gnu/gcc-bin/13/"
export DEREKALGOS_GCC13NAME="x86_64-pc-linux-gcc"
export DEREKALGOS_GXX13NAME="x86_64-pc-linux-g++"
```

### VM Hibernation

This is generally good enough to get going once we install the language support as
well. However, there is a significant issue that the VM will hibernate and take tens of
minutes to start up again at times. To fix this, we need to turn off some services
that will try to force it, and also update grub settings to change how the OS is started.
We start with disabling the services.

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

### Final notes

As a final side note, it is technically possible to do a string of servers
with different capabilities to run code. The same run script is on the
host and guest OS. Technically, the guest VM could be replaced with a remote
VM in the cloud, or something similar, and these could be extended over multiple
code running servers. Unfortunately, such a string of servers would have a
significant inefficiency of `run.sh` currently only supporting a single code
running server, so a string of servers would be creating a long tunnel of ssh
calls instead of directly to the final code server.

## VSCode

I primarily use VS Code as my IDE of sorts for this project. Other editors are
easily used, if you want.

The easiest way in most places is to download the install package from the VS Code
website. There is a deb for Ubuntu there. In Gentoo, it is as easy as
`sudo emerge -av vscode`.

## Ada

We use the GNAT toolchain here.

### Ada on Gentoo

We have to add the `ada` USE flag to gcc and, if necessary, rebuild GCC with the
new flag.

```bash
emerge -p gcc
# If you already have the ada flag, you can skip the next 2 lines
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

## Ballerina

Ballerina requires Java. The
[Installation Options](https://ballerina.io/downloads/installation-options/)
states taht Java version 11 is required for Update 7 and below,
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

## Clojure

We use the Leiningen tool on Linux. On any distribution, this requires Java.
See Java.

Once java is installed, all Linux flavors use the lein script.

```bash
wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein
sudo chmod a+x ./lein
sudo mv -vf ./lein /usr/bin/lein
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
to access dart.

```bash
dart --version
```

## Eiffel

We use the standard, open source EiffelStudio compiler on Linux.

It should be noted that EiffelStudio is a licensed product with a complete,
interesting IDE for development. The compiler is dual licensed, requiring
a commercial paid license for continued commerical use. Open source software
may continue to use it under an open source license. The code in this project
is all being released under the MIT license and for educational purposes only.
As such, we take advantage of the open source license.

A note on Gentoo: The EiffelStudio website mentions a route using a custom PPA,
but that did not have any packages for 24.04, here in 2026, so I found it highly
unreliable and went the same path as I did for Gentoo.

Download EiffelStudio from the [Eiffel website](https://account.eiffel.com/downloads/).

Consult their [Installation Instructions](https://www.eiffel.org/doc/eiffelstudio/Linux)
for more instructions, this is just a simple walkthrough.

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

## Factor

We use the standard Factor tool on Linux. To get this, navigate to the
[Factor website](https://factorcode.org) and download the tar.gz package
for Linux. I assume that the tar.gz is downloaded to `~`. Adjust your own
actions accordingly. This is the same process for all versions of Linux.

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

## FreeBASIC

We use the standard FreeBASIC tool on Linux.

### FreeBASIC on Gentoo

The FreeBASIC compiler is available on portage.

```bash
emerge -av dev-lang-fbc
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

## Haskell

We use the standard Glasgow Haskell Compiler on Linux.

### Haskell on Gentoo

The Glasgow Haskell Compiler is on portage.

```bash
emerge -av dev-lang/ghc
ghc --version
```

### Haskell on Ubuntu

The Glasgo Haskell Compiler can be easily installed via apt.

```bash
sudo apt install ghc
ghc --version
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

## Icon

We use the standard Icon tools on Linux. All distributions will build the Icon
tools from source. Once the source is built, I copy the contents of the bin
directory to somewhere in PATH. If `~/bin` is in PATH, this works. Otherwise
change the `cp` line to copy somewhere to PATH.

```bash
git clone https://github.com/gtownsend/icon.git
cd icon
make Configure name=linux
make
cp ./bin/* ~/bin/
icon
```

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

## Julia

We use the standard Julia tools on Linux. This is the same on every distribution,
using juliaup to manage the installation.

```bash
curl -fsSL https://install.julialang.org | sh
source ~/.bashrc
juliaup
julia --version
```

## Kit

We use the standard Kit tools on Linux. You should install Zig first, regardless
of your distribution. Come back here when Zig is installed.

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

## Mojo

We use the standard Mojo tools on Linux.

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

## NASM

We use the Netwide Assembler and GNU ld tools on Linux.

### NASM on Gentoo

This is one simple package in protage.

```bash
emerge -av dev-lang/nasm
nasm -v
```

### NASM on Ubuntu

This is also very easy on apt.

```bash
sudo apt install nasm
nasm -v
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

## Scala

We use the standard Scala tools on Linux.
I ended up not using any of the packages that are immediately in the
package managers on linux for this. You can find the appropriate command line
to run on [The Scala Website](https://www.scala-lang.org/download/).

```bash
curl -fL https://github.com/coursier/coursier/releases/latest/download/cs-x86_64-pc-linux.gz | gzip -d > cs && chmod +x cs && ./cs setup
source ~/.bash_profile
scala --version
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

## Simula

We use GNU cim. It is not always the easiest to get going, but I was able
to figure it out.

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

We use the GNU Smalltalk tools on Linux.

I was able to get Simula working on Gentoo and Ubuntu with GCC-13 (see C or C++ section).
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

## V

We use the standard V tools on Linux.

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

## Web Assembly (WASM)

We use the wabt tools and node on Linux. See the Javascript section
for installing node. Assuming this is done, we just clone the git repository
for wabt, import its submodules, make, and install it.

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
