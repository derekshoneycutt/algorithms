{-
    Calculate the GCD between two values and print it all to the screen
 -}

import System.Environment (getArgs)

-- | Calculate the GCD of two values using the recursive form of Euclid's algorithm
euclidgcd :: Integer -> Integer -> Integer
euclidgcd m 0 = m
euclidgcd m n = euclidgcd n (m `mod` n)

-- | Attempt to get 2 values from a list, or return Nothing
tryPair :: [String] -> Maybe (String, String)
tryPair (x : y : xs) = Just (x, y)
tryPair _ = Nothing

-- | Get the first value from a pair, or a default value if pair is Nothing
firstOrDefault :: (Maybe (String, String)) -> Integer -> Integer
firstOrDefault (Just (x, y)) _ = (read x :: Integer)
firstOrDefault Nothing v = v

-- | Get the second value from a pair, or a default value if pair is Nothing
secondOrDefault :: (Maybe (String, String)) -> Integer -> Integer
secondOrDefault (Just (x, y)) _ = (read y :: Integer)
secondOrDefault Nothing v = v

-- | The main entry point to the application
main :: IO ()
main = do
    -- First, we get the command line arguments or 15, 10 if not available
    args <- getArgs
    let twoArgs = tryPair args
    let m = firstOrDefault twoArgs 15
    let n = secondOrDefault twoArgs 10

    -- Then calculate and print
    let gcd = euclidgcd m n
    putStrLn $ show m ++ " " ++ show n
    putStrLn $ "gcd: " ++ show gcd
