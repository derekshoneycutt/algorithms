; Prints hello to the screen

DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .rodata
  msg: db "Hello, world!",10,0

%define sys_exit 60

global _start

extern PrintString

section .text

_start:           ; The main entry point to the application
  mov rdi, msg
  call PrintString

  mov rax, sys_exit
  xor rdi, rdi
  syscall
