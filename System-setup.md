# System Setup

**CAUTION**: This documentation is currently under construction

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
apt install build-essential libtool cmake git curl unzip xz-utils zip libglu1-mesa
```

This will give us several GCC related tools, which will already give us some
of the language support we are looking for. It also enables us to build those
that don't come in nice apt packages.

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
website. In Gentoo, it is as easy as `sudo emerge -av vscode`.

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

We need to isntall GNAT. Which we can just do as the lowercase version.
Once installed, it will tell us the version. We can try running any source file
if we want from there using `run.sh` or carefully compile with `gnatmake` manually.

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

### Ballerina on Ubuntu

I needed to make sure that Java was installed first, despite having a .deb. See Java.

For Ubuntu, we download Ballerina right from the
[Downloads](https://ballerina.io/downloads/) page on their website, for us in deb form.

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

If we get a version below 15 and have any issues with modern code, we can update
to 15 by the adding the testing PPA, and then managing the g++ version
via update-alternatives.

```bash
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
apt install gcc
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-13 110
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-15 220
```

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

We use the standard Factor tool on Linux.

### Factor on Gentoo

### Factor on Ubuntu

## FreeBASIC

We use the standard FreeBASIC tool on Linux.

### FreeBASIC on Gentoo

### FreeBASIC on Ubuntu

## Forth

We use the GNU Forth tool on Linux.

### Forth on Gentoo

### Forth on Ubuntu

## Fortran

We use the GNU Fortran tool on Linux.

### Fortran on Gentoo

### Fortran on Ubuntu

## Gleam

We use the standard Gleam tool on Linux.

### Gleam on Gentoo

### Gleam on Ubuntu

## Go

We use the standard Go tool on Linux.

### Go on Gentoo

### Go on Ubuntu

## Haskell

We use the standard Glasgow Haskell Compiler on Linux.

### Haskell on Gentoo

### Haskell on Ubuntu

## Haxe

We use the standard Haxe tool on Linux.

### Haxe on Gentoo

### Haxe on Ubuntu

## Icon

We use the standard Icon tools on Linux.

### Icon on Gentoo

### Icon on Ubuntu

## Idris2

We use the standard Idris2 tools on Linux.

### Idris2 on Gentoo

### Idris2 on Ubuntu

## Java

We use Java on Linux.

### Java on Gentoo

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

### Javascript on Ubuntu

## Julia

We use the standard Julia tools on Linux.

### Julia on Gentoo

### Julia on Ubuntu

## Kit

We use the standard Kit tools on Linux.

### Kit on Gentoo

### Kit on Ubuntu

## Kotlin

We use the standard Kotlin tools and Java on Linux.

### Kotlin on Gentoo

### Kotlin on Ubuntu

## LLVM IR

We use the standard LLVM tools on Linux.

### LLVM on Gentoo

### LLVM on Ubuntu

## Lua

We use the standard Lua tools on Linux.

### Lua on Gentoo

### Lua on Ubuntu

## Mercury

We use the Melbourne Mercury Compiler tools on Linux.

### Mercury on Gentoo

### Mercury on Ubuntu

## MMIX

We use the Knuth's MMIXware tools on Linux.

### MMIX on Gentoo

### MMIX on Ubuntu

## Modula-3

We use the Critical Mass Modula-3 tools on Linux.

### Modula-3 on Gentoo

### Modula-3 on Ubuntu

## NASM

We use the Netwide Assembler and GNU ld tools on Linux.

### NASM on Gentoo

### NASM on Ubuntu

## Nim

We use the standard Nim tools on Linux.

### Nim on Gentoo

### Nim on Ubuntu

## Objective-C

We use the standard Clang tools on Linux.

### Objective-C on Gentoo

### Objective-C on Ubuntu

## Ocaml

We use the standard Ocaml tools on Linux.

### Ocaml on Gentoo

### Ocaml on Ubuntu

## Octave (MATLAB)

We use the standard Octave tools on Linux.

### Octave on Gentoo

### Octave on Ubuntu

## Oberon

We use the Vishap Oberon Compiler tools on Linux.

### Oberon on Gentoo

### Oberon on Ubuntu

## Pascal

We use the standard Free Pascal tools on Linux.

### Pascal on Gentoo

### Pascal on Ubuntu

## Perl

We use the standard Perl tools on Linux.

### Perl on Gentoo

### Perl on Ubuntu

## PHP

We use the standard PHP tools on Linux.

### PHP on Gentoo

### PHP on Ubuntu

## Prolog

We use the GNU Prolog tools on Linux.

### Prolog on Gentoo

### Prolog on Ubuntu

## Python

We use the standard Python tools on Linux.

### Python on Gentoo

### Python on Ubuntu

## R

We use the standard R tools on Linux.

### R on Gentoo

### R on Ubuntu

## Racket

We use the standard Racket tools on Linux.

### Racket on Gentoo

### Racket on Ubuntu

## Ruby

We use the standard Ruby tools on Linux.

### Ruby on Gentoo

### Ruby on Ubuntu

## Rust

We use the standard Rust tools on Linux.

### Rust on Gentoo

### Rust on Ubuntu

## Scala

We use the standard Scala tools on Linux.

### Scala on Gentoo

### Scala on Ubuntu

## Scheme

We use the GNU Guile tools on Linux.

### Scheme on Gentoo

### Scheme on Ubuntu

## Simula

The primary case to show here is getting GNU cim running on Ubuntu.

### Simula on Gentoo

For simula, I could not get GNU cim to compile on Gentoo, and I have ultimately
decided to run it on my Ubuntu VM. Thus I follow the Ubuntu instructions.

### Simula on Ubuntu

First, usual requirements: `sudo apt install build-essential libtool`

I downloaded 5.1 tar.gz from
[The GNU Cim Website](https://www.gnu.org/prep/ftp.html#north_america). Extract
this to a working directory somewhere for compilation with `tar zxvf cim-5.1.tar.gz`.

Then I had to modify 2 files. In lib/ : simset.c and simulation.c both try to
`#include ../../lib/cim.h` But that doesn't exist obviously on my system. However,
it does exist literally right next door. So I just changed them to cim.h bare.
This made cim compile and install well under Ubuntu.

```bash
./configure
make
sudo make install
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

### Protable Simula

I did get Portable Simula working on Gentoo, although I now use cim.
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

### Smalltalk on Gentoo

### Smalltalk on Ubuntu

## Swift

We use the standard Swift tools on Linux.

### Swift on Gentoo

### Swift on Ubuntu

## Tcl

We use the standard Tcl tools on Linux.

### Tcl on Gentoo

### Tcl on Ubuntu

## Typescript

We use the standard Typescript tools and node on Linux.

### Typescript on Gentoo

### Typescript on Ubuntu

## V

We use the standard V tools on Linux.

### V on Gentoo

### V on Ubuntu

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

We use the wabt tools and node on Linux.

### Web Assembly (WASM) on Gentoo

### Web Assembly (WASM) on Ubuntu

## Zig

We use the standard Zig tools on Linux.

### Zig on Gentoo

### Zig on Ubuntu
