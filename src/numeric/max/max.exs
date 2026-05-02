# This application gets the max value of a sequence of values

defmodule Max do
  @moduledoc """
    This module contains the functions for finding the max of a sequence of values.
  """

  @doc """
    Calculate the max value of a list
  """
  def max_list([]), do: 0
  def max_list([head | tail]), do: max_list(tail, head)
  def max_list([], curr), do: curr
  def max_list([head | tail], curr) when head > curr, do: max_list(tail, head)
  def max_list([_ | tail], curr), do: max_list(tail, curr)

  @doc """
    Get a max value and send it to the given PID
  """
  def perform_max(list, pid) do
    maxValue = max_list(list)
    send(pid, {:display, maxValue})
  end

  @doc """
    Wait for a message containing a list and then calculate the max value and send it back
  """
  def perform_max(pid) do
    receive do
      {:max, list} -> perform_max(list, pid)
    end
  end

  @doc """
    Convert a list of string arguments to integers, using a default list if the input list is empty.
  """
  def argsAsInts([], default), do: default
  def argsAsInts(list, _), do: Enum.map(list, fn s -> String.to_integer(s) end)

  @doc """
  The main entry point for our application
  """
  def main(args) do
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
  end
end
