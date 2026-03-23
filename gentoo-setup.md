# Gentoo Setup

The point of this document is to describe what is necessary to create a Gentoo
installation that can run all of the code in this repository, from scratch.
This does not include how to install the requirements for each language, which
is present elsewhere. Rather, Gentoo is just kinda difficult, and I provide
this to help. This should provide a deep clue of some assumptions that will
help get this running. Hopefully, I will also do at least one other distribution
in the future and create a common file for the necessary parts.

The Gentoo Handbook rightfully shows a pretty good install. You should follow that.
That said. There are things that I could not get through an install without critical
thought and googling. This might be of help if you are really careful, but this file
is only a resource, not a guide.

For this part, I am installing on a Lenovo ThinkPad with a AMD Ryzen 7 processor of
8 physical cores, and 64GB of RAM. I am intending to restart this laptop because I
let it sit for a while, and it sounds fun, so I am starting with this project.

## Initial Setup

To start, I am working from a download of the Gentoo Live CD. Mine was downloaded
several months ago. Just about anything works for a live updated Gentoo install,
so any live linux that allows us to setup the disks and chroot into the install works.

The Gentoo Live CD is insufferable for my WiFi situation. I needed to first attempt
to connect to WiFi, and then go into System Settings, find the wifi connection under
Wifi & Networking. In the Wi-Fi Security tab, I change it to store *not* encrypted,
and enter my password. After this, Wifi works.

Once that is done, I can do a `sudo su` and run `chronyd -q` to ensure my time is
correct, at least to UTC. This is good enough to start.

After that, I am ready to go to setting up the disk

## Disk Setup

I have an nvme drive in my laptop, so I start by fdisk into there.

```bash
fdisk /dev/nvme0n1
```

`p` will list the existing partition table on the disk, if wanted. This is the steps
I followed to make an EFI partition, an 8GB swap partition, and the rest of my
1TB drive to an ext4 partition. Read the Gentoo handbook and/or fstab documentation
for details on what I am doing and other options.

```fdisk
Command (m for help): g
Created a new GPT disklabel (GUID: ...).

The rest is just my example to create an EFI, swap, and ext4 drive.
The Gentoo handbook includes a lot more detail for this part, as well
as the fdisk documentation.

Command (m for help): n
Partition number (1-128, default 1): \enter
First sector (2048-2000409230, default 2048): \enter
Last sector, +/-sectors or +/-size{K,M,G,T,P} (2048-2000409230, default 2000408575): +1GB

Created a new partition 1 of type 'Linux filesystem' and of size 954MiB.
Partition #1 contains a vfat signature.

Do you want to remove the signature? [Y]es/[N]o: Y

The signature will be removed by a write command.

Command (m for help): t
Selected partition 1
Partition type or alias (type L to list all): 1

Changed type of partition 'Linux filesystem' to 'EFI System'.

Command (m for help): n
Partition number (1-128, default 1): \enter
First sector (1955840-2000409230, default 1955840): \enter
Last sector, +/-sectors or +/-size{K,M,G,T,P} (1955840-2000409230, default 2000408575): +8GB

Created a new partition 2 of type 'Linux filesystem' and of size 8 GiB.

Command (m for help): t
Partition number (1,2, default 2): 2
Partition type or alias (type L to list all): 19

Changed type of partition 'Linux filesystem' to 'Linux swap'.

Command (m for help): n
Partition number (3-128, default 3): \enter
First sector (18733056-2000409230, default 18733056): \enter
Last sector, +/-sectors or +/-size{K,M,G,T,P} (18733056-2000409230, default 2000408575): \enter

Created a new partition 3 of type 'Linux filesystem' and of size 944.9 GiB.


Command (m for help): p
    LIST OF TABLE (review)

Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
Syncing disks.
```

After this, I setup the formatting on all these partitions, and mount them.

```bash
mkfs.vfat -F 32 /dev/nvme0n1p1
mkswap /dev/nvme0n1p2
mkfs.ext4 /dev/nvme0n1p3

swapon /dev/nvme0n1p2
mkdir --parents /mnt/gentoo
mount /dev/nvme0n1p3 /mnt/gentoo
mkdir --parents /mnt/gentoo/efi
```

## Boostrapping

Next, we get to bootstrapping the Gentoo system. I just download the
`desktop profile | systemd` for AMD64 systems in the browser and copy it
to `/mnt/gentoo` manually. Then it is the extraction.

```bash
tar xpvf stage3-*.tar.xz --xattrs-include="*.*" --numeric-owner -C /mnt/gentoo
```

Now, we modify `/mnt/gentoo/etc/portage/make.conf`. Below are some flags I ensure
to modify within the make.conf. You may have additional values in the file.

