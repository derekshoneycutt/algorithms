# This application calculates the GCD between two values and prints it all to the screen

defmodule Euclidgcd do
  @moduledoc """
    This module contains the functions for calculate and displaying
    the GCD of two values.
  """

  @doc """
    Calculates the GCD via the recursive form of Euclid's algorithm
  """
  def gcd(m, 0), do: m
  def gcd(m, n), do: gcd(n, rem(m, n))

  @doc """
    Waits for a message with two values and then prints it and their
    GCD to the screen
  """
  def print_all() do
    receive do
      {m, n} -> IO.puts("#{m} #{n}\ngcd: #{Euclidgcd.gcd(m, n)}")
    end
  end

  @doc """
  The main entry point for our application
  """
  def main(args) do
    # Just for fun, we use Task.async to show what it does.
    task = Task.async(fn -> Euclidgcd.print_all() end)

    case args do
      [arg1, arg2] ->
        send(task.pid, {String.to_integer(arg1), String.to_integer(arg2)})
      _ ->
        send(task.pid, {15, 10})
    end

    Task.await(task)
  end
end
