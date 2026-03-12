
Type Date
    As Integer Day
    As Integer Month
    As Integer Year
End Type

Type DateLoopState
    As Date Current
    As Integer EndYear
End Type

Function GetEasterFor(Y As Integer) As Date
    Dim As Integer g, c, x, z, d, e, n
    Dim As Date ret
    ret.Year = Y

    g = (Y Mod 19) + 1
    c = (Y / 100) + 1
    x = (3 * c \ 4) - 12
    z = (((8 * c) + 5) \ 25) - 5
    d = (5 * Y \ 4) - x - 10
    e = ((11 * g) + 20 + z - x) Mod 30
    If (e = 25 And g > 11) Or e = 24 Then
        e = e + 1
    End If
    n = 44 - e
    If n < 21 Then
        n = n + 30
    End If
    n = n + 7 - ((d + n) Mod 7)

    If n > 31 Then
        ret.Day = n - 31
        ret.Month = 4
    Else
        ret.Day = n
        ret.Month = 3
    End If

    Return ret
End Function

Function InitEasters(StartYear As Integer, EndYear As Integer) As DateLoopState
    Dim As DateLoopState ret
    ret.Current.Year = StartYear - 1
    ret.EndYear = EndYear
    Return ret
End Function

Function NextEaster(State As DateLoopState) As Boolean
    Dim As Integer newYear = State.Current.Year + 1
    If newYear > State.EndYear Then
        Return false
    End If
    State.Current = GetEasterFor(newYear)
    Return True
End Function

Sub PrintEasters(State As DateLoopState)
    Dim As Date currDate
    Dim As String month
    Print "Easters:"
    While NextEaster(State)
        currDate = State.Current
        If currDate.Month = 3 Then
            month = "March"
        Else
            month = "April"
        End If
        Print Using "   ## " & month & " ####"; _
            currDate.Day; currDate.Year
    Wend
End Sub

PrintEasters(InitEasters(1950, 2050))
