# Math Rendering

This file includes several cases to test out rendering of math equations:

$x^2+y*(3+2)=z^2$

## Block Rendering

Now follows a math block (= display) equation which should even feature syntax highlighting so that you can easily edit it.

$$
F(x,z)=0 ~~and~~
\left| \begin{array}{ccc}
  F''_{xx} & F''_{xy} &  F'_x \\
  F''_{yx} & F''_{yy} &  F'_y \\
  F'_x     & F'_y     & 0
  \end{array}\right| = 0
$$

Now two more equations. Here's number one:

$$
a = \frac{b}{c}
$$

... immediately followed by number two:

$$
a \ne b
$$

Now one that encompasses a little bit more code:

$$
p(x\vert y) = \frac{p(y \vert x)p(x)}{p(y)}
$$

## Inline Rendering

Lorem ipsum dolor sit amet, $a^2 + b^2 = c^2$ consectetur adipiscing elit. Nam eros velit, fringilla et magna nec, posuere mattis orci. Sed suscipit non $$e=mc^2$$ mauris et rutrum. In tristique risus volutpat nisl laoreet fringilla. $a^2 + b^2 = c^2$ Sed consequat placerat ligula, ut consequat lacus gravida in. $a^2 + b^2 = c^2$ Curabitur nulla urna, maximus in eros vitae, $a^2 + b^2 = c^2$ gravida suscipit odio. Sed facilisis tincidunt placerat. Pellentesque dignissim feugiat $a^2 + b^2 = c^2$ facilisis. Maecenas ligula sapien, vehicula nec tristique molestie, $a^2 + b^2 = c^2$ molestie ut nulla. Ut ut rhoncus nibh.

## Edge Cases: Dollar signs

As LaTeX math equations are enclosed in dollar-signs ($), we need to test that amounts of dollars render fine.

First, some dollar amounts, such as $400 and $1200 should not be considered an equation. Some more $123 dollars

## Edge Cases: Single-character Equations

Equations can also consist of single characters, e.g. $x$. We should be able to escape those dollar signs as well: \$y\$. The next equation should now be rendered once again: $z$.

This is the current double dollar inline equation $p(x)$ which appears as a block in the latex. This is the workaround with single dollar signs $p(y)$ so it appears as an inline equation. And this part of a sentence where the signs $mess up$ a sentence. Granted placing two signs in a sentence like that is $a bit weird$ and you can always escape them. And using a $ as normal seems to go fine. Let's do some `inline code` to finish the file.
