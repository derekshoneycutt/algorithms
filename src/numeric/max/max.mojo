# Gets the maximum value of some sequence of values

from std.sys.arg import argv
from std.collections.string import atol
from std.collections.list import List

def max[T: Comparable & ImplicitlyCopyable](values: List[T]) raises -> T:
    """
    Gets the maximum value of a sequence of values.

    Parameters
    -----------
    values : List[T]
        A list of values to find the maximum from.

    Returns
    -------
    T
        The maximum value in the list.
    """
    var current = values[0]
    for value in values:
        if value > current:
            current = value
    return current

def main() raises:
    """
    The main entry point to the application.

    We try to take all arguments from command line or use 15, 10.
    """
    var values = List[Int]()
    var args = argv()
    if len(args) > 1:
        for i in range(1, len(args)):
            values.append(atol(args[i]))
    else:
        values.append(15)
        values.append(10)

    var maximum = max(values)

    print(t"values: {values}")
    print(t"max: {maximum}")

