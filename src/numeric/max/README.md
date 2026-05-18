# Max (or a first look at type systems)

Given n +int in X[n] find highest value of them.

1. [Initialize.] k <- n - 1; j <- n. m <- X[n].

2. [All tested?] if k <= 0, return m.

3. [Compare.] if X[k] <= m, Go to Step 5.

4. [Change m.] m <- X[k]. j <- k.

5. [Decrease k.] k <- k - 1. Go to Step 2.

## Introduction

Max is hardly a more complicated algorithm than Euclid's GCD, and if I was not looking for
something to talk about, perhaps I could have just wrote a bunch of versions of it, wrote
a quick write up and moved on. Alas, well... That is not what we are up to here. Hello
world and GCD allowed us to explore some pretty basic ideas across the first batches of
languages, and Max can allow us to look further at each language. This time, we are going
to look into the type systems, in particular. Within type systems, arrays, lists, and
similar structures are of interest in the Max algorithm. Additionally, there are some core
interesting points about the Max algorithm not hit by the prior 2 algorithms to look out
for and try to discuss the point of as we hit them, such as the first active use of some
kind of memory management in each language. This will be far more about types than memory,
but there is some interest to both topics in this discussion. The goal of this writing is
to continue the foundational discussion, constructing the language about how I can talk
about these languages, so focusing on the type system and beginning quirks of memory
management and the like is probably more important than the algorithm itself.

At Euclid's GCD, we were at some 55 languages or something. At the writing of this point
in Max, I am at some 76 languages and dialects. This was largley sparked because I kept
running into wanting to add more important language classes. APL, J, and Q'Nial offer an
entire new class of array-oriented programming languages that really are different from
every other class of languages I included. It also feels like cheating to point out Acton
and Pony, in particular, as actor based languages; Erlang family is already often seen as
actor based, and in fact I have actively used them as a bed of exploration of actor based
programming. Nonetheless, it is interesting to add such even more explicitly actor based
programming languages.

The organization of this writing is really based on thinking about the type systems. I was
surprised just how many languages have some kind of generics. Even some of the newer
languages now have generics, despite some initial resistance, and this is important to how
their type systems are seen in this write up. It took effort for these engineers to find
how to include a generic system within their language. Their use of generics offers a
unique look into their type system, here at a point we're still just using mostly integer
types and arrays, at most.

A quick side note is warranted. I am still juggling how formal and maybe even academic of
a voice I want to have in these writeups. This is a fun project for me. Sometimes, trying
to find a more formal, academic voice can be fun to me. But I find that this project, in
particular, requires a deep honesty that I at least want some space to express **me**. I
am leaning into having this mostly in introduction space and otherwise try to find ways to
reduce personal references, down to `I` use. But I also do not really like saying "the
author" and shit. That is annoying, and I would rather just give myself space to talk and
try to find some kind of coherent balance. I do not claim to have a coherent balance yet.
My voice may fluctuate as I search for it in these writeups.

I also want to make a quick note about AI code. Being between jobs in the current market
basically means every other interviewer asking me how I can handle AI code. Some have just
outright declined interest due to not having enough experience, which is kind of absurd as
a very experienced software engineer who knows these things well enough. Ultimately, I
have tried them out. I created a whole little extension for navigating this project, using
these tools. I tried a few other things. Basically, I think the extension included in here
is, at best, a prototype. It probably needs completely rewritten **again** just to be
anywhere near what I would call production code. I'm wholly unimpressed with AI coding
tools and will not be using them in this project beyond that extension and maybe trawling
through compiler source code for that one method I can't find in the docs. It would defy
the point of this project to use AI in the code itself anyway. The code here is pretty
simple. The hard parts are finding the "words" and whatever other BS some of the more
obscure languages call for, and trying to explore things like generics to make a larger
sense of the languages at hand.

Type systems are actually surprisingly difficult. I am well aware. I found myself
studying type theory in lambda calculus based on Alonzo Church's work, into Barendregt
and his students, during my undergrad in mathematics. In order to write this particular
setup, I also spent time reading about the type system in each language. Some of this has
whole academic background in Hindley-Milner type inference and yada yada yada nobody, even
most software engineers, have a single clue who Hindley or Milner are, and most do not
actually give a single horse's ass.

## F*** Type Systems

Type systems are nonsense! Embrace the stack!

...

\*glare\* What?

...

Who needs types?

Who needs *syntax*?

Pfft. Just string functions together and call them "words" like they're special little
boys. Forth, baby, it is all one will ever need.

Does Forth even have a type system under its stack of word-sized cells?

```forth
\ Get the maximum of 2 values
: maxv ( a b -- maxval )
    2dup >
    if
        drop
    else
        nip
    then ;

\ Get the maximum of the next n values on the stack
: maxofn ( x1 .. xn n -- maxval )
    begin
        dup 1 >
    while
        1 - -rot
        maxv swap
    repeat
    drop ;
```

Forth does have a type system. It does have a syntax. But if any language tries to kick
these entire concepts out, it is Forth. It is ultimately functional in a way immediately
both recognizable and entirely incomprehensible to many functional literate programmers.
It basically does have this uniquely functional syntax, and the cells of data ultimately
do carry typed data. But in a way unfamiliar to many engineers who have not experienced it.
People have built entire OOP systems on top of the "lack" of a type system Forth offers.
Which is maybe tantamount to a discussion of what a supposed lack of a type system
actually means to those who use it.

*ANYWAY.* Forth is not the only one to go this way. But at least Joy has... well. Joy has
the **joy** of simple and aggregate types on the stack, and if one squints hard enough,
they can really start to see types.

No. Really. Joy really does have more type. Part of the result is a much clearer concept
of a kind of "subprogram" passed to another operation. In Joy, this is wrapped in square
brackets. For example, a series of three such subprograms can be passed to `ifte` to
perform an if style control flow, the subprograms evaluating the condition and the
then/else cases as appropriate. Joy also gives a really interesting change adding the
`DEFINE` block here, where new words are defined to act on data on the stack. This creates
more structure necessary to the code, more syntax, as well as more types.

```joy
DEFINE
    # Get the maximum value of 2 values
    maxval      ==  [ dupd dup swapd > ]
                    [ pop ]
                    [ popd ]
                    ifte .
```

When it comes to point-free, concatenative programming, there is no reason **not** to
have types. In fact, quite a tour of type systems can be seen just by looking from the
total lack of apparent type and syntax in Forth to the interesting and impossible to read
in between of Joy, to the outright OOP-ready and generics-ready offering of Factor.

A lot of generic solutions to unclear type requirements will show up later in other
languages. Let Factor be the first in this writing, adding to this vague, stack based
typing of Forth and Joy. It allows definition of words that act specifically on values
without the caller necessarily specifying a typed method to do so every time. In type
theory, there are fancy words like `polymorphism` that explain generics. OOP is notorious
for how much polymorphism one can do with objects, but generics provide a good case that
many even very not OOPy languages take advantage of polymorphism. Of course, it is
introduced here without OOP but in a language that does support OOP features, Factor.

```factor
! Maximum of 2 values
GENERIC: mymax ( a b -- maxval )

! Maximum of 2 values
M: integer mymax
    2dup >
    [ drop ]
    [ nip ]
    if ;

! Maximum of a sequence on the stack
GENERIC: maxof ( seq -- maxval )

! Maximum of a sequence on the stack
M: sequence maxof
    dup rest swap first
    [ mymax ] reduce ;
```

Perhaps this is a little bit of whiplash if completely unfamiliar with the stack based
languages following Forth. Maybe it quickly shows obvious, important differences between
each stack based language to a Forth experienced programmer.

This writing starts with these stack languages as a good sample of all that will be seen.
From the almost having to squint to make out a type system of Forth to the OOP ready, with
generics and all type system of Factor, languages have taken a lot of different ideas to
typing data, and not without inspiring one another and mixing paradigms left and right.
This will not be exploring the complex type systems associated with custom data types and
classes and all of that unless it is the idiomatic way to do generics and the like in
the language, which is the case for some. This also will not go deep into floating point
values and some other points that can be interesting in a lot of languages. Factor is
probably a good example of how far this writing will go with type systems.

## Still F*** Type Systems

Yeah yeah, all that OOP stuff is nice, but what if the only thing worth caring about is
the size of the data, instead of its type?!

Brilliant!

If one likes talking like a machine.

Okay, assembly is certainly more human readable than what the machine talks, but alas, it
all still just comes down to data size.

Beginning with MMIXAL, the programmer thinks primarily in terms of `BYTE` (8 bits), `WYDE`
(16 bits), `TETRA` (32 bits), and `OCTA` (64 bits). Working with instructions, there are
specific signed and unsigned instructions for working with negative or non-negative
numbers, respectively. At this point, the code is mostly using registers and stack memory.
All MMIXAL registers are 64 bit `$N` coded, with specific instructions used to move
specific bytes, wydes, etc. into memory spaces. The stack can handle any of these sizes of
data, as the stack in MMIXAL is just space in the virtual memory. The code here just grabs
a location in the virtual memory and grows the stack downward, which is a standard,
idiomatic stack allocation for MMIXAL. This code stores all values in OCTA sized chunks on
this stack.

```Assembly
        LOC	Data_Segment
        GREG	@
sp      GREG    #6000000000000000
n       GREG    0
d1      OCTA    15
d2      OCTA    10
valstr  BYTE    "values: ",10,0
maxstr  BYTE    "max: ",0
endl    BYTE    10,0
argc    IS      $0
argv    IS      $1
tempv   IS      $2
cret    IS      $3
cparm   IS      $4
maxn    IS      $5
prntr   IS      $9
output  IS      $10

        LOC     #100
Main    SUBU    argc,argc,1
        BZ      argc,dVals

# Parse all of the command line arguments to the stack
PArgs   MUL     tempv,argc,8
        ADDU    tempv,tempv,8
        ADDU    argv,argv,tempv

PArgsL  SUBU    argv,argv,8
        LDO     cparm,argv
        PUSHJ   cret,std:strings:StringIsInt
        BZ      cret,0F
        LDO     cparm,argv
        PUSHJ   cret,std:strings:ParseNumber
        STO     cret,sp,0
        SUBU    sp,sp,8
        ADDU    n,n,1
0H      SUBU    argc,argc,1
        PBNZ    argc,PArgsL
```

ARM64 assembly is again the most similar to MMIXAL, both being in the RISC lineage.
However, this assembly starts adding more explicit sections of the code, such as `.data`.
Furthermore, there is some subtle typing within these sections. In `.data`, this code
utilizes `.byte` for byte data and `.asciz` for zero-terminated ASCII data. There is also
`.hword`, `.word`, `.quad`, `.ascii`, and `.zero`, generally referring more to the size
of the data, although it blurs into actual typing with the ascii and asciz, really. In
addition to the `xN` numbered 64-bit registers, there are also `wN` styled 32-bit registers
pointing to the 32-bit lower part of the same memory as the `xN` registers. Actual number
literals are preceded by a `#` which is rather interesting.

