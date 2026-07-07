# Caasify WHMCS Module

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

# WHMCS Module Installation

This guide explains how to install the Caasify WHMCS module using only the ready files in the `build/` folder.

## 1. Open the GitHub Repository

Open the repository here:

[https://github.com/caasify/module-whmcs](https://github.com/caasify/module-whmcs)

## 2. Download a version

1. Open the repository page
2. On the right side, open `Releases` or `Versions`
3. Choose the version you want to install
4. Download that version

## 3. Use Only the Build Folder

After extracting the repository, use only these paths:

- `build/whmcs/`
- `build/releases/cloudhub-whmcs.zip`

Do not upload the full repository to WHMCS.

## 4. Upload the Module to WHMCS

You can install it in either of these two ways.

### Option A: Upload the Ready ZIP

1. Open `build/releases/`
2. Find `cloudhub-whmcs.zip`
3. Extract the ZIP
4. Upload the extracted files into your WHMCS root folder

### Option B: Copy the Ready Build Folder

1. Open `build/whmcs/`
2. Copy everything inside it into your WHMCS root folder

After upload, these should exist in your WHMCS installation:

- `cloudhub.php`
- `modules/addons/caasify/`

## 5. Activate the Addon in WHMCS

1. Log in to your WHMCS admin area
2. Go to `Addons`
3. Find `Caasify`
4. Click `Activate`

## 6. Open the Caasify Settings Page

1. In WHMCS admin, go to `Addons`
2. Click `Caasify`

This opens the Caasify settings page.

## 7. Configure the Module

In the Caasify settings page, enter:

- `Hub Base URL`
- `Admin API Token`

Usually the Hub Base URL is:

- `https://hub.caasify.com`

You need a valid Caasify admin token for the module to work correctly.

## 8. Test the Installation

Open this URL in your browser:

- `https://your-domain.com/cloudhub.php`

If the installation is correct, the Caasify module should load.

## Notes

- Use only the files from the `build/` folder
- Do not upload source folders like `frontend/` or `backend/`
- Do not run any build steps if you are only installing the module

## Start Contact Caasify

We as Caasify think that to grasp the difficulties of any job, it's important to have professional experience in that field. Now that we have this understanding, we can provide help to our old ex-colleagues in webhosting industry.

WEB: [https://caasify.com/](https://caasify.com/)

Email: info@caasify.com
