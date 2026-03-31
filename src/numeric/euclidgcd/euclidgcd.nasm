DEFAULT REL

section .rodata
  space: db " ",0
  endl: db 10,0
  gcdmsg: db "gcd: ",0
  default_m: db 15
  default_n: db 10

global _start

section .text

extern ParseNumber
extern PrintString
extern PrintNumber
extern StringIsInt
extern Exit

_start:
  %define argc rdi
  %define m r8
  %define n r9
  mov m, 0
  movzx m, byte [default_m]
  mov n, 0
  movzx n, byte [default_n]


; Check if we have 2+ command line arguments (we use 2 only)
; If 2, we need to parse them; else use defaults
; We just skip this on Windows right now...
%ifidn __OUTPUT_FORMAT__, win64
%else
  mov argc, [rsp]
  cmp argc, 3
  jl print

  mov rdi, [rsp + 16]
  call StringIsInt
  cmp rax, 0
  je print
  mov rdi, [rsp + 24]
  call StringIsInt
  cmp rax, 0
  je print

  mov rdi, [rsp + 16]
  call ParseNumber
  mov m, 0
  mov m, rax

  mov rdi, [rsp + 24]
  push m
  call ParseNumber
  mov n, 0
  mov n, rax
  pop m
%endif

print:
; Print the given 2 values
  push m
  push n
  mov rdi, m
  mov rsi, 0
  call PrintNumber
  lea rdi, space
  call PrintString
  mov n, [rsp]
  mov rdi, n
  mov rsi, 0
  call PrintNumber
  lea rdi, endl
  call PrintString
  pop n
  pop m

; Calculate the GCD with Euclid's
  mov rdi,m
  mov rsi,n
  call euclidgcd
  mov r11, rax

; Print and exit
  push r11
  push rax
  lea rdi, gcdmsg
  call PrintString
  pop rdi
  pop r11
  mov rdi, r11
  mov rsi, 0
  call PrintNumber
  lea rdi, endl
  call PrintString

  call Exit


; Euclid's Algorithm
euclidgcd:
  %define m rdi
  %define n rsi
  %define r rdx
  .loop:
  mov rax, m
  mov rdx, 0
  div n
  mov m, n
  mov n, r

  cmp n, 0
  jne .loop

  mov rax, m
  ret
