#! /bin/sh

# First argument must either be a supported filename or
# "clean". If "clean", the output directory is destroyed
# and the script exits. Otherwise, it will continue to try
# to compile the file specified, passing in any other
# arguments to the code as command line arguments

fileName=$1
fileNameWithoutExt="${fileName%.*}"
fileExtension="${fileName##*.}"
className=$(echo "$fileNameWithoutExt" | tr '[:lower:]' '[:upper:]')
shift 1
other_params="$@"
CURRENT_CPU_ARCH=$(uname -m)
CURRENT_PLATFORM=$(uname -s)
start_dir=$PWD
dir="${PWD%/*}"
packName="${dir##*/}"
algoName="${PWD##*/}"
lang=
testFile=
destroy_output=0
retValue=0

DATE_CMD="date"
case "$CURRENT_PLATFORM" in
  "MINGW64_NT"*) . ~/.bash_profile ;;
  "Linux"*) . ~/.bash_profile ;;
  "FreeBSD")
    DATE_CMD="gdate"
    . ~/.profile >> /dev/null
    ;;
  "Darwin")
    DATE_CMD="gdate"
    . ~/.zprofile >> /dev/null
    ;;
  *) ;;
esac

get_ms_time() {
  $DATE_CMD +%s%3N | cut -b1-13
}

# Color variables
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NORMAL='\033[0m' # Resets the color to default

# The following of environment variables may be best suited
# in ~/.bash_profile ; as such many are commented out here.

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib
#export DEREKALGOS_TIMEOUT="-k 10s 1m"
#export DEREKALGOS_EIFFEL="eiffelstudio"
#export DEREKALGOS_GCC13="/usr/x86_64-pc-linux-gnu/gcc-bin/13/"
#export DEREKALGOS_GCC13NAME="x86_64-pc-linux-gcc"
#export DEREKALGOS_GXX13NAME="x86_64-pc-linux-g++"
#export DEREKALGOS_RUNONDOCKER="ada=code-runner asm=code-runner ballerina=code-runner freebasic=code-runner c=code-runner clojure=code-runner cobol=code-runner cpp=code-runner csharp=code-runner d=code-runner dart=code-runner eiffel=code-runner erlang=code-runner elixir=code-runner fortran=code-runner factor=code-runner fsharp=code-runner forth=code-runner gleam=code-runner go=code-runner haskell=code-runner haxe=code-runner icon=code-runner idris=code-runner java=code-runner julia=code-runner javascript=code-runner kit=code-runner kotlin=code-runner llvmir=code-runner lua=code-runner objectivec=code-runner modula3=code-runner octave=code-runner ocaml=code-runner mmixal=code-runner oberon=code-runner mojo=code-runner mercury=code-runner nasm=code-runner nim=code-runner pascal=code-runner php=code-runner prolog=code-runner perl=code-runner python=code-runner r=code-runner ruby=code-runner racket=code-runner rust=code-runner scala=code-runner scheme=code-runner simula=code-runner smalltalk=code-runner swift=code-runner tcl=code-runner typescript=code-runner v=code-runner visualbasic=code-runner wat=code-runner zig=code-runner"
#export DEREKALGOS_RUNONSSH="forth=UBUNTURUNNER modula3=UBUNTURUNNER oberon=UBUNTURUNNER"
#export DEREKALGOS_SSH_UBUNTURUNNER_PORT="2222"
#export DEREKALGOS_SSH_UBUNTURUNNER_USER="coderun"
#export DEREKALGOS_SSH_UBUNTURUNNER_ADDRESS="127.0.0.1"
#export DEREKALGOS_SSH_UBUNTURUNNER_CODEDIR="/home/coderun/codefiles"
#export DEREKALGOS_SSH_UBUNTURUNNER_STARTDIR="/home/coderun"
#export DEREKALGOS_SSH_UBUNTURUNNER_RUNSCRIPT="../run.sh"

# The first section, each language that we support needs to have
# a lang_compile and lang_run. This will be called when a file of
# that code type is recognized according to file extension below
# The compile phase can reasonably do nothing for scripts and similar.
# Any build output should go to ./output/lang-build-last
# as this will be output when recognized that the build failed

