# System Setup

**CAUTION: This documentation is currently under construction**

This project is currently developed to build and run on Linux computers. All
the code is currently running on command line.

Gentoo is the first supported platform, on account of it is the platform I like
to run for fun. However, it has some issues that require further setup.

I have included a basic [Gentoo Setup](gentoo-setup.md) outline describing how
I got a Gentoo system working on my laptop. This is a supplement to the
Gentoo Handbook. The following section here will focus on the requirements for
setting up each language to compile/run on the machine.

## Basic Setup

For the most part, OS setup should follow general OS setup. I have provided some
tips that can help setup the base system for building packages in the various
languages given here.

### Gentoo

I have created a [gentoo-setup.md](gentoo-setup.md) which describes the general
Gentoo process that I used to create systems that can run all of this code. This
is basically just a supplement to the Gentoo Handbook and does not add anything
unusual, really. There are no significant extra steps to add to a Gentoo setup,
beyond just installing more language support, thanks to already be a source
compiling distribution.

### Ubuntu

Any standard Ubuntu setup will create a workable environment. Once this is
complete, we also need to install some tools that will be used by many of
the languages, or in some cases in building the tools for some languages.

```bash
apt install build-essential libtool
```

## Setting up an Unbuntu Server VM as a Code Runner

A small collection of languages do not seem to like the Gentoo system. Unsurprisingly,
these tend to be older languages not necessarily built within modern systems
that Gentoo likes to stay on the bleeding edge with. There are a handful of ways
to consider fixing this, but the easiest is to just create a VM running Ubuntu Server
and setup the necessary packages on there. This section will describe how to setup
such a VM, briefly, using VirtualBox. I assume anyone wishing to go with another VM
software or anything more convoluted than presented here will be familiar with
VMs enough to guide those decisions.

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

Setup the VM in VirtualBox and install Ubuntu Server. A standard install should
be enough to get going here. More RAM and CPU cores will increase performance of the VM,
but it also can prevent those resources being used by the host. Use a reasonable amount.
I find most of the languages for this are older and not very resource intensive in
any moment. It is worth making sure it can run headless, since we can just ssh into it.

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

On the host OS, we setup an easy SSH link to the guest and our coderun user. This
creates a special key so that we do not have to manually login with the password
every time. We can also test it to make sure that it works after.

```bash
ssh-keygen -t ed25519
ssh-copy-id -p 2222 coderun@127.0.0.1
ssh -p coderun@127.0.0.1 echo "test"
```

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

This is generally good enough to get going once we install the language support as
well. However, there is a significant issue that the VM will hibernate and take tens of
minutes to start up again at times. To do this, we need to turn off some services
that will try to force it, and also update grub settings to change how the OS is started.
We start with disabling the services.

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

This has proved insufficient in my experieence as other services bypass and still
start a hibernation cycle. The deeper fix is to `nano /etc/default/grub` in
the guest OS, and change `GRUB_CMDLINE_LINUX_DEFAULT` to include `acpi=off apm=off`.
Then updating grub and restarting will result in a VM that is always on.

```bash
sudo update-grub
```

As a final side note, it is technically possible to do a string of servers
with different capabilities to run code. The same run script is on the
host and guest OS. Technically, the guest VM could be replaced with a remote
VM in the cloud, or something similar, and these could be extended over multiple
code running servers. Unfortunately, such a string of servers would have a
significant inefficiency of `run.sh` currently only supporting a single code
running server.

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

## Ada

We use the GNAT toolchain here.

### Ada on Gentoo

emerge gnat

### Ada on Ubuntu

apt install gnat

## Ballerina

bal and Java

### Ballerina on Gentoo

emerge java ballerina?

### Ballerina on Ubuntu

apt install java and ballerina?

## C

We use GCC on Linux.

### C on Gentoo

This is easy: we have to install GCC on Gentoo during OS install, so we
already have the basics. `gcc --version` should tell us the exact version.

### C on Ubuntu

apt install build-essential gcc

## C++

We use GCC on Linux.

### C++ on Gentoo

This is easy: we have to install GCC on Gentoo during OS install, so we
already have the basics. `g++ --version` should tell us the exact version.

### C++ on Ubuntu

apt install build-essential gcc

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

Ubuntu manages an installer for dotnet in the main repository.

```bash
sudo apt-get update
sudo apt-get install -y dotnet-sdk-10.0
sudo apt-get install -y aspnetcore-runtime-10.0
```

## Clojure

We use the Leiningen tool on Linux.

### Clojure on Gentoo

### Clojure on Ubuntu

## COBOL

We use the GNU COBOL compiler on Linux.

### COBOL on Gentoo

### COBOL on Ubuntu

## D

We use the standard D compiler on Linux.

### D on Gentoo

### D on Ubuntu

## Dart

We use the standard Dart compiler on Linux.

### Dart on Gentoo

### Dart on Ubuntu

## Eiffel

We use the standard, open source EiffelStudio compiler on Linux.

It should be noted that EiffelStudio is a licensed product with a complete,
interesting IDE for development. The compiler is dual licensed, requiring
a commercial paid license for continued commerical use. Open source software
may continue to use it under an open source license. The code in this project
is all being released under the MIT license and for educational purposes only.
As such, we take advantage of the open source license.

### Eiffel on Gentoo

### Eiffel on Ubuntu

## Elixier

We use the standard Elixir tool on Linux.

### Elixir on Gentoo

### Elixir on Ubuntu

## Erlang

We use the standard Erlang tool on Linux.

### Erlang on Gentoo

### Erlang on Ubuntu

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

Ubuntu manages an installer for dotnet in the main repository.

```bash
sudo apt-get update
sudo apt-get install -y dotnet-sdk-10.0
sudo apt-get install -y aspnetcore-runtime-10.0
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

The case of Portable Simula on Gentoo should probably work fine on any distribution
with Java installed. SimulaSetupR17 requires Java 17-25. SimulaSetupR21 requires
Java 21-25. Latest Simula requires Java 25 or later.

### Simula on Gentoo

For simula, I could not get GNU cim to compile on Gentoo.

I did get Portable Simula working. I have ended up preferring to use GNU cim on
the VM for this project's code, but for the sake of I *did* get this to work as well,
I will include it here.

Java is a prerequisite. This will compile all simula code to the JVM, and
it runs, itself, on the JVM.

[Download Portable Simula](https://portablesimula.github.io/github.io/).

Run the setup like `java -jar SimulaSetup.jar`

After this, I created the following bash script, saved simply as `simula`,
and put it with `chmod a+x simula` in a directory in PATH. You should check
the location where Simula is setup and modify the script accordingly

```bash
#! /bin/bash
java -jar /home/USER/Simula/Simula-2.0/simula.jar $@
```

To run scripts in the console without the custom popup that Portable Simula
offers, you can add the `-noPopup` argument.

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

Ubuntu manages an installer for dotnet in the main repository.

```bash
sudo apt-get update
sudo apt-get install -y dotnet-sdk-10.0
sudo apt-get install -y aspnetcore-runtime-10.0
```

## Web Assembly (WASM)

We use the wabt tools and node on Linux.

### Web Assembly (WASM) on Gentoo

### Web Assembly (WASM) on Ubuntu

## Zig

We use the standard Zig tools on Linux.

### Zig on Gentoo

### Zig on Ubuntu
