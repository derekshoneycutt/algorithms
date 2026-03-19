# Algorithms Grab-bag

<p align="center">
<img src="./icons/ada.svg" alt="Ada" width="30" height="30">
<img src="./icons/ballerina.svg" alt="Ballerina" width="30" height="30">
<img src="./icons/c.svg" alt="C" width="30" height="30">
<img src="./icons/cpp.svg" alt="C++" width="30" height="30">
<img src="./icons/csharp.svg" alt="C#" width="30" height="30">
<img src="./icons/clojure.svg" alt="Clojure" width="30" height="30">
<img src="./icons/cobol.svg" alt="COBOL" width="30" height="30">
<img src="./icons/d.svg" alt="D" width="30" height="30">
<img src="./icons/dart.svg" alt="Dart" width="30" height="30">
<img src="./icons/eiffel.svg" alt="Eiffel" width="30" height="30">
<img src="./icons/elixir.svg" alt="Elixir" width="30" height="30">
<img src="./icons/erlang.svg" alt="Erlang" width="30" height="30">
<img src="./icons/fsharp.svg" alt="F#" width="30" height="30">
<img src="./icons/factor.svg" alt="Factor" width="30" height="30">
<img src="./icons/freebasic.svg" alt="FreeBASIC" width="30" height="30"> 
<img src="./icons/forth.svg" alt="Forth" width="30" height="30">
<img src="./icons/fortran.svg" alt="Fortran" width="30" height="30"> 
<img src="./icons/gleam.svg" alt="Gleam" width="30" height="30">
<img src="./icons/go.svg" alt="Go" width="30" height="30">
<img src="./icons/haskell.svg" alt="Haskell" width="30" height="30">
<img src="./icons/haxe.svg" alt="Haxe" width="30" height="30">
<img src="./icons/idris.svg" alt="Idris" width="30" height="30">
<img src="./icons/java.svg" alt="Java" width="30" height="30">
<img src="./icons/javascript.svg" alt="Javascript" width="30" height="30">
<img src="./icons/julia.svg" alt="Julia" width="30" height="30">
<img src="./icons/kit.svg" alt="Kit" width="30" height="30">
<img src="./icons/kotlin.svg" alt="Kotlin" width="30" height="30">
<img src="./icons/lua.svg" alt="Lua" width="30" height="30">
<img src="./icons/mercury.svg" alt="Mercury" width="30" height="30">
<img src="./icons/assembly.svg" alt="Assembly" width="30" height="30">
<img src="./icons/modula3.svg" alt="Modula-3" width="30" height="30">
<img src="./icons/mojo.svg" alt="Mojo" width="30" height="30">
<img src="./icons/assembly.svg" alt="Assembly" width="30" height="30">
<img src="./icons/nim.svg" alt="Nim" width="30" height="30">
<img src="./icons/oberon.svg" alt="Oberon" width="30" height="30">
<img src="./icons/objective-c.svg" alt="Objective-C" width="30" height="30"> 
<img src="./icons/ocaml.svg" alt="Ocaml" width="30" height="30">
<img src="./icons/octave.svg" alt="Octave" width="30" height="30">
<img src="./icons/pascal.svg" alt="Pascal" width="30" height="30">
<img src="./icons/perl.svg" alt="Perl" width="30" height="30">
<img src="./icons/php.svg" alt="PHP" width="30" height="30">
<img src="./icons/prolog.svg" alt="Prolog" width="30" height="30">
<img src="./icons/python.svg" alt="Python" width="30" height="30">
<img src="./icons/r.svg" alt="R" width="30" height="30">
<img src="./icons/racket.svg" alt="Racket" width="30" height="30">
<img src="./icons/ruby.svg" alt="Ruby" width="30" height="30">
<img src="./icons/rust.svg" alt="Rust" width="30" height="30">
<img src="./icons/scala.svg" alt="Scala" width="30" height="30">
<img src="./icons/scheme.svg" alt="Scheme" width="30" height="30">
<img src="./icons/simula.svg" alt="Simula" width="30" height="30">
<img src="./icons/smalltalk.svg" alt="Smalltalk" width="30" height="30">
<img src="./icons/swift.svg" alt="Swift" width="30" height="30">
<img src="./icons/tcl.svg" alt="Tcl" width="30" height="30">
<img src="./icons/typescript.svg" alt="Typescript" width="30" height="30">
<img src="./icons/vlang.svg" alt="V" width="30" height="30">
<img src="./icons/visualstudio.svg" alt="VB" width="30" height="30">
<img src="./icons/zig.svg" alt="Zig" width="30" height="30">
</p>

This is just a fun little project for myself to write a bunch of algorithms and data
structures in a bunch of different languages. Why not?

I am reading through Knuth's The Art of Computer Programming, serving as
the primary source for algorithms that appear in here. Instead of just doing
the MMIXAL alone (although it is included), I have decided to add a bunch
of other languages to learn the algorithms and techniques in even more
depth.

All algorithms are in src/

All languages have a script in run/ that does what is necessary to prepare
and run a single file. In some cases, this includes quickly creating a
project setup and compiling the project. In some cases, this is just compiling
the single file. Other cases are able to run it directly. Due to the fact
that I was not able to get every langauge working directly on my ordinary
computer, I also have a VM with Ubuntu Server setup that runs some languages.
The run scripts reflect this fact.

For MMIX and NASM, I have decided to start collecting a small standard library
of methods that can be linked in. This is in stdlib/. I am mostly favoring
my own implementation including syscall routines instead of linking to libc.
Because of this, there are 2 scripts used to link in the standard library and
run the code. Both scripts take the file to be run and assembles and links them,
passing all other command line arguments directly to the final execution.

