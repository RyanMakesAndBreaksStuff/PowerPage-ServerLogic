# How readiness is determined

"Readiness" in Server Logic Tools is deliberately narrower than "will this work". This page explains how the tool's two readiness surfaces reach their verdicts, and where their confidence stops.

[Back to the user guide](../usage-manual.md) · [Readiness and checks reference](../reference/readiness-and-checks.md)

## Three different kinds of check

The tool has three distinct assessment mechanisms; conflating them leads to false confidence:

1. **Code-pattern checks** (Logic Starter). The tool scans the current handler text for constructs that belong in a browser context — such as browser-only APIs or restricted patterns it has been taught to flag. This is a static text check, not compilation and not execution. It catches likely mistakes, not all mistakes.

2. **Validation scaffolding** (Logic Starter). The generated handler includes validation code the recipe supplies. The readiness indicator records that this scaffolding is present; it does not re-analyse the business logic you have edited on top of it.

3. **Configuration review** (both pages). The permission checklist and the Inspector findings describe configuration on the *site* — web roles, table permissions, outbound domains — that the tool cannot authoritatively read in all cases. Where it can read it, it compares against what the handler appears to need; where it cannot, it says so.

## The governing principle: flag what it cannot see

Both readiness surfaces follow the same principle — a verdict is only **Ready** when nothing requires attention and nothing is missing:

- In the Inspector, a finding is **Needs review** when any known reason for concern exists, and **Incomplete** when the evidence for it was never read. A file is **Ready** only when all three findings are configured or reviewed, none need review, and none are incomplete.
- In Starter, the **Permissions** indicator flips back to needing attention the moment the handler text changes, because the reviewed checklist no longer describes the current code.

This is why brief, confident-sounding labels are qualified everywhere: a known reason for concern makes a finding **Needs review** even when every other check is clean, and a missing read makes a file **Incomplete** even when the parts that were read look fine.

## What "Ready" deliberately does not mean

A **Ready** file, or a `3/3` Starter readiness, does **not** confirm that:

- the handler compiles or runs without error (Starter does not execute it);
- the caller will actually be authorized at runtime (the Inspector cannot see every role a user holds, and cannot read tenant outbound network policy);
- table permissions match the real data relationships (the Inspector flags Global grants and notes what it cannot verify, such as Account-scoped relationships);
- cloud flows the handler may trigger are correctly configured (the Inspector does not check cloud flows);
- deployment succeeded (the tool never deploys or writes to an environment).

Readiness is a review aid: it surfaces the configuration and code-pattern questions you still need to answer, and it records when you have reviewed them. The final proof always comes from testing on a configured site with a real user in the intended role.

## Why some grants are flagged even when they work

The Inspector flags **Global** table-access grants for review even when they function at runtime. These are often the correct choice for a recipe — for example, a **Create** on `contact` cannot be Account-scoped because a new contact has no account link yet, so the Dataverse CRUD recipe uses a Global **Create**. The flag is a prompt to confirm the grant is intentional and scoped as narrowly as the task allows, not a claim that the handler is broken.