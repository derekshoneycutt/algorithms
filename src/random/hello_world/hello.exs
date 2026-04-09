
# Comments are simple
# Elixir also has @moduledoc and @doc for documentation
defmodule Hello do
  @moduledoc """
    This application just prints hello to the screen
  """

  @doc """
  The main entry point for our application
  """
  def main(_args) do
    IO.puts("Hello, world!")
  end
end
