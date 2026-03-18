# Algorithms Grab-bag

<p align="center">
<img src="./.vscode/ada.svg" alt="Ada" width="30" height="30">
<img src="./.vscode/c.svg" alt="C" width="30" height="30">
<img src="./.vscode/cpp.svg" alt="C++" width="30" height="30">
<img src="./.vscode/csharp.svg" alt="C#" width="30" height="30">
<img src="./.vscode/clojure.svg" alt="Clojure" width="30" height="30">
<img src="./.vscode/cobol.svg" alt="COBOL" width="30" height="30">
<img src="./.vscode/d.svg" alt="D" width="30" height="30">
<img src="./.vscode/dart.svg" alt="Dart" width="30" height="30">
<img src="./.vscode/erlang.svg" alt="Erlang" width="30" height="30">
<img src="./.vscode/elixir.svg" alt="Elixir" width="30" height="30">
<img src="./.vscode/fsharp.svg" alt="F#" width="30" height="30">
<img src="./.vscode/factor.svg" alt="Factor" width="30" height="30">
<img src="./.vscode/freebasic.svg" alt="FreeBASIC" width="30" height="30"> 
<img src="./.vscode/forth.svg" alt="Forth" width="30" height="30">
<img src="./.vscode/fortran.svg" alt="Fortran" width="30" height="30"> 
<img src="./.vscode/go.svg" alt="Go" width="30" height="30">
<img src="./.vscode/haskell.svg" alt="Haskell" width="30" height="30">
<img src="./.vscode/haxe.svg" alt="Haxe" width="30" height="30">
<img src="./.vscode/idris.svg" alt="Idris" width="30" height="30">
<img src="./.vscode/java.svg" alt="Java" width="30" height="30">
<img src="./.vscode/javascript.svg" alt="Javascript" width="30" height="30">
<img src="./.vscode/julia.svg" alt="Julia" width="30" height="30">
<img src="./.vscode/kit.svg" alt="Kit" width="30" height="30">
<img src="./.vscode/kotlin.svg" alt="Kotlin" width="30" height="30">
<img src="./.vscode/lua.svg" alt="Lua" width="30" height="30">
<img src="./.vscode/mercury.svg" alt="Mercury" width="30" height="30">
<img src="./.vscode/assembly.svg" alt="Assembly" width="30" height="30">
<img src="./.vscode/modula3.svg" alt="Modula-3" width="30" height="30">
<img src="./.vscode/mojo.svg" alt="Mojo" width="30" height="30">
<img src="./.vscode/assembly.svg" alt="Assembly" width="30" height="30">
<img src="./.vscode/nim.svg" alt="Nim" width="30" height="30">
<img src="./.vscode/oberon.svg" alt="Oberon" width="30" height="30">
<img src="./.vscode/objective-c.svg" alt="Objective-C" width="30" height="30"> 
<img src="./.vscode/ocaml.svg" alt="Ocaml" width="30" height="30">
<img src="./.vscode/pascal.svg" alt="Pascal" width="30" height="30">
<img src="./.vscode/perl.svg" alt="Perl" width="30" height="30">
<img src="./.vscode/php.svg" alt="PHP" width="30" height="30">
<img src="./.vscode/prolog.svg" alt="Prolog" width="30" height="30">
<img src="./.vscode/python.svg" alt="Python" width="30" height="30">
<img src="./.vscode/r.svg" alt="R" width="30" height="30">
<img src="./.vscode/racket.svg" alt="Racket" width="30" height="30">
<img src="./.vscode/ruby.svg" alt="Ruby" width="30" height="30">
<img src="./.vscode/rust.svg" alt="Rust" width="30" height="30">
<img src="./.vscode/scala.svg" alt="Scala" width="30" height="30">
<img src="./.vscode/scheme.svg" alt="Scheme" width="30" height="30">
<img src="./.vscode/simula.svg" alt="Simula" width="30" height="30">
<img src="./.vscode/smalltalk.svg" alt="Smalltalk" width="30" height="30">
<img src="./.vscode/swift.svg" alt="Swift" width="30" height="30">
<img src="./.vscode/typescript.svg" alt="Typescript" width="30" height="30">
<img src="./.vscode/vlang.svg" alt="V" width="30" height="30">
<img src="./.vscode/visualstudio.svg" alt="VB" width="30" height="30">
<img src="./.vscode/zig.svg" alt="Zig" width="30" height="30">
</p>

This is just a fun little project for myself to write a bunch of algorithms and data
structures in a bunch of different languages. Why not?

I am reading through Knuth's The Art of Computer Programming, serving as
the primary source for algorithms that appear in here. Instead of just doing
the MMIXAL alone (although it is included), I have decided to add a bunch
of other languages to learn the algorithms and techniques in even more
depth.

The languages that I am interested in are ones that are not too amazingly difficult
to setup to build and run a single file at a time. Sometimes that is a little bit
more convoluted than other times, but I am not interested in creating whole projects.
Each file is rather to be its own standalone and follow common patterns.

For MMIX and NASM, I have decided to start collecting a small standard library
of methods that can be linked in. This is in stdlib/. I am mostly favoring
my own implementation including syscall routines instead of linking to libc.
Because of this, there are 2 scripts used to link in the standard library and
run the code. Both scripts take the file to be run and assembles and links them,
passing all other command line arguments directly to the final execution.

