DEFAULT REL

section .bss
    std_io_PrintNumber_buffer resb 21

global PrintNumber

extern PrintString

section .text

PrintNumber:
    %define num rdi
    %define max rsi
    %define fill rdx
    %define fillb dl
    %define curr r8
    %define digit r9
    %define digitb r9b
    %define len r10
    push rbp

    mov curr, std_io_PrintNumber_buffer + 20
    mov digit, 0
    mov byte [curr], digitb
    dec curr
    mov len, 0
    push fill

    .loop:
    mov rax, num
    mov rcx, 10
    mov rdx, 0
    div rcx
    mov num, rax
    mov digit, rdx

    add digit, '0'
    mov byte [curr], digitb
    dec curr
    inc len

    cmp num, 0
    jle .testIfMax

    cmp max, 0
    je .loop
    cmp len, max
    jg .printAndEnd
    jmp .loop

    .testIfMax:
    cmp len, max
    jge .printAndEnd

    pop fill
    mov byte [curr], fillb
    dec curr
    inc len
    push fill
    jmp .testIfMax

    .printAndEnd:
    pop fill
    inc curr
    mov rdi, curr
    call PrintString

    pop rbp
    ret
