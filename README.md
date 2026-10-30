# Server Logic Tools

Server Logic Tools is a Power Platform ToolBox (PPTB) tool for creating Power Pages server logic starters and looking up the `Server.*` APIs used by those handlers.

## What you can do

- **Logic Starter** generates a server handler, a matching client call, and a permission checklist from one of ten recipes. Edit the handler, review browser-check findings, and download the starter as a ZIP.
- **Server Objects** provides a searchable, curated reference with member signatures, samples, and permission notes. Copy a sample or insert it into the current Starter handler.

Starter generation and the object catalogue work without an environment connection. These features do not deploy code, configure permissions, or write to your environment. You add the exported files to your Power Pages site and test them there.

## Documentation

| Document | Audience and goal |
| --- | --- |
| [Usage manual](docs/usage-manual.md) | Power Pages makers and developers: generate, adapt, and use a starter; browse and insert Server Objects samples. |
| [How to build](docs/build-manual.md) | Developers: install dependencies, build the two-page tool, validate outputs, and load it locally in PPTB. |

The usage manual includes five screenshot placeholders with capture descriptions. The build manual includes one more for loading the tool in PPTB.

## Requirements

- PPTB Desktop with host API **1.2.7 or later**, as declared in the tool manifest. The PPTB VS Code extension has not been validated for this tool.
- A Power Pages site with server logic authoring available when you are ready to deploy an exported starter.
- The web roles, table permissions, site settings, and external services required by your selected recipe. The exported `permission-checklist.md` lists these requirements.

Node.js is needed to build this repository; it is not required just to use the tool in PPTB.

## Create your first starter

1. Open **Logic Starter**. The initial recipe is **Read Dataverse records**, with the name `customer-summary`, method **GET**, and a **fetch** client.
2. Choose a recipe, enter a logic name, and select an enabled HTTP method and client language.
3. Adapt the server handler. Review its browser checks and expand **View checklist** to review the permissions and setup requirements.
4. Choose **Download starter** and save the ZIP.
5. Extract it and follow its `README.md` to add the handler and client to your site.

For reference samples, open **Server Objects**, search for an object or method, and choose **Insert into handler** to return to Starter with the sample inserted.

The readiness count describes local checks and your checklist review. It does not confirm that a handler will run successfully or that site permissions have been configured.

## Build from source

Run these commands from the repository root:

```sh
npm ci
npm run build:beta
npm test
```

The beta build includes Logic Starter and Server Objects and writes its output to `dist/`. See the [build manual](docs/build-manual.md) for the required Node.js version, additional checks, packaging, and PPTB loading instructions.

## License

[BSD 3-Clause](LICENSE).
