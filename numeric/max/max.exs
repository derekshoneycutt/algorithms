
defmodule Max do
  def max_list([]) do
    0
  end
  def max_list([head | tail]) do
    max_list(tail, head)
  end
  def max_list([], curr) do
    curr
  end
  def max_list([head | tail], curr) when head > curr do
    max_list(tail, head)
  end
  def max_list([_ | tail], curr) do
    max_list(tail, curr)
  end

  def perform_max(list, pid) do
    maxValue = max_list(list)
    send(pid, {:display, maxValue})
  end

  def perform_max(pid) do
    receive do
      {:max, list} -> perform_max(list, pid)
    end
  end

  def argsAsInts([], default) do
    default
  end
  def argsAsInts(list, _) do
    Enum.map(list, fn s -> String.to_integer(s) end)
  end
end

parent_pid = self()
task = Task.async(fn -> Max.perform_max(parent_pid) end)

list = Max.argsAsInts(System.argv(), [15, 10])
send(task.pid, {:max, list})

receive do
  {:display, maxValue} ->
    IO.puts("values: #{inspect(list)}\nmax: #{maxValue}")
after
  5000 -> IO.puts("timeout")
end

Task.await(task)
