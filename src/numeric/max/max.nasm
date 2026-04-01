DEFAULT REL

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

; For default values, just load the 2 and set the counter on top of the stack
    .defaultValues:
        mov rcx, 0
        mov cl, [d2]
        push rcx
        mov cl, [d1]
        push rcx
        mov count, 2
        push count

    .print:
    ; We calculate the max of all entered values to start
        pop count
        mov param1, count
        mov param2, 0
        call StackMax
        %define themax rax

    ; once we have the max, print the values, then the max
        push count
        push themax
        lea param1, valuesmsg
        call PrintString
        pop themax
        pop count

        %define printCount r9
        mov printCount,0
    .printLoop:
        pop param1
        push themax
        push count
        push printCount
        mov param2, 0
        call PrintNumber
        lea param1, endl
        call PrintString
        pop printCount
        pop count
        pop themax
        inc printCount
        cmp count, printCount
        jg .printLoop

        push themax
        lea param1, maxmsg
        call PrintString
        pop param1
        mov param2, 0
        call PrintNumber
        lea param1, endl
        call PrintString

        xor rax, rax
        leave
        ret

; Find the maximum value in n values on the stack; this does not pop off the stack.
StackMax:
    %define n rdi
    %define curr rsi
%ifidn __OUTPUT_FORMAT__, win64
    mov n, rcx
    mov curr, rdx
%endif
    %define max rax
    %define test rcx
    mov max, 0
    .loop:
        inc curr
        mov test, [rsp + curr * 8]

        cmp test, max
        jl .dec

        mov max, test
    .dec:
        dec n
        cmp n, 0
        jg .loop

    ret
