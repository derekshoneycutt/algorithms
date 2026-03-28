; Prints hello to the screen
DEFAULT REL

section .rodata
  msg: db "Hello, world!",10,0

global _start

extern PrintString
extern Exit

section .text

_start:           ; The main entry point to the application
  mov rdi, msg
  call PrintString

  call Exit