I like to set CPU_FLAGS_X86
according to cpuid2cpuflags, which lists the flags. I also like to set some
MAKEOPTS and EMERGE_DEFAULT_OPTS that allow some multithreaded building.
Additionally, I like to enable some fun emerge features like candy for nice
displays, and parallel-fetch and parallel-install for parallel builds.
I add collision-protect, but in some slot situations you may need to disable
that temporarily to get through builds if you have it enabled.
I will go ahead and accept test flags for AMD64 to get bleeding edge, and
accept all licenses as well. I add Rust flags here, and we might just add even more
for other languages later.

This is not the place to get into all of the settings I include here, but
-j and -l flags are particularly interesting. I show one here that limits, attempting
to keep some of the heat down on my laptop by not inherently utilizing every core
with heavy loads. I do -j16 and -l16 with good cooling on my desktop and it
works great. On the laptop, less so.

```make.conf
COMMON_FLAGS="-march=native -O2 -pipe"
CFLAGS="${COMMON_FLAGS}"
CXXFLAGS="${COMMON_FLAGS}"
FCFLAGS="${COMMON_FLAGS}"
FFLAGS="${COMMON_FLAGS}"
RUSTFLAGS="${RUSTFLAGS} -C target-cpu=native"

CPU_FLAGS_X86="aes avx avx2 bmi1 bmi2 f16c fma3 mmx mmxext pclmul popcnt rdrand sha sse sse2 sse3 sse4_1 sse4_2 sse4a ssse3 vpclmulqdq"

MAKEOPTS="-j8 -l4"
EMERGE_DEFAULT_OPTS="-avq -j 8 -l 4"


FEATURES="candy parallel-fetch parallel-install sign collision-protect"
ACCEPT_KEYWORDS="~amd64"
ACCEPT_LICENSE="* @EULA @BINARY-REDISTRIBUTABLE @FREE"

USE="dist-kernel bluetooth bluetooth-sound bash-completion"

VIDEO_CARDS="amdgpu radeonsi"

GRUB_PLATFORMS="efi-64"
```

I like to do the following optimizations as well:

```bash
echo "*/* $(cpuid2cpuflags)" > /mnt/gentoo/etc/portage/package.use/00cpu-flags
echo "*/* VIDEO_CARDS: amdgpu radeonsi" > /mnt/gentoo/etc/portage/package.use/00video_cards
echo "sys-devel/gcc graphite" > /mnt/gentoo/etc/portage/package.use/gcc
```

## Entering chroot

Now we get to actually setting up the OS. I run the following commands.

```bash
cp --dereference /etc/resolv.conf /mnt/gentoo/etc/

mount --types proc /proc /mnt/gentoo/proc
mount --rbind /sys /mnt/gentoo/sys
mount --make-rslave /mnt/gentoo/sys
mount --rbind /dev /mnt/gentoo/dev
mount --make-rslave /mnt/gentoo/dev
mount --bind /run /mnt/gentoo/run
mount --make-slave /mnt/gentoo/run

chroot /mnt/gentoo /bin/bash
source /etc/profile
export PS1="(chroot) ${PS1}"
```

The Gentoo Handbook puts setting up fstab way later, but
I find it helpful to go ahead and setup here. I run `blkid` to get
the UUID of the partitions on my system and then `nano /etc/fstab`.
This seems a little random, but it makes it easier in my experience.

```fstab
# ...

# <fs>              <mountpoint>    <type>      <opts>              <dump> <pass>
UUID="XXXX-XXXX"     /efi            vfat        umask=0077,tz=UTC   0 2
UUID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"  none    swap    sw      0 0
UUID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"  /       ext4    defaults,noatime    0 1
```

Now, it is easy to just mount `/efi`, the only one not already mounted.

```bash
mount /efi
```

Now, we want to sync and start getting ready to use portage to continue setting
up everything we want.

```bash
emerge-webrsync
```

Then we need to set our profile. I use gnome/systemd, which is #6 on the list at
the time I write this.

```bash
eselect profile list
eselect profile set 6
```

Finally, we can sync portage for real and update our system to the latest builds
and anything that needs to be rebuilt based on our settings so far.
This part takes a lot of time quite often.

```bash
emerge --sync
emerge -uUND @world
emerge --depclean
```

Once this is finished, I set the time zone and locale correctly. You can do an
`ls /usr/share/zoneinfo` to find your correct zone if LA isn't correct for you.

```bash
ln -sf ../usr/share/zoneinfo/America/Los_Angeles /etc/localtime
nano /etc/locale.gen
# at the end, add: en_US.UTF-8 UTF-8
locale-gen
eselect locale list
eselect local set [#] # use the number of the UTF-8 listed in previous step
env-update && source /etc/profile && export PS1="(chroot) ${PS1}"
```

## Setting up the Kernel and Bootloader

The system is now bootstrapped and ready to work. The only problem is that
it does not yet have its own kernel to run on and bootloader to load it
on startup. So we do those next.

Before getting started, I run into issues if I do not do extra steps outside
of the Gentoo handbook. Specifically, I need to create a coule of files
for the build system, and also set some USE flags for specific packages.

I will be using grub as the bootloader and need to support nvme, so these
are the jist of use flags I set now.

