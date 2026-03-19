import System.Environment (getArgs)
import Data.List (intersperse)

max_list :: [Integer] -> Integer
max_list [] = 0
max_list (x : xs) = max_list_state xs x

max_list_state :: [Integer] -> Integer -> Integer
max_list_state [] max = max
max_list_state (x : xs) max
    | x > max = max_list_state xs x
    | otherwise = max_list_state xs max

argsAsInts :: [String] -> (Maybe [Integer])
argsAsInts [] = Nothing
argsAsInts args = Just [read arg :: Integer | arg <- args]

orDefault :: (Maybe [Integer]) -> [Integer] -> [Integer]
orDefault Nothing list = list
orDefault (Just list) _ = list

main :: IO ()
main = do
    args <- getArgs
    let intArgs = orDefault (argsAsInts args) [15, 10]
    let maxValue = max_list intArgs

    putStrLn $ "values: [" ++ (concat (intersperse " " (map show intArgs))) ++ "]"
    putStrLn $ "max: " ++ show maxValue
