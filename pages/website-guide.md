---
title: Website work guide
layout: page-narrow
permalink: /website-guide.html
credits: true
---

## Guide to Petrodelphia website work
<hr />

### Downloading the spreadsheet

1. Log into GitHub and navigate to [https://github.com/upenndigitalscholarship/petrodelphia](https://github.com/upenndigitalscholarship/petrodelphia).
2. In the _data folder, click on petro-metadata.csv.
3. Click the button with three dots at the upper right of the screen and select "Download."
4. Note where the file saved on your computer and open it in Google Sheets (or Excel?)

### Entering data into the spreadsheet
The petro-metadata.csv spreadsheet contains all of the items (documents, photos, etc.) that will show up in the website. This spreadsheet is read directly by the computer program that builds the item pages, so it needs to be kept neat and consistent, or it will break the website.

#### Tips for keeping the data tidy:
- **Check for typos often!** 
This could include misspellings, odd character substitutions like "%3A" instead of ":," which sometimes happens when moving data around ("URL encoding"), or extra spaces at the beginning/end of a cell ("whitespace"). It can be helpful to get into the habit of revieing the previous lines for every tenth line you complete, or a similar system.

- **Avoid auto-reformatting!** 
Always save changes to the spreadsheet by saving it as a Comma Separated Values (.csv) file. If it gives you the option, choose "UTF-8 encoding."

- **If you're unsure how to enter something into the spreadsheet, ask!**


#### Tools to help you enter the information accurately:
- A "data dictionary" that defines all the spreadsheet fields, provides examples of what goes into them, and notes any formatting requirements.
- "Controlled vocabularies" that list all the acceptable values to be entered into specific spreadsheet fields.

1. Steps here?

### Uploading the updated spreadsheet to the website

1. Log into GitHub and navigate to [https://github.com/upenndigitalscholarship/petrodelphia_data](https://github.com/upenndigitalscholarship/petrodelphia/_data).
2. At the upper right, click the "Add file" button and "Upload files"
3. Find the file where you saved it on your computer and either drag it to the upload box or click "Choose your files" to select it.
4. Write a short but informative message in the "Commit changes" box to keep a record of the upload you are making.
5. Below the text box, choose the radio button for "Create a new branch for this commit and start a pull request."
6. Enter your name in the box that pops up.
7. Click "Propose changes."
8. The site will process the upload, and then a new window will pop up asking for a description. You do not need to add a description to this text box.
9. Click "Create pull request." 
10. Once you have done this, the system will alert me that there are new changes to be made to the site, and I will review them and let you know if they are approved or if there are errors that need to be fixed first.