# Security policy

Veltrix runs shells and AI coding agents on your machine, so security issues matter. Thanks
for helping keep users safe.

## Supported versions

Only the latest release gets security fixes. Veltrix is still before 1.0, so there are no
long-term support branches.

## Reporting a vulnerability

Please don't report vulnerabilities in public issues, pull requests or discussions.

Report them privately through GitHub instead: go to the
[Security tab](https://github.com/goesq/veltrix/security) of the repository and choose
**Report a vulnerability**, or open the
[private advisory form](https://github.com/goesq/veltrix/security/advisories/new) directly.
Only the maintainers can see the report.

Include as much of this as you can:

- what the issue is and what an attacker could do with it
- the steps or a proof of concept to reproduce it
- the Veltrix version, operating system and shell
- any idea you have for a fix

## What to expect

- An acknowledgment within a week.
- An assessment and, if the report is confirmed, a plan for a fix.
- Updates as the fix progresses, and credit in the advisory and release notes unless you'd
  rather stay anonymous.

Please give us a reasonable time to release a fix before disclosing the issue publicly.

## Scope

Examples of what counts as a vulnerability in Veltrix:

- the renderer gaining Node.js access, or escaping the sandbox and context isolation
- the preload bridge or IPC handlers allowing actions beyond what the UI needs, such as
  reading arbitrary files or running arbitrary commands
- agent instructions or project content breaking out of shell quoting
- an agent preset running with broader permissions than documented in the README
- the Anthropic API key being stored or exposed in plain text

Out of scope: vulnerabilities in the agent CLIs themselves (Claude Code, Codex CLI, Gemini
CLI) or in your shell, and what an agent does within the permissions you gave it. Report those
to the respective projects.
