{-
    This module finds the maximum value of a sequence of numbers
-}
module Main

import System
import Data.List
import Data.Maybe
import Data.String

covering

||| Get the maximum value of a sequence of values
|||
||| Parameters:
|||     xs : List a - The list of values to find the maximum of
||| Returns:
|||     The maximum value of the list
maxOf : Ord a => List a -> Maybe a
maxOf [] = Nothing
maxOf (x :: xs) = Just (maxOfAccum xs x)
    where
        maxOfAccum : List a -> a -> a
        maxOfAccum [] currentMax = currentMax
        maxOfAccum (y :: ys) currentMax =
            let newMax = if y > currentMax then y else currentMax in
            maxOfAccum ys newMax

||| Get the arguments list as integers
|||
||| Parameters:
|||     args : List String - The list of arguments to convert to integers
||| Returns:
|||     Maybe (List Integer) - The list of integers if all arguments are valid, otherwise Nothing
argsAsInts : List String -> Maybe (List Integer)
argsAsInts [] = Nothing
argsAsInts args = traverse parseInteger args

||| The main entry point to the application
main : IO ()
main = do
    args <- getArgs
    let userArgs = drop 1 args
    let intArgs = fromMaybe [15, 10] (argsAsInts userArgs)
    let maxValue = maxOf intArgs

    putStrLn $ "values: [" ++ (concat (intersperse " " (map show intArgs))) ++ "]"
    putStrLn $ "max: " ++ case maxValue of
        Nothing => "n/a"
        Just value => show value

