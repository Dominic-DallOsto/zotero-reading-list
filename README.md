# Zotero Reading List

![downloads](<https://img.shields.io/github/downloads/dominic-dallosto/zotero-reading-list/latest/zotero-reading-list.xpi?style=flat-square&label=Downloads%20(latest%20version)>)

An extension for Zotero that allows setting the read status of items.

- default read statuses are: `⭐ New`, `📙 To Read`, `📖 In Progress`, `📗 Read`, or `📕 Not Reading`
- custom read statuses are also supported
- newly added items can be automatically labelled
- an item's read status can be automatically updated when opening its attached PDF

![windows dark theme overview](https://github.com/Dominic-DallOsto/zotero-reading-list/assets/26859884/e35ef424-02cd-4bec-8866-3e1d30c9aadf)

Change an item's status by right clicking or by using the shortcut keys Alt+1 to Alt+5 (supports multiple items at once).

![right click menu](https://github.com/Dominic-DallOsto/zotero-reading-list/assets/26859884/10c46660-445d-4591-ad99-777fe58f788f)

You can also remove an item's read status through the right click menu or with the shortcut Alt+0.

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
5. Right click on the item pane column header and enable the Read Status column (see below)

![image](https://github.com/Dominic-DallOsto/zotero-reading-list/assets/26859884/e0dcc5b3-ffee-4120-96c8-81e6903d30b7)

> **Note:** Release v1.3.4 and v1.3.5 broke the auto updating feature of the extension. If you have one of these versions you will need to manually update the extension, after which automatic updating will work again

## Options

Under Edit -> Settings -> Reading List you can configure the following options

| Option                                                         | Description                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enable Keyboard Shortcuts                                      | With an item selected, pressed Alt+1, Alt+2, ... to set that item's read status. Note: this will disable Zotero's builtin shortcut for changing column used for sorting in the item pane (also Alt+NUM).               |
| Read Status Column Format[^1]                                  | Whether to shown icons along with the status of whether you've read items in the "Read Status" column, just the text, or just the icons.                                                                               |
| Use Icon as Item Tree Header[^1]                               | Show the extension icon instead of "Read Status" as the reading status column header.                                                                                                                                  |
| Custom Read Statuses and Icons[^1]                             | Choose custom Read Status names and icons. Keyboard shortcuts will work up to Alt+9. Note: if you delete a read status, it will remain assigned to any items - you'll need to delete / change their statuses manually. |
| Automatically Change Status When Opening Item's Attachment[^1] | If enabled, you can choose a custom mapping for how Read Statuses are updated when you open an item's PDF and start reading it (eg. New -> In Progress).                                                               |
| Automatically Label New Items[^1]                              | When adding new items to your Zotero library, do you want them to automatically be labelled with a particular read status?                                                                                             |
| Tag and Read Status Synchronisation[^1]                        | If enabled, matching tags will automatically be applied to items when you change their read status, so you can also filter by and change item read statuses with the corresponding tags when using the Zotero app      |
| Tag and Read Status Synchronisation Format[^1]                        | Whether to show read status emojis in their corresponding tags. This causes an emoji with the read status to appear before the item's title      |

[^1]: Only supported in the Zotero 7 version of the extension
