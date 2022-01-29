# CSS Languages Syntax Highlighting

This file includes the CSS file language syntax highlighting supported by Zettlr.

## CSS

```css
@font-face {
  font-family: Chunkfive; src: url('Chunkfive.otf');
}

body, .usertext {
  color: #F0F0F0; background: #600;
  font-family: Chunkfive, sans;
  --heading-1: 30px/32px Helvetica, sans-serif;
}

@import url(print.css);
@media print {
  a[href^=http]::after {
    content: attr(href)
  }
}
```

## Less

```less
@import "fruits";

@rhythm: 1.5em;

@media screen and (min-resolution: 2dppx) {
    body {font-size: 125%}
}

section > .foo + #bar:hover [href*="less"] {
    margin:     @rhythm 0 0 @rhythm;
    padding:    calc(5% + 20px);
    background: #f00ba7 url(http://placehold.alpha-centauri/42.png) no-repeat;
    background-image: linear-gradient(-135deg, wheat, fuchsia) !important ;
    background-blend-mode: multiply;
}

@font-face {
    font-family: /* ? */ 'Omega';
    src: url('../fonts/omega-webfont.woff?v=2.0.2');
}

.icon-baz::before {
    display:     inline-block;
    font-family: "Omega", Alpha, sans-serif;
    content:     "\f085";
    color:       rgba(98, 76 /* or 54 */, 231, .75);
}
```

## SCSS

```scss
@import "compass/reset";

// variables
$colorGreen: #008000;
$colorGreenDark: darken($colorGreen, 10);

@mixin container {
    max-width: 980px;
}

// mixins with parameters
@mixin button($color:green) {
    @if ($color == green) {
        background-color: #008000;
    }
    @else if ($color == red) {
        background-color: #B22222;
    }
}

button {
    @include button(red);
}

div,
.navbar,
#header,
input[type="input"] {
    font-family: "Helvetica Neue", Arial, sans-serif;
    width: auto;
    margin: 0 auto;
    display: block;
}

.row-12 > [class*="spans"] {
    border-left: 1px solid #B5C583;
}

// nested definitions
ul {
    width: 100%;
    padding: {
        left: 5px; right: 5px;
    }
  li {
      float: left; margin-right: 10px;
      .home {
          background: url('http://placehold.it/20') scroll no-repeat 0 0;
    }
  }
}

.banner {
    @extend .container;
}

a {
  color: $colorGreen;
  &:hover { color: $colorGreenDark; }
  &:visited { color: #c458cb; }
}

@for $i from 1 through 5 {
    .span#{$i} {
        width: 20px*$i;
    }
}

@mixin mobile {
  @media screen and (max-width : 600px) {
    @content;
  }
}
```
