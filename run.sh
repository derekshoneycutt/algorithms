#! /bin/bash

# First argument must either be a supported filename or
# "clean". If "clean", the output directory is destroyed
# and the script exits. Otherwise, it will continue to try
# to compile the file specified, passing in any other
# arguments to the code as command line arguments

fileName=$1
fileNameWithoutExt="${fileName%.*}"
fileExtension="${fileName##*.}"
className=${fileNameWithoutExt^^}
other_params=${@:2}
start_dir=$PWD
dir="${PWD%/*}"
packName="${dir##*/}"
algoName="${PWD##*/}"
lang=
testFile=
destroy_output=0

# The following of environment variables may be best suited
# in ~/.bash_profile ; as such many are commented out here.

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib
#export DEREKALGOS_RUNONVM="forth modula3 oberon simula smalltalk"
#export DEREKALGOS_VMPORT="2222"
#export DEREKALGOS_VMUSER="coderun"
#export DEREKALGOS_VMADDRESS="127.0.0.1"
#export DEREKALGOS_VMCODEDIR="/home/coderun/codefiles"
#export DEREKALGOS_VMSTARTDIR="/home/coderun"
#export DEREKALGOS_VMRUNSCRIPT="../run.sh"
#export DEREKALGOS_TIMEOUT="-k 10s 1m"
#export DEREKALGOS_GCC13="/usr/x86_64-pc-linux-gnu/gcc-bin/13/"
#export DEREKALGOS_GCC13NAME="x86_64-pc-linux-gcc"
#export DEREKALGOS_GXX13NAME="x86_64-pc-linux-g++"

# The first section, each language that we support needs to have
# a lang_compile and lang_run. This will be called when a file of
# that code type is recognized according to file extension below
# The compile phase can reasonably do nothing for scripts and similar.
# Any build output should go to ./output/lang-build-last
# as this will be output when recognized that the build failed

# =============================================
#           ADA
# =============================================
function ada_compile() {
  echo "gnatmake -q -D output -o \"./output/$fileNameWithoutExt\" \"$fileName\"" > ./output/ada-build-last
  gnatmake -q -D output -o "./output/$fileNameWithoutExt" "$fileName" &>> ./output/ada-build-last
}
function ada_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Ballerina
# =============================================
function ballerina_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "bal build \"$fileName\"" > ./ballerina-build-last
  bal build "$fileName" &>> ./ballerina-build-last

  cd ..
}
function ballerina_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT java -jar "./output/$fileNameWithoutExt.jar" $other_params
}

# =============================================
#           FreeBASIC
# =============================================
function freebasic_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "fbc \"./$fileName\"" > ./freebasic-build-last
  fbc "./$fileName" &>> ./freebasic-build-last

  cd ..
}
function freebasic_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           C
# =============================================
function c_compile() {
  echo "gcc "./$fileName" -o "./output/$fileNameWithoutExt"" > ./output/c-build-last
  gcc "./$fileName" -o "./output/$fileNameWithoutExt" &>> ./output/c-build-last
}
function c_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Clojure
# =============================================
function clojure_compile() { :; }
function clojure_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT lein exec "./$fileName" $other_params
}

# =============================================
#           COBOL
# =============================================
function cobol_compile() {
  echo "cobc -x -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/cobol-build-last
  cobc -x -o "./output/$fileNameWithoutExt" "./$fileName" &>> ./output/cobol-build-last
}
function cobol_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           C++
# =============================================
function cpp_compile() {
  echo "g++ \"./$fileName\" -o \"./output/$fileNameWithoutExt\" --std=c++23" > ./output/cpp-build-last
  g++ "./$fileName" -o "./output/$fileNameWithoutExt" --std=c++23 &>> ./output/cpp-build-last
}
function cpp_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           C#
# =============================================
function csharp_compile() { :; }
function csharp_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT dotnet run "./$fileName" $other_params
}

# =============================================
#           D
# =============================================
function d_compile() { :; }
function d_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT dmd -run "./$fileName" $other_params
}

# =============================================
#           Dart
# =============================================
function dart_compile() { :; }
function dart_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT dart "./$fileName" $other_params
}

