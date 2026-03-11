DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .rodata
  header: db "Easters:",10,0
  datestr: db "   %02d %s, %04d",10,0
  april: db "April",0
  march: db "March",0
  sdate: dq 1950
  edate: dq 2050

global main

section .text

extern printf

main:
    mov rsi, CoIn
    call CoOut

    mov rax, 0
    ret

; Coroutine CoIn : Loops over the range of years,
;       returning date of easter on each to coout.
;       $0 is set to -1 if at the end of the date loop.
CoIn:
    ; rdi stores location of CoOut to jmp to
    ; rsi stores location of CoIn to jmp to
    ; let rdx be the current date (store on stack when co-call)
    ; let r8 be the ending year
    mov rdx, [sdate]
    mov r8, [edate]

CoInLoop:
    cmp rdx, r8
    ja  CoInEnd

    push r8
    push rdi
    mov rdi, rdx
    call getEaster
    pop rdi
    pop r8

    mov rsi, CoInReturn
    push rdx
    push r8
    jmp rdi
CoInReturn:
    pop r8
    pop rdx

    inc rdx
    jmp CoInLoop

CoInEnd:
    mov rax, -1
    mov rsi, CoInEnd
    jmp rdi

; Coroutine CoOut :
;    Loops through CoIn and prints the easter dates
CoOut:
    ; rdi stores location of CoOut to jmp to
    ; rsi stores location of CoIn to jmp to
    push rsi
    lea rdi, header
    xor rax, rax
    call printf
    pop rsi

CoOutLoop:
    mov rdi, CoOutReturn
    jmp rsi
CoOutReturn:
    mov r8, 0
    cmp rax, r8
    jl CoOutEnd

    push rsi
    mov r8, rdx
    cmp rcx, 0
    jne printApril
    lea rdx, march
    jmp finishPrint
printApril:
    lea rdx, april
finishPrint:
    lea rdi, datestr
    mov rsi, rax
    mov rcx, r8
    xor rax, rax
    call printf
    pop rsi

    jmp CoOutLoop

CoOutEnd:
    ret

getEaster:
    ; Parameters:
    ;Y = rdi
    ; returns:
    ;day = rax
    ;Month flag = rcx
    ;year = rdx
    ; Variables:
    ;G = rsi
    ;C = r8
    ;X = r9
    ;Z = r10
    ;D = r11
    ;E = r8
    ;N = rsi

getEasterStep1:
    mov rdx, 0
    mov rax, rdi
    mov rcx, 19
    div rcx
    add rdx, 1
    mov rsi, rdx

getEasterStep2:
    mov rdx, 0
    mov rax, rdi
    mov rcx, 100
    div rcx
    add rax, 1
    mov r8, rax

getEasterStep3:
    mov rcx, 3
    mul rcx
    mov rdx, 0
    mov rcx, 4
    div rcx
    sub rax, 12
    mov r9, rax

    mov rax, r8
    mov rcx, 8
    mul rcx
    add rax, 5
    mov rdx, 0
    mov rcx, 25
    div rcx
    mov rcx, 5
    sub rax, rcx
    mov r10, rax

getEasterStep4:
    mov rax, rdi
    mov rcx, 5
    mul rcx
    mov rdx, 0
    mov rcx, 4
    div rcx
    sub rax, r9
    mov rcx, 10
    sub rax, rcx
    mov r11, rax

getEasterStep5:
    mov rax, rsi
    mov rcx, 11
    mul rcx
    mov rcx, 20
    add rax, rcx
    add rax, r10
    sub rax, r9
    mov rdx, 0
    mov rcx, 30
    div rcx
    mov r8, rdx

    mov rcx, 25
    cmp r8, rcx
    jne getEasterStep5_2
    mov rcx, 11
    cmp rsi, rcx
    jle getEasterStep5_2
    jmp getEasterStep5_3

getEasterStep5_2:
    mov rcx, 24
    cmp r8, rcx
    jne getEasterStep6

getEasterStep5_3:
    inc r8

getEasterStep6:
    mov rax, 44
    sub rax, r8
    mov rsi, rax

    mov rcx, 21
    cmp rsi, rcx
    jge getEasterStep7

    mov rcx, 30
    add rsi, rcx

getEasterStep7:
    mov rax, r11
    add rax, rsi
    mov rcx, 7
    mov rdx, 0
    div rcx
    mov rcx, 7
    add rsi, rcx
    sub rsi, rdx

getEasterStep8:
    mov rcx, 31
    cmp rsi, rcx
    jg getEasterStep8_2
    mov rcx, 0
    jmp getEasterReturn

getEasterStep8_2:
    sub rsi, rcx
    mov rcx, 1

getEasterReturn:
    mov rax, rsi
    mov rdx, rdi
    ret