# =============================================
#           ADA
# =============================================
ada_compile() {
  echo "gnatmake -q -D output -o \"./output/$fileNameWithoutExt\" \"$fileName\"" > ./output/ada-build-last
  gnatmake -q -D output -o "./output/$fileNameWithoutExt" "$fileName" >> ./output/ada-build-last  2>&1
  retValue="$?"
  echo "-- GNAT returned: $retValue" >> ./output/ada-build-last
}
ada_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           ASSEMBLY (ARM64)
# =============================================
arm64asm_compile() {
  do_link=0
  platform="$CURRENT_PLATFORM"
  platform_output=
  case "$platform" in
    "Darwin"*)
      platform="Darwin"
      platform_output="darwin"
    ;;
    *)
      echo "Unrecognized Platform for Assembly Builds" > ./output/arm64asm-build-last
      retValue=1
      return 1
    ;;
  esac
  case "$CURRENT_CPU_ARCH" in
    "arm64")
      platform="${platform}-arm64"
      platform_output="${platform_output}arm64"
      ;;
    *)
      echo "Unrecognized CPU Architecture for Assembly Builds" > ./output/arm64asm-build-last
      retValue=1
      return 1
      ;;
  esac

  # First go into stdlib and build the standard library ;)
  #   Only build if there's new changes to be built
  echo "Building Assembly..." > ./output/arm64asm-build-last
  echo "Building Assembly Standard Library..." >> ./output/arm64asm-build-last
  cp "./$fileName" ./output/
  cd ../../../stdlib
  ./build.sh "$platform" > "$start_dir/output/arm64asm-build-last"
  retValue="$?"
  cd $start_dir
  if [ $retValue -ne 0 ]; then
    return $retValue
  fi
  cat "../../../stdlib/output/${platform_output}-build-last" >> ./output/arm64asm-build-last
  stdlib="../../../stdlib/output/stdlib-${platform}.o"

  # Now we build our actual output, linking to the standard library
  #   Only build if there's new changes to be built
  echo "Building Assembly file..." >> ./output/arm64asm-build-last
  do_build=0
  if [ ! -f "./output/$fileNameWithoutExt.o" ]; then
    do_build=1
  elif [ -n "$(find "$fileName" -prune -newer "./output/$fileNameWithoutExt.o" 2>/dev/null)" ]; then
    do_build=1
  fi
  if [ "$do_build" -eq 1 ]; then
    echo "as -arch arm64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/arm64asm-build-last
    as -arch arm64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/arm64asm-build-last 2>&1
    retValue="$?"
        
    echo "-- as returned: $retValue" >> ./output/arm64asm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
    do_link=1
  fi
  if [ ! -f "./output/$fileNameWithoutExt" ]; then
    do_link=1
  elif [ -n "$(find "$stdlib" -prune -newer "./output/$fileNameWithoutExt" 2>/dev/null)" ]; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    echo "ld -e _start -arch arm64 -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\" -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path)" >> ./output/arm64asm-build-last
    ld -e _start -arch arm64 -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path) >> ./output/arm64asm-build-last 2>&1
    retValue="$?"
    echo "-- ld returned: $retValue" >> ./output/arm64asm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
  fi
}
arm64asm_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           ASSEMBLY (AT&T/GAS - x86-64)
# =============================================
asm_compile() {
  do_link=0
  platform="$CURRENT_PLATFORM"
  platform_output=
  case "$platform" in
    "MINGW64_NT"*)
      platform="Windows"
      platform_output="windows"
    ;;
    "Linux"*)
      platform="Linux"
      platform_output="linux"
    ;;
    "FreeBSD"*)
      platform="FreeBSD"
      platform_output="freebsd"
    ;;
    *)
      echo "Unrecognized Platform for Assembly Builds" > ./output/asm-build-last
      retValue=1
      return 1
    ;;
  esac
  case "$CURRENT_CPU_ARCH" in
    "x86_64")
      platform="${platform}-x64"
      platform_output="${platform_output}x64"
      ;;
    "amd64")
      platform="${platform}-x64"
      platform_output="${platform_output}x64"
      ;;
    *)
      echo "Unrecognized CPU Architecture for Assembly Builds" > ./output/asm-build-last
      retValue=1
      return 1
      ;;
  esac

  # First go into stdlib and build the standard library ;)
  #   Only build if there's new changes to be built
  echo "Building Assembly..." > ./output/asm-build-last
  echo "Building Assembly Standard Library..." >> ./output/asm-build-last
  cp "./$fileName" ./output/
  cd ../../../stdlib
  ./build.sh "$platform" > "$start_dir/output/asm-build-last"
  retValue="$?"
  cd $start_dir
  if [ $retValue -ne 0 ]; then
    return $retValue
  fi
  cat "../../../stdlib/output/${platform_output}-build-last" >> ./output/asm-build-last
  stdlib="../../../stdlib/output/stdlib-${platform}.o"

  # Now we build our actual output, linking to the standard library
  #   Only build if there's new changes to be built
  echo "Building Assembly file..." >> ./output/asm-build-last
  do_build=0
  if [ ! -f "./output/$fileNameWithoutExt.o" ]; then
    do_build=1
  elif [ -n "$(find "$fileName" -prune -newer "./output/$fileNameWithoutExt.o" 2>/dev/null)" ]; then
    do_build=1
  fi
  if [ "$do_build" -eq 1 ]; then
    case "$platform" in
      "Windows-x64")
        echo "as --defsym WINDOWS=1 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/asm-build-last
        as --defsym WINDOWS=1 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "as --defsym WINDOWS=0-o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/asm-build-last
        as --defsym WINDOWS=0 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
    esac
    echo "-- as returned: $retValue" >> ./output/asm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
    do_link=1
  fi
  if [ ! -f "./output/$fileNameWithoutExt" ]; then
    do_link=1
  elif [ -n "$(find "$stdlib" -prune -newer "./output/$fileNameWithoutExt" 2>/dev/null)" ]; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    case "$platform" in
      "Windows-x64")
        echo "ld -e _start -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\" -L \"$LD_ADDITIONAL_DIRECTORY\" -lkernel32 -lshell32" >> ./output/asm-build-last
        ld -e _start -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" -L "$LD_ADDITIONAL_DIRECTORY" -lkernel32 -lshell32 >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "ld -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\"" >> ./output/asm-build-last
        ld -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
    esac
    echo "-- ld returned: $retValue" >> ./output/asm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
  fi
}
asm_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Ballerina
# =============================================
ballerina_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "bal build \"$fileName\"" > ./ballerina-build-last
  bal build "$fileName" >> ./ballerina-build-last  2>&1
  retValue="$?"
  echo "-- bal returned: $retValue" >> ./ballerina-build-last

  cd ..
}
ballerina_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT java -jar "./output/$fileNameWithoutExt.jar" $other_params
}

