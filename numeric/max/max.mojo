from std.sys.arg import argv
from std.collections.string import atol
from std.collections.list import List

def max(values: List[Int]) raises -> Int:
    var current = 0
    for value in values:
        if value > current:
            current = value
    return current

def main() raises:
    var values = List[Int]()
    var args = argv()
    if len(args) > 1:
        for i in range(1, len(args) - 1):
            values.append(atol(args[i]))
    else:
        values.append(15)
        values.append(10)

    var maximum = max(values)

    print(t"values: {values}")
    print(t"max: {maximum}")

