
Type PrimeContainer
    As Integer n(1 To 500)
End Type

Function GetPrimes() As PrimeContainer
    Dim As PrimeContainer primes
    Dim As Integer n = 3
    Dim As Integer j, q, r, t, k
    Dim As Boolean isPrime = false
    primes.n(1) = 2

    For j = 2 To 500
        primes.n(j) = n

        isPrime = false
        While Not isPrime
            n = n + 2

            q = 9999
            r = 1
            t = 0
            k = 1
            While r <> 0 And q > t
                t = primes.n(k)
                q = n / t
                r = n Mod t
                k = k + 1
            Wend

            isPrime = r <> 0 And q <= t
        Wend
    Next j
    Return primes
End Function

Sub PrintPrimes(primes As PrimeContainer)
    Dim As Integer i
    Print "First Five Hundred Primes"
    For i = 1 to 50
        Print Using "     #### #### #### #### #### #### #### #### #### ####"; _
            primes.n(i); primes.n(i + 50); primes.n(i + 150); primes.n(i + 200); _
            primes.n(i + 250); primes.n(i + 300); primes.n(i + 350); _
            primes.n(i + 400); primes.n(i + 450)
    Next i
End Sub

PrintPrimes GetPrimes
