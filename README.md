# CaaSify WHMCS Module

This project has separate source and build folders on purpose.

## Folder Roles

- `backend/`: WHMCS addon source code and the root `cloudhub.php` router. This is the backend code we edit.
- `frontend/`: React dashboard source code. This is the frontend code we edit.
- `build/`: Generated WHMCS-ready output. This is created during the build and should not be edited by hand.
- `docs/`: Product notes and supporting documentation.
- `scripts/`: Build and packaging scripts.

## Why `backend/` And `build/` Both Exist

They are not the same job:

- `backend/` is the source of truth for the PHP addon code.
- `build/` is the staged deployment package created from `backend/` and the compiled frontend assets.

This keeps development files separate from deployable WHMCS files and helps avoid accidental edits in generated output.

## Build Flow

1. `npm run build:backend`
   Stages the WHMCS backend package into `build/whmcs`.
2. `npm run build:frontend`
   Builds the React app and places the compiled files into `build/whmcs/modules/addons/caasify/dist`.
3. `npm run package`
   Creates the installable zip in `build/releases/cloudhub-whmcs.zip`.

## Working Rule

- Edit files in `backend/` and `frontend/`.
- Do not manually edit files inside `build/`.

## WHMCS Read Model

- `cloudhub.php` serves the dashboard shell and bootstrap only.
- Custom ticket and invoice dashboard reads come from browser-side parsing of the logged-in client's same-origin native WHMCS pages.
- Native WHMCS pages own ticket open/reply/create and invoice payment/add-funds flows.
