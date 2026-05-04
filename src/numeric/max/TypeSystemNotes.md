# Type System Notes

This is just some notes on the different type systems of the different languages used in this project. This is relevant under the Max algorithm, as the opportunity is taken in this algorithm to explore generics and similar mechanisms.

For this time, we're mainly focused on how integer values are express and avoid floating point values. Strings are somewhat relevant as well, though less so yet.

## Assembly

### MMIXAL

BYTE, WYDE, TETRA, OCTA

SIGNED, UNSIGNED

Number literals written as numbers; BYTE used for predefined strings

All registers 64bit

assemble-time defs as `name  BYTE  "words",10,0`

instructions:

LDB, LDW, LDT, LDO, LDBU, LDWU, LDTU, LDOU, LDHT

STB, STW, STT, STO, STBU, STWU, STTU, STOU, STHT, STCO

Direct manipulation of an GREG assigned as the stack pointer

### ARM64

.data has .byte .hword .word .quad .ascii .asciz .zero

xN registers 64bit, wN registers 32bit part

LDR (full 32/64bit), LDRB (byte), LDRSB (signed byte)

Number literals prefixed with #

Direct manipulation of standard sp stack pointer

### NASM

64bit registers starting r*, 32bit starting e* or ending *d, 16bit no pre or post *w, 8-bit *h *l *b varied.

mov vs movsxd vs movsx

.byte allocation: db, dw, dd, dq ; byte word dword qword

heavy use of stack via push/pop all 64bit

number literals as numbers

.bss has resb, resw, resd, resq, rest (10 bytes), reso (octo), resy (32byte), resz (64byte)

### GAS x86-64

same registers as nasm; prefix with %

same heavy use of stack, primarily pushq/pop

number literals prefaced with $

.data has .byte, .short, .long, .quad, .ascii, .asciz, .float, .double

.bss has .lcomm .comm .skip

Instructions have data size suffix: b, w, l, q, s (32b float), t (80b float); sometimes implied

## Other low level stuff

### Forth

No real type systems. Just have the stack, sized as the system's word per "cell".

### WASM/WAT

mostly just using i32 so far, and always linked to that specific type; i64 floats vectors also

has to use memory page to allocate array of data to find max of

heavy use of stack, but can't use it as much as used in asm and especially not forth

### LLVM IR

Use some i8 for bytes, i32 and i64 for integer values

also use ptr

constants stored via e.g. [9 x i8]

A lot more explicit allocating and pointer fun, although auto manage after alloc

## Static Languages (without Genericity)

### COBOL

DATA DIVISIONs with WORKING-STORAGE and LINKAGE SECTIONs.

Defined by number of digits and A,9,X (alpha, num, aphanum).

Arrays have to depend on another variable for size and allocation and for the pointer, while being defined in the working-storage section

data can be defined in hierarchical table forms, 01, 05, 10 levels

LINKAGE-SECTION for sharing between the different program divisions is very interesting

### FreeBASIC

Static typing, pretty simple, User Defined Types are available, even pointers, but pretty basic stuff

### Simula

Extends ALGOL 60, so strongly typed. No generics. Introduced classes with inheritance and virtual methods, reference semantics, etc.

integer, real, character, Boolean, text, array

### Ballerina

Ballerina is flexibly typed, based on the structure before name, basically Duck typing-ish, with support for semantic subtyping. Subtyping in Ballerina is semantic. It is defined through shapes where S is a subtype of T if the set of shapes denoted by S is a subset of the shapes denoted by T. Optimized for communication barriers that may value shape first

Shapes, record types, union types

Achieve a kinda knock-off type of genericity via union types and structural polymorphism

### Tcl

Everything is a string until we need to do math lol

commands not statements

no literally, variables, commands, functions, even the script itself are all strings in Tcl.

Does create internal repreesentations once evaluated as another type; "shimmering" is the change in internal representation, and can be coded around for optimization

### Oberon

Basic static typing. Has type extension on records, though, not far from a very limited form of Julia's inheritance

INTEGER, CHAR, ARRAY, POINTER, REAL, LONGINT, LONGREAL, SHORTINT, BOOLEAN, SET, RECORD

RECORD is like struct etc.

## Static Languages with Genericity

### Modula-3

