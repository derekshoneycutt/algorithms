
defmodule Primes do
  def sieve_loop(n) do
    receive do
      {:test_candidate, from, candidate} ->
        send(from, {:tested, self(), rem(candidate, n) != 0})
        sieve_loop(n)
      {:stop} ->
        :ok
    end
  end

  def sieve([], _, _) do
    :ok
  end
  def sieve([head | tail], from, candidate) do
    send(head, {:test_candidate, from, candidate})
    sieve(tail, from, candidate)
  end

  def exit_sieve([]) do
    :ok
  end
  def exit_sieve([head | tail]) do
    send(head, {:stop})
    exit_sieve(tail)
  end

  def test_loop([], from) do
    send(from, {:is_prime})
  end
  def test_loop(sieve, from) do
    receive do
      {:tested, pid, true} ->
        test_loop(sieve -- [pid], from)
      {:tested, _, false} ->
        send(from, {:not_prime})
    end
  end

  def first_n(n, _, _, _) when n < 1 do
    []
  end
  def first_n(n, _, _, _) when n == 1 do
    [2]
  end
  def first_n(n, prior, sieve, _) when length(prior) >= n do
    exit_sieve(sieve)
    prior
  end
  def first_n(n, [], _, _) do
    sieve3 = spawn(fn -> sieve_loop(3) end)
    first_n(n, [2,3], [sieve3], 5)
  end
  def first_n(n, prior, sieve, candidate) do
    thisPid = self()
    tester = spawn(fn -> test_loop(sieve, thisPid) end)
    sieve(sieve, tester, candidate)
    receive do
      {:is_prime} ->
        newPid = spawn(fn -> sieve_loop(candidate) end)
        first_n(n, prior ++ [candidate], sieve ++ [newPid], candidate + 2)
      {:not_prime} ->
        first_n(n, prior, sieve, candidate + 2)
    end
  end

  def first_n(n, to) do
    send(to, {:print_primes, first_n(n, [], [], 2)})
  end
end

defmodule PrimesPrinter do
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, []) do
    {p1, p2, p3, p4, p5, p6, p7, p8, p9, p10}
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail])
    when length(p1) < 50 do
    prime_split_to_print(p1 ++ [head], p2, p3, p4, p5, p6, p7, p8, p9, p10, tail)
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail])
    when length(p2) < 50 do
    prime_split_to_print(p1, p2 ++ [head], p3, p4, p5, p6, p7, p8, p9, p10, tail)
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail])
    when length(p3) < 50 do
    prime_split_to_print(p1, p2, p3 ++ [head], p4, p5, p6, p7, p8, p9, p10, tail)
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail])
    when length(p4) < 50 do
    prime_split_to_print(p1, p2, p3, p4 ++ [head], p5, p6, p7, p8, p9, p10, tail)
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail])
    when length(p5) < 50 do
    prime_split_to_print(p1, p2, p3, p4, p5 ++ [head], p6, p7, p8, p9, p10, tail)
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail])
    when length(p6) < 50 do
    prime_split_to_print(p1, p2, p3, p4, p5, p6 ++ [head], p7, p8, p9, p10, tail)
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail])
    when length(p7) < 50 do
    prime_split_to_print(p1, p2, p3, p4, p5, p6, p7 ++ [head], p8, p9, p10, tail)
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail])
    when length(p8) < 50 do
    prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8 ++ [head], p9, p10, tail)
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail])
    when length(p9) < 50 do
    prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9 ++ [head], p10, tail)
  end
  def prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, [head | tail]) do
    prime_split_to_print(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10 ++ [head], tail)
  end
  def prime_split_to_print(primes) do
    prime_split_to_print([], [], [], [], [], [], [], [], [], [], primes)
  end

  def print_primes_lines([], [], [], [], [], [], [], [], [], []) do
    :ok
  end
  def print_primes_lines([head1 | tail1], [head2 | tail2], [head3 | tail3],
    [head4 | tail4], [head5 | tail5], [head6 | tail6], [head7 | tail7],
    [head8 | tail8], [head9 | tail9], [head10 | tail10]) do
      IO.write(:stdio, :io_lib.format(
        "    ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B~n",
        [head1, head2, head3, head4, head5, head6, head7, head8, head9, head10]))
      print_primes_lines(tail1, tail2, tail3, tail4, tail5, tail6,
        tail7, tail8, tail9, tail10)
  end
  def print_primes_lines(primes) do
    splitPrimes = prime_split_to_print(primes)
    print_primes_lines(elem(splitPrimes, 0), elem(splitPrimes, 1),
      elem(splitPrimes, 2), elem(splitPrimes, 3), elem(splitPrimes, 4),
      elem(splitPrimes, 5), elem(splitPrimes, 6), elem(splitPrimes, 7),
      elem(splitPrimes, 8), elem(splitPrimes, 9))
  end

  def print_primes(from) do
    receive do
      {:print_primes, primes} ->
        IO.puts("First Five Hundred Primes")
        print_primes_lines(primes)
        send(from, {:stop})
    end
  end
end

primaryPid = self()
printer = spawn(fn -> PrimesPrinter.print_primes(primaryPid) end)
spawn(fn -> Primes.first_n(500, printer) end)
receive do
  {:stop} -> :ok
end
