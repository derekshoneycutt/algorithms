Module Main

    Function Max(ByRef values As List(Of Integer)) As Integer
        Dim current As Integer
        current = 0
        For Each value In values
            If value > current Then
                current = value
            End If
        Next
        Return current
    End Function


    Sub Main(ByVal args() As String)
        Dim values As New List(Of Integer)
        Dim i, count, t As Integer
        count = 0
        If args.Length > 0 Then
            For i = 0 To args.Length - 1
                If Integer.TryParse(args(i), t) Then
                    values.Add(t)
                    count = count + 1
                End If
            Next
        Else
            values.Add(15)
            values.Add(10)
        End If

        Dim printValues as String
        printValues = String.Join(", ", _
            values.Select(Function (n) n.ToString()).ToList())
        Dim maximum As Integer
        maximum = Max(values)
        Console.WriteLine($"values: {printValues}")
        Console.WriteLine($"max: {maximum}")
    End Sub

End Module