Of particular note, ARM64 running on Darwin is the most picky about explicitly aligning
data. It even has the `.align 4` or similar in the assembly code file to build and run
correctly. Ultimately, memory alignment shows up in all the assemblies, although it is
not entirely obvious, especially when working with the native 64-bit sized data. In MMIXAL,
memory is typically addressed by a 64-bit aligned location and an offset to a specific
byte as needed. This alignment can matter in structuring user defined types and the like
in higher languages, but mostly it is a compiler concern for everyone except assembly. In
assembly, it is worth a note as an interesting caveat for dealing with "types", especially
since "types" in assembly are mostly just talking about data sizes. This alignment to,
well, mostly to 64-bits in all the code in this project is probably a larger part of all
assembly code "typing" than most assembly code might suggest to an unknowing reader.

The manipulation of a `sp` stack pointer continues in ARM64, but somewhat different from
the MMIXAL version. Here, the stack is immediately grown by 256 bytes to anticipate the
data that will be stored on it, and then a high register is used to point to where in that
stack space current values should be added or read. This is actually a step back in
memory management from the MMIXAL, but getting comfortable with the stack in the ARM64 and
x86-64 assemblies can be enlightening on how it is used by other languages once compiled.

This use of the stack will be followed again in the x86-64 code, but it is worth noting
that it is not exactly a "good practice" per se. It is explicitly not followed into WASM,
for example, because WASM complains that the stack is not supposed to be used like this.
The choice was made here to use the stack for this algorithm because real memory allocation
algorithms are not the focus yet. Abusing the stack is okay for this basic, educational
level. In real code, programmers will most likely use proper memory allocation for this
as is seen in other languages.

```Assembly
; Get the maximum value of a sequence of numbers.
.align 4

.data
    endl: .byte 10,0
    valuesmsg:
        .asciz "values:"
    maxmsg:
        .asciz "max: "
    default1: .byte 15
    default2: .byte 10

.global main

.text

.extern ParseNumber
.extern PrintString
.extern PrintNumber
.extern StringIsInt

main:
    ; We secure a large stack for use in stack based Max algorithm
    stp x29, x30, [sp, #-256]! 
    mov x29, sp
    add x26, sp, #32

    mov x20, x0
    mov x21, x1

    ; if we have no parameters, use defaults
    cmp x20, #1
    ble .defaultValues

    ; otherwise, we need to parse the parameters
    .parseArgs:
        mov x22, #1
        mov x23, #0

    ; Loop through the arguments and parse them, storing them on the stack
    .parseArgsLoop:
        ldr x25, [x21, x22, lsl #3]

        mov x0, x25
        bl StringIsInt
        cbz x0, .continueArgsLoop
        mov x0, x25
        bl ParseNumber
        str w0, [x26, x23, lsl #2]
        add x23, x23, #1

    .continueArgsLoop:
        add x22, x22, #1
        cmp x22, x20
        blt .parseArgsLoop
```

x86-64 assembly largely has the same data sizes as ARM64, of course. However, the
registers are wildly different. Instead of nicely numbered registers, x86-64 uses 64-bit
registers named such as `rax`, `rcx`, `rdi`, `rsi`, and more. There are also 32-bit,
16-bit, and 8-bit counterpart registers that vary in how obvious they associate to the
same memory space as the 64-bit registers. After a while in this, the registers alone is a
fine reason to prefer the RISC approach.

NASM uses `db`, `dw`, `dd`, `dq` in the data section to specify data size, and sometimes
`byte`, `word`, `dword`, and `qword` make an appearance when retrieving or storing data in
memory. Some instructions have the suffix versioned to specify the exact data size in
question. For example, there is `mov` but also `movsxd` and `movsx` to carefully move
smaller data sizes. The `.bss` section in NASM also has data types of `resb`, `resw`,
`resd`, `resq`, `rest`, `reso`, `resy`, and `resz`. Number literals are just used as
literals in NASM.

GAS assembly still has the same registers, though it requires the preceding `%`, and it
also adds a preceding `$` to number literals. In the data section, GAS offers the `.byte`,
`.short`, `.long`, `.quad`, `.ascii`, `.asciz`, `.float`, and `.double` types. In bss,
it offers `.lcomm`, `.comm`, and `.skip`. Additionally, GAS and the AT&T assembly syntax
generally is well known on x86-64 for adding suffixes to far more instructions than NASM.
For example, `movb`, `movw`, `movl`, `movq`, `movs`, `movt`. Sometimes these can be
implied, but a lot of GAS code does have the explicit suffix, unlike the same NASM.

For x86-64, the `push` and `pop` instructions were used quite extensively in this code.
As above, data was stored on the formal stack, though with less pointer arithmetic for
x86-64, thanks to the dedicated instructions. In GAS, this was used as `pushq` and `popq`.
This does feel relatively pleasant while programming, but it also makes littering the code
with these instructions more tempting than it is to add data to the stack in ARM64.

```Assembly
; NASM
section .rodata
  valuesmsg: db "values:",10,0
  maxmsg: db "max: ",0
  endl: db 10,0
  d1: db 15
  d2: db 10

global main

section .text

extern ParseNumber
extern PrintString
extern PrintNumber
extern StringIsInt

%ifidn __OUTPUT_FORMAT__, win64
    %define param1 rcx
    %define param2 rdx

    %define argc rcx
    %define argv rdx
%else
    %define param1 rdi
    %define param2 rsi

    %define argc rdi
    %define argv rsi
%endif

main:
    %define argvp r10
    %define argp r9
    %define count r8
    push rbp
    mov rbp, rsp

; if we have no parameters, load the default values
    cmp argc, 1
    jle .defaultValues

; if we have arguments, we will loop through, parsing each into an integer value
    .parseArgs:
        mov argvp, 0
        mov count, 0

    .parseArgsLoop:
        add argvp, 8
        mov argp, [argv + argvp]

        push argc
        push argv
        push argvp
        push count
        push argp
        mov param1, argp
        call StringIsInt
        pop param1
        cmp rax, 0
        je .continueSkipping
        call ParseNumber
        pop count
        pop argvp
        pop argv
        pop argc

        push rax
        inc count
        jmp .continueArgsLoop

    .continueSkipping:
        pop count
        pop argvp
        pop argv
        pop argc

    .continueArgsLoop:
        dec argc
        
        cmp argc,1
        jg .parseArgsLoop

        push count
        jmp .print
```

This writeup is not trying to go into all of the technical details about typing data in
assembly. The point of all this is not to just list off how these languages represent data,
but to consider what programmers are saying to each other with this information. Floating
point data was barely even mentioned, but floats can be an interesting topic to "typed"
data in assembly unto itself. Even with what is mentioned, assembly is pretty
straightforward about what is being said. It is almost literally the machine code. And yet
there are some interesting hidden points about the registers being used, and how, and the
use of the stack in this code. x86-64 code required assembler directives to modify when
to use a register ABI expected for Windows vs POSIX (Linux/FreeBSD). The use of simple
macros like `%define` or `.equ` in x86-64 or `IS` in MMIXAL makes this ABI worries easier,
and also makes even the assembly more expressive with named "variables". As the one
language that basically has to use labels and jumps to those labels instead of more
structured programming tactics, this expressiveness can counter the otherwise difficult
moments that working in assembly can bring.

## Types? Why Not Just THE Type?

The remaining languages begin to have something recognizable as a type system to most
programmers once you leave assembly and Forth. A good selection of languages decided to
take on a "Everything is a X" type system. In practice, all of these languages treat data
as more than just the single type, but the "Everything is a..." treatment results in
`shimmering` and other fun words for coercing types into formats that fit the work to
be done with it.

Except for Common Lisp, the Lisps are not included in here with their "Everything is a
list" mentality, as this does not actually apply to the type system as strongly as the
"Everything is a..." version of all the other languages in this section. Even Common Lisp
does not actually make everything a list, technically (everything is an object in
Common Lisp, as will be discussed). However, it is quite easy to see even the source code
in Lisp dialects as lists, and they typically come with list processing features that
can result in some fun metaprogramming as such. This writeup will not go much into this
fact, although it is worth noting as it has some distinct overlap with the languages that
*are* included in this section.

### Prolog

The first of these in this writeup, Prolog has been cited alongside Forth as not really
having a type system. And in some ways, it is true. The nature of this project, in fact,
kind of hides the fact and makes it look like every other dynamically typed functional
language. Really, though, everything is a `term` in Prolog, and because it is a logic
programming language, it simply finds values are equivalent "types" via its unification.
Again, for the code in this project, this is basically meaningless jargon. The result
looks basically the same as other functional languages, just with a kinda oddball syntax.
If you actually use Prolog to express logical statements, this "Everything is a term"
strategy makes a remarkable amount of sense. It is also quite silly everywhere else.

```prolog
/**
 * max_of_list_accum(List, TempMax, Max)
 *
 * Accumulator method to accumulate the maximum from a list
 */
max_of_list_accum([], Max, Max).
max_of_list_accum([H | T], TempMax, Max) :-
    ( H > TempMax ->
        NewMax = H
    ;
        NewMax = TempMax
    ),
    max_of_list_accum(T, NewMax, Max).

/**
 * max_of_list(List, Max)
 *
 * Finds the maximum value in a list
 */
max_of_list([], _) :- !.
max_of_list([H | T], Max) :-
    max_of_list_accum(T, H, Max).
```

### Tcl

When something more meaningful than a `term`, whatever that is, is desired, why not just
make everything a string? The whole source code is a string, so just make everything a
string, and it should be pretty simple, right? Yeah, in fact, this means it is possible to
directly edit the source code with the source code, creating things like self-destructing
functions that can only be called once. And this is exactly what Tcl gives.

Inside the language engine, types are often coerced and stored as numeric values and the
like, but when trying to force it into use as another type, it goes through `shimmering`,
coercing the real value into the new type. This can be slow, so Tcl programmers like to
try to avoid it, resulting in programming in a pretty non-string type-aware style.
Nonetheless, it is ultimately true: everything is a string in Tcl.

This shimmering business is notable not only for the speed of type coercion but also for
any memory aware situations. The memory is all dynamically allocated for the programmer
in Tcl, but it is often stored both as a string and as this other internal representation.
Nobody really cares in a simple sample max show like this, but it goes to show that even
when the memory is managed, sometimes the programmer has to know and track it as they work
inside the code.

```tcl
proc mymax {values} {
    set current 0
    foreach value $values {
        if {[string is integer -strict $value]} {
            if {$value > $current} {
                set current [expr {int($value)}]
            }
        }
    }
    return $current
}

set values $argv
if {$argc < 1} {
    set values {15 10}
}
set max_value [mymax $values]

puts "values: $values\nmax: $max_value"
```

