with Ada.Text_IO;
with Ada.Command_Line;

procedure EuclidGcd is

   function gcd
      (m_in : Integer;
      n_in : Integer) return Integer is
      m, n, r : Integer;
   begin
      m := m_in;
      n := n_in;
      r := m rem n;
      while r /= 0 loop
         m := n;
         n := r;
         r := m rem n;
      end loop;
      return n;
   end gcd;

   m : Integer;
   n : Integer;
begin
   m := 15;
   n := 10;
   
   if Ada.Command_Line.Argument_Count >= 2 then
      m := Integer'Value(Ada.Command_Line.Argument(1));
      n := Integer'Value(Ada.Command_Line.Argument(2));
   end if;

   Ada.Text_IO.Put_Line(Integer'Image(m) & " " & Integer'Image(n));
   Ada.Text_IO.Put_Line(Integer'Image(gcd(m, n)));
end EuclidGcd;
