with Ada.Text_IO;
with Ada.Containers.Vectors;
use Ada.Text_IO;

procedure Primes is
   package Int_IO is new Integer_IO(Integer);
   type Integer_Array is array (Positive range <>) of Integer;

   function Get_Primes return Integer_Array is
      Primes : Integer_Array(1 .. 500);
      n, j, k, q, r, t : Integer;
      IsPrime : Boolean;
   begin
      Primes(1) := 2;
      n := 3;

      for j in 2 .. 500 loop
         Primes(j) := n;

         IsPrime := false;
         while IsPrime = false loop
            n := n + 2;

            k := 2;
            q := 9999;
            r := 1;
            t := 0;
            while r /= 0 and q > t loop
               t := Primes(k);
               q := n / t;
               r := n rem t;

               k := k + 1;
            end loop;

            if r /= 0 and q <= t then
               IsPrime := true;
            end if;
         end loop;
      end loop;

      return Primes;
   end Get_Primes;

   procedure Print_Primes(Primes : in Integer_Array) is
      Index : Integer := 0;
   begin
      Put_Line("First Five Hundred Primes");
      for Index in 1 .. 50 loop
         Put("     ");
         Int_IO.Put(Item => Primes(Index), Width => 4);
         Put(" ");
         Int_IO.Put(Item => Primes(Index + 50), Width => 4);
         Put(" ");
         Int_IO.Put(Item => Primes(Index + 100), Width => 4);
         Put(" ");
         Int_IO.Put(Item => Primes(Index + 150), Width => 4);
         Put(" ");
         Int_IO.Put(Item => Primes(Index + 200), Width => 4);
         Put(" ");
         Int_IO.Put(Item => Primes(Index + 250), Width => 4);
         Put(" ");
         Int_IO.Put(Item => Primes(Index + 300), Width => 4);
         Put(" ");
         Int_IO.Put(Item => Primes(Index + 350), Width => 4);
         Put(" ");
         Int_IO.Put(Item => Primes(Index + 400), Width => 4);
         Put(" ");
         Int_IO.Put(Item => Primes(Index + 450), Width => 4);
         New_Line;
      end loop;
   end Print_Primes;
begin
   Print_Primes(Get_Primes);
end Primes;