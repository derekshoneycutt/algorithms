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

- <img src="./.vscode/ada.svg" alt="Ada" width="30" height="30"> Ada
- <img src="./.vscode/c.svg" alt="C" width="30" height="30"> C
- <img src="./.vscode/cpp.svg" alt="C++" width="30" height="30"> C++
- <img src="./.vscode/csharp.svg" alt="C#" width="30" height="30"> C#
- <img src="./.vscode/clojure.svg" alt="Clojure" width="30" height="30"> Clojure
- <img src="./.vscode/cobol.svg" alt="COBOL" width="30" height="30"> COBOL
- <img src="./.vscode/d.svg" alt="D" width="30" height="30"> D
- <img src="./.vscode/dart.svg" alt="Dart" width="30" height="30"> Dart
- <img src="./.vscode/erlang.svg" alt="Erlang" width="30" height="30"> Erlang
- <img src="./.vscode/elixir.svg" alt="Elixir" width="30" height="30"> Elixir
- <img src="./.vscode/fsharp.svg" alt="F#" width="30" height="30"> F#
- <img src="./.vscode/freebasic.svg" alt="FreeBASIC" width="30" height="30"> FreeBASIC
- <img src="./.vscode/fortran.svg" alt="Fortran" width="30" height="30"> Fortran
- <img src="./.vscode/go.svg" alt="Go" width="30" height="30"> Go
- <img src="./.vscode/haskell.svg" alt="Haskell" width="30" height="30"> Haskell
- <img src="./.vscode/java.svg" alt="Java" width="30" height="30"> Java
- <img src="./.vscode/javascript.svg" alt="Javascript" width="30" height="30"> Javascript
- <img src="./.vscode/julia.svg" alt="Julia" width="30" height="30"> Julia
- <img src="./.vscode/kotlin.svg" alt="Kotlin" width="30" height="30"> Kotlin
- <img src="./.vscode/lua.svg" alt="Lua" width="30" height="30"> Lua
- <img src="./.vscode/assembly.svg" alt="Assembly" width="30" height="30"> MMIXAL (Assembly Language for Donald Knuth's MMIX)
- <img src="./.vscode/assembly.svg" alt="Assembly" width="30" height="30"> NASM (x86_64 Linux ASM)
- <img src="./.vscode/objective-c.svg" alt="Objective-C" width="30" height="30"> Objective-C
- <img src="./.vscode/ocaml.svg" alt="Ocaml" width="30" height="30"> Ocaml
- <img src="./.vscode/perl.svg" alt="Perl" width="30" height="30"> Perl
- <img src="./.vscode/php.svg" alt="PHP" width="30" height="30"> PHP
- <img src="./.vscode/python.svg" alt="Python" width="30" height="30"> Python
- <img src="./.vscode/r.svg" alt="R" width="30" height="30"> R
- <img src="./.vscode/ruby.svg" alt="Ruby" width="30" height="30"> Ruby
- <img src="./.vscode/rust.svg" alt="Rust" width="30" height="30"> Rust
- <img src="./.vscode/scala.svg" alt="Scala" width="30" height="30"> Scala
- <img src="./.vscode/scheme.svg" alt="Scheme" width="30" height="30"> Scheme
- <img src="./.vscode/simula.svg" alt="Simula" width="30" height="30"> Simula
- <img src="./.vscode/swift.svg" alt="Swift" width="30" height="30"> Swift
- <img src="./.vscode/typescript.svg" alt="Typescript" width="30" height="30"> Typescript

### Additionally, currently in Hello World

- <img src="./.vscode/factor.svg" alt="Factor" width="30" height="30"> Factor
- <img src="./.vscode/forth.svg" alt="Forth" width="30" height="30"> Forth
- <img src="./.vscode/haxe.svg" alt="Haxe" width="30" height="30"> Haxe
- <img src="./.vscode/idris.svg" alt="Idris" width="30" height="30"> Idris2
- <img src="./.vscode/kit.svg" alt="Kit" width="30" height="30"> Kit
- <img src="./.vscode/mercury.svg" alt="Mercury" width="30" height="30"> Mercury
- <img src="./.vscode/modula3.svg" alt="Modula-3" width="30" height="30"> Modula-3
- <img src="./.vscode/mojo.svg" alt="Mojo" width="30" height="30"> Mojo
- <img src="./.vscode/nim.svg" alt="Nim" width="30" height="30"> Nim
- <img src="./.vscode/pascal.svg" alt="Pascal" width="30" height="30"> (Free/Object) Pascal
- <img src="./.vscode/prolog.svg" alt="Prolog" width="30" height="30"> Prolog
- <img src="./.vscode/racket.svg" alt="Racket" width="30" height="30"> Racket
- <img src="./.vscode/smalltalk.svg" alt="Smalltalk" width="30" height="30"> Smalltalk
- <img src="./.vscode/vlang.svg" alt="V" width="30" height="30"> V
- <img src="./.vscode/visualstudio.svg" alt="VB" width="30" height="30"> Visual Basic .Net
- <img src="./.vscode/zig.svg" alt="Zig" width="30" height="30"> Zig
