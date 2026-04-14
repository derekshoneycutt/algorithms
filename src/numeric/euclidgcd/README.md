# Euclid GCD

Given 2 positive integers, m, n, find greatest common divisor;
    that is, the largest positive integer evenly dividing both m, n.

1. [Find remainder.] Divide m by n; let r be remainder. 0 <= r < n.

2. [Is it zero?] If r = 0, return n.

3. [Reduce.] Set m = n, n = r; goto 1.

There is an extra version present in *The Art of Computer Programming* that reduces memory
value move operations by doing two mods before jumping back to the top of the loop. A couple
of these were implemented in this repository, but there is no effort to make that version in
every language, as it is largely superfluous beyond the analytical exercise. For discussion
on these concerns, Knuth analyzes this algorithm well.

## Introduction

Moving from hello world to Euclid's GCD is a signficant step to where the computer is
actually being used to compute things. An algorithm is actually present beyond just
saying hello. This is quite exciting.

Between writing about hello world and writing about this next algorithm, however, I went
on an adventure of setup and reproducibility. Originally, the project only supported Linux
as the OS to run code, but I added deep support for FreeBSD, Windows, and MacOS;
the latter even introducing arm64 assembly. This increased significant difficulty in attempting
to create a simple, reproducible setup. It inherently means that one computer running all
available code is probably just not going to happen in this project. Which is quite okay,
but an easy way to spend an inordinate amount of time burried in setup and compilation of
dependencies.

Eventually, I simplified a lot of the setup issue into a simple initialization script and
a Dockerfile that allows reproducibly creating a build environment for most languages in
the project. Along with continued updates to the run script to support multiple SSH hosts
and a number of docker images to run the code through, it seems that I spent most of the time
in this project so far just writing scripts for setup procedures.

All that said, Euclid's GCD also introduces multiple new ideas over hello world. Most
notably, we have functions, control flow, and math operations. We also used this opportunity
to introduce command line parameter handling by grabbing the first two when they are
available, which also brings in some basic parsing/conversion in many languages.

To be honest, for me, all of this is pretty easy stuff, although it is really interesting to
look at it from the perspective of all these different languages and their exact applications
and differences. As I finish a casual read through Volume 1 of Knuth, I find the
topics all ones I have covered several times in thinking through code. In many
ways, that is why I do not really care to follow trying to talk about the math and everything
in the algorithms, but prefer to speak about what the different languages are saying in
the attempts of writing these algorithms. While I can see someone using my code as a
kind of pedagological reference, this analysis and writing is a bit more about some kind of
critical evaluation of the experience of coding in all these languages.

## Assembly

Getting started with the now four forms of assembly included in this project, perhaps
what needs to be spoken of the most is the standard library. When the GCD algorithms were
first written in assembly for this project, there was no standard library. This has been
expanded since, and much of the code has been updated accordingly.

Of first note, MMIXAL comes in as a unique assembly language, even with the addition of ARM64,
although there are commonalities with ARM64 assembly and MMIXAL that the others do not share,
largely due to the RISC vs CISC backgrounds. MMIXAL and AR64 both use numbered regisers,
such as `$0` and `x0`, compared to x86's `rdi`, `rsi`, `rcx`, and so on. x86-64 does have
some numbered registers at `r8` and above, but the experience is still not the same.

```Assembly
; Euclid's Algorithm (arm64 asm)
euclidgcd:
    .loop:
        udiv x2, x0, x1
        msub x3, x2, x1, x0
        mov x0, x1
        mov x1, x3
        cbz x1, .done
        b .loop

    .done:
        ret
```

The naming of x86 registers may also be part of why POSIX based OSs such as Linux and FreeBSD
use one ABI when calling other methods and Windows used another. This results in a whole
mess of trying to sync which registers are used via %ifidn and %define in NASM and some
compile defines and directives in GAS.

```Assembly
    ; NASM
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
```

Just getting command line arguments turned out to be annoyingly different across different
platforms. MacOS literally passes the argc, argv format in as the first two registers. Linux
and FreeBSD, on the other hand, require pulling all of these off the stack, translating them
to the standard POSIX ABI registers.

```Assembly
    /* GAS assembly for Linux x64 */
default rel

global _start

extern main
extern Exit

.equiv param1, %rdi
.equiv param2, %rsi
.equiv main_return, %rax

.text

_start:
    /* We can pass the same structure that we get on to main quite easily here */
    xorq main_return, main_return
    movq (%rsp), param1
    leaq 8(%rsp), param2
    call main

    movq main_return, param1
    call Exit
```

And then there is Windows. Windows sometimes feels like its own special hell trying
to develop any compatibility in this project. There are some simple hacks like the
define statements, but sometimes, the standard library just has to get dirty and make OS
calls, do some string tokenization, and put together something half assed for Windows for now.

```Assembly
    ; Windows NASM stdlib
    ; In Windows, we call to get the single command line string
    call GetCommandLineA

    ; Then loop through, tokenizing the string by spaces
    xor argc, argc
    xor inQuotes, inQuotes
    xor currLen, currLen
    lea argv, [argvptrs]
    lea currargv, [argvptrs]
    lea currins, [argsstr]
    mov [currargv], currins
    .tokenLoop:
        mov dl, byte [currc]
        cmp dl, 0
        je .tokenLoopDone
```

Now, the reader may be asking about the GCD algorithm in all of this, and really,
the GCD algorithm is probably more beautiful in some versions of assembly than almost
any other language. Yet through the different platforms, we see this concern about ABI
in how the Euclid "function" is called on each platform. Under all these other languages,
this *is* in fact often taking place, and it is mostly just annoying when dealing with
Windows. However, MMIXAL, in its simple educational elegance provides a wonderful example
of how Assembly can be truly kind of beautiful in its own right.

```Assembly
# Euclid's Algorithm (MMIXAL)
Euclid  SWYM
        PREFIX  :EuclidGcd
m       IS      $0
n       IS      $1
t       GREG    0
r       GREG    0
1H      DIV     t,m,n
        GET     r,:rR
        LDA     m,n
        LDA     n,r
        PBNZ    n,1B

9H      SWYM
        POP     1,0

        PREFIX  :

# Efficient Version suggested by Knuth
EuclidEfficient  SWYM
        PREFIX  :EuclidGcdEffic
m       IS      $0
n       IS      $1
t       GREG    0
r       GREG    0
1H      DIV     t,m,n
        GET     m,:rR
        PBZ     m,8F

        DIV     t,n,m
        GET     n,:rR
        PBZ     n,9F

        JMP     1B

8H      LDA     $0,n
9H      POP     1,0

        PREFIX  :
```

There are several language specific things about assembly at this point. In the x86-64
code, it becomes often quite important to save register state into the stack while
calling other methods. This is handled in MMIXAL through register shuffling a little bit
more "automatic" feeling, but careless abuse quickly leads to an absolute mess there, too.
Assembly is difficult to debug. It becomes surprisingly easy to read after time, but assembly
gives little ground to anyone who does not want to walk through nearly each step.

```Assembly
    /* GAS x86-64 assembly */
        pushq %r11
        pushq %rax
        leaq gcdmsg(%rip), param1
        call PrintString
        popq param1
        popq %r11
        movq %r11, param1
        movq $0, param2
        call PrintNumber
        leaq endl(%rip), param1
        call PrintString
```

Even in GAS and NASM, there is a remarkable difference as well. GAS is far more specific,
at baseline, about the size of data being moved, compared, etc. NASM's simplicity can feel
easier to read and write at times, on the other side.

```Assembly
    ; NASM x86_64
        push r11
        push rax
        lea param1, gcdmsg
        call PrintString
        pop param1
        pop r11
        mov param1, r11
        mov param2, 0
        call PrintNumber
        lea param1, endl
        call PrintString
```