# =============================================
#           FreeBASIC
# =============================================
freebasic_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "fbc \"./$fileName\"" > ./freebasic-build-last
  fbc "./$fileName" >> ./freebasic-build-last  2>&1
  retValue="$?"
  echo "-- fbc returned: $retValue" >> ./freebasic-build-last

  cd ..
}
freebasic_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           C
# =============================================
c_compile() {
  echo "gcc "./$fileName" -o "./output/$fileNameWithoutExt"" > ./output/c-build-last
  gcc "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/c-build-last 2>&1
  retValue="$?"
  echo "-- GCC returned: $retValue" >> ./output/c-build-last
}
c_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Clojure
# =============================================
clojure_compile() { :; }
clojure_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT lein exec "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           COBOL
# =============================================
cobol_compile() {
  echo "cobc -x -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/cobol-build-last
  cobc -x -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/cobol-build-last 2>&1
  retValue="$?"
  echo "-- cobc returned: $retValue" >> ./output/cobol-build-last
}
cobol_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           C++
# =============================================
cpp_compile() {
  echo "g++ \"./$fileName\" -o \"./output/$fileNameWithoutExt\" --std=c++23 -lstdc++exp" > ./output/cpp-build-last
  g++ "./$fileName" -o "./output/$fileNameWithoutExt" --std=c++23 -lstdc++exp >> ./output/cpp-build-last 2>&1
  retValue="$?"
  echo "-- G++ returned: $retValue" >> ./output/cpp-build-last
}
cpp_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           C#
# =============================================
csharp_compile() { :; }
csharp_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT dotnet run "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           D
# =============================================
d_compile() {
  echo "dmd -od=./output -of=\"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/d-build-last
  dmd -od=./output -of="./output/$fileNameWithoutExt" "./$fileName" >> ./output/d-build-last 2>&1
  retValue="$?"
  echo "-- dmd returned: $retValue" >> ./output/d-build-last
}
d_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Dart
# =============================================
dart_compile() {
  echo "dart compile exe \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/dart-build-last
  dart compile exe "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/dart-build-last 2>&1
  retValue="$?"
  echo "-- dart returned: $retValue" >> ./output/dart-build-last
}
dart_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Eiffel
# =============================================
eiffel_compile() {
  case "$DEREKALGOS_EIFFEL" in
  "eiffelstudio")
    new_uuid=$(uuidgen)

    cp "./$fileName" ./output/
    cp ./eiffel_include/*.e ./output/ >> /dev/null 2>&1
    cd ./output/

    echo "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>
<system xmlns=\"http://www.eiffel.com/developers/xml/configuration-1-23-0\"
        xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
        xsi:schemaLocation=\"http://www.eiffel.com/developers/xml/configuration-1-23-0 http://www.eiffel.com/developers/xml/configuration-1-23-0.xsd\"
        name=\"$fileNameWithoutExt\" uuid=\"$new_uuid\">
    <target name=\"$fileNameWithoutExt\">
        <root feature=\"make\" class=\"$className\"/>
        <file_rule>
            <exclude>/EIFGENs$</exclude>
            <exclude>/\..*$</exclude>
        </file_rule>
        <option warning=\"warning\">
            <assertions precondition=\"true\" postcondition=\"true\"
                        check=\"true\" invariant=\"true\" loop=\"true\"
                        supplier_precondition=\"true\"/>
        </option>
        <setting name=\"console_application\" value=\"true\"/>
        <precompile name=\"base_pre\" location=\"\$ISE_PRECOMP/base-scoop-safe.ecf\"/>
        <library name=\"base\" location=\"\$ISE_LIBRARY/library/base/base.ecf\"/>
        <cluster name=\"$fileNameWithoutExt\" location=\".\\\" recursive=\"true\"/>
    </target>
</system>" > "./$fileNameWithoutExt.ecf"

    echo "ec -batch -config \"./$fileNameWithoutExt.ecf\" -finalize" > ./eiffel-build-last
    ec -batch -config "./$fileNameWithoutExt.ecf" -finalize >> ./eiffel-build-last 2>&1
    retValue="$?"
    echo "-- ec returned: $retValue" >> ./eiffel-build-last
    cd ..
    if [ "$retValue" -ne 0 ]; then
     return $retValue
    fi

    cd "./output/EIFGENs/$fileNameWithoutExt/F_code"
    echo "

===========================================================================
FIRST COMPILE FINISHED. CALLING finish_freezing in EIFGENs/$fileNameWithoutExt/F_code
===========================================================================

" >> "../../../eiffel-build-last"
    finish_freezing >> "../../../eiffel-build-last"
    retValue="$?"
    echo "-- finish_freezing returned: $retValue" >> ../../../eiffel-build-last

    cd ../../../../
  ;;
  "libertyeiffel")
    cp "./$fileName" ./output/
    cp ./eiffel_include/*.e ./output/ >> /dev/null 2>&1
    mkdir -p "./output/EIFGENs/$fileNameWithoutExt/F_code"
    cd ./output/

    echo "se compile \"$fileName\" -o \"./$fileNameWithoutExt\"" > ./eiffel-build-last
    se compile "$fileName" -o "EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt" >> ./eiffel-build-last 2>&1

    cd ..
  ;;
  esac
}
eiffel_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Erlang
# =============================================
erlang_compile() {
  echo "erlc -o ./output/ \"./$fileName\"" > ./output/erlang-build-last
  erlc -o ./output/ "./$fileName" >> ./output/erlang-build-last 2>&1
  retValue="$?"
  echo "-- erlc returned: $retValue" >> ./output/erlang-build-last
}
erlang_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT erl -noshell -s "$fileNameWithoutExt" main -s init stop -- $other_params
  retValue="$?"
  cd ..
}

# =============================================
#           Elixir
# =============================================
elixir_compile() { :; }
elixir_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT elixir "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Fortran
# =============================================
fortran_compile() {
  echo "gfortran \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/fortran-build-last
  gfortran "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/fortran-build-last 2>&1
  retValue="$?"
  echo "-- gfortran returned: $retValue" >> ./output/fortran-build-last
}
fortran_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Factor
# =============================================
factor_compile() { :; }
factor_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT factor -run "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           FSharp
# =============================================
fsharp_compile() { :; }
fsharp_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT dotnet fsi "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Forth
# =============================================
forth_compile() { :; }
forth_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT gforth "./$fileName" -- $other_params
  retValue="$?"
}

# =============================================
#           Gleam
# =============================================
gleam_compile() {
  mkdir -p output/src
  cp "./$fileName" ./output/src/

  echo "name = \"$fileNameWithoutExt\"
version = \"1.0.0\"

[dependencies]
gleam_stdlib = \">= 0.71.0 and < 1.0.0\"
argv = \">= 1.0.2 and < 2.0.0\"
format = \">= 1.0.0 and < 2.0.0\"
gleam_erlang = \">= 1.3.0 and < 2.0.0\"

[dev-dependencies]
gleeunit = \">= 1.0.0 and < 2.0.0\"
  " > "./output/gleam.toml"

  echo "
packages = [
  { name = \"argv\", version = \"1.0.2\", build_tools = [\"gleam\"], requirements = [], otp_app = \"argv\", source = \"hex\", outer_checksum = \"BA1FF0929525DEBA1CE67256E5ADF77A7CDDFE729E3E3F57A5BDCAA031DED09D\" },
  { name = \"format\", version = \"1.0.0\", build_tools = [\"gleam\"], requirements = [\"gleam_stdlib\"], otp_app = \"format\", source = \"hex\", outer_checksum = \"7654EE35E01394BF558F364542F163941A66CBA1512AA7D53F2A794BBD90BD9D\" },
  { name = \"gleam_erlang\", version = \"1.3.0\", build_tools = [\"gleam\"], requirements = [\"gleam_stdlib\"], otp_app = \"gleam_erlang\", source = \"hex\", outer_checksum = \"1124AD3AA21143E5AF0FC5CF3D9529F6DB8CA03E43A55711B60B6B7B3874375C\" },
  { name = \"gleam_stdlib\", version = \"0.71.0\", build_tools = [\"gleam\"], requirements = [], otp_app = \"gleam_stdlib\", source = \"hex\", outer_checksum = \"702F3BC2A14793906880B1078B19A6165F87323AEE8D0C4A34085846336FCAAE\" },
  { name = \"gleeunit\", version = \"1.9.0\", build_tools = [\"gleam\"], requirements = [\"gleam_stdlib\"], otp_app = \"gleeunit\", source = \"hex\", outer_checksum = \"DA9553CE58B67924B3C631F96FE3370C49EB6D6DC6B384EC4862CC4AAA718F3C\" },
]

[requirements]
argv = { version = \">= 1.0.2 and < 2.0.0\" }
format = { version = \">= 1.0.0 and < 2.0.0\" }
gleam_erlang = { version = \">= 1.3.0 and < 2.0.0\" }
gleam_stdlib = { version = \">= 0.71.0 and < 1.0.0\" }
gleeunit = { version = \">= 1.0.0 and < 2.0.0\" }
  " > "./output/manifest.toml"

  echo "gleam build \"$fileNameWithoutExt\"" > ./output/gleam-build-last
  cd ./output
  gleam build 2>> ./gleam-build-last
  retValue="$?"
  echo "-- gleam returned: $retValue" >> ./gleam-build-last
  cd ../
}
gleam_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT gleam run --no-print-progress -m "$fileNameWithoutExt" -- $other_params 2>> ./gleam-build-last
  retValue="$?"
  cd ..
}

# =============================================
#           Go
# =============================================
go_compile() {
  echo "go build -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/go-build-last
  go build -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/go-build-last 2>&1
  retValue="$?"
  echo "-- go returned: $retValue" >> ./output/go-build-last
}
go_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Haskell
# =============================================
haskell_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ghc \"./$fileName\"" > ./haskell-build-last
  ghc "./$fileName" >> ./haskell-build-last 2>&1
  retValue="$?"
  echo "-- ghc returned: $retValue" >> ./haskell-build-last
  cd ..
}
haskell_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Haxe
# =============================================
haxe_compile() { :; }
haxe_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT haxe --run "$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Icon
# =============================================
icon_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "icont \"./$fileName\"" > ./icon-build-last
  icont "./$fileName" >> ./icon-build-last 2>&1
  retValue="$?"
  echo "-- icont returned: $retValue" >> ./icon-build-last
  cd ..
}
icon_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Idris
# =============================================
idris_compile() {
  cp "./$fileName" ./output/
  cd ./output

  echo "idris2 \"$fileName\" -o \"$fileNameWithoutExt\"" > ./idris-build-last
  idris2 "$fileName" -o "$fileNameWithoutExt" >> ./idris-build-last 2>&1
  retValue="$?"
  echo "-- idris2 returned: $retValue" >> ./idris-build-last

  cd ..
}
idris_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/build/exec/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Java
# =============================================
java_compile() {
  echo "javac \"./$fileName\" -d ./output" > ./output/java-build-last
  javac "./$fileName" -d ./output >> ./output/java-build-last 2>&1
  retValue="$?"
  echo "-- javac returned: $retValue" >> ./output/java-build-last
  if [ "$retValue" -ne 0 ]; then
    return $retValue
  fi
  cd ./output
  echo "jar cvfe \"$fileNameWithoutExt.jar\" \"$packName.$algoName.$fileNameWithoutExt\" \"$packName/$algoName/$fileNameWithoutExt.class\"" >> ./java-build-last
  jar cvfe "$fileNameWithoutExt.jar" "$packName.$algoName.$fileNameWithoutExt" "$packName/$algoName/$fileNameWithoutExt.class" >> ./java-build-last 2>&1
  retValue="$?"
  echo "-- jar cvfe returned: $retValue" >> ./java-build-last
  cd ..
}
java_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT java -jar "$fileNameWithoutExt.jar" -- $other_params
  retValue="$?"
  cd ..
}

# =============================================
#           Julia
# =============================================
julia_compile() { :; }
julia_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT julia "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Javascript
# =============================================
javascript_compile() { :; }
javascript_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT node "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Kit
# =============================================
kit_compile() { :; }
kit_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT kit run "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Kotlin
# =============================================
kotlin_compile() {
  echo "kotlinc \"./$fileName\" -include-runtime -d \"./output/$fileNameWithoutExt.jar\"" > ./output/kotlin-build-last
  kotlinc "./$fileName" -include-runtime -d "./output/$fileNameWithoutExt.jar" >> ./output/kotlin-build-last 2>&1
  retValue="$?"
  echo "-- kotlinc returned: $retValue" >> ./output/kotlin-build-last
}
kotlin_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT java -jar "./output/$fileNameWithoutExt.jar" $other_params
  retValue="$?"
}

# =============================================
#           LLVM IR
# =============================================
llvmir_compile() {
  echo "clang \"./$fileName\" -O2 -Wall -o \"./output/$fileNameWithoutExt\"" > ./output/llvmir-build-last
  clang "./$fileName" -O2 -Wall -o "./output/$fileNameWithoutExt" >> ./output/llvmir-build-last 2>&1
  retValue="$?"
  echo "-- clang returned: $retValue" >> ./output/llvmir-build-last
}
llvmir_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Lua
# =============================================
lua_compile() {
  echo "luac -o \"./output/$fileNameWithoutExt.luac\" \"./$fileName\"" > ./output/lua-build-last
  luac -o "./output/$fileNameWithoutExt.luac" "./$fileName" >> ./output/lua-build-last 2>&1
  retValue="$?"
  echo "-- luac returned: $retValue" >> ./output/lua-build-last
}
lua_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT lua "./output/$fileNameWithoutExt.luac" $other_params
  retValue="$?"
}

# =============================================
#           Objective-C
# =============================================
objectivec_compile() {
  echo "clang -lobjc -lgnustep-base \`gnustep-config --objc-flags\` \`gnustep-config --objc-libs\` -L/usr/local/lib  \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/objectivec-last-build
  clang -lobjc -lgnustep-base `gnustep-config --objc-flags` `gnustep-config --objc-libs` -L/usr/local/lib  "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/objectivec-build-last 2>&1
  retValue="$?"
  echo "-- clang returned: $retValue" >> ./output/objectivec-build-last
}
objectivec_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Modula-3
# =============================================
modula3_compile() {
  echo "Making and emptying output/AMD64_LINUX..." > ./output/modula3-build-last
  mkdir -p ./output/AMD64_LINUX
  rm -Rf ./output/AMD64_LINUX/* >> /dev/null
  echo "Copying file to output/AMD64_LINUX..." >> ./output/modula3-build-last
  cp $fileName ./output/AMD64_LINUX/$fileName
  echo "cd ./output/ && cm3 \"fileName\"" >> ./output/modula3-build-last
  cd ./output/
  cm3 "$fileName" >> ./modula3-build-last 2>&1
  retValue="$?"
  echo "-- cm3 returned: $retValue" >> ./modula3-build-last
  cd ..
}
modula3_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/AMD64_LINUX/prog" $other_params
  retValue="$?"
}

# =============================================
#           Octave
# =============================================
octave_compile() {
  cp "./$fileName" "./output/${fileNameWithoutExt}shaved.m"
}
octave_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT octave --quiet "${fileNameWithoutExt}shaved.m" $other_params
  retValue="$?"
  cd ..
}

# =============================================
#           Ocaml
# =============================================
ocaml_compile() { :; }
ocaml_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT ocaml "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           MMIXAL
# =============================================
mmixal_compile() {
  cp "./$fileName" ./output/
  cd ../../../stdlib
  ./build.sh mmix > "$start_dir/output/mmixal-build-last"
  retValue="$?"
  cd $start_dir
  if [ $retValue -ne 0 ]; then
    return $retValue
  fi

  cat ../../../stdlib/output/stdlib.mms >> "./output/$fileName"

  cd ./output
  echo "cd ./output/ && mmixal \"./$fileName\" & cd .." >> ./mmixal-build-last
  mmixal "./$fileName" >> ./mmixal-build-last 2>&1
  retValue="$?"
  echo "-- mmixal returned: $retValue" >> ./mmixal-build-last
  cd ..
}
mmixal_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT mmix "./$fileNameWithoutExt.mmo" $other_params
  retValue="$?"
  cd ..
}

# =============================================
#           Oberon
# =============================================
oberon_compile() {
  echo "Copying $fileName to output..." > ./output/oberon-build-last
  cp "./$fileName" ./output/
  echo "cd ./output && voc -m \"./$fileName\" && cd .." > ./output/oberon-build-last
  cd ./output
  voc -m "$fileName" >> ./oberon-build-last 2>&1
  retValue="$?"
  echo "-- voc returned: $retValue" >> ./oberon-build-last
  cd ..
}
oberon_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Mojo
# =============================================
mojo_compile() {
  echo "Attempting to ensure mojo is added..." > ./output/mojo-build-last
  pixi add mojo >> ./output/mojo-build-last 2>&1
  retValue="$?"
  echo "-- pixi returned: $retValue" >> ./output/mojo-build-last
  chmod a+rw ../../../pixi.lock
  chmod a+rw ../../../pixi.toml
}
mojo_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT pixi run mojo run "./$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Mercury
# =============================================
mercury_compile() {
  echo "Copying $fileName to output as .m..." > ./output/mercury-build-last
  cp "$fileName" "./output/$fileNameWithoutExt.m"
  cd ./output

  echo "cd ./output && mmc \"./$fileNameWithoutExt.m\" && cd .." >> ./mercury-build-last
  mmc "./$fileNameWithoutExt.m" >> ./mercury-build-last 2>&1
  retValue="$?"
  echo "-- mmc returned: $retValue" >> ./mercury-build-last

  cd ..
}
mercury_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           NASM
# =============================================
nasm_compile() {
  do_link=0
  platform="$CURRENT_PLATFORM"
  platform_output=
  case "$platform" in
    "MINGW64_NT"*)
      platform="Windows"
      platform_output="windows"
    ;;
    "Linux"*)
      platform="Linux"
      platform_output="linux"
    ;;
    "FreeBSD"*)
      platform="FreeBSD"
      platform_output="freebsd"
    ;;
    *)
      echo "Unrecognized Platform for NASM Builds" > ./output/nasm-build-last
      retValue=1
      return 1
    ;;
  esac
  case "$CURRENT_CPU_ARCH" in
    "x86_64")
      platform="${platform}-x64-nasm"
      platform_output="${platform_output}x64nasm"
      ;;
    "amd64")
      platform="${platform}-x64-nasm"
      platform_output="${platform_output}x64nasm"
      ;;
    *)
      echo "Unrecognized CPU Architecture for NASM Builds" > ./output/nasm-build-last
      retValue=1
      return 1
      ;;
  esac

  # First go into stdlib and build the standard library ;)
  #   Only build if there's new changes to be built
  echo "Building NASM..." > ./output/nasm-build-last
  echo "Building NASM Standard Library..." >> ./output/nasm-build-last
  cp "./$fileName" ./output/
  cd ../../../stdlib
  ./build.sh "$platform" > "$start_dir/output/nasm-build-last"
  retValue="$?"
  cd $start_dir
  if [ $retValue -ne 0 ]; then
    return $retValue
  fi
  cat "../../../stdlib/output/${platform_output}-build-last" >> ./output/nasm-build-last
  stdlib="../../../stdlib/output/stdlib-${platform}.o"

  # Now we build our actual output, linking to the standard library
  #   Only build if there's new changes to be built
  echo "Building NASM file..." >> ./output/nasm-build-last
  do_build=0
  if [ ! -f "./output/$fileNameWithoutExt.o" ]; then
    do_build=1
  elif [ -n "$(find "$fileName" -prune -newer "./output/$fileNameWithoutExt.o" 2>/dev/null)" ]; then
    do_build=1
  fi
  if [ "$do_build" -eq 1 ]; then
    case "$platform" in
      "Windows-x64")
        echo "nasm -f win64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/nasm-build-last
        nasm -f win64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "nasm -f elf64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/nasm-build-last
        nasm -f elf64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
    esac
    echo "-- nasm returned: $retValue" >> ./output/nasm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
    do_link=1
  fi
  if [ ! -f "./output/$fileNameWithoutExt" ]; then
    do_link=1
  elif [ -n "$(find "$stdlib" -prune -newer "./output/$fileNameWithoutExt" 2>/dev/null)" ]; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    case "$platform" in
      "Windows-x64")
        echo "ld -e _start -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\" -L \"$LD_ADDITIONAL_DIRECTORY\" -lkernel32 -lshell32" >> ./output/nasm-build-last
        ld -e _start -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" -L "$LD_ADDITIONAL_DIRECTORY" -lkernel32 -lshell32 >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "ld -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\"" >> ./output/nasm-build-last
        ld -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
    esac
    echo "-- ld returned: $retValue" >> ./output/nasm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
  fi
}
nasm_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Nim
# =============================================
nim_compile() {
  echo "nim compile --out:\"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/nim-build-last
  nim compile --out:"./output/$fileNameWithoutExt" "./$fileName" >> ./output/nim-build-last 2>&1
  retValue="$?"
  echo "-- nim returned: $retValue" >> ./output/nim-build-last
}
nim_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Pascal
# =============================================
pascal_compile() {
  echo "Copying $fileName to output..." > ./output/pascal-build-last
  cp "./$fileName" ./output

  echo "cd ./output && fpc \"$fileName\" & cd .." >> ./output/pascal-build-last
  cd ./output
  fpc "$fileName" >> ./pascal-build-last 2>&1
  retValue="$?"
  echo "-- fpc returned: $retValue" >> ./pascal-build-last
  cd ..
}
pascal_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           PHP
# =============================================
php_compile() { :; }
php_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT php "$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Prolog
# =============================================
prolog_compile() {
  echo "gplc \"$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/prolog-build-last
  gplc "$fileName" -o "./output/$fileNameWithoutExt" >> ./output/prolog-build-last 2>&1
  retValue="$?"
  echo "-- gplc returned: $retValue" >> ./output/prolog-build-last
}
prolog_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Perl
# =============================================
perl_compile() { :; }
perl_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT perl "$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Python
# =============================================
python_compile() { :; }
python_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT python -u "$fileName" $other_params
  retValue="$?"
}

# =============================================
#           R
# =============================================
r_compile() { :; }
r_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT Rscript "$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Ruby
# =============================================
ruby_compile() { :; }
ruby_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT ruby "$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Racket
# =============================================
racket_compile() { :; }
racket_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT racket "$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Rust
# =============================================
rust_compile() {
  echo "rustc \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/rust-build-last
  rustc "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/rust-build-last 2>&1
  retValue="$?"
  echo "-- rustc returned: $retValue" >> ./output/rust-build-last
}
rust_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Scala
# =============================================
scala_compile() {
  echo "cp \"./$fileName\" ./output/ && cd ./output && scala compile \"./$fileName\" && cd .." > ./output/scala-build-last
  cp "./$fileName" ./output/
  cd ./output
  scala compile "./$fileName" >> ./scala-build-last 2>&1
  retValue="$?"
  echo "-- scala returned: $retValue" >> ./scala-build-last
  cd ..
}
scala_run() {
  if [ "$#" -lt 2 ]; then
      other_params="15 10"
  fi

  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT scala run "$fileName" -- $other_params
  retValue="$?"
  cd ..
}

# =============================================
#           Scheme
# =============================================
scheme_compile() {
  if command -v guild > /dev/null 2>&1; then
    echo "guild compile -o \"./output/$fileNameWithoutExt.go\" \"./$fileName\"" > ./output/scheme-build-last
    guild compile -o "./output/$fileNameWithoutExt.go" "./$fileName" >> ./output/scheme-build-last 2>&1
    retValue="$?"
  else
    echo "guile -c \"(compile-file \\\"./$fileName\\\" #:output-file \\\"./output/$fileNameWithoutExt.go\\\")\"" > ./output/scheme-build-last
    guile -c "(compile-file \"./$fileName\" #:output-file \"./output/$fileNameWithoutExt.go\")" >> ./output/scheme-build-last 2>&1
    retValue="$?"
  fi
  echo "-- guild returned: $retValue" >> ./output/scheme-build-last
}
scheme_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT guile -c "(load-compiled \"./output/$fileNameWithoutExt.go\")" $other_params
  retValue="$?"
}

# =============================================
#           Simula
# =============================================
simula_compile() {
  echo "Copying $fileName to output..." > ./output/simula-build-last
  cp "./$fileName" ./output/
  echo "cd ./output && cim \"./$fileName\" && cd .." > ./output/simula-build-last
  cd ./output/
  rm -f ./gcc ./g++
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GCC13NAME}" ./gcc
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GXX13NAME}" ./g++
  PATH="$PWD:$PATH" cim "./$fileName" >> ./simula-build-last 2>&1
  retValue="$?"
  echo "-- cim returned: $retValue" >> ./simula-build-last
  cd ..
}
simula_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           SmallTalk
# =============================================
smalltalk_compile() { :; }
smalltalk_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT gst "./$fileName" -a $other_params
  retValue="$?"
}

# =============================================
#           Swift
# =============================================
swift_compile() {
  echo "swiftc \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/swift-build-last
  swiftc "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/swift-build-last 2>&1
  retValue="$?"
  echo "-- swiftc returned: $retValue" >> ./output/swift-build-last
}
swift_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Tcl
# =============================================
tcl_compile() { :; }
tcl_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT tclsh "$fileName" $other_params
  retValue="$?"
}

# =============================================
#           Typescript
# =============================================
typescript_compile() {
  echo "tsc \"$fileName\" --outDir output --target esnext --skipLibCheck true --types node" > ./output/typescript-build-last
  tsc "$fileName" --outDir output --target esnext --skipLibCheck true --types node >> ./output/typescript-build-last 2>&1
  retValue="$?"
  echo "-- tsc returned: $retValue" >> ./output/typescript-build-last
}
typescript_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT node ./output/$fileNameWithoutExt.js $other_params
  retValue="$?"
}

# =============================================
#           V
# =============================================
v_compile() {
  echo "v \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/v-build-last
  v "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/v-build-last 2>&1
  retValue="$?"
  echo "-- v returned: $retValue" >> ./output/v-build-last
}
v_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           Visual Basic .Net
# =============================================
visualbasic_compile() {
  cp "./$fileName" ./output/
  cd ./output

  echo "<Project Sdk=\"Microsoft.NET.Sdk\">
<PropertyGroup>
  <OutputType>Exe</OutputType>
  <RootNamespace>Main</RootNamespace>
  <TargetFramework>net10.0</TargetFramework>
</PropertyGroup>
</Project>" > "$fileNameWithoutExt.vbproj"

  echo "cd ./output && echo [$fileNameWithoutExt.vbproj] && dotnet build && cd .." > ./visualbasic-build-last
  dotnet build >> ./visualbasic-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./visualbasic-build-last
  cd ..
}
visualbasic_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/bin/Debug/net10.0/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
#           WASM (wat)
# =============================================
wat_compile() {
  echo "cp \"$fileName\" \"./output/$fileName\" && cd ./output && wat2wasm \"$fileName\" -o \"$fileNameWithoutExt.wasm\" && cd .." > ./output/wat-build-last
  cp "$fileName" "./output/$fileName"
  cd ./output
  wat2wasm "$fileName" -o "$fileNameWithoutExt.wasm" >> ./wat-build-last 2>&1
  retValue="$?"
  echo "-- wat2wasm returned: $retValue" >> ./wat-build-last
  cd ..
}
wat_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT node ../../../run-wasm.js "./output/$fileNameWithoutExt.wasm" $other_params
  retValue="$?"
}

# =============================================
#           ZIG
# =============================================
zig_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "zig build-exe \"./$fileName\"" > ./zig-build-last
  zig build-exe "./$fileName" >> ./zig-build-last 2>&1
  retValue="$?"
  echo "-- zig returned: $retValue" >> ./zig-build-last
  cd  ..
}
zig_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
  retValue="$?"
}

# =============================================
# =============================================

# Definitions done, we start by checking for a check for the "clean"
# request.

if [ "$fileName" = "clean" ]; then
  rm -Rf ./output >> /dev/null
  cd ../../../stdlib/
  ./build.sh clean
  cd $start_dir
  exit
fi

# If we are not cleaning, we look at the file extension and specify
# what drives the compilation and running.
# Required:
#   lang : must be set to the language that matches the extension.
#          Used to call compile and run and check for file updates.
#   testFile : if the file specified in this variable does not exist,
#          then we do not attempt to run by attempt to show
#          ./output/lang-build-last instead.

case "$fileExtension" in
  "adb") lang="ada"; testFile="./output/$fileNameWithoutExt";;
  "asm") lang="asm"; testFile="./output/$fileNameWithoutExt";;
  "bal") lang="ballerina"; testFile="./output/$fileNameWithoutExt.jar";;
  "bas") lang="freebasic"; testFile="./output/$fileNameWithoutExt";;
  "c") lang="c"; testFile="./output/$fileNameWithoutExt";;
  "clj") lang="clojure"; testFile="./$fileName";;
  "cob") lang="cobol"; testFile="./output/$fileNameWithoutExt";;
  "cpp") lang="cpp"; testFile="./output/$fileNameWithoutExt";;
  "cs") lang="csharp"; testFile="./$fileName";;
  "d") lang="d"; testFile="./output/$fileNameWithoutExt";;
  "dart") lang="dart"; testFile="./output/$fileNameWithoutExt";;
  "e") lang="eiffel"; testFile="./output/EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt";;
  "erl") lang="erlang"; testFile="./output/$fileNameWithoutExt.beam";;
  "exs") lang="elixir"; testFile="./$fileName";;
  "f90") lang="fortran"; testFile="./output/$fileNameWithoutExt";;
  "factor") lang="factor"; testFile="./$fileName";;
  "fsx") lang="fsharp"; testFile="./$fileName";;
  "fth") lang="forth"; testFile="./$fileName";;
  "gleam") lang="gleam"; testFile="./output/build/dev/erlang/$fileNameWithoutExt/ebin/$fileNameWithoutExt.beam";;
  "go") lang="go"; testFile="./output/$fileNameWithoutExt";;
  "hs") lang="haskell"; testFile="./output/$fileNameWithoutExt";;
  "hx") lang="haxe"; testFile="./$fileName";;
  "icn") lang="icon"; testFile="./output/$fileNameWithoutExt";;
  "idr") lang="idris"; testFile="./output/build/exec/$fileNameWithoutExt";;
  "java") lang="java"; testFile="./output/$fileNameWithoutExt.jar";;
  "jl") lang="julia"; testFile="./$fileName";;
  "js") lang="javascript"; testFile="./$fileName";;
  "kit") lang="kit"; testFile="./$fileName";;
  "kt") lang="kotlin"; testFile="./output/$fileNameWithoutExt.jar";;
  "ll") lang="llvmir"; testFile="./output/$fileNameWithoutExt";;
  "lua") lang="lua"; testFile="./output/$fileNameWithoutExt.luac";;
  "m") lang="objectivec"; testFile="./output/$fileNameWithoutExt";;
  "m3") lang="modula3"; testFile="./output/AMD64_LINUX/prog";;
  "mat") lang="octave"; testFile="./output/${fileNameWithoutExt}shaved.m";;
  "ml") lang="ocaml"; testFile="./$fileName";;
  "mms") lang="mmixal"; testFile="./output/$fileNameWithoutExt.mmo";;
  "Mod") lang="oberon"; testFile="./output/$fileNameWithoutExt";;
  "mojo") lang="mojo"; testFile="./$fileName";;
  "moo") lang="mercury"; testFile="./output/$fileNameWithoutExt";;
  "nasm") lang="nasm"; testFile="./output/$fileNameWithoutExt";;
  "nim") lang="nim"; testFile="./output/$fileNameWithoutExt";;
  "pas") lang="pascal"; testFile="./output/$fileNameWithoutExt";;
  "php") lang="php"; testFile="./$fileName";;
  "pl") lang="prolog"; testFile="./output/$fileNameWithoutExt";;
  "plx") lang="perl"; testFile="./$fileName";;
  "py") lang="python"; testFile="./$fileName";;
  "r") lang="r"; testFile="./$fileName";;
  "rb") lang="ruby"; testFile="./$fileName";;
  "rkt") lang="racket"; testFile="./$fileName";;
  "rs") lang="rust"; testFile="./output/$fileNameWithoutExt";;
  "s") lang="arm64asm"; testFile="./output/$fileNameWithoutExt";;
  "scala") lang="scala"; testFile="./output/$fileName";;
  "scm") lang="scheme"; testFile="./$fileName";;
  "sim") lang="simula"; testFile="./output/$fileNameWithoutExt";;
  "st") lang="smalltalk"; testFile="./$fileName";;
  "swift") lang="swift"; testFile="./output/$fileNameWithoutExt";;
  "tcl") lang="tcl"; testFile="./$fileName";;
  "ts") lang="typescript"; testFile="./output/$fileNameWithoutExt.js";;
  "v") lang="v"; testFile="./output/$fileNameWithoutExt";;
  "vb") lang="visualbasic"; testFile="./output/bin/Debug/net10.0/$fileNameWithoutExt";;
  "wat") lang="wat"; testFile="./output/$fileNameWithoutExt.wasm";;
  "zig") lang="zig"; testFile="./output/$fileNameWithoutExt";;
  *) echo "Unrecognized file extension, not building!"; exit;;
esac

# Now, we should check if the environment wants our language
# to run via a docker image, in which case, we should go ahead
# and do that then exit.

RUN_ON_DOCKER=$(echo "$DEREKALGOS_RUNONDOCKER" | sed -n "s/.*[[:space:]]\{0,1\}$lang=\([^[:space:]]*\).*/\1/p")
if [ -n "$RUN_ON_DOCKER" ]; then
    CURRENT_GIT_DIR=$(realpath ../../../)
    docker run --rm --platform linux/amd64 -v "$CURRENT_GIT_DIR":/build -w "/build/src/$packName/$algoName/" $RUN_ON_DOCKER bash -c "DEREKALGOS_TIMEOUT=\"$DEREKALGOS_TIMEOUT\" /build/run.sh "$fileName" $other_params"
    exit
