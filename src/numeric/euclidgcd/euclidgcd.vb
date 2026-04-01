' Calculate the GCD for two values and print it all to the screen
Module Main
    ''' <summary>
    ''' Calculate the GCD using Euclid's Aglorithm
    ''' </summary>
    ''' <param name="m">The first value to calculate the GCD for</param>
    ''' <param name="n">The second value to calculate the GCD for</param>
    ''' <returns>The calculated GCD</returns>
    Function EuclidGcd(ByVal m As Integer, ByVal n As Integer) As Integer
        Dim r As Integer
        While n <> 0
            r = m Mod n
            m = n
            n = r
        End While
        Return m
    End Function

    ''' <summary>
    ''' The main entry point to the application
    ''' </summary>
    Sub Main(ByVal args() As String)
        Dim m As Integer
        Dim n As Integer
        Dim gcd As Integer

        ' Attempt to get the first 2 command line parameters or fall to 15, 10
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
