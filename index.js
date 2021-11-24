const nodemailer = require("nodemailer");
const bunyan = require("bunyan");
const bunyanFormat = require("bunyan-format");
const fs = require("fs");
const path = require("path");
const prompts = require("prompts");

(async() => {
    const log = bunyan.createLogger({
        name: "Mailer",
        level: 10,
        stream: bunyanFormat({
            outputMode: "short",
            levelInString: true
        }, process.stdout)
    });

    log.info("Mailer started. Working directory: " + process.cwd());

    log.info("Starting mailer...");
    log.info("Reading files...");

    const textEmailPath = path.resolve(process.cwd(), "assets", "email.txt");
    const htmlEmailPath = path.resolve(process.cwd(), "assets", "email.html");
    const dataPath = path.resolve(process.cwd(), "assets", "data.csv");
    if (!fs.existsSync(htmlEmailPath)) {
        log.info("Could not find an assets/email.html file.");
        process.exit(1);
    }
    if (!fs.existsSync(textEmailPath)) {
        log.info("Could not find an assets/email.txt file.");
        process.exit(1);
    }
    if (!fs.existsSync(dataPath)) {
        log.info("Could not find an assets/data.csv file.");
        process.exit(1);
    }

    const templateText = fs.readFileSync(textEmailPath).toString().replace(/\r/g, "");
    const templateHtml = fs.readFileSync(htmlEmailPath).toString().replace(/\r/g, "");
    const csvText = fs.readFileSync(dataPath).toString().replace(/\r/g, "");
    const csvRows = csvText.trim().split("\n");
    const csvHeader = csvRows.splice(0, 1)[0];
    const csvColumns = csvHeader.split(",");
    const csvRowsAsObject = [];

    for (const rowString of csvRows) {
        const row = rowString.split(",");
        const rowObject = {};
        for (const columnId in csvColumns) {
            const csvColumn = csvColumns[columnId];
            const rowValue = row[columnId];
            rowObject[csvColumn] = rowValue;
        }
        rowObject.__original = rowString;
        csvRowsAsObject.push(rowObject);
    }

    const config = require(path.resolve(process.cwd(), "config.js"));

    if (csvRowsAsObject[0][config.emailColumn] == null) {
        log.info("No \"" + config.emailColumn + "\" column found in csv!");
        process.exit(1);
    }

    log.warn("======================================================================");
    log.warn(" WARNING: You are about to email " + csvRows.length + " users.")
    log.warn("======================================================================");
    log.warn("Configuration:");
    log.warn("    Header columns: " + JSON.stringify(csvColumns));
    log.warn("    Email column: " + JSON.stringify(config.emailColumn));
    log.warn("    First to email: " + JSON.stringify(csvRowsAsObject[0][config.emailColumn]));
    log.warn("======================================================================");
    
    if (!(await prompts({ type: "confirm", name: "confirm", message: "Proceed?"})).confirm) {
        log.error("Cancelled.");
        return;
    }

    log.info("Creating transport...");
    const transporter = nodemailer.createTransport({
        pool: true,
        host: config.smtp.host,
        port: config.smtp.port,
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass
        },
    });

    let done = 0;
    
    log.info("Mailing...");
    for (const row of csvRowsAsObject) {
        const targetEmail = row[config.emailColumn];
        log.info("Sending email to " + targetEmail + "...");

        let modifiedTemplateText = templateText;
        let modifiedTemplateHtml = templateHtml;
        for (const [key, value] of Object.entries(row)) {
            modifiedTemplateText = modifiedTemplateText.replace(new RegExp(`{{{${key}}}}`, "g"), value);
            modifiedTemplateHtml = modifiedTemplateHtml.replace(new RegExp(`{{{${key}}}}`, "g"), value);
        }

        await transporter.sendMail({
            from: config.from,
            to: targetEmail,
            subject: config.subject,
            text: modifiedTemplateText,
            html: modifiedTemplateHtml
        }).then(() => {
            log.info("Email sent to " + targetEmail + "! (" + (++done) + "/" + csvRows.length + ")");
            if (!fs.existsSync("okay.csv"))
                fs.writeFileSync("okay.csv", csvHeader + "\n");
            fs.appendFileSync("okay.csv", row["__original"] + "\n");
        }).catch(e => {
            log.error("Could not send email to " + targetEmail + ".", e);
            if (!fs.existsSync("failed.csv"))
                fs.writeFileSync("failed.csv", csvHeader + "\n");
            fs.appendFileSync("failed.csv", row["__original"] + "\n");
        });
    }

    transporter.close();

    log.info("All done!");
})();