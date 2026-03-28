DEFAULT REL

section .rodata
  header: db "First Five Hundred Primes",10,0
  valuespace: db " ",0
  indent: db "   ",0
  endl: db 10,0

section .data
  array times 500 dw 0

global _start

section .text

extern ParseNumber
extern PrintString
extern PrintNumber
extern StringIsInt
extern Exit

_start:
  %define currp r9
  %define n cx
  %define j rdx
  %define k rsi
  %define r r10
  %define q rax
  %define prime rdi

  mov currp, array

  .stepOne: ; [Start table.] Set PRIME[1] <- 2, n <- 3, j <- 1.
  mov [currp], word 2
  mov rcx, 0
  mov n, 3
  mov j, 0

  .stepTwo: ; [n is prime.] Set j <- j + 1, PRIME[j] <- n.
  inc j
  add currp, 2
  mov [currp], word n

  .stepThree: ; [500 found?] If j = 500, go to step 9.
  cmp j, 499
  jge .stepNine

  .stepFour: ; [Advance n.] Set n <- n + 2.
  add n, 2

  .stepFive: ; [k <- 2.] Set k <- 2.
  mov k, 1

  .stepSix: ; [PRIME[k] \ n?] Divide n by PRIME[k];
  mov prime, 0
  mov rdi, 0
  mov di, word [array + k * 2]

  push j
  mov q, 0
  mov ax, n
  mov rdx, 0
  div prime
  mov r, rdx
  pop j

  ; let q be the quotient and r the remainder.
  ; If r = 0 (n is not prime), go to 4.
  cmp r, 0
  je .stepFour

  .stepSeven: ; [PRIME[k] large?] If q <= PRIME[k], go to 2. n must be prime.
  cmp q, prime
  jle .stepTwo

  .stepEight: ; [Advance k.] Increase k by 1, and go to 6.
  inc k
  jmp .stepSix

  .stepNine: ; [Print title.] Output title line and set m <- 1.
  lea rdi, header
  call PrintString

  %define i rcx
  ; count what row we're on w/ i
  mov i, 0

  .stepTen: ; [Print line.] Output a line that contains PRIME[m], PRIME[50 + m], ..., PRIME[450 + m].
  push i
  lea rdi, indent
  call PrintString
  pop i

  .stepTenSingle: ; print a single prime value
  push i
  lea rdi, valuespace
  xor rax, rax
  call PrintString
  mov i, [rsp]
  mov rdi, 0
  mov di, word [array + i * 2]
  mov rsi, 4
  mov rdx, '0'
  call PrintNumber
  pop i

  add i, 50
  cmp i, 500
  jl .stepTenSingle

  ; print endl to go to the next line (always end on endl, too)
  push i
  lea rdi, endl
  call PrintString
  pop i

  .stepEleven: ; [500 printed?] Increase m by 1. If m <= 50, goto 10.
  sub i, 499
  cmp i, 50
  jl .stepTen

  .end:
  call Exit
