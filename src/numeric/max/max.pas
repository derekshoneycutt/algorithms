program max;
    uses SysUtils;

    function max(values : array of integer) : integer;
        var current, i : integer;
    begin
        current := 0;
        for i := Low(values) to High(values) do begin
            if values[i] > current then
                current := values[i];
        end;
        max := current;
    end;

    var values : array of integer;
    var i, maximum : integer;
begin
    if ParamCount > 0 then begin
        SetLength(values, ParamCount);
        for i := 1 to ParamCount do begin
            values[i - 1] := StrToInt(ParamStr(i));
        end;
    end
    else begin
        SetLength(values, 2);
        values[0] := 15;
        values[1] := 10;
    end;

    maximum := max(values);

    Write('values: [', values[0]);
    for i := 1 to High(values) do begin
        Write(', ', values[i]);
    end;
    WriteLn(']');
    WriteLn('max: ', maximum);
end.
