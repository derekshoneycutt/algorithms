Module Main

    Function EuclidGcd(ByVal m As Integer, ByVal n As Integer) As Integer
        Dim r As Integer
        While n <> 0
            r = m Mod n
            m = n
            n = r
        End While
        Return m
    End Function

    Sub Main(ByVal args() As String)
        Dim m As Integer
        Dim n As Integer
        Dim gcd As Integer

        If args.Length < 2 OrElse _
            Not Integer.TryParse(args(0), m) OrElse _
            Not Integer.TryParse(args(1), n) Then
            m = 15
            n = 10
        End If

        gcd = EuclidGcd(m, n)

        Console.WriteLine($"{m} {n}")
        Console.WriteLine($"gcd: {gcd}")
    End Sub

End Module
