/* This is the startup code for Windows x64.
 * It is responsible for parsing the command line arguments and calling main,
 * then exiting with the return value of main. */

#ifndef _WIN32
#error "This file is only for Windows x64"
#endif

.data
.bss
    .lcomm argsstr, 1000
    .lcomm argvptrs, 100*8

.global _start

.extern main
.extern Exit

.extern GetCommandLineA

.equiv param1, %rcx
.equiv param2, %rdx

.equiv currc, %rax
.equiv currins, %rsi
.equiv currargv, %rdi
.equiv argc, %rcx
.equiv argv, %rdx
.equiv inQuotes, %r8
.equiv currLen, %r9

.text

_start:
    subq $40, %rsp

    /* In Windows, we call to get the single command line string */
    call GetCommandLineA

    /* Then loop through, tokenizing the string by spaces *
     * This is a pretty basic tokenization at this point *
     * It doesn't handle quotes, and only the most basic backslashes */
    xorq argc, argc
    xorq inQuotes, inQuotes
    xorq currLen, currLen
    leaq argvptrs(%rip), argv
    leaq argvptrs(%rip), currargv
    leaq argsstr(%rip), currins
    movq currins, (currargv)
    .tokenLoop:
        movb (currc), %dl
        cmpb $0, %dl
        je .tokenLoopDone

        cmpb $' ', %dl
        je .tokenSpace

        cmpb $'\\', %dl
        je .tokenBackslash

        movb %dl, (currins)
        incq currc
        incq currins
        incq currLen
        jmp .tokenLoop

    .tokenSpace:
        /* When we hit a space, try to terminate the current token */
        cmpq $0, currLen
        je .tokenSpace_skip

        movb $0, (currins)
        incq argc
        incq currins
        xorq currLen, currLen
        movq currins, (currargv)
        addq $8, currargv
        
        .tokenSpace_skip:
            incq currc
            jmp .tokenLoop

    .tokenBackslash:
        /* When hitting a backslash, except in the first token,
           write the next character whatever it is */
        cmpq $0, argc
        movb $1, %dl
        je .tokenBackslash_writeCharacter

        incq currc
        movb (currc), %dl
        cmpb $0, %dl
        je .tokenLoopDone

        .tokenBackslash_writeCharacter:
            movb %dl, (currins)
            incq currc
            incq currins
            incq currLen
            jmp .tokenLoop

    .tokenLoopDone:
        movb $0, (currins)
        cmpq $0, currLen
        je .callMainAndExit
        incq argc
        
    .callMainAndExit:
        call main
        movq %rax, param1

        addq $40, %rsp
        call Exit
