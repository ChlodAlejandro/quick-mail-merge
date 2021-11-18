# Usage instructions
1. Modify `config.js` to include your email, password, etc. Also change the "from" and "subject" keys.
2. Modify `assets/email.txt` and `assets/email.txt` with your email contents. Always provide a text-only version (in the `.txt` file) in case a user cannot load HTML. Images should also be links to online places, as local files will *not* be embedded onto the email.
3. Enter the data to be used in `assets/data.csv`.
4. Modify `config.js`'s "emailColumn" to target the column name of the email receipients.
5. Run it with `bin\index.exe` on your command prompt or terminal. If you're using a release build, just double-click on `index.exe`.

Successful emails are appended to `okay.csv`. Failed emails are appended to `failed.csv`. You can use this to restart email sending batches.