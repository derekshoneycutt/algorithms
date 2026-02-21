DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .rodata
  valuesmsg: db "values:",10,0
  valuemsg: db "%d",10,0
  maxmsg: db "max: %d",10,0
  d1: db 15
  d2: db 10

global main

section .text

extern printf
extern atoi

main:
; if we have no parameters, load the default values
  cmp rdi, 1
  jle defaultValues

; if we have arguments, we will loop through, parsing each into an integer value
parseArgs:
  mov rax, rdi
  mov rcx, 8
  mul rcx
  add rsi, rax

  mov r8, 0

parseArgsLoop:
  sub rsi, 8

  push rdi
  push rsi
  push r8
  mov rdi, [rsi]
  call atoi
  mov rcx, 0
  movzx rcx, eax
  pop r8
  pop rsi
  pop rdi
  push rcx

  inc r8
  dec rdi
  
  cmp rdi,1
  jg parseArgsLoop

  push r8
  jmp print

; For default values, just load the 2 and set the counter on top of the stack
defaultValues:
  mov rcx, 0
  movzx rcx, byte [d2]
  push rcx
  movzx rcx, byte [d1]
  push rcx
  mov r8, 2
  push r8

print:
; We calculate the max of all entered values to start
  pop r8
  mov rdi, r8
  mov rsi, 0
  call StackMax

; once we have the max, print the values, then the max
  push r8
  push rax
  lea rdi, valuesmsg
  xor rax, rax
  call printf
  pop rax
  pop r8

  mov r9,0
printLoop:
  pop rsi
  push rax
  push r8
  push r9
  lea rdi, valuemsg
  xor rax, rax
  call printf
  pop r9
  pop r8
  pop rax
  inc r9
  cmp r8, r9
  jg printLoop

  lea rdi, maxmsg
  mov rsi, rax
  xor rax, rax
  call printf

  mov rax, 0
  ret

; Find the maximum value in n values on the stack; this does not pop off the stack.
StackMax:
  mov rax, 0
StackMaxLoop:
  inc rsi
  mov rcx, [rsp + rsi * 8]

  cmp rcx, rax
  jl StackMaxDec

  mov rax, rcx
StackMaxDec:
  dec rdi
  cmp rdi, 0
  jg StackMaxLoop

  ret
