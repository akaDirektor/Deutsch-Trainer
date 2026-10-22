# Existing corpus update recognised by regression tests

The remote main branch had added 32 verbs to words-11.js before the Ukrainian-direction fix (main f53e235021fd1767b3517e4f358f5bf995210b25). Compared with the previous checked-in baseline, there were no removed or modified records, only those additions. This change does not edit words-11.js: the working copy is refreshed to match remote bytes, and its hash is updated in the test manifest.

The prior file is preserved byte-for-byte as backups/words-11-before-2026-10-22.js, protected by its original hash. All previous backup hashes are unchanged. examples.js supplies one distinct authored AI sentence for each new verb, without changing any saved vocabulary example or existing supplemental example. No dictionary verification is claimed for these authored sentences.
