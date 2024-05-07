# Zotero Reading List

An extension for Zotero that allows setting the read status (New, To Read, In Progress, Read, or Not Reading) of items.

![windows dark theme overview](https://github.com/Dominic-DallOsto/zotero-reading-list/assets/26859884/e35ef424-02cd-4bec-8866-3e1d30c9aadf)

Change an item's status by right clicking or by using the shortcut keys Alt+1 to Alt+5 (supports multiple items at once).

![right click menu](https://github.com/Dominic-DallOsto/zotero-reading-list/assets/26859884/10c46660-445d-4591-ad99-777fe58f788f)

You can also remove an item's read status through the right click menu or with the shortcut Alt+0.

## Installation

> **Note:** The last release supporting Zotero 6 is [v0.3.2](https://github.com/Dominic-DallOsto/zotero-reading-list/releases/tag/v0.3.2). Versions starting from v1.0.0 only support Zotero 7, but the extension should automatically update to the new version when you upgrade your Zotero version.

1. Download the latest release [here](https://github.com/Dominic-DallOsto/zotero-reading-list/releases/latest)
2. Save the .xpi file (in Firefox, Right click -> Save Link As)
3. Install in Zotero (Tools -> Add-ons -> Gear icon in the top right -> Install Add-on From File -> Select the .xpi file you downloaded)
4. Restart Zotero to ensure proper initialisation of the Add-on
5. Right click on the item pane column header and enable the Read Status column (see below)

![image](https://github.com/Dominic-DallOsto/zotero-reading-list/assets/26859884/e0dcc5b3-ffee-4120-96c8-81e6903d30b7)

## Options

Under Edit -> Settings -> Reading List you can configure the following options

| Option                                                         | Description                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Show Read Status Icons in Item Tree                            | Show icons along with the status of whether you've read items in the "Read Status" column. If not, just show the status names.                                                                                         |
| Enable Keyboard Shortcuts                                      | With an item selected, pressed Alt+1, ... Alt+5 to set that item's read status.                                                                                                                                        |
| Automatically Label New Items                                  | When adding new items to your Zotero library, do you want them labelled as "New"?                                                                                                                                      |
| Custom Read Statuses and Icons[^1]                             | Choose custom Read Status names and icons. Keyboard shortcuts will work up to Alt+9. Note: if you delete a read status, it will remain assigned to any items - you'll need to delete / change their statuses manually. |
| Automatically Change Status When Opening Item's Attachment[^1] | If enabled, you can choose a custom mapping for how Read Statuses are updated when you open an item's PDF and start reading it (eg. New -> In Progress).                                                               |

[^1]: Only supported in the Zotero 7 version of the extension
