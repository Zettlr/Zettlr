# Miscellaneous Languages Syntax Highlighting

This file includes miscellaneous other language syntax highlighting supported by Zettlr.

# Bash/Shell

```bash
#!/bin/bash

###### CONFIG
ACCEPTED_HOSTS="/root/.hag_accepted.conf"
BE_VERBOSE=false

if [ "$UID" -ne 0 ]
then
 echo "Superuser rights required"
 exit 2
fi

genApacheConf(){
 echo -e "# Host ${HOME_DIR}$1/$2 :"
}

echo '"quoted"' | tr -d \" > text.txt
```

## PowerShell

```powershell
$initialDate = [datetime]'2013/1/8'

$rollingDate = $initialDate

do {
    $client = New-Object System.Net.WebClient
    $results = $client.DownloadString("http://not.a.real.url")
    Write-Host "$rollingDate.ToShortDateString() - $results"
    $rollingDate = $rollingDate.AddDays(21)
    $username = [System.Environment]::UserName
} until ($rollingDate -ge [datetime]'2013/12/31')
```

## Diff

```diff
Index: languages/ini.js
===================================================================
--- languages/ini.js    (revision 199)
+++ languages/ini.js    (revision 200)
@@ -1,8 +1,7 @@
 hljs.LANGUAGES.ini =
 {
   case_insensitive: true,
-  defaultMode:
-  {
+  defaultMode: {
     contains: ['comment', 'title', 'setting'],
     illegal: '[^\\s]'
   },

*** /path/to/original timestamp
--- /path/to/new      timestamp
***************
*** 1,3 ****
--- 1,9 ----
+ This is an important
+ notice! It should
+ therefore be located at
+ the beginning of this
+ document!

! compress the size of the
! changes.

  It is important to spell
```

## Verilog

```verilog
`timescale 1ns / 1ps

/**
 * counter: a generic clearable up-counter
 */

module counter
    #(parameter WIDTH=64, NAME="world")
    (
        input clk,
        input ce,
        input arst_n,
        output reg [WIDTH-1:0] q
    );

    string name = "counter";
    localparam val0 = 12'ha1f;
    localparam val1 = 12'h1fa;
    localparam val2 = 12'hfa1;

    // some child
    clock_buffer #(WIDTH) buffer_inst (
      .clk(clk),
      .ce(ce),
      .reset(arst_n)
    );

    // Simple gated up-counter with async clear

    always @(posedge clk or negedge arst_n) begin
        if (arst_n == 1'b0) begin
            q <= {WIDTH {1'b0}};
            end
        else begin
            q <= q;
            if (ce == 1'b1) begin
                q <= q + 1;
            end
        end
    end

    function int add_one(int x);
      return x + 1;
    endfunction : add_one

`ifdef SIMULATION
initial $display("Hello %s", NAME);
`endif
endmodule : counter

class my_data extends uvm_data;
  int x, y;

  function add_one();
    x++;
    y++;
  endfunction : add_one
endclass : my_data
```

## SystemVerilog

```systemverilog
class eth_frame;
    rand bit [47:0] dest;
    rand bit [47:0] src;
    rand bit [15:0] f_type;
    rand byte       payload[];
    bit [31:0]      fcs;
    rand bit        corrupted_frame;

    constraint basic {
        payload.size inside {[46:1500]};
    }

    constraint one_src_cst {
        src == 48'h1f00
    }

    constraint dist_to_fcs {
        fcs dist {0:/30,[1:2500]:/50};  // 30, and 50 are the weights (30/80 or  50/80, in this example)
    }

endclass
.
.
.
eth_frame my_frame;

my_frame.one_src_cst.constraint_mode(0); // the constraint one_src_cst will not be taken into account
my_frame.f_type.random_mode(0);        // the f_type variable will not be randomized for this frame instance.
my_frame.randomize();
```

## VHDL

```vhdl
/*
 * RS-trigger with assynch. reset
 */

library ieee;
use ieee.std_logic_1164.all;

entity RS_trigger is
    generic (T: Time := 0ns);
    port ( R, S  : in  std_logic;
           Q, nQ : out std_logic;
           reset, clock : in  std_logic );
end RS_trigger;

architecture behaviour of RS_trigger is
    signal QT: std_logic; -- Q(t)
begin
    process(clock, reset) is
        subtype RS is std_logic_vector (1 downto 0);
    begin
        if reset = '0' then
            QT <= '0';
        else
            if rising_edge(C) then
                if not (R'stable(T) and S'stable(T)) then
                    QT <= 'X';
                else
                    case RS'(R&S) is
                        when "01" => QT <= '1';
                        when "10" => QT <= '0';
                        when "11" => QT <= 'X';
                        when others => null;
                    end case;
                end if;
            end if;
        end if;
    end process;

    Q  <= QT;
    nQ <= not QT;
end architecture behaviour;
```

## Smalltalk

```smalltalk
Object>>method: num
    "comment 123"
    | var1 var2 |
    (1 to: num) do: [:i | |var| ^i].
    Klass with: var1.
    Klass new.
    arr := #('123' 123.345 #hello Transcript var $@).
    arr := #().
    var2 = arr at: 3.
    ^ self abc

heapExample
    "HeapTest new heapExample"
    "Multiline
    decription"
    | n rnd array time sorted |
    n := 5000.
    "# of elements to sort"
    rnd := Random new.
    array := (1 to: n)
                collect: [:i | rnd next].
    "First, the heap version"
    time := Time
                millisecondsToRun: [sorted := Heap withAll: array.
    1
        to: n
        do: [:i |
            sorted removeFirst.
            sorted add: rnd next]].
    Transcript cr; show: 'Time for Heap: ' , time printString , ' msecs'.
    "The quicksort version"
    time := Time
                millisecondsToRun: [sorted := SortedCollection withAll: array.
    1
        to: n
        do: [:i |
            sorted removeFirst.
            sorted add: rnd next]].
    Transcript cr; show: 'Time for SortedCollection: ' , time printString , ' msecs'
```

## Tcl

```tcl
package json

source helper.tcl
# randomness verified by a die throw
set ::rand 4

proc give::recursive::count {base p} { ; # 2 mandatory params
    while {$p > 0} {
        set result [expr $result * $base]; incr p -1
    }
    return $result
}

set a {a}; set b "bcdef"; set lst [list "item"]
puts [llength $a$b]

set ::my::tid($id) $::my::tid(def)
lappend lst $arr($idx) $::my::arr($idx) $ar(key)
lreplace ::my::tid($id) 4 4
puts $::rand ${::rand} ${::AWESOME::component::variable}

puts "$x + $y is\t [expr $x + $y]"

proc isprime x {
    expr {$x>1 && ![regexp {^(oo+?)\1+$} [string repeat o $x]]}
}
```