```bash
touch /etc/kernel/cmdline
touch /etc/kernel/install.d/05-check-chroot.install
echo "sys-kernel/installkernel grub dracut" >> /etc/portage/package.use/installkernel
echo "sys-fs/lvm2 nvme" >> /etc/portage/package.use/lvm2
```

Next, I go ahead and install the firmware, kernel, grub, and plymouth
all at once. You can follow the Gentoo Handbook for more advanced setup
and troubleshooting.

Sometimes I have to run the first line in the next block
once in order to get this build to work, prior to the full request.

```bash
emerge linux-firmware sof-firmware installkernel gentoo-kernel grub grub-themes-gentoo plymouth
emerge --depclean
emerge @module-rebuild
```

I often run into issues with bc and cpio when I try to build these,
complaining about a detected collision and not continuing the build.
After that error is received, the following emerge will correct it. This allows
bc and cpio alternative managers to manage the instance of the executables
for bc and cpio, which often results in a collision if collision-protect is on.
That first line will still often end with a lot of red about detected collision,
but you can ignore it and run the previous emerge again, as long as the only error
is about collision.

I often go back and forth between these trying to make it work, and usually it comes
together. It is just a matter of convincing portage to stop failing on trying to
install the app-alternatives for bc and cpio, or at least keep going once they
fail. You can remove collision-protect from FEATURES in /etc/portage/make.conf
if it just won't. I have also just done this in the end.

```bash
FEATURES="-collision-protect" emerge sys-devel/bc app-alternatives/bc app-arch/cpio app-alternatives/cpio
```

While the kernel is building, I like to find the plymouth theme that I will use
to give my bootup a nice splash screen. You can find a bunch at gnome-look.
Personally, I go with a gentoo logo theme at [https://www.gnome-look.org/p/1000022](https://www.gnome-look.org/p/1000022). Note, the plymouth themes are located on the disk
at `/usr/share/plymouth/themes`. You can also do a Grub theme, but I just
keep with the default Gentoo Glass theme.

Once the kernel is compiled, we can setup plymouth and grub so we are almmost
at a bootable system!

```bash
plymouth-set-default-theme --list
plymouth-set-default-theme gentoo-logo

nano /etc/default/grub
# Modify the following Lines:
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash fbcon=nodefer"
GRUB_GFXMODE=2880x1800 # CHANGE THIS TO YOUR RESOLUTION
GRUB_GFXPAYLOAD_LINUX=keep

grub-install --target=x86_64-efi --efi-directory=/efi --removable
emerge --config gentoo-kernel
```

## System Configurations and Tools

Now it is time to set some basic data. Choose a hostname and add it.
I get an error on the second line and have to do it later, but Gentoo handbook...

```bash
echo MyHostname > /etc/hostname
hostnamectl hostname MyHostname
```

We also set the root password and setup systemd. Review the Gentoo Handbook
for more details on these.

```bash
passwd

systemd-machine-id-setup
systemd-firstboot --prompt

systemctl preset-all --preset-mode=enable-only
systemctl preset-all
systemctl --user enable modprobed-db

emerge mlocate bash-completion chrony
systemctl enable chronyd.service

emerge io-scheduler-udev-rules e2fsprogs dosfstools ntfs3g iw wpa_supplicant genlop gentoolkit portage-utils pciutils usbutils alsa-utils playerctl cpuid2cpuflags eclean-kernel eselect-repository tpm2-tools
```

We can add a user now, too.

```bash
useradd -m -G wheel,audio,video,usb,input,kvm,users -s /bin/bash USERNAME
passwd USERNAME

#if a group isn't there and you want it, you can add it:
groupadd NEWGROUPNAME
```

If you want, you can `emerge sudo` and then `nano /etc/sudoers`. I have used the line
`%wheel ALL=(ALL:ALL) ALL` to make all users available to sudo, but you can limit
to specific users as well.

## Gnome

I always use Gnome, but KDE will be very similar. I just emerge gnome and enable
some services it brings in. I start with localsearch which enables several search
features in the OS that can be helpful.

```bash
emerge localsearch
emerge gnome

systemctl enable NetworkManager
systemctl enable bluetooth
systemctl enable gdm.service
systemctl --global enable pipewire.socket pipewire-pulse.socket
systemctl --global --force enable wireplumber.service
```

A fun hack if you are using dark mode: `nano ~/.config/gtk-3.0/settings.ini` and
add the following:

```ini
[Settings]
gtk-application-prefer-dark-theme = 1
```

## Rebooting into Gentoo

This should give us the gentoo system that we can work with now. We just need to reboot

```bash
exit
cd
umount -l /mnt/gentoo/dev/{/shm,/pts,}
umount -R /mnt/gentoo
reboot
```

I have previously found myself needing to run the following in a user session for some
packages that require kernel modules (e.g. VM software)

```bash
hostnamectl hostname MyHostname
systemctl --user enable modprobed-db
```
