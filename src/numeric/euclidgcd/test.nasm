default rel

section .data
    arg0 db "program_name", 0
    arg1 db "first_arg", 0
    funtimes db "funtimes", 10, 0
    newline db 10

section .text
global _start

_start:
    ; 1. Push return address manually so we can 'ret' later
    push .after_call

    ; 2. Build the _start-style stack (argc at [rsp])
    push 0                  ; NULL terminator for argv
    push arg1               ; argv[1] pointer
    push arg0               ; argv[0] pointer (program name)
    push 2                  ; argc = 2

    jmp print_args          ; Jump to function with our custom layout

.after_call:
    ; 5. Exit back in _start
    mov rax, 60             ; sys_exit
    xor rdi, rdi
    syscall

print_args:
    ; At this point: [rsp] = argc, [rsp+8] = argv[0], [rsp+16] = argv[1]
    mov rbx, [rsp]          ; Load argc into rbx for loop counter
    lea r12, [rsp + 8]      ; r12 points to the first argv pointer

.loop:
    test rbx, rbx           ; Check if we have printed all args
    jz .done

    mov rsi, [r12]          ; rsi = address of the current string
    
    ; --- Simple string length calculation ---
    mov rdx, 0
.len_loop:
    cmp byte [rsi + rdx], 0
    je .print
    inc rdx
    jmp .len_loop

.print:
    ; --- sys_write syscall ---
    mov rax, 1              ; sys_write
    mov rdi, 1              ; stdout
    syscall

    ; Print a newline after each arg
    mov rax, 1
    mov rdi, 1
    mov rsi, newline
    mov rdx, 1
    syscall

    add r12, 8              ; Move to next argv pointer in the array
    dec rbx                 ; Decrement argc counter
    jmp .loop

.done:
    ; 4. Cleanup our custom stack frame before returning
    add rsp, 32             ; Pop: argc (8), argv0 (8), argv1 (8), NULL (8)
    ret                     ; Returns to .after_call