# =============================================
#           Eiffel
# =============================================
function eiffel_compile() {
  new_uuid=$(uuidgen)

  cp "./$fileName" ./output/
  cd ./output/

  echo "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>
<system xmlns=\"http://www.eiffel.com/developers/xml/configuration-1-23-0\"
        xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
        xsi:schemaLocation=\"http://www.eiffel.com/developers/xml/configuration-1-23-0 http://www.eiffel.com/developers/xml/configuration-1-23-0.xsd\"
        name=\"$fileName\" uuid=\"$new_uuid\">
    <target name=\"$fileName\">
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
        <cluster name=\"$fileName\" location=\".\\\" recursive=\"true\"/>
    </target>
</system>" > "./$fileNameWithoutExt.ecf"

    echo "ec -batch -config \"./$fileNameWithoutExt.ecf\" -finalize" > ./eiffel-build-last
    ec -batch -config "./$fileNameWithoutExt.ecf" -finalize &>> ./eiffel-build-last

    cd "./EIFGENs/$fileName/F_code"
    echo "

===========================================================================
FIRST COMPILE FINISHED. CALLING finish_freezing in EIFGENs/$fileName/F_code
===========================================================================

" >> "../../../eiffel-build-last"
  finish_freezing >> "../../../eiffel-build-last"

  cd ../../../../
}
function eiffel_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/EIFGENs/$fileName/F_code/$fileName" $other_params
}

# =============================================
#           Erlang
# =============================================
function erlang_compile() {
  echo "erlc -o ./output/ \"./$fileName\"" > ./output/erlang-build-last
  erlc -o ./output/ "./$fileName" &>> ./output/erlang-build-last
}
function erlang_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT erl -noshell -s "$fileNameWithoutExt" main -s init stop -- $other_params
  cd ..
}

# =============================================
#           Elixir
# =============================================
function elixir_compile() { :; }
function elixir_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT elixir "./$fileName" $other_params
}

# =============================================
#           Fortran
# =============================================
function fortran_compile() {
  echo "gfortran \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/fortran-build-last
  gfortran "./$fileName" -o "./output/$fileNameWithoutExt" &>> ./output/fortran-build-last
}
function fortran_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Factor
# =============================================
function factor_compile() { :; }
function factor_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT factor -run "./$fileName" $other_params
}

# =============================================
#           FSharp
# =============================================
function fsharp_compile() { :; }
function fsharp_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT dotnet fsi "./$fileName" $other_params
}

# =============================================
#           Forth
# =============================================
function forth_compile() { :; }
function forth_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT gforth "./$fileName" -- $other_params
}

