with Ada.Calendar; use Ada.Calendar;
with Ada.Text_IO; use Ada.Text_IO;

procedure Easter is
   package Int_IO is new Integer_IO(Integer);

   procedure GetEaster(year : in Year_Number;
      day : out Day_Number; month : out Month_Number) is
      g, c, x, z, d, e, n : Integer;
   begin
      g := (year rem 19) + 1;

      c := (year / 100) + 1;
      x := (3 * c / 4) - 12;
      z := (((8 * c) + 5) / 25) - 5;
      d :=  (5 * year / 4) - x - 10;
      e := ((11 * g) + 20 + z - x) rem 30;
      if (e = 25 and g > 11) or e = 24 then
         e := e + 1;
      end if;
      n := 44 - e;
      if n < 21 then
         n := n + 30;
      end if;
      n := n + 7 - ((d + n) rem 7);

      if n > 31 then
         day := n - 31;
         month := 4;
      else
         day := n;
         month := 3;
      end if;
   end GetEaster;

   task type Easter_Generator (from, to : Year_Number) is
      entry Next (day : out Day_Number;
         month : out Month_Number;
         year : out Year_Number);
   end Easter_Generator;
   task body Easter_Generator is
   begin
      for getyear in from .. to loop
         accept Next (day : out Day_Number;
            month : out Month_Number;
            year : out Year_Number) do
            year := getyear;
            GetEaster(year => getyear, day => day, month => month);
         end Next;
      end loop;
   end Easter_Generator;

   procedure PrintEasters(from, to : Year_Number) is
      gen : Easter_Generator (from, to);
      year : Year_Number;
      day : Day_Number;
      month : Month_Number;
   begin
      Put_Line("Easters:");
      while gen'Callable loop
         Gen.Next(day, month, year);
         Put("   ");
         Int_IO.Put(Item => day, Width => 2);
         if month = 3 then
            Put(" March, ");
         else
            Put(" April, ");
         end if;
         Int_IO.Put(Item => year, Width => 4);
         New_Line;
      end loop;
   end PrintEasters;

   startYear : Year_Number := 1950;
   endYear : Year_Number := 2050;
begin
   PrintEasters (startYear, endYear);
end Easter;
