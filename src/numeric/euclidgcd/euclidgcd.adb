with Ada.Text_IO;
with Ada.Command_Line;

procedure EuclidGcd is
   function gcd(m_in, n_in : Integer) return Integer is
      m : Integer := m_in;
      n : Integer := n_in;
      r : Integer;
   begin
      while n /= 0 loop
         r := m rem n;
         m := n;
         n := r;
      end loop;
      return m;
   end gcd;

   m, n : Integer;
begin
   m := 15;
   n := 10;
   
   if Ada.Command_Line.Argument_Count >= 2 then
      m := Integer'Value(Ada.Command_Line.Argument(1));
      n := Integer'Value(Ada.Command_Line.Argument(2));
   end if;

   Ada.Text_IO.Put_Line(Integer'Image(m) & " " & Integer'Image(n));
   Ada.Text_IO.Put_Line("gcd: " & Integer'Image(gcd(m, n)));
end EuclidGcd;