Memory access is already making some appearance in all forms of assembly in surprisingly
different ways. MMIXAL largely gets away with `LDA` making the whole experience at this
stage feel easy. With NASM, especially when manipulating the stack and `argv` parameter,
we get some fun `[argv + 8]` syntax. Meanwhile, GAS is takes some adjustments with
`gcdmsg(%rip)` and `8(argv)` in even more areas. And then there is ARM64 assembly that
has several `space@PAGE` and `space@PAGEOFF` areas to access memory, as well as using
the NASM-like syntax of `[x15, #8]`.

```Assembly
        ; ARM64 Assembly
        adrp x0, gcdmsg@PAGE
        add x0, x0, gcdmsg@PAGEOFF
        bl PrintString
        mov x0, x11
        mov x1, 0
        bl PrintNumber
        adrp x0, endl@PAGE
        add x0, x0, endl@PAGEOFF
        bl PrintString
```

Each of these 4 versions of assembly have some apparent differences in purpose. MMIXAL
was written for a deeply pedagological purpose, although it could be made on physical
hardware if someone had the desire to. ARM64 shares some of the most with MMIXAL, although
this appears mostly rooted in the RISC overlap and similar influence on design. ARM64
also appears significantly more like NASM, while also having some of its own unique,
even annoying, features. NASM appears in a similar vein of quite human readable at baseline,
as if these languages to feel somewhat designed to be used by humans. GAS is often used
in association with other language development, and it often feels a bit pedantic and in
need of stretching to fit needs that might be handled by some higher level compiler. Including
a flag definition on the compiler command line to be able to differentiate windows and
POSIX was far more annoying on GAS.

## Intermediate Languages

Speaking so much of assembly languages not necessarily being designed with the human reader
in mind first, LLVM IR and WASM were certainly not designed for the human readers first.
Even suggesting learning either one on social media draws the ire of fanboys who read one
post and insist you should just go learn a different language and compile it down as such.
They are included in this project because it is fun.

LLVM IR feels a little bit like if you were trying to write in GAS assembly but decided
assembly is clearly just not verbose enough about the exact data type you are moving around
at every step of the road. It might have the single ugliest version of the GCD algorithm,
despite having clearly defined functions.

```llvm
; This is the GCD function that calculates the GCD
define i32 @euclidgcd(i32 %min, i32 %nin) {
entry:
    ; We start loading values into temporary variables
    %m = alloca i32, align 4
    %n = alloca i32, align 4
    %r = alloca i32, align 4
    store i32 %min, i32* %m, align 4
    store i32 %nin, i32* %n, align 4
    store i32 0, i32* %r, align 4

    br label %loop.body

loop.body:
    ; Then the loop; loop while n != 0
    %mt = load i32, i32* %m, align 4
    %nt = load i32, i32* %n, align 4
    %rt = srem i32 %mt, %nt
    store i32 %rt, i32* %r, align 4

    store i32 %nt, i32* %m, align 4
    store i32 %rt, i32* %n, align 4

    %cond = icmp ne i32 %rt, 0
    br i1 %cond, label %loop.body, label %loop.end

loop.end:
    ; When n == 0, m is the GCD, we return it
    %final_gcd = load i32, i32* %m, align 4
    ret i32 %final_gcd
}
```

WASM will not provide any relief for those looking for code that is actually easy
to read. From the lisp-y structure that hello world gave us, when representing an actual
algorithm WASM suddenly breaks out in a song of stack-based splendor. This is really
quite surprisingly pleasant to program in after a moment in it, especially coming from
x86 assembly. It feels comfortable and familiar.

```wasm
  ;; This is the GCD function that will calculate the GCD
  (func $euclidgcd (param $m_in i32) (param $n_in i32) (result i32)
    (local $r i32) (local $m i32) (local $n i32)
    local.get $m_in
    local.set $m
    local.get $n_in
    local.set $n

    (loop $loop_label
        local.get $m
        local.get $n
        i32.rem_u
        local.set $r
        
        local.get $n
        local.set $m
        
        local.get $r
        local.set $n

        local.get $n
        i32.const 0
        i32.ne
        br_if $loop_label
    )

    local.get $m
  )
```

Command line arguments are interesting at this level.
Compared to the view of LLVM IR overall, pulling the command line arguments was fairly
standard in appearance. Which is to say not very readable. WASM, on the other hand, would
not have any standard command line argument anything, on account of that just not being
a thing on the web. It would be possible to provide an interface through node to the WASM
to do all of the command line parameter stuff, but this would be entirely artificial. It
is not pursued in this project.

## Stack Based Programming

With WASM introducing stack based programming at this stage, the next stop to Forth and
Factor seems more fitting than ever. These both follow a deeply similar structure overall,
although there are some unique differences each.

Forth arguably has the single most beautiful GCD definition; you can even put it coherently
into a single line of code.

```forth
: euclidgcd ( m n -- gcd ) begin dup 0<> while tuck mod repeat drop ;
```

Factor leans into recursion instead of having a loop, but it is not far off in how
beautiful and simple it appears in the code.

```factor
: euclidgcd ( m n -- gcd )
    dup zero?
    [ drop ]
    [ [ mod ] keep swap euclidgcd ]
    if ;
```

This gives a good first chance to discuss the two major forms of the euclid GCD algorithm
that are represented in the code here. Like forth and the assembly, the standard algorithm
uses a loop, getting the remainder of two values in each iteration. Factor introduces the
recursive version, wherein the algorithm calls itself to continue another iteration instead.
Many compilers will convert a well structured recursive function into a standard loop as seen
in the assembly. Interestingly, the recursive version is often written shorter than the
loop version, but it is interesting that factor and forth somewhat flip that script here.

In this example, the forth really just requires learning what each word means and to think
like forth. However, the factor requires a little bit more of a learning curve to understand
what these brackets are about. There is a remarkable amount said in very little in both of
these languages. In some ways, many other languages seem to be chasing the holy grail of
expressing large ideas in small code, and forth and factor have taken it to a point of
just requiring a bit of a learning curve. They do not take it as far as brainfuck, though
complaints about difficulty to read for new users of the languages are anything but new.

## COBOL

COBOL is also anything but brainfuck. It is actually quite remarkably verbose, and quite
remarkably flexible. There is a remarkable amount of space to standardize to one very
particular style of programming or another.

COBOL begins adding a very strong structure of division and structure to code. The GCD
algorithm is put off into its own section that is called into from the main section.
In this project, COBOL expresses a loop over a label underneath the main GCD code block.
Mostly, this will probably be expressed by just having a loop body, but it is fun to
express interesting ways of code that COBOL does allow.

```cobol
      *    Calculate the GCD using Euclid's method
       IDENTIFICATION DIVISION.
       PROGRAM-ID. EUCLIDGCD.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 D PIC 9(4).
         01 R PIC 9(4).
         LINKAGE SECTION.
         01 M PIC 9(4).
         01 N PIC 9(4).

       PROCEDURE DIVISION USING M, N.
           PERFORM LOOP UNTIL N <= 0.
           EXIT PROGRAM.

      /    This uses a label and loops calling the label each iteration
      /    This can also just be done as a body of the loop
         LOOP.
           DIVIDE M BY N GIVING D REMAINDER R.
           MOVE N TO M.
           MOVE R TO N.

       END PROGRAM EUCLIDGCD.
```

The `DIVIDE M BY N GIVING D REMAINDER R.` is a particularly fun way to program. That is
likely to be a contentious statement to some, but especially in a project openly comparing
four dialects of assembly, this line has a particular beauty to it that is highlighted by
this project, even if perhaps antiquated in feel. The same can be said for
`CALL 'EUCLIDGCD' USING M, N.` These lines make COBOL a genuinely fun, and kind of potentially
beautiful language in its own right.

## Module Begin/End Structured Languages

Folowing COBOL, there is another good group of old langauges that at this stage are all
quite similarly structured around ideas such as Module, Program, even Simulation. Included
in this section will be Fortran, Modula-3, Oberon, Pascal, Ada, Visual Basic, and Simula.
Some of these fall towards the object oriented section that follows, but in this code,
they are not signficantly utilzing an object oriented approach. COBOL could be included
in this very section, but it stands alone in many ways about how code is setup so preceded.

