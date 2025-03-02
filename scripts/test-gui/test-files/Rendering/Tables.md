Table Test File
===============

This test contains several different tables which should be rendered properly using Zettlr's Table Editor.

But first of all, let us add a malformed Setext heading to test that it's not rendered as a table. Sometimes users forget that a Setext heading must be followed by an empty line, and that strictly speaking makes up for a two-row, one-column table. So we will ignore any simple table that seems to look like this.

This is a malformed Setext heading
----------------------------------
And immediately following a paragraph

Simple Table One
----------------

  Right     Left     Center     Default
-------     ------ ----------   -------
     12     12        12            12
    123     123       123          123
      1     1          1             1

Simple Table Two
----------------

-------     ------ ----------   -------
     12     12        12             12
    123     123       123           123
      1     1          1              1
-------     ------ ----------   -------

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

*** *** *** ***

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
