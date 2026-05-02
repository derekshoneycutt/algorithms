# This program gets the maximum value of a sequence of values
import sys

def max_list(list):
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
    for value in list:
        if value > current:
            current = value
    return current

list = [15, 10]
if len(sys.argv) > 1:
    list = [int(arg) for arg in sys.argv[1:]]

maxValue = max_list(list)

print(f"values: {list}")
print(f"max: {maxValue}")
