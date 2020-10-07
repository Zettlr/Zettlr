# Scripting Languages Syntax Highlighting

This file includes the script language syntax highlighting supported by Zettlr.

## Dart

```dart
library app;
import 'dart:html';

part 'app2.dart';

/**
 * Class description and [link](http://dartlang.org/).
 */
@Awesome('it works!')
class SomeClass<S extends Iterable> extends BaseClass<S> implements Comparable {
  factory SomeClass(num param);
  SomeClass._internal(int q) : super() {
    assert(q != 1);
    double z = 0.0;
  }

  /// **Sum** function
  int sum(int a, int b) => a + b;

  ElementList els() => querySelectorAll('.dart');
}

String str = ' (${'parameter' + 'zxc'})';
String str = " (${true ? 2 + 2 / 2 : null})";
String str = " ($variable)";
String str = r'\nraw\';
String str = r"\nraw\";
var str = '''
Something ${2+3}
''';
var str = r"""
Something ${2+3}
""";

checkVersion() async {
  var version = await lookUpVersion();
}
```

## JavaScript

```js
function $initHighlight(block, cls) {
  try {
    if (cls.search(/\bno\-highlight\b/) != -1)
      return process(block, true, 0x0F) +
             ` class="${cls}"`;
  } catch (e) {
    /* handle exception */
  }
  for (var i = 0 / 2; i < classes.length; i++) {
    if (checkCondition(classes[i]) === undefined)
      console.log('undefined');
  }

  return (
    <div>
      <web-component>{block}</web-component>
    </div>
  )
}

export  $initHighlight;
```

## TypeScript

```ts
class MyClass {
  public static myValue: string;
  constructor(init: string) {
    this.myValue = init;
  }
}
import fs = require("fs");
module MyModule {
  export interface MyInterface extends Other {
    myProperty: any;
  }
}
declare magicNumber number;
myArray.forEach(() => { }); // fat arrow syntax
```

## VisualBasic

```vb
' creating configuration storage and initializing with default values
Set cfg = CreateObject("Scripting.Dictionary")

' reading ini file
for i = 0 to ubound(ini_strings)
    s = trim(ini_strings(i))

    ' skipping empty strings and comments
    if mid(s, 1, 1) <> "#" and len(s) > 0 then
      ' obtaining key and value
      parts = split(s, "=", -1, 1)

      if ubound(parts)+1 = 2 then
        parts(0) = trim(parts(0))
        parts(1) = trim(parts(1))

        ' reading configuration and filenames
        select case lcase(parts(0))
          case "uncompressed""_postfix" cfg.item("uncompressed""_postfix") = parts(1)
          case "f"
                    options = split(parts(1), "|", -1, 1)
                    if ubound(options)+1 = 2 then
                      ' 0: filename,  1: options
                      ff.add trim(options(0)), trim(options(1))
                    end if
        end select
      end if
    end if
next
```

## Ruby

```ruby
# The Greeter class
class Greeter
  def initialize(name)
    @name = name.capitalize
  end

  def salute
    puts "Hello #{@name}!"
  end
end

g = Greeter.new("world")
g.salute
```

## PHP

```php
require_once 'Zend/Uri/Http.php';

namespace Location\Web;

interface Factory
{
    static function _factory();
}

abstract class URI extends BaseURI implements Factory
{
    abstract function test();

    public static $st1 = 1;
    const ME = "Yo";
    var $list = NULL;
    private $var;

    /**
     * Returns a URI
     *
     * @return URI
     */
    static public function _factory($stats = array(), $uri = 'http')
    {
        echo __METHOD__;
        $uri = explode(':', $uri, 0b10);
        $schemeSpecific = isset($uri[1]) ? $uri[1] : '';
        $desc = 'Multi
line description';

        // Security check
        if (!ctype_alnum($scheme)) {
            throw new Zend_Uri_Exception('Illegal scheme');
        }

        $this->var = 0 - self::$st;
        $this->list = list(Array("1"=> 2, 2=>self::ME, 3 => \Location\Web\URI::class));

        return [
            'uri'   => $uri,
            'value' => null,
        ];
    }
}

echo URI::ME . URI::$st1;

__halt_compiler () ; datahere
datahere
datahere */
datahere
```

## Python

```python
@requires_authorization
def somefunc(param1='', param2=0):
    r'''A docstring'''
    if param1 > param2: # interesting
        print 'Gre\'ater'
    return (param2 - param1 + 1 + 0b10l) or None

class SomeClass:
    pass

>>> message = '''interpreter
... prompt'''
```
