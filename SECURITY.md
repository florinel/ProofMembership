# Security Policy

## Supported versions

This project is under active development. Security fixes are applied to the latest commit on `main`.

- Current support target: `main`
- Older commits, branches, and forks may not receive security updates.

## Reporting a vulnerability

Please do not open a public GitHub issue for security vulnerabilities.

Use one of the private channels below:

- Preferred: GitHub Security Advisories for this repository
- Backup email: security@example.com

When reporting, include:

- A clear description of the issue and impact
- Affected components and files
- Reproduction steps or proof of concept
- Any suggested remediation
- Your contact details for follow-up

## What to expect

- Initial acknowledgement: within 72 hours
- Triage and severity assessment: as quickly as possible
- Status updates: at reasonable intervals while remediation is in progress
- Disclosure: coordinated after a fix is available or mitigation is documented

## Scope

In scope:

- On-chain program logic in `programs/membership_core`
- Web/API logic in `apps/web`
- Security-sensitive auth/session handling
- Dependency or configuration issues that lead to exploitable risk

Out of scope unless there is a clear, reproducible security impact:

- Feature requests
- UI or UX bugs without security consequences
- Denial-of-service requiring unrealistic resources
- Issues in third-party dependencies without a project-specific exploit path

## Safe harbor

We support good-faith security research and coordinated disclosure.

- Do not access or modify data that you do not own.
- Do not degrade service reliability.
- Do not use social engineering, phishing, or physical attacks.
- Do not publicly disclose details before coordination.

If these guidelines are followed, we will not pursue legal action for your research.

## Optional cryptographic contact

If you use encrypted reporting, provide your public key information here.

- PGP key: add link or fingerprint

## Security updates

Security-related fixes may be released without full technical detail until users have had reasonable time to update.