Tcl has been compared to Lisps as strings are basically just lists, and the metaprogramming
enabled by everything being a string and including the source as a modifiable data in that
is quite reminiscent of Lisp with lists. You can also compare it to the array programming
languages.

### When Everything Is Arrays

APL, J, Q'Nial, and even Octave/MATLAB all follow the philosophy of "Everything is an
array" and introduce an entire paradigm of array based programming. Octave was on the
original list, but APL, J, and Q'Nial are new to this project at the time of this writing.
As they provide an entirely different experience of programming than basically every
other language on this list, despite many others taking some inspiration from them, this
expands this language in entirely new directions.

In terms of APL, it's basically unreadable symbols everywhere and good luck. For the math
oriented who also like random symbols everywhere, APL can be really nice. For everyone
else... well...

```APL
⍝ Finds the maximum in a set of numbers and prints it to the screen

⍝ Get all command line args as nums via execute or 15 10
cmd_args ← 1 ↓ 2⎕NQ '.' 'GetCommandLineArgs'
args ← ⍎¨ '15' '10' {0=≢⍵: ⍺ ⋄ ⍵} cmd_args

⍝ just use APL's max
max_val ← ⌈/ args
⎕ ← 'values: ', args, ⎕UCS 10
⎕ ← 'max: ', max_val, ⎕UCS 10

)OFF
```

The 1960s could not predict that a special keyboard layout for programming might
not be that popular, let alone trying to memorize a list of little symbols. But the guy
who invented it won a Turing award for it, and especially for matrix heavy math work, it
continues to be quite popular with some who enjoy the terse symbolics over long expressive
words. It is somewhat interesting, in fact, that some languages that have historically
been mocked for needing so much boilerplate text just to get anywhere have increasingly
taken to more terse syntaxes. The world may yet see more languages taking bits from APL
in the future.

Or perhaps they will look more to the likes of J that replace all those crazy symbols with
basic ASCII equivalences. The use of `.` in J, for example, brings to mind some other
languages that use a `.` to distribute some function over an array.

Compared to APL, J is just completely readable.

```J
NB. Get the maximum value of a set of values

3 : 0 ''

user_args =: 2 }. ARGV
if. 0 = # user_args do.
    args =: 15 10
else.
    args =: > ". each user_args
end.

maxv =: >./ args

echo 'values: ', ": args
echo 'max: ', ": maxv

)
exit 0
```

And Q'Nial. Well, it looks like many non-array languages at this simple stage. It does not
have a good means for command line arguments, however, since the code is just fed into
the interactive interpreter. Q'Nial is remarkable in this way in that it focuses on the
interactive environment to the detriment of other ways of programming with it, and thus
there is no real way to do e.g. command line arguments. It still remains extremely useful
in data analysis, academic study, and that kind of thing. REPLs aren't so bad.

```nial
A := [23, 43, 86, 34, 20, 58];
write (['values: '] link A)
write ('max: ' link string (max A))

bye
```

Finally, there is Octave/MATLAB. This project sticks to Octave, but the language is
basically the same. It *actually* just looks like another programming language. Yet it
is pretty decidedly an array programming language, and it can show up. A custom `max`
function was skipped in the prior array language examples because it is somewhat useful
to actually explore how these languages do these mathematical functions. In Octave, a
custom `max` implementation is provided mostly just because it still looks like other
languages.

```matlab
% Finds the max of the values passed
function output = max_of(values)
    current = 0;
    for value = values
        if value > current
            current = value;
        end
    end
    output = current;
end
```

Perhaps a benefit on the memory side for array based programming languages is that the
memory allocation is probably well optimized for the programmer when they are doing things
involving math over arrays. But these are all dynamically allocated for the programmer.

### Or Vectors? R

Moving on from array programming languages, R is worth a particular notice as making
everything a vector instead. R can, in fact, be classed right with Octave/MATLAB into the
array programming world under many applications, and it has a kind of weird syntax using
a `<-` for assignment. It is quite common to see piping used in R with operators such `|>`
to send data forward to methods in a more point-free style, instead of nesting calls. Like
Octave, it does look an awful lot more like other programming languages, instead of like
APL or J. Like all the array programming languages, it is popular in data analysis spaces.

```R
max_list <- function(list) {
  current <- 0
  for (value in list) {
    if (value > current) {
      current <- value
    }
  }
  current
}

uselist <- list(15, 10)
args <- commandArgs(trailingOnly = TRUE)
if (length(args) > 0) {
  uselist <- as.list(as.integer(args))
}
```

### The World As Objects

Then came object oriented programming, and some went as far as making everything an
object. A lot of OOP languages did not take this route, and their type systems will be
seen a bit later. For those languages who *did* take the "Everything is an object"
approach, there are a surprising number of variations.

The Common Lisp Object System effectively makes nearly everything in Common Lisp an object.
There is a "top" type, `T`, that encompasses all objects, and a bottom type `Nil` that is
the empty set of objects. This is somewhat remarkable because 3 other Lisp dialects are
included in this project, none of which follow this philosophy. Yet their code remains
almost identical with only a few slight tweaks. There is a great deal to write about the
CLOS, but there is not much to it as far as this project goes at this point. Ultimately,
it also follows the philosophy that values have types but variables do not, resulting in a
look and feel basically alike many dynamic languages.

```lisp
; Find the maximum value in a list
(defun mymax (values)
    (reduce (lambda (curr next)
            (if (> next curr)
                next
                curr))
           values))
```

Still largely within the functional family, Scala also extends the "Everything is an
object" philosophy. This is also somewhat remarkable as Scala runs on the JVM, but even
Java does not follow this philosophy. Like Common Lisp, Scala has a top type, `Any`, and
a bottom type `Nothing` (also `Null` for reference types). Strong type inference can make
it feel quite dynamic, and it uses square brackets to implement genericity, making the
whole thing feel even more dynamic. Ultimately, it is a static typed language, however.

In this sample, the static nature of Scala became somewhat ugly. Although able to constrain
the generic type to an `Ordering`, Scala still requires an implicit cast to `Ordering[T]`
and calling `gt` instead of just using the `>` operator. Scala is far from the only one
who falls into this kind of ugly pattern in generics, which suggests it is not the
easiest problem for the language designers and compiler writers to solve.

```scala
def max_list[T: Ordering](list: List[T]): Option[T] =
  @tailrec
  def reduce_max(list: List[T], prior: T): T =
    list match {
      case Nil => prior
      case head :: tail =>
          reduce_max(tail,
            if (implicitly[Ordering[T]].gt(head, prior)) then
              head
            else prior)
    }

  list match
    case Nil => None
    case head :: tail => Some(reduce_max(tail, head))
```

Still deeply related to Java, Kotlin's type system looks remarkably similar to Scala's,
and openly did learn from it, wanting to improve on parts of Scala, even. It is an option
to use the `tailrec` keyword in Kotlin to have very similar looking code to Scala as well,
but this project stuck with a procedural take on Kotlin for Max, basically arbitrarily.
Scala can do procedural as well. Anyway, Kotlin has a top `Any?` type encompassing all
object types, and a bottom `Nothing`. The null safety with the `?` operator on the type
is quite nice. Concerns about null safety could have a much larger impact on this writing
than it does, as nullability is quite an interesting concern for some languages. Here,
Kotlin allows null values with the use of `?`, but otherwise constrains against it. It
turns out that guaranteeing non-null saves a wild amount of runtime problems, all the way
back at compile time.

Kotlin also offers a generic capabilities and type inference that makes programming feel
far more dynamic. The constraints are basically comparable to Scala, but by constraining
to `Comparable<T>`, Kotlin actually allows the use of the `>` operator for much nicer
looking code.

```kotlin
fun <T : Comparable<T>> max(values: List<T>): T {
    var current = values[0]
    for (test in values) {
        if (test > current) {
            current = test
        }
    }
    return current
}
```

Dart offers the same kind of null safety as Kotlin, but it goes to the old hierarchy style
of objects to make everything an object. Basically, `Object` is the base class that every
other class inherits. Dart likes to talk about soundness, wherein the language uses both
static and runtime analysis to ensure that types are **always** the type that the
programmer should think they are. This soundness is somewhat more important to the Dart
documentation writers than the fact that everything is an object, and maybe they are right
to do so. Pointed largely to web and mobile applications, soundness is kind of a big deal
there more than the technical type system details.

```dart
T max<T extends num>(List<T> values) {
    T current = values[0];
    for (var value in values) {
        if (value > current) {
            current = value;
        }
    }
    return current;
}
```

Sticking to languages who are making a big deal about null safety, modern Eiffel Studio
will go as far as allowing the programmer to code such that there is a guarantee at
compile time that null, or `void` as it is called in Eiffel, will never be hit. This is
done by making `attached` and `detachable` types, only the latter allowed to be void. The
compiler can then use this to statically guarantee a void reference is never hit. This
really is just the same as nullable vs non-nullable with the `?` in other types, but
since Eiffel likes to make its own language for things, well...

Eiffel also does pretty simple memory, although there is an explict use of a Linked List
in this code. Many languages just use a generic `list` or `array`, the former not entirely
uncommonly being implemented as linked lists. Eiffel makes this explicit.

Eiffel does have genericity, but only on entire classes. As a class must be in its own
file in Eiffel, all of the sudden Eiffel has 3 code files in this algorithm. Nonetheless,
it also introduces `across` loops, which is a fun take on for loops. It also continues
going with the oddly pleasant looking code, generally. Just one more file to get
genericity is actually far from the worst, as will be seen later with another language.
However, it is surprisingly unique that Eiffel requires genericity on an entire class.
The same constraint is not present in any other language in this project.

```eiffel
note
	description: "Find the maximum value from a given set of values"
	date: "$Date$"
	revision: "$Revision$"

class
	MAXIMUM [T -> COMPARABLE]

feature -- The Max algorithm
    max (values: LINKED_LIST [T]): T
        local
            c: T
        do
            c := values.first
            across
                values as value
            loop
                if value > c then
                    c := value
                end
            end
            Result := c
        end

end
```

Python also treats everything like an object. Which feels amazingly cheap to say, because
it certainly never comes up in the classes that try to teach Python to math students.

Asking someone who has been programming since they were 8 or 10 or whatever to not have
complaints about a programming education meant for non-CS students probably has a
predictable outcome of... many complaints.

Python is pretty commonly known as a dynamic language, though it does have strong typing
of values, each value implementing some class on top of `object`. Duck typing allows some
polymorphism just because "it looks like a duck, walks like a duck, quacks like a duck".
There **are** increasing efforts to add gradual typing into Python as well, which has led
to a kind of genericity possible in Python as well.

Ruby is extremely similar, even recently adding gradual typing to its historically dynamic
type system where everything is an object. It also has the duck typing. Ruby does **not**
have the generic feature, technically, though RBS files and Sorbet can add something like
it for those who want.