Of these languages, Fortran is different as having the GCD function exist below the
primary main code. Almost all of these languages openly do it the opposite. In a surprising
amount of modern code, it is almost convention to define functions above the main
running code, so this is somewhat unique. However, despite modern convention, this does
force the main application code to be pushed forward and highlighted more than most languages.

```fortran
program EuclidGcdApp
    implicit none

    integer :: m, n, gcd, num_args
    character(len=100) :: buffer ! need to manage our own string buffer for args

    m = 15
    n = 10

    ! Parse the command lines instead of 15 and 10 if 2+ are given.
    num_args = command_argument_count()
    if (num_args > 1) then
        call get_command_argument(1, buffer)
        read(buffer, *) m
        call get_command_argument(2, buffer)
        read(buffer, *) n
    end if

    gcd = euclidgcd(m, n)

    print '(I0, " ", I0)', m, n
    print '("gcd: ", I0)', gcd

contains

    ! Calculate the GCD with Euclid's method
    function euclidgcd(m_in, n_in) result(m)
        integer, intent(in) :: m_in, n_in
        integer :: m, n, gcd

        m = m_in
        n = n_in
        do while (n /= 0)
            gcd = mod(m, n)
            m = n
            n = gcd
        end do
    end function
end program EuclidGcdApp
```

We do see even with Fortran a common pattern of variable definitions. Many of these
languages also have variable definitions at various degrees of what one can call "on top".
This has even made its way to some coding standards of C still to this day, so perhaps this
is an important point, especially as many of these are somewhat historical languages. But
even many with C have moved away from this standard. Although it fits far more explicitly
in many of these languages in a nearly specialized variable location; like with Modula-3.
This feels somewhat like providing an axiomatic base for your functions and applications,
which is perhaps quite nice to a mathematically oriented thinker sometimes.

```modula3
MODULE Main EXPORTS Main;
IMPORT Params,IO,Fmt,Text,Scan;

(* Calculate the GCD using Euclid's Method *)
PROCEDURE EuclidGcd(m, n: INTEGER) : INTEGER =
    VAR r : INTEGER;
    BEGIN
        WHILE n # 0 DO
            r := m MOD n;
            m := n;
            n := r;
        END;
        RETURN m;
    END EuclidGcd;

VAR 
  m, n, gcd: INTEGER;

BEGIN
  (* Look for 2 parameters or use 15, 10 *)
  IF Params.Count > 2 THEN
    m := Scan.Int(Params.Get(1));
    n := Scan.Int(Params.Get(2));
  ELSE
    m := 15;
    n := 10;
  END;

  gcd := EuclidGcd(m, n);
  IO.Put(Fmt.Int(m) & " " & Fmt.Int(n) & "\n");
  IO.Put("gcd: " & Fmt.Int(gcd) & "\n");
END Main.
```

Almmost all of these languages are also good examples of the heavy use of
`Begin...End` styles, which will continue to show up in other languages. The combination is
quite easy to read in Pascal, and it makes code blocks quite easy to identify in
all of the languages. Sometimes the explicit `end` can be easier to identify than
just a change in indentation.

```pascal
program euclidgcd;
    uses SysUtils;

    (* Calculate the GCD of the two numbers with Euclid's algorithm *)
    function gcd(m, n : integer) : integer;
        var r : integer;
    begin
        while n <> 0 do begin
            r := m mod n;
            m := n;
            n := r
        end;
        gcd := m
    end;

    var m, n, value : integer;
begin
    // try to get the first 2 command line arguments or use 15, 10
    if ParamCount >= 2 then begin
        m := StrToInt(ParamStr(1));
        n := StrToInt(ParamStr(2))
    end
    else begin
        m := 15;
        n := 10;
    end;

    value := gcd(m, n);
    WriteLn(m, ' ', n);
    WriteLn('gcd: ', value)
end.
```

Simula is an interesting presence at this point for this section. While many of these
do feel like our GCD function is a part of some larger structure, most of them leave the
code feeling like this is a kind of private function to the particular procedure,
separate from the actual run logic, often with a clear `Begin` to the actual running code.
Instead, Simula feels somewhat like the procedure is less clearly separated. It is plenty
easy to create classes and such in Simula for more separation, but this is still just at
a procedural example for Simula. This feels somewhat more modern than the other languages
in this section, but Simula also feels less explicitly clear with this little structure.

```simula
simulation begin
    ! Calculate the GCD with Euclid's algorithm;
    integer procedure euclidgcd(m, n);
        integer m, n;
    begin
        integer r;
        r := 0;
        while n ne 0 do begin
            r := mod(m, n);
            m := n;
            n := r;
        end;
        euclidgcd := m;
    end;

    ! No command line arguments in Simula, so we just use our default 15, 10;
    integer m, n;
    m := 15; n := 10;

    outint(m, 2); outtext(" "); outint(n, 2); outimage;
    outtext("gcd: "); outint(euclidgcd(m, n), 2); outimage;
end
```

Simula is somewhat known as a predecessor to C++, but the language is quite interesting for,
at this stage of this project, looking more like a very unique Pascal or Modula derivative.

Meanwhile, Oberon is reminiscent of the Assembly work of having to actually manually parse
strings into integer values. This always feels like a pedantic, unpleasant job in any
modern programming, although it can be a fun exercise once or twice. After doing it in a
few assembly languages, having to do it in a high level language is annoying. This is,
of course, not but a minor little complaint at Oberon. Oberon was designed for tasks such
as writing the Oberon OS, so despite its high level feel, it is still ultimately a kind
of low level system language, and this highlights it. Some of the other langauges fit
in a similar space but hide it at this stage of this project well.

```oberon
(* Attempt to convert a string from command line arguments to an integer *)
PROCEDURE StringToInt(s: ARRAY OF CHAR; VAR value: INTEGER): BOOLEAN;
    VAR i, res: INTEGER;
BEGIN
    res := 0;
    i := 0;
    WHILE (s[i] >= "0") & (s[i] <= "9") DO
        res := res * 10 + (ORD(s[i]) - ORD("0"));
        INC(i)
    END;
    value := res;
    RETURN (i > 0);
END StringToInt;
```

Ultimately, all of these languages are clearly higher level than any of the preceding
languages, including COBOL. Except for perhaps Oberon's forcing to parse the strings
manually, the languages all feel quite modern. Of course, this project is quite limited
to single files of code and very simple structure still.

## Object Structured Languages

Continuing in the `begin...end` tradition, Eiffel has a lot of `[do|loop|etc]...end`.
In fact, we must call out the unique `from \ until b = 0 \ loop ... end` looping in
Eiffel. This makes for a unique and kind of uniquely pleasant form of loop to read,
and it continues with Eiffel's insistence on forcing a kind of rhythm to the code.

```eiffel
class
    EUCLIDGCD

create
    make

feature -- Euclid's GCD Algorithm
    euclidgcd (m, n: INTEGER): INTEGER
        -- Gets the greatest common denominator for 2 numbers with Euclid's algorithm
        --
        -- `m`: The first integer to get the common denominator for
        -- `n`: The second integer to get the common denominator for
        -- `Result`: Will be the final, calculated greatest common denominator
        local
            a, b, r: INTEGER
        do
            a := m
            b := n
            from
            until b = 0
            loop
                r := a \\ b
                a := b
                b := r
            end
            Result := a
        end


feature -- Main application entry

    make
        local
            m, n, gcd: INTEGER
            parser: ARG_PARSER
        do
            create parser
            parser.parse
            m := parser.first_integer
            n := parser.second_integer

            gcd := euclidgcd (m, n)
            print (m.out + " " + n.out + "%Ngcd: " + gcd.out + "%N")
        end

end
```

