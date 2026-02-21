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
  mov r8, 0
  movzx r8, byte [m]
  mov r9, 0
  movzx r9, byte [n]

; Check if we have 2+ command line arguments (we use 2 only)
; If 2, we need to parse them; else use defaults
  cmp rdi, 3
  jl print

  push rsi
  mov rdi, [rsi + 8]
  call atoi
  mov r8, 0
  movzx r8, eax
  pop rsi

  push r8
  mov rdi, [rsi + 16]
  call atoi
  mov r9, 0
  movzx r9, eax
  pop r8

print:
; Print the given 2 values
  push r8
  push r9
  lea rdi, msg
  mov rsi, r8
  mov rdx, r9
  xor rax, rax
  call printf
  pop r9
  pop r8

; Calculate the GCD with Euclid's
  mov rdi,r8
  mov rsi,r9
  call euclidgcd

; Print and exit
  mov rdx, rax
  lea rdi, gcdmsg
  xor rax, rax
  call printf

  mov rax, 0
  ret


; Euclid's Algorithm
euclidgcd:
  %define m rdi
  %define n rsi
  %define r rdx
  mov rax, m
  mov rdx, 0
  div n

  cmp rdx, 0
  je euclidgcd_end

  mov m, n
  mov n, r
  jmp euclidgcd

euclidgcd_end:
  ret
