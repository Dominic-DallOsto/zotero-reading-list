# zotero-custom-fields

![downloads](<https://img.shields.io/github/downloads/parsaM110/zotero-reading-list/latest/zotero-custom-fields.xpi?style=flat-square&label=Downloads%20(latest%20version)>)

An extension for Zotero that lets you define custom item columns with
predefined values.

- define custom item columns with your own labels
- configure predefined values for each custom column
- set values via the item context menu

Set custom column values by right clicking items and choosing the value from
the column submenu (supports multiple items at once).

## Installation

| Zotero version | Extension version to use                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| 6              | [v0.3.2](https://github.com/Dominic-DallOsto/zotero-reading-list/releases/tag/v0.3.2) |
| 7.0            | [v1.5.8](https://github.com/Dominic-DallOsto/zotero-reading-list/releases/tag/v1.5.8) |
| 7.1 / 8.0      | [Latest](https://github.com/Dominic-DallOsto/zotero-reading-list/releases/latest)     |

1. Download the latest release based on your Zotero version from the table above
2. Save the .xpi file (in Firefox, Right click -> Save Link As)
3. Install in Zotero (Tools -> Plugins -> Gear icon in the top right -> Install Plugin From File -> Select the .xpi file you downloaded)
4. Restart Zotero to ensure proper initialisation of the Plugin
5. Right click on the item pane column header and enable any custom columns

> **Note:** Release v1.3.4 and v1.3.5 broke the auto updating feature of the extension. If you have one of these versions you will need to manually update the extension, after which automatic updating will work again

## Options

Under Edit -> Settings -> zotero-custom-fields you can configure the following options

| Option                   | Description                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Custom Columns[^1]       | Define additional item list columns with your own labels.                                                                  |
| Custom Column Values[^1] | Configure allowed values for each custom column. These values are used in the item context menu for setting column values. |

[^1]: Only supported in the Zotero 7 version of the extension
