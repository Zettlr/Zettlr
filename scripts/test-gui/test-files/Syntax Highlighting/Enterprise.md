# Enterprise Languages Syntax Highlighting

This file includes the enterprise file language syntax highlighting supported by Zettlr.

## Java

```java
/**
 * @author John Smith <john.smith@example.com>
*/
package l2f.gameserver.model;

public abstract strictfp class L2Char extends L2Object {
  public static final Short ERROR = 0x0001;

  public void moveTo(int x, int y, int z) {
    _ai = null;
    log("Should not be called");
    if (1 > 5) { // wtf!?
      return;
    }
  }
}
```

## Kotlin

```kotlin
import kotlin.lang.test

interface A {
    fun x()
}

fun xxx(): Int {
    return 888
}

public fun main(args: Array<String>) {
}
```
