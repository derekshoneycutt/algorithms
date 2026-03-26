# Hello World

Hello world is not much of an algorithm. The idea is literally to just
print, "Hello, world!" to the screen.

The credit for this typically goes Brian Kernighan in The C Programming
Language. Although perhaps it should truly go to the first person
who carved a message into a piece of wood.

## Introduction

This is the first writing of trying to do some kind of analysis of the
experience of this project, following Knuth analyzing algorithms in
assembly by writing some of them in 60 different coding languages.

With this stated, this analysis will give some thought into what
getting started with hello world has to tell. This first part will
probably be dry, but there will be ample opportunities for code samples
in later analyses.

This writing covers the experience of setting up and coding in both
Gentoo and Linux setups, as well as thoughts about the code for
hello world in all these languages.

## Setup

Just getting to hello world, unfortunately, can be surprisingly difficult
in some cases. When going into older languages that are just hanging out on
some git repository but unupdated in 7 years, there are some fun errors.
Ultimately, the author was not even able to get Modula-3 running under
Gentoo Linux, which is quite unfortunate. Simula and Smalltalk took
digging through the source code and making small changes in order to get
through the build. And maybe a little bit of a leap of faith along the way.

Many languages are literally installed by one standard command to the package
manager for the distribution alone in both Gentoo and Ubuntu. These often
make for well managed and well running compilers/interpreters. GNU COBOL
is about that easy on both.

Even these, however, the package managers often have some degree of managing
multiple versions, especially for something like GCC that has varied
requirements. This project ended up using both GCC 13 and GCC 15 just in
hello world, and it took managing these multiple versions in the package
manager. To an ordinary user, this would be considered a tedios, difficult
task. To the Gentoo user, it is hardly a noteable day.

Ubuntu had the negative of much more frequently needing to add repository
sources in the package manager. This is a thing in Gentoo as well, but it is
somewhat more common to just go grab the source and build it oneself.
One cannot judge these against each other as these are fundamental differences
in the way the OSs are designed, not anything to do with our code projects.

A further note can be made about Ubuntu vs Gentoo. A seasoned Gentoo user
will find a degree of comfort adding another language, even when
it means learning how to interact with slots and different environments,
for many even if it means changing a couple lines of code somewhere,
even if it might be avoided day to day. Advanced interventions were
avoided at first for this project, but both platforms ultimately
required similar techniques and resulting workarounds to get all
languages working. Ubuntu tends to side on the just finding a package
and installing it. It is odd to have to build it yourself from source,
let alone modify sources. Yet, that ended up being required for this
project to get all 60 langauges working.

While stepping away from OSs and their package managers, Dart was as
easy as installing VS Code and then installing the Flutter extension.
The rest was a basic walkthrough in the UI. It is not really a great
installer UI, but it is effective.

Some languages leave ample choices. Is the choice guile or chez or racket
or maybe they should be included as separate languages? This project
went with guile and racket, but chez was installed and used in builds.
There are also choices like dotnet vs mono, LibertyEiffel vs EiffelStudio.
Looking for a BASIC dialect, this project chose FreeBASIC just because it
was clearly available on whatever platform, and then still added
VB.Net later as well. Yet other dialects are around. The software
engineer is no stranger to choices.

One that feels unique, Mojo requires installing pixi and then
having toml and lock files that track the dependency on Mojo.
The run script then has to call into pixi every time to call the
Mojo code. This does carry the advantage of downloading Mojo
if needed, "just in time," as long as pixi is installed already.

Oberon on Gentoo was an adventure. This project finally figured out
that a core system file that had the OS labeled
as 'gentoo', including the quotes, led to a syntax error in
executing one of the compilation scripts. Modifying this system file
to remove the quotes and then compiling Oberon
led to the compile completing successfully. voc really made compiling
on Gentoo live up to its reputation. The system file change was
immediately reverted once voc was built, and it has continued
successfully buildling code.

Adding WASM to this project took figuring out a js script to load in node
that could do the big weights of supplying dependencies and things as
needed into the WASM. This was uniquely difficult. Although the run script
has to construct project files for some languages, no other language
required figuring out and coding an environment to load it in.

Then there is dotnet. Ubuntu offers an entire flowchart of how one should
decide which method to install it. The System setup in this project went
with snap and ran. It got it going. On Gentoo, just using the install
script provided by Microsoft works pretty well. Then setting the PATH
variable and all that. This is "experimental" or whatever, but how is
that not just a "bet" to a Gentoo user?