## Languages

I explore many different languages. This is a rough list that may more may not be entirely up to date ever.
 to date ever.

- <img src="./icons/ada.svg" alt="Ada" width="15" height="15"> Ada
- <img src="./icons/c.svg" alt="C" width="15" height="15"> C
- <img src="./icons/cpp.svg" alt="C++" width="15" height="15"> C++
- <img src="./icons/csharp.svg" alt="C#" width="15" height="15"> C#
- <img src="./icons/clojure.svg" alt="Clojure" width="15" height="15"> Clojure
- <img src="./icons/cobol.svg" alt="COBOL" width="15" height="15"> COBOL
- <img src="./icons/d.svg" alt="D" width="15" height="15"> D
- <img src="./icons/dart.svg" alt="Dart" width="15" height="15"> Dart
- <img src="./icons/elixir.svg" alt="Elixir" width="15" height="15"> Elixir
- <img src="./icons/erlang.svg" alt="Erlang" width="15" height="15"> Erlang
- <img src="./icons/fsharp.svg" alt="F#" width="15" height="15"> F#
- <img src="./icons/freebasic.svg" alt="FreeBASIC" width="15" height="15"> FreeBASIC
- <img src="./icons/fortran.svg" alt="Fortran" width="15" height="15"> Fortran
- <img src="./icons/go.svg" alt="Go" width="15" height="15"> Go
- <img src="./icons/haskell.svg" alt="Haskell" width="15" height="15"> Haskell
- <img src="./icons/java.svg" alt="Java" width="15" height="15"> Java
- <img src="./icons/javascript.svg" alt="Javascript" width="15" height="15"> Javascript
- <img src="./icons/julia.svg" alt="Julia" width="15" height="15"> Julia
- <img src="./icons/kotlin.svg" alt="Kotlin" width="15" height="15"> Kotlin
- <img src="./icons/lua.svg" alt="Lua" width="15" height="15"> Lua
- <img src="./icons/assembly.svg" alt="Assembly" width="15" height="15"> MMIXAL (Assembly Language for Donald Knuth's MMIX)
- <img src="./icons/modula3.svg" alt="Modula-3" width="15" height="15"> Modula-3
- <img src="./icons/assembly.svg" alt="Assembly" width="15" height="15"> NASM (x86_64 Linux ASM)
- <img src="./icons/objective-c.svg" alt="Objective-C" width="15" height="15"> Objective-C
- <img src="./icons/oberon.svg" alt="Oberon" width="15" height="15"> Oberon
- <img src="./icons/ocaml.svg" alt="Ocaml" width="15" height="15"> Ocaml
- <img src="./icons/perl.svg" alt="Perl" width="15" height="15"> Perl
- <img src="./icons/php.svg" alt="PHP" width="15" height="15"> PHP
- <img src="./icons/python.svg" alt="Python" width="15" height="15"> Python
- <img src="./icons/r.svg" alt="R" width="15" height="15"> R
- <img src="./icons/ruby.svg" alt="Ruby" width="15" height="15"> Ruby
- <img src="./icons/rust.svg" alt="Rust" width="15" height="15"> Rust
- <img src="./icons/scala.svg" alt="Scala" width="15" height="15"> Scala
- <img src="./icons/scheme.svg" alt="Scheme" width="15" height="15"> Scheme
- <img src="./icons/simula.svg" alt="Simula" width="15" height="15"> Simula
- <img src="./icons/swift.svg" alt="Swift" width="15" height="15"> Swift
- <img src="./icons/typescript.svg" alt="Typescript" width="15" height="15"> Typescript

### Additionally, currently in Hello World

- <img src="./icons/ballerina.svg" alt="Ballerina" width="15" height="15"> Ballerina
- <img src="./icons/eiffel.svg" alt="Eiffel" width="15" height="15"> Eiffel
- <img src="./icons/gleam.svg" alt="Gleam" width="15" height="15"> Gleam
- <img src="./icons/factor.svg" alt="Factor" width="15" height="15"> Factor
- <img src="./icons/forth.svg" alt="Forth" width="15" height="15"> Forth
- <img src="./icons/haxe.svg" alt="Haxe" width="15" height="15"> Haxe
- <img src="./icons/idris.svg" alt="Idris" width="15" height="15"> Idris2
- <img src="./icons/kit.svg" alt="Kit" width="15" height="15"> Kit
- <img src="./icons/mercury.svg" alt="Mercury" width="15" height="15"> Mercury
- <img src="./icons/mojo.svg" alt="Mojo" width="15" height="15"> Mojo
- <img src="./icons/nim.svg" alt="Nim" width="15" height="15"> Nim
- <img src="./icons/octave.svg" alt="Nim" width="15" height="15"> Octave
- <img src="./icons/pascal.svg" alt="Pascal" width="15" height="15"> (Free/Object) Pascal
- <img src="./icons/prolog.svg" alt="Prolog" width="15" height="15"> Prolog
- <img src="./icons/racket.svg" alt="Racket" width="15" height="15"> Racket
- <img src="./icons/smalltalk.svg" alt="Smalltalk" width="15" height="15"> Smalltalk
- <img src="./icons/tcl.svg" alt="Tcl" width="15" height="15"> Tcl
- <img src="./icons/vlang.svg" alt="V" width="15" height="15"> V
- <img src="./icons/visualstudio.svg" alt="VB" width="15" height="15"> Visual Basic .Net
- <img src="./icons/zig.svg" alt="Zig" width="15" height="15"> Zig