[Luca Cardelli's Website](http://lucacardelli.name/papers/modula3typesystem.a4.pdf) includes a pdf description.

Strongly typed system with the ALGOL-like INTEGER, ARRAY, etc. Also includes REF types with RECORD, OBJECT, and such oop with single inheritance only.

Includes generics and interface modules that can be used to work with a kind of dynamic typing

### Eiffel

Includes generics for an entire class only

OOP + the usual INTEGER, STRING, etc. Everything is an instance of a class. Multiple inheritance

void-saftey provides very strong safety

### C

static, weak implicit typing

char, int, long, short, float double etc, structs, void, pointers and void*.

"new" types can be defined based on complex type definitions via typedef. also structs

We get a generic type programming via void* and typedefs.

Integer literals available in modern standards

### Objective-C

Literally the same as C for this use case

### Fortran

static and strongly typed; Integer, Real, Complex, Logical, Character

Allows generics via interface and modules

interesting intent, allocatable and dimension for dynamic arrays

allocate and deallocate explicit

### Ada

strong, static types; allows custom types

Integer, array, etc. Arrays are interesting and use custom type definitions

generics are extremely explicit with type definitions

### Factor

Much higher level than forth, but still have everything in words on the stack. We do have booleans, numbers, and collections including sequences and strings. The main place this comes up in current code is via use of seq and [] quotations.

In factor, all values are objects, but dynamically typed at runtime

Factor has generic words, which are defined specifically for type via GENERIC: and M:.

### Zig

static, nominal type using i32 and the like, with standard collections like ArrayList(T)

comptime enables generics and fun

uses allocators lol

### C++

Basically C + classes lol

### C\#

static, everything is an object inheriting Object; only single inheritance except interfaces

value types & ref types; native values like int, double, etc. in System.Int32 etc.

value types sometimes get boxes as ref types

strong use of generics in the language

nullable contexts provide strong warnings

### Visual Basic .NET

basically C#'s lol

### F\#

basically C#'s lol

### Dart

sound -- prevents invalid type, and also null safety (kinda like eiffel lol)

static type, though strongly inferred

generics with constraits quite easily

### Rust

static typed

primitives, sequence, user-defined types, functions, pointers, traits

includes algebraic data types and type inference. generics with constraints in pretty syntax i64, Vec<_>, other fun stuff

### Go

static and strong typing, but with structural interfaces implicitly meeting

prefers composition over inheritance

generics with constraints pretty standard

### V

heavily influenced by go, including static, strong typing with strong type inference and immutability by default. has simple generics

### Nim

static typing, with strong inference and immutability by default, looks a lot like Go too

primarily structural typing vs nominal

### Java

static and strong types; generics with constraints pretty clear

OOPy with primitive types byte short int long char etc and reference types; primitives aren't objects

### Kotlin

Adds null safety and a unified hierarchy to java, basically the same generics

primitives are objects too

### Scala

Basically the same as Java/Kotlin with unified type hierarchy everything's an object. Basically the same generics just different syntax. Some functional and algebraic enhancements

### Haxe

strict and strongly type, very OOP, everything's class, enum, structure, function, abstract, dynamic, monomorph

structural subtyping, generics, has null safety opt-in and typedefs, etc.

### Swift

static typing, often inferred. nominal typing including OOPy.

value & ref types, optionals, protocols and generics

### Mojo

static typing, highly inferred. simple custom struct types. generics with constraints pretty easy

does allow some gradual typing for python integration

### Pascal (FreePascal)

strong, static typing, variables declared ahead in dedicated var block

integer, array of integer, etc. FreePascal allows generics

Does have user defined types, enumerated types, etc.

### D

Kinda between C++ and Java/C#. static, strong typing, with some type inference

has templating closer to C++ but initial syntax unique c#ish

### Gleam

static and strong typing with no nulls and full inference

basically just uses a placeholder as a generic and goes

built on erlang's dynamic system, which is fun

included algebraic types, opaque, types, immutability, etc.

### Haskell

strong static typing with nice churchy definitions as the norm

generics have the cool Ord a placeholder syntax that kinda feels like nothing lol

### Idris

types are a first-class member so you can just fuck all and be a lil bitch to the types like a good lil programmer

oh yeah, haskell basically

oh yeah, full dependent types and quantitative type theory (0 erased, 1 linear, unrestricted many)

### Mercury

also, basically haskell includes aglebraic data types and type classes to fit haskell etc. has the whole determinism thing that can be fun even in the type system

### Ocaml

Ocaml has typing like Kit, or vice versa. It hardly looks like it, but it is ultimately static with Hindley-Milnery type interface

### Kit

Kit features a powerful static type system based on Hindley-Milner type inference. This makes it look and feel quite often exactly like the later languages that feature dynamic type systems in something as small as a max function sample.

Kit has Int, Float, String, Bool, Char

Uses numeric literals, native lists, tuples, record types with row polymorphism, algebraic data types, Refinement types, and linear types

### Julia

Julia has an incredibly interesting type system; values have strong types but variables are dynamic and untyped. Allows multiple dispatch

All types are object types in hierarchy Any ; Union{} ; Abstract types ; Concrete types

Can use like dynamic languages, or specify, including with constraints to specific hierarchy, etc.

### Typescript

compiles to javascript which is funny, but that means type erasure, which isn't exactly unique if you think about it for 2 seconds lmfao

static but structural typing

types are sets ultimately, which is kinda like the ballerina way... because ballerina is wannabe javascript kinda lmfao

## Dynamically Typed Languages

Literally all these are dynamically typed, I'll say anything if there's anything interesting. Python is intentionally becoming interesting. Smalltalk is like the most interesting idk bro

### Smalltalk

Everything is an object, but everything is defined by what it can do instead of its own structure; no declared types on values, just send messages to them Duck typing and Late binding

### Python

generics are entirely just syntax foo on top of a dynamic type system which is hilarious

### Erlang

does have a strong runtime typing, including type declarations and has been built on to outright static typing in gleam lol

### Elixir

enforces soundness and graduality for a set-theoretic foundation, but yeah, it's just dynamic erlang types lmfao

### PHP

Actually has some weird gradual typing, but even looser and weirder than any others lmfao

### I mean, honestly, dynamic languages

Some of the remaining languages are interesting in their own right but their type systems are just basically dynamic for anything to be spoken of at this point, to the point of leaving little more to say...

- Prolog
- Clojure
- Scheme
- Racket (some fun wannabe typing)
- Javascript (JSDoc and weird template based class hierarchy I guess but just weird as shit)
- Icon
- Lua
- Octave (MATLAB)
- Perl
- R
- Ruby