```python
# python
def max_list[T](inlist: list[T]) -> T:
    current = 0
    for value in inlist:
        if value > current:
            current = value
    return current
```

Smalltalk actually looks somewhat familiar after Python. Everything is an object, the type
of objects is discovered at the last moment in run time, and duck typing is basically the
norm. Objects do not have methods in Smalltalk, but everything is implemented as a message
on some object instead. Even loops and if statements are messages in Smalltalk. This
project took almost immediately to extending objects with new messages, such that GCD
became a new message on Integer, and Max now becomes a new message for Array.

Self is an entirely new language to this project with this step. The Self designers
apparently thought that Smalltalk was not Smalltalk enough and extended it.

The distinction between a class and an object in Self gets obliterated by its prototype
based objects. Everything is an object, and new classes are made by making a new copy of
an object and modifying its slots. Objects contain these slots where messages are sent to,
and they can be added and removed. One of these slots is the parent slot, which serves a
kind of inheritance that will be familiar to some long time javascript developers. By
getting the trait to a type, a slot can be added with new message responses. Just changing
the parent property changes the inheritance of the entire object/class.

Every object in Self has properties of data, and it also has a section of code. This is
weird, but kind of cool.

Getting Self running involves setting up an entire world on the VM and loading that world
before loading your code. The code is then JIT compiled. In fact, JIT compiling was
somewhat pioneered in the Self VM, along with similar mapping techniques used in modern
javascript interpreters, and work on reflection to view over types, etc. of running code.

```self
traits list _AddSlots: (|
    " Find the maximum value from the list "
    max = (
        | curr. |
        curr: 0.
        self do: [|:each| 
            (each > curr) ifTrue: [
                curr: each.
            ].
        ].
        curr
    ).
|).

[|
    argv. argc.
    values. parsed. maxValue. valuesText.
|
    argv: _CommandLine.
    argc: argv size.
    values: list copyRemoveAll.

    " Attempt to use the command line arguments if they are available, or use 15, 10 "
    argv do: [|:arg|
        parsed: arg asIntegerIfFail: [nil].
        parsed != nil ifTrue: [
            values addLast: parsed.
        ].
    ].
    values isEmpty ifTrue: [
        values addLast: 15.
        values addLast: 10.
    ].

    maxValue: values max.

    stdout write: ('values: ', values statePrintString, '\nmax: ', maxValue asString, '\n').
] value.
```

Io is another new language for this project at time of this writing, and it is a
remarkable language in some ways. It centers coroutines in a clean actor model, which
is different from the host of attempted threads, tasks, greenthreads, etc. that most go
to when it comes to the actor model. This has not really been explored just up to Max in
this project yet, but the language also just has a unique syntax. It takes largely from
Self for the everything as a prototype-based object approach to the type system, including
treating everything as a message. Io takes the messages a little further to the point of
a lisp-y "code is a runtime-inspectable message tree" approach as well.

```io
mymax := method(inlist,
    curr := 0
    inlist foreach(value,
        if(value > curr, curr := value)
    )
    curr
)

values := if(System args size > 1,
    System args slice(1) map(asNumber),
    list(22, 53, 64, 23, 45))

maxvalue := mymax(values)
(values .. "\nmax: " .. maxvalue) println
```

Raku, yet another new language for this project, is basically Perl. It was Perl 6 before
they renamed it to Raku and gave it a colorful butterfly mascot. Unlike Perl, Raku treats
everything as an object and has a pretty interesting gradual type system. Everything
inherits `Mu` and `Any`. There are "native types" available, though they're typically
boxed into objects as well when used. Programmers can add roles and classes to extend the
basic types provided. Ultimately, it looks moreorless like Perl in the end anyway.

```raku
# Find the max from the given list
sub mymax(@list) {
    my $current = @list[0];
    for @list -> $value {
        if $value > $current {
            $current = $value;
        }
    }
    return $current;
}
```

## Static Types Without Genericity

Speaking of Perl, most people think of Perl as a dynamic type system, but in fact, it can
be understood as a static typed language with just really weird types. In this view, both
types and their containers are strongly typed in Perl. The primary types of interest in
Perl are Scalar, Array, Hashes, Subs, and Globs. There is no generics. There is just
using the right `$`, `@`, `%` before your identifier.

Maybe that makes Perl a good introduction to the basic statically typed languages that do
not offer any real kind of genericity. Technically, there is some genericity in at least
two of the languages included here, given that C is included in the genericity entirely
because of using void pointers. That said, trying to do generics in these languages would
be even more of a stretch than C, and that seems to be about where the line for this
writeup is drawn.

WASM and LLVM IR are, somewhat unsurprisingly, about the same as far as typing goes. The
use of `i32` and some `i64` is basically the standard throughout these two languages in
this project. LLVM IR has explicit alignment all over the place, with this project using
`align 4` everywhere, same as it does for the ARM64 assembly.

WASM pushes the array of data to find the max of directly to addresses on the memory page.
This is immediately somewhat easy just because this project did not go a route supporting
command line arguments into the WASM, but WASM's structure also just makes this fairly
easy due to the known memory structure and all that jazz.

```wasm
    i32.const 32  i32.const 15  i32.store
    i32.const 36  i32.const 10  i32.store
    i32.const 40  i32.const 56  i32.store
    i32.const 44  i32.const 35  i32.store
    i32.const 48  i32.const 86  i32.store
    i32.const 52  i32.const 72  i32.store
    i32.const 56  i32.const 25  i32.store
    i32.const 60  i32.const 49  i32.store
```

LLVM IR sits at a similar low level as WASM, but due to compiling to native code, there is
some actual calls to allocate the array in memory for the values that will be used to find
the maximum. This is something not even done for the assembly, really, at this stage yet.
The other languages basically all handle this allocation for the programmer, including
WASM (except for C, predictably and notoriously). This makes LLVM IR a uniquely
interesting example when it comes to this project at this stage.

```llvm
    %arg_count = sub i32 %argc, 1
    %alloc_count = call i32 @llvm.smax.i32(i32 %arg_count, i32 2)
    %alloc_count_i64 = sext i32 %alloc_count to i64
    %values = alloca i32, i64 %alloc_count_i64, align 4
```

The remaining languages in this space are all pretty similar in terms of being strong,
statically typed languages. The most interesting thing about FreeBASIC is the `ReDim`
keyword used to re-allocate dynamic arrays. Simula just looks like a really old version
of some of the other ALGOL-lineage that lacks generics and command line argument handling.
Of course Simula actually has classes with inheritance and everything, but this is not
well beyond any use for a Max implementation.

Ballerina is somewhat interesting, as it is a strongly, statically typed language rooted
in a set-theoretic foundation. Union types can be used to create a kind of genericity,
although it is not quite the same in multiple ways, requiring a cast to a real type to
utilize. There is some structural polymorphism even without union types, thanks to the
data centric view that Ballerina bakes in all the way down to the type system, but this
does not really show up in a demonstrable way in a Max algorithm

```ballerina
type Number int|float|decimal;

function max(Number... values) returns Number {
    Number current = 0;
    foreach Number value in values {
        if <decimal>value > <decimal>current {
            current = value;
        }
    }
    return current;
}
```

Kit is also worth talking about as a strongly, statically typed language. However, it
relies heavily on that Hindley-Milner type inference stuff to the point that no type
annotations are necessary for generic behaviors. This is technically true of OCaml, for
example, but OCaml also offers generic type annotations as well. Ultimately, Kit fits into
this space just not having generics, even if the inference is strong.

```kit
mymax-accum = fn(list, max) =>
    match list
    | [] -> max
    | [x | xs] -> mymax-accum(xs, if x > max then x else max)

mymax = fn(list) =>
    match list
    | [] -> 0
    | [x | xs] -> mymax-accum(xs, x)
```

Oberon is the final language to speak of in this space. This was built on Modula-2, so it
has a strong, static typing checked at compile time. Oberon tended to keep a lot of things
quite simple, but it did add type extension, allowing some subtyping and polymorphism.
This does not fit into just the Max algoritm, so the most interesting thing about it is
not really used here. The Module system is actively used by creating a StringUtils module
to parse out integers and putting it in a separate file. Being a Modula-2 lineage language
makes this at least interesting, even if Oberon is otherwise pretty simple.

```oberon
IMPORT Args, Out, StringUtils;

TYPE IntArrayPtr = POINTER TO ARRAY OF INTEGER;

VAR
    values: IntArrayPtr;
    i, max, n: INTEGER;
    arg : ARRAY 22 OF CHAR;

(* Gets the maximum value of some sequence of integers *)
PROCEDURE Max(count: INTEGER; VAR values: IntArrayPtr) : INTEGER;
    VAR
        current, i : INTEGER;
    BEGIN
        current := 0;
        FOR i := 0 TO count - 1 DO
            IF values[i] > current THEN
                current := values[i];
            END;
        END;
        RETURN current;
    END Max;
```

## Static Types With Genericity

Speaking of using modules, modules is how Modula-3 does generics. Possibly the worst
introduction to a section dedicated to generics.

Before getting into Modula-3 and the off the rails approaches to genericity along with it,
it is worth a discussion on where this whole idea came from. ML introduced some form of
genericity in 1973 in the form of `parametric polymorphism`, and it has followed this form
into Scala, Julia, Haskell, and so on. Ada gave a familiar form in the name `generic` in
1977, and C++ brought templates in the last 1980s/early 1990s. For some of who grew up
on this front, C++ templates were the first foray into generic programming, if only
because it was the popular language with it at first. Some languages actually compile
entirely new versions of the generic code for each type that uses it, while others do some
kind of type erasure to run the same code for different types. Ultimately, this has been
such a successful idea, more languages support some kind of generic programming than not.

### Genericity Off The Rails

Modula-3 took creating 6 additional files to create a generic Max function, including
interfaces and their implementations for integer operations, the generic module, and the
integer implementation of the generic module. If there is one single abomination among the
languages when it comes to interfaces and generics, it might be Moduula-3.

