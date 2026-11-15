# Contributing to Server Logic Tools

Thanks for helping improve Server Logic Tools. This is a Power Platform ToolBox (PPTB) tool with three pages — **Logic Starter**, **Server Objects**, and **Logic Inspector** — built with React, TypeScript, and Vite.

## Getting started

1. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic.git
   cd PowerPage-ServerLogic
   npm ci
   ```

2. Check your versions. `package.json` declares Node.js **>=20.19.0**; the installed version must also satisfy the locked dependencies' engine requirements.

3. Build and test:

   ```sh
   npm run build
   npm test
   ```

For the full developer workflow — build targets (`build` vs `build:beta`), the release gate, page selection, and loading a local build in PPTB — see [Build and load the tool from source](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/docs/how-to/build-and-load-from-source.md). Its "Source map for maintainers" table lists where each area lives.

## How changes are made

- Follow [conventional commit](https://www.conventionalcommits.org/) messages, as the history does (`feat(...)`, `fix(...)`, `refactor(...)`, `test:`, `docs(...)`, `chore:`).
- Run the checks relevant to your change before pushing: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
- Everything must pass `npm run verify:release` (the full release gate) before a release. It runs typecheck, lint, test, the released build, manifest validation, a size budget, and a tarball check.

## Working on the catalogue

The recipe data lives in [`src/services/catalogue/recipes.ts`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/src/services/catalogue/recipes.ts) and the `Server.*` object data in [`src/services/catalogue/serverObjects.ts`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/src/services/catalogue/serverObjects.ts). These two files are the **source of truth** for the Starter recipes and the Server Objects reference — including the samples, permission notes, and setup guidance that ship in every exported ZIP.

When you change them:

- Add or update the matching entries and their tests (`recipes.test.ts`, `serverObjects.test.ts`).
- Keep the reference documentation in sync with [`docs/reference/recipes.md`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/docs/reference/recipes.md) and [`docs/reference/server-objects.md`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/docs/reference/server-objects.md), which summarise the catalogue for readers.

## Documentation

Documentation is organised by the four [Diátaxis](https://diataxis.fr/) quadrants, indexed from [`docs/usage-manual.md`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/docs/usage-manual.md):

- **Tutorials** — [`docs/tutorials/`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/tree/main/docs/tutorials/) learning-oriented lessons.
- **How-to guides** — [`docs/how-to/`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/tree/main/docs/how-to/) task-oriented recipes.
- **Reference** — [`docs/reference/`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/tree/main/docs/reference/) recipes, Server Objects, and readiness checks.
- **Explanation** — [`docs/explanation/`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/tree/main/docs/explanation/) background and concepts.

Put new material in the quadrant it belongs to, and add a link from the hub so readers can find it. The [`README.md`](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/README.md) stays a concise landing page, separate from the user guide.

## Reporting issues

Open an issue at https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/issues. Include the operating system, PPTB Desktop version, and the pages or steps that reproduce the problem.

## License

By contributing, you agree that your contributions are licensed under the same [BSD 3-Clause](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/LICENSE) license as the project.