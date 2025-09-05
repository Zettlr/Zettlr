Table Test File
===============

This test contains several different tables which should be rendered properly using Zettlr's Table Editor.

Pipe Table One
--------------

| Right | Left | Default | Center |
|------:|:-----|---------|:------:|
|   12  |  12  |    12   |    12  |
|  123  |  123 |   123   |   123  |
|    1  |    1 |     1   |     1  |

Pipe Table Two
--------------

fruit  | price
-------|-----:
apple  |  2.05
pear   |  1.37
orange |  3.09

Pipe Table Three
----------------

| One | Two   |
|-----+-------|
| my  | table |
| is  | nice  |

Grid Table One
--------------

+---------------+---------------+--------------------+
| Fruit         | Price         | Advantages         |
+===============+===============+====================+
| Bananas       | $1.34         | - built-in wrapper |
|               |               | - bright color     |
+---------------+---------------+--------------------+
| Oranges       | $2.10         | - cures scurvy     |
|               |               | - tasty            |
+---------------+---------------+--------------------+

Grid Table Two
--------------

+---------------+---------------+--------------------+
| Right         | Left          | Centered           |
+==============:+:==============+:==================:+
| Bananas       | $1.34         | built-in wrapper   |
+---------------+---------------+--------------------+

Grid Table Three
----------------

+--------------:+:--------------+:------------------:+
| Right         | Left          | Centered           |
+---------------+---------------+--------------------+

## Tables with Elements

A test table with math equations and other elements to test out proper table
rendering.

| Formula                                        | Description                                        |
|------------------------------------------------|----------------------------------------------------|
| $\tilde{m}$                                    | Mean                                               |
| $\cos(\vec{x}, \vec{y})$                       | Cosine similarity between $\vec{x}$ and $\vec{y}$. |
| $$\hat{y} = \beta_0 + \beta_1 X_i + \epsilon$$ | Standard OLS regression equation.                  |
| [Zettlr Homepage](https://www.zettlr.com)      | A rendered link to zettlr.com.                     |

## Additional Test Tables

Use these tables to test how table parsing should work.

| A | B | C |
|---|---|---|
| D | E | F |
| G | H | I |
| J | K | L |

A | B | C
--|---|--
D | E | F
G | H | I
J | K | L

+---+---+---+
| A | B | C |
+===+===+===+
| D | E | F |
+---+---+---+
| G | H | I |
+---+---+---+
| J | K | L |
+---+---+---+
