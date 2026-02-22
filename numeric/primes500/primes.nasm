DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .rodata
  header: db "First Five Hundred Primes",10,0
  valuestr: db " %04d",0
  indent: db "   ",0
  endl: db 10,0

global main

section .text

extern printf
extern malloc
extern free

main:
  ; First thing, we will allocate space on the stack to store 500
  mov rdi, 8*500
  call malloc
  mov r8, rax
  mov r9, r8

stepOne: ; [Start table.] Set PRIME[1] <- 2, n <- 3, j <- 1.
  mov [r8], dword 2
  mov ecx, 3
  mov rdx, 0

stepTwo: ; [n is prime.] Set j <- j + 1, PRIME[j] <- n.
  inc rdx
  add r9, 4
  mov [r9], dword ecx

stepThree: ; [500 found?] If j = 500, go to step 9.
  cmp rdx, 499
  jge stepNine

stepFour: ; [Advance n.] Set n <- n + 2.
  add ecx, 2

stepFive: ; [k <- 2.] Set k <- 2.
  mov rsi, 1

stepSix: ; [PRIME[k] \ n?] Divide n by PRIME[k];
  mov rdi, 0
  mov edi, dword [r8 + rsi * 4]

  push rdx
  mov rax, 0
  mov eax, ecx
  mov rdx, 0
  div rdi
  mov r10, rdx
  pop rdx

  ; let q be the quotient and r the remainder.
  ; If r = 0 (n is not prime), go to 4.
  cmp r10, 0
  je stepFour

stepSeven: ; [PRIME[k] large?] If q <= PRIME[k], go to 2. n must be prime.
  cmp rax, rdi
  jle stepTwo

stepEight: ; [Advance k.] Increase k by 1, and go to 6.
  inc rsi
  jmp stepSix

stepNine: ; [Print title.] Output title line and set m <- 1.
  push r8
  lea rdi, header
  xor rax, rax
  call printf
  pop r8

  mov rcx, 0

stepTen: ; [Print line.] Output a line that contains PRIME[m], PRIME[50 + m], ..., PRIME[450 + m].
  push rcx
  push r8
  lea rdi, indent
  xor rax, rax
  call printf
  pop r8
  pop rcx

stepTenSingle: ; print a single prime value
  mov rsi, 0
  movzx rsi, dword [r8 + rcx * 4]
  push rcx
  push r8
  lea rdi, valuestr
  xor rax, rax
  call printf
  pop r8
  pop rcx

  add rcx, 50
  cmp rcx, 500
  jl stepTenSingle

  ; print endl to go to the next line (always end on endl, too)
  push rcx
  push r8
  lea rdi, endl
  xor rax, rax
  call printf
  pop r8
  pop rcx

stepEleven: ; [500 printed?] Increase m by 1. If m <= 50, goto 10.
  sub rcx, 499
  cmp rcx, 50
  jl stepTen

memfree: ; Free the allocated memory and exit
  mov rdi, r8
  call free
  mov rdi, 0
  mov r8, 0

  mov rax, 0
  ret