Before letting Eiffel free from gaze, however, it has been a uniquely difficult language
this run. At first, with EiffelStudio, `EUCLIDGCD` could be made to inherit from
the `ARGUMENTS` class, allowing access at command line arguments. However, in the course
of advancing this project to support a docker relay pattern, Liberty Eiffel was also
added for support. This required several modifications to the Eiffel code in order for
either compiler to support it. The most significant of these changes was initiating a
structure to support multiple file builds, especially with Eiffel. Eiffel requires a single
class per file, so requiring a class that inherits ARGUMENTS to process the command
line arguments meant a second file. This ended up being added under a subdirectory
and the run script updated. It is remarkable that this second class continues a kind of
rhythm. This rhythmic code seems natural and inherent to Eiffel, and it is quite pleasant,
even if 2 files seems absolutely silly at this stage of the project. Otherwise, the null
strictness of Liberty Eiffel and Eiffel Studio contradict each other in unique ways, so
code that previously specified `{NONE}` and similar, for example `feature {NONE}` was
pared down to exclude these parts, leaving just examples like `feature`. One or both
compilers complain at some details like this, but compatible code requires minor warnings.

```eiffel
expanded class
    ARG_PARSER
inherit
    ARGUMENTS

feature -- Access
    first_integer: INTEGER
        -- First parsed integer, or default value.
    second_integer: INTEGER
        -- Second parsed integer, or default value.

feature -- Argument parsing
    parse
        -- Parse first two integer arguments; keep defaults (15, 10) if unavailable.
        local
            arg: STRING
        do
            first_integer := 15
            second_integer := 10

            if argument_count > 0 then
                arg := argument (1)
                if arg /= Void then
                    first_integer := arg.to_integer
                end
                if argument_count > 1 then
                    arg := argument (2)
                    if arg /= Void then
                        second_integer := arg.to_integer
                    end
                end
            end
        end

end
```

The other object oriented languages to discuss will inevitably feel a lot less
exciting, surely. They each only take on file, and in fact, each of the ohter languages
pull this off by manipulating only a single class. Java and Haxe are virtually identical.
This seems like an intentional decision on the part of the Haxe designers, as a Java-like
syntax and semantics results in very portable code, which is an extremely high priority
for the Haxe developers. Here we bring in the curly brackets and a deeply hierarchical
sense to the code. While a rhythm begins to develop, it is more hierarchical than Eiffel's
rhythm, and thus not quite as fluid and pleasant to read.

```haxe
class EuclidGcd {
    /**
     * Calculates the GCD with Euclid's method
     * @param m The first value to calculate GCD for
     * @param n The second value to calculate GCD for
     * @return The calculated GCD value
     */
    static public function gcd(m: Int, n: Int): Int {
        var r:Int = 0;
        while (n != 0) {
            r = m % n;
            m = n;
            n = r;
        }
        return m;
    }

    /**
     * The main entry point to the application
     */
    static public function main():Void {
        var args:Array<String> = Sys.args();
        var m:Int = 15;
        var n:Int = 10;

        if (args.length >= 2) {
            m = Std.parseInt(args[0]);
            n = Std.parseInt(args[1]);
        }

        var gcd:Int = gcd(m, n);

        Sys.println('$m $n');
        Sys.println('gcd: $gcd');
    }
}
```

Finally, the last of the major, explicitly object oriented languages for discussion
with this algorithm level is Smalltalk. Just look at it.

```smalltalk
Integer extend [
    " Calculate the GCD with Euclid's algorithm "
    euclidGcd: anInteger [
        | m n |
        m := self.
        n := anInteger.
        [ n = 0 ] whileFalse: [
            | r |
            r := m \\ n.
            m := n.
            n := r 
        ].
        ^ m
    ]
]

| m n gcd argc argv |
m := 15.
n := 10.
" Attempt to use the command line arguments if they are available "
argc := Smalltalk getArgc.
( argc > 1 ) ifTrue: [ 
    argv := Smalltalk arguments.
    m := (argv at: 1) asInteger.
    n := (argv at: 2) asInteger.
].

gcd := m euclidGcd: n.

stdout nextPutAll: (m asString, ' ', n asString); nl
stdout nextPutAll: ('gcd: ', gcd asString); nl
```

Sure, everything is an object now. Instead of just a standalone procedural function,
the `euclidGcd` operation is defined as a message to an instance of `Integer`, with
another integer as its parameter. Somehow this entirely escapes the hierarchical feel
of Java and Haxe into some kind of remarkable relational representation of roles.
It does not quite have the rhythm that makes Eiffel such a pleasant language to read,
but Smalltalk has its own beauty to it at the end of the day. The definition of variables
inside enclosed pipes, if and whilte statements structured as messages to conditionals,
and even the square bracketed code blocks. These are remarkably unique choices among all
the languages in this project, and they give Smalltalk a feel that feel that none of
the other languages quite capture. The idea of messaging between objects continues to
be a uniquely beautiful aspect of Smalltalk in general.

## Erlang Family

That idea of inter-object messaging almost begs a consideration of the Erlang family,
with the strength of the actor model that Erlang in particular brings to the table.
For the most part, this kind of unnecessary structure is left out at this stage of the
project, but this would leave these languages as basically just standard among the
functional styles. Starting with Erlang, a print process is spawned, and a message
sent with the values to calculate GCD. This results in a highly unique structure
that somewhat recreates Smalltalk's everything as a message but within a more functional
approach.

```erlang
%% @doc Calculates the GCD between two values with recursive form of Euclid's algorithm
%% 
%% @param m The first value to calculate the GCD for
%% @param n The second value to calculate the GCD for
%% @returns The GCD between the two values
euclidgcd(M, 0) -> M;
euclidgcd(M, N) -> euclidgcd(N, M rem N).

%% @doc Prints the two values and the GCD to the screen; using erlang process comms
print_all() ->
    receive
        {M, N} -> io:format("~p ~p~ngcd: ~p~n", [M, N, euclidgcd(M, N)])
    end.

%% @doc The main entry point to the application
main() ->
    % We spawn the print process and then send it the values we want to print
    % just to get familiar with erlang's patterns
    P = spawn(euclidgcd, print_all, []),
    Args = init:get_plain_arguments(),
    case Args of
        [Arg1Str, Arg2Str] ->
            P ! {list_to_integer(Arg1Str), list_to_integer(Arg2Str)};
        _Other ->
            P ! {15, 10}
    end,
    ok.
```

Erlang highlights a functional style for GCD, using pattern matching to create a
simple and beautiful version of Euclid's GCD. This style might compare with Forth
for beauty, although Forth really shines in not having pattern matching to interpret, even.
Erlang's processes and message sending are almost immediately highlighted with even
this simple use, however. The `P ! {message}` pattern is truly a beautiful touch that
its descendants all feel decidedly less than for not creating a version of. Pattern matching
again becomes central in the receiving `print_all` process method and in processing
the command line arguments. Even the use of commas and periods and semicolons to
denote meaning through the application in an almost human langauge style is a nice,
beautiful touch for Erlang, making this a quite pleasant language, even intentionally
adding a layer of unecessary complexity.

Elixir is somewhat similarly elegant. Of note for Elixir, however, in the process of
updating the project in this step, Elixir was moved to a pre-compile flow instead of a
scripting flow. The scripting flow allows code at main level to be run as the file is run
as a script. Moving to a compilation stage, all functions must be in a module and the main
code in the main function. This moved the code to reminiscent of the Pascal
type languages. It does still maintain a degree of Erlang's elegance, even adding an
interesting `async/await` style tasking, despite `send` just being a normal function now.

```elixir
defmodule Euclidgcd do
  @moduledoc """
    This module contains the functions for calculate and displaying
    the GCD of two values.
  """

  @doc """
    Calculates the GCD via the recursive form of Euclid's algorithm
  """
  def gcd(m, 0), do: m
  def gcd(m, n), do: gcd(n, rem(m, n))

  @doc """
    Waits for a message with two values and then prints it and their
    GCD to the screen
  """
  def print_all() do
    receive do
      {m, n} -> IO.puts("#{m} #{n}\ngcd: #{Euclidgcd.gcd(m, n)}")
    end
  end

  @doc """
  The main entry point for our application
  """
  def main(args) do
    # Just for fun, we use Task.async to show what it does.
    task = Task.async(fn -> Euclidgcd.print_all() end)

    case args do
      [arg1, arg2] ->
        send(task.pid, {String.to_integer(arg1), String.to_integer(arg2)})
      _ ->
        send(task.pid, {15, 10})
    end

    Task.await(task)
  end
end
```

