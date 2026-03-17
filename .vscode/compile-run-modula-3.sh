#! /bin/bash

# This is here because it is used to run Modula 3 on a VM. This is
# in the VM, and is run via SSH to compile and launch a Modula 3 file.

other_params=${@:2}

cd /home/coderun/codefiles
mkdir -p AMD64_LINUX
rm -f ./AMD64_LINUX/*
mv $1 ./AMD64_LINUX/$1
/home/coderun/cm3/bin/cm3 $1 > /home/coderun/cm3-output-last

TARGET_FILE="/home/coderun/codefiles/AMD64_LINUX/prog"
if [[ -f "$TARGET_FILE" ]]; then
  "$TARGET_FILE" $other_params
else
  echo "FAILED TO COMPILE MODULA-3. BUILD OUTPUT:"
  cat /home/coderun/cm3-output-last
fi
