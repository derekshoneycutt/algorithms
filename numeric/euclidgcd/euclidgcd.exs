
defmodule Euclid do
  def gcd(m, 0) do
    m
  end
  def gcd(m, n) do
    gcd(n, rem(m, n))
  end

  def print_all() do
    receive do
      {m, n} -> IO.puts("#{m} #{n}\n#{Euclid.gcd(m, n)}")
    end
  end
end

pid = spawn(fn -> Euclid.print_all() end)

case System.argv() do
  [arg1, arg2] ->
    send(pid, {String.to_integer(arg1), String.to_integer(arg2)})
  _ ->
    send(pid, {15, 10})
end