# =============================================
#           Gleam
# =============================================
function gleam_compile() {
  mkdir -p output/src
  cp "./$fileName" ./output/src/

  echo "name = \"$fileNameWithoutExt\"
version = \"1.0.0\"

[dependencies]
gleam_stdlib = \">= 0.44.0 and < 2.0.0\"
argv = \">= 1.0.2 and < 2.0.0\"
format = \">= 1.0.0 and < 2.0.0\"

[dev-dependencies]
gleeunit = \">= 1.0.0 and < 2.0.0\"
  " > "./output/gleam.toml"

  echo "
packages = [
  { name = \"argv\", version = \"1.0.2\", build_tools = [\"gleam\"], requirements = [], otp_app = \"argv\", source = \"hex\", outer_checksum = \"BA1FF0929525DEBA1CE67256E5ADF77A7CDDFE729E3E3F57A5BDCAA031DED09D\" },
  { name = \"format\", version = \"1.0.0\", build_tools = [\"gleam\"], requirements = [\"gleam_stdlib\"], otp_app = \"format\", source = \"hex\", outer_checksum = \"7654EE35E01394BF558F364542F163941A66CBA1512AA7D53F2A794BBD90BD9D\" },
  { name = \"gleam_stdlib\", version = \"0.70.0\", build_tools = [\"gleam\"], requirements = [], otp_app = \"gleam_stdlib\", source = \"hex\", outer_checksum = \"86949BF5D1F0E4AC0AB5B06F235D8A5CC11A2DFC33BF22F752156ED61CA7D0FF\" },
  { name = \"gleeunit\", version = \"1.9.0\", build_tools = [\"gleam\"], requirements = [\"gleam_stdlib\"], otp_app = \"gleeunit\", source = \"hex\", outer_checksum = \"DA9553CE58B67924B3C631F96FE3370C49EB6D6DC6B384EC4862CC4AAA718F3C\" },
]

[requirements]
argv = { version = \">= 1.0.2 and < 2.0.0\" }
format = { version = \">= 1.0.0 and < 2.0.0\" }
gleam_stdlib = { version = \">= 0.44.0 and < 2.0.0\" }
gleeunit = { version = \">= 1.0.0 and < 2.0.0\" }
  " > "./output/manifest.toml"

  echo "gleam build \"$fileNameWithoutExt\"" > ./output/gleam-build-last
  cd ./output
  gleam build 2>> ./gleam-build-last
  cd ../
}
function gleam_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT gleam run --no-print-progress -m "$fileNameWithoutExt" -- $other_params 2>> ./gleam-build-last
  cd ..
}

# =============================================
#           Go
# =============================================
function go_compile() { :; }
function go_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT go run "./$fileName" $other_params
}

# =============================================
#           Haskell
# =============================================
function haskell_compile() { :; }
function haskell_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT runghc "./$fileName" $other_params
}

# =============================================
#           Haxe
# =============================================
function haxe_compile() { :; }
function haxe_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT haxe --run "$fileName" $other_params
}

# =============================================
#           Icon
# =============================================
function icon_compile() { :; }
function icon_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT icon "./$fileName" $other_params
}

# =============================================
#           Idris
# =============================================
function idris_compile() {
  cp "./$fileName" ./output/
  cd ./output

  echo "idris2 \"$fileName\" -o \"$fileNameWithoutExt\"" > ./idris-build-last
  idris2 "$fileName" -o "$fileNameWithoutExt" &>> ./idris-build-last

  cd ..
}
function idris_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/build/exec/$fileNameWithoutExt" $other_params
}

# =============================================
#           Java
# =============================================
function java_compile() {
  echo "javac \"./$fileName\" -d ./output" > ./output/java-build-last
  javac "./$fileName" -d ./output &>> ./output/java-build-last
  cd ./output
  echo "jar cvfe \"$fileNameWithoutExt.jar\" \"$packName.$algoName.$fileNameWithoutExt\" \"$packName/$algoName/$fileNameWithoutExt.class\"" >> ./java-build-last
  jar cvfe "$fileNameWithoutExt.jar" "$packName.$algoName.$fileNameWithoutExt" "$packName/$algoName/$fileNameWithoutExt.class" &>> ./java-build-last
  cd ..
}
function java_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT java -jar "$fileNameWithoutExt.jar" -- $other_params
  cd ..
}

# =============================================
#           Julia
# =============================================
function julia_compile() { :; }
function julia_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT julia "./$fileName" $other_params
}

# =============================================
#           Javascript
# =============================================
function javascript_compile() { :; }
function javascript_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT node "./$fileName" $other_params
}

# =============================================
#           Kit
# =============================================
function kit_compile() { :; }
function kit_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT kit run "./$fileName" $other_params
}

# =============================================
#           Kotlin
# =============================================
function kotlin_compile() {
  echo "kotlinc \"./$fileName\" -include-runtime -d \"./output/$fileNameWithoutExt.jar\"" > ./output/kotlin-build-last
  kotlinc "./$fileName" -include-runtime -d "./output/$fileNameWithoutExt.jar" &>> ./output/kotlin-build-last
}
function kotlin_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT java -jar "./output/$fileNameWithoutExt.jar" $other_params
}

# =============================================
#           LLVM IR
# =============================================
function llvmir_compile() {
  echo "clang \"./$fileName\" -O2 -Wall -o \"./output/$fileNameWithoutExt\"" > ./output/llvmir-build-last
  clang "./$fileName" -O2 -Wall -o "./output/$fileNameWithoutExt" &>> ./output/llvmir-build-last
}
function llvmir_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Lua
# =============================================
function lua_compile() { :; }
function lua_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT lua "./$fileName" $other_params
}

