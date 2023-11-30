# Functional Languages Syntax Highlighting

This file includes the functional file language syntax highlighting supported by Zettlr.

## Elm

```elm
import Browser
import Html exposing (div, button, text)
import Html.Events exposing (onClick)

type Msg
    = Increment

main =
    Browser.sandbox
        { init = 0
        , update = \msg model -> model + 1
        , view = view
        }

view model =
    div []
        [ div [] [ text (String.fromInt model) ]
        , button [ onClick Increment ] [ text "+" ]
        ]

chars =
    String.cons 'C' <| String.cons 'h' <| "ars"
```

## F#

```fsharp
open System

// Single line comment...
(*
  This is a
  multiline comment.
*)
let checkList alist =
    match alist with
    | [] -> 0
    | [a] -> 1
    | [a; b] -> 2
    | [a; b; c] -> 3
    | _ -> failwith "List is too big!"


let text = "Some text..."
let text2 = @"A ""verbatim"" string..."
let catalog = """
Some "long" string...
"""

let rec fib x = if x <= 2 then 1 else fib(x-1) + fib(x-2)

let fibs =
    Async.Parallel [ for i in 0..40 -> async { return fib(i) } ]
    |> Async.RunSynchronously

type Sprocket(gears) =
  member this.Gears : int = gears

[<AbstractClass>]
type Animal =
  abstract Speak : unit -> unit

type Widget =
  | RedWidget
  | GreenWidget

type Point = {X: float; Y: float;}

[<Measure>]
type s
let minutte = 60<s>

type DefaultMailbox<'a>() =
    let mutable inbox = ConcurrentQueue<'a>()
    let awaitMsg = new AutoResetEvent(false)
```

## Haskell

```hs
{-# LANGUAGE TypeSynonymInstances #-}
module Network.UDP
( DataPacket(..)
, openBoundUDPPort
, openListeningUDPPort
, pingUDPPort
, sendUDPPacketTo
, recvUDPPacket
, recvUDPPacketFrom
) where

import qualified Data.ByteString as Strict (ByteString, concat, singleton)
import qualified Data.ByteString.Lazy as Lazy (ByteString, toChunks, fromChunks)
import Data.ByteString.Char8 (pack, unpack)
import Network.Socket hiding (sendTo, recv, recvFrom)
import Network.Socket.ByteString (sendTo, recv, recvFrom)

-- Type class for converting StringLike types to and from strict ByteStrings
class DataPacket a where
  toStrictBS :: a -> Strict.ByteString
  fromStrictBS :: Strict.ByteString -> a

instance DataPacket Strict.ByteString where
  toStrictBS = id
  {-# INLINE toStrictBS #-}
  fromStrictBS = id
  {-# INLINE fromStrictBS #-}

openBoundUDPPort :: String -> Int -> IO Socket
openBoundUDPPort uri port = do
  s <- getUDPSocket
  bindAddr <- inet_addr uri
  let a = SockAddrInet (toEnum port) bindAddr
  bindSocket s a
  return s

pingUDPPort :: Socket -> SockAddr -> IO ()
pingUDPPort s a = sendTo s (Strict.singleton 0) a >> return ()
```

## Scala

```scala
/**
 * A person has a name and an age.
 */
case class Person(name: String, age: Int)

abstract class Vertical extends CaseJeu
case class Haut(a: Int) extends Vertical
case class Bas(name: String, b: Double) extends Vertical

sealed trait Ior[+A, +B]
case class Left[A](a: A) extends Ior[A, Nothing]
case class Right[B](b: B) extends Ior[Nothing, B]
case class Both[A, B](a: A, b: B) extends Ior[A, B]

trait Functor[F[_]] {
  def map[A, B](fa: F[A], f: A => B): F[B]
}

// beware Int.MinValue
def absoluteValue(n: Int): Int =
  if (n < 0) -n else n

def interp(n: Int): String =
  s"there are $n ${color} balloons.\n"

type ξ[A] = (A, A)

trait Hist { lhs =>
  def ⊕(rhs: Hist): Hist
}

def gsum[A: Ring](as: Seq[A]): A =
  as.foldLeft(Ring[A].zero)(_ + _)

val actions: List[Symbol] =
  'init :: 'read :: 'write :: 'close :: Nil

trait Cake {
  type T;
  type Q
  val things: Seq[T]

  abstract class Spindler

  def spindle(s: Spindler, ts: Seq[T], reversed: Boolean = false): Seq[Q]
}

val colors = Map(
  "red"       -> 0xFF0000,
  "turquoise" -> 0x00FFFF,
  "black"     -> 0x000000,
  "orange"    -> 0xFF8040,
  "brown"     -> 0x804000)

lazy val ns = for {
  x <- 0 until 100
  y <- 0 until 100
} yield (x + y) * 33.33
```
