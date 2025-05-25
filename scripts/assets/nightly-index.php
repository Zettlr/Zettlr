<?php
  // Define a few crude helper functions. First a basic file size formatter,
  // and then a function that gives out relative dates for our purposes. It's
  // easier to define these functions here rather than importing Carbon et al.
  function format_size ($size) {
    if (gettype($size) !== 'integer') {
      // An error occurred
      return 'unknown';
    } else if ($size > 1000000000) {
      // Size in Gigabyte
      return round($size / 1000000000, 2) . ' GB';
    } else if ($size > 1000000) {
      // Size in Megabyte
      return round($size / 1000000, 2) . ' MB';
    } else if ($size > 1000) {
      // Size in Kilobyte
      return round($size / 1000, 2) . ' KB';
    } else {
      // Size in Byte
      return $size . ' B';
    }
  }

  function relative_time ($time) {
    // This function formats the given time to relative
    if (gettype($time) !== 'integer') {
      // An error occurred
      return 'unknown';
    }

    $now = time();
    $duration_minutes = round(($now - $time) / 60);
    if ($duration_minutes < 5) {
      // Less than five minutes ago
      return 'just now';
    } else if ($duration_minutes < 60) {
      // Less than an hour ago
      return round($duration_minutes) . " minutes ago";
    } else if ($duration_minutes < 120) {
      // Less than two hours ago
      return '1 hour ago';
    } else if ($duration_minutes < 60 * 24) {
      // Less than a day ago
      $hours = round($duration_minutes / 60);
      return "$hours hours ago";
    } else if ($duration_minutes < 60 * 24 * 2) {
      // Less than two days ago
      return 'yesterday';
    } else if ($duration_minutes < 60 * 24 * 7) {
      // Less than a week ago
      $days = round($duration_minutes / (60 * 24));
      return "$days days ago";
    } else {
      // Give out a proper format
      return date('D M jS, Y H:i:s', $time);
    }
  }
?>

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
      color: black;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      background-color: white;
    }

    /* Helper highlight class */
    .highlight {
      color:rgb(28, 100, 178);
    }

    /** Links */

    a, a:link, a:visited {
      color: #1cb27e;
    }

    table a, table a:link, table a:visited {
      text-decoration: none;
    }

    a:hover {
      text-decoration: none;
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

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      body {
        color: white;
        background-color: #222222;
      }
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
      <a href="https://go.zettlr.com/discord" target="_blank">Discord</a>
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
    <p>
    <?php
      // Output the scriptfile's last mod date (= last build time)
      $scriptfile_mod = filemtime(__FILE__);
      $last_modified = date('D M jS, Y H:i:s', $scriptfile_mod);
      echo "The nightlies have last been built on <strong class=\"highlight\">$last_modified</strong>.";
    ?>
    </p>
    <table>
        <thead>
          <tr>
            <th>File</th>
            <th style="text-align: right;">Size</th>
            <th style="text-align: right;">Last modified</th>
          </tr>
        </thead>
        <tbody>
          <?php
            $dir = scandir('.');

            $assets = [];

            foreach ($dir as $key => $name) {
              if (is_dir('.' . DIRECTORY_SEPARATOR . $name)) {
                continue; // No directories
              }

              if (preg_match('/(.+)\.(exe|dmg|deb|rpm|appimage|txt)$/i', $name) !== 1) {
                continue; // Either an error or a wrong file
              }

              // At this point we have a correct file. So display it.
              $assets[] = $name;
            }

            if (count($assets) > 0) {
              foreach ($assets as $name) {
                $time = relative_time(filemtime('.' . DIRECTORY_SEPARATOR . $name));
                $size = format_size(filesize('.' . DIRECTORY_SEPARATOR . $name));

                echo "<tr>";
                echo "<td><a href=\"$name\">$name</a></td>";
                echo "<td style=\"text-align: right;\">$size</td>";
                echo "<td style=\"text-align: right;\">$time</td>";
                echo "</tr>";
              }
            } else {
              echo "<tr><td colspan=\"3\">No downloadable assets found.</td></tr>";
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