For how uniquely elegant and beautiful Erlang is with this actor model, Gleam shows where
trying to implement this without such elegant language-level features can turn quite
ugly. The benefit at this stage is mostly gone and Gleam feels overengineered and ugly
with the complexity. For being a descendant of Erlang, this is somewhat surprising. Of
course, it is entirely unecessary to do this kind of complexity at this level, so adding
it into Gleam may be unfair. Nonetheless, it provides an opportunity to compare languages
over this pattern at a very interesting isolation.

```gleam
/// Calculates the GCD betwen m and n using Euclid's method
fn euclidgcd(m: Int, n: Int) -> Int {
  case n {
    0 -> m
    _ -> euclidgcd(n, m % n)
  }
}

/// Type describing a message with a subject that sends/receives tuples of 2 integers
pub type TupleSubjectMessage {
  RegisterChild(process.Subject(#(Int, Int)))
}

/// Calculates and prints the gcd of m and n
fn printgcd(subjectout) {
  let subjectin = process.new_subject()
  process.send(subjectout, RegisterChild(subjectin))
  let msg = process.receive(subjectin, within: 1000)
  case msg {
    Ok(#(m, n)) -> {
      let gcd = euclidgcd(m, n)
      printf("~b ~b~ngcd: ~b~n", [m, n, gcd])
    }
    _ -> println("Unknown path traversed.")
  }
}

/// Receives a message containing just a Subject object on the main subject
fn receivesubject(main_subject) {
  let sendermsg = process.receive(main_subject, within: 1000)
  case sendermsg {
    Ok(RegisterChild(subject)) -> subject
    _ -> panic as "Failed to receive subject."
  }
}

/// The main entry point to the application
pub fn main() {
  // Start the printing process with a subject
  let main_subject = process.new_subject()
  process.spawn(fn() { printgcd(main_subject) })

  let numbers_subject = receivesubject(main_subject)
  case argv.load().arguments {
    [sm, sn] ->
      case int.parse(sm), int.parse(sn) {
        Ok(m), Ok(n) -> process.send(numbers_subject, #(m, n))
        _, _ -> process.send(numbers_subject, #(15, 10))
      }
    _ -> process.send(numbers_subject, #(15, 10))
  }
}
```

Having explained the Erlang family, these three would ordinarily be all that would
be included in this. Like Erlang, F# would be a pretty standard functional style
algorithm, using a recursive format with basic pattern matching. With a lot of experience
in .NET already, this project proceeded to add a MailboxProcessor function to the F#
code for euclidgcd as well, running the process in an `async` block.

```fsharp
/// <summary>
/// Calculate the GCD of two values using Euclid's method
/// </summary>
/// <param name="m">The first value to calculate the GCD for</param>
/// <param name="n">The second value to calculate the GCD for</param>
/// <returns>The GCD for the two values</returns>
let rec euclidgcd (m: int, n: int) =
    match n with
    | 0 -> m
    | _ -> euclidgcd(n, m % n)

// Type definition for the messages we will be sending to the mailbox process,
// including a reply channel to wait for responses on
type NumsMsg = ProcessTuple of (int * int) * AsyncReplyChannel<unit>

// For fun with F#, we show using MailboxProcessor for messaging as well
// This creates a background task that calculates and prints GCD from 2 values.
let mailbox =
    MailboxProcessor.Start(fun inbox ->
        let rec receiver() = async {
            let! (ProcessTuple((m, n), replyChannel)) = inbox.Receive()
            printfn($"{m} {n}\ngcd: {euclidgcd(m, n)}")
            replyChannel.Reply()
            return! receiver()
        }
        receiver()
    )

async {
// We either get the first two values from the command line or use 15, 10
// and just send this pair to the mailbox
    mailbox.PostAndReply(fun reply ->
        let args = System.Environment.GetCommandLineArgs()
        if args.Length >= 3 then
            ProcessTuple((args[1] |> int, args[2] |> int), reply)
        else ProcessTuple((15, 10), reply))
} |> Async.RunSynchronously
```

This did not quite come out as elegant and beautiful as the Erlang version of the
same overall architecture. Yet it also shows a lot of unique features of .NET
languages, and especially F#, with the async code and the `let!` and `return!`
syntax to await on the async task. This is different from what a C# programmer
might be used to, though it has extremely similar meaning in the end.

## The C Fmaily

Compared to F#, C# drops into a completely standard C-style solution for this
level of the project. After remarking at how small Erlang would be without exploring
the actor model as part of this algorithm's step, the simple C# version takes up
a comparably remarkable amount of space.

```csharp
/// <summary>
/// Calculate the gcd between two values with Euclid's method
/// </summary>
/// <param name="m">The first value to calculate GCD for</param>
/// <param name="n">The second value to calculate GCD for</param>
/// <returns>The calculated GCD</returns>
static int euclidgcd(int m, int n)
{
    int r = 0;
    while (n != 0)
    {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

// Get the values from the command line or use 15, 10
int m = 15;
int n = 10;
if (args.Length >= 2)
{
    (m, n) = (Int32.Parse(args[0]), Int32.Parse(args[1]));
}

Console.WriteLine($"{m} {n}");
Console.WriteLine($"gcd: {euclidgcd(m, n)}");
```

Most of the C language family hardly varies from this basic setup, either.
Even C, simply adding a `main` function, still looks mostly identical at such a
superficial algorithm.

```c
/**
 * Calculates the GCD using Euclid's method
 * 
 * @param m The first value to calculate the GCD for
 * @param n The second value to calculate the GCD for
 * @returns The calculated GCD
 */
int euclidgcd(int m, int n)
{
    int r = 0;
    while (n != 0)
    {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

/**
 * The main entry point to the application
 * 
 * @param argc The number of arguments on the command line
 * @param argv The array of command line arguments given
 * @returns 0
 */
int main(int argc, char *argv[])
{
    int m = 15;
    int n = 10;

    if (argc >= 3)
    {
        m = atoi(argv[1]);
        n = atoi(argv[2]);
    }

    printf("%d %d\ngcd: %d\n", m, n, euclidgcd(m, n));

    return 0;
}
```

Skipped over in some of the earlier code, Rust provides a good example to bring
up how some languages have taken advantage of immutable versus mutable variables.
In Rust, this is remarkably explicit with the `mut` keyword. In some other languages,
function parameters were naturally immutable, resulting in some of the same `m_in, n_in`
style as Rust also displays. Also of note, Rust skips the `argc, argv` pattern for
a `std::env::args().collect()` that is more similar to several non-C languages as well.
Finally, the inline `if` of Rust is almost like Julia or some other language with similar
if statements. All of these combine to make Rust not necessarily as C as many of the others,
let alone minor syntactic differences like `fn` as well. However, opening a C file and then
a Rust file feels remarkably comfortable. It really already makes some sense how a project
like the Linux kernel could include both languages.

```rust
/// Calculate the GCD for two values with Euclid's algorithm.
/// 
/// # Arguments
/// * `m_in` - The first value to calculate the GCD for.
/// * `n_in` - The second value to calculate the GCD for.
/// 
/// # Returns
/// The calculated GCD of the two values.
fn euclidgcd(m_in: i64, n_in: i64) -> i64 {
    let mut m = m_in;
    let mut n = n_in;
    let mut r;
    while n != 0 {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

/// The main entry point to the application
fn main() {
    let args: Vec<_> = std::env::args().collect();

    let m = if args.len() >= 3 {
         args[1].parse().expect("Bad value in input 1.") }
         else { 15 };
    let n = if args.len() >= 3 {
         args[2].parse().expect("Bad value in input 2.") }
         else { 10 };

    println!("{} {}", m, n);
    println!("gcd: {}", euclidgcd(m, n));
}
```

