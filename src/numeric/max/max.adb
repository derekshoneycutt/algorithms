-- Calculate the maximum value of an array of values

with Ada.Text_IO;
with Ada.Command_Line;
with Ada.Containers.Vectors;

procedure Max is
   type Integer_Array is array (Positive range <>) of Integer;

   -- We create a generic max method that takes in moreorless any compatible type to the int array
   generic
      type Element_Type is private;
      type Index_Type is (<>);
      type Array_Type is array (Index_Type range <>) of Element_Type;
      with function ">"(Left, Right : Element_Type) return Boolean is <>;
   function max_generic(X : Array_Type) return Element_Type;

   -- Choose the maximum value out of the array
   function max_generic(X : Array_Type) return Element_Type is
      current : Element_Type := X(X'First);
   begin
      for V in X'Range loop
         if X(V) > current then
            current := X(V);
         end if;
      end loop;

      return current;
   end max_generic;

   -- Instantiate the max function on the standard integer array
   function max is new max_generic(
      Element_Type => Integer,
      Index_Type => Positive,
      Array_Type => Integer_Array
   );

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
      -- Why try to parse all available command line arguments as numbers
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
