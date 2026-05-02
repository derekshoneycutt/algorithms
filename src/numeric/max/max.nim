#[
    Get the maximum value of some sequence of values
]#
import os
import std/strutils
import std/strformat

# Get the maximum value of a sequence
proc max[T](values: var seq[T]): T =
    var current = values[0]
    for value in values:
        if value > current:
            current = value
    return current

var values = newSeq[int]()
if paramCount() > 0:
    for i in 1..paramCount():
        values.add(parseInt(paramStr(i)))
else:
    values.add(15)
    values.add(10)

let maximum = max(values)

echo &"values: {values}"
echo &"max: {maximum}"
