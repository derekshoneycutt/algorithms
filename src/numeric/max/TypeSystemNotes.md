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

"new" types can be defined based on complex type definitions via typedef.

We get a generic type programming via void* and typedefs.

Integer literals available in modern standards

### Objective-C

Literally the same as C for this use case

### Fortran

### Ada

### Factor

Much higher level, but still have everything in words on the stack. We do have booleans, numbers, and collections including sequences and strings. The main place this comes up in current code is via use of seq and [] quotations.

In factor, all values are objects, but dynamically typed at runtime

Factor has generic words, which are defined specifically for type via GENERIC: and M:.

### Zig

### C++

### C\#

nullable contexts provide strong warnings

### Visual Basic .NET

### F\#

### Dart

### Go

### Rust

### Kotlin

### Java

### Scala

### Haxe

### Swift

### Mojo

### Pascal (FreePascal)

### D

### V

### Nim

### Gleam

### Haskell

### Idris

### Mercury

### Kit

Kit features a powerful static type system based on Hindley-Milner type inference. This makes it look and feel quite often exactly like the later languages that feature dynamic type systems in something as small as a max function sample.

Kit has Int, Float, String, Bool, Char

Uses numeric literals, native lists, tuples, record types with row polymorphism, algebraic data types, Refinement types, and linear types

### Julia

Julia has an incredibly interesting type system; values have strong types but variables are dynamic and untyped. Allows multiple dispatch

All types are object types in hierarchy Any ; Union{} ; Abstract types ; Concrete types

Can use like dynamic languages, or specify, including with constraints to specific hierarchy, etc.

### Typescript

compiles to javascript which is funny

## Dynamically Typed Languages

### Python

generics are entirely just syntax foo on top of a dynamic type system which is hilarious

### Smalltalk

Everything is an object, but everything is defined by what it can do instead of its own structure; no declared types on values, just send messages to them Duck typing and Late binding

### Prolog

### Elixir

### Erlang

### Ocaml

### Clojure

### Scheme

### Racket

### Javascript

### Icon

### Lua

### Octave (MATLAB)

### Perl

### PHP

### R

### Ruby