Modula-3 has an incredibly involved type system, building off of Modula-2's strict type
system, similar to Oberon, but adding an incredible amount from several other languages
they could think of to look at. It begins to feel like a bit of a grab-bag of ideas even
just reading [the papers on it](http://lucacardelli.name/papers/modula3typesystem.a4.pdf).
There are objects in Modula-3, but not everything is an object. The objects are basically
borrowed from Simula, though they are not even used in this project yet.

```modula
(* Max.ig file *)
GENERIC INTERFACE Max(Ops);

   (* Type definition for value type being operated on to find the maximum value *)
TYPE
  Array = REF ARRAY OF Ops.T;

   (* Compute the maximum value of a sequence of values *)
PROCEDURE Compute(values: Array): Ops.T;

END Max.

(* Max.mg file *)
GENERIC MODULE Max(Ops);

   (* Compute the maximum value of a sequence of values using the Ops.Compare procedure *)
PROCEDURE Compute(values: Array): Ops.T =
  VAR current: Ops.T; i: INTEGER;
  BEGIN
    current := values[0];
    FOR i := 1 TO LAST(values^) DO
      IF Ops.Compare(values[i], current) > 0 THEN
        current := values[i];
      END;
    END;
    RETURN current;
  END Compute;

BEGIN
END Max.

(* IntOps.i3 file *)
INTERFACE IntOps;

   (* Type definition for integer values *)
TYPE T = INTEGER;

   (* Procedure to compare two integer values *)
PROCEDURE Compare(a, b: T): INTEGER;

END IntOps.

(* IntOps.m3 file *)
MODULE IntOps;

   (* Procedure to compare two integer values *)
PROCEDURE Compare(a, b: T): INTEGER =
  BEGIN
    RETURN a - b;
  END Compare;

BEGIN
END IntOps.

(* IntMax.i3 *)
INTERFACE IntMax = Max(IntOps)
END IntMax.

(* IntMax.m3 *)
MODULE IntMax = Max(IntOps)
END IntMax.

(* max.m3 *)
MODULE Main EXPORTS Main;
IMPORT IntMax;

   (*  ...  *)
max := IntMax.Compute(values);
   (*  ...  *)
```

Some people might have some feelings about just throwing C into this list of generics
supporting languages, but with void pointers, technically, there is a type of genericity
at least easily simulated in C. This basically immediately makes the same possible in
Objective-C and C++, for example, though C++ has a whole other way of doing it, too. C and
Objective-C are done basically the same for this Max implementation. Interestingly, this
is basically just a form of type erasure solution to the problem.

Of course, C's type system is pretty basic, with some nuances about what the exact size of
`int` is when you're developing for what machine or whatever. It has structs and pointers
and all that fun stuff that can make it powerfully enough for basically almost every task,
if you are willing to put in the work on it.

Using typedefs, the genericity of C honestly looks pretty much the same as genericity in
some other languages. There is just blatant pointer math used in order to pull it off, but
it is easy enough to understand and not screw up, and some of the other languages just
hide this pointer math behind nicer constructs anyway.

```c
typedef void* value_t;
typedef int (*cmp_func)(const value_t, const value_t);
typedef int* intvalue_t;

value_t max(const value_t values, const size_t n, const size_t size, const cmp_func cmp)
{
    value_t current = (value_t)values;
    for (size_t i = 1; i < n; ++i)
    {
        value_t element = (value_t)((char*)values + i * size);
        if (cmp(element, current) > 0)
        {
            current = element;
        }
    }
    return current;
}

int cmp_int(const value_t a, const value_t b)
{
    // those are ints, right? right...
    int int_a = *(intvalue_t)a;
    int int_b = *(intvalue_t)b;
    return int_a - int_b;
}

// ...
int pmax = *(intvalue_t)max(values, n, sizeof(int), cmp_int);
```

In both C and Objective-C, `malloc` is used with subsequent `free` calls for allocating
memory. For something like this simple max algorithm, that is perfectly fine. Probably a
little bit better than the stack hacking used in the assembly. The whole array is
allocated all at once, which is at least a good practice. Modern languages like to offer
allocator types and give finer control. Some kind of allocator is often built on top of
the C memory handlers for different purposes in C programming, such as a basic arena
allocator when it fits the purpose well. A single raw malloc never hurt anyone, though.

> *the faint sound of screaming from the halls of programmers lost to memory leaks echos across the internet*

```c
int* values;
values = (int*)malloc(sizeof(int) * argc - 1);
for (int i = 0; i < argc - 1; ++i)
{
    values[i] = atoi(argv[i + 1]);
}
n = argc - 1;
// ...
free(values);
```

Since I pass by Objective-C so quickly, it is worth noting that at least Objective-C
brings in Smalltalk inspired classes with messages instead of methods and all. Some have
enjoyed that experience, and some people find it entirely odd. The whole Smalltalk-like
thing is not used in this project for something as simple as the max algorithm, just
sticking to plain old C style code mostly. Perhaps there will be more room to explore that
side of Objective-C later.

### Well, Not C Any More

C++ is not C here. For many, the template style generics were a first exposure to generic
programming, in its sometimes best but certainly sometimes worst form. A lot of templated
C++ code ends up bulking up header files that get compiled in and re-compiled and
re-compiled and re-compiled and re-compiled and re-compiled, all in the midst of an
already slow compilation pulling in every referenced file under the sun.

On a positive note, C++ just uses a `std::vector<int>` to let the memory be managed by the
standard library on this one. Again, however, many C++ engineers also just write their own
allocators, similar to C, and this can often be more performant and less problematic than
the standard things. For simple samples like this project is making at this stage, the
automatic memory of the standard library is fine.

The use of `std::input_iterator` in the template on C++ here is quite ugly relative to...
well... every other language. In some ways, this feels like a step back for readability,
and kind of an abomination. C++'s entire OOP type system gets to feel incredibly like this
after just a short use. While being extremely influential on many, it kind of permanently
carries the weight of trying to be everything without just doing anything simple. But at
least the iterator dereferencing--which does not feel or look any different than pointer
dereferencing at the end of the day--allows the use of the `>` operator naturally. It
mostly just feels like explicit wrapping of C's pointer style while still having the
pointer styling in all but the need for typedefs and explicit custom functions--although
some people have programmed in C++ long enough to have regular nightmares about operator
overloading, too.

```c++
template<typename T, std::input_iterator iter>
T max(iter begin, iter end)
{
    T current = 0;
    for (iter it = begin; it != end; ++it)
    {
        if (*it > current)
        {
            current = *it;
        }
    }
    return current;
}
```

Ada being the one often crowned as making generics popular also stands as one of the
immediately most verbose and also most immediately powerful of all the takes on generics.
At first, it can seem a little exhaustive in today's age of languages constantly using
just some kind of bracket around a type to use generics. It does not have all the baggage
of modules that made Modula-3 so verbose, and yet there is a sense of needing to put that
much information still into the code to make it work. The upside of the verbosity when it
comes to Ada, however, is that the generic function actually still looks just like a
normal function, and it is easy to trace how the language, compiler, and any future user
of the code should understand the generic typing. This just specifies that that the `>`
function has to be appropriate on the generic type and then uses `>` like normal on it.
There is a beauty to that which many other languages here just failed at.

Otherwise, Ada is not particularly noteworthy. It has the standard static typing with the
usual types. Aside from the generics nothing fancy is being done just to get max out in
this project. Arrays are defined as a custom type, which is a bit weird but not really
specific to Ada. The same pattern was seen with Oberon, for example. It is a concept that
has not aged well into this project, frankly. At least allocating the arrays are quite
easy in Ada with the `new` keyword and the rest garbage collected.

```ada
procedure Max is
   type Integer_Array is array (Positive range <>) of Integer;

   -- We create a generic max method that takes in moreorless any compatible type to the int array
   generic
      type Element_Type is private;
      type Index_Type is (<>);
      type Array_Type is array (Index_Type range <>) of Element_Type;
      with function ">"(Left, Right : Element_Type) return Boolean is <>;
   function max_generic(X : Array_Type) return Element_Type;

   -- Choose the maximum value out of the array
   function max_generic(X : Array_Type) return Element_Type is
      current : Element_Type := X(X'First);
   begin
      for V in X'Range loop
         if X(V) > current then
            current := X(V);
         end if;
      end loop;

      return current;
   end max_generic;

   -- Instantiate the max function on the standard integer array
   function max is new max_generic(
      Element_Type => Integer,
      Index_Type => Positive,
      Array_Type => Integer_Array
   );

   Arg_Count : Integer := Ada.Command_Line.Argument_Count;
   Arg_Array : access Integer_Array;
   MaxValue : Integer;
begin
   if Arg_Count = 0 then
      Arg_Count := 2;
      Arg_Array := new Integer_Array(1 .. 2);
      Arg_Array(1) := 15;
      Arg_Array(2) := 10;
   else
      -- Why try to parse all available command line arguments as numbers
      Arg_Array := new Integer_Array(1 .. Arg_Count);

      for index in 1 .. Arg_Count loop
         Arg_Array(index) := Integer'Value(Ada.Command_Line.Argument(index));
      end loop;
   end if;

   MaxValue := max(Arg_Array.all);

   Ada.Text_IO.Put_Line("values:");
   for index in Arg_Array'Range loop
      Ada.Text_IO.Put_Line(Integer'Image(Arg_Array(index)));
   end loop;
   Ada.Text_IO.Put_Line("max: " & Integer'Image(MaxValue));
end Max;
```

Fortran has a long history. At one point the first letter of a variable's name defined the
type that it was. Now, add `implicit none` to the top of a module and it looks a lot like
it could fit in with some other family as well. Initially, there was no real way to generic
functions in Fortran, but some time around 1990, a really exhaustive form requiring the
programmer to actually program each implementation type was added in. Since then, Fortran
has added OOP features and continues to grow on its generics, receiving a newer generics
feature in 2023, centuries after Fortran hit the scene in the year 1569 (okay, it was only
1956). This project uses the old generic style still.

Fortran is interesting about allocating the array used in Max, using the `allocatable`
keyword at the variable definition and then using `allocate` to actually allocate the
memory for further use. `deallocate` is then called at the end to free the memory.

```fortran
module generic_max
    ! Module defines the generic max_list method
    ! Only implementation we have today is integer, but we can add more
    implicit none
    interface max_list
        module procedure max_list_int
    end interface
contains
    function max_list_int(array) result(maxValue)
        integer, dimension(:), intent(in) :: array
        integer :: maxValue, index

        maxValue = 0
        do index = 1, size(array)
            if (array(index) > maxValue) then
                maxValue = array(index)
            end if
        end do
    end function
end module generic_max

program MaxValues
    ! Get command line arguments into a list (or 15, 10) and use the generic max function
    use generic_max
    implicit none

    integer, allocatable, dimension(:) :: list
    integer :: stat, maxValue, i, num_args
    character(len=100) :: buffer

    ! We allocate an array of integers based on arg list and use that, or default
    num_args = command_argument_count()
    if (num_args > 0) then
        allocate(list(1:num_args), stat=stat)
        do i = 1, num_args
            call get_command_argument(i, buffer)
            read(buffer, *) list(i)
        end do
    else
        allocate(list(1:2), stat=stat)
        list(1) = 15
        list(2) = 10
    end if

    maxValue = max_list(list)
    print *, "values:"
    print *, (list(i), i = 1, size(list))
    print '("max: ", I0)', maxValue

    deallocate(list, stat=stat)
end program MaxValues
```

Pascal and Fortran look quite alike. Pascal also did not come with generics, among many
other features it grew with time. FreePascal's implementation of generics looks a great
deal closer to the minimal version of generics of many other languages, just wrapping the
type in `<T>`. However, there is still also a `generic` keyword. Ultimately, Pascal's
type system is still quite simple with moreorless standard static types. The use of
integer values for basically everything at this point in the project simplifies it, but
even the arrays are simple in Pascal, forgoing anything significantly interesting.
`SetLength` grows the array to the size wanted and then the elements are inserted in index.

```pascal
generic function max<T>(values : array of T) : T;
    var
        current : T;
        i : integer;
begin
    current := values[0];
    for i := Low(values) to High(values) do begin
        if values[i] > current then begin
            current := values[i];
        end;
    end;
    Result := current;
end;
```

Zig has an amazingly simple take on generics by just using parameters marked as `comptime`.
This is not a particularly bad solution, and it ends up looking quite elegant. Many things
about Zig look quite elegant once the allocator becomes more than just an annoying bulk to
the code. The allocator is directly used to grow the list of values for max and then free
it via a `defer` statement.

Zig also offers optional types, keeping null values only to those marked with the familiar
`?` prior to the typename, `?T`. A similar syntax with `!` is used to mark possible error
returns, replacing exceptions from other languages. Zig does not have all the OOP baggage
of C++ but gets by with a pretty modern syntax with just structs and the like.

```zig
fn max(comptime T: type, values: std.ArrayList(T)) T {
    var current: T = values.items[0];
    for (values.items) |value| {
        if (value > current) {
            current = value;
        }
    }
    return current;
}

pub fn main(init: std.process.Init) !void {
    var gpa = std.heap.DebugAllocator(.{}){};
    const allocator = gpa.allocator();
    defer _ = gpa.deinit();

    var args = try init.minimal.args.iterateAllocator(allocator);
    defer args.deinit();
    _ = args.next();

    var values: std.ArrayList(i32) = .empty;
    defer values.deinit(allocator);

    var arg_len: i32 = 0;
    while (args.next()) |arg| {
        arg_len += 1;
        const t = std.fmt.parseInt(i32, arg, 10) catch 0;
        try values.append(allocator, t);
    }
    if (arg_len < 1) {
        try values.append(allocator, 15);
        try values.append(allocator, 10);
    }

    const maximum = max(i32, values);

    std.debug.print("values: {any}\nmax: {}\n", 
        .{ values.items, maximum });
}
```

Odin is another new langauge to this project at this point. It has a C style static type
system with some strong hints towards Pascal. There are several things that make life a
bit easier in it. Although this project has no major use of floating point numbers and
other types worth extending to advanced types, Odin provides quite a tools, including
types, to help with some advanced more mathy works. The generics are some of the easiest
to use, fitting into the whole `parametric polymorphism` stuff in discussion on the
language site. It adds a `$` before the generic type. This can be extended to both structs
and procedures, and since Odin does not have classes, that is well enough. Odin does allow
the programmer to define a new distinct type based on an existing type, and marking it
distinct such that its values are not allowed to cross, even with the original type and
others made from it. This allows the same internal values to be represented as different,
distinct types in the code.

Odin uses manual memory management. Fortunately, for arrays, this is just simple in Odin.
The `defer` keyword, like Zig, makes programming quite pleasant. Sometimes, these kinds of
`defer` break up the linearity of code, which is perhaps a significant downside to the
concept, depending on how one feels about code being easy to read linearly vs data centric.

```odin
max :: proc(values: []$T) -> T {
    current := values[0]
    for i in 0..<len(values) {
        if values[i] > current {
            current = values[i]
        }
    }
    return current
}

// The main entry point to the application
main :: proc() {
    args: [dynamic]int
    defer delete(args)
    
    for i in 1..<len(os.args) {
        val, ok := strconv.parse_int(os.args[i]);
        if ok {
            append(&args, val)
        }
    }
    if (len(os.args) < 2) {
        append(&args, 15, 10)
    }
    maxvalue := max(args[:])

    fmt.println(args, "\ngcd: ", maxvalue)
}
```

The remaining languages in this category are Rust, D, and C3. C3 is a new one for this.
All three get placed quite often in a kind of "successor to C/C++" kind of space, although
they do have significant differences.

D is unapologetically OOP and kind of comes with the kitchen sink. It was not even
originally named D, but since the guy who wrote the compiler was heavily involved in early
C and C++ compilers, his community named his language D for him, instead of Mars or
something like that. It avoids the ugliness of having the kitchen sink that C++ quickly
became, perhaps learning from that C/C++ compiler background. It is also a garbage
collected language, unlike its predecessors. The garbage collected aspect could maybe
put this into a later group in this writing, but the systems focus it often has as well
as the higher level concept implementations rather straddles the line of plaacement.

Rust and C3 choose different ways of improving on C without going to OOP. C3 is somewhat
simpler, tightening and easening the use of C, basically. It feels a bit like C and even
has manual memory management of the arrays. Rust adds things like traits and several
other items that can help extend the type system. The `Vec<_>` type in Rust is a bit
easier in terms of the memory management at this point.

These 3 all do have generics and they are all quite simple.

```c3
// C3
fn Type max(List {Type} values) <Type> {
	Type curr = values[0];
	for (int i = 1; i < values.len(); ++i) {
		if (values[i] > curr) {
			curr = values[i];
		}
	}
	return curr;
}
```

### Going On With Static Languages

There is not really a great way to break up the static languages, so forgive the random
header here just to break things up. This next set of languages do feel distinctly removed
from the still-vaguely-C-lineage. D rather straddles the line the most, verging into this
next group more than any of these really verge into the C related space of the preceding
group. Several C++ programmers assume C# maybe would, too, but C# largely has more in
common with Eiffel or Python than C++ at this point.

Java has been around long enough as a strongly, statically typed OOP language to have a
point in which generics were finally added. Given that all the code is done inside of
classes, it can be tempting to expect Java would have fallen into the everything is an
object type, but it is able to handle native types without the OOP overhead quite well.
The garbage collection and the `ArrayList` type also make memory management easy.

Unfortunately, Java falls back into the ugly `compareTo` style instead of just allowing
the basic `>` operator.

```java
public static <T extends Comparable<T>> T perform(List<T> values)
{
    T current = values.get(0);
    for (T value : values)
    {
        if (value.compareTo(current) > 0)
        {
            current = value;
        }
    }
    return current;
}
```

Haxe is pretty similar to Java, intentionally. The generics require a `@:generic` prefix
to the function, but otherwise look like many other languages. It *does* allow the `>`
operator, although it does so by constraining the type to `Float`, which fits Haxe's
somewhat odd type system. Haxe transpiles to multiple other languages as well as running
on its own VM potentially, and the result is a kind of broad type system that mixes
several basic ideas quite smoothly. It actually pulls in `unification` from Prolog for a
kind of Duck typing. Getting into monomorphs and these things makes Haxe feel like a
strange language in some ways, but it can make the language feel quite explicit as well.

Go is quite a simple language at this stage as well. The type system is a pretty standard
static typing, using a lot of `int` at this stage in the project. It uses square brackets
for the generics, and it is a somewhat newer feature in the language than was initial
offered. It is a pretty simple language at this point, in a positive way.

```go
func max[T cmp.Ordered](list []T) T {
	var curr T
	for _, value := range list {
		if value > curr {
			curr = value
		}
	}
	return curr
}
```

Swift necessarily ended up being positioned as a successor to Objective-C due its
placement in the Apple ecosystem, and it offers a strong, static type system with value
types and reference types. Generics are easily available, including constraints, making
a max function on a generic list quite easy to program. It maintained the use of `>` in
the code by just constraining to the `Comparable` types. Swift does more garbage
collection, which makes it easier than a C background, but its classes are a bit more
cohesive to the language itself than whatever Objective-C was doing trying to slap
Smalltalk classes onto C.

Mojo is basically the next language by the same creator of Swift. The same guy that gave
the world LLVM and other projects. Mojo follows Python in a lot of syntax and basic
structure, but its type system is generally a bit stronger. It offers some interesting
SIMD types for use in high performance mumbo jumbo. Generics are also available, and are
about the same ease as Swift, including the use of `>` under proper constraints.

```mojo
def max[T: Comparable & ImplicitlyCopyable](values: List[T]) raises -> T:
    var current = values[0]
    for value in values:
        if value > current:
            current = value
    return current
```

V takes quite a bit from languages like Go, Rust, and Swift. The usual static typing with
familiar primitives is present, but everything being immutable is the default. It
effectively eliminates the null values, although the max implementation here just returned
`none` with a `?T` declaration to allow it instead. "No null" is true, but it is basically
the familiar null safety seen in other languages. Some programmers love it, as it even
just this basic safety can save embarassing, expensive crashes and security holes. V is
not object oriented, however, just using structs.

```v
fn max[T](values []T) ?T {
	if values.len < 1 {
		return none
	}
	mut current := values[0]
	for value in values {
		if value > current {
			current = value
		}
	}
	return current
}
```

Nim looks and feels a lot like a statically typed Python at this point. Maybe a little
bit more than other languages. Nim has typical ordinal types, along nwith structured
types, reference types, and even pointers when really desired. Like Odin and some others,
Nim allows creating a distinct type from another, the values not being allowed to cross.
Nim has generics, sum types, and some powerful metaprogramming capabilities to extend
types further.

The group last on this list is the .NET languages. The long C# programmer is all too
familiar with the value types and reference types, and how value types often get boxed
into reference type objects for some operations--and how to avoid this for higher
performance situations. The language allows creating value type structs, though most
programmers just use reference type classes for most things. Recent addition of record
classes for product types are quite powerful. F# has also long had sum types, bringing
algebraic data types to the .NET ecosystem. C# is increasingly offering immutable-first
language constructs, but it is default mutable, along with VB.NET; meanwhile, F# typically
goes the functional immutable route first. VB.NET allows some later bindings than one will
typically see in code bases of the other two. F# pioneered async/await, but C# took it in
the all too familiar direction people speak most of today. Recent versions of C# also
offer nullable contexts, requiring `?` on the typename for variables that may hold a null
value. All three offer generics, although F#'s type inference often makes it nearly
automatic without them. It looks somewhat funny when you do choose to use generics in F#;
a little bit of a mix of Ocaml and C#.

```fsharp
let rec max_accum<'T when 'T : comparison> (list: 'T list) (max: 'T) =
    match list with
    | [] -> max
    | head :: tail ->
        max_accum tail (if head > max then head else max)

let max<'T when 'T : comparison> (list: 'T list) =
    match list with
    | [] -> Unchecked.defaultof<'T>
    | head :: tail ->
        max_accum tail head
```

### Actor Languages

Pony and Acton are 2 more new languages to this project, and in some ways, an entirely new
paradigm of code as well. Fortunately, the paradigm has already been seen in this project
under Erlang and Elixir--kind of forced on Gleam as well. This is the Actor model. Io also
has an interesting take on the actor model central to the code, although it is not used as
much as it is immediately apparent in Pony and Acton.

Actors become the primary state owners in both of these languages, interacting with the
state held by actors via behaviors. They both offer classes and strong programming often
used for state as well, but actors in these languages are uniquely designed and positioned
for the task of managing state across concurrent requests.

Pony is statically typed, with types including the typical primitives and object oriented
classes, but also a new Actor type. Actors are presented much the same as classes, but
they are given `behaviors`. Behaviors are inherently asynchronous, meaning that when they
are called, the code inside them runs at some indeterminate point in the future instead of
the immediate case of functions in ordinary classes. This is basically Erlang's message
passing, and maybe makes Actors feel a little bit like Smalltalk's original concept of
objects. Pony has both nominal and structural subtyping via traits and interfaces, though
only interfaces can be used for structural subtyping. Nominal subtyping being the old
`X inherits Y` being a subtype by name, and structural being closer to the old Duck typing.

Pony also offers reference capabilities, which are an interesting take on memory
management. This can have some similarities to what is going on with Rust's borrow checker
and similar things, but at the end of the day, Pony's reference capabilities are quite
unique to Pony. In
[Pony's own documentation on reference capabilities](https://tutorial.ponylang.io/reference-capabilities/),
they note, "There aren’t currently any mainstream programming languages that feature
reference capabilities." Ultimately, this means that variables of certain types are marked
according to what kind of access the code has to it at that moment. This creates a
threadsafe lock over the data, allowing code to define when it will have access that
allows only it to read, or allows it to read perhaps along with others, from some variable.
Programmers with a long history of messing with mutexes and semaphores in concurrent code
will immediately find Pony's reference capabilities natural and powerful. It can be
difficult to explain to other programmers. The use of `val` and `recover` in this code is
actively using the reference capabilities in this language.

```pony
// The printer actor, used to find the max and print it to the screen
actor Printer[T : Integer[T] val]
    be printmax(env: Env, values: Array[T] val) =>
        let maxval = try max(values)? else I64(0) end
        for value in values.values() do
            env.out.write(value.string() + " ")
        end
        env.out.print("\nmax: " + maxval.string())

    // The max algorithm
    fun max(values: Array[T] val): T? =>
        var curr = values(0)?
        for value in values.values() do
            if value > curr then
                curr = value
            end
        end
        curr

// The main actor, gets the command line arguments and sends the values to a Printer
actor Main
    new create(env: Env) =>
        let printer = Printer[I64]
        let values: Array[I64] val = recover val
            let arr: Array[I64] = []
            for arg in env.args.slice(1).values() do
                try arr.push(arg.i64()?) end
            end
            if arr.size() < 1 then
                arr.push(15)
                arr.push(10)
            end
            arr
        end

        printer.printmax(env, values)
```

Acton feels like Python with actors. This writeup is far from the first one to say it. The
language is statically typed, unlike Python, but it remains garbage collected and able
to use type inference to make it continue feeling a lot like Python's dynamic types. Acton
adding actors to the type system centers a kind of concurrency to the language, and in
fact, Acton no longer ends just because the end of `main` is reached. The application
continues as long as actors are alive, and actors stay alive as long as someone has a
reference to it. This requires an explicit env.exit(0) that suddenly feels a bit more
important than other languages.

```acton
def mymax[T(Ord)](inlist: list[T]) -> T:
    curr = inlist[0]
    for item in inlist:
        if item > curr:
            curr = item
    return curr

# Actor used to calculate the maximum value in a list
actor Calculator(printer: Printer):
    def doMax(inlist):
        curr = mymax(inlist)
        await async printer.printMax(inlist, curr)

# Actor used to print a list and its maximum value
actor Printer():
    def printMax(inlist, max):
        print(f"{inlist}\nmax: {max}")

# An actor named 'main' is automatically discovered and recognized as the root actor.
actor main(env):
    printer = Printer()
    calc = Calculator(printer)

    values = []
    didFirst = False
    for arg in env.argv:
        if didFirst:
            values.append(int(arg))
        didFirst = True

    if len(values) < 1:
        values.append(15)
        values.append(10)

    await async calc.doMax(values)

    env.exit(0)
```

### Static Functional Languages

This project has so far somewhat forced the actor model onto Gleam via the Erlang OTP,
being that it runs on the BEAM VM and all. This has often felt entirely unnatural and
Gleam probably should have been treated more like a statically typed functional language
of its own interest than a statically typed Erlang. Gleam really is its own language in
this regard. That said, the twisting Gleam into Erlang's model does further highlight some
of Gleam's type system.

Most of the time, Gleam uses type inference for everything, so it can feel quite dynamic,
though the compiler strictly checks it. This has been seen with e.g. Kit. Gleam also does
enable the use of generics for strongly typed but polymorphic code. Unfortunately, the
generic version of max ends up having a function passed in to perform the greater than
operation, as if staring back at C through the VM and all. Gleam does offer algebraic data
types and prevents null values from showing up anywhere. The use of `Result` instead of
exceptions also makes a show in the max function, mixed with a generic return type.

```gleam
pub fn max(list: List(a), greater_than: fn(a, a) -> Bool) -> Result(a, Nil) {
    case list {
        [] -> Error(Nil)
        [head, ..rest] ->
            Ok(list.fold(rest, head, fn(current, value) {
                case greater_than(value, current) {
                    True -> value
                    False -> current
                }
            }))
    }
}
```

Mercury is another one that might take some extra appreciation at this stage. Up to this
point, it has often just seemed like another functional language, maybe a little
syntactically like Prolog. And in fact, it is a strongly typed prolog! Gone are the
worries about unification, however, because a strong, static typing takes its place. No
longer is everything a `term`, although that thinking might still help chew through the
prolog-y syntax. Generics, or in the academic sounding functional style parametric
polymorphism, are kinda just obvious. The determinism checks in Mercury make a bit more
sense under the strong, static typing as well.

```mercury
:- interface.
:- pred max_list(list(T)::in, T::out) is semidet.

:- implementation.
:- pred max_list_accum(list(T)::in, T::in, T::out) is det.

max_list([], _) :-
    fail.
max_list([H | T], Max) :-
    max_list_accum(T, H, Max).

max_list_accum([], Max, Max).
max_list_accum([H|T], TempMax, Max) :-
    compare(CompResult, H, TempMax),
    ( if CompResult = (>) then
        max_list_accum(T, H, Max)
    else
        max_list_accum(T, TempMax, Max)
    ).
```

Ocaml is another one with the strong, static typing that feels amazingly dynamic thanks
to that Hinhin-Moomoo... Hindley-Milner type inference. Of course, it comes from that ML
background, so it brings in generics as well. These look basically like the later F#'s,
making it maybe clear where F# got the syntax from. Ocaml has algebraic data types and
a whole, fun object-oriented model that programmers can get into. The code at this point
of this project is pretty simple, short, and sweet. Notably, Ocaml joins the ranks that
nulls do not exist, instead using `option` and similar constructs to represent failing
results as needed.

```ocaml
let rec max_list_accum (list : 'a list) (max : 'a) : 'a =
  match list with
  | [] -> max
  | head :: tail ->
    max_list_accum tail (if head > max then head else max);;

let rec max_list (list : 'a list) : 'a option =
  match list with
  | [] -> None
  | head :: tail -> Some (max_list_accum tail head);;
```

Haskell is a beautiful language for a type theory enthusiast. What more is there to say?
It, too, has all the things. The hooboo-moowoo errrrrrr Hindley-Milner inference shows up
again, but the programmer can also spend some time expressing lambda calculus style
type expressions as well. There are algebraic data types, parametric polymorphism, type
classes and kinds, and higher-kinded types for **move on if you're scared of category theory**
monads and functors.

```haskell
max_list :: Ord a => [a] -> Maybe a
max_list [] = Nothing
max_list (x : xs) = Just (reduce_max xs x)
    where
        reduce_max [] max = max
        reduce_max (x : xs) max
            | x > max = reduce_max xs x
            | otherwise = reduce_max xs max

argsAsInts :: [String] -> (Maybe [Integer])
-- ...

-- | some other example to make a point
years :: Integer -> Integer -> [Integer]
```

And then Idris2 treats types as first class members of the language, such that you can
have types that depend on values. This is not so far off from the template foo some have
done with template metaprogramming and the like, but Idris2 wants to take it a bit more
direct into the language itself. From Idris2's own documentation, a signature for an app
that concatenates 2 vectors, where n and m are the size of the original vectors:

```idris
app : Vect n a -> Vect m a -> Vect (n + m) a
```

Anyway. In the current project, the parametric polymorphism is used for generics, looking
basically the same as Haskell. The language is largely geared toward Haskell and Ocaml
users. It is statically typed inside of that mad types as first class members stuff, and
has the Maybe types and all from Haskell.

## Dynamic but Strong

Speaking of languages with perhaps more intense type systems that let you do a lot with
them, there is Julia.

Julia's central use of multiple dispatch is interesting because writing a function without
a specified type will just use multiple dispatch to call further functions and so on for
the type of the value. This is a kind of polymorphism not unrelated to generics. Although
it is a dynamic language in that variables are not typed, it is the first in this writing
that approaches this while maintaining strong typing of values. Functions can even be
defined with versions specific to types, such that it looks an awful lot like a statically
typed language, if desired. With multiple dispatch, this all just feels natural in Julia.

Julia is not really object oriented, in the sense that `composite` types are closer to
structs or records in other languages. However, even the numeric types follow a strict
hierarchy, from `Any` to `Number` to `Real`, on to `Integer` and finally `Int64`, for
example. `Int64` in this particular tree would be called `concrete` while all the others
are `abstract` types. Concrete types cannot be subtyped, but abstract types can in Julia.
In terms of concrete types, those like `Int64` are considered primitive types, being made
of only plain old bits of N size. Julia allows programmers to define additional primitive
types such as `primitive type In64 <: Signed 64 end` with the bit length and signature.
Composite types are default immutable, and must be defined `mutable` otherwise.

Interestingly, composite types can be `parametric`, with a type parameter, quite like the
generics of all the previously mentioned static languages. This can include constraints
just like many of the statically typed language generics. With composition, this can make
Julia feel just as OOP as many other languages, even if it really is missing the major
points pushing into "true" OOP. Of course, any language with structures like composite
types can use OOP style code organization, though it can feel quite natural in Julia due
to the involved type system.

Another interesting point about Julia is that this version of the code is written in a
very procedural way, but Julia also has a code as data perspective. For example, the
if here could be written as `current = if current < value; value; else current end`. In
this case, this other form feels a bit more verbose than the procedural form, but they
have the same outcome. `return` is also optional, as the value of the last expression will
be the return of a function in Julia. Quoting code in an Expression also allows
manipulating it as data, although that is not used at all here.

[Julia's type system](https://docs.julialang.org/en/v1/manual/types/) is quite extensive
and thought through. If one enjoys the academic history of Modula-3 writing papers on the
type system there, Julia won't disappoint with documentation focused on its type system.
This can make it quite involved, but it is probably one of the more powerful type systems,
in pure discussion of what can be done just with type system concepts in the language.
That it does this without even really becoming OOP is quite notable and honestly quite
impressive.

```julia
function max(values::Vector{T}) where T <: Number
    current = zero(T)
    for value in values
        if current < value
            current = value
        end
    end
    return current
end
```

Most of the other languages that follow some kind of strongly typed values and weakly
typed variables are quite a bit simpler to wrap one's mind around. Nothing quite like the
parametric polymorphism shows up in the remaining languages, simply relying on the
inherently dynamic nature of variables themselves to solve the problem.

Icon and Lua are remakarkably similar, even using the `local` keyword. The dynamic typing
and automatic memory management make both of them quite simple and suitable for embedded
forms in other applications, which both have been used for. They are pleasant languages to
program in, their simplicity aiding the pleasantry for the programmer.

```icon
procedure max(values)
    local curr, value
    curr := 0
    every value := !values do {
        if value > curr then {
            curr := value
        }
    }
    return curr
end
```

Erlang and Elixir both end up looking nearly identical for this point in the code,
with only previously discussed syntax differences really continuing to shine. Some modern
versions of Elixir are adding a set-theoretic gradual typing system, which can be really
nice. This places Elixir somewhere between Erlang and Gleam on the typing over BEAM VM
at this point. Elixir focuses heavily on soundness of the typing, even when dynamic.

```elixir
  def max_list([]), do: 0
  def max_list([head | tail]), do: max_list(tail, head)
  def max_list([], curr), do: curr
  def max_list([head | tail], curr) when head > curr, do: max_list(tail, head)
  def max_list([_ | tail], curr), do: max_list(tail, curr)
```

Lisps (and rhombus) close out this section of languages that carry a strong typing of
values but weak typing of variables. None of these follow the Common Lisp route, often
favoring a functional approach instead. Clojure sits on the JVM and takes advantage of
Java style typing under the hood but favors simple values and functions. Scheme and Racket,
which began life as a scheme variant but has grown off on its own, likewise follows the
generally values and functions approach as well. Rhombus has some interesting additions to
its Racket heritage, and both being "programmable programming languages" can make their
typing a bit more interesting for the interested programmer.

```rhombus
fun max_of(list):
    def mutable curr = 0;
    for:
        each item in list
        let newCurr:
            if item > curr
            | item
            | curr;
        curr := newCurr;
    curr;
```

## Dynamic and weak

Somehow, only PHP and Javascript really have notably "weak" type system, of all the
languages in this project. PHP really does have a sort of opt-in gradual type system
including atomic types as well as user defined types and composite intersection and union
types. Types are automatically converted whenever some operation between two types are
done, and the programmer ultimately has to have some awareness of exactly how this is done,
especially if performance is ever a concern. Of course, this is all true for JavaScript as
well, and JS is notorious for being just completely bizarre about it sometimes. What will
the result of adding a number and a string together? Well, it depends.

Typescript was not included in the static languages above because it really just adds
a stronger static typing on to JS's existing dynamic typing. This can help at compile time,
but when the code is run, it is ultimately JS, with all the runtime negatives (and perhaps
positives) of JS's type system.

```php
function max_list($list) {
    $current = 0;
    foreach ($list as $value) {
        if ($value > $current) {
            $current = $value;
        }
    }
    return $current;
}
```

## When Types Got Weird

A couple of statically typed languages continue to stand out as too weird to not have
their own section. These did not really seem to fit in anywhere else. Although they are
statically typed and thus being here at the end with the dynamically typed languages
between them might be a bit odd, they both just structure their types completely different
from other languages, supposedly focused on how business people think more than how a math
or CS person might ordinarily think. It seems that dynamic languages have come to serve
this purpose better, and even some of them are adding gradual typing with types closer to
the C style int, float, bool, etc.

PL/I is one of the newest additions to this project and also brings in a type system where
integers are often defined as fixed by digit size. COBOL does the same and also adds in
strong but complex notions of tables and quite specfically structured data. Even
representing a boolean value in COBOL can mean constructing a table capable of
representing the two values and setting the true or false value within the table. This
will show up in future code and does not here, but this is truly where the type systems
just get weird relative to basically every other language, even assembly.

PL/I is the only language except for assembly that the actual command line string had to
be parsed. And Assembly only required this on Windows. This is unfortunate for PL/I.

```pl/i
 max: procedure(args) options (main);
     declare sysprint file external;

    /* function used to find the maximum value */
     maxvalue: procedure(values, n) returns (fixed bin(31));
        dcl values(30) fixed bin(31);
        dcl (curr, n, i) fixed bin(31);
        curr = 0;
        do i = 0 to n - 1;
            if values(i) > curr then curr = values(i);
        end;
        return(curr);
     end maxvalue;

     dcl (n, i, pos, maxval) fixed bin(31);
     dcl values(30) fixed bin(31);
     dcl args char(256) var;
     dcl temp_str char(256) var;
     dcl (arg) char(20) varying;

     /* Parse the input arguments */
     n = 0;
     temp_str = args;
     do while(length(temp_str) > 0);
         pos = index(temp_str, ' ');
         if pos = 0 then pos = length(temp_str) + 1;

         arg = substr(temp_str, 1, pos - 1);
         values(n) = arg;
         if pos > length(temp_str) then temp_str = '';
         else temp_str = substr(temp_str, pos + 1);
         n = n + 1;
     end;
     if n < 1 then do;
        values(0) = 15;
        values(1) = 10;
        n = 2;
     end;

     maxval = maxvalue(values, n);
     do i = 0 to n - 1;
        put edit(values(i), ' ') (f(3), a);
     end;
     put skip edit('max:', maxval) (a, F(3));
 end max;
```

## Some Aesthetic Ramblings

There really is something to be said for languages that can say a lot of ideas in a little
bit of text in a single file. Many languages shined at even demonstrating forms of
parametric polymorphism while keeping code incredibly brief and immediately present. Many
languages utterly failed at such a task. Modula-3 required 6 additional files. Although
not particularly large in any singular case, the outcome feels incredibly difficult and
kind of ugly compared to the small and succint ones.

Is shorter code always better? Perhaps rhombus challenges this, offering a quite
beautiful, dynamically typed implementation of the max algorithm in a form that is not
quite as small and succinct as its Racket cousin but in some ways have a beauty the racket
one lacks, if only because of originality in style. Frankly, the `if` with `|` casing
underneath, reminiscent of expression matching in some completely other functional
languages just gives it an original, kind of funky, beautiful feel of its own that the
shorter lisps just do not quite get for this function.

This writing has largely focused on exploring the type systems of all these languages and
what they offer for the programming experience, but there is something deeply aesthetic to
a lot of this as well. `int` versus `i32` stands at an interesting point, for example.
Certainly, `i32` carries more information, but there is something comfortable and pleasing
about simply `int` or even a longer `integer` as some languages require. Not that `i32`
does not have an aesthetic interest of its own.

Furthermore, the differences between a hierarchical tree of subtypes like many OOP
languages vs the likes of Common Lisp's lattices, these result in different aesthetics of
code. It was noted in a prior writing in this project that a lot of the OOP languages who
continued a C/C++ curly bracket style have a distinctly hierarchical feel to the code, and
it is sometimes interesting that the type systems can have different hierarchical vs
lattice vs other structure to them, impacting the code organization in these more vs less
hierarchal formats.

Aside from size, there is an amazing diversity of what look and feel is used to achieve
generics and parametric polymorphism. Many follow the angle brackets around type
definitions, but square brackets and parenthesis both show up. And then there is Zig's
comptime parameter that it just looks like another parameter in a function. Constraining
polymorphic type parameters is also wildly diverse, with many providing a kind of
inheritance syntax within the polymorphic definition, and others such as C# requiring an
extra `where` clause or the like added onto the definition. In some ways, they can
capture a kind of beauty to code, avoiding excessive re-statement, and in some cases,
it is just syntactical sugar to enforce the multiple re-statements anyway.

The requirement of additional compare functions showed the absolute ugly side of many
implementations of parametric polymorphism. Modula-3 probably showed this the worst with
the exhaustive interface files just to get there. C stands alongside it. But even without
having to specify all of this, even Gleam ended up using a comparison function parameter,
and a lot of languages used some interface's `compare` method instead of the nice and
easily readable `>` operator.

APL, though. I guess it's not brainfuck.

Ultimately, sometimes aesthetics matter less in code than making code that works well.
Many of us like to try to find the common ground, as highly performant and well working,
maintainable code often can have a beauty to it. The use of something like parametric
polymorphism / generics can be a double edged sword, adding some beauty to the code when
used well. Sometimes, like in many examples of this Max algorithm, it overwhelms what
could have been otherwise beautiful code and makes it kind of ugly. And not always with
any actual advantages to anyone who has to use it.

## Conclusion

At the end of the day, Max is just a very simple method. Some of the most interesting
points about the algorithm itself are wrapped up in how the memory for the array of values
is to be stored. In assembly, we just used the closest available stack mechanism on each
platform and called it good. It was sufficient for this purpose, although it quickly
becomes apparent that maybe something other than the stack should be considered for
anything larger than this simple sample algorithm. Other languages used well defined
allocators, or just the old `malloc`/`free` or standard `allocate`/`deallocate` keywords.
And finally, several languages just used a garbage collector or some kind of standard
managed type structure to erase the immediate memory management concerns.

Tcl perhaps more than others showed that even when memory is garbage collected and
managed, a strong programmer is often forced to think about how memory is being managed
by the underlying system, and code according to that underlying mechanism anyway. It is
far from the only language where this is true, of course, as critique of `malloc` in favor
of custom arena allocators or the like in common use also shows. Meaning such concerns go
from the low level assembly to the high level interpreted languages, without skipping much
of a beat anywhere in the middle.

Type systems overwhelmed the discussion, even of memory management, throughout this whole
writing, of course. From a basis of just sized data, language designers have raided the
depths of type theory and innovated in their own new directions. From everything being one
base type, expanded into particulars, to Julia's self-defined primitives or Pony's
reference capabilities, the type systems that are available to programmers across different
languages are truly remarkable for diversity in form and strengths.

Several new languages were also added between this and the prior writing. Some of them
offer entirely new paradigms, while others expand on previous languages in new ways. Pony,
Acton, and Io expand the use of the actor model. APL, J, and Q'Nial brought in array
programming in a stronger showing than Octave and R previously suggested. Self also stands
out in expanding Smalltalk with prototype based objects, and also in being one of the most
difficult to get up and running with. Meanwhile PL/I makes COBOL feel a little bit less
lonely in the oddly business-oriented and not quite fitting anywhere else style language.
The project will be a little bit harder with now 76 languages, but it also provides many
new insights into what is being said in software code.
