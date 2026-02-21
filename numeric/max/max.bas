
Function Max(X() As Integer) As Integer
    Dim current As Integer = 0
    For value As Integer = LBound(X) To UBound(X)
        If X(value) > current Then
            current = X(value)
        End If
    Next value
    Return current
End Function

Dim Values() As Integer

If __FB_ARGC__ > 1 Then
    ReDim Values(1 to __FB_ARGC__ - 1) As Integer
    For index As Integer = 1 to __FB_ARGC__ - 1
        Values(index) = ValInt(Command(index))
    Next index
Else
    ReDim Values(1 to 2) As Integer
    Values(1) = 15
    Values(2) = 10
End If  

Dim ShowMax As Integer = Max(Values())

Print "values:"
For index As Integer = 1 to UBound(Values)
    Print Str(Values(index))
Next index
Print"max: " & Str(ShowMax)
