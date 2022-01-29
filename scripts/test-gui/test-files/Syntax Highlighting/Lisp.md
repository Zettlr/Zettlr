# Lisp Languages Syntax Highlighting

This file includes the Lisp file language syntax highlighting supported by Zettlr.

## Clojure

```clojure
(def ^:dynamic chunk-size 17)

(defn next-chunk [rdr]
  (let [buf (char-array chunk-size)
        s (.read rdr buf)]
  (when (pos? s)
    (java.nio.CharBuffer/wrap buf 0 s))))

(defn chunk-seq [rdr]
  (when-let [chunk (next-chunk rdr)]
    (cons chunk (lazy-seq (chunk-seq rdr)))))
```
## Lisp

```clisp
#!/usr/bin/env csi

(defun prompt-for-cd ()
   "Prompts
    for CD"
   (prompt-read "Title" 1.53 1 2/4 1.7 1.7e0 2.9E-4 +42 -7 #b001 #b001/100 #o777 #O777 #xabc55 #c(0 -5.6))
   (prompt-read "Artist" &rest)
   (or (parse-integer (prompt-read "Rating") :junk-allowed t) 0)
  (if x (format t "yes") (format t "no" nil) ;and here comment
  )
  ;; second line comment
  '(+ 1 2)
  (defvar *lines*)                ; list of all lines
  (position-if-not #'sys::whitespacep line :start beg))
  (quote (privet 1 2 3))
  '(hello world)
  (* 5 7)
  (1 2 34 5)
  (:use "aaaa")
  (let ((x 10) (y 20))
    (print (+ x y))
  )
```

## Scheme

```scheme
;; Calculation of Hofstadter's male and female sequences as a list of pairs

(define (hofstadter-male-female n)
(letrec ((female (lambda (n)
           (if (= n 0)
           1
           (- n (male (female (- n 1)))))))
     (male (lambda (n)
         (if (= n 0)
             0
             (- n (female (male (- n 1))))))))
  (let loop ((i 0))
    (if (> i n)
    '()
    (cons (cons (female i)
            (male i))
      (loop (+ i 1)))))))

(hofstadter-male-female 8)

(define (find-first func lst)
(call-with-current-continuation
 (lambda (return-immediately)
   (for-each (lambda (x)
       (if (func x)
           (return-immediately x)))
         lst)
   #f)))
```
