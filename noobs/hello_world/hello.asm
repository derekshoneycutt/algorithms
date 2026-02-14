DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .rodata
  msg: db "Hello, world!",10,0

global main

section .text

extern printf

main:
  push rbp
  mov rbp, rsp
  lea rdi, msg
  xor rax, rax
  call printf
  pop rbp

  mov rax, 0
  ret



