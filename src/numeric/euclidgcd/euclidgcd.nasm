; Calculate the GCD between 2 values and print it all to the screen.
default rel

section .rodata
    space: db " ",0
    endl: db 10,0
    gcdmsg: db "gcd: ",0
    default_m: db 15
    default_n: db 10

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
    %define m r8
    %define mb r8b
    %define n r9
    %define nb r9b
    push rbp
    mov rbp, rsp

    mov m, 0
    movzx m, byte [default_m]
    mov n, 0
    movzx n, byte [default_n]

; Check if we have 2+ command line arguments (we use 2 only)
; If 2, we need to parse them; else use defaults
    cmp argc, 3
    jl .print

    push argv
    mov param1, [argv + 8]
    call StringIsInt
    pop argv
    cmp rax, 0
    je .print
    push argv
    mov param1, [argv + 16]
    call StringIsInt
    pop argv
    cmp rax, 0
    je .print

    push argv
    mov param1, [argv + 8]
    call ParseNumber
    mov m, 0
    mov m, rax
    pop argv

    push m
    push argv
    mov param1, [argv + 16]
    call ParseNumber
    mov n, 0
    mov n, rax
    pop argv
    pop m

    .print:
    ; Print the given 2 values
        push m
        push n
        mov param1, m
        mov param2, 0
        call PrintNumber
        lea param1, space
        call PrintString
        mov n, [rsp]
        mov param1, n
        mov param2, 0
        call PrintNumber
        lea param1, endl
        call PrintString
        pop n
        pop m

    ; Calculate the GCD with Euclid's
        mov param1,m
        mov param2,n
        call euclidgcd
        mov r11, rax

    ; Print and exit
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

        xor rax, rax
        leave
        ret

; Euclid's Algorithm
euclidgcd:
    %define m rdi
    %define n rsi
%ifidn __OUTPUT_FORMAT__, win64
    mov m, rcx
    mov n, rdx
%endif
    %define r rdx
    .loop:
        mov rax, m
        mov rdx, 0
        div n
        mov m, n
        mov n, r

        cmp n, 0
        jne .loop

    mov rax, m
    ret