Feeling surprisingly similar to and yet quite different from Rust, Zig is another interesting
language at this stage. It still feels deeply C-like. However, in order to get the command
line arguments and process them, an allocator is required. The allocators feel significantly
less stable than less new languages, requiring a change of the allocator used in this very
code due to updates to Zig on the development Docker. Ultimately, this proved to be a minor,
easily solved hiccup, but it was quite annoying. While the allocators provide fine-grained
and somewhat easy memory management, they also just add a lot of ugly fluff to the code. The
one really interesting thing that Zig brings in with this is the `defer` keyword, causing a
C++-RAII type cleanup at the end of a codeblock. These are all quite interesting language
decisions, and the resulting code stands out while still feeling deeply C-like.

```zig
/// Calculates the GCD of two values using Euclid's algorithm.
/// 
/// Parameters
/// -----------
/// - `m_in` : The first value to compute the GCD for.
/// - `n_in` : The second value to compute the GCD for.
/// 
/// Returns
/// -----------
/// The calculated GCD value.
fn euclidgcd(m_in: i32, n_in: i32) i32 {
    var r: i32 = 0;
    var m = m_in;
    var n = n_in;
    while (n != 0) {
        r = @rem(m, n);
        m = n;
        n = r;
    }
    return m;
}

/// The main entry point of the application
pub fn main(init: std.process.Init) !void {
    // We need an allocator to pull the command line arguments in Zig
    var gpa = std.heap.DebugAllocator(.{}){};
    const allocator = gpa.allocator();
    defer _ = gpa.deinit();

    // pull the command line arguments into a new array
    var args = try init.minimal.args.iterateAllocator(allocator);
    defer args.deinit();
    _ = args.next();

    // if we have 2+ arguments, try to parse them into m and n or fall back to 15, 10
    var m: i32 = 15;
    var n: i32 = 10;
    if (args.next()) |arg1| {
        m = std.fmt.parseInt(i32, arg1, 10) catch 15;
        if (args.next()) |arg2| {
            n = std.fmt.parseInt(i32, arg2, 10) catch 10;
        }
    }

    const gcd = euclidgcd(m, n);

    std.debug.print("{} {}\ngcd: {}\n", .{ m, n, gcd });
}
```

Most of the remaining languages such as Objective C, C++, D, Dart, Go, Kotlin, Ballerina, and V
are all remarkably similar, largely bringing in similar ideas through uniquely different syntaxes.
As a final note, Ballerina stands out not just for being quite intentional yet concise and having
tooling that is surprisingly remarkable with simple VS Code extensions. Right within the code,
there are full visualization tools that can be useful, especially engaging with juniors over tough
integration tasks. In terms of command line parameters, Ballerina is also a wonderful example of a
language that builds command line parameter parsing into the selection of parameters in the main
function, even allowing default values right in the parameter definition. This makes it
ridiculously easy and kind of beautiful across the languages that enable this.

```ballerina
# Calculate the GCD of 2 values via Euclid's method
# 
# + m_in - The first value to calculate GCD for
# + n_in - The second value to calculate GCD for
# + return - The calculated GCD for the two values
function gcd(int m_in, int n_in) returns int {
    int r = 0;
    int m = m_in;
    int n = n_in;
    while (n != 0) {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

# The main entry point to the application
# 
# + m - The first value to calculate GCD for; defualts to 15
# + n - The second value to caluclate GCD for; defaults to 10
public function main(int m = 15, int n = 10) {
    io:println(`${m} ${n}`);
    io:println(`gcd: ${gcd(m, n)}`);
}
```

## Script-y C-y Fun

Heading the next section suggestive of scripting is somewhat of a misnomer of the languages that
follow. Nonetheless, they have links to scripting both historically and in the particular design
of their resulting code. In many respects, C# was the first of these as it forewent the `main`
function. This is a common pattern of all the languages in this group. C# remains unique about this,
as at one point the language would have been in the Java-like object-oriented section.
As the langauge evolved, it has fallen all the way to be a good first example of the patterns
representing this group. It can even be run simply with `dotnet run euclidgcd.cs`. This was remarked
in the hello world analysis as well, but a language that evolves so freely may dance across
sections of different analyses.

Tcl is a standout unique case in the group. In this example, we get a much deeper dive into
the philosophy driving the language: how data is stored in strings, how each line represents
a command, and the unique handling of variables. `set r [expr {$m % $n}]` is a great example
of how Tcl stands quite alone in all of the languages. This can be difficult to read at times,
but it can be almost obvious in certain application contexts where you can interact with
individual lines of commands. For example, some chat programs will include a prompt wherein
the command structure of Tcl works great, leading to Tcl and Tcl-like languages not being
uncommon in chat programs. It has a deep relation to shell scripting in some ways due to this
command structure, while feeling more intentional as a programming language of sorts, too.

```tcl
# Calculate the GCD with Euclid's algorithm
proc euclidgcd {m n} {
    while {$n != 0} {
        set r [expr {$m % $n}]
        set m $n
        set n $r
    }
    return $m
}

# Try to get the first two command line parameters or use 15, 10
set m 15
set n 10
if {$argc > 1} {
    set m_maybe [lindex $argv 0]
    set n_maybe [lindex $argv 1]
    if {[string is integer -strict $m_maybe]
        && [string is integer -strict $n_maybe]} {
        set m [expr {int($m_maybe)}]
        set n [expr {int($n_maybe)}]
    }
}

set gcd [euclidgcd $m $n]

puts "$m $n\ngcd: $gcd\n"
```

Noting the `$` prefixing variables in Tcl, Perl and PHP also highlight the same pattern.
Perl takes it a step further, using a `@` to prefix the command line argument collection,
but it still also uses `$_[0]` for subroutine parameter access, which is interesting.
Perl's decomposition of the command line arguments with a simple `($m, $n) = @ARGV` is hard
to beat. In some ways, given the lack of main entry point otherwise, the only thing that
could make this simpler is defining the defaults on the same line, but Perl does not give such
expediences. Nonetheless, it is nice to simply decomposition the `@ARGV` collection and carry on.

```perl
# Calculate the GCD using Euclid's algorithm
sub euclidgcd {
    my $m = $_[0];
    my $n = $_[1];
    my $r;
    while ($n != 0) {
        $r = $m % $n;
        $m = $n;
        $n = $r;
    }
    return $m;
}

my $m = 15;
my $n = 10;

if (@ARGV >= 2) {
    ($m, $n) = @ARGV;
}

my $gcd = euclidgcd($m, $n);

print "$m $n\ngcd: $gcd\n";
```

By the time the focus moves on to typescript, the `$` prefix is dropped and static typing
is introduced. This is somewhat forced into typescript, on top of a javascript base. Swift
also offers static typing. This has been popular in some circles, as strong static typing
can prevent mistakes that are especially common among juniors and tired or drunk programmers.
it ultimately does not change much of anything about what the code says to the reader at this
stage except for the extra level of pedantry that takes us back to C.

```swift
/// Calculates the GCD using Euclid's algorithm
/// 
/// Parameters
/// ------------
/// - `m_in`: The first value to calculate the GCD for
/// - `n_in`: The second value to calculate the GCD for
/// 
/// Returns
/// ------------
/// The calculated GCD value
func euclidgcd(m_in: Int, n_in: Int) -> Int {
    var m = m_in
    var n = n_in
    var r = 0
    while (n != 0) {
        r = m % n
        m = n
        n = r
    }
    return m
}

// Attempt to get first 2 command line arguments, or 15, 10
var m = 15
var n = 10
if (CommandLine.argc >= 3) {
    m = Int(CommandLine.arguments[1]) ?? 15
    n = Int(CommandLine.arguments[2]) ?? 10
}

let gcd = euclidgcd(m_in: m, n_in: n)

print("\(m) \(n)")
print("gcd: \(gcd)")
```