# =============================================
#           Objective-C
# =============================================
function objectivec_compile() {
  echo "clang -lobjc -lgnustep-base \`gnustep-config --objc-flags\` \`gnustep-config --objc-libs\` -L/usr/local/lib  \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/objectivec-last-build
  clang -lobjc -lgnustep-base `gnustep-config --objc-flags` `gnustep-config --objc-libs` -L/usr/local/lib  "./$fileName" -o "./output/$fileNameWithoutExt" &>> ./output/objectivec-build-last
}
function objectivec_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Modula-3
# =============================================
function modula3_compile() {
  echo "Making and emptying output/AMD64_LINUX..." > ./output/modula3-build-last
  mkdir -p ./output/AMD64_LINUX
  rm -Rf ./output/AMD64_LINUX/* >> /dev/null
  echo "Copying file to output/AMD64_LINUX..." >> ./output/modula3-build-last
  cp $fileName ./output/AMD64_LINUX/$fileName
  echo "cd ./output/ && cm3 \"fileName\"" >> ./output/modula3-build-last
  cd ./output/
  cm3 "$fileName" &>> ./modula3-build-last
  cd ..
}
function modula3_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/AMD64_LINUX/prog" $other_params
}

# =============================================
#           Octave
# =============================================
function octave_compile() {
  cp "./$fileName" "./output/${fileNameWithoutExt}shaved.m"
}
function octave_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT octave --quiet "${fileNameWithoutExt}shaved.m" $other_params
  cd ..
}

# =============================================
#           Ocaml
# =============================================
function ocaml_compile() { :; }
function ocaml_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT ocaml "./$fileName" $other_params
}

# =============================================
#           MMIXAL
# =============================================
function mmixal_compile() {
  readonly LINK_MMS_FILES=(
    "../../../stdlib/ParseNumber/ParseNumber.mms"
    "../../../stdlib/PrintNumber/PrintNumber.mms"
    "../../../stdlib/PrintString/PrintString.mms"
    "../../../stdlib/StringIsInt/StringIsInt.mms"
    "../../../stdlib/StringLength/StringLength.mms")
  
  cp "./$fileName" ./output/

  for link_file in "${LINK_MMS_FILES[@]}"; do
      cat "$link_file" >> "./output/$fileName"
  done

  cd ./output
  echo "cd ./output/ && mmixal \"./$fileName\" & cd .." > ./mmixal-build-last
  mmixal "./$fileName" &>> ./mmixal-build-last
  cd ..
}
function mmixal_run() {
  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT mmix "./$fileNameWithoutExt.mmo" $other_params
  cd ..
}

# =============================================
#           Oberon
# =============================================
function oberon_compile() {
  echo "Copying $fileName to output..." > ./output/oberon-build-last
  cp "./$fileName" ./output/
  echo "cd ./output && voc -m \"./$fileName\" && cd .." > ./output/oberon-build-last
  cd ./output
  voc -m "$fileName" &>> ./oberon-build-last
  cd ..
}
function oberon_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Mojo
# =============================================
function mojo_compile() { :; }
function mojo_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT pixi run mojo run "./$fileName" $other_params
}

# =============================================
#           Mercury
# =============================================
function mercury_compile() {
  echo "Copying $fileName to output as .m..." > ./output/mercury-build-last
  cp "$fileName" "./output/$fileNameWithoutExt.m"
  cd ./output

  echo "cd ./output && mmc \"./$fileNameWithoutExt.m\" && cd .." >> ./mercury-build-last
  mmc "./$fileNameWithoutExt.m" &>> ./mercury-build-last

  cd ..
}
function mercury_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           NASM
# =============================================
function nasm_compile() {
  readonly LINK_STD_FILES=(
    "ParseNumber"
    "PrintString"
    "PrintNumber"
    "StringLength"
    "StringIsInt")
  link_with=
  stdlib=../../../stdlib/output/stdlib.o
  build_stdlib=0
  do_link=0

  # First go into stdlib and build the standard library ;)
  #   Only build if there's new changes to be built
  echo "Building NASM..." > ./output/nasm-build-last
  echo "Building NASM Standard Library..." >> ./output/nasm-build-last
  cd ../../../stdlib/
  mkdir -p ./output
  for link_file in "${LINK_STD_FILES[@]}"; do
    if [ "./$link_file/$link_file.nasm" -nt "./output/$link_file.o" ]; then
      echo "nasm -f elf64 -o ./output/$link_file.o ./$link_file/$link_file.nasm" >> "$start_dir/output/nasm-build-last"
      nasm -f elf64 -o ./output/$link_file.o ./$link_file/$link_file.nasm
      build_stdlib=1
    fi
    link_with+=" ./output/$link_file.o"
  done
  if [ "$build_stdlib" -eq 1 ]; then
    echo "ld -r -o ./output/stdlib.o $link_with" >> "$start_dir/output/nasm-build-last"
    ld -r -o ./output/stdlib.o $link_with
    do_link=1
  fi
  cd $start_dir
  echo "NASM Standard Library Complete" >> ./output/nasm-build-last

  # Now we build our actual output, linking to the standard library
  #   Only build if there's new changes to be built
  echo "Building NASM file..." >> ./output/nasm-build-last
  if [ "$fileName" -nt "./output/$fileNameWithoutExt.o" ]; then
    echo "nasm -f elf64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/nasm-build-last
    nasm -f elf64 -o "./output/$fileNameWithoutExt.o" "$fileName"
    do_link=1
  fi
  if [ ! -f "./output/$fileNameWithoutExt" ]; then
    do_link=1
  elif [ "$stdlib" -nt "./output/$fileNameWithoutExt" ]; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    echo "ld -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\"" >> ./output/nasm-build-last
    ld -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" &>> ./output/nasm-build-last
  fi
}
function nasm_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Nim
# =============================================
function nim_compile() {
  echo "nim compile --out:\"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/nim-build-last
  nim compile --out:"./output/$fileNameWithoutExt" "./$fileName" &>> ./output/nim-build-last
}
function nim_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Pascal
# =============================================
function pascal_compile() {
  echo "Copying $fileName to output..." > ./output/pascal-build-last
  cp "./$fileName" ./output

  echo "cd ./output && fpc \"$fileName\" & cd .." >> ./output/pascal-build-last
  cd ./output
  fpc "$fileName" &>> ./pascal-build-last
  cd ..
}
function pascal_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           PHP
# =============================================
function php_compile() { :; }
function php_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT php "$fileName" $other_params
}

# =============================================
#           Prolog
# =============================================
function prolog_compile() {
  echo "gplc \"$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/prolog-build-last
  gplc "$fileName" -o "./output/$fileNameWithoutExt" &>> ./output/prolog-build-last
}
function prolog_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Perl
# =============================================
function perl_compile() { :; }
function perl_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT perl "$fileName" $other_params
}

# =============================================
#           Python
# =============================================
function python_compile() { :; }
function python_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT python -u "$fileName" $other_params
}

# =============================================
#           R
# =============================================
function r_compile() { :; }
function r_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT Rscript "$fileName" $other_params
}

# =============================================
#           Ruby
# =============================================
function ruby_compile() { :; }
function ruby_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT ruby "$fileName" $other_params
}

# =============================================
#           Racket
# =============================================
function racket_compile() { :; }
function racket_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT racket "$fileName" $other_params
}

# =============================================
#           Rust
# =============================================
function rust_compile() {
  echo "rustc \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/rust-build-last
  rustc "./$fileName" -o "./output/$fileNameWithoutExt" &>> ./output/rust-build-last
}
function rust_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           Scala
# =============================================
function scala_compile() {
  echo "cp \"./$fileName\" ./output/ && cd ./output && scala compile \"./$fileName\" && cd .." > ./output/scala-build-last
  cp "./$fileName" ./output/
  cd ./output
  scala compile "./$fileName" &>> ./scala-build-last
  cd ..
}
function scala_run() {
  if [ "$#" -lt 2 ]; then
      other_params="15 10"
  fi

  cd ./output
  timeout --foreground $DEREKALGOS_TIMEOUT scala run "$fileName" -- $other_params
  cd ..
}

# =============================================
#           Scheme
# =============================================
function scheme_compile() { :; }
function scheme_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT guile -s "$fileName" $other_params
}

# =============================================
#           Simula
# =============================================
function simula_compile() {
  echo "Copying $fileName to output..." > ./output/simula-build-last
  cp "./$fileName" ./output/
  echo "cd ./output && cim \"./$fileName\" && cd .." > ./output/simula-build-last
  cd ./output/
  rm -f ./gcc ./g++
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GCC13NAME}" ./gcc
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GXX13NAME}" ./g++
  PATH="$PWD:$PATH" cim "./$fileName" &>> ./simula-build-last
  cd ..
}
function simula_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/$fileNameWithoutExt" $other_params
}

# =============================================
#           SmallTalk
# =============================================
function smalltalk_compile() { :; }
function smalltalk_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT gst "./$fileName" -a $other_params
}

# =============================================
#           Swift
# =============================================
function swift_compile() { :; }
function swift_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT swift "$fileName" $other_params
}

# =============================================
#           Tcl
# =============================================
function tcl_compile() { :; }
function tcl_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT tclsh "$fileName" $other_params
}

# =============================================
#           Typescript
# =============================================
function typescript_compile() {
  echo "tsc \"$fileName\" --outDir output --target esnext --skipLibCheck true" > ./output/typescript-build-last
  tsc "$fileName" --outDir output --target esnext --skipLibCheck true &>> ./output/typescript-build-last
}
function typescript_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT node ./output/$fileNameWithoutExt.js $other_params
}

# =============================================
#           V
# =============================================
function v_compile() { :; }
function v_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT v run "$fileName" $other_params
}

# =============================================
#           Visual Basic .Net
# =============================================
function visualbasic_compile() {
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
  dotnet build &>> ./visualbasic-build-last
  cd ..
}
function visualbasic_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT "./output/bin/Debug/net10.0/$fileNameWithoutExt" $other_params
}

# =============================================
#           WASM (wat)
# =============================================
function wat_compile() {
  echo "cp \"$fileName\" \"./output/$fileName\" && cd ./output && wat2wasm \"$fileName\" -o \"$fileNameWithoutExt.wasm\" && cd .." > ./output/wasm-build-last
  cp "$fileName" "./output/$fileName"
  cd ./output
  wat2wasm "$fileName" -o "$fileNameWithoutExt.wasm" &>> ./wasm-build-last
  cd ..
}
function wat_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT node ../../../run-wasm.js "./output/$fileNameWithoutExt.wasm" $other_params
}

# =============================================
#           ZIG
# =============================================
function zig_compile() { :; }
function zig_run() {
  timeout --foreground $DEREKALGOS_TIMEOUT zig run "$fileName" -- $other_params
}

# =============================================
# =============================================

# Definitions done, we start by checking for a check for the "clean"
# request.

if [ "$fileName" == "clean" ]; then
  rm -Rf ./output >> /dev/null
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
  "bal") lang="ballerina"; testFile="./output/$fileNameWithoutExt.jar";;
  "bas") lang="freebasic"; testFile="./output/$fileNameWithoutExt";;
  "c") lang="c"; testFile="./output/$fileNameWithoutExt";;
  "clj") lang="clojure"; testFile="./$fileName";;
  "cob") lang="cobol"; testFile="./output/$fileNameWithoutExt";;
  "cpp") lang="cpp"; testFile="./output/$fileNameWithoutExt";;
  "cs") lang="csharp"; testFile="./$fileName";;
  "d") lang="d"; testFile="./$fileName";;
  "dart") lang="dart"; testFile="./$fileName";;
  "e") lang="eiffel"; testFile="./output/EIFGENs/$fileName/F_code/$fileName";;
  "erl") lang="erlang"; testFile="./output/$fileNameWithoutExt.beam";;
  "exs") lang="elixir"; testFile="./$fileName";;
  "f90") lang="fortran"; testFile="./output/$fileNameWithoutExt";;
  "factor") lang="factor"; testFile="./$fileName";;
  "fsx") lang="fsharp"; testFile="./$fileName";;
  "fth") lang="forth"; testFile="./$fileName";;
  "gleam") lang="gleam"; testFile="./output/build/dev/erlang/$fileNameWithoutExt/ebin/$fileNameWithoutExt.beam";;
  "go") lang="go"; testFile="./$fileName";;
  "hs") lang="haskell"; testFile="./$fileName";;
  "hx") lang="haxe"; testFile="./$fileName";;
  "icn") lang="icon"; testFile="./$fileName";;
  "idr") lang="idris"; testFile="./output/build/exec/$fileNameWithoutExt";;
  "java") lang="java"; testFile="./output/$fileNameWithoutExt.jar";;
  "jl") lang="julia"; testFile="./$fileName";;
  "js") lang="javascript"; testFile="./$fileName";;
  "kit") lang="kit"; testFile="./$fileName";;
  "kt") lang="kotlin"; testFile="./output/$fileNameWithoutExt.jar";;
  "ll") lang="llvmir"; testFile="./output/$fileNameWithoutExt";;
  "lua") lang="lua"; testFile="./$fileName";;
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
  "scala") lang="scala"; testFile="./output/$fileName";;
  "scm") lang="scheme"; testFile="./$fileName";;
  "sim") lang="simula"; testFile="./output/$fileNameWithoutExt";;
  "st") lang="smalltalk"; testFile="./$fileName";;
  "swift") lang="swift"; testFile="./$fileName";;
  "tcl") lang="tcl"; testFile="./$fileName";;
  "ts") lang="typescript"; testFile="./output/$fileNameWithoutExt.js";;
  "v") lang="v"; testFile="./$fileName";;
  "vb") lang="visualbasic"; testFile="./output/bin/Debug/net10.0/$fileNameWithoutExt";;
  "wat") lang="wat"; testFile="./output/$fileNameWithoutExt.wasm";;
  "zig") lang="zig"; testFile="./$fileName";;
  *) echo "Unrecognized file extension, not building!"; exit;;
esac

# Now, we should check if the environment wants our language
# to run on a VM via ssh, in which case, we should go ahead
# and do that then exit.

if [[ " $DEREKALGOS_RUNONVM " == *" $lang "* ]]; then
  scp -P $DEREKALGOS_VMPORT "./$fileName" $DEREKALGOS_VMUSER@$DEREKALGOS_VMADDRESS:"${DEREKALGOS_VMCODEDIR}/${fileName}" >> /dev/null
  ToRunOnVM="source \"$DEREKALGOS_VMSTARTDIR/.bash_profile\"; cd $DEREKALGOS_VMCODEDIR && "$DEREKALGOS_VMRUNSCRIPT" "$fileName" $other_params"
  ssh -p $DEREKALGOS_VMPORT $DEREKALGOS_VMUSER@$DEREKALGOS_VMADDRESS $ToRunOnVM
  exit
fi

# First thing, let's check to see if the output directory
# needs to be cleaned. This is the case if a different language
# was last to build for the given algorithm, and also
# if there are new updates to the code file.

if [[ -f "./output/last-lang" ]]; then
  if cmp -s "./output/last-lang" - <<< "$lang"; then
    if [ "./$fileName" -nt "$testFile" ]; then
      destroy_output=1
    fi
  else
    destroy_output=1
  fi
else
  destroy_output=1
fi

mkdir -p ./output
if [ "$destroy_output" -eq 1 ]; then
  rm -Rf ./output/* >> /dev/null
fi

# Finally, run the compile for the specified language,
# and if successful, run it immediately.
# if the build fails, try to output the last build output

"${lang}_compile"

if [[ -f "$testFile" ]]; then
  "${lang}_run"
  echo "$lang" > ./output/last-lang
else
  echo "FAILED TO COMPILE ${lang^^}. BUILD OUTPUT:"
  cat "./output/${lang}-build-last"
fi
exit
