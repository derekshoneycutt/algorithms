
       IDENTIFICATION DIVISION.
       PROGRAM-ID. MAIN.

       DATA DIVISION.
        WORKING-STORAGE SECTION.
         01 FIRST-YEAR PIC 9(4) VALUE 1950.
         01 FINAL-YEAR PIC 9(4) VALUE 2050.

       PROCEDURE DIVISION.
           CALL 'PRINT-EASTERS' USING FIRST-YEAR, FINAL-YEAR.
           STOP RUN.

       END PROGRAM MAIN.

       IDENTIFICATION DIVISION.
       PROGRAM-ID. PRINT-EASTERS.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 MONTH PIC X(5) VALUE SPACES.
         01 CURRENT-DATE.
           05 DD PIC 9(2).
           05 M PIC 9(2).
           05 Y PIC 9(4).
         01 IS-VALID PIC X.
           88 IS-VALID-TRUE VALUE 'T1'.
           88 IS-VALID-FALSE VALUE 'F'.
         LINKAGE SECTION.
         01 FIRST-YEAR PIC 9(4).
         01 FINAL-YEAR PIC 9(4).

       PROCEDURE DIVISION USING FIRST-YEAR, FINAL-YEAR.
           DISPLAY 'Easters:'
           MOVE FIRST-YEAR TO Y.
           CALL 'GENERATE-EASTERS'
                   USING CURRENT-DATE, FINAL-YEAR, IS-VALID.
           PERFORM UNTIL IS-VALID-FALSE
               IF M = 3
                   MOVE 'March' TO MONTH
               ELSE
                   MOVE 'April' TO MONTH
               END-IF
               DISPLAY '   ' DD ' ' MONTH ', ' Y

               CALL 'GENERATE-EASTERS'
                       USING CURRENT-DATE, FINAL-YEAR, IS-VALID
           END-PERFORM.

           EXIT PROGRAM.

       END PROGRAM PRINT-EASTERS.

       IDENTIFICATION DIVISION.
       PROGRAM-ID. GENERATE-EASTERS.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 I PIC 9(1) VALUE 0.
         LINKAGE SECTION.
         01 FINAL-YEAR PIC 9(4).
         01 CURRENT-DATE.
           05 DD PIC 9(2).
           05 M PIC 9(2).
           05 Y PIC 9(4).
         01 IS-VALID PIC X.
           88 IS-VALID-TRUE VALUE 'T1'.
           88 IS-VALID-FALSE VALUE 'F'.
       
       PROCEDURE DIVISION USING CURRENT-DATE, FINAL-YEAR, IS-VALID.
           IF I > 0
               ADD 1 TO Y
           ELSE
               SET IS-VALID-TRUE TO TRUE
               ADD 1 TO I
           END-IF.
           IF Y > FINAL-YEAR
               SET IS-VALID-FALSE TO TRUE
               EXIT PROGRAM
           END-IF.
           CALL 'EASTER-FOR' USING CURRENT-DATE.
           EXIT PROGRAM.

       END PROGRAM GENERATE-EASTERS.

       IDENTIFICATION DIVISION.
       PROGRAM-ID. EASTER-FOR.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 T1 PIC 9(4) VALUE 0.
         01 T2 PIC 9(4) VALUE 0.
         01 G PIC 9(4) VALUE 0.
         01 C PIC 9(4) VALUE 0.
         01 X PIC 9(4) VALUE 0.
         01 Z PIC 9(4) VALUE 0.
         01 D PIC 9(5) VALUE 0.
         01 E PIC 9(4) VALUE 0.
         01 N PIC 9(2) VALUE 0.

         LINKAGE SECTION.
         01 CURRENT-DATE.
           05 DD PIC 9(2).
           05 M PIC 9(2).
           05 Y PIC 9(4).

       PROCEDURE DIVISION USING CURRENT-DATE.
      * Step 1
           DIVIDE Y BY 19 GIVING T1 REMAINDER G.
           ADD 1 TO G.

      * Step 2
           DIVIDE Y BY 100 GIVING C.
           ADD 1 TO C.

      * Step 3
           MULTIPLY 3 BY C GIVING X.
           DIVIDE X BY 4 GIVING X.
           SUBTRACT 12 FROM X.

           MULTIPLY 8 BY C GIVING Z.
           ADD 5 TO Z.
           DIVIDE Z BY 25 GIVING Z.
           SUBTRACT 5 FROM Z.

      * Step 4
           MULTIPLY 5 BY Y GIVING D.
           DIVIDE D BY 4 GIVING D.
           SUBTRACT X FROM D.
           SUBTRACT 0010 FROM D.

      * Step 5
           MULTIPLY 11 BY G GIVING E.
           ADD 20 TO E.
           ADD Z TO E.
           SUBTRACT X FROM E.
           DIVIDE E BY 30 GIVING T1 REMAINDER E.

           IF (E = 25 AND G > 11) OR (E = 24)
               ADD 1 TO E
           END-IF.

      * Step 6
           MOVE 44 TO N.
           SUBTRACT E FROM N.
           IF N < 21
               ADD 30 TO N
           END-IF.

      * Step 7
           MOVE D TO T1.
           ADD N TO T1.
           DIVIDE T1 BY 7 GIVING T2 REMAINDER T1.
           ADD 7 TO N.
           SUBTRACT T1 FROM N.

      * Step 8
           IF N > 31
               MOVE N TO DD
               SUBTRACT 31 FROM DD
               MOVE 4 TO M
           ELSE
               MOVE N TO DD
               MOVE 3 TO M
           END-IF.
           EXIT PROGRAM.

       END PROGRAM EASTER-FOR.
