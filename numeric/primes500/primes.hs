import Text.Printf

primes :: [Integer]
primes = sieve [2..]
  where
    sieve (p : xs) =
        p : sieve [x | x <- xs, x `mod` p /= 0]
    sieve [] = []

firstPrimes :: Int -> [Integer]
firstPrimes n = take n primes

pad :: Integer -> String
pad num = printf "%04d" num

printLine :: [Integer] -> IO ()
printLine values =
    putStrLn $ "     "
        ++ pad (values !! 0) ++ " " ++ pad (values !! 1)
        ++ " " ++ pad (values !! 2) ++ " " ++ pad (values !! 3)
        ++ " " ++ pad (values !! 4) ++ " " ++ pad (values !! 5)
        ++ " " ++ pad (values !! 6) ++ " " ++ pad (values !! 7)
        ++ " " ++ pad (values !! 8) ++ " " ++ pad (values !! 9)

printLines :: [Integer] -> Int -> IO ()
printLines values i
    | (length values) `div` 10 > i = do
        printLine [(values !! i), (values !! (i + 50)),
            (values !! (i + 100)), (values !! (i + 150)),
            (values !! (i + 200)), (values !! (i + 250)),
            (values !! (i + 300)), (values !! (i + 350)),
            (values !! (i + 400)), (values !! (i + 450))]
        printLines values (i + 1)
    | otherwise = return ()

printPrimes :: [Integer] -> IO ()
printPrimes primes = do
    putStrLn $ "First Five Hundred Primes"
    printLines primes 0

main :: IO ()
main = printPrimes (firstPrimes 500)