EiffelStudio is rather pleasant to install, really, but the ideal start
on any system includes loading the actual IDE, which is based either on
trial or via a paid account. In fact, the compiler itself is dual
licensed, so to use it on an open source basis requires releasing
open source software. In my experience, building once on a system in the
IDE sets up necessary system files to use the compiler moving forward.
But the compiler does expect project files, etc. that the IDE sets
up for you.

In a world of so much open source tooling, heavily corporate experiences
stands out as unique. The open source tools have an advantage in linux,
being readily available in package managers quite often. But the
more corporate experiences could still be just as pleasant as any
other language not appearing in the package manager. There was certainly
no editing code just to get the corporate experiences working.

## Introduction To Languages

Aside from the large diversity and learning curve in just getting a
language up enough to run anything with it, the programmer has an
interesting chance to look at the different languages in some of the
most simple, core ways with "Hello World." For each language, this
"algorithm" does just enough to print something simple to the screen,
and maybe have a little bit of documentation in the code itself
along the way.

### Comments

First, the comments. The code that does literally nothing.
Perhaps one should not say "nothing," as comments can be the last hope
of anyone, like the one who wrote the code themself, having a clue what
that code is *supposed to be* doing in particularly difficult code. The
most obvious difference, besides characters, between different comments
is that some are allowed to span multiple lines and some are restricted
to the single line they begin on.

#### Single Line Comments

Single line comments are overall pretty easy. Multiline comments can of
course appear on a single line, but many languages offer a dedicated
syntax to comment out "the rest of the line."

MMIXAL is developed quite loose and flexible allowing just about any
style of single line comment.

```mmix
# This prints hello to the screen
        LOC	Data_Segment
        GREG	@
Text    BYTE	"Hello, world!",10,0

        LOC     #100
Main    LDA     $255,Text       ; The main entry point
        TRAP	0,Fputs,StdOut  // Put string to Std Out
        TRAP	0,Halt,0        % Exit the application
```

The semicolon requires some caution as it can also be used in MMIXAL
to separate multiple commands on a single line. However, with some
care, it works well enough. In fact, you can ommit the "character"
and just type in some comments if you space out well and consistent
to the right every time. After a good break, basically everything
is a comment in MMIXAL. However, even the MMIXAL extension in VS
Code only highlights the text comment-green when you add a
recognized character indicating the comment. It also adds an
intentionality to others who read this code. Whatever character is
used, the programmer is clearly indicating that this is for other
coders, not the machine. The flexibility of MMIXAL highlights
the intentionality of coders speaking to one another within code.

Moving on from MMIXAL, NASM immediately becomes strict; it allows
only and requires semicolon `;` as the comment indicator. In fact,
using some old source code on the internet that uses the hashtag at
the start of the line now complains about a line number being
required; hashtag is an alias for `%line` in modern NASM. LLVM IR
joins NASM with the semicolon indicator; the low level languages
seem to like it quite a bit. For single line comments, even WASM
sticks with semicolons; it uses two of them to initiate a comment.
In later languages, such as C, the semicolon is used to indicate
the end of an expression, allowing another expression to continue;
this is similar to how MMIXAL allowing multiple commands separated
by the semicolon requires care with the semicolon. Semicolons as
comment indicators are interesting for being so standard in lower
level langauges; they seem to often mean entirely other things in
higher level languages.

```wasm
  (func $helloworld ;; our initial hello world method
    (call $jsprint (i32.const 0))
  )
```

Going further down the line of strictness, COBOL demands that the
programmer place an asterisk `*` or forward slash `/` at the
seventh character in the line, specifically, to initiate a
comment. Any later, and after some other text, there is the `*>`
character that can also allow short comments.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO-WORLD.
      *    This program will just print Hello to the screen

      /    2 style of whole-line comments
       
       ENVIRONMENT DIVISION.
       
       DATA DIVISION. *> End line comment
       
       PROCEDURE DIVISION.
       000-MAIN-PROCEDURE.
           DISPLAY "Hello, world!".
           STOP RUN.
```

COBOL also gives a first look at a fun difference that
begins to show up across different languages: how many
characters are required to initiate a comment for the rest of the
line? COBOL has two styles requiring a single character, and it also
has a second style requiring two characters.

NASM has the single semicolon `;`, along with Clojure, Racket, and Scheme.
The hashtag `#` is often seen in shell scripting, and it also appears
in Ballerina, Icon, Perl, PHP, Ruby, Python, R, Julia, Nim, Elixir, Mojo,
Tcl, and Kit. Fortran, Simula, Factor are very excited about the
comments and start with the exclamation point `!`. Visual Basic .Net
and FreeBASIC pull off using the single quote `'` to initiate comments.
With Erlang, Prolog, Mercury and Octave, the percent symbol `%` is used as
the comment character. Forth uses the backslash `\`, which is quite
unique.

```fortran
! This program prints hello to the screen
program HelloWorld
    print *, "Hello, world!"
