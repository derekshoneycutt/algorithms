# This program gets the maximum value of a sequence of values
import sys

def max_list[T](inlist: list[T]) -> T:
    """
    Finds the maximum value in a list of numbers.

    Parameters
    ----------
    list
        The list to find the maximum value from

    Returns
    ---------
        The maximum value of the list
    """
    current = 0
    for value in inlist:
        if value > current:
            current = value
    return current

uselist = [15, 10]
if len(sys.argv) > 1:
    uselist = [int(arg) for arg in sys.argv[1:]]

maxValue = max_list(uselist)

print(f"values: {uselist}")
print(f"max: {maxValue}")
