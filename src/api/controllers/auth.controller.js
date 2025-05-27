import ParseService from "../services/parse/parse.service.js";
import config from "../../config/index.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import DatasetsService from "../services/datasets/datasets.service.js";
import FileSystemService from "../services/datasets/datasets.service.js";
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  helpers: {
    getUsersPath,
    getDatasetFilesPath,
    getDatasetDbPath,
    getTablesDbPath,
  },
} = config;

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  // host: process.env.EMAIL_HOST || "smtp.gmail.com",
  // port: process.env.EMAIL_PORT || 587,
  // secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const AuthController = {
  signUp: async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    try {
      // Generate random password
      const username = "semT-" + nanoid(4);
      const password = nanoid(10);
      // Check if username already exists
      const existingUser = await ParseService.findOneInJson({
        path: getUsersPath(),
        pattern: "users.*",
        condition: (user) => user.username === username,
      });

      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Read existing users
      const usersData = JSON.parse(await fs.readFile(getUsersPath()));
      const { meta, users } = usersData;
      const { lastIndex } = meta;
      const id = lastIndex + 1;

      // Create new user
      const newUser = {
        id,
        username,
        email: username,
        password,
        createdAt: new Date().toISOString(),
      };

      // Add user to database
      users[id] = newUser;

      // Update the last index
      const newCollection = {
        meta: {
          lastIndex: id,
        },
        users,
      };

      // Save the updated users collection
      await fs.writeFile(
        getUsersPath(),
        JSON.stringify(newCollection, null, 2)
      );

      // Create user dataset directory if it doesn't exist
      // const userDatasetPath = `${getDatasetFilesPath()}/${id}`;
      // try {
      //   await fs.mkdir(userDatasetPath, { recursive: true });
      // } catch (err) {
      //   console.error("Error creating user dataset directory", err);
      // }
      // Check if template.zip exists in the public folder and initialize user dataset
      const templatePath = path.join(process.cwd(), "public", "template.zip");
      try {
        const templateExists = await fs
          .access(templatePath)
          .then(() => true)
          .catch(() => false);

        if (templateExists) {
          // Copy template.zip to a temporary location with a unique name
          const tempFilePath = path.join(
            process.cwd(),
            "tmp",
            `template_${id}_${Date.now()}.zip`
          );
          await fs.copyFile(templatePath, tempFilePath);

          // Call the dataset service to create the initial dataset
          await FileSystemService.addDataset(tempFilePath, "Evaluation", id);

          // Clean up the temporary file
          await fs
            .unlink(tempFilePath)
            .catch((e) => console.error("Error removing temp file:", e));
        }
      } catch (err) {
        console.error("Error initializing user dataset:", err);
      }

      // Send email with password
      const mailOptions = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: "Welcome to SemTUI - Your Account Details",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #333;">Welcome to I2T-backend!</h2>
            <p>Your account has been created successfully.</p>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p>Please keep this information secure and don't share it with anyone.</p>
            <p>You can now log in to your account using these credentials.</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="font-size: 12px; color: #777;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Even if email fails, we continue to create the account
      }

      // Generate JWT token for immediate login
      const token = jwt.sign(
        {
          id: newUser.id,
          username: newUser.username,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Return success without sending the password in the response
      res.status(201).json({
        message:
          "User created successfully. Password has been sent to your email.",
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
        },
      });
    } catch (err) {
      console.error("Error in signUp:", err);
      next(err);
    }
  },
  verify: async (req, res, next) => {
    try {
      const { token } = req.body;
      const secretKey = config.RECAPTCHA_SECRET_KEY;
      console.log("token", token);
      console.log("secretKey", secretKey);
      const response = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
      );
      console.log("response", response.data);
      res.status(200).json({
        success: response.data.success,
        score: response.data.score,
        message: response.data["error-codes"],
      });
    } catch (err) {
      next(err);
    }
  },

  signIn: async (req, res, next) => {
    console.log(req.body);
    const { username: usernameReq, password: passwordReq } = req.body;

    try {
      // check if user exist
      const user = await ParseService.findOneInJson({
        path: getUsersPath(),
        pattern: "users.*",
        condition: ({ username, password }) =>
          usernameReq === username && password === passwordReq,
      });

      console.log(user);

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // sign a new token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(200).json({ token });
    } catch (err) {
      next(err);
    }
  },
  me: async (req, res, next) => {
    const { token } = req.body;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      const user = await ParseService.findOneInJson({
        path: getUsersPath(),
        pattern: "users.*",
        condition: ({ id }) => id === decoded.id,
      });

      if (!user) {
        return res.status(400).json({ loggedIn: false, user: null });
      }

      res.status(200).json({
        loggedIn: true,
        user: { id: user.id, username: user.username },
      });
    } catch (err) {
      next(err);
    }
  },
};

export default AuthController;
