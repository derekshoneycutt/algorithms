
defmodule Easters do
  def get_easter_for(y) do
    g = rem(y, 19) + 1
    c = div(y, 100) + 1
    x = div(3 * c, 4) - 12
    z = div((8 * c) + 5, 25) - 5
    d = div(5 * y, 4) - x - 10
    et = rem((11 * g) + 20 + z - x, 30)
    e = if ((et == 25) and (g > 11) or (et == 24)) do
      et + 1
    else
      et
    end
    nfmt = 44 - e
    nfm = if nfmt < 21 do
      nfmt + 30
    else
      nfmt
    end
    n = nfm + 7 - rem(d + nfm, 7)
    month = if n > 31 do
      "April"
    else
      "March"
    end
    day = if n > 31 do
      n - 31
    else
      n
    end
    {y, month, day}
  end

  def get_easters(year, endYear, pid) when year > endYear do
    send(pid, {:stop})
  end
  def get_easters(year, endYear, pid) do
    send(pid, {:easter, get_easter_for(year)})
    get_easters(year + 1, endYear, pid)
  end
end

defmodule EastersPrinter do
  def print_easters_loop(pid) do
    receive do
      {:easter, easter} ->
        IO.write(:stdio, :io_lib.format(
          "   ~2..0B ~s, ~4..0B~n",
          [elem(easter, 2), elem(easter, 1), elem(easter, 0)]))
          print_easters_loop(pid)
      {:stop} ->
        send(pid, {:stop})
    end
  end

  def print_easters(pid) do
    IO.puts("Easters:")
    print_easters_loop(pid)
  end
end

primaryPid = self()
printer = spawn(fn -> EastersPrinter.print_easters(primaryPid) end)
spawn(fn -> Easters.get_easters(1950, 2050, printer) end)
receive do
  {:stop} -> :ok
end
