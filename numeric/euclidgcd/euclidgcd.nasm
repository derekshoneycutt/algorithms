DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .rodata
  msg: db "%d %d",10,0
  gcdmsg: db "gcd: %d",10,0
  m: db 15
  n: db 10

global main

section .text

extern printf
extern atoi

main:
  movzx r8, byte [m]
  movzx r9, byte [n]

; Check if we have 2+ command line arguments (we use 2 only)
; If 2, we need to parse them; else use defaults
  cmp rdi, 3
  jl print

  push rbp
  push rsi
  mov rdi, [rsi + 8]
  call atoi
  mov r8, 0
  movzx r8, eax
  pop rsi
  pop rbp

  push rbp
  push r8
  mov rdi, [rsi + 16]
  call atoi
  mov r9, 0
  movzx r9, eax
  pop r8
  pop rbp

print:
; Print the given 2 values
  push rbp
  push r8
  push r9
  mov rbp, rsp
  lea rdi, msg
  mov rsi, r8
  mov rdx, r9
  xor rax, rax
  call printf
  pop r9
  pop r8
  pop rbp

; Calculate the GCD with Euclid's
  mov rdi,r8
  mov rsi,r9
  call euclidgcd

; Print and exit
  push rbp
  mov rbp, rsp
  mov rdx, rax
  lea rdi, gcdmsg
  xor rax, rax
  call printf
  pop rbp

  mov rax, 0
  ret


; Euclid's Algorithm
euclidgcd:
  mov rax, rdi
  mov rdx, 0
  div rsi

  cmp rdx, 0
  je euclidgcd_end

  mov rdi, rsi
  mov rsi, rdx
  jmp euclidgcd

euclidgcd_end:
  mov rax, rsi
  ret
  
