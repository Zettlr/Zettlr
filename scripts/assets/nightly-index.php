<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Zettlr Nightlies</title>
  <meta name="description" content="Get cutting-edge builds of Zettlr.">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@zettlr">
  <meta name="twitter:creator" content="@zettlr">
  <meta name="twitter:title" content="Nightly Releases | Zettlr">
  <meta name="twitter:description" content="Get cutting-edge builds of Zettlr.">
  <meta name="twitter:image" content="https://nightly.zettlr.com/sm_preview.png">
  <meta name="twitter:image:alt" content="A visual summary of the website">
  
  <!-- Get the font from Google -->
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap" rel="stylesheet">

  <style>
    /** Generics */
    * {
      box-sizing: border-box;
    }

    html, body {
      font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }

    body {
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      background-image: linear-gradient(90deg, #ddd 0%, #fff 20%, #fff 80%, #ddd 100%);
    }

    /** Links */

    a, a:link, a:visited {
      color: #1cb27e;
      text-decoration: none;
    }

    a:hover {
      color: white;
      background-color: #1cb27e;
    }

    /** Tables */

    table {
      width: 100%;
      margin: 10px;
      border-collapse: collapse;
    }

    table tr:not(:last-child) td, table tr th {
      border-bottom: 1px solid rgb(180, 180, 180);
    }

    table tr td:not(:last-child) {
      border-right: 1px solid rgb(180, 180, 180);
    }

    table tr td, table tr th {
      padding: 4px;
    }

    /** IDs */

    div#header {
      background-color: #333;
      color: white;
      padding-left: 30vw; /* Corresponds to the container width */
    }

    h1#main-head {
      line-height: 1.5em;
      margin: 0px;
      padding: 10px;
    }

    img#main-logo {
      height: 1.5em;
      vertical-align: top;
    }

    /** Main container */

    .container {
      width: 40vw; /* Corresponds to the header padding-left */
      margin: 0 auto;
    }

    /* Media query for smaller screens */
    @media (max-width: 800px) {
      .container { width: 90vw; }
      div#header { padding-left: 5vw; }
    }

    /** Navigation */

    div#navigation {
      padding-bottom: 10px;
    }

    div#navigation a {
      display: inline-block;
      color: #1cb27e;
      text-decoration: none;
      padding: 2px;
      border-radius: 2px;
    }

    div#navigation a:hover {
      background-color: #1cb27e;
      color: white;
    }
  </style>
</head>
<body>
  <!-- Pull the main-head out of the container for a nicer visual effect -->
  <div id="header">
    <h1 id="main-head">
      <img src="logo.png" alt="Zettlr" id="main-logo">
      Zettlr Nightlies
    </h1>
    <div id="navigation">
      <a href="https://www.zettlr.com/" target="_blank">Homepage</a> &bullet;
      <a href="https://www.zettlr.com/download" target="_blank">Download stable releases</a> &bullet;
      <a href="https://github.com/Zettlr/Zettlr" target="_blank">GitHub</a> &bullet;
      <a href="https://discord.gg/PcfS3DM9Xj" target="_blank">Discord</a>
    </div>
  </div>

  <div class="container">
    <p>
      On this page you can find nightly builds for Zettlr. Nightlies are compiled
      programs very similar to regular releases, but with one crucial difference:
      Whereas regular releases are normally tested extensively to make sure they
      contain as few bugs as possible, the aim of nightlies is to provide users
      with releases as fast as possible. Nightlies are basically development
      versions for people who do not want to compile the app themselves.
    </p>
    <p>
      That being said:
        <strong>
          If you are not sure whether to use nightly builds, don't. In that case
          please always refer to our <a href="https://www.zettlr.com/download">regular, stable releases</a>.
        </strong>
    </p>
    <p>
      Below you can find nightlies after they are being built. Generally, nightlies
      are being built automatically on schedule every Monday noon (UTC), but there
      may be exceptions.
    </p>
    <p>
      <strong>
        By downloading and using nightlies, you confirm that you understand the
        risks involved in using these. We do not guarantee any stability for
        these releases, including, but not limited to potential data loss,
        corrupted configuration files, or maybe even corrupted operating systems.
      </strong>
    </p>
    <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Size</th>
            <th>Last modified</th>
          </tr>
        </thead>
        <tbody>
          <?php
            $dir = scandir('.');

            foreach ($dir as $key => $name) {
              if (is_dir('.' . DIRECTORY_SEPARATOR . $name)) {
                continue; // No directories
              }

              if (preg_match('/(.+)\.(exe|dmg|deb|rpm|appimage|txt)$/i', $name) !== 1) {
                continue; // Either an error or a wrong file
              }

              // At this point we have a correct file. So display it.

              $time = filemtime('.' . DIRECTORY_SEPARATOR . $name);
              if ($time === false) {
                // An error occurred
                $time = 'unknown';
              } else {
                // Format the time
                $time = date('D M jS, Y H:i:s', $time);
              }

              $size = filesize('.' . DIRECTORY_SEPARATOR . $name);

              if ($size === false) {
                // An error occurred
                $size = 'unknown';
              } else if ($size > 1000000000) {
                // Size in Gigabyte
                $size = round($size / 1000000000, 2) . ' GB';
              } else if ($size > 1000000) {
                // Size in Megabyte
                $size = round($size / 1000000, 2) . ' MB';
              } else if ($size > 1000) {
                // Size in Kilobyte
                $size = round($size / 1000, 2) . ' KB';
              } else {
                // Size in Byte
                $size = $size . ' B';
              }

              echo "<tr>";
              echo "<td><a href=\"$name\">$name</a></td>";
              echo "<td style=\"text-align: right;\">$size</td>";
              echo "<td style=\"text-align: right;\">$time</td>";
              echo "</tr>";
            }
          ?>
        </tbody>
    </table>
    <p>
      &nbsp; <!-- Small spacer below -->
    </p>
  </div>
</body>
</html>
