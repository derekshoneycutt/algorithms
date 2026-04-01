/'
    Calculate the GCD betwen two values and print it to the screen
'/

' Calculates the GCD using Euclid's method
Function EuclidGcd(m As Integer, n As Integer) As Integer
    Dim As Integer r
    While n <> 0
        r = m Mod n
        m = n
        n = r
    Wend
    Return m
End Function

Dim As Integer m = 15
Dim As Integer n = 10

' If there are at least 2 command line arguments, parse and use them
' as the values for GCD; otherwise stay with 15, 10
If __FB_ARGC__ >= 3 Then
    m = ValInt(Command(1))
    n = ValInt(Command(2))
End If

Print Using "### ###"; m; n
Dim As Integer gcd = EuclidGcd(m, n)
Print Using "gcd: ###"; gcd