fi

# Now, we should check if the environment wants our language
# to run on remotely via ssh, in which case, we should go ahead
# and do that then exit.

RUN_ON_SSH=$(echo "$DEREKALGOS_RUNONSSH" | sed -n "s/.*[[:space:]]\{0,1\}$lang=\([^[:space:]]*\).*/\1/p")
if [ -n "$RUN_ON_SSH" ]; then
    DEREKALGOS_SSH_PORT="DEREKALGOS_SSH_${RUN_ON_SSH}_PORT"
    DEREKALGOS_SSH_USER="DEREKALGOS_SSH_${RUN_ON_SSH}_USER"
    DEREKALGOS_SSH_ADDRESS="DEREKALGOS_SSH_${RUN_ON_SSH}_ADDRESS"
    DEREKALGOS_SSH_CODEDIR="DEREKALGOS_SSH_${RUN_ON_SSH}_CODEDIR"
    DEREKALGOS_SSH_STARTDIR="DEREKALGOS_SSH_${RUN_ON_SSH}_STARTDIR"
    DEREKALGOS_SSH_RUNSCRIPT="DEREKALGOS_SSH_${RUN_ON_SSH}_RUNSCRIPT"
    scp -P $DEREKALGOS_SSH_PORT "./$fileName" $DEREKALGOS_SSH_USER@$DEREKALGOS_SSH_ADDRESS:"${DEREKALGOS_SSH_CODEDIR}/${fileName}" >> /dev/null
    ToRunOnSSH="cd $DEREKALGOS_SSH_CODEDIR && \"$DEREKALGOS_SSH_RUNSCRIPT\" \"$fileName\" $other_params"
    ssh -p $DEREKALGOS_SSH_PORT $DEREKALGOS_SSH_USER@$DEREKALGOS_SSH_ADDRESS $ToRunOnSSH
    exit
