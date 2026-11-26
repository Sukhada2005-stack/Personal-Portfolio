import express from "express";
import { Readable } from "node:stream";
import { url } from "inspector";
import bodyParser from "body-parser";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "node:fs/promises";

dotenv.config();
// updations in the download path 
// const __dirname = dirname(fileURLToPath(import.meta.url));
// const __filename = path.join(__dirname, "public", "Sukhada_Bhalerao_CE.pdf");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  const year = new Date().getUTCFullYear();
  res.render("index.ejs");
});

app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

app.get("/download", async (req, res) => {
  const failure = {
    headText: "Download Interrupted!",
    subText: "An unexpected error occured at the server-side while downloading.Please try again later or kindly request my recent resume via the contact form in the contact section.",
    route: "/"
  };
  try {
    const resume_link = process.env.RESUME_DRIVE_LINK;
    if (!resume_link) {
      return res.status(500).render("status_modal.ejs", { content: failure });
    }
    const response = await fetch(resume_link);
    if (!response.ok) {
      throw new Error('Google Drive responded with status ' + response.status);
    }
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/pdf") && !contentType.includes("application/octet-stream")) {
      throw new Error("Expected pdf format for the resume document " + contentType);
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Sukhada_Bhalerao_CE.pdf"');
    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.log("Error Downloading this file : ", err);
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(500).render("status_modal.ejs", { content: failure });
    }
  }
});
//fetching the data from the contact form.
app.post("/send", async (req, res) => {
  const { fname, lname, email, Subject, message } = req.body;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.USER_EMAIL,
      pass: process.env.USER_PASS,
    },
  });
  const mailobject = {
    from: email,
    to: process.env.USER_EMAIL,
    subject: Subject,
    text:
      "Message from " +
      fname +
      " " +
      lname +
      "(" +
      email +
      ")" +
      " :\n\n" +
      message +
      " ",
  };
  const success = {
    headText: "Message Transmitted Successfully!",
    subText:
      "Thank you for reaching out! Your message has safely landed in my inbox.I will review your email and get back to you as soon as possible.",
    errorStatus: false,
    route: "/"
  };
  const failure = {
    headText: "Transmission Interrupted!",
    subText:
      "Something went wrong on the server side while processing your message.You can try submitting again, or reach out to me directly at <b>sukhadabhalerao2005@gmail.com</b>",
    errorStatus: true,
    route: "/contact#contact-form"
  };
  try {
    await transporter.sendMail(mailobject);
    res.status(200).render("status_modal.ejs", { content: success });
  } catch (error) {
    console.log(error);
    res.status(500).render("status_modal.ejs", { content: failure });
  }
});

app.get("/linkedIn", (req, res) => {
  res.redirect("https://www.linkedin.com/in/sukhada-bhalerao-7339a2340");
});

app.get("/github", (req, res) => {
  res.redirect("https://github.com/Sukhada2005-stack");
});

app.get("/projects", async (req, res) => {
  try {
    const { projects } = JSON.parse(
      await fs.readFile(
        new URL("./project_data.json", import.meta.url),
        "UTF-8",
      ),
    );
    res.render("projects.ejs", { projects });
  } catch (err) {
    console.error("Could not load projects:", err);
    res.status(500).send("Something went wrong loading the projects.");
  }
});

app.listen(port, () => {
  console.log("The server is listening on port " + port);
});


export default app;