' Gets the maximum value of a sequence of values
Module Main
    ''' <summary>
    ''' Get the maximum value of a list of values
    ''' </summary>
    ''' <param name="values">The list of values to find the maximum of</param>
    ''' <returns>The maximum value</returns>
    Function Max(Of T As IComparable(Of T))(ByRef values As List(Of T)) As T
        Dim current As T
        current = values(0)
        For Each value In values
            If value.CompareTo(current) > 0 Then
                current = value
            End If
        Next
        Return current
    End Function

    ''' <summary>
    ''' The main entry point to the application
    ''' </summary>
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