       IDENTIFICATION DIVISION.
       PROGRAM-ID. MAIN.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 ARG-RAW PIC X(10).
         01 M PIC 9(4) VALUE 15.
         01 N PIC 9(4) VALUE 10.
         01 R PIC 9(4) VALUE 0.

         01 M_OUT PIC Z(1)9.
         01 N_OUT PIC Z(1)9.
         01 GCD_OUT PIC Z(1)9.

       PROCEDURE DIVISION.
           ACCEPT ARG-RAW FROM ARGUMENT-VALUE.
           IF ARG-RAW = SPACES
             MOVE FUNCTION TRIM(M) TO M_OUT
           ELSE
             COMPUTE M_OUT = FUNCTION NUMVAL(ARG-RAW)
             MOVE M_OUT TO M
           END-IF
           ACCEPT ARG-RAW FROM ARGUMENT-VALUE.
           IF ARG-RAW = SPACES
             MOVE FUNCTION TRIM(N) TO N_OUT
           ELSE
             COMPUTE N_OUT = FUNCTION NUMVAL(ARG-RAW)
             MOVE N_OUT TO N
           END-IF
           
           CALL 'UTIL' USING M, N, R.
           MOVE N TO GCD_OUT.
           DISPLAY M_OUT ' ' N_OUT.
           DISPLAY 'gcd:' GCD_OUT.
           STOP RUN.

       END PROGRAM MAIN.

       IDENTIFICATION DIVISION.
       PROGRAM-ID. UTIL.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 D PIC 9(4).
         LINKAGE SECTION.
         01 M PIC 9(4).
         01 N PIC 9(4).
         01 R PIC 9(4).

       PROCEDURE DIVISION USING M, N, R.
           DIVIDE M BY N GIVING D REMAINDER R.
           PERFORM LOOP UNTIL R <= 0.
           EXIT PROGRAM.

         LOOP.
           MOVE N TO M.
           MOVE R TO N.
           DIVIDE M BY N GIVING D REMAINDER R.


       END PROGRAM UTIL.
