# File System Abstraction Layer Tests

Here are some tests that should work out as expected when you perform these actions.

## Directories

These actions require changes on the directory descriptors.

### Removing Directories

- [ ] Removing subdirectories within any root:
    - [ ] The removed directory's parent directory is then set to be the open directory.
- [ ] Removing root directories:
    - [ ] If there are more directories open, the next root directory is set to be the open directory.
    - [ ] If the last root directory in the list has been removed, the previous directory is set to be the open directory.
    - [ ] If no more root directories exist, no error is thrown.
- [ ] In all cases, all removed open files are closed.

### Creating New Projects

- [ ] You can create new projects in any directory.
- [ ] These projects have the directory name set as the project title by default.

### Creating New Directories

- [ ] You can create new directories in any directory.
- [ ] If you provide the name of any existing directory or file, the process fails with an appropriate error message.
- [ ] The newly created directory is set to be the open directory.

### Changing Project Properties

- [ ] Changing any project property is retained within the `.ztr-directory`-file within the respective directory, and is respected during exports.

### Removing Projects

- [ ] Removing a project should remove the corresponding entry from the respective `.ztr-directory`-file. If all other settings are the default, the file is completely removed.

### Renaming Directories

- [ ] You can rename any directory:
    - [ ] Any open files within these are retained, and work as expected.
    - [ ] The active file is correctly set to represent the file in its new path.
    - [ ] If the open directory has been renamed, it is re-instated both when root and when a subdirectory.

### Setting directory icons

- [ ] You can assign any icon to any of the directories:
    - [ ] The icon is persisted in the `.ztr-directory`-file and reinstated on re-start.
    - [ ] A project will always show the project icon. But as soon as you remove the project, it will switch to showing the icon.

### Sorting directories

- [ ] You can sort any directory:
    - [ ] By name, ascending and descending
    - [ ] By creation or modification time, ascending and descending (the directories should respect the corresponding preferences setting).
    - [ ] The sorting is persisted in the `.ztr-directory`-file.

## Files

These actions should work as expected on files.

### Closing files

- [ ] You can close any open file.
- [ ] You can close all open files at once.

### Removing files

- [ ] You can remove any open or non-open file. The files are placed in the bin.

### Duplicating files

- [ ] You can duplicate any file. If it is a root-file, the currently selected directory is being used instead of the root file's directory.

### Creating files

- [ ] You can successfully create files.

### Saving files

- [ ] You can successfully save files. The word count is updated accordingly.

### Searching files

- [ ] You can successfully search a directory, and file search results are reported appropriately.

### Moving Files and Directories

- [ ] You can successfully move any non-root directory or file.
- [ ] You cannot move any directory into one of its children.
- [ ] You cannot move roots.
- [ ] You cannot move when the target already has a child of the same name.
- [ ] If the source contains or is the open directory, it is correctly re-instated after the move happened.
- [ ] If the source is or contains any open file, it is re-instated and works as expected.
- [ ] If the source is or contains the active file, it is re-instated.

### Remote Changes

- [ ] You can successfully remove, rename, and add files and directories externally, and the changes are propagated to the GUI.
- [ ]