Other langauges that follow patterns seen in this section include PHP and R. These each have
some unique qualities, but nothing of significant note at this stage.

## The Bracketless Scripters

Moving away from the overly C-style class script-style languages, there is a large class of
languages often highlighted by Python, Julia, MATLAB/Octave, and sometimes flavors of BASIC
and similar languages. Some of these languages can be used for high performance, even
system level code, but many are also often used for quick scripts and tools, or they lean into
particular purposes otherwise.

Icon still has some similarities to previous langauges, bringing back the `begin...end` style
blocks from other languages, although it also uses curly brackets for some `if` and other
styles of code.

```icon
# The procedure to calculate GCD
procedure euclidgcd(m, n)
    local r
    while n ~= 0 do {
        r := m % n
        m := n
        n := r
    }
    return m
end

# Main procedure for the application; just gets numbers and calcs gcd
procedure main(args)
    local m, n, gcd

    m := 15
    n := 10
    if *args >= 2 then {
        m := args[1]
        n := args[2]
    }

    gcd := euclidgcd(m, n)
    write(string(m), " ", string(n))
    write("gcd: ", string(gcd))
end
```

FreeBASIC follows in the usual BASIC syntax with the `End Function` etc as well, but completely
takes out the curly brackets, favoring various forms of `End` instead to denote the end
of a code block. This makes it easy to read, and quite... basic. The `Dim` language for BASIC
is unique and expressive, making its largest initial show at this stage as well. As a descendant
of the ALGOL family, it has taken a significantly differnet direction than Pascal, but there are
still deep similarities in how the two languages read, despite their significant differences. It
is ultimately no accident the Visual Basic code best fits alongside Pascal. Nonetheless, the
FreeBASIC is more closely structured like Icon or Julia here.

```basic
' Calculates the GCD using Euclid's method
Function EuclidGcd(m As Integer, n As Integer) As Integer
    Dim As Integer r
    While n <> 0
        r = m Mod n
        m = n
        n = r
    Wend
    Return m
End Function

Dim As Integer m = 15
Dim As Integer n = 10

' If there are at least 2 command line arguments, parse and use them
' as the values for GCD; otherwise stay with 15, 10
If __FB_ARGC__ >= 3 Then
    m = ValInt(Command(1))
    n = ValInt(Command(2))
End If

Print Using "### ###"; m; n
Dim As Integer gcd = EuclidGcd(m, n)
Print Using "gcd: ###"; gcd
```

At this point, Julia, Lua, Ruby, and even Octave look remarkably alike. There is a minor
syntactical change here and there, but they are largely like some kind of simplified down
Pascal, Fortran like style. There is not much to add about them, they are an interesting addition
along the way of languages.

```ruby
# Calculate the GCD using Euclid's algorithm
def euclidgcd(m, n)
    while n != 0
        r = m % n
        m = n
        n = r
    end
    return m
end

# Attempt to get the first to command line arguments or use 15, 10
m = 15
n = 10
if ARGV.length >= 2
    m = ARGV[0].to_i
    n = ARGV[1].to_i
end

puts "#{m} #{n}"
puts "gcd: #{euclidgcd(m, n)}"
```

Somehow, from this, the family including Python, Mojo, and Nim feel like little more
than removing the `end` and relying entirely on whitespace to differentiate code blocks.
This ends up being quite unique. The code in this project has used indentation and whitespace
to make code readable regardless of the language, but this class outright enforces it. This
can be really good for forcing good practices on new learners, and python often ends up a
recommended first language in part from this, in addition to just being an easy language to learn.
The use of semicolon to lead an indented code block is a noteful addition to the syntax,
and perhaps the biggest noteable use of nearly human language sensical punctuation making its
way into code since Erlang. Nim is given as an example of this class here. Nim provides
an interesting syntax for variable declaration that also takes from this larger syntax move.

```nim
# Calculates the GCD of two values using Euclid's algorithm
proc euclidgcd(m_in: int, n_in: int): int =
    var
        r = 0
        m = m_in
        n = n_in
    while n != 0:
        r = m mod n
        m = n
        n = r
    return m

var
    m = 15
    n = 10

# parse the first 2 parameters, or just use the default
if paramCount() > 1:
    m = parseInt(paramStr(1))
    n = parseInt(paramStr(2))

let gcd = euclidgcd(m, n)

echo &"{m} {n}"
echo &"gcd: {gcd}"
```

This covers the significant primarily procedural languages that the Euclid GCD was implemented
in. Some of these languages included significant structure, like a program of their own, while
others are short and simple, appearing like a script more than an application.

## Functional Heavy Languages

The remaining languages are largely functional heavy style languages. Among the first to look at
is Scala, which is easy to see online discussion of as a good intermediary between procedural
and functional styles. There is a deep Java feel to it, as it runs on the JVM, but this project
actively takes it into the more functional style offered. This means a return to the recursive
algorithm and pattern matching for control flow. The remaining code will largely all follow
this approach.

```scala
/**
 * Calculates the GCD of two values using Euclid's algorithm.
 *
 * @param m The first value to calculate the GCD for
 * @param n The second value to calculate the GCD for
 * @return The calculated GCD value
 */
@tailrec
def euclidgcd(m: Int, n: Int): Int =
  n match {
    case 0 => m
    case _ => euclidgcd(n, m % n)
  }

/**
 * The main entry point to the application
 */
@main
def main(m: Int = 15, n: Int = 10): Unit =
  val gcd = euclidgcd(m, n)
  println(f"$m $n")
  println(f"gcd: $gcd")
```

Kit and Ocaml follow a similar functional style, even simplifying it as they focus in on
being functional languages. Ocaml is particularly interesting for actualy having `if`
statements, although they are much like the inline `if` statements previously pointed
out in Rust. So, Ocaml and Rust share an interesting syntax, and it is interesting for
both of their respective families. The combination of simple, word based syntax makes
Ocaml short and beautiful for this code sample. It approaches the beauty of Forth for
this project, although falling just short.

```ocaml
(* Get the GCD via recrusive form of Euclid's algorithm *)
let rec euclidgcd m n = 
  if n = 0 then m else euclidgcd n (m mod n);;

(* Parse a command line argument as an integer; or return default *)
let argAsInt index default =
  if (Array.length Sys.argv) >= 3 then
    (int_of_string Sys.argv.(index)) else default;;

(* Get the command line arguments, or 15, 10 *)
let m = argAsInt 1 15 in
let n = argAsInt 2 10 in
let result = euclidgcd m n in
Printf.printf "%d %d\ngcd: %d\n" m n result;;
```

Diving deeper into functional land, Haskell and Idris provide us a start at clear lambda
calculus style function definitions. The use of Maybe, Just, and Nothing, is also particularly
strong in Haskell's case. To those familiar with type theory and forms of lambda calculus, this
syntax can be really great. It is often used in formal proofs, making Haskell a great
candidate for translation from formal proofs to formal applications. It also makes both
Haskell and Idris a uniquely beautiful form, although a little bit pompous about it.

```haskell
-- | Calculate the GCD of two values using the recursive form of Euclid's algorithm
euclidgcd :: Integer -> Integer -> Integer
euclidgcd m 0 = m
euclidgcd m n = euclidgcd n (m `mod` n)

-- | Attempt to get 2 values from a list, or return Nothing
tryPair :: [String] -> Maybe (String, String)
tryPair (x : y : xs) = Just (x, y)
tryPair _ = Nothing

-- | Get the first value from a pair, or a default value if pair is Nothing
firstOrDefault :: (Maybe (String, String)) -> Integer -> Integer
firstOrDefault (Just (x, y)) _ = (read x :: Integer)
firstOrDefault Nothing v = v

-- | Get the second value from a pair, or a default value if pair is Nothing
secondOrDefault :: (Maybe (String, String)) -> Integer -> Integer
secondOrDefault (Just (x, y)) _ = (read y :: Integer)
secondOrDefault Nothing v = v

-- | The main entry point to the application
main :: IO ()
main = do
    -- First, we get the command line arguments or 15, 10 if not available
    args <- getArgs
    let twoArgs = tryPair args
    let m = firstOrDefault twoArgs 15
    let n = secondOrDefault twoArgs 10

    -- Then calculate and print
    let gcd = euclidgcd m n
    putStrLn $ show m ++ " " ++ show n
    putStrLn $ "gcd: " ++ show gcd
```

