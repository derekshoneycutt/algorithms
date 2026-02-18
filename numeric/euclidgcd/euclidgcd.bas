
Function EuclidGcd(m As Integer, n As Integer) As Integer
    Dim As Integer r = m Mod n
    While r <> 0
        m = n
        n = r
        r = m Mod n
    Wend
    Return n
End Function


Dim As Integer m = 15
Dim As Integer n = 10

If Len(Command(2)) > 0 Then
    m = ValInt(Command(1))
    n = ValInt(Command(2))
End If

Print Using "### ###"; m; n
Dim As Integer gcd = EuclidGcd(m, n)
Print Using "gcd: ###"; gcd
