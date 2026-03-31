{-
    This module calculates the greatest common denominator between 2 values
-}
module Main

import System
import Data.Maybe
import Data.String

covering

||| Calculates the GCD according to Euclid's algorithm
|||
||| Parameters:
|||     m : The first value to calculate for
|||     n : The second value to calculate for
||| Returns:
|||     The calculated greatest common denominator
euclidgcd : Int -> Int -> Int
euclidgcd m 0 = m
euclidgcd m n = euclidgcd n (mod m n)

||| Pulls a specific argument out of a list of values
|||
||| Parameters:
|||     n : The index of the value to get from the list
|||     list : The list to get an item from
at : Nat -> List a -> Maybe a
at _ [] = Nothing
at 0 (x :: _) = Just x
at (S k) (_ :: xs) = at k xs

||| The main entry point to the application
main : IO ()
main = do
    args <- getArgs
    let mstr = fromMaybe "" (at 1 args)
    let nstr = fromMaybe "" (at 2 args)
    let m = fromMaybe 15 (parseInteger mstr)
    let n = fromMaybe 10 (parseInteger nstr)
    let gcd = euclidgcd m n
    putStrLn $ show m ++ " " ++ show n
    putStrLn $ "gcd: " ++ show gcd
