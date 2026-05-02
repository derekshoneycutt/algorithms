{
    Get the maximum value of a sequence of values
}

program max;
{$mode objfpc} // generics is a freepascal feature; we break other pascal possibly here
    uses SysUtils;

    (* Get the maximum value of a sequence of values of type T *)
    generic function max<T>(values : array of T) : T;
        var
            current : T;
            i : integer;
    begin
        current := values[0];
        for i := Low(values) to High(values) do begin
            if values[i] > current then
                current := values[i];
        end;
        Result := current;
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

    maximum := specialize max<integer>(values);

    Write('values: [', values[0]);
    for i := 1 to High(values) do begin
        Write(', ', values[i]);
    end;
    WriteLn(']');
    WriteLn('max: ', maximum);
end.
