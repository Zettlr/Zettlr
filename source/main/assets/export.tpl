<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="generator" content="Zettlr" />
  <meta name="date" content="$date$" />
  <title>$title$</title>
  <style type="text/css">
  * {
    box-sizing: border-box;
  }

  a {
    color:#FF7C3B;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  hr {
    border: none;
    border-bottom: 1px solid #999;
    width: 80%;
  }

  html, body {
    margin:0;
    padding:0;
  }

  body {
    background-color:white;
    color:#333;
    font-family: 'DejaVu', 'Georgia', 'Times New Roman', 'Times', serif;
  }

  article {
    width:50%;
    font-size:1.5em;
    margin:0 auto;
    line-height:150%;
  }

  /* Better display on printing */
  @media print {
    article {
      width:90%;
      font-size:12pt;
      margin:0 auto;
      line-height:150%;
    }
  }

  article p {
    hyphens: auto;
    text-align: justify;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Raleway', 'Lato', 'Liberation sans', 'Helvetica', sans-serif;
    color: #FF7C3B;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  blockquote {
    font-size:80%;
    color: rgba(120, 120, 120, 1);
    margin:2% 5%;
    line-height:120%;
  }

  table {
    border-collapse:collapse;
    width:100%;
    font-size:70%;
    font-family: 'Raleway', 'Lato', 'Liberation sans', 'Helvetica', sans-serif;
  }

  th, td {
    padding:4px 20px;
    border-bottom:1px solid #333;
  }
  </style>

<!-- Pandoc variables -->
$for(author-meta)$
<meta name="author" content="$author-meta$" />
$endfor$
$if(date-meta)$
<meta name="dcterms.date" content="$date-meta$" />
$endif$
$if(keywords)$
<meta name="keywords" content="$for(keywords)$$keywords$$sep$, $endfor$" />
$endif$

<!-- Additional CSS in case the user has passed it -->
$for(css)$
  <link rel="stylesheet" href="$css$" />
$endfor$

<!-- Include MathJax CDN, if applicable -->
$if(math)$
  $math$
$endif$
</head>
<body>
  <!-- Render in article for reader view enabling -->
  $if(toc)$
  <nav id="$idprefix$TOC" role="doc-toc">
    $table-of-contents$
  </nav>
  $endif$
  <article>
    $body$
  </article>
</body>
</html>