Mercury stands out with its interface and implementation sections. At first, this seems like
an extremely thick header full of nonsense, which is not a compliment. However, it contains
a definition header of the methods. For old C/C++ programmers used to header files with
light definitions of functions, this will feel almost like home, and yet here it is,
buried into an obscure functional language. It proves to be fun language to program in,
and although kind of wordy, elegant in a similar pompous way to Haskell, though distinct.
The tooling for Mercury also includes a lot of determinism checks during compilation, which
can be fun to figure out while initially coding or making subtle changes to an algorithm.
The language tooling lets one get away with less here.

```mercury
:- module euclidgcd.

:- interface.
:- import_module io.
:- import_module int.

:- pred main(io::di, io::uo) is cc_multi.
:- pred euclidgcd(int::in, int::in, int::out) is multi.

:- implementation.
:- import_module list.
:- import_module string.

/**
 *  Calculates the GCD of M and N, putting it in Gcd
 */
euclidgcd(M, 0, M) :- M > 0.
euclidgcd(M, N, Gcd) :-
    R = M mod N,
    euclidgcd(N, R, Gcd).

/**
 *  The main entry point to our application
 */
main(!IO) :-
    io.command_line_arguments(Args, !IO),
    ( Args = [Arg1, Arg2 | _] ->
        ( if string.to_int(string.strip(Arg1), M_Temp) then
            M = M_Temp
          else
            M = 15
        ),
        ( if string.to_int(string.strip(Arg2), N_Temp) then
            N = N_Temp
          else
            N = 10
        )
      ;
        M = 15,
        N = 10
    ),
    euclidgcd(M, N, Gcd),
    io.format("%d %d\ngcd: %d\n", [i(M), i(N), i(Gcd)], !IO).
```

Interestingly, the Euclid GCD algorithm is almost identical in Prolog and Mercury.

```prolog
/**
 * euclidgcd(M, N, Gcd)
 *
 * Calculates the greatest common denominator between 2 values
 */
euclidgcd(M, 0, M) :- M > 0.
euclidgcd(M, N, Gcd) :-
    R is M mod N,
    euclidgcd(N, R, Gcd).
```

## Lisp

The final three languages follow the functional style, but in the endless parentheses
of the Lisp style: Clojure, Scheme, and Racket. Scheme and Racket are virtually identical
at this point. There just is not enough in this simple algorithm to differentiate the two.
The differences between Clojure and those two is almost entirely just word choice and minor
syntax differences. Following the previous functional code, it is all quite straightforward,
just requiring the skill of reading the parentheses and Polish notation.

```clojure
; Calculates the GCD via recursive form of Euclid's algorithm 
(defn euclidgcd [m n]
  (if (= n 0)
    m
    (euclidgcd n (rem m n))))

; Gets a command line argument as an integer value
(defn argAsInt [args index default]
  (if (>= (count args) 3)
    (Integer/valueOf (nth args index))
    default))

; Our main run code; pulls the command line arguments OR 15, 10, calculates
; GCD and prints them all to the screen.
(let [args *command-line-args*
      m (argAsInt args 1 15)
      n (argAsInt args 2 10)
      gcd (euclidgcd m n)]
  (printf "%d %d\ngcd: %d\n" m n gcd))
```

In this sample, even the function names are defined the same. This will be true, and
there will likely be a great deal of all three of these. They are all three dialects
of Lisp. Racket is a derived dialect of Scheme. This makes programming in this project
between these three really nice, but tempting to not explore their differences.
Scheme at this stage tends to just fully embrace the parentheses while Clojure continues
using some square brackets.

```scheme
; Calculate the GCD with the recursive form of Euclid's algorithm
(define (euclidgcd m n)
    (if (= n 0)
        m
        (euclidgcd n (remainder m n))))

; Get a command line argument as an argument or return a default value
(define (argAsInt args index default)
    (if (>= (length args) 3)
        (string->number (list-ref args index))
        default))

; Try to get the first two command line arguments and calculate and display the gcd
(let* ((args (command-line))
       (arg1 (argAsInt args 1 15))
       (arg2 (argAsInt args 2 10))
       (gcd (euclidgcd arg1 arg2)))
    (display arg1) (display " ") (display arg2)
    (display "\ngcd: ") (display gcd) (display "\n"))
```

Interestingly, the Lisp langauges start to develop a unique rhythm to them at this level
of code. This style works amazingly well at this amount of code and problems on an
aesthetic level.

## Some Aesthetic Ramblings

Overall, the concise functional languages nearly universally score a win in the
aesthetic beauty category, but Forth gives an absolutely dominant show above even
them. Interestingly, at this simple of an algorith, even the assembly forms in
this project give a bronze medal performance, especially MMIXAL. Structural concerns
of many of the other languages often overshadow the simplicity of an algorithm
such as GCD.

In another way, Assembly is uniquely difficult and aesthetically unappealing at this
point. The requirement to support multiple ABIs in function call formats leads
to a mess. Just printing a number to the screen requires an entire, long algorithm,
versus the usual format string in other languages, and these concerns have grown into
an entire "standard library" in this project entirely to manage the lengths and
difficulty of code. This is basically written as immediately ugly in almost all
other languages.

Eiffel wins in terms of code that has an inherent rhythm as the eye follows it, yet
again. At this level, the Lisp languages develop a similar rhythm to them, and they
are similarly pleasant to look over with the eye. The Python language family's
forced indentation begins to give it some rhythm similar to Eiffel's, but there is
just not really enough code to do it. Eiffel somehow manages to add a second file
and still maintain the lead in terms of rhythm. It will be increasingly interesting
as this project continues to see how Eiffel maintains the visual rhythm of the code.

Ballerina is designed to be an aesthetic language, it actually begins to show with
the appropriate tools at this level. The designers advertise tooling to visualize
the code immediately, and in fact, it is a single click away above every function
with the Ballerina extension in VS Code. The language itself is rather unremarkable
in the C class, which itself is aesthetically unremarkable as a class for this
algorithm, but aesthetic tooling is worth an extra highlight.

OCaml is perhaps the shortest implementation for this code. If the implementation
had not beed added to with extra features in the Erlang family, perhaps
there would have been much stronger competition in this regard. In the end,
OCaml is just clearly the shortest. This can be good and bad, but it works
in OCaml's favor for this instance.

## Conclusion

The Euclid GCD algorithm is quite basic in essentially all of the languages,
once some of the inital hurldes are worked through. Some of the largest
challenge in arriving at the completion of this stage of this project was
in finalizing the build environment, which felt to be taking on a life of
its own for some time.

For the most part, this stage served as a good excuse to learn the basics
of some of the more obscure languages, and explore some interesting features
in the erlang family, in particular. The coding was absolutely simple in
basically all of them, although it maybe got carried away in Gleam trying
to reproduce the same output as the other Erlang family languages. However,
the basics of each language and how control flow and function style operations
is well highlighted at this stage.

The aesthetic considerations are especially easy to consider through evaluating
the differences in languages at this point. The simplicity can bring out
the best and worst in the aesthetics of each language sometimes. I had seen
the arguments for the aesthetic beauty that Forth can have, while being
unreadable to the unaquainted, and that's absolutely true in this example.
That said, even assembly had good and bad to speak of, while some of the
common languages were a little dull in a common way and others were a
kind of pompous beauty that is maybe not entirely a compliment.

This was a really fun stage, especially to step back and consider the code
that came out of it. There was active experimentation, and ample opportunity
to try different things out. This was, of course, the first *real* algorithm
of the project, with only the basics of hello world preceding it. As my
build system is solidifying, I look forward for oppotunities to continue
engaging in the core code like this.