fi

# First thing, let's check to see if the output directory
# needs to be cleaned. This is the case if a different language
# was last to build for the given algorithm, and also
# if there are new updates to the code file.

if [ -f "./output/last-lang" ]; then
  if printf '%s' "$lang" | cmp -s - "./output/last-lang"; then
    if [ -n "$(find "./$fileName" -prune -newer "$testFile" 2>/dev/null)" ]; then
      destroy_output=1
    fi
  else
    destroy_output=1
  fi
else
  destroy_output=1
fi

if [ "$destroy_output" -eq 1 ]; then
  rm -Rf ./output >> ./clean-output
  mkdir -p ./output
  mv ./clean-output ./output/
else
  mkdir -p ./output
fi

# Finally, run the compile for the specified language,
# and if successful, run it immediately.
# if the build fails, try to output the last build output

before_compile=$(get_ms_time)
"${lang}_compile"
after_compile=$(get_ms_time)

if [ "$retValue" -eq 0 ]; then
  if [ ! -f "$testFile" ]; then
    echo "Build returned successful for $lang, but output file not found.
Build output:

"
    cat "./output/${lang}-build-last"
  else
    retValue=0
    before_run=$(get_ms_time)
    "${lang}_run"
    after_run=$(get_ms_time)

    compile_duration=$((after_compile - before_compile))
    run_duration=$((after_run - before_run))

    if [ "$retValue" -eq 0 ]; then
      printf "
    ${BLUE}Compile Time ${compile_duration}ms; Run Time ${run_duration}ms; ${GREEN}Returned $retValue${NORMAL}
"
    else
      printf "
    ${BLUE}Compile Time ${compile_duration}ms; Run Time ${run_duration}ms; ${RED}Returned $retValue${NORMAL}
"
    fi
    if [ "$retValue" -eq 124 ]; then
      printf "${YELLOW}Return value 124 typically signals a timeout.${NORMAL}
"
    fi
  fi
else
  echo "Failed to compile $lang.
Build output:

"
  cat "./output/${lang}-build-last"
fi

echo "$lang" > ./output/last-lang
chmod -R a+rw ./output/
exit
