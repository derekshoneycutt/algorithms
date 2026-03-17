DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .rodata
  header: db "Easters:",10,0
  indent: db "   ",0
  april: db " April, ",0
  march: db " March, ",0
  endl: db 10,0
  sdate: dq 1950
  edate: dq 2050

global _start

%define sys_exit 60

section .text

extern PrintString
extern PrintNumber

_start:
    %define coinp rsi
    %define cooutp rdi
    mov coinp, CoIn
    call CoOut

    mov rax, sys_exit
    xor rdi, rdi
    syscall

; Coroutine CoIn : Loops over the range of years,
;       returning date of easter on each to coout.
;       $0 is set to -1 if at the end of the date loop.
CoIn:
    ; let rdx be the current date (store on stack when co-call)
    ; let r8 be the ending year
    %define currdate rdx
    %define endyear r8
    mov currdate, [sdate]
    mov endyear, [edate]

    .loop:
    cmp currdate, endyear
    ja  .end

    push endyear
    push cooutp
    mov rdi, currdate
    call getEaster
    pop cooutp
    pop endyear

    mov coinp, .return
    push currdate
    push endyear
    jmp cooutp
    .return:
    pop endyear
    pop currdate

    inc currdate
    jmp .loop

    .end:
    mov rax, -1
    mov coinp, .end
    jmp cooutp

; Coroutine CoOut :
;    Loops through CoIn and prints the easter dates
CoOut:
    push coinp
    lea rdi, header
    call PrintString
    pop coinp

    .loop:
    mov cooutp, .return
    jmp coinp
    .return:
    %define day rax
    %define Mflag rcx
    %define yyyy rdx
    cmp day, 0
    jl .end

    push coinp
    push yyyy
    push Mflag
    push day
    lea rdi, indent
    call PrintString

    pop rdi
    mov rsi, 2
    mov rdx, '0'
    call PrintNumber

    pop Mflag
    cmp Mflag, 0
    jne .printApril
    lea rdi, march
    jmp .finishPrint
    .printApril:
    lea rdi, april
    .finishPrint:
    call PrintString

    pop rdi
    mov rsi, 4
    mov rdx, '0'
    call PrintNumber

    lea rdi, endl
    call PrintString
    pop coinp

    jmp .loop

    .end:
    ret

getEaster:
    ; Parameters:
    %define Y rdi
    ; returns:
    %define day rax
    %define Mflag rcx
    %define yyyy rdx
    ; Variables:
    %define G rsi
    %define C r8
    %define X r9
    %define Z r10
    %define D r11
    %define E r8
    %define N rsi
    ; use rax, rcx, rdx for scratch registers in each move otherwise

   .step1:
    mov rdx, 0
    mov rax, Y
    mov rcx, 19
    div rcx
    add rdx, 1
    mov G, rdx

    .step2:
    mov rdx, 0
    mov rax, Y
    mov rcx, 100
    div rcx
    add rax, 1
    mov C, rax

    .step3:
    mov rcx, 3
    mul rcx
    mov rdx, 0
    mov rcx, 4
    div rcx
    sub rax, 12
    mov X, rax

    mov rax, C
    mov rcx, 8
    mul rcx
    add rax, 5
    mov rdx, 0
    mov rcx, 25
    div rcx
    sub rax, 5
    mov Z, rax

    .step4:
    mov rax, Y
    mov rcx, 5
    mul rcx
    mov rdx, 0
    mov rcx, 4
    div rcx
    sub rax, X
    sub rax, 10
    mov D, rax

    .step5:
    mov rax, G
    mov rcx, 11
    mul rcx
    add rax, 20
    add rax, Z
    sub rax, X
    mov rdx, 0
    mov rcx, 30
    div rcx
    mov E, rdx

    cmp E, 25
    jne .step5_2
    cmp G, 11
    jle .step5_2
    jmp .step5_3

    .step5_2:
    cmp E, 24
    jne .step6

    .step5_3:
    inc E

    .step6:
    mov rax, 44
    sub rax, E
    mov N, rax

    cmp N, 21
    jge .step7

    add N, 30

    .step7:
    mov rax, D
    add rax, N
    mov rcx, 7
    mov rdx, 0
    div rcx
    add N, 7
    sub N, rdx

    .step8:
    cmp N, 31
    jg .step8_2
    mov Mflag, 0
    jmp .return

    .step8_2:
    sub N, 31
    mov Mflag, 1

    .return:
    mov day, N
    mov yyyy, Y
    ret
