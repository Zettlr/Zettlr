# Security Policy

DO NOT DISCLOSE ANY SECURITY-RELATED ISSUES, ESPECIALLY NOT ON THE ISSUE TRACKER! REPORT THEM TO INFO@ZETTLR.COM INSTEAD!

## What are Security-Related Issues?

An issue is security-related if there is a possibility that Zettlr is vulnerable to malicious actors. This includes, but is not limited to:

- Running arbitrary code on users' machines
- Exploiting logical errors in the source code to induce unwanted behaviour
- Inadvertent disclosure ("leaking") of personal data, e.g. those covered by the European GDPR

## Which Versions of Zettlr Receive Security-Patches?

Due to limited time and to this project being an Open Source-project, only the **latest released stable version** receives security-related patches. In other words, we will make sure that security issues will always be promptly addressed and a new version will be released as soon as possible. If a version of Zettlr is in public beta, this version will also get the same security fixes as the latest stable version.

The most recent, stable release, as well as beta releases, can always be found [here](https://github.com/Zettlr/Zettlr/releases).

> Please remember to always update Zettlr to the most recent version. If any security issues surface, they will be fixed in a new update. Thus, make sure to allow Zettlr to always check for updates so you don't miss any.

## How do I Report a Security-Problem?

In case you find some behaviour of Zettlr that looks as if it can be exploited by malicious actors to, for example, run arbitrary code, inducing unwanted behaviour on users' machines, or can be used to siphon personal data, immediately notify us via email at info@zettlr.com. **DO NOT, UNDER ANY CIRCUMSTANCES, TALK ABOUT THIS ISSUE WITH OTHER PEOPLE BEFORE THE PROBLEM HAS BEEN ADDRESSED!**

By keeping the issue hidden from public view, we have time to fix the issue. After the security fix has been released and is available to the public, you may disclose the problem, but not a single minute earlier. If a security-related problem is publicly known, this means that people with malicious intents can exploit the problem before we had the time to fix the issue. While this does not stop those people from discovering the issue themselves, it makes it at least harder for them.

> If you notice that someone has opened a potential security-related issue publicly on the [issue tracker](https://github.com/Zettlr/Zettlr/issues), inform us as soon as possible at info@zettlr.com so we can remove the issue from the tracker until the issue has been fixed!

## What Happens After a Report has been sent?

After we have been notified of the security issue, this will take priority. We will as soon as possible get in touch with you, either to confirm we received the report, or to ask for additional information. As soon as the patched version has been released, we will notify you so you know the issue has been resolved.

Please make sure you regularly check emails at the address where you send us the report from, since we might need additional information quickly.

In case you already figured out the problem and have a tested piece of code, **do not create a pull request (PR)**! Instead, please send us a patch-file via email so that we can confirm the patch also works during releases. Once we confirm the code works and doesn't break anything else inadvertently, we will greenlight a pull request from you containing exactly the code changes from the patch file, which will be merged the minute you open it. Afterwards we will immediately start building a new release containing that PR. The reason for this is that each pull request is publicly visible, so a PR has to be treated as a disclosure of the bug and we must minimise the time a security problem is publicly known before a fix is available.
