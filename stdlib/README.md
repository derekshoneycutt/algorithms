
# Algorithms Standard Library

The point of algorithms in this folder is to create
the assembly (MMIX and NASM) that can be copied/linked
into the other files in this project, reducing
having to copy them into the source for every single
algorithm etc., and creating nice ways to just call
them to print, parse, etc. standard things.

All algorithms are split up into major categories,
`io`, `strings`, `math`, etc. Each code file is then named
such as `[AlgorithmName]-[Platform].[nasm/mms]`. In MMIXAL,
the prefixes follow this same structure; e.g. `std:io:PrintNumber`.
At this time, the same structure is not represented in the
NASM naming conventions, although that may change in the near
future.

-------

There is a unique build structure to this directory.
None of the code here is ran directly, but rather linked
into the project via the run script. The build script here
attempts to track any file changes and only update the object
files that reflect updates in the source files. There is one
final object (or amalgamated source in the case of MMIXAL)
that can then be linked into the algorithm code for
use.

The build script here is designed to be run with `build.sh`
and a specified build target.

```sh
./build.sh Linux-x64
```

The build target is case insensitive. The available options
are as follows.

- `MMIX` - This amalgamates the MMIXAL source files into ./output/stdlib.mms
- `Linux-x64` - This builds the Linux-x64 NASM source into ./output/stdlib-Linux-x64.o
- `Clean` - This cleans the output files. The next build will rebuild all of the specified platform, if another build follows.

It is possible to go into each subdirectory here and run the local build
scripts. This will build all the files in the directory for the specified
platform. These should be run the same way as the main build script in this
directory. The main build script looks through each immediate subdirectory
for a build script and runs it with the specified platform.

`build-local.sh` is used by each local build script to perform the builds
in a standard way. Each subdirectory contains a local build script to handle
any unique elements that are required for those algorithms, but otherwise they
all call `build-local.sh` to complete the build. This takes the platform being
built as the first parameter and the name of the final output file as a second
parameter. All files in that subdirectory that match the requested platform are
built and compiled into the final output file; typically a `.o` or an amalgamated
`.mms`. The parent build script takes these final output files and merges them
into the final `stdlib` output for linking.

If the build scripts are unsuccessful, they return non-zero. This can be
used in automated building/running, as with this project's primary run script.
