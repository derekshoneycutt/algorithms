program euclidgcd;
    uses SysUtils;

    function gcd(m, n : integer) : integer;
        var r : integer;
    begin
        while n <> 0 do begin
            r := m mod n;
            m := n;
            n := r
        end;
        gcd := m
    end;

    var m, n, value : integer;
begin
    if ParamCount >= 2 then begin
        m := StrToInt(ParamStr(1));
        n := StrToInt(ParamStr(2))
    end
    else begin
        m := 15;
        n := 10;
    end;

    value := gcd(m, n);
    WriteLn(m, ' ', n);
    WriteLn('gcd: ', value)
end.
