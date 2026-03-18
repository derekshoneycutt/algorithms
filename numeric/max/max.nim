import os
import std/strutils
import std/strformat

proc max(values: var seq[int]): int =
    var current = 0
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