## Languages

I explore many different languages. This is a rough list that may more may not be entirely up to date ever.
 to date ever.

- <img src="./.vscode/ada.svg" alt="Ada" width="15" height="15"> Ada
- <img src="./.vscode/c.svg" alt="C" width="15" height="15"> C
- <img src="./.vscode/cpp.svg" alt="C++" width="15" height="15"> C++
- <img src="./.vscode/csharp.svg" alt="C#" width="15" height="15"> C#
- <img src="./.vscode/clojure.svg" alt="Clojure" width="15" height="15"> Clojure
- <img src="./.vscode/cobol.svg" alt="COBOL" width="15" height="15"> COBOL
- <img src="./.vscode/d.svg" alt="D" width="15" height="15"> D
- <img src="./.vscode/dart.svg" alt="Dart" width="15" height="15"> Dart
- <img src="./.vscode/erlang.svg" alt="Erlang" width="15" height="15"> Erlang
- <img src="./.vscode/elixir.svg" alt="Elixir" width="15" height="15"> Elixir
- <img src="./.vscode/fsharp.svg" alt="F#" width="15" height="15"> F#
- <img src="./.vscode/freebasic.svg" alt="FreeBASIC" width="15" height="15"> FreeBASIC
- <img src="./.vscode/fortran.svg" alt="Fortran" width="15" height="15"> Fortran
- <img src="./.vscode/go.svg" alt="Go" width="15" height="15"> Go
- <img src="./.vscode/haskell.svg" alt="Haskell" width="15" height="15"> Haskell
- <img src="./.vscode/java.svg" alt="Java" width="15" height="15"> Java
- <img src="./.vscode/javascript.svg" alt="Javascript" width="15" height="15"> Javascript
- <img src="./.vscode/julia.svg" alt="Julia" width="15" height="15"> Julia
- <img src="./.vscode/kotlin.svg" alt="Kotlin" width="15" height="15"> Kotlin
- <img src="./.vscode/lua.svg" alt="Lua" width="15" height="15"> Lua
- <img src="./.vscode/assembly.svg" alt="Assembly" width="15" height="15"> MMIXAL (Assembly Language for Donald Knuth's MMIX)
- <img src="./.vscode/modula3.svg" alt="Modula-3" width="15" height="15"> Modula-3
- <img src="./.vscode/assembly.svg" alt="Assembly" width="15" height="15"> NASM (x86_64 Linux ASM)
- <img src="./.vscode/objective-c.svg" alt="Objective-C" width="15" height="15"> Objective-C
- <img src="./.vscode/ocaml.svg" alt="Ocaml" width="15" height="15"> Ocaml
- <img src="./.vscode/perl.svg" alt="Perl" width="15" height="15"> Perl
- <img src="./.vscode/php.svg" alt="PHP" width="15" height="15"> PHP
- <img src="./.vscode/python.svg" alt="Python" width="15" height="15"> Python
- <img src="./.vscode/r.svg" alt="R" width="15" height="15"> R
- <img src="./.vscode/ruby.svg" alt="Ruby" width="15" height="15"> Ruby
- <img src="./.vscode/rust.svg" alt="Rust" width="15" height="15"> Rust
- <img src="./.vscode/scala.svg" alt="Scala" width="15" height="15"> Scala
- <img src="./.vscode/scheme.svg" alt="Scheme" width="15" height="15"> Scheme
- <img src="./.vscode/simula.svg" alt="Simula" width="15" height="15"> Simula
- <img src="./.vscode/swift.svg" alt="Swift" width="15" height="15"> Swift
- <img src="./.vscode/typescript.svg" alt="Typescript" width="15" height="15"> Typescript

### Additionally, currently in Hello World

- <img src="./.vscode/factor.svg" alt="Factor" width="15" height="15"> Factor
- <img src="./.vscode/forth.svg" alt="Forth" width="15" height="15"> Forth
- <img src="./.vscode/haxe.svg" alt="Haxe" width="15" height="15"> Haxe
- <img src="./.vscode/idris.svg" alt="Idris" width="15" height="15"> Idris2
- <img src="./.vscode/kit.svg" alt="Kit" width="15" height="15"> Kit
- <img src="./.vscode/mercury.svg" alt="Mercury" width="15" height="15"> Mercury
- <img src="./.vscode/mojo.svg" alt="Mojo" width="15" height="15"> Mojo
- <img src="./.vscode/nim.svg" alt="Nim" width="15" height="15"> Nim
- <img src="./.vscode/oberon.svg" alt="Oberon" width="15" height="15"> Oberon
- <img src="./.vscode/pascal.svg" alt="Pascal" width="15" height="15"> (Free/Object) Pascal
- <img src="./.vscode/prolog.svg" alt="Prolog" width="15" height="15"> Prolog
- <img src="./.vscode/racket.svg" alt="Racket" width="15" height="15"> Racket
- <img src="./.vscode/smalltalk.svg" alt="Smalltalk" width="15" height="15"> Smalltalk
- <img src="./.vscode/vlang.svg" alt="V" width="15" height="15"> V
- <img src="./.vscode/visualstudio.svg" alt="VB" width="15" height="15"> Visual Basic .Net
- <img src="./.vscode/zig.svg" alt="Zig" width="15" height="15"> Zig
