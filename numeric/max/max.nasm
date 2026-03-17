DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .rodata
  valuesmsg: db "values:",10,0
  maxmsg: db "max: ",0
  endl: db 10,0
  d1: db 15
  d2: db 10

global _start

%define sys_exit 60

section .text

extern ParseNumber
extern PrintString
extern PrintNumber
extern StringIsInt

_start:
  %define argc rdi
  %define argv rsi
  %define argvp r9
  %define count r8
; if we have no parameters, load the default values
  mov argc, [rsp]
  cmp argc, 1
  jle .defaultValues

; if we have arguments, we will loop through, parsing each into an integer value
  .parseArgs:
  mov argv, 8
  mov count, 0

  .parseArgsLoop:
  add argv, 8
  mov argvp, [rsp + argv]

  push argc
  push argv
  push count
  push argvp
  mov rdi, argvp
  call StringIsInt
  pop rdi
  cmp rax, 0
  je .continueSkipping
  call ParseNumber
  pop count
  pop argv
  pop argc

  push rax
  inc count
  add argv, 8
  jmp .continueArgsLoop

  .continueSkipping:
  pop count
  pop argv
  pop argc

  .continueArgsLoop:
  dec argc
  
  cmp argc,1
  jg .parseArgsLoop

  push count
  jmp .print

; For default values, just load the 2 and set the counter on top of the stack
  .defaultValues:
  mov rcx, 0
  mov cl, [d2]
  push rcx
  mov cl, [d1]
  push rcx
  mov count, 2
  push count

  .print:
; We calculate the max of all entered values to start
  pop count
  mov rdi, count
  mov rsi, 0
  call StackMax
  %define themax rax

; once we have the max, print the values, then the max
  push count
  push themax
  lea rdi, valuesmsg
  call PrintString
  pop themax
  pop count

  %define printCount r9
  mov printCount,0
  .printLoop:
  pop rdi
  push themax
  push count
  push printCount
  mov rsi, 0
  call PrintNumber
  lea rdi, endl
  call PrintString
  pop printCount
  pop count
  pop themax
  inc printCount
  cmp count, printCount
  jg .printLoop

  push themax
  lea rdi, maxmsg
  call PrintString
  pop rdi
  mov rsi, 0
  call PrintNumber
  lea rdi, endl
  call PrintString

  mov rax, sys_exit
  xor rdi, rdi
  syscall

; Find the maximum value in n values on the stack; this does not pop off the stack.
StackMax:
  %define n rdi
  %define curr rsi
  %define max rax
  %define test rcx
  mov max, 0
  .loop:
  inc curr
  mov test, [rsp + curr * 8]

  cmp test, max
  jl .dec

  mov max, test
  .dec:
  dec n
  cmp n, 0
  jg .loop

  ret
