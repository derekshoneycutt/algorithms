with Ada.Text_IO;
with Ada.Command_Line;
with Ada.Containers.Vectors;

procedure Max is
   type Integer_Array is array (Positive range <>) of Integer;

   function max(X : Integer_Array) return Integer is
      current : Integer := 0;
   begin
      for V in X'Range loop
         if X(V) > current then
            current := X(V);
         end if;
      end loop;

      return current;
   end max;

   Arg_Count : Integer := Ada.Command_Line.Argument_Count;
   Arg_Array : access Integer_Array;
   MaxValue : Integer;
begin
   if Arg_Count = 0 then
      Arg_Count := 2;
      Arg_Array := new Integer_Array(1 .. 2);
      Arg_Array(1) := 15;
      Arg_Array(2) := 10;
   else
      Arg_Array := new Integer_Array(1 .. Arg_Count);

      for index in 1 .. Arg_Count loop
         Arg_Array(index) := Integer'Value(Ada.Command_Line.Argument(index));
      end loop;
   end if;

   MaxValue := max(Arg_Array.all);

   Ada.Text_IO.Put_Line("values:");
   for index in Arg_Array'Range loop
      Ada.Text_IO.Put_Line(Integer'Image(Arg_Array(index)));
   end loop;
   Ada.Text_IO.Put_Line("max: " & Integer'Image(MaxValue));
end Max;