end program HelloWorld
```

WASM has the double semicolon `;;`. Ada, Eiffel, Lua, Haskell, Idris have
the double dash `--`, which has a nice whitespace effect. But. No mention
of single line comments would be complete without the ever popular double
forward slash `//`. This is used by Pascal, C, C++, Go, Dart, Rust, Zig,
V, D, Ballerina, Kotlin, C#, Haxe, Swift, Javascript, Typescript, Scala,
Gleam, and F#.

```ada
--  This just prints hello :D
procedure Hello is
begin
   Ada.Text_IO.Put_Line ("Hello, world!");
end Hello;
```

Then there is BASIC dialects and the `REM` to start a comment.
This pattern of something closer to a whole word is seen a bit more often
in the multiple line comments, making an interesting presence here.

```basic
REM Comment
Print "Hello, world!" ' Comment
```

Of note, Forth has comments simply by wrapping text in
parenthesis with spacing on either side. Some of these comments can be
used to give compiler hints and such later in programming in the language.

```forth
( This application prints hello world to the screen )`
: HELLO ( -- ) ." Hello, world!" CR ;
HELLO
```

Many languages also double up the comment characters for special cases,
especially in the single line format. Double semicolons `;;` shows up in
embedded and special comments within clojure and other languages using
simicolons. Double or even triple percent signs, `%%` and `%%%`, are used
in Erlang for various documentation elements within code files.
Idris uses a triple pipe `|||` for documentation comments, uniquely.
Haskell adds a pipe after a space to the double dash, creating a
unique `-- | appearance` for the documentation comments. VB.NET triples
up on the single quote on each line `'''` for documenting classes and methods.
The triple forward slash `///` is especially common for
documentation comments, such as the XML comments used in .NET languages.
These can also contain Markdown or Doxygen formatted comments in
different languages. Here, especially, the comments in code can start to
feel like they contain a language of their own; in a way, they do.

```haskell
-- | The main entry point for our application
main :: IO ()
main = putStrLn "Hello, world!" -- prints new line at end
```

#### Multi Line Comments

Documentation comments necessarily leads into comments that span
multiple lines. Not all languages have multi line comments. Both dialects
of assembly in this project do not. In many languages, documentation
comments are a special case of single line comments extended over multiple
lines. This analysis will now consider the case of comments that
span multiple lines by immediate design.

Lisp languages provide a somewhat obvious path to multiple line comments.
If everything else is already in parenthesis and can span multiple lines,
just use a special cases of parenthesis. WASM puts a semicolon on the open
end of either parenthesis to indicate a comment that can span multiple
lines `(; ... ;)`. Clojure offers the `(comment ...)` command. In Clojure,
simply put a hashtag underscore `#_(...)` before any parenthetical block,
and it is immediately commented.
Racket does the same with hashtag semicolon `#;(...)`. This is a great way
to block out a section of code that may still be useful in some context.

```clojure
(comment
  ;; Useful, though
  (println "This doesn't run"))

#_(println "Also doesn't run")
```

Lisp is not alone in using parenthetical phrases for comments.
Modula-3 and Oberon both use parenthesis with asterisk on the inside
aspect to indicate comment blocks. Pascal, F#, and Ocaml also support this style.

```oberon
(*
  This prints hello to the screen
*)
MODULE hello;
IMPORT Out;
BEGIN
  Out.String("Hello, world"); Out.Ln
END hello.
```

Outside of parenthetical comments, there are many other characters used to wrap
multiline comments in many languages. Of course, the most popular of these
throughout many languages is the forward slashes encloses asterisk style,
`/* ... */` Languages in this project that allow this style of comment include
C, C++, Objective-C, C#, Go, Dart, Rust, V, D, Java, Kotlin, Haxe,
Swift, Javascript, Typescript, PHP, Scala, and Mercury.

```csharp
/* 
    This application prints hello world
 */
Console.WriteLine("Hello, world!");
```

An extra asterisk is often added to the opening indicator of the comment block
to indicate that the comment documents the following item, often a method
or class. This typically contains doxygen, markdown, or some other standard
form of documentation, as was seen with the single line comments.

```java
/**
 * The main class for the hello app
 */
public class hello {
    /**
     * The main entry point to the application
     * @param args The command line arguments passed to the application
     */
    public static void main(String[] args)
    {
        System.out.println("Hello, world!");
    }
}
```

D adds in using plus signs instead of asterisks `/+ ... +/`. It actually allows
both forms, even allowing nesting both types inside one another. D uses this form,
with an extra plus sign on the opening bracket, to specify documentation comments.
The nested comments case is interesting, as comments can often be used to preserve
code that is being temporarily discarded for some reason.

```d
/*
    This application prints hello
    /+ D has nested comments, too +/
*/
import std.stdio;

/++
 + Main entry point to the application
 +/
void main()
{
    writeln("Hello, world!"); // Hello
}
```

FreeBASIC kind of steals this pattern as well, offering the single quote
inside the forward slashes to bracket multiple lines.

```freebasic
/'
    All this app does is say hello!
'/
Print "Hello, world!" ' Comment
```

Additional characters are also used to wrap multiple lines as comments in other
languages. In a total break from the popular C style of using curly brackets as
code blocks, Pascal (Free/Object) uses curly brackets as comments. Interestingly,
it also uses the double forward slash in single line comments, making for a fun
combination.

```pascal
{
  This prints hello to the screen
}
program hello;
begin
  WriteLn('Hello, world!'); // writes end of line
end.

```

Haskell and Idris also use the curly brackets, but they add a dash to the
inside of each bracket `{- ... -}`. Octave (MATLAB) adds a percentage sign
to the left side of either brack `%{ ... %}`. 

```idris
{-
    This module prints hello to the screen
-}
module Main

||| The main entry point to the application
main : IO ()
main = putStrLn "Hello, world!" -- prints new line at end
```

Extending the common hashtag comments, Julia adds an equal sign to
the right and then left side of a hashtag to indicate a comment that
can span multiple lines `#= ... =#`. Racket allows a similar syntax
with pipes instead of equal signs `#| ... |#`. Nim uses square brackets
inside, perhaps reminiscent of the curly brackets `#[ ... ]#`.

```julia
#=
    This prints hello to the screen
=#
println("Hello, world!")
```

Lua takes the using brackets for comments to another level by using
an opening double dash followed by double square brackets surrounding
the comment. Even further, more recent versions and derivations of lua
often allow adding an equal sign between the double brackets, allowing
for nested comments.

```lua
--[[
    This prints hello to the screen
    --[=[ Nested comments ]=]
]]
print("Hello, world!") -- that's all
```

When the brackets are not even explicit enough, Ruby and Perl bring in
multi-line comment styles in which the first and last line each begin
with equal signs. In Perl, the first line read `=for comment` and the
last line reads `=cut comment`; the last `comment` is optional. In
Ruby, the first line reads `=begin` and the last line reads `=end`.

```perl
=for comment
    This prints hello to the screen
=cut comment
use strict;
use warnings;

# just with print and an \n at the end
print "Hello, world!\n";
```

Simula decided to be entirely unique in a way that no one has felt a
deep desire to copy, apparently. Simply adding the word `comment` and
then finishing the comment with a semicolon `;` is enough. This is an odd
return of the semicolon for comments, signalling the end of a comment
instead of the beginning of one. It feels oddly like some kind of C
comment block that isn't available in C. Also note this juxtiposed
against the exclamation point `!`, making Simula an emotional
experience to read.

```simula
comment
    This prints hello to the screen
;
simulation begin
    ! all we do is print;
    outtext("Hello, world!"); outimage;
end
```

Finally, this analysis has highlighted many different kinds of comment
blocks with all kinds of interesting opening and closing. Most are
almost immediately obvious to stand out *as comments*. But there has
been no mention of Smalltalk anywhere in the comments discussion yet.

Why not?

What could Smalltalk be hiding?

```smalltalk
"
    This prints hello to the screen
"
stdout nextPutAll: 'Hello, world!'; nl
```

Oh, someone think strings should be in double quotes? No. You have
single quotes, and you'll like them!

In fact, Smalltalk is not the only one to do this. Some of them
even do put strings in double quotes. Although it does not
come up in hello world yet, due to the lack of required structure in
a lot of languages for hello world, there are a few languages, such as
Julia, that use triple double quotes wrapping multiple
lines of markdown or similarly standardized documentation above
methods, classes, etc. In these languages, it is not uncommon for
syntax highlighters to see it as a string, but tools often treat
it as special comments instead. Mojo already demonstrates this.

```mojo
# This prints hello to the screen

fn main():
    """
    The main entry point to the application.
    """
    print("Hello, world!")
```

### Hello World Code

Hello world apparently gave only a glimpse at how programmers can
utilize commenting across the different languages, and the code itself
is bound to be no different.

Hello world may allow one to see more about what the language designers
have in mind as they develop these different languages, as opposed to a clear
difference of what the programmer wishes to express in the code. There is
only one thing to be done, and what needs to be done to achieve that
is going to depend on what the language designers have decided to
prioritize in the design of the language. This analysis will compare
the experience of these different languages in terms of the aesthetic
experience of this simple code, the experience of working with memory
and messaging to print to the screen in the languages, and the overall
code structure that is required for hello world.

Hello world does begin to give some idea of the paradigm of the
different langauges, but many quite intentionally do not expose that
deeply just from printing a static string to the screen. Most importantly,
the Lisp languages and perhaps Forth and Factor stand out the most.
Java and Eiffel, among others, expose their object oriented bias,
and there are many that do expose a certain structured bias. The
discussion of paradigm will mostly fold into code structure for this
particular case.

#### Code Structure

Some languages already begin requiring a certain amount of structure
to the code that begins to show how to think in these languages,
even offering some opportunity for expressiveness of the programmer.
Others do little more than say "print hello."

At this stage, the assembly and lower level languages are some of the
most structured code of the bunch. Which is somewhat ironic, as
it is easy to make messy, unstructured code with assembly as more
advanced topics are taken on. The MMIXAL code was pasted in the
discussion about comments above; it shows a Data Segment that
includes the definition of the static string to be printed to the
string and a Main section that gets that text and prints it to the
screen. The NASM is very similar, also containing a data section
and a main section, label `_start`. The NASM is a bit more,
including an import of a PrintString method--part of the standard
library for the project--to print the hello message from the
data section. This code also demonstrates a `%define` for a
compile time constant, and some declarations for the assembler and linker.

```nasm
; Prints hello to the screen
DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .rodata
  msg: db "Hello, world!",10,0

%define sys_exit 60

global _start

extern PrintString

section .text

_start:           ; The main entry point to the application
  mov rdi, msg
  call PrintString

  mov rax, sys_exit
  xor rdi, rdi
  syscall
```

LLVM IR and WASM are a similar level of abstraction just above that
of the assembly. WASM is decidedly Lisp in fashion in the human
readable form, whereas LLVM IR is a kind of low level C-ish syntax.
They both include lines to define the memory for the string to print
to the screen, as well as definitions of methods to call as entry
points to the application. They are barely more than condensed
versions of the assembly.

```llvm
@.str = private unnamed_addr constant [15 x i8] c"Hello, world!\0A\00"

declare i32 @puts(ptr captures(none)) nounwind

; This is the main entry; returns 0 for success
define i32 @main() {
  call i32 @puts(ptr @.str)
  ret i32 0
}
```

Above this, COBOL has the most structure in the code. COBOL
is extremely picky about line spacing and length, and it is
obvious looking at any code, like that already shared above.
It defines the program with an ID, an environment division,
a data division, and a procedure division. After printing
hello to the screen, it also has an explicit exit from the
program.

Starting with some older languages, Modula-3, Oberon, Pascal,
VisualBasic, and Fortran all require some initial structure
to the code. Modula-3 and Oberon, both continuations of
Modula-2, give the idea of a module that exports, an import
for IO operations, and the main module procedural body printing
the code. Visual Basic does a similar Module setup, with a
Main subroutine. Pascal and Fortran are a little bit less, with
the idea of Program. For something like a "Modula" language,
the immediate intentions of the language designers
having programmers structure our code in modules.

```modula3
(* This prints hello to the screen *)
MODULE Main EXPORTS Main;
IMPORT IO;
BEGIN
  IO.Put("Hello, world\n")
END Main.
```

Eiffel stands out for the amount of structure that is still
in at Hello World. The structure is decidedly simpler
than the assembly, but also decidedly more... structured.
Here, the definition of a class is made. In this class,
a feature is defined, with a method that is run on the
startup of the application. For fun, there is also a special
type of documentation in Eiffel. All of this is extremely
expressive. The programmer is literally telling a description,
and there is a sense of a date and revision being part of the
overall package that is being built. As with most code,
the programmer is speaking about mostly technical details, but
those details are bountiful in the Eiffel code. The language
designers in EiffelStudio lean toward a standard language
and serve commercial clients, where strong structure
and programmer expressiveness would be encouraged.
Consider COBOL having some of the same strengths and same
situations where it is commonly used.

```eiffel
note
	description: "hello application root class"
	date: "$Date$"
	revision: "$Revision$"

class
	HELLO

create
	make

feature {NONE} -- Prints hello to the screen

	make
		do
			print ("Hello, world!%N")
		end

end
```

Java is shared above, where the OOP structure is
applied with curly brackets and C style syntax. Haxe appears
remarkably similar at this stage. This again shows a structure
similar to Eiffel at this stage. The idea of a feature seems
lobbed off for less separated member functions. The constructor
is not explicitly identified. The expressiveness is done a bit
more in comments on top of this increasingly hierarchical
looking code. Java and Haxe are both built for massively
cross-platform output. They have some different goals in mind,
but it is unsurprising how similar they are. This also
gives insight into how the background of Java and
cross platform, professional code leads to these
language decisions, and how programmers are likely to
speak to one another through them within these environments.

```haxe
/**
 * The main class for saying hello
 */
class Hello {
    /**
     * The main entry point to the application
     */
    static public function main():Void {
        // prints hello
        Sys.println("Hello, world!");
    }
}
```

Once at this level of structure, the code starts to take
a different turn towards the less structured. First, we
drop all of the pretext and just have main methods that
print to the screen. These are quite simple creations. The vast majority
of them in the hello world samples use some variant of the C syntax,
with curly brackets surrounding the code. There is even less
room for expression in something as simple as hell world,
but maybe there does not need to be. Maybe that is the point
in some languages. If you are just making a console application,
anything more than a function that is your entry point
is a bit superfluous. Maybe C had a good idea all the way back then.

```kotlin
/**
 * The main entry point to the application
 */
fun main() {
    // print hello with new line
    println("Hello, World!")
}
```

Haskell and Idris were already highlighted for their interesting
commenting syntaxes, and they also give a good entry to the functional
style, compacting this single method entry while also being somehow
more explicit. Erlang continues in this tradition. The functional
structural style just looks reminiscent of math class. For people who like
or have an entire major or more in math, that can be pretty cool.
It is no surprise many math and science oriented people like these languages.

```erlang
%%% Module: hello
%%% Description: Prints hello to the screen
-module(hello).
-export([main/0]).

%% @doc The main entry point for the application
main() ->
    io:format("Hello, world!~n"),
    ok.
```

Not complete with simplifying only this far at the level of hello world,
a long list of languages drove this even as low as one or two lines. Forth,
still at a low level, defines a word that prints hello to the screen
and then applies that word. This is incredibly unusual thinking for most
people, but it is essentially the exact same thing seen in the MMIXAL
condensed into two lines of code, in the same logical sections one can
split the MMIXAL into.

```forth
: HELLO ( -- ) ." Hello, world!" CR ;
HELLO
```

This is somehow still too much for languages like C# that have reduced
what was once a very Java-like class structure requirement to a single
line calling a method on the Console class. Microsoft can be seen in a
similar position as Eiffel and commercial oriented offerings, and the
code was initially more reminiscent of Java and Haxe. Over the years,
the language has evolved into supporting running a single file from
the command line that can be as simple as this one line of code. The
way C# has been used has continued to evolve, sometimes against the
predictions of its designers. They are a very attentive bunch,
if nothing else, and the language sees regular evolution alongside
the needs of its programmers. The code reducing to this perhaps
speaks to how the programmers using this language are seeking
increasingly small means to say simple things like, "Print hello
to the screen."

```csharp
Console.WriteLine("Hello, world!");
```

Or you eventually end up at results like Ruby. Many web-focused languages
ended up at something similar. Surprisingly simple.

```ruby
puts "Hello, world"
```

A side note for PHP. When you are 12 years old and learning PHP by
writing a little web application, the fact that you can split
HTML and code with these special little brackets around the code was
cool as shit. It is deeply unfortunate when not doing a web application.

```php
<?php
echo "Hello, world!\n";
?>
```

#### Messaging and Memory

In a single line, no langauge quite says as much about messaging as
Smalltalk. The meaning of this line can be read as, "Send the
`nextPutAll` message to `stdout` with the string 'Hello, world!'
as the parameter. Also send new line to stdout."

```smalltalk
stdout nextPutAll: 'Hello, world!'; nl
```

This is basically the same thing that is happening in both assembly
cases. The program pulls the string out of its data segment and
sends it to StdOut via calls to the OS.

Interestingly, Factor brings in a somewhat unique thought model.
Instead of messaging or sending a string in as a parameter to
a function to print to the screen, the clearest way to think
of Factor's code is that the string "Hello, world" is pushed to
the top of the stack, and then print pulls that and prints it
to the string when it is applied. This allows concatenative programming,
which the factor guys are pretty hyped about, even if it can be
obscure to a lot of normal programmers. The model has been around
since assembly--it can be effectively achieved there--as well
as Forth. It is not always the first to be added to a programmer's
toolbox. For the math junkies, this favors function composition
over function application, which is actually really cool.
It is a kind of programming a lot of math and functional people
might enjoy.

```factor
USE: io 
"Hello, world" print
```

Nearly every other language works in the form of calling a method
with a string to print to the screen. Not much else is needed
in terms of messaging. These languages apply the method as soon
as the Turing tape hits that part of the code, so to speak, making
them applicative languages, in comparison to the concatenative ones.
These are often more natural to younger people and beginners without
a lot of math background. It is just kinda simple.

```r
print("Hello, world!")
```

When this is all the code needed to print hello, what room is there
to even discuss memory? Even the assembly simply defines the strings
in a data section and allows to load the memory address of them
from there. The work is mostly declarative. LLVM IR does require
to specify the size of the memory setting aside a bit more
explicitly.

WASM might be the most interesting, and for this project,
created the biggest learning curve in even getting started. The WASM
defines a memory page and a memory segment storing the hello string.
The memory page is exported to the javascript runner, and to print
anything, the script must send the location of the string in the
memory page to the jsprint method. The javascript traverses the
memory page until it finds a null character and uses javascript's
console.log to print it. This is excessively involved compared
to even the normal assembly, let alone every other language.

```wasm
(module
  (import "env" "jsprint" (func $jsprint (param i32)))

  (memory $0 1)
  (data	(i32.const 0) "Hello, world!\00")
  
  (export "pagememory" (memory $0))

  (func $helloworld ;; our "run" method that our js loader will call into
    (call $jsprint (i32.const 0))
  )
  (export "run" (func $helloworld))
)
```

```js
 env: {
    jsprint: function jsprint(byteOffset) {
        var s = '';
        var a = new Uint8Array(memory.buffer);
        for (var i = byteOffset; a[i]; i++) {
            s += String.fromCharCode(a[i]);
        }
        console.log(s);
    }
}
```

The discussion here is not that WASM is a pain in the ass to setup for
this kind of development. It is that it is not designed with the intention
to be used like this as an ordinary development tool. WASM is largely
built expecting other languages to come in and work with it. The human
readable form allows this kind of play, which is an interesting intention
for a language. The fact that lisp was chosen as the form when javascript
is a C-style language also tells about their intents. The two are
intended to be thought of differently.

#### Code Aesthetics

Is the lisp style more beatiful than the pascal style more beautiful
than the C style, or does this go in some other route. It does not
seem to matter. There is a lot of preference involved, and programming
language designers have not shied away from mixing them in interesting
ways. When you have Lisp in WASM being loaded by an obscure bit of
Javascript, things blur already. Whether such monstrosities can be
called beautiful or if they should be relegated to the outskirts of the
internet is debatable.

Ultimately, the simplicity of something like Ruby that simply tells you
what it is doing cannot be mistaken. And yet, once you understand
the words and patterns that appear in something as structured as Eiffel,
the code also has a rhythm to it that is somewhat striking and
overall appealing.

COBOL's strict definitions of columns that can be used for code, as appears
even in hello world forces a rhymth upon the code as well. Viewing
COBOL code that is well structured in VS Code is often pleasant, and
that experience already appears in hello world, despite also contending
with appearing as one of the longer code samples.

The OOP in C style languages give a distinctive hierarchical feel to the code
that escapes even Eiffel. It is perhaps interesting that class hierarchies
often end up being used quite extensively in these languages as well.
The particular OOP style in these languages express and often encourage the
expression of this hierarchical structure.

Smalltalk's messsage based OOP can already be seen as somewhat different.
Stdout is another actor that messages are sent to, and this is
immediately, aesthetically expressed in a sample as simple as hello world.
This is a kind of beauty of its own when it is able to express this
concept in a single line of code. And. Well. Those comments. When you
keep saying "Smalltalk this," and "Smalltalk that," or, "I feel this way
about Smalltalk," and "I feeel that way about Smalltalk," or, "Smalltalk
is kinda weird, man," and "But I kinda like it, y'know?" or, "What the hell
is up with Smalltalk's comments?" and "Does it have something to do with
how it's called Smalltalk--like, y'know, **small talk** among people and
the quotes are talking amongst the programmers, separate from the small
talking among virtual objects as actors in the code?" Well. See.

There is an aesthetic and semantic discussion concerning how strings are
represented. In Smalltalk, all strings are represented in single quote form.
In BASIC, single quotes are comments. In most C-style languages, single
quotes are reserved for single characters and double quotes for full
strings. Some languages allow either of the quote style for wrapping
strings, typically as long as they are used both opening and closing.
Javascript, as an example of another difference, uses the
backtick to denote templates that are typically a form a string.
This can all be a point of contention among programmers who have strong
preferences, of course. Perhaps Smalltalk should be appreciated for
making double quotes comments and solving part of the discussion in their
corner.

There is some interesting choice in languages concerning upper and lower
case that can already be seen in hello world. A lot of modern languages
use lower case for the built in identifiers, but many languages of the
past are conventionally written with upper case identifiers. The lower case
allows more discussion and heated debate about pascal vs camel vs snake case
and other such points of explosive contention. The use of big capital letters
in old code does give this feeling of staring at on old screen and doing
something old people did. That is undoubtedly fun. The lower case
code is a little bit easier on the eyes and sense of modernity.

Using the exclamation point `!` as the comment indicator is absolutely
thrilling. It gives this sense of `BANG THE COMPUTER CAN'T READ THIS!`
It is kind of aesthetically amazing that Simula has both this commenting
style and the explicit `comment ... ;`.

## A note about literate programming

Going through many different programming languages, and especially playing
along with Knuth, the topic of literate programming comes up. This was an
attempt, Knuth included in the lead of, to embed software code within
documentation. Knuth's tools for literate programming were largely based on
TeX, which he also, of course, invented as he continued work on The Art
of Computer Programming. In some respects, this document is an exercise
in literate programming via Markdown, but there is no intention of
running code from it. Jupyter notebooks also have some reminiscence of the
idea of literate programming, mixing markdown with live code in an interesting
environment.

This deserves a mention here, as programmers have a tumultuous
relationship with trying to speak to each other more openly. Some
programmers struggle with comments, let alone separate or even embedded
documentation. The software industry appears constantly teetering between
many different feelings about the importance of code quality and
documentation.

Perhaps there is a place for projects like this to take a deep analysis
at the efforts of programmers to use code as a means of meaning making and
speaking to each other. The means of attempts at speaking to each other
extend beyond the code, and even beyond the comments. This extension is
a necessary part of all the code that can be written for this project.

## Conclusion

There is not much to go with on hello world beyond combing
through some of the more usual semantic discussions about what characters
lead comments and how the basic code is structured in the first
attempt. However, it does turn out that there are quite a few things
to be said about what these different semantic constructs mean to a
programmer and when programmers utilize them. There is even already
some aesthetic discussion to be had.

Setting up 60 languages presented an amazing challenge that can either
be a timesuck or a total obsession. Most people probably do not figure
out how to modify system files and code files within the project they
are trying to use, just to get hello world to work. To be fair, the plan
of this project is to write a lot more code than hello world. Nonetheless,
it was an incredible opening challenge. Instead of just letting Knuth be
notoriously difficult, trying to do it in this form was a little...
creative in style of decision...

When discussing how programmers talk to each other in the literal sense
in code, there is a surprising amount of variation on comments across
the languages. The journey of the semicolon `;` is an interesting one
programming across 60 languages, sometimes included at the start of
comments, sometimes at the end, and sometimes as part of the code
itself. From MMIXAL's free wheeling, comment wherever however you want
format to Smalltalk's oddly aesthically appropriate use of the double
quotes for all comments, programmers can vary a lot. Sometimes, they
put an entire other langauge, like XML, Markdown, or specifications
like doxygen, all into comments in order to better communicate their
intentions with one another.

Beyond the obvious discussion through comments, hello world
also gives us a lens into how programmers, including the language
designers themselves, speak to one another directly through code.
Languages like Eiffel immediately push the user towards documentation
and structure, which can be extremely beneficial in some settings.
Other languages have evolved over time towards a single line sufficing
for the entire hello world application. Others started out there from
their first steps. There are semantics that favor mathematicians and
scientifically oriented programmers, some that are easy for everyone,
and some that take a second to learn but come out with their own beauty.

No one ever asked for this level of detailed analysis about hello
world and the meanings that programmers construct with such a simple
thing. Nonetheless, this seems ultimately fitting conclusion to
writing and running hello world in 60 languages. Of course, it is also
entirely intended to be only the first of many analyses. The basic
ideas approached with hello world will allow for focus on more interesting
ideas in later analyses from this project.

Hopefully, this has been fun for anyone interested in this topic. Nothing
about this is worth doing if it were not for the simple unabashed joy
of having fun with code.
