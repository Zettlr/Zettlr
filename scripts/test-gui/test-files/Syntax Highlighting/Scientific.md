# Scientific Languages Syntax Highlighting

This file includes the scientific language syntax highlighting supported by Zettlr.

## R

```r
library(ggplot2)

centre <- function(x, type, ...) {
  switch(type,
         mean = mean(x),
         median = median(x),
         trimmed = mean(x, trim = .1))
}

myVar1
myVar.2
data$x
foo "bar" baz
# test "test"
"test # test"

(123) (1) (10) (0.1) (.2) (1e-7)
(1.2e+7) (2e) (3e+10) (0x0) (0xa)
(0xabcdef1234567890) (123L) (1L)
(0x10L) (10000000L) (1e6L) (1.1L)
(1e-3L) (4123.381E-10i)
(3.) (3.E10) # BUG: .E10 should be part of number

# Numbers in some different contexts
1L
0x40
.234
3.
1L + 30
plot(cars, xlim=20)
plot(cars, xlim=0x20)
foo<-30
my.data.3 <- read() # not a number
c(1,2,3)
1%%2

"this is a quote that spans
multiple lines
\"

is this still a quote? it should be.
# even still!

" # now we're done.

'same for
single quotes #'

# keywords
NULL, NA, TRUE, FALSE, Inf, NaN, NA_integer_,
NA_real_, NA_character_, NA_complex_, function,
while, repeat, for, if, in, else, next, break,
..., ..1, ..2

# not keywords
the quick brown fox jumped over the lazy dogs
null na true false inf nan na_integer_ na_real_
na_character_ na_complex_ Function While Repeat
For If In Else Next Break .. .... "NULL" `NULL` 'NULL'

# operators
+, -, *, /, %%, ^, >, >=, <, <=, ==, !=, !, &, |, ~,
->, <-, <<-, $, :, ::

# infix operator
foo %union% bar
%"test"%
`"test"`
```

## Julia

```julia
### Types

# Old-style definitions

immutable Point{T<:AbstractFloat}
    index::Int
    x::T
    y::T
end

abstract A

type B <: A end

typealias P Point{Float16}

# New-style definitions

struct Plus
    f::typeof(+)
end

mutable struct Mut
    mutable::A          # mutable should not be highlighted (not followed by struct)
    primitive::B        # primitive should not be highlighted (not followed by type)
end

primitive type Prim 8 end

abstract type Abstr end

### Modules

module M

using X
import Y
importall Z

export a, b, c

end # module

baremodule Bare
end

### New in 0.6

# where, infix isa, UnionAll
function F{T}(x::T) where T
    for i in x
        i isa UnionAll && return
    end
end

### Miscellaneous

#=
Multi
Line
Comment
=#
function method0(x, y::Int; version::VersionNumber=v"0.1.2")
    """
    Triple
    Quoted
    String
    """

    @assert π > e

    s = 1.2
    変数 = "variable"

    if s * 100_000 ≥ 5.2e+10 && true || x === nothing
        s = 1. + .5im
    elseif 1 ∈ [1, 2, 3]
        println("s is $s and 変数 is $変数")
    else
        x = [1 2 3; 4 5 6]
        @show x'
    end

    local var = rand(10)
    global g = 44
    var[1:5]
    var[5:end-1]
    var[end]

    opt = "-la"
    run(`ls $opt`)

    try
        ccall(:lib, (Ptr{Void},), Ref{C_NULL})
    catch
        throw(ArgumentError("wat"))
    finally
        warn("god save the queen")
    end

    '\u2200' != 'T'

    return 5s / 2
end
```
